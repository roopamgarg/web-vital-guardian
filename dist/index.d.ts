import { Browser } from 'playwright';
import { CpuUsageAnalysisResult } from './cpuUsageAnalyzer';
import { MemoryAnalysisResult } from './memoryAnalyzer';
import { Page } from 'playwright';
import { Page as Page_2 } from '@playwright/test';
import { Protocol } from 'playwright-core/types/protocol';
import { ThreadBlockingAnalysisResult } from './threadBlockingAnalyzer';

/**
 * Analyzes profile data and returns comprehensive function performance statistics
 */
export declare function analyzeProfile(profile: EnhancedProfile): {
    originalFunctionName: string;
    originalSource: string;
    originalLine: number;
    totalTime: number;
    hitCount: number;
    samples: number;
    averageTime: number;
    domain: string;
}[];

/**
 * Disconnect observers and collect measured metrics.
 * Call AFTER scenario steps and a short settle delay.
 */
export declare function collectVitals(page: Page): Promise<WebVitalsReport['metrics']>;

export declare interface EnhancedProfile {
    nodes: EnhancedProfileNode[];
    samples: any[];
    startTime: number;
    endTime: number;
}

/**
 * Utility functions for analyzing enhanced profile data with source map information
 */
export declare interface EnhancedProfileNode {
    callFrame: {
        functionName: string;
        originalFunctionName?: string;
        originalSource?: string;
        originalLine?: number;
        originalColumn?: number;
        url: string;
    };
    hitCount?: number;
    children?: number[];
}

/**
 * Executes a single scenario step
 * @param page - Playwright page instance
 * @param step - Scenario step to execute
 * @throws Error if step execution fails
 */
export declare function executeScenarioStep(page: Page, step: ScenarioStep): Promise<void>;

/**
 * Exports profile data in a readable format
 */
export declare function exportProfileData(profile: EnhancedProfile, format?: 'json' | 'csv'): string;

/**
 * Recursively finds all *.scenario.json and *.scenario.js files in a directory
 * @param directory - Directory path to scan
 * @returns Array of file paths
 */
export declare function findScenarioFiles(directory: string): string[];

/**
 * Formats profile analysis for console output
 */
export declare function formatProfileAnalysis(profile: EnhancedProfile): {
    originalFunctionName: string;
    originalSource: string;
    originalLine: number;
    totalTime: number;
    hitCount: number;
    samples: number;
    averageTime: number;
    domain: string;
}[];

/**
 * Generates an elegant HTML report for Web Vitals Guardian results
 * @param result - Guardian execution result
 * @param outputPath - Path to save the HTML report
 */
export declare function generateHTMLReport(result: GuardianResult, outputPath: string): void;

/**
 * Generates comprehensive profile summary with Phase 1 metrics
 */
export declare function generateProfileSummary(profile: EnhancedProfile, totalLoadTime?: number): {
    totalExecutionTime: number;
    totalFunctions: number;
    totalCalls: number;
    longestFunctionTime: number;
    topFunctions: {
        name: string;
        time: number;
        percentage: number;
        calls: number;
        averageTime: number;
        source: string;
        line: number;
    }[];
    functionCallFrequency: Record<string, number>;
    thirdPartyImpact: {
        totalTime: number;
        percentage: number;
        scripts: {
            domain: string;
            time: number;
            percentage: number;
            functions: number;
        }[];
    };
    executionEfficiency: {
        jsExecutionPercentage: number;
        idleTimePercentage: number;
        mainThreadBlockingTime: number;
    };
    memoryAnalysis: MemoryAnalysisResult;
    threadBlockingAnalysis: ThreadBlockingAnalysisResult;
    cpuUsageAnalysis: CpuUsageAnalysisResult;
};

/**
 * Filters functions by source file
 */
export declare function getFunctionsBySource(profile: EnhancedProfile, sourcePattern: string): {
    originalFunctionName: string;
    originalSource: string;
    originalLine: number;
    totalTime: number;
    hitCount: number;
    samples: number;
    averageTime: number;
    domain: string;
}[];

/**
 * Gets the top N most expensive functions
 */
export declare function getTopExpensiveFunctions(profile: EnhancedProfile, limit?: number): {
    originalFunctionName: string;
    originalSource: string;
    originalLine: number;
    totalTime: number;
    hitCount: number;
    samples: number;
    averageTime: number;
    domain: string;
}[];

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
    };
    enableProfile?: boolean;
    variables?: Record<string, string | number | boolean>;
    generateHTMLReport?: boolean;
    htmlReportPath?: string;
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
 * Recursively interpolates variables in an object
 * @param obj - Object to interpolate variables in
 * @param variables - Object containing variable values
 * @returns Object with interpolated values
 */
export declare function interpolateObject(obj: any, variables: Record<string, string | number | boolean>): any;

/**
 * Interpolates variables in a scenario file
 * @param scenario - Scenario file to interpolate
 * @param variables - Global variables to use for interpolation
 * @returns Scenario file with interpolated values
 */
export declare function interpolateScenario(scenario: ScenarioFile, variables: Record<string, string | number | boolean>): ScenarioFile;

/**
 * Interpolates variables in a string using ${variableName} syntax
 * @param text - Text containing variable references
 * @param variables - Object containing variable values
 * @returns Interpolated string
 */
export declare function interpolateVariables(text: string, variables: Record<string, string | number | boolean>): string;

/**
 * Loads and validates a scenario file (JSON or JavaScript)
 * @param filePath - Path to the scenario file
 * @param globalVariables - Global variables to use for interpolation
 * @returns Parsed and validated scenario file with interpolated variables
 * @throws Error if file cannot be loaded or is invalid
 */
export declare function loadScenarioFile(filePath: string, globalVariables?: Record<string, string | number | boolean>): ScenarioFile;

/**
 * Load web-vitals package and register metrics (for package approach)
 * Call AFTER navigation but BEFORE scenario steps
 */
export declare function loadWebVitalsPackage(page: Page): Promise<void>;

/**
 * Measures network requests using the Performance API
 * @param page - Playwright page instance
 * @returns Promise resolving to network request data
 */
export declare function measureNetworkRequests(page: Page, cdpSession?: any): Promise<WebVitalsReport['network']>;

export declare function measureNetworkRequestsEnhanced(page: Page, cdpSession?: any): Promise<WebVitalsReport['network']>;

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
}): Promise<WebVitalsReport['metrics']>;

/**
 * Measures Web Vitals metrics using PerformanceObserver (no external dependencies)
 * @param page - Playwright page instance
 * @returns Promise resolving to Web Vitals metrics
 */
export declare function measureWebVitalsWithObserver(page: Page): Promise<WebVitalsReport['metrics']>;

/**
 * Merges global and scenario-specific variables
 * Scenario-specific variables take precedence over global ones
 * @param globalVariables - Global variables from config
 * @param scenarioVariables - Scenario-specific variables
 * @returns Merged variables object
 */
export declare function mergeVariables(globalVariables?: Record<string, string | number | boolean>, scenarioVariables?: Record<string, string | number | boolean>): Record<string, string | number | boolean>;

export declare interface NetworkConnection {
    id: string;
    remoteIP: string;
    remotePort: number;
    reused: boolean;
}

export declare interface NetworkHeaders {
    request: Record<string, string>;
    response: Record<string, string>;
}

export declare interface NetworkRequest {
    url: string;
    method: string;
    status: number;
    statusText: string;
    responseTime: number;
    transferSize: number;
    encodedBodySize: number;
    decodedBodySize: number;
    startTime: number;
    endTime: number;
    duration: number;
    resourceType: string;
    fromCache: boolean;
    protocol: string;
    domain: string;
    timing?: NetworkTiming;
    headers?: NetworkHeaders;
    security?: NetworkSecurity;
    connection?: NetworkConnection;
    initiator?: any;
    redirectChain?: any[];
}

export declare interface NetworkSecurity {
    state: string;
    details?: {
        protocol: string;
        keyExchange: string;
        keyExchangeGroup: string;
        cipher: string;
        mac: string;
        certificateId: number;
        subjectName: string;
        sanList: string[];
        issuer: string;
        validFrom: number;
        validTo: number;
        signedCertificateTimestampList: any[];
        certificateTransparencyCompliance: string;
    };
}

export declare interface NetworkSummary {
    totalRequests: number;
    totalTransferSize: number;
    totalEncodedSize: number;
    totalDecodedSize: number;
    averageResponseTime: number;
    slowestRequest: NetworkRequest | null;
    failedRequests: number;
    requestsByType: Record<string, number>;
    requestsByDomain: Record<string, number>;
}

export declare interface NetworkTiming {
    dnsLookup: number;
    tcpConnect: number;
    sslHandshake: number;
    requestSend: number;
    waitTime: number;
    responseReceive: number;
    redirectTime: number;
    contentDownloadTime: number;
    totalTime: number;
    timingSum: number;
    fromCache: boolean;
    connectionReused: boolean;
}

export declare function profileJs<T>(page: Page_2, run: () => Promise<T>): Promise<{
    profile: Protocol.Profiler.Profile;
    error: unknown;
}>;

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
    variables?: Record<string, string | number | boolean>;
}

export declare interface ScenarioStep {
    type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll' | 'hover';
    selector?: string;
    text?: string;
    url?: string;
    timeout?: number;
    waitFor?: string;
}

export declare function setupCDPNetworkMonitoring(page: Page): Promise<any>;

/**
 * Install Web Vitals collectors at the earliest script time.
 * Call BEFORE navigation to capture FCP/LCP from the initial load.
 */
export declare function startVitalsObservation(page: Page, options?: {
    usePerformanceObserver?: boolean;
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
    network: {
        requests: NetworkRequest[];
        summary: NetworkSummary;
    };
    profile: {
        summary: {
            totalExecutionTime: number;
            totalFunctions: number;
            totalCalls: number;
            longestFunctionTime: number;
            topFunctions: Array<{
                name: string;
                time: number;
                percentage: number;
                calls: number;
                averageTime: number;
                source: string;
                line: number;
            }>;
            functionCallFrequency: Record<string, number>;
            thirdPartyImpact: {
                totalTime: number;
                percentage: number;
                scripts: Array<{
                    domain: string;
                    time: number;
                    percentage: number;
                    functions: number;
                }>;
            };
            executionEfficiency: {
                jsExecutionPercentage: number;
                idleTimePercentage: number;
                mainThreadBlockingTime: number;
            };
            threadBlockingAnalysis: {
                totalBlockingTime: number;
                blockingPercentage: number;
                longestBlockingEvent: number;
                blockingEvents: Array<{
                    functionName: string;
                    blockingTime: number;
                    startTime: number;
                    endTime: number;
                    severity: 'low' | 'medium' | 'high' | 'critical';
                }>;
                blockingPatterns: {
                    continuousBlocking: number;
                    intermittentBlocking: number;
                    peakBlockingTime: number;
                    averageBlockingTime: number;
                };
                responsivenessImpact: {
                    userInteractionDelay: number;
                    frameDrops: number;
                    responsivenessScore: number;
                };
            };
            cpuUsageAnalysis: {
                totalCpuTime: number;
                averageCpuUsage: number;
                peakCpuUsage: number;
                cpuIntensiveFunctions: Array<{
                    functionName: string;
                    cpuTime: number;
                    cpuPercentage: number;
                    calls: number;
                    averageCpuPerCall: number;
                }>;
                cpuUsagePatterns: {
                    highCpuPeriods: number;
                    lowCpuPeriods: number;
                    cpuSpikes: number;
                    averageCpuPerPeriod: number;
                };
                cpuEfficiency: {
                    cpuUtilizationScore: number;
                    cpuWastePercentage: number;
                    optimizationPotential: number;
                };
            };
        };
        rawData: any;
    } | null;
}

export { }
