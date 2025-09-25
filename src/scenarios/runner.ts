import type { Browser, Page } from 'playwright';
import type { ScenarioStep, ScenarioFile, WebVitalsReport, GuardianConfig } from '../types';
import { measureWebVitals, measurePerformanceMetrics, measureNetworkRequestsEnhanced, setupCDPNetworkMonitoring, startVitalsObservation, collectVitals, loadWebVitalsPackage } from '../measurements/webVitals';
import { profileJs } from '../measurements/performanceObserver';
import { generateProfileSummary } from '../utils/profileAnalyzer';

/**
 * Executes a single scenario step
 * @param page - Playwright page instance
 * @param step - Scenario step to execute
 * @throws Error if step execution fails
 */
export async function executeScenarioStep(page: Page, step: ScenarioStep): Promise<void> {
  const timeout = step.timeout || 30000;
  
  switch (step.type) {
    case 'navigate':
      if (!step.url) {
        throw new Error('Navigate step requires a URL');
      }
      await page.goto(step.url, { waitUntil: 'networkidle', timeout });
      break;
      
    case 'click':
      if (!step.selector) {
        throw new Error('Click step requires a selector');
      }
      await page.click(step.selector, { timeout });
      break;
      
    case 'type':
      if (!step.selector || !step.text) {
        throw new Error('Type step requires a selector and text');
      }
      await page.fill(step.selector, step.text, { timeout });
      break;
      
    case 'wait':
      if (step.waitFor) {
        await page.waitForSelector(step.waitFor, { timeout });
      } else {
        await page.waitForTimeout(step.timeout || 1000);
      }
      break;
      
    case 'scroll':
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      break;
      
    case 'hover':
      if (!step.selector) {
        throw new Error('Hover step requires a selector');
      }
      await page.hover(step.selector, { timeout });
      break;
      
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

async function runProfile(page: Page, scenario: ScenarioFile): Promise<void> {
    for (const step of scenario.steps) {
      await executeScenarioStep(page, step);
    }
}

/**
 * Runs a complete scenario and measures Web Vitals
 * @param browser - Playwright browser instance
 * @param scenario - Scenario configuration
 * @param config - Guardian configuration (for Web Vitals options)
 * @returns Promise resolving to Web Vitals report
 */
export async function runScenario(browser: Browser, scenario: ScenarioFile, config?: GuardianConfig): Promise<WebVitalsReport> {
  
  const context = await browser.newContext({bypassCSP: true});
  const page = await context.newPage();
  
  try {
    // Navigate to the initial URL
    
    
    // Start Web Vitals observation BEFORE navigation
    await startVitalsObservation(page, config?.webVitals);
    
    // Set up CDP network monitoring before navigation
    const cdpSession = await setupCDPNetworkMonitoring(page);
    
    // Navigate to the initial URL
    await page.goto(scenario.url, { waitUntil: 'networkidle' });
    
    // Load web-vitals package if needed (after navigation, before steps)
    if (config?.webVitals?.usePerformanceObserver === false) {
      await loadWebVitalsPackage(page);
    }
    let profileResponse = null;
    if (config?.enableProfile) {
      profileResponse = await profileJs(page, () => runProfile(page, scenario));
    } else {
      await runProfile(page, scenario);
    }

    
    // Wait a bit for any final interactions to settle
    await page.waitForTimeout(2000);
    
    const webVitals = await collectVitals(page);
    const performance = await measurePerformanceMetrics(page);
    const network = await measureNetworkRequestsEnhanced(page, cdpSession);

    // Process profile data if available
    let profileSummary = null;
    if (profileResponse?.profile && config?.enableProfile) {
      // Convert Profile to EnhancedProfile format
      const enhancedProfile = {
        nodes: profileResponse.profile.nodes || [],
        samples: profileResponse.profile.samples || [],
        startTime: profileResponse.profile.startTime || 0,
        endTime: profileResponse.profile.endTime || 0
      };
      profileSummary = generateProfileSummary(enhancedProfile, performance.loadTime);
    }

    // Generate report
    const report: WebVitalsReport = {
      scenario: scenario.name,
      url: scenario.url,
      timestamp: new Date().toISOString(),
      metrics: webVitals,
      performance,
      network,
      profile: profileSummary ? {
        summary: profileSummary,
        rawData: profileResponse?.profile || null
      } : null,
    };
    
    // Clean up CDP session
    if (cdpSession) {
      try {
        await cdpSession.detach();
      } catch (error) {
        console.warn('⚠️  Error detaching CDP session:', error);
      }
    }
    
    return report;
    
  } finally {
    await page.close();
  }
}
