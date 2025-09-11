import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ScenarioFile } from '../types';

/**
 * Recursively finds all *.scenario.json files in a directory
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
        } else if (stat.isFile() && item.endsWith('.scenario.json')) {
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
 * Loads and validates a scenario file
 * @param filePath - Path to the scenario file
 * @returns Parsed and validated scenario file
 * @throws Error if file cannot be loaded or is invalid
 */
export function loadScenarioFile(filePath: string): ScenarioFile {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const scenario = JSON.parse(content) as ScenarioFile;
    
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
    
    return scenario;
  } catch (error) {
    throw new Error(`Failed to load scenario file ${filePath}: ${error}`);
  }
}
