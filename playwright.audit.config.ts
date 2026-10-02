import { defineConfig, devices } from '@playwright/test';

/*
 * The Phase 0 UI audit (LAUNCH_PLAN.md, Stage A). Separate from the visual
 * baselines in playwright.config.ts on purpose: those compare against committed
 * images and fail on a diff; this one only records, against the live library,
 * and is re-run at C4 once the multi-user surfaces exist.
 *
 *   npm run audit:snapshot   # read the live library into e2e/audit/.data/
 *   npm run audit:ui         # shoot the matrix into audit-shots/
 *   npm run audit:report     # facts → audit-shots/report.md, shots → contact sheets
 */
export default defineConfig({
  testDir: './e2e/audit',
  fullyParallel: true,
  workers: 4,
  reporter: [['dot']],
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:5173',
  },

  projects: [
    { name: 'w375', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
    { name: 'w768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'w1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],

  webServer: {
    command: 'npx vite --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
