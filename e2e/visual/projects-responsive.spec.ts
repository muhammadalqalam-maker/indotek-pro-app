import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 360, height: 800, name: '360' },
  { width: 375, height: 812, name: '375' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
] as const;
const themes = ['light', 'dark'] as const;

test('project details remain usable and responsive across viewport sizes and themes', async ({ browser }) => {
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
      await page.goto('/projects');
      await expect(page.locator('main[aria-busy="false"]')).toBeVisible();
      await page.getByRole('textbox', { name: 'Cari kode, nama proyek, klien, atau lokasi' }).fill('Menara Mandiri');
      await expect(page.getByText('1 proyek', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: /Buka detail/ }).first().click();
      await expect(page.getByRole('tab', { name: 'Ringkasan' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Informasi proyek' })).toBeVisible();

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const layout = await page.evaluate(() => {
          const tabs = document.querySelector('[role="tablist"]');
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            tabsClientWidth: tabs?.clientWidth ?? 0,
            tabsScrollWidth: tabs?.scrollWidth ?? 0,
          };
        });
        expect(layout.documentWidth, `Project detail overflows at ${viewport.width}px in ${theme} mode`).toBeLessThanOrEqual(viewport.width);
        expect(layout.tabsScrollWidth, 'Project detail tabs should remain horizontally navigable').toBeGreaterThanOrEqual(layout.tabsClientWidth);
        if (viewport.width < 1024) {
          expect(layout.tabsScrollWidth, 'Project detail tabs should scroll on mobile and tablet').toBeGreaterThan(layout.tabsClientWidth);
        }

        await expect(page).toHaveScreenshot(`projects-detail-${viewport.name}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.001,
          timeout: 15_000,
        });
      }

      await page.getByRole('tab', { name: 'Laporan' }).click();
      await expect(page.getByRole('heading', { name: 'Laporan' })).toBeVisible();
      await page.getByRole('tab', { name: 'Jadwal' }).click();
      await expect(page.getByText('Jadwal proyek tersedia setelah koneksi ke Supabase aktif.')).toBeVisible();
    } finally {
      await context.close();
    }
  }
});
