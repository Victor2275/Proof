import { defineConfig, devices } from '@playwright/test';

/*
 * The UI-overhaul review set (e2e/overhaul/capture.spec.ts). Records only.
 *
 *   npm run audit:overhaul
 *   OVERHAUL_LABEL=after npm run audit:overhaul
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  workers: 4,
  reporter: [['line']],
  timeout: 60_000,
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
