import type { Page } from 'playwright';
import type { WebVitalsReport } from '../types';

/**
 * Install Web Vitals collectors at the earliest script time.
 * Call BEFORE navigation to capture FCP/LCP from the initial load.
 */
export async function startVitalsObservation(
  page: Page,
  options?: { usePerformanceObserver?: boolean; fallbackToPackage?: boolean }
): Promise<void> {
  const useObserver = options?.usePerformanceObserver ?? true;
  const allowPackage = options?.fallbackToPackage ?? false;

  // For web-vitals package, we'll load it after navigation but before steps
  if (!useObserver && allowPackage) {
    // Just initialize the results object for now
    const initScript = `
      (function(){
        if (window.__wvg && window.__wvg.started) return;
        window.__wvg = { started: true, results: {}, packageLoaded: false };
      })();
    `;
    await page.addInitScript({ content: initScript });
    return;
  }

  if (!useObserver) return; // No observers requested

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

/**
 * Load web-vitals package and register metrics (for package approach)
 * Call AFTER navigation but BEFORE scenario steps
 */
export async function loadWebVitalsPackage(page: Page): Promise<void> {
  try {
    // Load the web-vitals package
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js'
    });
    
    // Wait a moment for the script to load
    await page.waitForTimeout(1000);
    
    // Register all metrics
    await page.evaluate(() => {
      if ((window as any)['webVitals'] && (window as any).__wvg) {
        const wv = (window as any)['webVitals'];
        (window as any).__wvg.packageLoaded = true;
        
        // Register all metrics
        wv.onFCP((metric: any) => { 
          (window as any).__wvg.results.FCP = metric.value; 
          console.log('FCP measured (web-vitals package):', metric.value);
        });
        wv.onLCP((metric: any) => { 
          (window as any).__wvg.results.LCP = metric.value; 
          console.log('LCP measured (web-vitals package):', metric.value);
        });
        wv.onCLS((metric: any) => { 
          (window as any).__wvg.results.CLS = metric.value; 
          console.log('CLS measured (web-vitals package):', metric.value);
        });
        wv.onINP((metric: any) => { 
          (window as any).__wvg.results.INP = metric.value; 
          console.log('INP measured (web-vitals package):', metric.value);
        });
      }
    });
    
    console.log('✅ Web-vitals package loaded and metrics registered');
  } catch (error) {
    console.warn('⚠️  Failed to load web-vitals package:', error);
  }
}

/**
 * Disconnect observers and collect measured metrics.
 * Call AFTER scenario steps and a short settle delay.
 */
export async function collectVitals(page: Page): Promise<WebVitalsReport['metrics']> {
  const results = await page.evaluate(() => {
    const out: any = (window as any).__wvg?.results ? { ...(window as any).__wvg.results } : {};
    
    // Add TTFB from Navigation Timing API
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) {
        out.TTFB = nav.responseStart - nav.requestStart;
      }
    } catch {}
    
    // Cleanup observers (for PerformanceObserver approach)
    try {
      if ((window as any).__wvg?.observers) {
        for (const obs of (window as any).__wvg.observers) { 
          try { obs.disconnect(); } catch {} 
        }
      }
    } catch {}
    
    // Reset state
    try {
      if ((window as any).__wvg) {
        (window as any).__wvg.started = false;
      }
    } catch {}
    
    return out;
  });
  return results as WebVitalsReport['metrics'];
}

/**
 * Measures Web Vitals metrics using PerformanceObserver (no external dependencies)
 * @param page - Playwright page instance
 * @returns Promise resolving to Web Vitals metrics
 */
export async function measureWebVitalsWithObserver(page: Page): Promise<WebVitalsReport['metrics']> {
  const metrics: WebVitalsReport['metrics'] = {};
  
  try {
    const results = await page.evaluate(() => {
      return new Promise<WebVitalsReport['metrics']>((resolve) => {
        const results: WebVitalsReport['metrics'] = {};
        let resolved = false;
        
        // Timeout after 10 seconds to prevent hanging
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(results);
          }
        }, 10000);
        
        // Helper function to resolve once
        const resolveOnce = (value: WebVitalsReport['metrics']) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(value);
          }
        };
        
        // Track metrics collected
        let metricsCollected = 0;
        const totalMetrics = 4; // FCP, LCP, CLS, INP
        
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics && !resolved) {
            resolveOnce(results);
          }
        };
        
        // 1. First Contentful Paint (FCP)
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              results.FCP = fcpEntry.startTime;
              console.log('FCP measured (PerformanceObserver):', fcpEntry.startTime);
              fcpObserver.disconnect();
              checkComplete();
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          console.warn('FCP PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 2. Largest Contentful Paint (LCP)
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              results.LCP = lastEntry.startTime;
              console.log('LCP measured (PerformanceObserver):', lastEntry.startTime);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // LCP can change, so we wait a bit before finalizing
          setTimeout(() => {
            lcpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          console.warn('LCP PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 3. Cumulative Layout Shift (CLS)
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            results.CLS = clsValue;
            console.log('CLS measured (PerformanceObserver):', clsValue);
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // CLS measurement continues until page unload, so we wait
          setTimeout(() => {
            clsObserver.disconnect();
            checkComplete();
          }, 3000);
        } catch (e) {
          console.warn('CLS PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 4. Interaction to Next Paint (INP) - simplified version
        try {
          let maxInteractionDelay = 0;
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const processingStart = (entry as any).processingStart;
              const startTime = entry.startTime;
              if (processingStart && startTime) {
                const delay = processingStart - startTime;
                maxInteractionDelay = Math.max(maxInteractionDelay, delay);
              }
            }
            results.INP = maxInteractionDelay;
            console.log('INP measured (PerformanceObserver):', maxInteractionDelay);
          });
          inpObserver.observe({ entryTypes: ['event'] });
          
          // Wait for interactions to settle
          setTimeout(() => {
            inpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          console.warn('INP PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 5. Time to First Byte (TTFB) - using Navigation Timing
        try {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
            console.log('TTFB measured (PerformanceObserver):', results.TTFB);
          }
        } catch (e) {
          console.warn('TTFB measurement failed:', e);
          // TTFB is optional, don't fail if not available
        }
      });
    });
    
    // Merge results
    Object.assign(metrics, results);
    
  } catch (error) {
    console.warn('Warning: Could not measure Web Vitals with PerformanceObserver:', error);
  }
  
  return metrics;
}

/**
 * Measures Web Vitals metrics on a page with CSP-safe fallback
 * @param page - Playwright page instance
 * @param options - Configuration options for Web Vitals measurement
 * @returns Promise resolving to Web Vitals metrics
 */
export async function measureWebVitals(
  page: Page, 
  options?: { usePerformanceObserver?: boolean; fallbackToPackage?: boolean }
): Promise<WebVitalsReport['metrics']> {
  const useObserver = options?.usePerformanceObserver ?? true; // Default to CSP-safe approach
  const allowFallback = options?.fallbackToPackage ?? false;   // Default to no fallback
  
  // If forced to use PerformanceObserver, use it directly
  if (useObserver && !allowFallback) {
    console.log('🔍 Measuring Web Vitals with PerformanceObserver (CSP-safe, no fallback)...');
    return measureWebVitalsWithObserver(page);
  }
  
  // If forced to use web-vitals package, try it first
  if (!useObserver && allowFallback) {
    try {
      console.log('📦 Measuring Web Vitals with web-vitals package...');
      return measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn('⚠️  web-vitals package failed, falling back to PerformanceObserver');
      return measureWebVitalsWithObserver(page);
    }
  }
  
  // Default behavior: Try PerformanceObserver first, then web-vitals package if allowed
  try {
    console.log('🔍 Measuring Web Vitals with PerformanceObserver (CSP-safe)...');
    const observerResults = await measureWebVitalsWithObserver(page);
    
    // If we got at least some metrics, use them
    const hasMetrics = Object.keys(observerResults).length > 0;
    if (hasMetrics) {
      console.log('✅ Successfully measured Web Vitals with PerformanceObserver');
      return observerResults;
    }
  } catch (error) {
    console.warn('PerformanceObserver failed, trying web-vitals package:', error);
  }
  
  // Fallback to web-vitals package if allowed (may be blocked by CSP)
  if (allowFallback) {
    try {
      console.log('📦 Attempting to load web-vitals package...');
      return await measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn('⚠️  web-vitals package blocked by CSP, using PerformanceObserver fallback');
      // Final fallback to PerformanceObserver
      return await measureWebVitalsWithObserver(page);
    }
  }
  
  // If no fallback allowed and PerformanceObserver failed, return empty metrics
  console.warn('⚠️  PerformanceObserver failed and fallback disabled, returning empty metrics');
  return {};
}

/**
 * Original web-vitals package implementation (for fallback)
 */
async function measureWebVitalsWithPackage(page: Page): Promise<WebVitalsReport['metrics']> {
  const metrics: WebVitalsReport['metrics'] = {};
  
  try {
    // Inject Web Vitals measurement script
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js'
    });
    
    // Wait a moment for the script to load
    await page.waitForTimeout(1000);
    
    // Measure all Web Vitals metrics together with proper timing
    const allMetrics = await page.evaluate(() => {
      return new Promise<WebVitalsReport['metrics']>((resolve) => {
        const results: WebVitalsReport['metrics'] = {};
        let metricsCollected = 0;
        const totalMetrics = 4; // FCP, LCP, CLS, INP
        
        // Timeout after 15 seconds
        const timeout = setTimeout(() => {
          resolve(results);
        }, 15000);
        
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics) {
            clearTimeout(timeout);
            resolve(results);
          }
        };
        
        // Check if web-vitals is available
        if (!('webVitals' in window)) {
          console.warn('webVitals library not loaded');
          clearTimeout(timeout);
          resolve(results);
          return;
        }
        
        const webVitals = (window as any)['webVitals'];
        
        // Measure FCP (First Contentful Paint)
        try {
          webVitals.onFCP((metric: any) => {
            results.FCP = metric.value;
            console.log('FCP measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('FCP measurement failed:', e);
          checkComplete();
        }
        
        // Measure LCP (Largest Contentful Paint)
        try {
          webVitals.onLCP((metric: any) => {
            results.LCP = metric.value;
            console.log('LCP measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('LCP measurement failed:', e);
          checkComplete();
        }
        
        // Measure CLS (Cumulative Layout Shift)
        try {
          webVitals.onCLS((metric: any) => {
            results.CLS = metric.value;
            console.log('CLS measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('CLS measurement failed:', e);
          checkComplete();
        }
        
        // Measure INP (Interaction to Next Paint)
        try {
          webVitals.onINP((metric: any) => {
            results.INP = metric.value;
            console.log('INP measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('INP measurement failed:', e);
          checkComplete();
        }
        
        // Measure TTFB (Time to First Byte) using Performance API
        try {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
            console.log('TTFB measured:', results.TTFB);
          }
        } catch (e) {
          console.warn('TTFB measurement failed:', e);
        }
      });
    });
    
    // Merge results
    Object.assign(metrics, allMetrics);
    
    console.log('✅ Successfully measured Web Vitals with web-vitals package:', metrics);
    
  } catch (error) {
    console.warn('Warning: Could not measure some Web Vitals with package:', error);
    throw error; // Re-throw to trigger fallback
  }
  
  return metrics;
}

/**
 * Measures additional performance metrics using the Performance API
 * @param page - Playwright page instance
 * @returns Promise resolving to performance metrics
 */
export async function measurePerformanceMetrics(page: Page): Promise<WebVitalsReport['performance']> {
  const performanceMetrics = await page.evaluate((): WebVitalsReport['performance'] => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint') as PerformanceEntry[];
    
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      firstPaint: paint.find((entry: PerformanceEntry) => entry.name === 'first-paint')?.startTime || 0
    };
  });
  
  return performanceMetrics;
}
