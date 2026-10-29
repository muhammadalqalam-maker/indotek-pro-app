import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [360, 375, 768, 1280] as const;
const themes = ['light', 'dark'] as const;

test('dashboard charts stay within the viewport across mobile, tablet, and desktop', async ({ browser }) => {
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
      await page.goto('/dashboard');
      await expect(page.locator('main[aria-busy="false"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Progres proyek' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Nilai kontrak dan realisasi' })).toBeVisible();

      for (const width of viewports) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => (
          Array.from(document.querySelectorAll('.recharts-wrapper')).every((chart) => {
            const chartBounds = chart.getBoundingClientRect();
            const cardBounds = chart.closest('[data-slot="card"]')?.getBoundingClientRect();
            return cardBounds
              && chartBounds.left >= cardBounds.left
              && chartBounds.right <= cardBounds.right;
          })
        ))).toBe(true);
        const layout = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          charts: Array.from(document.querySelectorAll('.recharts-wrapper')).map((chart) => {
            const bounds = chart.getBoundingClientRect();
            const card = chart.closest('[data-slot="card"]')?.getBoundingClientRect();
            return {
              left: bounds.left,
              right: bounds.right,
              card: card && { left: card.left, right: card.right, width: card.width },
            };
          }),
        }));

        expect(layout.document, `Dashboard document overflows at ${width}px in ${theme} mode`).toBeLessThanOrEqual(width);
        expect(layout.charts, 'Both dashboard charts should be rendered').toHaveLength(2);
        for (const chart of layout.charts) {
          expect(chart.left, `Chart extends beyond the left edge at ${width}px in ${theme} mode`).toBeGreaterThanOrEqual(0);
          expect(chart.right, `Chart extends beyond the right edge at ${width}px in ${theme} mode`).toBeLessThanOrEqual(width);
          expect(chart.left, `Chart extends beyond its card at ${width}px in ${theme} mode`).toBeGreaterThanOrEqual(chart.card?.left ?? width);
          expect(chart.right, `Chart extends beyond its card at ${width}px in ${theme} mode`).toBeLessThanOrEqual(chart.card?.right ?? 0);
        }
      }
    } finally {
      await context.close();
    }
  }
});
