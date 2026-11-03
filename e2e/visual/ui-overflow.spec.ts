import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { NAVIGATION_ROUTES } from '../../src/routes/navigation';

const localOrigin = 'http://127.0.0.1:4178';
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
] as const;
const themes = ['light', 'dark'] as const;
const screenshotRoutes = new Set(['/dashboard', '/projects', '/finance', '/settings']);
const screenshotSizes = new Set([360, 1440]);

async function keepLocalTrafficOnly(page: Page) {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
}

async function expectWithinViewport(locator: Locator, width: number, height: number, context = 'Overlay') {
  await expect(locator, `${context} should be visible`).toBeVisible();
  await expect.poll(async () => {
    const bounds = await locator.boundingBox();
    return Boolean(
      bounds
      && bounds.x >= -1
      && bounds.y >= -1
      && bounds.x + bounds.width <= width + 1
      && bounds.y + bounds.height <= height + 1,
    );
  }, { message: `${context} should remain within ${width}x${height}` }).toBe(true);
}

async function auditRouteAtViewports(
  page: Page,
  path: string,
  theme: string,
  screenshotDirectory: string | null,
) {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      });
    });
    const layout = await page.evaluate(() => {
      const mainElement = document.querySelector<HTMLElement>('main[aria-busy="false"]');
      const mainBounds = mainElement?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        bodyHeight: document.body.scrollHeight,
        bodyClientHeight: document.body.clientHeight,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        main: mainBounds && {
          left: mainBounds.left,
          right: mainBounds.right,
        },
      };
    });

    expect(layout.documentWidth, `${path} document width at ${viewport.width}px (${theme})`)
      .toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.bodyWidth, `${path} body width at ${viewport.width}px (${theme})`)
      .toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.bodyHeight, `${path} body should not add a competing vertical scroll (${theme})`)
      .toBeLessThanOrEqual(layout.bodyClientHeight + 1);
    expect(layout.bodyOverflowY, `${path} body should not be a competing scroll owner (${theme})`)
      .toBe('hidden');
    expect(layout.main?.left, `${path} main starts outside the viewport (${theme})`)
      .toBeGreaterThanOrEqual(-1);
    expect(layout.main?.right, `${path} main ends outside the viewport (${theme})`)
      .toBeLessThanOrEqual(layout.viewportWidth + 1);

    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 600);
    const scrollOwners = await page.evaluate(() => ({
      document: document.documentElement.scrollTop,
      body: document.body.scrollTop,
      window: window.scrollY,
    }));
    expect(scrollOwners.document, `${path} root scrolled at ${viewport.width}px (${theme})`).toBe(0);
    expect(scrollOwners.body, `${path} body scrolled at ${viewport.width}px (${theme})`).toBe(0);
    expect(scrollOwners.window, `${path} viewport scrolled at ${viewport.width}px (${theme})`).toBe(0);
    await page.locator('main[aria-busy="false"]').evaluate((element) => {
      if (element instanceof HTMLElement) element.scrollTop = 0;
    });

    if (
      screenshotDirectory
      && screenshotRoutes.has(path)
      && screenshotSizes.has(viewport.width)
    ) {
      await page.screenshot({
        path: join(screenshotDirectory, `${path.slice(1)}-${viewport.width}-${theme}.png`),
        animations: 'disabled',
      });
    }
  }
}

test('all application routes avoid document overflow at the supported viewport matrix', async ({ browser }) => {
  test.setTimeout(600_000);
  const stage = process.env.UI_OVERFLOW_ARTIFACT_STAGE;
  const screenshotDirectory = stage
    ? resolve(process.cwd(), 'artifacts', 'ui-overflow', stage)
    : null;
  if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });

  for (const theme of themes) {
    const context = await browser.newContext({
      baseURL: localOrigin,
      locale: 'id-ID',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
      timezoneId: 'Asia/Jakarta',
      viewport: { width: 1440, height: 900 },
    });
    try {
      const page = await context.newPage();
      await keepLocalTrafficOnly(page);
      const runtimeErrors: string[] = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') runtimeErrors.push(message.text());
      });
      await page.addInitScript((initialTheme) => {
        localStorage.setItem('indotek_theme', initialTheme);
      }, theme);

      for (const { path } of NAVIGATION_ROUTES) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        const main = page.locator('main[aria-busy="false"]');
        await expect(main, `${path} should finish loading`).toBeVisible({ timeout: 30_000 });
        await auditRouteAtViewports(page, path, theme, screenshotDirectory);
      }

      await page.goto('/projects', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: /^Buka detail/ }).first().click();
      await expect(page.getByRole('tablist')).toBeVisible();
      const projectDetailPath = new URL(page.url()).pathname;
      await auditRouteAtViewports(page, projectDetailPath, theme, screenshotDirectory);

      expect(runtimeErrors, `Unexpected browser errors in ${theme} mode`).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test('project creation dialog and shared overlays remain reachable within the viewport', async ({ browser }) => {
  test.setTimeout(180_000);
  const stage = process.env.UI_OVERFLOW_ARTIFACT_STAGE;
  const screenshotDirectory = stage
    ? resolve(process.cwd(), 'artifacts', 'ui-overflow', stage)
    : null;
  if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });

  const context = await browser.newContext({
    baseURL: localOrigin,
    locale: 'id-ID',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 900 },
  });
  try {
    const page = await context.newPage();
    await keepLocalTrafficOnly(page);
    await page.goto('/dashboard');
    await expect(page.locator('main[aria-busy="false"]')).toBeVisible({ timeout: 30_000 });

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: 'Tambah proyek' }).click();
      const projectDialog = page.getByRole('dialog').last();
      await expect(projectDialog).toBeVisible();
      await expectWithinViewport(projectDialog, viewport.width, viewport.height);
      if (screenshotDirectory && [360, 1440].includes(viewport.width)) {
        await page.screenshot({
          path: join(screenshotDirectory, `project-dialog-${viewport.width}-light.png`),
          animations: 'disabled',
        });
      }
      await page.keyboard.press('Escape');
      await expect(projectDialog).toBeHidden();
    }

    await page.goto('/');
    await page.evaluate(async (harnessPath) => {
      const { mountOverlayAnimationHarness } = await import(harnessPath);
      mountOverlayAnimationHarness();
    }, '/e2e/fixtures/OverlayAnimationHarness.ts');

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      await page.getByRole('button', { name: 'Open alert dialog' }).click();
      const alertDialog = page.getByRole('alertdialog', { name: 'Alert motion test' });
      await expectWithinViewport(alertDialog, viewport.width, viewport.height);
      await page.getByRole('button', { name: 'Confirm action' }).click();

      for (const side of ['left', 'right', 'bottom'] as const) {
        await page.getByRole('button', { name: `Open ${side} sheet` }).click();
        const sheet = page.getByRole('dialog', { name: 'Sheet motion test' });
        await expectWithinViewport(sheet, viewport.width, viewport.height);
        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden();
      }

      const tooltipTrigger = page.getByRole('button', { name: 'Hover tooltip' });
      await tooltipTrigger.hover();
      const tooltip = page.getByRole('tooltip', { name: 'Tooltip motion test' });
      const tooltipContext = `Tooltip (side=${await tooltip.getAttribute('data-side')}, trigger=${JSON.stringify(await tooltipTrigger.boundingBox())})`;
      await expectWithinViewport(tooltip, viewport.width, viewport.height, tooltipContext);

      await page.getByRole('combobox').last().click();
      await expectWithinViewport(page.getByRole('listbox'), viewport.width, viewport.height);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Open dropdown' }).click();
      await expectWithinViewport(page.getByRole('menu'), viewport.width, viewport.height);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Open popover' }).click();
      const popover = page.getByText('Popover motion test');
      const popoverTrigger = page.getByRole('button', { name: 'Open popover' });
      const popoverContext = `Popover (trigger=${JSON.stringify(await popoverTrigger.boundingBox())})`;
      await expectWithinViewport(popover, viewport.width, viewport.height, popoverContext);
      await page.keyboard.press('Escape');
    }
  } finally {
    await context.close();
  }
});
