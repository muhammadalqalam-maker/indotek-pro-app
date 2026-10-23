import { expect, test } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4177';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const requestOrigin = new URL(route.request().url()).origin;
    if (requestOrigin === localOrigin) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible();
});

test('validates empty credentials and focuses the first invalid field', async ({ page }) => {
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();

  const email = page.getByLabel('Email');
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Masukkan alamat email yang valid.')).toBeVisible();
  await expect(page.getByText('Kata sandi minimal 8 karakter.')).toBeVisible();
});

test('shows a localized error when sign-in is rejected', async ({ page }) => {
  await page.route(/\/auth\/v1\/token(?:\?|$)/, (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
      msg: 'Invalid login credentials',
      status: 400,
    }),
  }));

  await page.getByLabel('Email').fill('user@example.test');
  await page.getByLabel('Kata sandi').fill('password-for-e2e');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Email atau kata sandi tidak sesuai.');
});

test('sends a password recovery request and returns a privacy-safe notice', async ({ page }) => {
  await page.route(/\/auth\/v1\/recover(?:\?|$)/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({}),
  }));

  await page.getByRole('button', { name: 'Lupa kata sandi?' }).click();
  await page.getByLabel('Email').fill('user@example.test');
  await page.getByRole('button', { name: 'Kirim tautan pengaturan ulang' }).click();

  await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(
    'Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim. Periksa kotak masuk atau folder spam.',
  );
});

test('registers an account and asks the user to confirm their email', async ({ page }) => {
  await page.route(/\/auth\/v1\/signup(?:\?|$)/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'new-user@example.test',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-10-23T00:00:00.000Z',
        updated_at: '2026-10-23T00:00:00.000Z',
      },
      session: null,
    }),
  }));

  await page.getByRole('button', { name: 'Belum punya akun? Daftar' }).click();
  await page.getByLabel('Email').fill('new-user@example.test');
  await page.getByLabel('Kata sandi').fill('password-for-e2e');
  await page.getByRole('button', { name: 'Daftar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Masuk ke akun' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(
    'Pendaftaran berhasil. Periksa email untuk konfirmasi sebelum masuk.',
  );
});
