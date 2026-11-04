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

      const progressTable = page.getByRole('table', {
        name: 'Data progres rencana dan realisasi per proyek',
      });
      const budgetTable = page.getByRole('table', {
        name: 'Data nilai kontrak dan realisasi per proyek',
      });
      await expect(progressTable.getByRole('columnheader', { name: 'Proyek' })).toHaveCount(1);
      await expect(progressTable.getByRole('columnheader', { name: 'Rencana' })).toHaveCount(1);
      await expect(progressTable.getByRole('columnheader', { name: 'Realisasi' })).toHaveCount(1);
      await expect(budgetTable.getByRole('columnheader', { name: 'Nilai kontrak' })).toHaveCount(1);
      await expect(budgetTable.getByRole('columnheader', { name: 'Realisasi biaya' })).toHaveCount(1);
      await expect.poll(() => progressTable.locator('tbody tr').count()).toBeGreaterThan(0);
      await expect.poll(() => budgetTable.locator('tbody tr').count()).toBeGreaterThan(0);
      expect(await page.locator('.recharts-wrapper').evaluateAll((charts) => (
        charts.every((chart) => chart.closest('[aria-hidden="true"]') !== null)
      ))).toBe(true);

      if (theme === 'light') {
        const successContrast = await page.evaluate(() => {
          const parseColor = (value: string) => {
            const match = /^#([\da-f]{6})$/i.exec(value.trim());
            if (!match) return null;
            return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
          };
          const luminance = (color: number[]) => {
            const channels = color.map((channel) => {
              const normalized = channel / 255;
              return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
          };
          const styles = getComputedStyle(document.documentElement);
          const foreground = parseColor(styles.getPropertyValue('--success'));
          const background = parseColor(styles.getPropertyValue('--success-bg'));
          if (!foreground || !background) return 0;
          const foregroundLuminance = luminance(foreground);
          const backgroundLuminance = luminance(background);
          return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
            / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
        });
        expect(successContrast).toBeGreaterThanOrEqual(4.5);
      }

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
