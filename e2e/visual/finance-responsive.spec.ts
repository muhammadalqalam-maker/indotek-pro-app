import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
] as const;
const themes = ['light', 'dark'] as const;
const financeTabs = [
  'Tagihan klien',
  'Buku kas',
  'Hutang rekanan',
  'Kasbon',
  'Forecast & Laba/Rugi',
] as const;

test('finance workspace remains responsive and its tabs and invoice search work', async ({ browser }) => {
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
      await navigation.getByRole('link', { name: 'Keuangan & Kasbon Proyek' }).click();
      await expect(page.getByRole('heading', { name: 'Keuangan & Arus Kas Proyek' })).toBeVisible();
      for (const tabName of financeTabs) {
        await expect(page.getByRole('tab', { name: new RegExp(tabName, 'i') })).toBeInViewport();
      }
      await page.setViewportSize({ width: 375, height: 812 });

      const invoicePanel = page.getByRole('tabpanel').first();
      const invoiceCards = invoicePanel.locator('article');
      const firstInvoice = invoiceCards.first();
      await expect(firstInvoice).toBeVisible();
      const invoiceNumber = (await firstInvoice.locator('p').first().textContent())?.trim();
      expect(invoiceNumber).toBeTruthy();

      const search = page.getByRole('searchbox', { name: 'Cari transaksi keuangan' });
      await search.fill(invoiceNumber ?? '');
      await expect(invoiceCards).toHaveCount(1);
      await search.fill('tidak-ada-hasil');
      await expect(invoicePanel.getByText('Belum ada invoice untuk filter ini.', { exact: false }).last()).toBeVisible();
      await search.clear();

      for (const tabName of financeTabs) {
        await page.setViewportSize({ width: 1280, height: 900 });
        const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tabpanel')).toBeVisible();

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          const layout = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          }));
          expect(layout.documentWidth, `${tabName} overflows at ${viewport.width}px in ${theme} mode`)
            .toBeLessThanOrEqual(layout.viewportWidth);
        }
      }
    } finally {
      await context.close();
    }
  }
});
