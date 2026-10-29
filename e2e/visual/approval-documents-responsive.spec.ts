import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 360, height: 800 },
  { width: 1280, height: 900 },
] as const;
const themes = ['light', 'dark'] as const;

test('approval and document workspaces remain readable without horizontal page overflow', async ({ browser }) => {
  for (const theme of themes) {
    const context = await browser.newContext({
      baseURL: localOrigin,
      colorScheme: 'light',
      locale: 'id-ID',
      reducedMotion: 'reduce',
      timezoneId: 'Asia/Jakarta',
      viewport: { width: 1280, height: 900 },
    });

    try {
      await context.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin === localOrigin) {
          await route.continue();
          return;
        }
        await route.abort();
      });

      const page = await context.newPage();
      await page.addInitScript((initialTheme) => {
        localStorage.setItem('indotek_theme', initialTheme);
      }, theme);
      await page.goto('/');
      await expect(page.locator('main[aria-busy="false"]')).toBeVisible();

      const navigation = page.getByRole('navigation', { name: 'Navigasi aplikasi' });
      for (const [label, heading] of [
        ['Pusat Approval Berjenjang', 'Pusat Persetujuan'],
        ['Dokumen & Gambar Kerja', 'Dokumen & Gambar Kerja'],
      ]) {
        await navigation.getByRole('link', { name: label }).click();
        await expect(page.locator('main[aria-busy="false"]').getByRole('heading', { name: heading })).toBeVisible();

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          const layout = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          }));
          expect(layout.documentWidth, `${label} overflows at ${viewport.width}px in ${theme} mode`)
            .toBeLessThanOrEqual(layout.viewportWidth);
          await expect(page.locator('main[aria-busy="false"]').getByRole('heading', { name: heading })).toBeVisible();
        }

        await page.setViewportSize({ width: 1280, height: 900 });
      }
    } finally {
      await context.close();
    }
  }
});
