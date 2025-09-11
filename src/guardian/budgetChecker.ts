import type { WebVitalsReport, GuardianConfig } from '../types';

/**
 * Checks if Web Vitals metrics violate performance budgets
 * @param report - Web Vitals report to check
 * @param budgets - Performance budgets to validate against
 * @returns Array of budget violation messages
 */
export function checkBudgetViolations(report: WebVitalsReport, budgets: GuardianConfig['budgets']): string[] {
  const violations: string[] = [];
  
  if (!budgets) return violations;
  
  const { metrics } = report;
  
  if (budgets.FCP && metrics.FCP && metrics.FCP > budgets.FCP) {
    violations.push(`FCP: ${metrics.FCP}ms > ${budgets.FCP}ms`);
  }
  
  if (budgets.LCP && metrics.LCP && metrics.LCP > budgets.LCP) {
    violations.push(`LCP: ${metrics.LCP}ms > ${budgets.LCP}ms`);
  }
  
  if (budgets.FID && metrics.FID && metrics.FID > budgets.FID) {
    violations.push(`FID: ${metrics.FID}ms > ${budgets.FID}ms`);
  }
  
  if (budgets.CLS && metrics.CLS && metrics.CLS > budgets.CLS) {
    violations.push(`CLS: ${metrics.CLS} > ${budgets.CLS}`);
  }
  
  if (budgets.INP && metrics.INP && metrics.INP > budgets.INP) {
    violations.push(`INP: ${metrics.INP}ms > ${budgets.INP}ms`);
  }
  
  if (budgets.TTFB && metrics.TTFB && metrics.TTFB > budgets.TTFB) {
    violations.push(`TTFB: ${metrics.TTFB}ms > ${budgets.TTFB}ms`);
  }
  
  return violations;
}
