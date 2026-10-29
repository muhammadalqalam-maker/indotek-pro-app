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
  {
    label: 'Laporan Lapangan & Kurva S',
    tabs: ['Laporan Harian Lapangan', 'Rekap PDF', 'Kurva S Progres Fisik'],
  },
  {
    label: 'SDM & Absensi Pekerja',
    tabs: ['Absensi harian', 'Daftar pekerja', 'Rekap upah'],
  },
  {
    label: 'K3, Mutu & Punch List',
    tabs: ['Kegiatan K3', 'Mutu (QC)'],
    nestedTabs: [
      { parent: 'Kegiatan K3', tabs: ['Inspeksi', 'Insiden & Near-Miss', 'Toolbox Meeting'] },
      { parent: 'Mutu (QC)', tabs: ['Checklist QC', 'Punch List'] },
    ],
  },
] as const;

test('field, workforce, safety, and quality workspaces stay responsive in both themes', async ({ browser }) => {
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
        await navigation.getByRole('link', { name: route.label }).click();
        await expect(page.locator('main[aria-busy="false"]')).toBeVisible();

        const availableTabs = page.getByRole('tab');
        if (await availableTabs.count()) {
          for (const tab of route.tabs) {
            const tabTrigger = page.getByRole('tab', { name: tab });
            if (await tabTrigger.count()) {
              await tabTrigger.click();
              await expect(tabTrigger).toHaveAttribute('aria-selected', 'true');
            }

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
          if ('nestedTabs' in route) {
            for (const group of route.nestedTabs) {
              const parentTab = page.getByRole('tab', { name: group.parent });
              if (!(await parentTab.count())) continue;
              await parentTab.click();
              for (const tab of group.tabs) {
                const nestedTab = page.getByRole('tab', { name: tab });
                if (!(await nestedTab.count())) continue;
                await nestedTab.click();
                await expect(nestedTab).toHaveAttribute('aria-selected', 'true');
                for (const viewport of viewports) {
                  await page.setViewportSize(viewport);
                  const layout = await page.evaluate(() => ({
                    documentWidth: document.documentElement.scrollWidth,
                    viewportWidth: window.innerWidth,
                  }));
                  expect(layout.documentWidth, `${tab} overflows at ${viewport.width}px in ${theme} mode`)
                    .toBeLessThanOrEqual(layout.viewportWidth);
                }
              }
            }
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

      await page.setViewportSize({ width: 1280, height: 900 });
      await navigation.getByRole('link', { name: routes[0].label }).click();
      await expect(page.locator('main[aria-busy="false"]')).toBeVisible();
      await expect(page.locator('main[aria-busy="false"]').getByRole('heading', { name: 'Laporan Harian' })).toBeVisible();
      await context.setOffline(true);
      await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
      await expect(page.getByText('Offline', { exact: true })).toBeVisible();
      await expect(page.locator('main[aria-busy="false"]')).toBeVisible();
    } finally {
      await context.close();
    }
  }
});
