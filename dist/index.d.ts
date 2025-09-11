import { Browser } from 'playwright';
import { Page } from 'playwright';

/**
 * Disconnect observers and collect measured metrics.
 * Call AFTER scenario steps and a short settle delay.
 */
export declare function collectVitals(page: Page): Promise<WebVitalsReport['metrics']>;

/**
 * Executes a single scenario step
 * @param page - Playwright page instance
 * @param step - Scenario step to execute
 * @throws Error if step execution fails
 */
export declare function executeScenarioStep(page: Page, step: ScenarioStep): Promise<void>;

/**
 * Recursively finds all *.scenario.json files in a directory
 * @param directory - Directory path to scan
 * @returns Array of file paths
 */
export declare function findScenarioFiles(directory: string): string[];

export declare interface GuardianConfig {
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
    webVitals?: {
        usePerformanceObserver?: boolean;
        fallbackToPackage?: boolean;
    };
}

export declare interface GuardianResult {
    reports: WebVitalsReport[];
    summary: {
        totalScenarios: number;
        passed: number;
        failed: number;
        budgetViolations: string[];
    };
}

/**
 * Loads and validates a scenario file
 * @param filePath - Path to the scenario file
 * @returns Parsed and validated scenario file
 * @throws Error if file cannot be loaded or is invalid
 */
export declare function loadScenarioFile(filePath: string): ScenarioFile;

/**
 * Measures additional performance metrics using the Performance API
 * @param page - Playwright page instance
 * @returns Promise resolving to performance metrics
 */
export declare function measurePerformanceMetrics(page: Page): Promise<WebVitalsReport['performance']>;

/**
 * Measures Web Vitals metrics on a page with CSP-safe fallback
 * @param page - Playwright page instance
 * @param options - Configuration options for Web Vitals measurement
 * @returns Promise resolving to Web Vitals metrics
 */
export declare function measureWebVitals(page: Page, options?: {
    usePerformanceObserver?: boolean;
    fallbackToPackage?: boolean;
}): Promise<WebVitalsReport['metrics']>;

/**
 * Measures Web Vitals metrics using PerformanceObserver (no external dependencies)
 * @param page - Playwright page instance
 * @returns Promise resolving to Web Vitals metrics
 */
export declare function measureWebVitalsWithObserver(page: Page): Promise<WebVitalsReport['metrics']>;

/**
 * Runs a complete scenario and measures Web Vitals
 * @param browser - Playwright browser instance
 * @param scenario - Scenario configuration
 * @param config - Guardian configuration (for Web Vitals options)
 * @returns Promise resolving to Web Vitals report
 */
export declare function runScenario(browser: Browser, scenario: ScenarioFile, config?: GuardianConfig): Promise<WebVitalsReport>;

/**
 * Main function that runs all scenarios and generates Web Vitals reports
 * @param config - Guardian configuration
 * @returns Promise resolving to execution results and summary
 */
declare function runWebVitalsGuardian(config: GuardianConfig): Promise<GuardianResult>;
export default runWebVitalsGuardian;
export { runWebVitalsGuardian }

export declare interface ScenarioFile {
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
}

export declare interface ScenarioStep {
    type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll' | 'hover';
    selector?: string;
    text?: string;
    url?: string;
    timeout?: number;
    waitFor?: string;
}

/**
 * Install Web Vitals collectors at the earliest script time.
 * Call BEFORE navigation to capture FCP/LCP from the initial load.
 */
export declare function startVitalsObservation(page: Page, options?: {
    usePerformanceObserver?: boolean;
    fallbackToPackage?: boolean;
}): Promise<void>;

export declare interface WebVitalsReport {
    scenario: string;
    url: string;
    timestamp: string;
    metrics: {
        FCP?: number;
        LCP?: number;
        FID?: number;
        CLS?: number;
        INP?: number;
        TTFB?: number;
    };
    performance: {
        loadTime: number;
        domContentLoaded: number;
        firstPaint: number;
    };
}

export { }
