import { expect, test } from '@playwright/test';

test('deep-link navigation serves the application shell online and while offline', async ({ page }) => {
  await page.goto('/dashboard');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await page.goto('/field-reports');
  await expect(page).toHaveURL(/\/field-reports$/);
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Anda sedang offline' })).toHaveCount(0);

  await page.context().setOffline(true);
  await page.goto('/projects');

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Anda sedang offline' })).toHaveCount(0);
  await expect(page.locator('img[src="/app-logo.png"]:visible').first()).toHaveJSProperty('naturalWidth', 512);
});
