import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4177';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4177 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://e2e-test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'e2e-test-anon-key-not-a-credential',
    },
  },
});
