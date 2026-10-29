import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';

async function mountHarness(page: import('@playwright/test').Page) {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.goto('/');
  await page.evaluate(async (harnessPath) => {
    const { mountToastAnimationHarness } = await import(harnessPath);
    mountToastAnimationHarness();
  }, '/e2e/fixtures/ToastAnimationHarness.ts');
}

test('toast transitions in and out without removing the content early', async ({ page }) => {
  await mountHarness(page);
  await page.getByRole('button', { name: 'Show toast' }).click();

  const toast = page.getByRole('status').filter({ hasText: 'Toast motion test' });
  await expect(toast).toHaveCSS('transition-duration', '0.4s, 0.4s');
  await expect.poll(() => toast.evaluate((element) => (
    element.getAnimations().filter((animation) => animation.playState === 'running').length
  ))).toBeGreaterThan(0);

  await toast.getByRole('button', { name: 'Tutup' }).click();
  await expect(toast).toHaveAttribute('data-state', 'closed');
  await expect(toast).toHaveCount(0, { timeout: 1_000 });
});

test('toast transitions respect reduced-motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mountHarness(page);
  await page.getByRole('button', { name: 'Show toast' }).click();

  const toast = page.getByRole('status').filter({ hasText: 'Toast motion test' });
  await expect(toast).toBeVisible();
  await expect.poll(() => toast.evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).transitionDuration)
  ))).toBeLessThanOrEqual(0.001);
  await toast.getByRole('button', { name: 'Tutup' }).click();
  await expect(toast).toHaveCount(0, { timeout: 200 });
});

test('toast stays inside mobile and desktop viewports in both themes', async ({ page }) => {
  await mountHarness(page);

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
      }, theme === 'dark');
      await page.getByRole('button', { name: 'Show toast' }).click();

      const toast = page.getByRole('status').filter({ hasText: 'Toast motion test' });
      await expect(toast).toBeVisible();
      const bounds = await toast.boundingBox();
      if (!bounds) throw new Error('Toast tidak memiliki ukuran tampilan.');
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);

      await toast.getByRole('button', { name: 'Tutup' }).click();
      await expect(toast).toHaveCount(0, { timeout: 1_000 });
    }
  }
});
