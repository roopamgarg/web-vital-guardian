// Debug example to test Web Vitals measurement
import { runWebVitalsGuardian } from '../dist/index.mjs';

async function debugWebVitals() {
  try {
    console.log('🔍 Debugging Web Vitals measurement...');
    
    // Test with different configurations
    const configs = [
      {
        name: 'PerformanceObserver Only (CSP-Safe)',
        config: {
          scenariosPath: './examples',
          headless: false, // Show browser for debugging
          webVitals: {
            usePerformanceObserver: true,
            fallbackToPackage: false
          }
        }
      },
      {
        name: 'Web Vitals Package Only',
        config: {
          scenariosPath: './examples',
          headless: false, // Show browser for debugging
          webVitals: {
            usePerformanceObserver: false,
            fallbackToPackage: true
          }
        }
      },
      {
        name: 'PerformanceObserver with Fallback',
        config: {
          scenariosPath: './examples',
          headless: false, // Show browser for debugging
          webVitals: {
            usePerformanceObserver: true,
            fallbackToPackage: true
          }
        }
      }
    ];

    for (const { name, config } of configs) {
      console.log(`\n🚀 Testing: ${name}`);
      console.log('Configuration:', JSON.stringify(config.webVitals, null, 2));
      
      try {
        const result = await runWebVitalsGuardian(config);
        
        console.log(`\n📊 Results for ${name}:`);
        console.log(`Total scenarios: ${result.summary.totalScenarios}`);
        console.log(`Passed: ${result.summary.passed}`);
        console.log(`Failed: ${result.summary.failed}`);
        
        result.reports.forEach(report => {
          console.log(`\n📈 ${report.scenario}:`);
          console.log(`  URL: ${report.url}`);
          console.log('  Web Vitals metrics:');
          
          const metrics = report.metrics;
          const metricsCount = Object.keys(metrics).filter(key => metrics[key] !== undefined).length;
          console.log(`  Metrics collected: ${metricsCount}/5`);
          
          Object.entries(metrics).forEach(([metric, value]) => {
            if (value !== undefined) {
              console.log(`    ✅ ${metric}: ${value}${metric === 'CLS' ? '' : 'ms'}`);
            } else {
              console.log(`    ❌ ${metric}: Not measured`);
            }
          });
          
          console.log('  Performance metrics:');
          console.log(`    Load Time: ${report.performance.loadTime}ms`);
          console.log(`    DOM Content Loaded: ${report.performance.domContentLoaded}ms`);
          console.log(`    First Paint: ${report.performance.firstPaint}ms`);
        });
        
      } catch (error) {
        console.error(`❌ ${name} failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Test individual measurement functions
async function testIndividualMeasurements() {
  try {
    console.log('\n🧪 Testing individual measurement functions...');
    
    const { chromium } = await import('playwright');
    const { measureWebVitals, measureWebVitalsWithObserver } = await import('../dist/index.mjs');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
      // Navigate to a test page
      await page.goto('https://example.com');
      await page.waitForLoadState('networkidle');
      
      console.log('\n🔍 Testing PerformanceObserver...');
      const observerResults = await measureWebVitalsWithObserver(page);
      console.log('PerformanceObserver results:', observerResults);
      
      console.log('\n🔍 Testing web-vitals package...');
      const packageResults = await measureWebVitals(page, { 
        usePerformanceObserver: false, 
        fallbackToPackage: true 
      });
      console.log('Web-vitals package results:', packageResults);
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    console.error('❌ Individual measurement test failed:', error);
  }
}

// Run both tests
async function main() {
  await debugWebVitals();
  await testIndividualMeasurements();
}

main();
