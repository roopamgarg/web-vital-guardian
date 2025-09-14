// Main exports - re-export everything from modules for backward compatibility
export * from './types';
export * from './utils/fileUtils';
export * from './utils/variableUtils';
export * from './utils/profileAnalyzer';
export * from './utils/reportGenerator';
export * from './measurements/webVitals';
export * from './measurements/performanceObserver';
export * from './scenarios/runner';
export * from './guardian';

// Default export
export { runWebVitalsGuardian as default } from './guardian';
