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
