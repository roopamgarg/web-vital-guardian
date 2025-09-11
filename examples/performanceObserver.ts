import type { Page } from 'playwright';
import type { WebVitalsReport } from '../types';

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
              fcpObserver.disconnect();
              checkComplete();
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          checkComplete();
        }
        
        // 2. Largest Contentful Paint (LCP)
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              results.LCP = lastEntry.startTime;
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // LCP can change, so we wait a bit before finalizing
          setTimeout(() => {
            lcpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
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
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // CLS measurement continues until page unload, so we wait
          setTimeout(() => {
            clsObserver.disconnect();
            checkComplete();
          }, 3000);
        } catch (e) {
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
          });
          inpObserver.observe({ entryTypes: ['event'] });
          
          // Wait for interactions to settle
          setTimeout(() => {
            inpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          checkComplete();
        }
        
        // 5. Time to First Byte (TTFB) - using Navigation Timing
        try {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
          }
        } catch (e) {
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
 * Measures Web Vitals with fallback strategy
 * Tries PerformanceObserver first, falls back to web-vitals package
 * @param page - Playwright page instance
 * @returns Promise resolving to Web Vitals metrics
 */
export async function measureWebVitalsWithFallback(page: Page): Promise<WebVitalsReport['metrics']> {
  try {
    // Try PerformanceObserver first (faster, no network dependency)
    const observerResults = await measureWebVitalsWithObserver(page);
    
    // If we got at least some metrics, use them
    const hasMetrics = Object.keys(observerResults).length > 0;
    if (hasMetrics) {
      console.log('✅ Using PerformanceObserver for Web Vitals measurement');
      return observerResults;
    }
  } catch (error) {
    console.warn('PerformanceObserver failed, falling back to web-vitals package:', error);
  }
  
  // Fallback to web-vitals package
  console.log('📦 Falling back to web-vitals package');
  return await measureWebVitalsWithPackage(page);
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
    
    // Measure FCP (First Contentful Paint)
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vitals' in window) {
          (window as any)['web-vitals'].onFCP((metric: any) => {
            resolve(metric.value);
          });
        } else {
          resolve(null);
        }
      });
    });
    if (fcp) metrics.FCP = fcp as number;
    
    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vitals' in window) {
          (window as any)['web-vitals'].onLCP((metric: any) => {
            resolve(metric.value);
          });
        } else {
          resolve(null);
        }
      });
    });
    if (lcp) metrics.LCP = lcp as number;
    
    // Measure CLS (Cumulative Layout Shift)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vitals' in window) {
          (window as any)['web-vitals'].onCLS((metric: any) => {
            resolve(metric.value);
          });
        } else {
          resolve(null);
        }
      });
    });
    if (cls) metrics.CLS = cls as number;
    
    // Measure INP (Interaction to Next Paint)
    const inp = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vitals' in window) {
          (window as any)['web-vitals'].onINP((metric: any) => {
            resolve(metric.value);
          });
        } else {
          resolve(null);
        }
      });
    });
    if (inp) metrics.INP = inp as number;
    
    // Measure TTFB (Time to First Byte) using Performance API
    const ttfb = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation ? navigation.responseStart - navigation.requestStart : null;
    });
    if (ttfb) metrics.TTFB = ttfb;
    
  } catch (error) {
    console.warn('Warning: Could not measure some Web Vitals:', error);
  }
  
  return metrics;
}
