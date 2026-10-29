import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
] as const;
const themes = ['light', 'dark'] as const;
const routes = [
  { label: 'Procurement / PO', heading: 'Pengadaan & Procurement' },
  { label: 'Gudang & Stok Material', heading: 'Material & Gudang Proyek' },
  { label: 'Subkontraktor & Mandor', heading: 'Subkontraktor & SPK' },
  { label: 'Peralatan & Aset Alat Berat', heading: 'Peralatan & Aset Konstruksi' },
] as const;
const procurementTabs = [
  'Purchase Orders (PO)',
  'Purchase Requests (PR)',
  'Permintaan Material',
  'Penerimaan Barang (GRN)',
  'Master Vendor & Supplier',
] as const;
const equipmentTabs = ['Daftar alat', 'Pemakaian', 'Pemeliharaan'] as const;

test('procurement and logistics workspaces stay within mobile and desktop viewports', async ({ browser }) => {
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

      for (const route of routes) {
        await page.setViewportSize({ width: 1280, height: 900 });
        const link = navigation.getByRole('link', { name: route.label });
        await link.click();
        await expect(page.locator('main[aria-busy="false"]').getByRole('heading', { name: route.heading })).toBeVisible();

        const tabs = route.label === 'Procurement / PO'
          ? procurementTabs
          : route.label === 'Peralatan & Aset Alat Berat'
            ? equipmentTabs
            : [];
        if (tabs.length > 0) {
          for (const tab of tabs) {
            await page.getByRole('tab', { name: tab }).click();
            await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
            for (const viewport of viewports) {
              await page.setViewportSize(viewport);
              const layout = await page.evaluate(() => ({
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth,
              }));
              expect(layout.documentWidth, `${tab} overflows at ${viewport.width}px in ${theme} mode`)
                .toBeLessThanOrEqual(layout.viewportWidth);
            }
            await page.setViewportSize({ width: 1280, height: 900 });
          }
        } else {
          for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            const layout = await page.evaluate(() => ({
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: window.innerWidth,
            }));
            expect(layout.documentWidth, `${route.label} overflows at ${viewport.width}px in ${theme} mode`)
              .toBeLessThanOrEqual(layout.viewportWidth);
          }
        }
      }
    } finally {
      await context.close();
    }
  }
});
