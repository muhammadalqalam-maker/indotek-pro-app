import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';

test('captures runtime errors without sending user or request data', async ({ page }) => {
  const sentryPayloads: string[] = [];

  page.on('request', (request) => {
    if (new URL(request.url()).origin !== localOrigin) {
      sentryPayloads.push(request.postData() ?? '');
    }
  });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible();
  await page.evaluate(() => {
    window.setTimeout(() => {
      throw new Error('user@example.test token=secret-token');
    });
  });

  await expect.poll(() => sentryPayloads.length).toBeGreaterThan(0);
  const payload = sentryPayloads.join('\n');
  expect(payload).not.toContain('user@example.test');
  expect(payload).not.toContain('secret-token');
  expect(payload).not.toContain('access_token');
});
