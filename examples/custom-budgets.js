// Example showing how to use custom performance budgets
import { runWebVitalsGuardian } from '../dist/index.mjs';

async function runWithCustomBudgets() {
  try {
    // Different budget configurations for different scenarios
    const configs = [
      {
        name: 'Strict Budgets (High Performance)',
        config: {
          scenariosPath: './examples',
          headless: true,
          budgets: {
            FCP: 1000,  // Very fast first contentful paint
            LCP: 1500,  // Very fast largest contentful paint
            CLS: 0.05,  // Very low layout shift
            INP: 100,   // Very responsive interactions
            TTFB: 300   // Very fast server response
          }
        }
      },
      {
        name: 'Moderate Budgets (Good Performance)',
        config: {
          scenariosPath: './examples',
          headless: true,
          budgets: {
            FCP: 1800,  // Good first contentful paint
            LCP: 2500,  // Good largest contentful paint
            CLS: 0.1,   // Low layout shift
            INP: 200,   // Responsive interactions
            TTFB: 600   // Good server response
          }
        }
      },
      {
        name: 'Relaxed Budgets (Acceptable Performance)',
        config: {
          scenariosPath: './examples',
          headless: true,
          budgets: {
            FCP: 3000,  // Acceptable first contentful paint
            LCP: 4000,  // Acceptable largest contentful paint
            CLS: 0.25,  // Moderate layout shift
            INP: 500,   // Acceptable interactions
            TTFB: 1000  // Acceptable server response
          }
        }
      }
    ];

    for (const { name, config } of configs) {
      console.log(`\n🚀 Running with ${name}...`);
      
      const result = await runWebVitalsGuardian(config);
      
      console.log(`📊 Results for ${name}:`);
      console.log(`  Total scenarios: ${result.summary.totalScenarios}`);
      console.log(`  Passed: ${result.summary.passed}`);
      console.log(`  Failed: ${result.summary.failed}`);
      
      if (result.summary.budgetViolations.length > 0) {
        console.log(`  ⚠️  Budget violations: ${result.summary.budgetViolations.length}`);
        result.summary.budgetViolations.forEach(violation => {
          console.log(`    - ${violation}`);
        });
      } else {
        console.log(`  ✅ All scenarios passed budget checks!`);
      }
      
      // Show detailed metrics for each scenario
      result.reports.forEach(report => {
        console.log(`\n  📈 ${report.scenario}:`);
        Object.entries(report.metrics).forEach(([metric, value]) => {
          if (value !== undefined) {
            const budget = config.budgets?.[metric];
            const status = budget && value > budget ? '❌' : '✅';
            console.log(`    ${status} ${metric}: ${value}${metric === 'CLS' ? '' : 'ms'}${budget ? ` (budget: ${budget}${metric === 'CLS' ? '' : 'ms'})` : ''}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error running custom budget tests:', error);
    process.exit(1);
  }
}

// Example of scenario-specific budgets
async function runWithScenarioSpecificBudgets() {
  try {
    console.log('\n🎯 Running with scenario-specific budgets...');
    
    const config = {
      scenariosPath: './examples',
      headless: true,
      // Global budgets (fallback)
      budgets: {
        FCP: 2000,
        LCP: 3000,
        CLS: 0.15,
        INP: 250,
        TTFB: 700
      }
    };

    const result = await runWebVitalsGuardian(config);
    
    console.log('📊 Scenario-specific budget results:');
    result.reports.forEach(report => {
      console.log(`\n📈 ${report.scenario}:`);
      console.log(`  URL: ${report.url}`);
      
      // Show which budgets were used (global vs scenario-specific)
      const scenarioFile = report.scenario.toLowerCase().replace(/\s+/g, '-');
      const hasScenarioBudgets = scenarioFile.includes('ecommerce') || scenarioFile.includes('blog');
      
      if (hasScenarioBudgets) {
        console.log(`  🎯 Using scenario-specific budgets`);
      } else {
        console.log(`  🌐 Using global budgets`);
      }
      
      Object.entries(report.metrics).forEach(([metric, value]) => {
        if (value !== undefined) {
          console.log(`    ${metric}: ${value}${metric === 'CLS' ? '' : 'ms'}`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error running scenario-specific budget tests:', error);
    process.exit(1);
  }
}

// Run both examples
async function main() {
  await runWithCustomBudgets();
  await runWithScenarioSpecificBudgets();
}

main();
