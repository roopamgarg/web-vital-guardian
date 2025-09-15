// Network request timing breakdown
export interface NetworkTiming {
  dnsLookup: number;
  tcpConnect: number;
  sslHandshake: number;
  requestSend: number;
  waitTime: number;
  responseReceive: number;
  redirectTime: number;
  contentDownloadTime: number; // Time to download response body
  totalTime: number;
  timingSum: number; // Sum of all timing components for verification
  fromCache: boolean;
  connectionReused: boolean;
}

// Enhanced network data from CDP
export interface NetworkHeaders {
  request: Record<string, string>;
  response: Record<string, string>;
}

export interface NetworkSecurity {
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

export interface NetworkConnection {
  id: string;
  remoteIP: string;
  remotePort: number;
  reused: boolean;
}

// Network request information
export interface NetworkRequest {
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
  // Enhanced CDP data
  headers?: NetworkHeaders;
  security?: NetworkSecurity;
  connection?: NetworkConnection;
  initiator?: any;
  redirectChain?: any[];
}

export interface NetworkSummary {
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
  network: {
    requests: NetworkRequest[];
    summary: NetworkSummary;
  };
  profile: any;
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
    usePerformanceObserver?: boolean; // Use PerformanceObserver (default: true) or web-vitals package (false)
  };
  enableProfile?: boolean;
  // Global variables that can be used in scenario files
  variables?: Record<string, string | number | boolean>;
  // HTML report generation options
  generateHTMLReport?: boolean;
  htmlReportPath?: string;
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
