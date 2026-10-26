import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';

test('dialog overlay and content animate on open and close', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.goto('/');
  await page.evaluate(async (harnessPath) => {
    const { mountDialogAnimationHarness } = await import(harnessPath);
    mountDialogAnimationHarness();
  }, '/e2e/fixtures/DialogAnimationHarness.ts');

  await page.getByRole('button', { name: 'Open dialog' }).click();

  const dialog = page.getByRole('dialog', { name: 'Dialog motion test' });
  const overlay = page.locator('div.fixed.inset-0[data-state="open"]');
  await expect(dialog).toHaveCSS('animation-name', 'enter');
  await expect(dialog).toHaveCSS('animation-duration', '0.2s');
  await expect(overlay).toHaveCSS('animation-name', 'enter');
  await expect(overlay).toHaveCSS('animation-duration', '0.15s');

  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCSS('animation-name', 'exit');
  await expect(dialog).toBeHidden();
});

test('reduced-motion preference minimizes dialog animation duration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.goto('/');
  await page.evaluate(async (harnessPath) => {
    const { mountDialogAnimationHarness } = await import(harnessPath);
    mountDialogAnimationHarness();
  }, '/e2e/fixtures/DialogAnimationHarness.ts');

  await page.getByRole('button', { name: 'Open dialog' }).click();

  const dialog = page.getByRole('dialog', { name: 'Dialog motion test' });
  const overlay = page.locator('div.fixed.inset-0[data-state="open"]');
  const reducedMotionStyles = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'animation: pulse 4s 3s infinite; transition: opacity 4s 3s; scroll-behavior: smooth';
    document.body.append(probe);
    const styles = getComputedStyle(probe);

    return {
      animationDelay: styles.animationDelay,
      animationDuration: Number.parseFloat(styles.animationDuration),
      animationIterationCount: styles.animationIterationCount,
      scrollBehavior: styles.scrollBehavior,
      transitionDelay: styles.transitionDelay,
      transitionDuration: Number.parseFloat(styles.transitionDuration),
    };
  });
  const animationDuration = async (selector: string) =>
    page.locator(selector).evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );

  expect(reducedMotionStyles).toEqual({
    animationDelay: '0s',
    animationDuration: 0.00001,
    animationIterationCount: '1',
    scrollBehavior: 'auto',
    transitionDelay: '0s',
    transitionDuration: 0.00001,
  });
  await expect.poll(() => animationDuration('[role="dialog"]')).toBeLessThanOrEqual(0.001);
  await expect.poll(() => animationDuration('div.fixed.inset-0[data-state="open"]')).toBeLessThanOrEqual(0.001);
  await expect(dialog).toBeVisible();
  await expect(overlay).toBeVisible();
});
