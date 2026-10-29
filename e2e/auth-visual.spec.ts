import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';
const viewports = [
  { width: 375, height: 812, name: '375' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
] as const;
const themes = ['light', 'dark'] as const;

test('authentication screen has responsive light and dark baselines', async ({ browser }) => {
  test.setTimeout(120_000);
  for (const theme of themes) {
    const context = await browser.newContext({
      baseURL: localOrigin,
      colorScheme: 'light',
      locale: 'id-ID',
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 900 },
    });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible({ timeout: 30_000 });
      await page.evaluate((initialTheme) => {
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      }, theme);
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation: none !important;
            caret-color: transparent !important;
            scroll-behavior: auto !important;
            transition: none !important;
          }
        `,
      });

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await expect(page).toHaveScreenshot(`auth-${viewport.name}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.001,
          timeout: 15_000,
        });
      }
    } finally {
      await context.close();
    }
  }
});
