// Example showing how to use web-vitals package with early registration
import { runWebVitalsGuardian } from '../dist/index.mjs';

async function runWebVitalsPackageExample() {
  try {
    console.log('📦 Running Web Vitals Guardian with web-vitals package...');
    
    // Configuration to use web-vitals package (with CSP bypass)
    const config = {
      scenariosPath: './examples',
      headless: false, // Show browser for debugging
      budgets: {
        FCP: 1800,
        LCP: 2500,
        CLS: 0.1,
        INP: 200,
        TTFB: 600
      },
      // Use web-vitals package instead of PerformanceObserver
      webVitals: {
        usePerformanceObserver: false,  // Don't use PerformanceObserver
        fallbackToPackage: true         // Use web-vitals package
      }
    };

    const result = await runWebVitalsGuardian(config);
    
    console.log('\n📊 Web Vitals Package Results:');
    console.log(`Total scenarios: ${result.summary.totalScenarios}`);
    console.log(`Passed: ${result.summary.passed}`);
    console.log(`Failed: ${result.summary.failed}`);
    
    if (result.summary.budgetViolations.length > 0) {
      console.log('\n⚠️  Budget Violations:');
      result.summary.budgetViolations.forEach(violation => {
        console.log(`  - ${violation}`);
      });
    } else {
      console.log('\n✅ All scenarios passed budget checks!');
    }
    
    console.log('\n📈 Detailed Reports:');
    result.reports.forEach(report => {
      console.log(`\n${report.scenario}:`);
      console.log(`  URL: ${report.url}`);
      console.log(`  Timestamp: ${report.timestamp}`);
      console.log('  Web Vitals (web-vitals package):');
      Object.entries(report.metrics).forEach(([metric, value]) => {
        if (value !== undefined) {
          console.log(`    ${metric}: ${value}${metric === 'CLS' ? '' : 'ms'}`);
        }
      });
      console.log('  Performance:');
      console.log(`    Load Time: ${report.performance.loadTime}ms`);
      console.log(`    DOM Content Loaded: ${report.performance.domContentLoaded}ms`);
      console.log(`    First Paint: ${report.performance.firstPaint}ms`);
    });
    
  } catch (error) {
    console.error('❌ Error running web-vitals package example:', error);
    process.exit(1);
  }
}

// Compare different approaches
async function compareApproaches() {
  const approaches = [
    {
      name: 'PerformanceObserver (CSP-Safe)',
      config: {
        scenariosPath: './examples',
        headless: true,
        webVitals: {
          usePerformanceObserver: true,
          fallbackToPackage: false
        }
      }
    },
    {
      name: 'Web Vitals Package (with CSP bypass)',
      config: {
        scenariosPath: './examples',
        headless: true,
        webVitals: {
          usePerformanceObserver: false,
          fallbackToPackage: true
        }
      }
    }
  ];

  for (const { name, config } of approaches) {
    try {
      console.log(`\n🚀 Testing: ${name}`);
      const result = await runWebVitalsGuardian(config);
      
      console.log(`✅ ${name}: ${result.summary.passed}/${result.summary.totalScenarios} scenarios passed`);
      
      result.reports.forEach(report => {
        const metricsCount = Object.keys(report.metrics).filter(key => report.metrics[key] !== undefined).length;
        console.log(`  📊 ${report.scenario}: ${metricsCount}/5 metrics collected`);
      });
      
    } catch (error) {
      console.log(`❌ ${name}: Failed - ${error.message}`);
    }
  }
}

// Run both examples
async function main() {
  await runWebVitalsPackageExample();
  await compareApproaches();
}

main();
