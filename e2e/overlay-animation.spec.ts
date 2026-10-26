import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';

test('overlay components animate with the specified durations', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.goto('/');
  await page.evaluate(async (harnessPath) => {
    const { mountOverlayAnimationHarness } = await import(harnessPath);
    mountOverlayAnimationHarness();
  }, '/e2e/fixtures/OverlayAnimationHarness.ts');

  await page.getByRole('button', { name: 'Open alert dialog' }).click();
  const alertDialog = page.getByRole('alertdialog', { name: 'Alert motion test' });
  await expect(alertDialog).toHaveCSS('animation-name', 'enter');
  await expect(alertDialog).toHaveCSS('animation-duration', '0.2s');
  await page.getByRole('button', { name: 'Confirm action' }).click();

  for (const side of ['left', 'right', 'bottom'] as const) {
    await page.getByRole('button', { name: `Open ${side} sheet` }).click();
    const sheet = page.getByRole('dialog', { name: 'Sheet motion test' });
    await expect(sheet).toHaveCSS('animation-name', 'enter');
    await expect(sheet).toHaveCSS('animation-duration', '0.5s');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCSS('animation-name', 'exit');
    await expect(sheet).toHaveCSS('animation-duration', '0.3s');
  }

  await page.getByRole('button', { name: 'Hover tooltip' }).hover();
  const tooltip = page.getByRole('tooltip', { name: 'Tooltip motion test' });
  await expect(tooltip).toHaveCSS('animation-name', 'enter');
  await expect(tooltip).toHaveCSS('animation-duration', '0.15s');

  await page.getByRole('combobox').click();
  await expect(page.getByRole('listbox')).toHaveCSS('animation-name', 'enter');
  await expect(page.getByRole('listbox')).toHaveCSS('animation-duration', '0.15s');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open dropdown' }).click();
  await expect(page.getByRole('menu')).toHaveCSS('animation-name', 'enter');
  await expect(page.getByRole('menu')).toHaveCSS('animation-duration', '0.15s');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open popover' }).click();
  const popover = page.getByText('Popover motion test');
  await expect(popover).toHaveCSS('animation-name', 'enter');
  await expect(popover).toHaveCSS('animation-duration', '0.15s');
});
