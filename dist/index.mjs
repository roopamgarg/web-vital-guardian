import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
function interpolateVariables(text, variables) {
  if (!text || typeof text !== "string") {
    return text;
  }
  return text.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
    const trimmedName = variableName.trim();
    if (variables.hasOwnProperty(trimmedName)) {
      return String(variables[trimmedName]);
    }
    console.warn(`Variable '${trimmedName}' not found in variables`);
    return match;
  });
}
function interpolateObject(obj, variables) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (typeof obj === "string") {
    return interpolateVariables(obj, variables);
  }
  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item, variables));
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, variables);
    }
    return result;
  }
  return obj;
}
function interpolateScenario(scenario, variables) {
  return interpolateObject(scenario, variables);
}
function mergeVariables(globalVariables = {}, scenarioVariables = {}) {
  return {
    ...globalVariables,
    ...scenarioVariables
  };
}
function findScenarioFiles(directory) {
  const scenarioFiles = [];
  function scanDirectory(dir) {
    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
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
function loadScenarioFile(filePath, globalVariables = {}) {
  try {
    const content = readFileSync(filePath, "utf-8");
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
        dirname: dirname(filePath)
      };
      const scenarioFunction = new Function("exports", "require", "module", "__filename", "__dirname", content);
      scenarioFunction(moduleExports, moduleRequire, moduleObj, filePath, dirname(filePath));
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
    const mergedVariables = mergeVariables(globalVariables, scenario.variables || {});
    const interpolatedScenario = interpolateScenario(scenario, mergedVariables);
    return interpolatedScenario;
  } catch (error) {
    throw new Error(`Failed to load scenario file ${filePath}: ${error}`);
  }
}
function analyzeProfile(profile) {
  const functionStats = /* @__PURE__ */ new Map();
  profile.nodes.forEach((node, index) => {
    const callFrame = node.callFrame;
    const functionName = callFrame.originalFunctionName || callFrame.functionName;
    const source = callFrame.originalSource || callFrame.url;
    const line = callFrame.originalLine || 0;
    if (!functionStats.has(functionName)) {
      functionStats.set(functionName, {
        originalFunctionName: functionName,
        originalSource: source,
        originalLine: line,
        totalTime: 0,
        hitCount: 0,
        samples: 0
      });
    }
    const stats = functionStats.get(functionName);
    stats.hitCount += node.hitCount || 0;
  });
  profile.samples.forEach((sample) => {
    if (sample.stackId !== void 0 && profile.nodes[sample.stackId]) {
      const node = profile.nodes[sample.stackId];
      const functionName = node.callFrame.originalFunctionName || node.callFrame.functionName;
      if (functionStats.has(functionName)) {
        functionStats.get(functionName).samples++;
      }
    }
  });
  return Array.from(functionStats.values()).sort((a, b) => b.samples - a.samples);
}
function getTopExpensiveFunctions(profile, limit = 10) {
  const analysis = analyzeProfile(profile);
  return analysis.slice(0, limit);
}
function getFunctionsBySource(profile, sourcePattern) {
  const analysis = analyzeProfile(profile);
  return analysis.filter(
    (func) => func.originalSource.includes(sourcePattern)
  );
}
function formatProfileAnalysis(profile) {
  const topFunctions = getTopExpensiveFunctions(profile, 10);
  console.log("\n📊 Profile Analysis - Top 10 Most Expensive Functions:");
  console.log("=".repeat(80));
  topFunctions.forEach((func, index) => {
    console.log(`${index + 1}. ${func.originalFunctionName}`);
    console.log(`   Source: ${func.originalSource}:${func.originalLine}`);
    console.log(`   Samples: ${func.samples}, Hits: ${func.hitCount}`);
    console.log("");
  });
  return topFunctions;
}
function exportProfileData(profile, format = "json") {
  const analysis = analyzeProfile(profile);
  if (format === "csv") {
    const headers = "Function Name,Source File,Line,Samples,Hit Count";
    const rows = analysis.map(
      (func) => `"${func.originalFunctionName}","${func.originalSource}",${func.originalLine},${func.samples},${func.hitCount}`
    );
    return [headers, ...rows].join("\n");
  }
  return JSON.stringify(analysis, null, 2);
}
function generateHTMLReport(result, outputPath) {
  const html = createHTMLReport(result);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, html);
  console.log(`📊 HTML report generated: ${outputPath}`);
}
function createHTMLReport(result) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Vitals Guardian Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
    <style>
        ${getCSS()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🚀 Web Vitals Guardian Report</h1>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-number">${result.summary.totalScenarios}</div>
                    <div class="stat-label">Total Scenarios</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-number">${result.summary.passed}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card ${result.summary.failed > 0 ? "error" : "success"}">
                    <div class="stat-number">${result.summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card ${result.summary.budgetViolations.length > 0 ? "warning" : "success"}">
                    <div class="stat-number">${result.summary.budgetViolations.length}</div>
                    <div class="stat-label">Budget Violations</div>
                </div>
            </div>
        </header>

        <main class="main-content">
            ${result.summary.budgetViolations.length > 0 ? createBudgetViolationsSection(result.summary.budgetViolations) : ""}
            
            <div class="scenarios-grid">
                ${result.reports.map((report) => createScenarioCard(report)).join("")}
            </div>
        </main>
    </div>

    <script>
        ${getJavaScript()}
    <\/script>
</body>
</html>`;
}
function getCSS() {
  return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        color: #333;
    }

    .container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
    }

    .header {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 30px;
        margin-bottom: 30px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .header h1 {
        font-size: 2.5rem;
        margin-bottom: 30px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .stat-card {
        background: white;
        border-radius: 15px;
        padding: 25px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        border-left: 5px solid #667eea;
    }

    .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .stat-card.success {
        border-left-color: #10b981;
    }

    .stat-card.error {
        border-left-color: #ef4444;
    }

    .stat-card.warning {
        border-left-color: #f59e0b;
    }

    .stat-number {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 10px;
    }

    .stat-label {
        font-size: 1rem;
        color: #6b7280;
        font-weight: 500;
    }

    .main-content {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .budget-violations {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    .budget-violations h2 {
        color: #ef4444;
        margin-bottom: 20px;
        font-size: 1.5rem;
    }

    .violation-item {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
        color: #dc2626;
    }

    .scenarios-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
        gap: 30px;
    }

    .scenario-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    }

    .scenario-card:hover {
        transform: translateY(-5px);
    }

    .scenario-header {
        margin-bottom: 25px;
    }

    .scenario-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 10px;
        color: #1f2937;
    }

    .scenario-url {
        color: #6b7280;
        font-size: 0.9rem;
        word-break: break-all;
    }

    .scenario-timestamp {
        color: #9ca3af;
        font-size: 0.8rem;
        margin-top: 5px;
    }

    .metrics-section {
        margin-bottom: 25px;
    }

    .section-title {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 15px;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
    }

    .metric-card {
        background: #f8fafc;
        border-radius: 12px;
        padding: 15px;
        text-align: center;
        border: 2px solid transparent;
        transition: all 0.3s ease;
    }

    .metric-card:hover {
        border-color: #667eea;
        background: #f1f5f9;
    }

    .metric-name {
        font-size: 0.8rem;
        color: #6b7280;
        font-weight: 500;
        margin-bottom: 5px;
    }

    .metric-value {
        font-size: 1.2rem;
        font-weight: 700;
        color: #1f2937;
    }

    .metric-unit {
        font-size: 0.7rem;
        color: #9ca3af;
    }

    .network-section {
        margin-bottom: 25px;
    }

    .network-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
    }

    .network-stat {
        background: #f0f9ff;
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        border-left: 4px solid #0ea5e9;
    }

    .network-stat-label {
        font-size: 0.8rem;
        color: #0369a1;
        font-weight: 500;
        margin-bottom: 5px;
    }

    .network-stat-value {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0c4a6e;
    }

    .requests-by-type {
        margin-bottom: 20px;
    }

    .chart-container {
        position: relative;
        height: 300px;
        margin-bottom: 20px;
    }

    .requests-table {
        background: #f8fafc;
        border-radius: 10px;
        overflow: hidden;
        max-height: 300px;
        overflow-y: auto;
    }

    .requests-table table {
        width: 100%;
        border-collapse: collapse;
    }

    .requests-table th,
    .requests-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    .requests-table th {
        background: #f3f4f6;
        font-weight: 600;
        color: #374151;
        position: sticky;
        top: 0;
    }

    .requests-table tr:hover {
        background: #f9fafb;
    }

    .resource-type-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
    }

    .resource-type-script { background: #dbeafe; color: #1e40af; }
    .resource-type-stylesheet { background: #fce7f3; color: #be185d; }
    .resource-type-image { background: #dcfce7; color: #166534; }
    .resource-type-font { background: #fef3c7; color: #92400e; }
    .resource-type-api { background: #e0e7ff; color: #3730a3; }
    .resource-type-other { background: #f3f4f6; color: #374151; }

    .performance-section {
        margin-bottom: 25px;
    }

    .profile-section {
        margin-bottom: 25px;
    }

    .profile-info {
        background: #f8fafc;
        border-radius: 10px;
        padding: 15px;
        color: #6b7280;
        font-size: 0.9rem;
    }

    .toggle-button {
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 0.8rem;
        margin-bottom: 15px;
        transition: background 0.3s ease;
    }

    .toggle-button:hover {
        background: #5a67d8;
    }

    .collapsible-content {
        display: none;
    }

    .collapsible-content.active {
        display: block;
    }

    @media (max-width: 768px) {
        .container {
            padding: 10px;
        }
        
        .header h1 {
            font-size: 2rem;
        }
        
        .scenarios-grid {
            grid-template-columns: 1fr;
        }
        
        .summary-stats {
            grid-template-columns: repeat(2, 1fr);
        }
    }
  `;
}
function getJavaScript() {
  return `
    // Toggle collapsible sections
    document.addEventListener('DOMContentLoaded', function() {
        const toggleButtons = document.querySelectorAll('.toggle-button');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const content = this.nextElementSibling;
                const isActive = content.classList.contains('active');
                
                if (isActive) {
                    content.classList.remove('active');
                    this.textContent = this.textContent.replace('Hide', 'Show');
                } else {
                    content.classList.add('active');
                    this.textContent = this.textContent.replace('Show', 'Hide');
                }
            });
        });

        // Initialize charts for network requests
        initializeCharts();
    });

    function initializeCharts() {
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const data = JSON.parse(canvas.dataset.chartData);
            
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        data: Object.values(data),
                        backgroundColor: [
                            '#667eea',
                            '#764ba2',
                            '#f093fb',
                            '#f5576c',
                            '#4facfe',
                            '#00f2fe',
                            '#43e97b',
                            '#38f9d7'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        });
    }
  `;
}
function createBudgetViolationsSection(violations) {
  return `
    <div class="budget-violations">
        <h2>⚠️ Budget Violations</h2>
        ${violations.map((violation) => `
            <div class="violation-item">${violation}</div>
        `).join("")}
    </div>
  `;
}
function createScenarioCard(report) {
  return `
    <div class="scenario-card">
        <div class="scenario-header">
            <div class="scenario-title">${report.scenario}</div>
            <div class="scenario-url">${report.url}</div>
            <div class="scenario-timestamp">${new Date(report.timestamp).toLocaleString()}</div>
        </div>

        ${createWebVitalsSection(report.metrics)}
        ${createPerformanceSection(report.performance)}
        ${createNetworkSection(report.network)}
        ${createProfileSection(report.profile)}
    </div>
  `;
}
function createWebVitalsSection(metrics) {
  const metricCards = Object.entries(metrics).filter(([_, value]) => value !== void 0).map(([name, value]) => {
    const unit = name === "CLS" ? "" : "ms";
    const color = getMetricColor(name, value);
    return `
        <div class="metric-card" style="border-color: ${color}">
            <div class="metric-name">${name}</div>
            <div class="metric-value">${value?.toFixed(2)}</div>
            <div class="metric-unit">${unit}</div>
        </div>
      `;
  }).join("");
  return `
    <div class="metrics-section">
        <div class="section-title">
            📊 Web Vitals
        </div>
        <div class="metrics-grid">
            ${metricCards}
        </div>
    </div>
  `;
}
function createPerformanceSection(performance2) {
  return `
    <div class="performance-section">
        <div class="section-title">
            ⚡ Performance Metrics
        </div>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-name">Load Time</div>
                <div class="metric-value">${performance2.loadTime.toFixed(2)}</div>
                <div class="metric-unit">ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-name">DOM Content Loaded</div>
                <div class="metric-value">${performance2.domContentLoaded.toFixed(2)}</div>
                <div class="metric-unit">ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-name">First Paint</div>
                <div class="metric-value">${performance2.firstPaint.toFixed(2)}</div>
                <div class="metric-unit">ms</div>
            </div>
        </div>
    </div>
  `;
}
function createNetworkSection(network) {
  if (!network || network.requests.length === 0) {
    return `
      <div class="network-section">
        <div class="section-title">🌐 Network Requests</div>
        <div class="profile-info">No network data available</div>
      </div>
    `;
  }
  const summary = network.summary;
  const requestsByType = summary.requestsByType;
  const chartData = JSON.stringify(requestsByType);
  return `
    <div class="network-section">
        <div class="section-title">
            🌐 Network Requests
        </div>
        
        <div class="network-summary">
            <div class="network-stat">
                <div class="network-stat-label">Total Requests</div>
                <div class="network-stat-value">${summary.totalRequests}</div>
            </div>
            <div class="network-stat">
                <div class="network-stat-label">Total Size</div>
                <div class="network-stat-value">${formatBytes(summary.totalTransferSize)}</div>
            </div>
            <div class="network-stat">
                <div class="network-stat-label">Avg Response</div>
                <div class="network-stat-value">${summary.averageResponseTime.toFixed(2)}ms</div>
            </div>
            <div class="network-stat">
                <div class="network-stat-label">Failed</div>
                <div class="network-stat-value">${summary.failedRequests}</div>
            </div>
        </div>

        ${summary.slowestRequest ? `
            <div class="network-stat" style="margin-bottom: 20px;">
                <div class="network-stat-label">Slowest Request</div>
                <div class="network-stat-value" style="font-size: 0.9rem; word-break: break-all;">
                    ${summary.slowestRequest.url}
                </div>
                <div style="color: #ef4444; font-weight: 600; margin-top: 5px;">
                    ${summary.slowestRequest.responseTime.toFixed(2)}ms
                </div>
            </div>
        ` : ""}

        <div class="requests-by-type">
            <div class="section-title">📈 Requests by Type</div>
            <div class="chart-container">
                <canvas data-chart-data='${chartData}'></canvas>
            </div>
        </div>

        <button class="toggle-button">Show Detailed Requests</button>
        <div class="collapsible-content">
            <div class="requests-table">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>URL</th>
                            <th>Response Time</th>
                            <th>Size</th>
                            <th>Domain</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${network.requests.slice(0, 20).map((req) => `
                            <tr>
                                <td>
                                    <span class="resource-type-badge resource-type-${req.resourceType}">
                                        ${req.resourceType}
                                    </span>
                                </td>
                                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${req.url}
                                </td>
                                <td>${req.responseTime.toFixed(2)}ms</td>
                                <td>${formatBytes(req.transferSize)}</td>
                                <td>${req.domain}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                ${network.requests.length > 20 ? `
                    <div style="padding: 15px; text-align: center; color: #6b7280;">
                        ... and ${network.requests.length - 20} more requests
                    </div>
                ` : ""}
            </div>
        </div>
    </div>
  `;
}
function createProfileSection(profile) {
  if (!profile) {
    return `
      <div class="profile-section">
        <div class="section-title">📊 Profile</div>
        <div class="profile-info">No profile data available</div>
      </div>
    `;
  }
  return `
    <div class="profile-section">
        <div class="section-title">📊 Profile</div>
        <div class="profile-info">
            Profile data collected: ${profile.nodes ? profile.nodes.length : 0} nodes
        </div>
    </div>
  `;
}
function getMetricColor(metricName, value) {
  const thresholds = {
    FCP: { good: 1800, poor: 3e3 },
    LCP: { good: 2500, poor: 4e3 },
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    TTFB: { good: 800, poor: 1800 }
  };
  const threshold = thresholds[metricName];
  if (!threshold) return "#667eea";
  if (value <= threshold.good) return "#10b981";
  if (value <= threshold.poor) return "#f59e0b";
  return "#ef4444";
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
async function measureNetworkRequests(page) {
  const networkData = await page.evaluate(() => {
    function getResourceType(url) {
      const extension = url.split(".").pop()?.toLowerCase();
      const pathname = new URL(url).pathname.toLowerCase();
      if (pathname.includes("/api/") || pathname.includes("/graphql")) {
        return "api";
      }
      switch (extension) {
        case "js":
          return "script";
        case "css":
          return "stylesheet";
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "svg":
        case "webp":
        case "ico":
          return "image";
        case "woff":
        case "woff2":
        case "ttf":
        case "otf":
          return "font";
        case "mp4":
        case "webm":
        case "ogg":
          return "media";
        case "json":
          return "json";
        case "xml":
          return "xml";
        default:
          return "other";
      }
    }
    const entries = performance.getEntriesByType("resource");
    const requests = entries.map((entry) => {
      const url = new URL(entry.name);
      const domain = url.hostname;
      const protocol = url.protocol.replace(":", "");
      return {
        url: entry.name,
        method: "GET",
        // Performance API doesn't provide method, defaulting to GET
        status: 200,
        // Performance API doesn't provide status, defaulting to 200
        statusText: "OK",
        responseTime: entry.responseEnd - entry.responseStart,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        startTime: entry.startTime,
        endTime: entry.responseEnd,
        duration: entry.duration,
        resourceType: getResourceType(entry.name),
        fromCache: entry.transferSize === 0 && entry.encodedBodySize > 0,
        protocol,
        domain
      };
    });
    const summary = {
      totalRequests: requests.length,
      totalTransferSize: requests.reduce((sum, req) => sum + req.transferSize, 0),
      totalEncodedSize: requests.reduce((sum, req) => sum + req.encodedBodySize, 0),
      totalDecodedSize: requests.reduce((sum, req) => sum + req.decodedBodySize, 0),
      averageResponseTime: requests.length > 0 ? requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length : 0,
      slowestRequest: requests.length > 0 ? requests.reduce((slowest, req) => req.responseTime > slowest.responseTime ? req : slowest) : null,
      failedRequests: requests.filter((req) => req.status >= 400).length,
      requestsByType: {},
      requestsByDomain: {}
    };
    requests.forEach((req) => {
      summary.requestsByType[req.resourceType] = (summary.requestsByType[req.resourceType] || 0) + 1;
      summary.requestsByDomain[req.domain] = (summary.requestsByDomain[req.domain] || 0) + 1;
    });
    return {
      requests,
      summary
    };
  });
  return networkData;
}
async function profileJs(page, run) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.start");
  let error;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  const { profile } = await cdp.send("Profiler.stop");
  await cdp.send("Profiler.disable");
  return { profile, error };
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
async function runProfile(page, scenario) {
  for (const step of scenario.steps) {
    await executeScenarioStep(page, step);
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
    let profileResponse = null;
    if (config?.enableProfile) {
      profileResponse = await profileJs(page, () => runProfile(page, scenario));
    } else {
      await runProfile(page, scenario);
    }
    await page.waitForTimeout(2e3);
    const webVitals = await collectVitals(page);
    const performance2 = await measurePerformanceMetrics(page);
    const network = await measureNetworkRequests(page);
    const report = {
      scenario: scenario.name,
      url: scenario.url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      metrics: webVitals,
      performance: performance2,
      network,
      profile: profileResponse?.profile || null
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
  const browser = await chromium.launch({
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
        const scenario = loadScenarioFile(filePath, config.variables);
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
    const result = { reports, summary };
    if (config.generateHTMLReport) {
      const htmlReportPath = config.htmlReportPath || (config.outputPath ? `${config.outputPath}/web-vitals-report.html` : "web-vitals-report.html");
      generateHTMLReport(result, htmlReportPath);
    }
    return result;
  } finally {
    await browser.close();
  }
}
export {
  analyzeProfile,
  collectVitals,
  runWebVitalsGuardian as default,
  executeScenarioStep,
  exportProfileData,
  findScenarioFiles,
  formatProfileAnalysis,
  generateHTMLReport,
  getFunctionsBySource,
  getTopExpensiveFunctions,
  interpolateObject,
  interpolateScenario,
  interpolateVariables,
  loadScenarioFile,
  loadWebVitalsPackage,
  measureNetworkRequests,
  measurePerformanceMetrics,
  measureWebVitals,
  measureWebVitalsWithObserver,
  mergeVariables,
  profileJs,
  runScenario,
  runWebVitalsGuardian,
  startVitalsObservation
};
//# sourceMappingURL=index.mjs.map
