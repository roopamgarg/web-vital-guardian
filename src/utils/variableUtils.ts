import type { ScenarioFile, ScenarioStep } from '../types';

/**
 * Interpolates variables in a string using ${variableName} syntax
 * @param text - Text containing variable references
 * @param variables - Object containing variable values
 * @returns Interpolated string
 */
export function interpolateVariables(text: string, variables: Record<string, string | number | boolean>): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
    const trimmedName = variableName.trim();
    if (variables.hasOwnProperty(trimmedName)) {
      return String(variables[trimmedName]);
    }
    // Return the original match if variable not found (could also throw error)
    console.warn(`Variable '${trimmedName}' not found in variables`);
    return match;
  });
}

/**
 * Recursively interpolates variables in an object
 * @param obj - Object to interpolate variables in
 * @param variables - Object containing variable values
 * @returns Object with interpolated values
 */
export function interpolateObject(obj: any, variables: Record<string, string | number | boolean>): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return interpolateVariables(obj, variables);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, variables));
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, variables);
    }
    return result;
  }

  return obj;
}

/**
 * Interpolates variables in a scenario file
 * @param scenario - Scenario file to interpolate
 * @param variables - Global variables to use for interpolation
 * @returns Scenario file with interpolated values
 */
export function interpolateScenario(scenario: ScenarioFile, variables: Record<string, string | number | boolean>): ScenarioFile {
  return interpolateObject(scenario, variables) as ScenarioFile;
}

/**
 * Merges global and scenario-specific variables
 * Scenario-specific variables take precedence over global ones
 * @param globalVariables - Global variables from config
 * @param scenarioVariables - Scenario-specific variables
 * @returns Merged variables object
 */
export function mergeVariables(
  globalVariables: Record<string, string | number | boolean> = {},
  scenarioVariables: Record<string, string | number | boolean> = {}
): Record<string, string | number | boolean> {
  return {
    ...globalVariables,
    ...scenarioVariables
  };
}
