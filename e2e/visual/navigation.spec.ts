import { expect, test } from '@playwright/test';
import { NAVIGATION_MODULES } from '../../src/utils/permissions';
import { getPathForTab, NAVIGATION_ROUTES, type NavigationTab } from '../../src/routes/navigation';

const localOrigin = 'http://127.0.0.1:4178';

const navigationLabels: Record<string, string> = {
  dashboard: 'Dashboard Eksekutif',
  projects: 'Manajemen Proyek',
  rab: 'RAB, BOQ & AHSP',
  field_reports: 'Laporan Lapangan & Kurva S',
  procurement: 'Procurement / PO',
  warehouse: 'Gudang & Stok Material',
  subcontractors: 'Subkontraktor & Mandor',
  finance: 'Keuangan & Kasbon Proyek',
  hr_manpower: 'SDM & Absensi Pekerja',
  equipment: 'Peralatan & Aset Alat Berat',
  safety_qc: 'K3, Mutu & Punch List',
  documents: 'Dokumen & Gambar Kerja',
  approvals: 'Pusat Approval Berjenjang',
  reports: 'Laporan & Analitik',
  settings: 'Pengaturan & Tim',
};

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
] as const;

const themes = ['light', 'dark'] as const;

for (const tab of Object.keys(NAVIGATION_MODULES)) {
  test(`${tab} tab visual baseline`, async ({ browser }) => {
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
        await page.goto('/');
        await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

        if (tab !== 'dashboard') {
          const tabButton = page
            .getByRole('navigation', { name: 'Navigasi aplikasi' })
            .getByRole('button', { name: navigationLabels[tab] });
          await tabButton.click();
          await expect(tabButton).toHaveAttribute('aria-current', 'page');
          await page.waitForLoadState('networkidle');
          await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
        }

        const expectedPath = getPathForTab(tab as NavigationTab);
        await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll('/', '\\/')}$`));

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

        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await expect(page).toHaveScreenshot(`${tab}-${viewport.name}-${theme}.png`, {
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
}

test('navigation routes load directly and remain available after refresh', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  for (const { path } of NAVIGATION_ROUTES) {
    await page.goto(path);
    await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(`${localOrigin}${path}`);

    await page.reload();
    await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(`${localOrigin}${path}`);
  }
});

test('legacy home-screen shortcut URL redirects while retaining unrelated query parameters', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/?tab=field_reports&source=shortcut');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(`${localOrigin}/field-reports?source=shortcut`);
});

test('project details have a refreshable project-specific URL', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await page.goto('/projects');
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /^Buka detail/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`${localOrigin.replaceAll('.', '\\.')}\\/projects\\/[^/]+$`));
  await expect(page.getByRole('tablist')).toBeVisible();

  const detailUrl = page.url();
  await page.reload();
  await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(detailUrl);
  await expect(page.getByRole('tablist')).toBeVisible();
});
