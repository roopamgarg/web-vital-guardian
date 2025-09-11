"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const node_fs = require("node:fs");
const node_path = require("node:path");
const playwright = require("playwright");
function findScenarioFiles(directory) {
  const scenarioFiles = [];
  function scanDirectory(dir) {
    try {
      const items = node_fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = node_path.join(dir, item);
        const stat = node_fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith(".scenario.json") || item.endsWith(".scenario.js"))) {
          scenarioFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }
  scanDirectory(directory);
  return scenarioFiles;
}
function loadScenarioFile(filePath) {
  try {
    const content = node_fs.readFileSync(filePath, "utf-8");
    let scenario;
    if (filePath.endsWith(".scenario.js")) {
      const moduleExports = {};
      const moduleRequire = (id) => {
        throw new Error(`require('${id}') is not supported in scenario files. Use only built-in JavaScript features.`);
      };
      const moduleObj = {
        exports: moduleExports,
        require: moduleRequire,
        filename: filePath,
        dirname: node_path.dirname(filePath)
      };
      const scenarioFunction = new Function("exports", "require", "module", "__filename", "__dirname", content);
      scenarioFunction(moduleExports, moduleRequire, moduleObj, filePath, node_path.dirname(filePath));
      scenario = moduleObj.exports.default || moduleObj.exports;
    } else {
      scenario = JSON.parse(content);
    }
    if (!scenario.name) {
      throw new Error(`Scenario file ${filePath} is missing required field 'name'`);
    }
    if (!scenario.url) {
      throw new Error(`Scenario file ${filePath} is missing required field 'url'`);
    }
    if (!scenario.steps || !Array.isArray(scenario.steps)) {
      throw new Error(`Scenario file ${filePath} is missing required field 'steps'`);
    }
    return scenario;
  } catch (error) {
    throw new Error(`Failed to load scenario file ${filePath}: ${error}`);
  }
}
async function startVitalsObservation(page, options) {
  const useObserver = options?.usePerformanceObserver ?? true;
  const allowPackage = options?.fallbackToPackage ?? false;
  if (!useObserver && allowPackage) {
    const initScript2 = `
      (function(){
        if (window.__wvg && window.__wvg.started) return;
        window.__wvg = { started: true, results: {}, packageLoaded: false };
      })();
    `;
    await page.addInitScript({ content: initScript2 });
    return;
  }
  if (!useObserver) return;
  const initScript = `
    (function(){
      if (window.__wvg && window.__wvg.started) return;
      window.__wvg = { started: true, results: {}, observers: [] };
      try {
        // FCP
        try {
          const fcpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find(e => e.name === 'first-contentful-paint');
            if (fcp) { window.__wvg.results.FCP = fcp.startTime; }
          });
          fcpObs.observe({ entryTypes: ['paint'] });
          window.__wvg.observers.push(fcpObs);
        } catch {}

        // LCP
        try {
          const lcpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) { window.__wvg.results.LCP = last.startTime; }
          });
          lcpObs.observe({ entryTypes: ['largest-contentful-paint'] });
          window.__wvg.observers.push(lcpObs);
        } catch {}

        // CLS
        try {
          let cls = 0;
          const clsObs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) { cls += (entry).value || 0; }
            }
            window.__wvg.results.CLS = cls;
          });
          clsObs.observe({ entryTypes: ['layout-shift'] });
          window.__wvg.observers.push(clsObs);
        } catch {}

        // INP (simplified event delay aggregation)
        try {
          let maxDelay = 0;
          const inpObs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const ps = (entry).processingStart;
              const st = entry.startTime;
              if (ps && st) { maxDelay = Math.max(maxDelay, ps - st); }
            }
            window.__wvg.results.INP = maxDelay;
          });
          inpObs.observe({ entryTypes: ['event'] });
          window.__wvg.observers.push(inpObs);
        } catch {}
      } catch {}
    })();
  `;
  await page.addInitScript({ content: initScript });
}
async function loadWebVitalsPackage(page) {
  try {
    await page.addScriptTag({
      url: "https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js"
    });
    await page.waitForTimeout(1e3);
    await page.evaluate(() => {
      if (window["webVitals"] && window.__wvg) {
        const wv = window["webVitals"];
        window.__wvg.packageLoaded = true;
        wv.onFCP((metric) => {
          window.__wvg.results.FCP = metric.value;
          console.log("FCP measured (web-vitals package):", metric.value);
        });
        wv.onLCP((metric) => {
          window.__wvg.results.LCP = metric.value;
          console.log("LCP measured (web-vitals package):", metric.value);
        });
        wv.onCLS((metric) => {
          window.__wvg.results.CLS = metric.value;
          console.log("CLS measured (web-vitals package):", metric.value);
        });
        wv.onINP((metric) => {
          window.__wvg.results.INP = metric.value;
          console.log("INP measured (web-vitals package):", metric.value);
        });
      }
    });
    console.log("✅ Web-vitals package loaded and metrics registered");
  } catch (error) {
    console.warn("⚠️  Failed to load web-vitals package:", error);
  }
}
async function collectVitals(page) {
  const results = await page.evaluate(() => {
    const out = window.__wvg?.results ? { ...window.__wvg.results } : {};
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        out.TTFB = nav.responseStart - nav.requestStart;
      }
    } catch {
    }
    try {
      if (window.__wvg?.observers) {
        for (const obs of window.__wvg.observers) {
          try {
            obs.disconnect();
          } catch {
          }
        }
      }
    } catch {
    }
    try {
      if (window.__wvg) {
        window.__wvg.started = false;
      }
    } catch {
    }
    return out;
  });
  return results;
}
async function measureWebVitalsWithObserver(page) {
  const metrics = {};
  try {
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results2 = {};
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(results2);
          }
        }, 1e4);
        const resolveOnce = (value) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(value);
          }
        };
        let metricsCollected = 0;
        const totalMetrics = 4;
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics && !resolved) {
            resolveOnce(results2);
          }
        };
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find((entry) => entry.name === "first-contentful-paint");
            if (fcpEntry) {
              results2.FCP = fcpEntry.startTime;
              console.log("FCP measured (PerformanceObserver):", fcpEntry.startTime);
              fcpObserver.disconnect();
              checkComplete();
            }
          });
          fcpObserver.observe({ entryTypes: ["paint"] });
        } catch (e) {
          console.warn("FCP PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              results2.LCP = lastEntry.startTime;
              console.log("LCP measured (PerformanceObserver):", lastEntry.startTime);
            }
          });
          lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
          setTimeout(() => {
            lcpObserver.disconnect();
            checkComplete();
          }, 2e3);
        } catch (e) {
          console.warn("LCP PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            results2.CLS = clsValue;
            console.log("CLS measured (PerformanceObserver):", clsValue);
          });
          clsObserver.observe({ entryTypes: ["layout-shift"] });
          setTimeout(() => {
            clsObserver.disconnect();
            checkComplete();
          }, 3e3);
        } catch (e) {
          console.warn("CLS PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          let maxInteractionDelay = 0;
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const processingStart = entry.processingStart;
              const startTime = entry.startTime;
              if (processingStart && startTime) {
                const delay = processingStart - startTime;
                maxInteractionDelay = Math.max(maxInteractionDelay, delay);
              }
            }
            results2.INP = maxInteractionDelay;
            console.log("INP measured (PerformanceObserver):", maxInteractionDelay);
          });
          inpObserver.observe({ entryTypes: ["event"] });
          setTimeout(() => {
            inpObserver.disconnect();
            checkComplete();
          }, 2e3);
        } catch (e) {
          console.warn("INP PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          const navigation = performance.getEntriesByType("navigation")[0];
          if (navigation) {
            results2.TTFB = navigation.responseStart - navigation.requestStart;
            console.log("TTFB measured (PerformanceObserver):", results2.TTFB);
          }
        } catch (e) {
          console.warn("TTFB measurement failed:", e);
        }
      });
    });
    Object.assign(metrics, results);
  } catch (error) {
    console.warn("Warning: Could not measure Web Vitals with PerformanceObserver:", error);
  }
  return metrics;
}
async function measureWebVitals(page, options) {
  const useObserver = options?.usePerformanceObserver ?? true;
  const allowFallback = options?.fallbackToPackage ?? false;
  if (useObserver && !allowFallback) {
    console.log("🔍 Measuring Web Vitals with PerformanceObserver (CSP-safe, no fallback)...");
    return measureWebVitalsWithObserver(page);
  }
  if (!useObserver && allowFallback) {
    try {
      console.log("📦 Measuring Web Vitals with web-vitals package...");
      return measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn("⚠️  web-vitals package failed, falling back to PerformanceObserver");
      return measureWebVitalsWithObserver(page);
    }
  }
  try {
    console.log("🔍 Measuring Web Vitals with PerformanceObserver (CSP-safe)...");
    const observerResults = await measureWebVitalsWithObserver(page);
    const hasMetrics = Object.keys(observerResults).length > 0;
    if (hasMetrics) {
      console.log("✅ Successfully measured Web Vitals with PerformanceObserver");
      return observerResults;
    }
  } catch (error) {
    console.warn("PerformanceObserver failed, trying web-vitals package:", error);
  }
  if (allowFallback) {
    try {
      console.log("📦 Attempting to load web-vitals package...");
      return await measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn("⚠️  web-vitals package blocked by CSP, using PerformanceObserver fallback");
      return await measureWebVitalsWithObserver(page);
    }
  }
  console.warn("⚠️  PerformanceObserver failed and fallback disabled, returning empty metrics");
  return {};
}
async function measureWebVitalsWithPackage(page) {
  const metrics = {};
  try {
    await page.addScriptTag({
      url: "https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js"
    });
    await page.waitForTimeout(1e3);
    const allMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results = {};
        let metricsCollected = 0;
        const totalMetrics = 4;
        const timeout = setTimeout(() => {
          resolve(results);
        }, 15e3);
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics) {
            clearTimeout(timeout);
            resolve(results);
          }
        };
        if (!("webVitals" in window)) {
          console.warn("webVitals library not loaded");
          clearTimeout(timeout);
          resolve(results);
          return;
        }
        const webVitals = window["webVitals"];
        try {
          webVitals.onFCP((metric) => {
            results.FCP = metric.value;
            console.log("FCP measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("FCP measurement failed:", e);
          checkComplete();
        }
        try {
          webVitals.onLCP((metric) => {
            results.LCP = metric.value;
            console.log("LCP measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("LCP measurement failed:", e);
          checkComplete();
        }
        try {
          webVitals.onCLS((metric) => {
            results.CLS = metric.value;
            console.log("CLS measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("CLS measurement failed:", e);
          checkComplete();
        }
        try {
          webVitals.onINP((metric) => {
            results.INP = metric.value;
            console.log("INP measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("INP measurement failed:", e);
          checkComplete();
        }
        try {
          const navigation = performance.getEntriesByType("navigation")[0];
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
            console.log("TTFB measured:", results.TTFB);
          }
        } catch (e) {
          console.warn("TTFB measurement failed:", e);
        }
      });
    });
    Object.assign(metrics, allMetrics);
    console.log("✅ Successfully measured Web Vitals with web-vitals package:", metrics);
  } catch (error) {
    console.warn("Warning: Could not measure some Web Vitals with package:", error);
    throw error;
  }
  return metrics;
}
async function measurePerformanceMetrics(page) {
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      firstPaint: paint.find((entry) => entry.name === "first-paint")?.startTime || 0
    };
  });
  return performanceMetrics;
}
async function executeScenarioStep(page, step) {
  const timeout = step.timeout || 3e4;
  switch (step.type) {
    case "navigate":
      if (!step.url) {
        throw new Error("Navigate step requires a URL");
      }
      await page.goto(step.url, { waitUntil: "networkidle", timeout });
      break;
    case "click":
      if (!step.selector) {
        throw new Error("Click step requires a selector");
      }
      await page.click(step.selector, { timeout });
      break;
    case "type":
      if (!step.selector || !step.text) {
        throw new Error("Type step requires a selector and text");
      }
      await page.fill(step.selector, step.text, { timeout });
      break;
    case "wait":
      if (step.waitFor) {
        await page.waitForSelector(step.waitFor, { timeout });
      } else {
        await page.waitForTimeout(step.timeout || 1e3);
      }
      break;
    case "scroll":
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      break;
    case "hover":
      if (!step.selector) {
        throw new Error("Hover step requires a selector");
      }
      await page.hover(step.selector, { timeout });
      break;
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}
async function runScenario(browser, scenario, config) {
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();
  try {
    await startVitalsObservation(page, config?.webVitals);
    await page.goto(scenario.url, { waitUntil: "networkidle" });
    if (config?.webVitals?.fallbackToPackage && !config?.webVitals?.usePerformanceObserver) {
      await loadWebVitalsPackage(page);
    }
    for (const step of scenario.steps) {
      await executeScenarioStep(page, step);
    }
    await page.waitForTimeout(2e3);
    const webVitals = await collectVitals(page);
    const performance2 = await measurePerformanceMetrics(page);
    const report = {
      scenario: scenario.name,
      url: scenario.url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      metrics: webVitals,
      performance: performance2
    };
    return report;
  } finally {
    await page.close();
  }
}
function checkBudgetViolations(report, budgets) {
  const violations = [];
  if (!budgets) return violations;
  const { metrics } = report;
  if (budgets.FCP && metrics.FCP && metrics.FCP > budgets.FCP) {
    violations.push(`FCP: ${metrics.FCP}ms > ${budgets.FCP}ms`);
  }
  if (budgets.LCP && metrics.LCP && metrics.LCP > budgets.LCP) {
    violations.push(`LCP: ${metrics.LCP}ms > ${budgets.LCP}ms`);
  }
  if (budgets.FID && metrics.FID && metrics.FID > budgets.FID) {
    violations.push(`FID: ${metrics.FID}ms > ${budgets.FID}ms`);
  }
  if (budgets.CLS && metrics.CLS && metrics.CLS > budgets.CLS) {
    violations.push(`CLS: ${metrics.CLS} > ${budgets.CLS}`);
  }
  if (budgets.INP && metrics.INP && metrics.INP > budgets.INP) {
    violations.push(`INP: ${metrics.INP}ms > ${budgets.INP}ms`);
  }
  if (budgets.TTFB && metrics.TTFB && metrics.TTFB > budgets.TTFB) {
    violations.push(`TTFB: ${metrics.TTFB}ms > ${budgets.TTFB}ms`);
  }
  return violations;
}
async function runWebVitalsGuardian(config) {
  const browser = await playwright.chromium.launch({
    headless: config.headless !== false
  });
  try {
    const scenarioFiles = findScenarioFiles(config.scenariosPath);
    if (scenarioFiles.length === 0) {
      throw new Error(`No *.scenario.json files found in ${config.scenariosPath}`);
    }
    console.log(`Found ${scenarioFiles.length} scenario files`);
    const reports = [];
    const budgetViolations = [];
    for (const filePath of scenarioFiles) {
      try {
        console.log(`Running scenario: ${filePath}`);
        const scenario = loadScenarioFile(filePath);
        const report = await runScenario(browser, scenario, config);
        reports.push(report);
        const budgets = { ...config.budgets, ...scenario.webVitals?.budgets };
        const violations = checkBudgetViolations(report, budgets);
        if (violations.length > 0) {
          budgetViolations.push(`${scenario.name}: ${violations.join(", ")}`);
        }
        console.log(`✓ Completed: ${scenario.name}`);
      } catch (error) {
        console.error(`✗ Failed to run scenario ${filePath}:`, error);
      }
    }
    const summary = {
      totalScenarios: scenarioFiles.length,
      passed: reports.length,
      failed: scenarioFiles.length - reports.length,
      budgetViolations
    };
    return { reports, summary };
  } finally {
    await browser.close();
  }
}
exports.collectVitals = collectVitals;
exports.default = runWebVitalsGuardian;
exports.executeScenarioStep = executeScenarioStep;
exports.findScenarioFiles = findScenarioFiles;
exports.loadScenarioFile = loadScenarioFile;
exports.loadWebVitalsPackage = loadWebVitalsPackage;
exports.measurePerformanceMetrics = measurePerformanceMetrics;
exports.measureWebVitals = measureWebVitals;
exports.measureWebVitalsWithObserver = measureWebVitalsWithObserver;
exports.runScenario = runScenario;
exports.runWebVitalsGuardian = runWebVitalsGuardian;
exports.startVitalsObservation = startVitalsObservation;
//# sourceMappingURL=index.cjs.map
