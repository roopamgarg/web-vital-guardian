import { chromium } from 'playwright';
import type { GuardianConfig, GuardianResult } from '../types';
import { findScenarioFiles, loadScenarioFile } from '../utils/fileUtils';
import { runScenario } from '../scenarios/runner';
import { checkBudgetViolations } from './budgetChecker';

/**
 * Main function that runs all scenarios and generates Web Vitals reports
 * @param config - Guardian configuration
 * @returns Promise resolving to execution results and summary
 */
export async function runWebVitalsGuardian(config: GuardianConfig): Promise<GuardianResult> {
  const browser = await chromium.launch({ 
    headless: config.headless !== false 
  });
  
  try {
    // Find all scenario files
    const scenarioFiles = findScenarioFiles(config.scenariosPath);
    
    if (scenarioFiles.length === 0) {
      throw new Error(`No *.scenario.json files found in ${config.scenariosPath}`);
    }
    
    console.log(`Found ${scenarioFiles.length} scenario files`);
    
    const reports: GuardianResult['reports'] = [];
    const budgetViolations: string[] = [];
    
    // Run each scenario
    for (const filePath of scenarioFiles) {
      try {
        console.log(`Running scenario: ${filePath}`);
        const scenario = loadScenarioFile(filePath);
        const report = await runScenario(browser, scenario, config);
        reports.push(report);
        
        // Check against budgets
        const budgets = { ...config.budgets, ...scenario.webVitals?.budgets };
        const violations = checkBudgetViolations(report, budgets);
        if (violations.length > 0) {
          budgetViolations.push(`${scenario.name}: ${violations.join(', ')}`);
        }
        
        console.log(`✓ Completed: ${scenario.name}`);
      } catch (error) {
        console.error(`✗ Failed to run scenario ${filePath}:`, error);
        // Continue with other scenarios
      }
    }
    
    const summary: GuardianResult['summary'] = {
      totalScenarios: scenarioFiles.length,
      passed: reports.length,
      failed: scenarioFiles.length - reports.length,
      budgetViolations
    };
    
    return { reports, summary };
    
  } finally {
    await browser.close();
  }
}
