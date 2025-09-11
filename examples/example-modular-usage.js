// Example showing how to use specific modules from the modularized library

// Import everything (backward compatible)
import { runWebVitalsGuardian } from './dist/index.mjs';

// Or import specific modules for more granular control
import { 
  findScenarioFiles, 
  loadScenarioFile 
} from './dist/index.mjs';

import { 
  measureWebVitals, 
  measurePerformanceMetrics 
} from './dist/index.mjs';

import { 
  executeScenarioStep, 
  runScenario 
} from './dist/index.mjs';

import type { 
  GuardianConfig, 
  ScenarioFile, 
  WebVitalsReport 
} from './dist/index.mjs';

async function main() {
  try {
    // Example 1: Using the main guardian function (recommended)
    const config = {
      scenariosPath: './',
      headless: true,
      budgets: {
        FCP: 1800,
        LCP: 2500,
        CLS: 0.1,
        INP: 200,
        TTFB: 600
      }
    };

    console.log('🚀 Running Web Vitals Guardian...');
    const result = await runWebVitalsGuardian(config);
    
    console.log(`✅ Completed: ${result.summary.passed}/${result.summary.totalScenarios} scenarios passed`);
    
    // Example 2: Using individual modules for custom workflows
    console.log('\n🔍 Finding scenario files...');
    const scenarioFiles = findScenarioFiles('./');
    console.log(`Found ${scenarioFiles.length} scenario files`);
    
    // Example 3: Loading and validating a specific scenario
    if (scenarioFiles.length > 0) {
      console.log('\n📄 Loading first scenario...');
      const scenario = loadScenarioFile(scenarioFiles[0]);
      console.log(`Scenario: ${scenario.name}`);
      console.log(`URL: ${scenario.url}`);
      console.log(`Steps: ${scenario.steps.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
