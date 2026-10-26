import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4178';

export default defineConfig({
  testDir: './e2e/visual',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  snapshotPathTemplate: './e2e/visual/snapshots/{arg}{ext}',
  use: {
    baseURL,
    browserName: 'chromium',
    colorScheme: 'light',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_SENTRY_DSN: '',
    },
  },
});
