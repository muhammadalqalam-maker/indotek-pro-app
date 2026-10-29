import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';
const viewports = [
  { width: 375, height: 812, name: '375' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
] as const;
const themes = ['light', 'dark'] as const;
const testUser = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'owner@example.test',
  email_confirmed_at: '2026-10-23T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-10-23T00:00:00.000Z',
  updated_at: '2026-10-23T00:00:00.000Z',
};

test('organization onboarding has responsive light and dark baselines', async ({ browser }) => {
  test.setTimeout(120_000);
  for (const theme of themes) {
    const context = await browser.newContext({
      baseURL: localOrigin,
      colorScheme: 'light',
      locale: 'id-ID',
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 900 },
    });
    try {
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === localOrigin) {
          await route.continue();
        } else if (url.pathname === '/auth/v1/user') {
          await route.fulfill({ contentType: 'application/json', body: JSON.stringify(testUser) });
        } else if (url.pathname === '/functions/v1/organization-members') {
          await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ invitations: [] }) });
        } else if (url.pathname.startsWith('/rest/v1/')) {
          await route.fulfill({
            contentType: 'application/json',
            headers: { 'content-range': '*/0' },
            body: '[]',
          });
        } else {
          await route.abort();
        }
      });
      await context.addInitScript((initialTheme) => {
        localStorage.setItem('sb-e2e-test-auth-token', JSON.stringify({
          access_token: 'e2e-access-token',
          refresh_token: 'e2e-refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: '00000000-0000-4000-8000-000000000001',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'owner@example.test',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {},
            identities: [],
            created_at: '2026-10-23T00:00:00.000Z',
            updated_at: '2026-10-23T00:00:00.000Z',
          },
        }));
        localStorage.setItem('indotek_theme', initialTheme);
      }, theme);

      const page = await context.newPage();
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Siapkan organisasi Anda' })).toBeVisible({ timeout: 30_000 });
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
        await expect(page).toHaveScreenshot(`organization-onboarding-${viewport.name}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.001,
          timeout: 15_000,
        });
      }
      if (theme === 'light') {
        await page.getByRole('button', { name: 'Buat organisasi' }).click();
        await expect(page.getByText('Nama perusahaan minimal 2 karakter.')).toBeVisible();
        await expect(page.getByText('Kode perusahaan minimal 2 karakter.')).toBeVisible();
        await expect(page.getByText('Alamat kantor minimal 5 karakter.')).toBeVisible();
      }
    } finally {
      await context.close();
    }
  }
});
