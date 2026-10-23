import { defineConfig, devices } from '@playwright/test';

/*
 * The /ui-review screenshot set (e2e/review/capture.spec.ts). Records only.
 *
 *   REVIEW_LABEL=<date> npm run review:capture
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'capture.spec.ts',
  fullyParallel: true,
  workers: 4,
  reporter: [['line']],
  timeout: 90_000,
  use: { baseURL: 'http://localhost:5173' },
  projects: [
    { name: 'w375', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
    { name: 'w1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npx vite --port 5173',
    cwd: '../..',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
