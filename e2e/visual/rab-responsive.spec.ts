import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
] as const;
const themes = ['light', 'dark'] as const;

test('RAB workspace tabs remain accessible and responsive', async ({ browser }) => {
  test.setTimeout(120_000);

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
      const navigation = page.getByRole('navigation', { name: 'Navigasi aplikasi' });
      await navigation.getByRole('link', { name: 'RAB, BOQ & AHSP' }).click();

      const tabs = page.getByRole('tablist', { name: 'Bagian RAB' });
      const boqTab = tabs.getByRole('tab', { name: 'Rencana Anggaran Biaya (BOQ)' });
      const ahspTab = tabs.getByRole('tab', { name: 'Analisa Harga Satuan (AHSP)' });
      const priceTab = tabs.getByRole('tab', { name: 'Master harga' });

      await expect(boqTab).toHaveAttribute('aria-selected', 'true');
      await boqTab.focus();
      await page.keyboard.press('ArrowRight');
      await expect(ahspTab).toHaveAttribute('aria-selected', 'true');

      for (const tab of [boqTab, ahspTab, priceTab]) {
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          const layout = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          }));
          expect(layout.documentWidth, `RAB overflows at ${viewport.width}px in ${theme} mode`)
            .toBeLessThanOrEqual(layout.viewportWidth);
        }
      }

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
      await page.evaluate(() => document.fonts.ready);
      for (const [subtab, tab] of [['ahsp', ahspTab], ['prices', priceTab]] as const) {
        await page.setViewportSize({ width: 1280, height: 900 });
        await tab.click();
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        for (const viewport of [
          { name: '375', width: 375, height: 812 },
          { name: '1280', width: 1280, height: 900 },
        ]) {
          await page.setViewportSize(viewport);
          await expect(page).toHaveScreenshot(`rab-${subtab}-${viewport.name}-${theme}.png`, {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.001,
            timeout: 15_000,
          });
        }
      }

      await page.close();
    } finally {
      await context.close();
    }
  }
});
