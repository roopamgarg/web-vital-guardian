// Web Vitals measurement results
export interface WebVitalsReport {
  scenario: string;
  url: string;
  timestamp: string;
  metrics: {
    FCP?: number;  // First Contentful Paint
    LCP?: number;  // Largest Contentful Paint
    FID?: number;  // First Input Delay
    CLS?: number;  // Cumulative Layout Shift
    INP?: number;  // Interaction to Next Paint
    TTFB?: number; // Time to First Byte
  };
  performance: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
  };
}

// Scenario file structure
export interface ScenarioStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll' | 'hover';
  selector?: string;
  text?: string;
  url?: string;
  timeout?: number;
  waitFor?: string;
}

export interface ScenarioFile {
  name: string;
  description?: string;
  url: string;
  timeout?: number;
  steps: ScenarioStep[];
  webVitals?: {
    budgets?: {
      FCP?: number;
      LCP?: number;
      FID?: number;
      CLS?: number;
      INP?: number;
      TTFB?: number;
    };
  };
  // Scenario-specific variables (takes precedence over global variables)
  variables?: Record<string, string | number | boolean>;
}

// Configuration for the guardian
export interface GuardianConfig {
  scenariosPath: string;
  outputPath?: string;
  headless?: boolean;
  timeout?: number;
  budgets?: {
    FCP?: number;
    LCP?: number;
    FID?: number;
    CLS?: number;
    INP?: number;
    TTFB?: number;
  };
  // Web Vitals measurement options
  webVitals?: {
    usePerformanceObserver?: boolean; // Force using PerformanceObserver (CSP-safe)
    fallbackToPackage?: boolean;      // Allow fallback to web-vitals package
  };
  // Global variables that can be used in scenario files
  variables?: Record<string, string | number | boolean>;
}

// Guardian execution result
export interface GuardianResult {
  reports: WebVitalsReport[];
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    budgetViolations: string[];
  };
}
