import type { Page } from 'playwright';
import type { WebVitalsReport, NetworkRequest, NetworkSummary } from '../types';

/**
 * Install Web Vitals collectors at the earliest script time.
 * Call BEFORE navigation to capture FCP/LCP from the initial load.
 */
export async function startVitalsObservation(
  page: Page,
  options?: { usePerformanceObserver?: boolean; fallbackToPackage?: boolean }
): Promise<void> {
  const useObserver = options?.usePerformanceObserver ?? true;
  const allowPackage = options?.fallbackToPackage ?? false;

  // For web-vitals package, we'll load it after navigation but before steps
  if (!useObserver && allowPackage) {
    // Just initialize the results object for now
    const initScript = `
      (function(){
        if (window.__wvg && window.__wvg.started) return;
        window.__wvg = { started: true, results: {}, packageLoaded: false };
      })();
    `;
    await page.addInitScript({ content: initScript });
    return;
  }

  if (!useObserver) return; // No observers requested

  const initScript = `
    (function(){
      if (window.__wvg && window.__wvg.started) return;
      window.__wvg = { started: true, results: {}, observers: [] };
      try {
        // FCP
        try {
          const fcpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find(e => e.name === 'first-contentful-paint');
            if (fcp) { window.__wvg.results.FCP = fcp.startTime; }
          });
          fcpObs.observe({ entryTypes: ['paint'] });
          window.__wvg.observers.push(fcpObs);
        } catch {}

        // LCP
        try {
          const lcpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) { window.__wvg.results.LCP = last.startTime; }
          });
          lcpObs.observe({ entryTypes: ['largest-contentful-paint'] });
          window.__wvg.observers.push(lcpObs);
        } catch {}

        // CLS
        try {
          let cls = 0;
          const clsObs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) { cls += (entry).value || 0; }
            }
            window.__wvg.results.CLS = cls;
          });
          clsObs.observe({ entryTypes: ['layout-shift'] });
          window.__wvg.observers.push(clsObs);
        } catch {}

        // INP (simplified event delay aggregation)
        try {
          let maxDelay = 0;
          const inpObs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const ps = (entry).processingStart;
              const st = entry.startTime;
              if (ps && st) { maxDelay = Math.max(maxDelay, ps - st); }
            }
            window.__wvg.results.INP = maxDelay;
          });
          inpObs.observe({ entryTypes: ['event'] });
          window.__wvg.observers.push(inpObs);
        } catch {}
      } catch {}
    })();
  `;
  await page.addInitScript({ content: initScript });
}

/**
 * Load web-vitals package and register metrics (for package approach)
 * Call AFTER navigation but BEFORE scenario steps
 */
export async function loadWebVitalsPackage(page: Page): Promise<void> {
  try {
    // Load the web-vitals package
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js'
    });
    
    // Wait a moment for the script to load
    await page.waitForTimeout(1000);
    
    // Register all metrics
    await page.evaluate(() => {
      if ((window as any)['webVitals'] && (window as any).__wvg) {
        const wv = (window as any)['webVitals'];
        (window as any).__wvg.packageLoaded = true;
        
        // Register all metrics
        wv.onFCP((metric: any) => { 
          (window as any).__wvg.results.FCP = metric.value; 
          console.log('FCP measured (web-vitals package):', metric.value);
        });
        wv.onLCP((metric: any) => { 
          (window as any).__wvg.results.LCP = metric.value; 
          console.log('LCP measured (web-vitals package):', metric.value);
        });
        wv.onCLS((metric: any) => { 
          (window as any).__wvg.results.CLS = metric.value; 
          console.log('CLS measured (web-vitals package):', metric.value);
        });
        wv.onINP((metric: any) => { 
          (window as any).__wvg.results.INP = metric.value; 
          console.log('INP measured (web-vitals package):', metric.value);
        });
      }
    });
    
    console.log('✅ Web-vitals package loaded and metrics registered');
  } catch (error) {
    console.warn('⚠️  Failed to load web-vitals package:', error);
  }
}

/**
 * Disconnect observers and collect measured metrics.
 * Call AFTER scenario steps and a short settle delay.
 */
export async function collectVitals(page: Page): Promise<WebVitalsReport['metrics']> {
  const results = await page.evaluate(() => {
    const out: any = (window as any).__wvg?.results ? { ...(window as any).__wvg.results } : {};
    
    // Add TTFB from Navigation Timing API
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) {
        out.TTFB = nav.responseStart - nav.requestStart;
      }
    } catch {}
    
    // Cleanup observers (for PerformanceObserver approach)
    try {
      if ((window as any).__wvg?.observers) {
        for (const obs of (window as any).__wvg.observers) { 
          try { obs.disconnect(); } catch {} 
        }
      }
    } catch {}
    
    // Reset state
    try {
      if ((window as any).__wvg) {
        (window as any).__wvg.started = false;
      }
    } catch {}
    
    return out;
  });
  return results as WebVitalsReport['metrics'];
}

/**
 * Measures Web Vitals metrics using PerformanceObserver (no external dependencies)
 * @param page - Playwright page instance
 * @returns Promise resolving to Web Vitals metrics
 */
export async function measureWebVitalsWithObserver(page: Page): Promise<WebVitalsReport['metrics']> {
  const metrics: WebVitalsReport['metrics'] = {};
  
  try {
    const results = await page.evaluate(() => {
      return new Promise<WebVitalsReport['metrics']>((resolve) => {
        const results: WebVitalsReport['metrics'] = {};
        let resolved = false;
        
        // Timeout after 10 seconds to prevent hanging
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(results);
          }
        }, 10000);
        
        // Helper function to resolve once
        const resolveOnce = (value: WebVitalsReport['metrics']) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(value);
          }
        };
        
        // Track metrics collected
        let metricsCollected = 0;
        const totalMetrics = 4; // FCP, LCP, CLS, INP
        
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics && !resolved) {
            resolveOnce(results);
          }
        };
        
        // 1. First Contentful Paint (FCP)
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              results.FCP = fcpEntry.startTime;
              console.log('FCP measured (PerformanceObserver):', fcpEntry.startTime);
              fcpObserver.disconnect();
              checkComplete();
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          console.warn('FCP PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 2. Largest Contentful Paint (LCP)
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              results.LCP = lastEntry.startTime;
              console.log('LCP measured (PerformanceObserver):', lastEntry.startTime);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // LCP can change, so we wait a bit before finalizing
          setTimeout(() => {
            lcpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          console.warn('LCP PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 3. Cumulative Layout Shift (CLS)
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            results.CLS = clsValue;
            console.log('CLS measured (PerformanceObserver):', clsValue);
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // CLS measurement continues until page unload, so we wait
          setTimeout(() => {
            clsObserver.disconnect();
            checkComplete();
          }, 3000);
        } catch (e) {
          console.warn('CLS PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 4. Interaction to Next Paint (INP) - simplified version
        try {
          let maxInteractionDelay = 0;
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const processingStart = (entry as any).processingStart;
              const startTime = entry.startTime;
              if (processingStart && startTime) {
                const delay = processingStart - startTime;
                maxInteractionDelay = Math.max(maxInteractionDelay, delay);
              }
            }
            results.INP = maxInteractionDelay;
            console.log('INP measured (PerformanceObserver):', maxInteractionDelay);
          });
          inpObserver.observe({ entryTypes: ['event'] });
          
          // Wait for interactions to settle
          setTimeout(() => {
            inpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          console.warn('INP PerformanceObserver failed:', e);
          checkComplete();
        }
        
        // 5. Time to First Byte (TTFB) - using Navigation Timing
        try {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
            console.log('TTFB measured (PerformanceObserver):', results.TTFB);
          }
        } catch (e) {
          console.warn('TTFB measurement failed:', e);
          // TTFB is optional, don't fail if not available
        }
      });
    });
    
    // Merge results
    Object.assign(metrics, results);
    
  } catch (error) {
    console.warn('Warning: Could not measure Web Vitals with PerformanceObserver:', error);
  }
  
  return metrics;
}

/**
 * Measures Web Vitals metrics on a page with CSP-safe fallback
 * @param page - Playwright page instance
 * @param options - Configuration options for Web Vitals measurement
 * @returns Promise resolving to Web Vitals metrics
 */
export async function measureWebVitals(
  page: Page, 
  options?: { usePerformanceObserver?: boolean; fallbackToPackage?: boolean }
): Promise<WebVitalsReport['metrics']> {
  const useObserver = options?.usePerformanceObserver ?? true; // Default to CSP-safe approach
  const allowFallback = options?.fallbackToPackage ?? false;   // Default to no fallback
  
  // If forced to use PerformanceObserver, use it directly
  if (useObserver && !allowFallback) {
    console.log('🔍 Measuring Web Vitals with PerformanceObserver (CSP-safe, no fallback)...');
    return measureWebVitalsWithObserver(page);
  }
  
  // If forced to use web-vitals package, try it first
  if (!useObserver && allowFallback) {
    try {
      console.log('📦 Measuring Web Vitals with web-vitals package...');
      return measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn('⚠️  web-vitals package failed, falling back to PerformanceObserver');
      return measureWebVitalsWithObserver(page);
    }
  }
  
  // Default behavior: Try PerformanceObserver first, then web-vitals package if allowed
  try {
    console.log('🔍 Measuring Web Vitals with PerformanceObserver (CSP-safe)...');
    const observerResults = await measureWebVitalsWithObserver(page);
    
    // If we got at least some metrics, use them
    const hasMetrics = Object.keys(observerResults).length > 0;
    if (hasMetrics) {
      console.log('✅ Successfully measured Web Vitals with PerformanceObserver');
      return observerResults;
    }
  } catch (error) {
    console.warn('PerformanceObserver failed, trying web-vitals package:', error);
  }
  
  // Fallback to web-vitals package if allowed (may be blocked by CSP)
  if (allowFallback) {
    try {
      console.log('📦 Attempting to load web-vitals package...');
      return await measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn('⚠️  web-vitals package blocked by CSP, using PerformanceObserver fallback');
      // Final fallback to PerformanceObserver
      return await measureWebVitalsWithObserver(page);
    }
  }
  
  // If no fallback allowed and PerformanceObserver failed, return empty metrics
  console.warn('⚠️  PerformanceObserver failed and fallback disabled, returning empty metrics');
  return {};
}

/**
 * Original web-vitals package implementation (for fallback)
 */
async function measureWebVitalsWithPackage(page: Page): Promise<WebVitalsReport['metrics']> {
  const metrics: WebVitalsReport['metrics'] = {};
  
  try {
    // Inject Web Vitals measurement script
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js'
    });
    
    // Wait a moment for the script to load
    await page.waitForTimeout(1000);
    
    // Measure all Web Vitals metrics together with proper timing
    const allMetrics = await page.evaluate(() => {
      return new Promise<WebVitalsReport['metrics']>((resolve) => {
        const results: WebVitalsReport['metrics'] = {};
        let metricsCollected = 0;
        const totalMetrics = 4; // FCP, LCP, CLS, INP
        
        // Timeout after 15 seconds
        const timeout = setTimeout(() => {
          resolve(results);
        }, 15000);
        
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics) {
            clearTimeout(timeout);
            resolve(results);
          }
        };
        
        // Check if web-vitals is available
        if (!('webVitals' in window)) {
          console.warn('webVitals library not loaded');
          clearTimeout(timeout);
          resolve(results);
          return;
        }
        
        const webVitals = (window as any)['webVitals'];
        
        // Measure FCP (First Contentful Paint)
        try {
          webVitals.onFCP((metric: any) => {
            results.FCP = metric.value;
            console.log('FCP measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('FCP measurement failed:', e);
          checkComplete();
        }
        
        // Measure LCP (Largest Contentful Paint)
        try {
          webVitals.onLCP((metric: any) => {
            results.LCP = metric.value;
            console.log('LCP measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('LCP measurement failed:', e);
          checkComplete();
        }
        
        // Measure CLS (Cumulative Layout Shift)
        try {
          webVitals.onCLS((metric: any) => {
            results.CLS = metric.value;
            console.log('CLS measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('CLS measurement failed:', e);
          checkComplete();
        }
        
        // Measure INP (Interaction to Next Paint)
        try {
          webVitals.onINP((metric: any) => {
            results.INP = metric.value;
            console.log('INP measured:', metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn('INP measurement failed:', e);
          checkComplete();
        }
        
        // Measure TTFB (Time to First Byte) using Performance API
        try {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
            console.log('TTFB measured:', results.TTFB);
          }
        } catch (e) {
          console.warn('TTFB measurement failed:', e);
        }
      });
    });
    
    // Merge results
    Object.assign(metrics, allMetrics);
    
    console.log('✅ Successfully measured Web Vitals with web-vitals package:', metrics);
    
  } catch (error) {
    console.warn('Warning: Could not measure some Web Vitals with package:', error);
    throw error; // Re-throw to trigger fallback
  }
  
  return metrics;
}

/**
 * Measures additional performance metrics using the Performance API
 * @param page - Playwright page instance
 * @returns Promise resolving to performance metrics
 */
export async function measurePerformanceMetrics(page: Page): Promise<WebVitalsReport['performance']> {
  const performanceMetrics = await page.evaluate((): WebVitalsReport['performance'] => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint') as PerformanceEntry[];
    
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      firstPaint: paint.find((entry: PerformanceEntry) => entry.name === 'first-paint')?.startTime || 0
    };
  });
  
  return performanceMetrics;
}



/**
 * Measures network requests using the Performance API
 * @param page - Playwright page instance
 * @returns Promise resolving to network request data
 */
export async function measureNetworkRequests(page: Page, cdpSession?: any): Promise<WebVitalsReport['network']> {
  // Use CDP Network domain for comprehensive network analysis
  if (!cdpSession) {
    // Fallback to Performance API if no CDP session provided
    return await measureNetworkRequestsFallback(page);
  }
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle');
  
  // Get the collected network data from the CDP session
  const networkRequests = (cdpSession as any).networkRequests;
  const networkResponses = (cdpSession as any).networkResponses;
  const loadingFinished = (cdpSession as any).loadingFinished;
  
  // Process collected network data
  const requests: NetworkRequest[] = [];
  
  for (const [requestId, request] of networkRequests) {
    const response = networkResponses.get(requestId);
    const finished = loadingFinished.get(requestId);
    
    if (response) {
      const url = new URL(request.url);
      const domain = url.hostname;
      const protocol = url.protocol.replace(':', '');
      
      // Calculate timing from CDP data
      const timing = response.timing || {};
      
      // CDP timing values are in milliseconds relative to the request start
      // Use the actual wall clock time for total response time
      const responseTime = finished?.timestamp ? 
        (finished.timestamp - request.timestamp) * 1000 : 
        (timing.receiveHeadersEnd || 0);
      
      // Calculate the sum of all timing components for verification
      const dnsLookup = Math.max(0, (timing.dnsEnd || 0) - (timing.dnsStart || 0));
      const tcpConnect = Math.max(0, (timing.connectEnd || 0) - (timing.connectStart || 0));
      const sslHandshake = Math.max(0, (timing.sslEnd || 0) - (timing.sslStart || 0));
      const requestSend = Math.max(0, (timing.sendEnd || 0) - (timing.sendStart || 0));
      const waitTime = Math.max(0, (timing.receiveHeadersEnd || 0) - (timing.sendEnd || 0));
      const responseReceive = Math.max(0, (timing.receiveHeadersEnd || 0) - (timing.receiveHeadersStart || 0));
      const redirectTime = Math.max(0, (timing.redirectEnd || 0) - (timing.redirectStart || 0));
      
      // Calculate content download time (time from headers received to response finished)
      const contentDownloadTime = finished?.timestamp ? 
        Math.max(0, (finished.timestamp - request.timestamp) * 1000 - (timing.receiveHeadersEnd || 0)) : 0;
      
      // The sum of timing components should match the total time
      const timingSum = dnsLookup + tcpConnect + sslHandshake + requestSend + waitTime + responseReceive + redirectTime + contentDownloadTime;
      
      requests.push({
        url: request.url,
        method: request.method,
        status: response.status,
        statusText: response.statusText,
        responseTime: responseTime,
        transferSize: finished?.encodedDataLength || 0,
        encodedBodySize: response.encodedDataLength || 0,
        decodedBodySize: response.encodedDataLength || 0, // CDP doesn't provide decoded size
        startTime: request.timestamp || 0,
        endTime: finished?.timestamp || request.timestamp,
        duration: responseTime,
        resourceType: request.type || 'other',
        fromCache: response.fromDiskCache || response.fromPrefetchCache || false,
        protocol,
        domain,
        // Enhanced timing from CDP
        timing: {
          dnsLookup: dnsLookup,
          tcpConnect: tcpConnect,
          sslHandshake: sslHandshake,
          requestSend: requestSend,
          waitTime: waitTime,
          responseReceive: responseReceive,
          redirectTime: redirectTime,
          contentDownloadTime: contentDownloadTime, // Time to download response body
          totalTime: responseTime, // Use the actual wall clock time
          timingSum: timingSum, // Sum of all timing components
          fromCache: response.fromDiskCache || response.fromPrefetchCache || false,
          connectionReused: response.connectionReused || false
        },
        // Additional CDP data
        headers: {
          request: request.headers,
          response: response.headers
        },
        security: {
          state: response.securityState,
          details: response.securityDetails
        },
        connection: {
          id: response.connectionId,
          remoteIP: response.remoteIPAddress,
          remotePort: response.remotePort,
          reused: response.connectionReused
        },
        initiator: request.initiator,
        redirectChain: request.redirectResponse ? [request.redirectResponse] : []
      });
    }
  }
  
  // Calculate summary statistics
  const summary: NetworkSummary = {
    totalRequests: requests.length,
    totalTransferSize: requests.reduce((sum, req) => sum + req.transferSize, 0),
    totalEncodedSize: requests.reduce((sum, req) => sum + req.encodedBodySize, 0),
    totalDecodedSize: requests.reduce((sum, req) => sum + req.decodedBodySize, 0),
    averageResponseTime: requests.length > 0 
      ? requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length 
      : 0,
    slowestRequest: requests.length > 0 
      ? requests.reduce((slowest, req) => req.responseTime > slowest.responseTime ? req : slowest)
      : null,
    failedRequests: requests.filter(req => req.status >= 400).length,
    requestsByType: {},
    requestsByDomain: {}
  };

  // Count requests by type and domain
  requests.forEach(req => {
    summary.requestsByType[req.resourceType] = (summary.requestsByType[req.resourceType] || 0) + 1;
    summary.requestsByDomain[req.domain] = (summary.requestsByDomain[req.domain] || 0) + 1;
  });

  // CDP session cleanup is handled by the caller

  return {
    requests,
    summary
  };
}

// Fallback function using Performance API
async function measureNetworkRequestsFallback(page: Page): Promise<WebVitalsReport['network']> {
  const performanceData = await page.evaluate((): WebVitalsReport['network'] => {

    /**
 * Helper function to determine resource type from URL
 */
function getResourceType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  const pathname = new URL(url).pathname.toLowerCase();
  
  if (pathname.includes('/api/') || pathname.includes('/graphql')) {
    return 'api';
  }
  
  switch (extension) {
    case 'js':
      return 'script';
    case 'css':
      return 'stylesheet';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'ico':
      return 'image';
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
      return 'font';
    case 'mp4':
    case 'webm':
    case 'ogg':
      return 'media';
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    default:
      return 'other';
  }
}

    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const requests: NetworkRequest[] = entries.map(entry => {
      const url = new URL(entry.name);
      const domain = url.hostname;
      const protocol = url.protocol.replace(':', '');
      
      return {
        url: entry.name,
        method: 'GET', // Performance API doesn't provide method, defaulting to GET
        status: 200, // Performance API doesn't provide status, defaulting to 200
        statusText: 'OK',
        responseTime: entry.responseEnd - entry.responseStart,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        startTime: entry.startTime,
        endTime: entry.responseEnd,
        duration: entry.duration,
        resourceType: getResourceType(entry.name),
        fromCache: entry.transferSize === 0 && entry.encodedBodySize > 0,
        protocol,
        domain,
        timing: {
          dnsLookup: Math.max(0, entry.domainLookupEnd - entry.domainLookupStart),
          tcpConnect: Math.max(0, entry.connectEnd - entry.connectStart),
          sslHandshake: entry.secureConnectionStart > 0 ? Math.max(0, entry.connectEnd - entry.secureConnectionStart) : 0,
          requestSend: Math.max(0, entry.responseStart - entry.requestStart),
          waitTime: Math.max(0, entry.responseStart - entry.requestStart),
          responseReceive: Math.max(0, entry.responseEnd - entry.responseStart),
          // Additional timing data
          redirectTime: Math.max(0, entry.redirectEnd - entry.redirectStart),
          contentDownloadTime: Math.max(0, entry.responseEnd - entry.responseStart), // Performance API doesn't distinguish this
          totalTime: Math.max(0, entry.responseEnd - entry.startTime),
          timingSum: Math.max(0, entry.responseEnd - entry.startTime), // Same as totalTime for Performance API
          // Cache timing
          fromCache: entry.transferSize === 0 && entry.encodedBodySize > 0,
          // Connection reuse
          connectionReused: entry.connectStart === 0 && entry.connectEnd === 0
        }
      };
    });

    // Calculate summary statistics
    const summary: NetworkSummary = {
      totalRequests: requests.length,
      totalTransferSize: requests.reduce((sum, req) => sum + req.transferSize, 0),
      totalEncodedSize: requests.reduce((sum, req) => sum + req.encodedBodySize, 0),
      totalDecodedSize: requests.reduce((sum, req) => sum + req.decodedBodySize, 0),
      averageResponseTime: requests.length > 0 
        ? requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length 
        : 0,
      slowestRequest: requests.length > 0 
        ? requests.reduce((slowest, req) => req.responseTime > slowest.responseTime ? req : slowest)
        : null,
      failedRequests: requests.filter(req => req.status >= 400).length,
      requestsByType: {},
      requestsByDomain: {}
    };

    // Count requests by type and domain
    requests.forEach(req => {
      summary.requestsByType[req.resourceType] = (summary.requestsByType[req.resourceType] || 0) + 1;
      summary.requestsByDomain[req.domain] = (summary.requestsByDomain[req.domain] || 0) + 1;
    });

    return {
      requests,
      summary
    };
  });

  return performanceData;
}

// Set up CDP network monitoring before navigation
export async function setupCDPNetworkMonitoring(page: Page): Promise<any> {
  try {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.enable');
    
    // Store network requests and responses
    const networkRequests = new Map();
    const networkResponses = new Map();
    const loadingFinished = new Map();
    
    // Listen to network events
    cdpSession.on('Network.requestWillBeSent', (params: any) => {
      const requestId = params.requestId;
      networkRequests.set(requestId, {
        requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
        timestamp: params.timestamp,
        wallTime: params.wallTime,
        initiator: params.initiator,
        redirectResponse: params.redirectResponse,
        type: params.type,
        frameId: params.frameId,
        hasUserGesture: params.hasUserGesture,
        documentURL: params.documentURL,
        loaderId: params.loaderId
      });
    });
    
    cdpSession.on('Network.responseReceived', (params: any) => {
      const requestId = params.requestId;
      networkResponses.set(requestId, {
        requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        headers: params.response.headers,
        mimeType: params.response.mimeType,
        connectionReused: params.response.connectionReused,
        connectionId: params.response.connectionId,
        remoteIPAddress: params.response.remoteIPAddress,
        remotePort: params.response.remotePort,
        fromDiskCache: params.response.fromDiskCache,
        fromServiceWorker: params.response.fromServiceWorker,
        fromPrefetchCache: params.response.fromPrefetchCache,
        encodedDataLength: params.response.encodedDataLength,
        timing: params.response.timing,
        responseTime: params.timestamp,
        protocol: params.response.protocol,
        securityState: params.response.securityState,
        securityDetails: params.response.securityDetails
      });
    });
    
    cdpSession.on('Network.loadingFinished', (params: any) => {
      const requestId = params.requestId;
      loadingFinished.set(requestId, {
        requestId,
        timestamp: params.timestamp,
        encodedDataLength: params.encodedDataLength,
        shouldReportCorbBlocking: false
      });
    });
    
    // Store the data maps on the session for later retrieval
    (cdpSession as any).networkRequests = networkRequests;
    (cdpSession as any).networkResponses = networkResponses;
    (cdpSession as any).loadingFinished = loadingFinished;
    
    return cdpSession;
  } catch (error) {
    console.warn('⚠️  Failed to set up CDP network monitoring:', error);
    return null;
  }
}

// Enhanced main function with error handling
export async function measureNetworkRequestsEnhanced(page: Page, cdpSession?: any): Promise<WebVitalsReport['network']> {
  try {
    // Try CDP first for comprehensive data
    return await measureNetworkRequests(page, cdpSession);
  } catch (error) {
    console.warn('⚠️  CDP Network analysis failed, falling back to Performance API:', error);
    return await measureNetworkRequestsFallback(page);
  }
}
