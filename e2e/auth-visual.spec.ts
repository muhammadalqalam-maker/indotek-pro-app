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

test('authentication screen has responsive light and dark baselines', async ({ browser }) => {
  test.setTimeout(120_000);
  const artifactStage = process.env.UI_OVERFLOW_ARTIFACT_STAGE;
  const screenshotDirectory = artifactStage
    ? resolve(process.cwd(), 'artifacts', 'ui-overflow', artifactStage)
    : null;
  if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });

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
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible({ timeout: 30_000 });
      await page.evaluate((initialTheme) => {
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      }, theme);
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
        const displayedLogo = page.locator('img[src="/app-logo.png"]:visible');
        await expect(displayedLogo).toHaveCount(1);
        await expect(displayedLogo).toHaveJSProperty('naturalWidth', 512);
        const layout = await page.evaluate(() => {
          const form = document.querySelector('form')?.getBoundingClientRect();
          return {
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            viewportWidth: window.innerWidth,
            form: form && { left: form.left, right: form.right, top: form.top, bottom: form.bottom },
            viewportHeight: window.innerHeight,
          };
        });
        expect(layout.documentWidth, `Authentication page overflows at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
        expect(layout.bodyWidth, `Authentication body overflows at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
        expect(layout.form?.left).toBeGreaterThanOrEqual(-1);
        expect(layout.form?.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(layout.form?.top).toBeGreaterThanOrEqual(-1);
        expect(layout.form?.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
        if (screenshotDirectory && [360, 1440].includes(viewport.width)) {
          await page.screenshot({
            path: join(screenshotDirectory, `authentication-${viewport.width}-${theme}.png`),
            animations: 'disabled',
          });
        }
        await expect(page).toHaveScreenshot(`auth-${viewport.name}-${theme}.png`, {
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
