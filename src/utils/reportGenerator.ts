import type { WebVitalsReport, GuardianResult } from '../types';
import fs from 'fs';
import path from 'path';

/**
 * Generates an elegant HTML report for Web Vitals Guardian results
 * @param result - Guardian execution result
 * @param outputPath - Path to save the HTML report
 */
export function generateHTMLReport(result: GuardianResult, outputPath: string): void {
  const html = createHTMLReport(result);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, html);
  console.log(`📊 HTML report generated: ${outputPath}`);
}

/**
 * Creates the complete HTML report content
 */
function createHTMLReport(result: GuardianResult): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Vitals Guardian Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
                <div class="stat-card ${result.summary.failed > 0 ? 'error' : 'success'}">
                    <div class="stat-number">${result.summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card ${result.summary.budgetViolations.length > 0 ? 'warning' : 'success'}">
                    <div class="stat-number">${result.summary.budgetViolations.length}</div>
                    <div class="stat-label">Budget Violations</div>
                </div>
            </div>
        </header>

        <main class="main-content">
            ${result.summary.budgetViolations.length > 0 ? createBudgetViolationsSection(result.summary.budgetViolations) : ''}
            
            <div class="scenarios-grid">
                ${result.reports.map(report => createScenarioCard(report)).join('')}
            </div>
        </main>
    </div>

    <script>
        ${getJavaScript()}
    </script>
</body>
</html>`;
}

/**
 * Creates CSS styles for the report
 */
function getCSS(): string {
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

/**
 * Creates JavaScript for interactive features
 */
function getJavaScript(): string {
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

/**
 * Creates budget violations section
 */
function createBudgetViolationsSection(violations: string[]): string {
  return `
    <div class="budget-violations">
        <h2>⚠️ Budget Violations</h2>
        ${violations.map(violation => `
            <div class="violation-item">${violation}</div>
        `).join('')}
    </div>
  `;
}

/**
 * Creates a scenario card with all metrics
 */
function createScenarioCard(report: WebVitalsReport): string {
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

/**
 * Creates Web Vitals metrics section
 */
function createWebVitalsSection(metrics: WebVitalsReport['metrics']): string {
  const metricCards = Object.entries(metrics)
    .filter(([_, value]) => value !== undefined)
    .map(([name, value]) => {
      const unit = name === 'CLS' ? '' : 'ms';
      const color = getMetricColor(name, value);
      return `
        <div class="metric-card" style="border-color: ${color}">
            <div class="metric-name">${name}</div>
            <div class="metric-value">${value?.toFixed(2)}</div>
            <div class="metric-unit">${unit}</div>
        </div>
      `;
    }).join('');

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

/**
 * Creates performance metrics section
 */
function createPerformanceSection(performance: WebVitalsReport['performance']): string {
  return `
    <div class="performance-section">
        <div class="section-title">
            ⚡ Performance Metrics
        </div>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-name">Load Time</div>
                <div class="metric-value">${performance.loadTime.toFixed(2)}</div>
                <div class="metric-unit">ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-name">DOM Content Loaded</div>
                <div class="metric-value">${performance.domContentLoaded.toFixed(2)}</div>
                <div class="metric-unit">ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-name">First Paint</div>
                <div class="metric-value">${performance.firstPaint.toFixed(2)}</div>
                <div class="metric-unit">ms</div>
            </div>
        </div>
    </div>
  `;
}

/**
 * Creates network requests section
 */
function createNetworkSection(network: WebVitalsReport['network']): string {
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
        ` : ''}

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
                        ${network.requests.slice(0, 20).map(req => `
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
                        `).join('')}
                    </tbody>
                </table>
                ${network.requests.length > 20 ? `
                    <div style="padding: 15px; text-align: center; color: #6b7280;">
                        ... and ${network.requests.length - 20} more requests
                    </div>
                ` : ''}
            </div>
        </div>
    </div>
  `;
}

/**
 * Creates profile section
 */
function createProfileSection(profile: any): string {
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

/**
 * Gets color for metric based on value and thresholds
 */
function getMetricColor(metricName: string, value: number): string {
  const thresholds = {
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    TTFB: { good: 800, poor: 1800 }
  };

  const threshold = thresholds[metricName as keyof typeof thresholds];
  if (!threshold) return '#667eea';

  if (value <= threshold.good) return '#10b981';
  if (value <= threshold.poor) return '#f59e0b';
  return '#ef4444';
}

/**
 * Formats bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
