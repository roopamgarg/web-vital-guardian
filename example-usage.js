import { runWebVitalsGuardian } from './dist/index.mjs';

async function main() {
  try {
    const config = {
      scenariosPath: './',
      headless: true,
      budgets: {
        FCP: 1800,  // First Contentful Paint
        LCP: 2500,  // Largest Contentful Paint
        CLS: 0.1,   // Cumulative Layout Shift
        INP: 200,   // Interaction to Next Paint
        TTFB: 600   // Time to First Byte
      }
    };

    console.log('🚀 Starting Web Vitals Guardian...');
    
    const result = await runWebVitalsGuardian(config);
    
    console.log('\n📊 Results Summary:');
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
      console.log('  Web Vitals:');
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
    console.error('❌ Error running Web Vitals Guardian:', error);
    process.exit(1);
  }
}

main();
