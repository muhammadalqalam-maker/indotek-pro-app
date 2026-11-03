import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';
const viewports = [
  { width: 1920, height: 1080, name: '1920' },
  { width: 1440, height: 900, name: '1440' },
  { width: 1366, height: 768, name: '1366' },
  { width: 1024, height: 768, name: '1024' },
  { width: 768, height: 1024, name: '768' },
  { width: 430, height: 932, name: '430' },
  { width: 390, height: 844, name: '390' },
  { width: 360, height: 800, name: '360' },
  { width: 375, height: 812, name: '375' },
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

      const artifactStage = process.env.UI_OVERFLOW_ARTIFACT_STAGE;
      const screenshotDirectory = artifactStage
        ? resolve(process.cwd(), 'artifacts', 'ui-overflow', artifactStage)
        : null;
      const afterScreenshotDirectory = resolve(process.cwd(), 'artifacts', 'ui-overflow', 'after');
      if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });
      if (screenshotDirectory && artifactStage === 'before' && theme === 'light') {
        const previousLayout = await page.addStyleTag({
          content: `
            main {
              display: grid !important;
              height: auto !important;
              min-height: 100vh !important;
              overflow: visible !important;
              place-items: center !important;
            }
            main > div {
              margin-block: 0 !important;
            }
          `,
        });
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.screenshot({
          path: join(screenshotDirectory, 'onboarding-before-1366-light.png'),
          animations: 'disabled',
        });
        await previousLayout.evaluate((element) => element.parentNode?.removeChild(element));
      }

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const layout = await page.evaluate(() => {
          const main = document.querySelector<HTMLElement>('main');
          const form = document.querySelector('form')?.getBoundingClientRect();
          return {
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            viewportWidth: window.innerWidth,
            form: form && { left: form.left, right: form.right, top: form.top, bottom: form.bottom },
            viewportHeight: window.innerHeight,
            main: main && {
              bottom: main.getBoundingClientRect().bottom,
              clientHeight: main.clientHeight,
              overflowY: getComputedStyle(main).overflowY,
              scrollHeight: main.scrollHeight,
            },
          };
        });
        expect(layout.documentWidth, `Onboarding page overflows at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
        expect(layout.bodyWidth, `Onboarding body overflows at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
        expect(layout.form?.left).toBeGreaterThanOrEqual(-1);
        expect(layout.form?.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(layout.form?.top).toBeGreaterThanOrEqual(-1);
        if ((layout.form?.bottom ?? 0) > layout.viewportHeight) {
          expect(layout.main?.scrollHeight).toBeGreaterThan(layout.main?.clientHeight ?? 0);
          expect(layout.main?.overflowY).toBe('auto');
          await page.locator('main').evaluate((element) => {
            if (element instanceof HTMLElement) element.scrollTop = element.scrollHeight;
          });
          const formBottomAfterScroll = await page.locator('form').evaluate((form) => form.getBoundingClientRect().bottom);
          expect(formBottomAfterScroll).toBeLessThanOrEqual(layout.viewportHeight + 1);
          if (viewport.width === 1366 && theme === 'light') {
            await mkdir(afterScreenshotDirectory, { recursive: true });
            await page.screenshot({
              path: join(afterScreenshotDirectory, 'onboarding-1366-light-bottom.png'),
              animations: 'disabled',
            });
          }
          await page.locator('main').evaluate((element) => {
            if (element instanceof HTMLElement) element.scrollTop = 0;
          });
        }
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page).toHaveScreenshot(`organization-onboarding-${viewport.name}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.001,
          timeout: 15_000,
        });
        if (viewport.width === 1366 && theme === 'light') {
          await mkdir(afterScreenshotDirectory, { recursive: true });
          await page.screenshot({
            path: join(afterScreenshotDirectory, 'onboarding-1366-light.png'),
            animations: 'disabled',
          });
        }
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
