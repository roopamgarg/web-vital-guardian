// Example showing how to use Web Vitals Guardian with CSP-safe configuration
import { runWebVitalsGuardian } from '../dist/index.mjs';

async function runCSPSafeExample() {
  try {
    console.log('🔒 Running Web Vitals Guardian with CSP-safe configuration...');
    
    // Configuration for CSP environments (like your Observe.ai app)
    const config = {
      scenariosPath: './examples',
      headless: true,
      budgets: {
        FCP: 1800,  // First Contentful Paint
        LCP: 2500,  // Largest Contentful Paint
        CLS: 0.1,   // Cumulative Layout Shift
        INP: 200,   // Interaction to Next Paint
        TTFB: 600   // Time to First Byte
      },
      // CSP-safe Web Vitals configuration
      webVitals: {
        usePerformanceObserver: true,  // Force using PerformanceObserver (CSP-safe)
        fallbackToPackage: false       // Disable fallback to external web-vitals package
      }
    };

    const result = await runWebVitalsGuardian(config);
    
    console.log('\n📊 CSP-Safe Results:');
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
      console.log('  Web Vitals (CSP-safe measurement):');
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
    console.error('❌ Error running CSP-safe Web Vitals Guardian:', error);
    process.exit(1);
  }
}

// Example with different CSP configurations
async function runDifferentCSPConfigs() {
  const configs = [
    {
      name: 'CSP-Safe Only (Recommended for CSP environments)',
      config: {
        scenariosPath: './examples',
        headless: true,
        webVitals: {
          usePerformanceObserver: true,  // Use PerformanceObserver only
          fallbackToPackage: false       // No external dependencies
        }
      }
    },
    {
      name: 'CSP-Safe with Fallback (If you want to try web-vitals package)',
      config: {
        scenariosPath: './examples',
        headless: true,
        webVitals: {
          usePerformanceObserver: true,  // Try PerformanceObserver first
          fallbackToPackage: true        // Allow fallback to web-vitals package
        }
      }
    },
    {
      name: 'Web Vitals Package Only (May fail with CSP)',
      config: {
        scenariosPath: './examples',
        headless: true,
        webVitals: {
          usePerformanceObserver: false, // Don't use PerformanceObserver
          fallbackToPackage: true        // Use web-vitals package only
        }
      }
    }
  ];

  for (const { name, config } of configs) {
    try {
      console.log(`\n🚀 Testing: ${name}`);
      const result = await runWebVitalsGuardian(config);
      console.log(`✅ ${name}: ${result.summary.passed}/${result.summary.totalScenarios} scenarios passed`);
    } catch (error) {
      console.log(`❌ ${name}: Failed - ${error.message}`);
    }
  }
}

// Run both examples
async function main() {
  await runCSPSafeExample();
  await runDifferentCSPConfigs();
}

main();
