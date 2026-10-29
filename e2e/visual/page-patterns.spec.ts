import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 375, height: 812, name: '375' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
] as const;
const themes = ['light', 'dark'] as const;

test('page and table patterns have responsive light and dark baselines', async ({ browser }) => {
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
      await page.goto('/e2e/fixtures/table-patterns.html?keep=preserved');
      await page.evaluate((initialTheme) => {
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      }, theme);
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? 'dark' : '');
      const pageBackground = await page.locator('#root > div').evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      expect(pageBackground).toBe(theme === 'dark' ? 'rgb(11, 18, 32)' : 'rgb(246, 247, 249)');
      await expect(page.getByRole('heading', { name: 'Daftar pekerjaan' })).toBeVisible();
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
        await expect(page).toHaveScreenshot(`page-patterns-${viewport.name}-${theme}.png`, {
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

test('table filters, selection, and pagination synchronize with URL', async ({ page }) => {
  await page.goto('/e2e/fixtures/table-patterns.html?keep=preserved');

  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page).toHaveURL(/tasks\.page=2/);
  await expect(page).toHaveURL(/keep=preserved/);
  await page.goBack();
  await expect(page).not.toHaveURL(/tasks\.page=/);
  await page.goForward();
  await expect(page).toHaveURL(/tasks\.page=2/);

  const search = page.getByRole('searchbox', { name: 'Cari data...' });
  await search.fill('pekerjaan 02');
  await expect(page).toHaveURL(/tasks\.q=pekerjaan\+02/);
  await expect(page).not.toHaveURL(/tasks\.page=/);
  await expect(page.getByRole('cell', { name: 'Pekerjaan 02' })).toBeVisible();
  await search.fill('');

  await page.locator('summary').filter({ hasText: 'Status' }).click();
  await page.getByRole('checkbox', { name: 'Berjalan' }).click();
  await expect(page).toHaveURL(/tasks\.filter\.status=berjalan/);
  await page.getByRole('checkbox', { name: 'Pilih baris task-1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arsipkan 1' })).toBeVisible();
  await expect(page.getByText('1 dipilih', { exact: true })).toBeVisible();
});

test('loading, offline, and forbidden page states have accessible status', async ({ page }) => {
  await page.goto('/e2e/fixtures/table-patterns.html?view=loading');
  await expect(page.getByRole('status', { name: 'Memuat daftar pekerjaan' })).toHaveAttribute('aria-busy', 'true');

  await page.goto('/e2e/fixtures/table-patterns.html?view=offline');
  await expect(page.getByRole('heading', { name: 'Data belum tersedia saat offline' })).toBeVisible();

  await page.goto('/e2e/fixtures/table-patterns.html?view=forbidden');
  await expect(page.getByRole('alert')).toContainText('Role Anda tidak memiliki izin');
  await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/dashboard');
});
