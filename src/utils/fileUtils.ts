import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { ScenarioFile } from '../types';
import { interpolateScenario, mergeVariables } from './variableUtils';

/**
 * Recursively finds all *.scenario.json and *.scenario.js files in a directory
 * @param directory - Directory path to scan
 * @returns Array of file paths
 */
export function findScenarioFiles(directory: string): string[] {
  const scenarioFiles: string[] = [];
  
  function scanDirectory(dir: string): void {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.scenario.json') || item.endsWith('.scenario.js'))) {
          scenarioFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }
  
  scanDirectory(directory);
  return scenarioFiles;
}

/**
 * Loads and validates a scenario file (JSON or JavaScript)
 * @param filePath - Path to the scenario file
 * @param globalVariables - Global variables to use for interpolation
 * @returns Parsed and validated scenario file with interpolated variables
 * @throws Error if file cannot be loaded or is invalid
 */
export function loadScenarioFile(filePath: string, globalVariables: Record<string, string | number | boolean> = {}): ScenarioFile {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let scenario: ScenarioFile;
    
    if (filePath.endsWith('.scenario.js')) {
      // For JavaScript files, we need to evaluate the module
      // Create a simple module context
      const moduleExports: any = {};
      const moduleRequire = (id: string) => {
        // Simple require implementation for basic scenarios
        throw new Error(`require('${id}') is not supported in scenario files. Use only built-in JavaScript features.`);
      };
      
      // Create module object
      const moduleObj = {
        exports: moduleExports,
        require: moduleRequire,
        filename: filePath,
        dirname: dirname(filePath)
      };
      
      // Evaluate the JavaScript content in a safe context
      // We need to handle both module.exports = ... and exports.default = ... patterns
      const scenarioFunction = new Function('exports', 'require', 'module', '__filename', '__dirname', content);
      scenarioFunction(moduleExports, moduleRequire, moduleObj, filePath, dirname(filePath));
      
      // Get the scenario from module.exports (which gets assigned by module.exports = ...)
      scenario = moduleObj.exports.default || moduleObj.exports;
      
    } else {
      // For JSON files, parse as usual
      scenario = JSON.parse(content) as ScenarioFile;
    }
    
    // Validate required fields
    if (!scenario.name) {
      throw new Error(`Scenario file ${filePath} is missing required field 'name'`);
    }
    if (!scenario.url) {
      throw new Error(`Scenario file ${filePath} is missing required field 'url'`);
    }
    if (!scenario.steps || !Array.isArray(scenario.steps)) {
      throw new Error(`Scenario file ${filePath} is missing required field 'steps'`);
    }
    
    // Merge global and scenario-specific variables
    const mergedVariables = mergeVariables(globalVariables, scenario.variables || {});
    
    // Interpolate variables in the scenario
    const interpolatedScenario = interpolateScenario(scenario, mergedVariables);
    
    return interpolatedScenario;
  } catch (error) {
    throw new Error(`Failed to load scenario file ${filePath}: ${error}`);
  }
}
