import { expect, test } from '@playwright/test';

test('uncached route navigation while offline uses the precached offline page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await page.context().setOffline(true);
  await page.goto('/field-reports');

  await expect(page).toHaveURL(/\/field-reports$/);
  await expect(page.getByRole('heading', { name: 'Anda sedang offline' })).toBeVisible();
});
