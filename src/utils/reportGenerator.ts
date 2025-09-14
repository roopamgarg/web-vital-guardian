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
    <title>Performance Analysis Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://unpkg.com/tabulator-tables@5.5.2/dist/js/tabulator.min.js"></script>
    <link href="https://unpkg.com/tabulator-tables@5.5.2/dist/css/tabulator.min.css" rel="stylesheet">
    <style>
        ${getCSS()}
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <h1>Performance Analysis Dashboard</h1>
                <p>Monitor Core Web Vitals, network performance, and JavaScript profiling across different user flows</p>
            </div>
            <div class="header-score">
                <div class="score-value">${calculateOverallScore(result.reports)}</div>
                <div class="score-label">${getScoreLabel(calculateOverallScore(result.reports))}</div>
            </div>
        </header>

        <!-- Navigation Tabs -->
        <nav class="nav-tabs">
            <button class="nav-tab active" data-tab="overview">Overall</button>
            ${result.reports.map((report, index) => `
                <button class="nav-tab" data-tab="scenario-${index}">${report.scenario}</button>
            `).join('')}
        </nav>

        <!-- Main Content -->
        <main class="dashboard-content">
            <!-- Overview Tab -->
            <div class="tab-content active" id="overview">
                ${createOverviewContent(result.reports)}
            </div>

            <!-- Individual Scenario Tabs -->
            ${result.reports.map((report, index) => `
                <div class="tab-content" id="scenario-${index}">
                    ${createScenarioContent(report, index)}
                </div>
            `).join('')}
        </main>
    </div>

    <script>
        // Embed data for JavaScript access
        window.dashboardData = ${JSON.stringify(result.reports, null, 2)};
        ${getJavaScript()}
    </script>
</body>
</html>`;
}

/**
 * Creates CSS styles for the professional dashboard
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
        background: #f8fafc;
        color: #1f2937;
        line-height: 1.6;
    }

    .dashboard {
        min-height: 100vh;
        background: #f8fafc;
    }

    /* Header */
    .dashboard-header {
        background: white;
        padding: 2rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-content h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .header-content p {
        color: #6b7280;
        font-size: 1rem;
    }

    .header-score {
        text-align: right;
    }

    .score-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1f2937;
    }

    .score-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    /* Navigation Tabs */
    .nav-tabs {
        background: white;
        border-bottom: 1px solid #e5e7eb;
        padding: 0 2rem;
        display: flex;
        gap: 0;
    }

    .nav-tab {
        padding: 1rem 1.5rem;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        position: relative;
    }

    .nav-tab:hover {
        color: #374151;
        background: #f9fafb;
    }

    .nav-tab.active {
        color: #1f2937;
        border-bottom-color: #3b82f6;
        background: #f9fafb;
    }

    /* Main Content */
    .dashboard-content {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
    }

    .tab-content {
        display: none;
    }

    .tab-content.active {
        display: block;
    }

    /* Performance Scores Section */
    .performance-scores {
        margin-bottom: 2rem;
    }

    .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 1rem;
    }

    .scores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .score-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        text-align: center;
    }

    .score-card.excellent {
        border-left: 4px solid #10b981;
    }

    .score-card.good {
        border-left: 4px solid #f59e0b;
    }

    .score-card.needs-improvement {
        border-left: 4px solid #ef4444;
    }

    .score-card-value {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
    }

    .score-card-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    .score-card-status {
        font-size: 0.75rem;
        font-weight: 600;
        margin-top: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        display: inline-block;
    }

    .score-card-status.excellent {
        background: #dcfce7;
        color: #166534;
    }

    .score-card-status.good {
        background: #fef3c7;
        color: #92400e;
    }

    .score-card-status.needs-improvement {
        background: #fecaca;
        color: #dc2626;
    }

    /* Core Web Vitals Section */
    .core-web-vitals {
        margin-bottom: 2rem;
    }

    .vitals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .vital-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        position: relative;
    }

    .vital-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .vital-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #1f2937;
    }

    .vital-status {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        background: #dcfce7;
        color: #166534;
    }

    .vital-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .vital-description {
        font-size: 0.75rem;
        color: #6b7280;
        margin-bottom: 1rem;
    }

    .vital-chart {
        height: 60px;
        background: #f3f4f6;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
    }

    .vital-chart-line {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #3b82f6;
        border-radius: 1px;
    }

    /* Content Grid */
    .content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    /* Network Analysis Section */
    .network-analysis {
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
    }

    .section-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
    }

    .section-header h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .section-summary {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: #6b7280;
    }

    .network-content {
        padding: 1.5rem;
        overflow: auto;
    }

    .network-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .network-table th,
    .network-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    .network-table th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .network-table tr {
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .network-table tr:hover {
        background: #f8fafc;
    }

    .network-table tr.expanded {
        background: #f1f5f9;
    }

    .network-table tr.expanded:hover {
        background: #e2e8f0;
    }

    .expandable-row {
        display: none;
    }

    .expandable-row.active {
        display: table-row;
    }

    .expandable-content {
        padding: 1rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
    }

    .network-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .detail-group {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
    }

    .detail-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
    }

    .detail-value {
        font-size: 0.875rem;
        color: #1f2937;
        word-break: break-all;
    }

    .timing-breakdown {
        margin-top: 1rem;
    }

    .timing-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e2e8f0;
    }

    .timing-item:last-child {
        border-bottom: none;
    }

    .timing-label {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .timing-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: #1f2937;
    }

    .expand-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 0.5rem;
        transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
        transform: rotate(90deg);
    }

    /* Network Details Modal */
    .network-details-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        z-index: 1001;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .modal-header h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
    }

    .modal-header button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.5rem;
        border-radius: 4px;
    }

    .modal-header button:hover {
        background: #f3f4f6;
        color: #374151;
    }

    .modal-body {
        padding: 1.5rem;
    }

    .network-details {
        margin-bottom: 1.5rem;
    }

    .detail-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid #f3f4f6;
    }

    .detail-group:last-child {
        border-bottom: none;
    }

    .detail-label {
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
    }

    .detail-value {
        color: #1f2937;
        font-size: 0.875rem;
        word-break: break-all;
        text-align: right;
        max-width: 60%;
    }

    .timing-breakdown {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
    }

    .timing-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        font-size: 0.875rem;
    }

    .timing-label {
        color: #6b7280;
        font-weight: 500;
    }

    .timing-value {
        color: #1f2937;
        font-weight: 600;
    }

    /* Tabulator Custom Styling to Match Dashboard */
    .tabulator {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-family: inherit;
    }

    .tabulator .tabulator-header {
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
    }

    .tabulator .tabulator-header .tabulator-col {
        background: #f8fafc;
        border-right: 1px solid #e5e7eb;
        color: #374151;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .tabulator .tabulator-header .tabulator-col:hover {
        background: #f1f5f9;
        color: #1f2937;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sortable:hover {
        background: #f1f5f9;
        color: #3b82f6;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sorted {
        background: #f1f5f9;
        color: #3b82f6;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sorted .tabulator-col-sorter {
        color: #3b82f6;
    }

    .tabulator .tabulator-tableholder {
        background: #ffffff;
    }

    .tabulator .tabulator-tableholder .tabulator-table {
        background: #ffffff;
    }

    .tabulator .tabulator-row {
        background: #ffffff;
        border-bottom: 1px solid #f3f4f6;
        color: #374151;
    }

    .tabulator .tabulator-row:hover {
        background: #f8fafc;
        color: #1f2937;
    }

    .tabulator .tabulator-row.tabulator-selectable:hover {
        background: #f1f5f9;
        color: #1f2937;
    }

    .tabulator .tabulator-row.tabulator-selected {
        background: #dbeafe;
        color: #1e40af;
    }

    .tabulator .tabulator-row.tabulator-selected:hover {
        background: #bfdbfe;
        color: #1e40af;
    }

    .tabulator .tabulator-cell {
        border-right: 1px solid #f3f4f6;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: #374151;
    }

    .tabulator .tabulator-row:hover .tabulator-cell {
        color: #1f2937;
    }

    .tabulator .tabulator-footer {
        background: #f8fafc;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 0.875rem;
    }

    .tabulator .tabulator-footer .tabulator-page {
        background: #ffffff;
        border: 1px solid #d1d5db;
        color: #374151;
        margin: 0 2px;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
    }

    .tabulator .tabulator-footer .tabulator-page:hover {
        background: #f3f4f6;
        color: #1f2937;
        border-color: #9ca3af;
    }

    .tabulator .tabulator-footer .tabulator-page.active {
        background: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
    }

    .tabulator .tabulator-footer .tabulator-page.active:hover {
        background: #2563eb;
        border-color: #2563eb;
    }

    .tabulator .tabulator-footer .tabulator-page-size {
        background: #ffffff;
        border: 1px solid #d1d5db;
        color: #374151;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        margin: 0 4px;
    }

    .tabulator .tabulator-footer .tabulator-page-size:hover {
        background: #f3f4f6;
        color: #1f2937;
        border-color: #9ca3af;
    }

    .tabulator .tabulator-footer .tabulator-page-size.active {
        background: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
    }

    /* Search and Filter Styling */
    .tabulator .tabulator-header-filter {
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        padding: 0.5rem;
        font-size: 0.875rem;
        color: #374151;
    }

    .tabulator .tabulator-header-filter:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Loading and Empty States */
    .tabulator .tabulator-loading {
        background: rgba(248, 250, 252, 0.8);
        color: #6b7280;
    }

    .tabulator .tabulator-empty {
        background: #ffffff;
        color: #6b7280;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .tabulator .tabulator-cell {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
        }
        
        .tabulator .tabulator-header .tabulator-col {
            font-size: 0.8rem;
            padding: 0.5rem 0.75rem;
        }
    }

    .resource-type {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
    }

    .resource-type.document { background: #dbeafe; color: #1e40af; }
    .resource-type.script { background: #fce7f3; color: #be185d; }
    .resource-type.stylesheet { background: #dcfce7; color: #166534; }
    .resource-type.image { background: #fef3c7; color: #92400e; }
    .resource-type.font { background: #e0e7ff; color: #3730a3; }
    .resource-type.xhr { background: #f3f4f6; color: #374151; }

    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-success {
        background: #dcfce7;
        color: #166534;
    }

    .priority-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .priority-high {
        background: #fecaca;
        color: #dc2626;
    }

    .priority-medium {
        background: #f3f4f6;
        color: #374151;
    }

    /* JavaScript Profiler Section */
    .js-profiler {
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
    }

    .profiler-content {
        padding: 1.5rem;
    }

    .function-list {
        margin-bottom: 1.5rem;
    }

    .function-item {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
    }

    .function-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
        margin-right: 1rem;
        min-width: 200px;
    }

    .function-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        margin-right: 1rem;
        position: relative;
        overflow: hidden;
    }

    .function-bar-fill {
        height: 100%;
        background: #3b82f6;
        border-radius: 4px;
    }

    .function-time {
        font-size: 0.75rem;
        color: #6b7280;
        min-width: 80px;
        text-align: right;
    }

    .function-chart {
        height: 200px;
        margin-bottom: 1.5rem;
    }

    .profiler-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }

    .profiler-stat {
        text-align: center;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 6px;
    }

    .profiler-stat-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.25rem;
    }

    .profiler-stat-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
    }

    /* Performance Summary */
    .performance-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }

    .summary-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        text-align: center;
    }

    .summary-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.25rem;
    }

    .summary-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    /* Charts */
    .chart-container {
        position: relative;
        height: 300px;
        margin: 1rem 0;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
        .content-grid {
            grid-template-columns: 1fr;
        }
        
        .vitals-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .nav-tabs {
            padding: 0 1rem;
            overflow-x: auto;
        }
        
        .dashboard-content {
            padding: 1rem;
        }
        
        .vitals-grid {
            grid-template-columns: 1fr;
        }
        
        .performance-summary {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .profiler-stats {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 480px) {
        .performance-summary {
            grid-template-columns: 1fr;
        }
        
        .profiler-stats {
            grid-template-columns: 1fr;
        }
    }
    `;
}

/**
 * Creates JavaScript for interactive features
 */
function getJavaScript(): string {
    return `
    document.addEventListener('DOMContentLoaded', function() {
        initializeTabs();
        initializeCharts();
        initializeNetworkTables();
    });

    function initializeTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    function initializeNetworkTables() {
        // Initialize overview network table
        const overviewTable = document.querySelector('[id^="networkTable-"]');
        if (overviewTable && window.dashboardData) {
            const allRequests = [];
            window.dashboardData.forEach(report => {
                if (report.network?.requests) {
                    allRequests.push(...report.network.requests.map(req => ({
                        ...req,
                        urlShortName: (req.url.split('/').pop() || req.url).substring(0, 20) + '...',
                        sizeFormatted: formatBytes(req.transferSize),
                        timeFormatted: req.responseTime.toFixed(0) + 'ms',
                        statusFormatted: 'Success',
                        priorityFormatted: 'High'
                    })));
                }
            });
            
            new Tabulator(overviewTable, {
                data: allRequests.sort((a, b) => b.responseTime - a.responseTime),
                layout: "fitColumns",
                pagination: "local",
                paginationSize: 10,
                paginationSizeSelector: [5, 10, 20, 50],
                movableColumns: true,
                resizableRows: true,
                tooltips: true,
                theme: "default",
                headerFilterPlaceholder: "Search...",
                placeholder: "No network requests found",
                columns: [
                    {
                        title: "URL Short Name",
                        field: "urlShortName",
                        width: 200,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            return '<span class="expand-icon">▶</span>' + cell.getValue();
                        }
                    },
                    {
                        title: "Domain",
                        field: "domain",
                        width: 150,
                        sorter: "string"
                    },
                    {
                        title: "Type",
                        field: "resourceType",
                        width: 100,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            const type = cell.getValue();
                            return '<span class="resource-type ' + type + '">' + type + '</span>';
                        }
                    },
                    {
                        title: "Size",
                        field: "sizeFormatted",
                        width: 100,
                        sorter: "number",
                        sorterParams: {column: "transferSize"}
                    },
                    {
                        title: "Time",
                        field: "timeFormatted",
                        width: 100,
                        sorter: "number",
                        sorterParams: {column: "responseTime"}
                    },
                    {
                        title: "Status",
                        field: "statusFormatted",
                        width: 100,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            return '<span class="status-badge status-success">' + cell.getValue() + '</span>';
                        }
                    },
                    {
                        title: "Priority",
                        field: "priorityFormatted",
                        width: 100,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            return '<span class="priority-badge priority-high">' + cell.getValue() + '</span>';
                        }
                    }
                ],
                rowClick: function(e, row) {
                    showNetworkDetails(row.getData());
                }
            });
        }
        
        // Initialize scenario network tables
        const scenarioTables = document.querySelectorAll('[id^="scenarioNetworkTable-"]');
        scenarioTables.forEach((table, index) => {
            if (window.dashboardData && window.dashboardData[index]?.network?.requests) {
                const requests = window.dashboardData[index].network.requests.map(req => ({
                    ...req,
                    urlShortName: (req.url.split('/').pop() || req.url).substring(0, 20) + '...',
                    sizeFormatted: formatBytes(req.transferSize),
                    timeFormatted: req.responseTime.toFixed(0) + 'ms',
                    statusFormatted: 'Success',
                    priorityFormatted: 'High'
                }));
                
                new Tabulator(table, {
                    data: requests,
                    layout: "fitColumns",
                    pagination: "local",
                    paginationSize: 10,
                    paginationSizeSelector: [5, 10, 20, 50],
                    movableColumns: true,
                    resizableRows: true,
                    tooltips: true,
                    theme: "default",
                    headerFilterPlaceholder: "Search...",
                    placeholder: "No network requests found",
                    columns: [
                        {
                            title: "URL Short Name",
                            field: "urlShortName",
                            width: 200,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                return '<span class="expand-icon">▶</span>' + cell.getValue();
                            }
                        },
                        {
                            title: "Domain",
                            field: "domain",
                            width: 150,
                            sorter: "string"
                        },
                        {
                            title: "Type",
                            field: "resourceType",
                            width: 100,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                const type = cell.getValue();
                                return '<span class="resource-type ' + type + '">' + type + '</span>';
                            }
                        },
                        {
                            title: "Size",
                            field: "sizeFormatted",
                            width: 100,
                            sorter: "number",
                            sorterParams: {column: "transferSize"}
                        },
                        {
                            title: "Time",
                            field: "timeFormatted",
                            width: 100,
                            sorter: "number",
                            sorterParams: {column: "responseTime"}
                        },
                        {
                            title: "Status",
                            field: "statusFormatted",
                            width: 100,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                return '<span class="status-badge status-success">' + cell.getValue() + '</span>';
                            }
                        },
                        {
                            title: "Priority",
                            field: "priorityFormatted",
                            width: 100,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                return '<span class="priority-badge priority-high">' + cell.getValue() + '</span>';
                            }
                        }
                    ],
                    rowClick: function(e, row) {
                        showNetworkDetails(row.getData());
                    }
                });
            }
        });
    }
    
    function showNetworkDetails(requestData) {
        const modal = document.createElement('div');
        modal.className = 'network-details-modal';
        modal.innerHTML = \`
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Network Request Details</h3>
                    <button onclick="this.closest('.network-details-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    \${createNetworkRequestDetailsHTML(requestData)}
                </div>
            </div>
        \`;
        document.body.appendChild(modal);
    }
    
    function createNetworkRequestDetailsHTML(request) {
        const timing = request.timing || {};
        const headers = request.headers || {};
        
        return \`
            <div class="network-details">
                <div class="detail-group">
                    <div class="detail-label">Full URL</div>
                    <div class="detail-value">\${request.url}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Method</div>
                    <div class="detail-value">\${request.method || 'GET'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Status Code</div>
                    <div class="detail-value">\${request.status || 'N/A'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Domain</div>
                    <div class="detail-value">\${request.domain || 'N/A'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Protocol</div>
                    <div class="detail-value">\${request.protocol || 'N/A'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Cache Status</div>
                    <div class="detail-value">\${request.cacheStatus || 'N/A'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Transfer Size</div>
                    <div class="detail-value">\${formatBytes(request.transferSize || 0)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Encoded Size</div>
                    <div class="detail-value">\${formatBytes(request.encodedSize || 0)}</div>
                </div>
            </div>
            
            <div class="timing-breakdown">
                <h4 style="margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem;">Timing Breakdown</h4>
                <div class="timing-item">
                    <span class="timing-label">DNS Lookup</span>
                    <span class="timing-value">\${(timing.dnsLookup || 0).toFixed(2)}ms</span>
                </div>
                <div class="timing-item">
                    <span class="timing-label">TCP Connect</span>
                    <span class="timing-value">\${(timing.tcpConnect || 0).toFixed(2)}ms</span>
                </div>
                <div class="timing-item">
                    <span class="timing-label">SSL Handshake</span>
                    <span class="timing-value">\${(timing.sslHandshake || 0).toFixed(2)}ms</span>
                </div>
                <div class="timing-item">
                    <span class="timing-label">Request Send</span>
                    <span class="timing-value">\${(timing.requestSend || 0).toFixed(2)}ms</span>
                </div>
                <div class="timing-item">
                    <span class="timing-label">Wait Time</span>
                    <span class="timing-value">\${(timing.waitTime || 0).toFixed(2)}ms</span>
                </div>
                <div class="timing-item">
                    <span class="timing-label">Response Receive</span>
                    <span class="timing-value">\${(timing.responseReceive || 0).toFixed(2)}ms</span>
                </div>
                <div class="timing-item" style="border-top: 2px solid #e2e8f0; margin-top: 0.5rem; padding-top: 0.5rem;">
                    <span class="timing-label" style="font-weight: 600;">Total Time</span>
                    <span class="timing-value" style="font-weight: 700;">\${(request.responseTime || 0).toFixed(2)}ms</span>
                </div>
            </div>
        \`;
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function initializeNetworkRows() {
        const networkRows = document.querySelectorAll('.network-row');
        
        networkRows.forEach(row => {
            row.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                const expandableRow = document.querySelector(\`.expandable-row[data-index="\${index}"]\`);
                const expandIcon = this.querySelector('.expand-icon');
                
                if (expandableRow && expandIcon) {
                    const isExpanded = expandableRow.classList.contains('active');
                    
                    if (isExpanded) {
                        // Collapse
                        expandableRow.classList.remove('active');
                        this.classList.remove('expanded');
                        expandIcon.classList.remove('expanded');
                        expandIcon.textContent = '▶';
                    } else {
                        // Expand
                        expandableRow.classList.add('active');
                        this.classList.add('expanded');
                        expandIcon.classList.add('expanded');
                        expandIcon.textContent = '▼';
                    }
                }
            });
        });
    }

    function initializeCharts() {
        // Initialize any charts that need to be rendered
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const data = JSON.parse(canvas.dataset.chartData || '{}');
            
            if (Object.keys(data).length > 0) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(data),
                        datasets: [{
                            data: Object.values(data),
                            backgroundColor: [
                                '#3b82f6',
                                '#10b981',
                                '#f59e0b',
                                '#ef4444',
                                '#8b5cf6',
                                '#06b6d4'
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
            }
        });
    }
  `;
}

/**
 * Calculates overall performance score
 */
function calculateOverallScore(reports: WebVitalsReport[]): number {
    if (reports.length === 0) return 0;
    
    let totalScore = 0;
    let validReports = 0;
    
    reports.forEach(report => {
        const score = calculateScenarioScore(report);
        if (score > 0) {
            totalScore += score;
            validReports++;
        }
    });
    
    return validReports > 0 ? Math.round(totalScore / validReports) : 0;
}

/**
 * Calculates score for a single scenario
 */
function calculateScenarioScore(report: WebVitalsReport): number {
    const metrics = report.metrics;
    if (!metrics) return 0;
    
    let score = 0;
    let validMetrics = 0;
    
    // FCP scoring (0-25 points)
    if (metrics.FCP !== undefined) {
        if (metrics.FCP <= 1800) score += 25;
        else if (metrics.FCP <= 3000) score += 15;
        else if (metrics.FCP <= 4000) score += 5;
        validMetrics++;
    }
    
    // LCP scoring (0-25 points)
    if (metrics.LCP !== undefined) {
        if (metrics.LCP <= 2500) score += 25;
        else if (metrics.LCP <= 4000) score += 15;
        else if (metrics.LCP <= 5000) score += 5;
        validMetrics++;
    }
    
    // CLS scoring (0-25 points)
    if (metrics.CLS !== undefined) {
        if (metrics.CLS <= 0.1) score += 25;
        else if (metrics.CLS <= 0.25) score += 15;
        else if (metrics.CLS <= 0.4) score += 5;
        validMetrics++;
    }
    
    // INP scoring (0-25 points)
    if (metrics.INP !== undefined) {
        if (metrics.INP <= 200) score += 25;
        else if (metrics.INP <= 500) score += 15;
        else if (metrics.INP <= 1000) score += 5;
        validMetrics++;
    }
    
    return validMetrics > 0 ? Math.round((score / (validMetrics * 25)) * 100) : 0;
}

/**
 * Gets score label based on score value
 */
function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
}

/**
 * Creates overview content
 */
function createOverviewContent(reports: WebVitalsReport[]): string {
    return `
        <!-- Performance Scores by Scenario -->
        <div class="performance-scores">
            <h2 class="section-title">Performance Scores by Scenario</h2>
            <div class="scores-grid">
                ${reports.map(report => {
                    const score = calculateScenarioScore(report);
                    const status = getScoreLabel(score);
                    const statusClass = status.toLowerCase().replace(' ', '-');
                    return `
                        <div class="score-card ${statusClass}">
                            <div class="score-card-value">${score}</div>
                            <div class="score-card-label">${report.scenario}</div>
                            <div class="score-card-status ${statusClass}">${status}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Core Web Vitals Comparison -->
        <div class="core-web-vitals">
            <h2 class="section-title">Core Web Vitals Comparison</h2>
            <div class="vitals-grid">
                ${createVitalCard('First Contentful Paint', 'FCP', reports, 'Time when first text or image is painted', '1800ms')}
                ${createVitalCard('Largest Contentful Paint', 'LCP', reports, 'Time when largest content element is painted', '2500ms')}
                ${createVitalCard('Interaction to Next Paint', 'INP', reports, 'Responsiveness of page to user interactions', '200ms')}
                ${createVitalCard('Time to First Byte', 'TTFB', reports, 'Time between request and first byte received', '600ms')}
            </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
            ${createNetworkAnalysisSection(reports)}
            ${createJavaScriptProfilerSection(reports)}
        </div>

        <!-- Performance Summary -->
        <div class="performance-summary">
            ${createSummaryCard('Total Size', calculateTotalSize(reports) + ' MB')}
            ${createSummaryCard('Load Time', calculateAverageLoadTime(reports) + 'ms')}
            ${createSummaryCard('Requests', calculateTotalRequests(reports).toString())}
            ${createSummaryCard('JS Execution', calculateAverageJSExecution(reports) + 'ms')}
        </div>
    `;
}

/**
 * Creates individual scenario content
 */
function createScenarioContent(report: WebVitalsReport, index: number): string {
    const score = calculateScenarioScore(report);
    const status = getScoreLabel(score);
    
    return `
        <!-- Scenario Header -->
        <div class="performance-scores">
            <h2 class="section-title">Performance Summary - ${report.scenario}</h2>
            <div class="scores-grid">
                <div class="score-card ${status.toLowerCase().replace(' ', '-')}">
                    <div class="score-card-value">${score}</div>
                    <div class="score-card-label">Scenario Score</div>
                    <div class="score-card-status ${status.toLowerCase().replace(' ', '-')}">${status}</div>
                </div>
            </div>
        </div>

        <!-- Core Web Vitals for this scenario -->
        <div class="core-web-vitals">
            <h2 class="section-title">Core Web Vitals</h2>
            <div class="vitals-grid">
                ${createSingleVitalCard('First Contentful Paint', report.metrics?.FCP, 'Time when first text or image is painted', '1800ms')}
                ${createSingleVitalCard('Largest Contentful Paint', report.metrics?.LCP, 'Time when largest content element is painted', '2500ms')}
                ${createSingleVitalCard('Interaction to Next Paint', report.metrics?.INP, 'Responsiveness of page to user interactions', '200ms')}
                ${createSingleVitalCard('Time to First Byte', report.metrics?.TTFB, 'Time between request and first byte received', '600ms')}
            </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
            ${createScenarioNetworkAnalysis(report)}
            ${createScenarioJavaScriptProfiler(report)}
        </div>

        <!-- Performance Summary for this scenario -->
        <div class="performance-summary">
            ${createSummaryCard('Total Size', formatBytes(report.network?.summary?.totalTransferSize || 0))}
            ${createSummaryCard('Load Time', (report.performance?.loadTime || 0).toFixed(0) + 'ms')}
            ${createSummaryCard('Requests', (report.network?.summary?.totalRequests || 0).toString())}
            ${createSummaryCard('JS Execution', (report.profile?.summary?.totalExecutionTime || 0).toFixed(0) + 'ms')}
        </div>
    `;
}

/**
 * Creates vital card for overview (comparing across scenarios)
 */
function createVitalCard(name: string, metric: string, reports: WebVitalsReport[], description: string, threshold: string): string {
    const values = reports.map(r => r.metrics?.[metric as keyof typeof r.metrics]).filter(v => v !== undefined);
    const average = values.length > 0 ? values.reduce((sum, val) => sum + (val as number), 0) / values.length : 0;
    const status = getVitalStatus(metric, average);
    
    return `
        <div class="vital-card">
            <div class="vital-header">
                <div class="vital-name">${name}</div>
                <div class="vital-status">${status}</div>
            </div>
            <div class="vital-value">${average.toFixed(0)}ms</div>
            <div class="vital-description">${description}</div>
            <div class="vital-chart">
                <div class="vital-chart-line"></div>
            </div>
        </div>
    `;
}

/**
 * Creates vital card for single scenario
 */
function createSingleVitalCard(name: string, value: number | undefined, description: string, threshold: string): string {
    if (value === undefined) {
        return `
            <div class="vital-card">
                <div class="vital-header">
                    <div class="vital-name">${name}</div>
                    <div class="vital-status">No Data</div>
                </div>
                <div class="vital-value">N/A</div>
                <div class="vital-description">${description}</div>
                <div class="vital-chart">
                    <div class="vital-chart-line"></div>
                </div>
            </div>
        `;
    }
    
    const status = getVitalStatus(name.split(' ')[0], value);
    
    return `
        <div class="vital-card">
            <div class="vital-header">
                <div class="vital-name">${name}</div>
                <div class="vital-status">${status}</div>
            </div>
            <div class="vital-value">${value.toFixed(0)}ms</div>
            <div class="vital-description">${description}</div>
            <div class="vital-chart">
                <div class="vital-chart-line"></div>
            </div>
        </div>
    `;
}

/**
 * Gets vital status based on metric and value
 */
function getVitalStatus(metric: string, value: number): string {
    const thresholds = {
        'FCP': { good: 1800, poor: 3000 },
        'LCP': { good: 2500, poor: 4000 },
        'CLS': { good: 0.1, poor: 0.25 },
        'INP': { good: 200, poor: 500 },
        'TTFB': { good: 600, poor: 1200 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'Good';
    
    if (value <= threshold.good) return 'Good';
    if (value <= threshold.poor) return 'Needs Improvement';
    return 'Poor';
}

/**
 * Creates network analysis section for overview
 */
function createNetworkAnalysisSection(reports: WebVitalsReport[]): string {
    const totalRequests = reports.reduce((sum, r) => sum + (r.network?.summary?.totalRequests || 0), 0);
    const totalSize = reports.reduce((sum, r) => sum + (r.network?.summary?.totalTransferSize || 0), 0);
    const avgResponseTime = reports.reduce((sum, r) => sum + (r.network?.summary?.averageResponseTime || 0), 0) / reports.length;
    
    return `
        <div class="network-analysis">
            <div class="section-header">
                <h3>Network Request Analysis</h3>
                <div class="section-summary">
                    <span>Total Requests: ${totalRequests}</span>
                    <span>Total Size: ${formatBytes(totalSize)}</span>
                    <span>Load Time: ${avgResponseTime.toFixed(0)}ms</span>
                </div>
            </div>
            <div class="network-content">
                <div id="networkTable-${Date.now()}"></div>
            </div>
        </div>
    `;
}

/**
 * Creates JavaScript profiler section for overview
 */
function createJavaScriptProfilerSection(reports: WebVitalsReport[]): string {
    const totalExecutionTime = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalExecutionTime || 0), 0);
    const totalFunctions = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalFunctions || 0), 0);
    const totalCalls = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalCalls || 0), 0);
    
    return `
        <div class="js-profiler">
            <div class="section-header">
                <h3>JavaScript Profiler</h3>
                <div class="section-summary">
                    <span>Total execution time: ${totalExecutionTime.toFixed(0)}ms</span>
                </div>
            </div>
            <div class="profiler-content">
                <div class="function-list">
                    ${getTopFunctions(reports).map(func => `
                        <div class="function-item">
                            <div class="function-name">${func.name}()</div>
                            <div class="function-bar">
                                <div class="function-bar-fill" style="width: ${(func.time / totalExecutionTime * 100)}%"></div>
                            </div>
                            <div class="function-time">${func.time.toFixed(0)}ms (${((func.time / totalExecutionTime) * 100).toFixed(1)}%)</div>
                        </div>
                    `).join('')}
                </div>
                <div class="function-chart">
                    <canvas id="functionChart"></canvas>
                </div>
                <div class="profiler-stats">
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${totalFunctions}</div>
                        <div class="profiler-stat-label">Functions</div>
                    </div>
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${totalCalls}</div>
                        <div class="profiler-stat-label">Total Calls</div>
                    </div>
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${getLongestFunction(reports).time.toFixed(0)}ms</div>
                        <div class="profiler-stat-label">Longest Function</div>
                    </div>
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${((totalExecutionTime / (reports[0]?.performance?.loadTime || 1)) * 100).toFixed(1)}%</div>
                        <div class="profiler-stat-label">JS Time</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Creates network analysis for single scenario
 */
function createScenarioNetworkAnalysis(report: WebVitalsReport): string {
    const network = report.network;
    if (!network || !network.requests.length) {
        return `
            <div class="network-analysis">
                <div class="section-header">
                    <h3>Network Request Analysis</h3>
                </div>
                <div class="network-content">
                    <p>No network data available</p>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="network-analysis">
            <div class="section-header">
                <h3>Network Request Analysis</h3>
                <div class="section-summary">
                    <span>Total Requests: ${network.summary.totalRequests}</span>
                    <span>Total Size: ${formatBytes(network.summary.totalTransferSize)}</span>
                    <span>Load Time: ${network.summary.averageResponseTime.toFixed(0)}ms</span>
                </div>
            </div>
            <div class="network-content">
                <div id="scenarioNetworkTable-${Date.now()}"></div>
            </div>
        </div>
    `;
}

/**
 * Creates JavaScript profiler for single scenario
 */
function createScenarioJavaScriptProfiler(report: WebVitalsReport): string {
    const profile = report.profile;
    if (!profile || !profile.summary) {
        return `
            <div class="js-profiler">
                <div class="section-header">
                    <h3>JavaScript Profiler</h3>
                </div>
                <div class="profiler-content">
                    <p>No profile data available</p>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="js-profiler">
            <div class="section-header">
                <h3>JavaScript Profiler</h3>
                <div class="section-summary">
                    <span>Total execution time: ${profile.summary.totalExecutionTime.toFixed(0)}ms</span>
                </div>
            </div>
            <div class="profiler-content">
                <div class="function-list">
                    ${getTopFunctionsForScenario(report).map(func => `
                        <div class="function-item">
                            <div class="function-name">${func.name}()</div>
                            <div class="function-bar">
                                <div class="function-bar-fill" style="width: ${(func.time / profile.summary.totalExecutionTime * 100)}%"></div>
                            </div>
                            <div class="function-time">${func.time.toFixed(0)}ms (${((func.time / profile.summary.totalExecutionTime) * 100).toFixed(1)}%)</div>
                        </div>
                    `).join('')}
                </div>
                <div class="function-chart">
                    <canvas data-chart-data='${JSON.stringify(getFunctionCallData(report))}'></canvas>
                </div>
                <div class="profiler-stats">
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${profile.summary.totalFunctions}</div>
                        <div class="profiler-stat-label">Functions</div>
                    </div>
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${profile.summary.totalCalls}</div>
                        <div class="profiler-stat-label">Total Calls</div>
                    </div>
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${profile.summary.longestFunctionTime.toFixed(0)}ms</div>
                        <div class="profiler-stat-label">Longest Function</div>
                    </div>
                    <div class="profiler-stat">
                        <div class="profiler-stat-value">${((profile.summary.totalExecutionTime / (report.performance?.loadTime || 1)) * 100).toFixed(1)}%</div>
                        <div class="profiler-stat-label">JS Time</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Creates summary card
 */
function createSummaryCard(label: string, value: string): string {
    return `
        <div class="summary-card">
            <div class="summary-value">${value}</div>
            <div class="summary-label">${label}</div>
        </div>
    `;
}

/**
 * Helper functions for calculations
 */
function calculateTotalSize(reports: WebVitalsReport[]): string {
    const totalBytes = reports.reduce((sum, r) => sum + (r.network?.summary?.totalTransferSize || 0), 0);
    return (totalBytes / (1024 * 1024)).toFixed(2);
}

function calculateAverageLoadTime(reports: WebVitalsReport[]): string {
    const totalTime = reports.reduce((sum, r) => sum + (r.performance?.loadTime || 0), 0);
    return (totalTime / reports.length).toFixed(0);
}

function calculateTotalRequests(reports: WebVitalsReport[]): number {
    return reports.reduce((sum, r) => sum + (r.network?.summary?.totalRequests || 0), 0);
}

function calculateAverageJSExecution(reports: WebVitalsReport[]): string {
    const totalTime = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalExecutionTime || 0), 0);
    return (totalTime / reports.length).toFixed(0);
}

function getTopNetworkRequests(reports: WebVitalsReport[]): any[] {
    const allRequests: any[] = [];
    reports.forEach(report => {
        if (report.network?.requests) {
            allRequests.push(...report.network.requests);
        }
    });
    
    return allRequests
        .sort((a: any, b: any) => b.responseTime - a.responseTime)
}

function getTopFunctions(reports: WebVitalsReport[], limit: number = 5): any[] {
    const allFunctions: any[] = [];
    reports.forEach(report => {
        if (report.profile?.summary?.topFunctions) {
            allFunctions.push(...report.profile.summary.topFunctions);
        }
    });
    
    return allFunctions
        .sort((a: any, b: any) => b.time - a.time)
        .slice(0, limit);
}

function getTopFunctionsForScenario(report: WebVitalsReport, limit: number = 5): any[] {
    if (!report.profile?.summary?.topFunctions) return [];
    
    return report.profile.summary.topFunctions
        .sort((a: any, b: any) => b.time - a.time)
        .slice(0, limit);
}

function getLongestFunction(reports: WebVitalsReport[]): any {
    const allFunctions = getTopFunctions(reports, 1);
    return allFunctions[0] || { name: 'N/A', time: 0 };
}

function getFunctionCallData(report: WebVitalsReport): Record<string, number> {
    if (!report.profile?.summary?.functionCallFrequency) return {};
    return report.profile.summary.functionCallFrequency;
}

/**
 * Creates detailed network request information
 */
function createNetworkRequestDetails(request: any): string {
    const timing = request.timing || {};
    const headers = request.headers || {};
    
    return `
        <div class="network-details">
            <div class="detail-group">
                <div class="detail-label">Full URL</div>
                <div class="detail-value">${request.url}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Method</div>
                <div class="detail-value">${request.method || 'GET'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Status Code</div>
                <div class="detail-value">${request.status || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Domain</div>
                <div class="detail-value">${request.domain || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Protocol</div>
                <div class="detail-value">${request.protocol || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Cache Status</div>
                <div class="detail-value">${request.cacheStatus || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Transfer Size</div>
                <div class="detail-value">${formatBytes(request.transferSize || 0)}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Encoded Size</div>
                <div class="detail-value">${formatBytes(request.encodedSize || 0)}</div>
            </div>
        </div>
        
        <div class="timing-breakdown">
            <h4 style="margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem;">Timing Breakdown</h4>
            <div class="timing-item">
                <span class="timing-label">DNS Lookup</span>
                <span class="timing-value">${(timing.dnsLookup || 0).toFixed(2)}ms</span>
            </div>
            <div class="timing-item">
                <span class="timing-label">TCP Connect</span>
                <span class="timing-value">${(timing.tcpConnect || 0).toFixed(2)}ms</span>
            </div>
            <div class="timing-item">
                <span class="timing-label">SSL Handshake</span>
                <span class="timing-value">${(timing.sslHandshake || 0).toFixed(2)}ms</span>
            </div>
            <div class="timing-item">
                <span class="timing-label">Request Send</span>
                <span class="timing-value">${(timing.requestSend || 0).toFixed(2)}ms</span>
            </div>
            <div class="timing-item">
                <span class="timing-label">Wait Time</span>
                <span class="timing-value">${(timing.waitTime || 0).toFixed(2)}ms</span>
            </div>
            <div class="timing-item">
                <span class="timing-label">Response Receive</span>
                <span class="timing-value">${(timing.responseReceive || 0).toFixed(2)}ms</span>
            </div>
            <div class="timing-item" style="border-top: 2px solid #e2e8f0; margin-top: 0.5rem; padding-top: 0.5rem;">
                <span class="timing-label" style="font-weight: 600;">Total Time</span>
                <span class="timing-value" style="font-weight: 700;">${(request.responseTime || 0).toFixed(2)}ms</span>
            </div>
        </div>
        
        ${Object.keys(headers).length > 0 ? `
            <div class="timing-breakdown" style="margin-top: 1rem;">
                <h4 style="margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem;">Request Headers</h4>
                ${Object.entries(headers).map(([key, value]) => `
                    <div class="timing-item">
                        <span class="timing-label">${key}</span>
                        <span class="timing-value" style="font-size: 0.75rem;">${value}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
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

