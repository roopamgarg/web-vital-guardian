// helper/profile-js.ts
import type { Page } from '@playwright/test';

export async function profileJs<T>(page: Page, run: () => Promise<T>) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');           // sampling profiler
  let error;
  try { await run(); } catch (e) { error = e; }
  const { profile } = await cdp.send('Profiler.stop');
  await cdp.send('Profiler.disable');
  return { profile, error };
}
