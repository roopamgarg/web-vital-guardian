// Example showing how to integrate Web Vitals Guardian into CI/CD pipelines
import { runWebVitalsGuardian } from '../dist/index.mjs';

// CI/CD integration example
async function runCIIntegration() {
  try {
    console.log('🚀 Starting CI/CD Web Vitals check...');
    
    // Configuration for CI environment
    const config = {
      scenariosPath: './examples',
      headless: true, // Always headless in CI
      timeout: 60000, // Longer timeout for CI
      budgets: {
        FCP: 1800,  // First Contentful Paint
        LCP: 2500,  // Largest Contentful Paint
        CLS: 0.1,   // Cumulative Layout Shift
        INP: 200,   // Interaction to Next Paint
        TTFB: 600   // Time to First Byte
      }
    };

    const result = await runWebVitalsGuardian(config);
    
    // CI-friendly output
    console.log('\n📊 CI/CD Results:');
    console.log(`Total scenarios: ${result.summary.totalScenarios}`);
    console.log(`Passed: ${result.summary.passed}`);
    console.log(`Failed: ${result.summary.failed}`);
    
    // Check if we should fail the build
    const shouldFailBuild = result.summary.failed > 0 || result.summary.budgetViolations.length > 0;
    
    if (shouldFailBuild) {
      console.log('\n❌ BUILD FAILED - Performance issues detected:');
      
      if (result.summary.failed > 0) {
        console.log(`  - ${result.summary.failed} scenarios failed to run`);
      }
      
      if (result.summary.budgetViolations.length > 0) {
        console.log(`  - ${result.summary.budgetViolations.length} budget violations:`);
        result.summary.budgetViolations.forEach(violation => {
          console.log(`    * ${violation}`);
        });
      }
      
      // Exit with error code for CI
      process.exit(1);
    } else {
      console.log('\n✅ BUILD PASSED - All performance checks passed!');
      
      // Optional: Generate CI artifacts
      await generateCIArtifacts(result);
    }
    
  } catch (error) {
    console.error('❌ CI/CD integration failed:', error);
    process.exit(1);
  }
}

// Generate CI artifacts (reports, etc.)
async function generateCIArtifacts(result) {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    
    // Create artifacts directory
    const artifactsDir = './ci-artifacts';
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    // Generate JSON report
    const reportPath = path.join(artifactsDir, 'web-vitals-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 Generated JSON report: ${reportPath}`);
    
    // Generate summary report
    const summaryPath = path.join(artifactsDir, 'web-vitals-summary.txt');
    const summary = generateSummaryReport(result);
    fs.writeFileSync(summaryPath, summary);
    console.log(`📄 Generated summary report: ${summaryPath}`);
    
    // Generate CSV for easy analysis
    const csvPath = path.join(artifactsDir, 'web-vitals-metrics.csv');
    const csv = generateCSVReport(result);
    fs.writeFileSync(csvPath, csv);
    console.log(`📄 Generated CSV report: ${csvPath}`);
    
  } catch (error) {
    console.warn('⚠️  Could not generate CI artifacts:', error);
  }
}

// Generate human-readable summary report
function generateSummaryReport(result) {
  let summary = 'Web Vitals Guardian - CI/CD Report\n';
  summary += '=====================================\n\n';
  
  summary += `Execution Time: ${new Date().toISOString()}\n`;
  summary += `Total Scenarios: ${result.summary.totalScenarios}\n`;
  summary += `Passed: ${result.summary.passed}\n`;
  summary += `Failed: ${result.summary.failed}\n`;
  summary += `Budget Violations: ${result.summary.budgetViolations.length}\n\n`;
  
  if (result.summary.budgetViolations.length > 0) {
    summary += 'Budget Violations:\n';
    summary += '-----------------\n';
    result.summary.budgetViolations.forEach(violation => {
      summary += `- ${violation}\n`;
    });
    summary += '\n';
  }
  
  summary += 'Detailed Metrics:\n';
  summary += '-----------------\n';
  result.reports.forEach(report => {
    summary += `\n${report.scenario}:\n`;
    summary += `  URL: ${report.url}\n`;
    summary += `  Timestamp: ${report.timestamp}\n`;
    summary += '  Web Vitals:\n';
    Object.entries(report.metrics).forEach(([metric, value]) => {
      if (value !== undefined) {
        summary += `    ${metric}: ${value}${metric === 'CLS' ? '' : 'ms'}\n`;
      }
    });
    summary += '  Performance:\n';
    summary += `    Load Time: ${report.performance.loadTime}ms\n`;
    summary += `    DOM Content Loaded: ${report.performance.domContentLoaded}ms\n`;
    summary += `    First Paint: ${report.performance.firstPaint}ms\n`;
  });
  
  return summary;
}

// Generate CSV report for data analysis
function generateCSVReport(result) {
  let csv = 'Scenario,URL,Timestamp,FCP,LCP,CLS,INP,TTFB,LoadTime,DOMContentLoaded,FirstPaint\n';
  
  result.reports.forEach(report => {
    const row = [
      `"${report.scenario}"`,
      `"${report.url}"`,
      `"${report.timestamp}"`,
      report.metrics.FCP || '',
      report.metrics.LCP || '',
      report.metrics.CLS || '',
      report.metrics.INP || '',
      report.metrics.TTFB || '',
      report.performance.loadTime,
      report.performance.domContentLoaded,
      report.performance.firstPaint
    ].join(',');
    
    csv += row + '\n';
  });
  
  return csv;
}

// GitHub Actions example
function generateGitHubActionsExample() {
  const yaml = `# .github/workflows/web-vitals.yml
name: Web Vitals Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  web-vitals:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run Web Vitals Guardian
      run: node examples/ci-integration.js
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: web-vitals-reports
        path: ci-artifacts/
`;
  
  console.log('\n📋 GitHub Actions Example:');
  console.log('Save this as .github/workflows/web-vitals.yml');
  console.log(yaml);
}

// Run the CI integration
async function main() {
  await runCIIntegration();
  generateGitHubActionsExample();
}

main();
