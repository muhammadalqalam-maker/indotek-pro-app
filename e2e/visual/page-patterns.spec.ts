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

test('filter chips share one responsive segmented style and preserve selection', async ({ browser }) => {
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
      await page.goto('/e2e/fixtures/table-patterns.html?view=filters');
      await page.evaluate((initialTheme) => {
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      }, theme);
      await expect(page.getByRole('heading', { name: 'Filter chips' })).toBeVisible();

      const categoryFilters = page.getByRole('group', { name: 'Kategori dokumen' });
      await expect(categoryFilters.getByRole('button', { name: 'Semua kategori' }))
        .toHaveAttribute('aria-pressed', 'true');
      await categoryFilters.getByRole('button', { name: 'Gambar kerja (DED)' }).click();
      await expect(categoryFilters.getByRole('button', { name: 'Gambar kerja (DED)' }))
        .toHaveAttribute('aria-pressed', 'true');
      await expect(categoryFilters.getByRole('button', { name: 'Semua kategori' }))
        .toHaveAttribute('aria-pressed', 'false');

      const approvalFilters = page.getByRole('group', { name: 'Status approval' });
      await approvalFilters.getByRole('button', { name: 'Disetujui' }).click();
      await expect(approvalFilters.getByRole('button', { name: 'Disetujui' }))
        .toHaveAttribute('aria-pressed', 'true');
      const notificationFilters = page.getByRole('group', { name: 'Filter notifikasi' });
      await notificationFilters.getByRole('button', { name: 'Belum dibaca' }).click();
      await expect(notificationFilters.getByRole('button', { name: 'Belum dibaca' }))
        .toHaveAttribute('aria-pressed', 'true');
      const periodFilters = page.getByRole('group', { name: 'Jenis periode' });
      await periodFilters.getByRole('button', { name: 'Bulanan' }).click();
      await expect(periodFilters.getByRole('button', { name: 'Bulanan' }))
        .toHaveAttribute('aria-pressed', 'true');

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const chipStyles = await page.locator('[role="group"][aria-label]').evaluateAll((groups) => groups.map((group) => {
          const button = group.querySelector('button[aria-pressed="true"]');
          return {
            groupRadius: getComputedStyle(group).borderRadius,
            groupBackground: getComputedStyle(group).backgroundColor,
            buttonRadius: button ? getComputedStyle(button).borderRadius : '',
            selectedBackground: button ? getComputedStyle(button).backgroundColor : '',
            selectedShadow: button ? getComputedStyle(button).boxShadow : '',
          };
        }));
        expect(new Set(chipStyles.map((style) => style.groupRadius)).size).toBe(1);
        expect(new Set(chipStyles.map((style) => style.groupBackground)).size).toBe(1);
        expect(new Set(chipStyles.map((style) => style.buttonRadius)).size).toBe(1);
        expect(new Set(chipStyles.map((style) => style.selectedBackground)).size).toBe(1);
        expect(new Set(chipStyles.map((style) => style.selectedShadow)).size).toBe(1);
        if (viewport.width === 375) {
          expect(await categoryFilters.evaluate((group) => group.scrollWidth > group.clientWidth)).toBe(true);
        }
        const layout = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
      }
    } finally {
      await context.close();
    }
  }
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
