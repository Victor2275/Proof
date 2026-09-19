import { defineConfig, devices } from '@playwright/test';

/*
 * Visual regression baselines for the Step Row world.
 *
 * Phase 8 of REWORK_PLAN.md. Nine phases moved every surface in the app onto a
 * new design language by hand; these are what stop the tenth change quietly
 * undoing one of them.
 *
 * Two rules make the baselines worth having:
 *
 *   1. Nothing here touches the real database or the real image CDN. Every
 *      recipe, bake log and photograph is a fixture served from the test
 *      itself. A baseline that depends on live data is a baseline that fails
 *      the first time someone logs a bake.
 *   2. Animation is disabled at capture and the clock is fixed, so a diff means
 *      a layout changed rather than a transition being caught mid-flight.
 *
 * Snapshots carry a platform suffix, so a machine that has not generated them
 * will report them missing rather than failing on font rendering. Generate with
 * `npm run test:visual:update`.
 */
export default defineConfig({
  testDir: './e2e',
  // The whole point is comparing against a committed image, so a run that
  // silently wrote new baselines would be worthless.
  updateSnapshots: 'missing',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    // Freezes CSS animation and transition at capture time. The app's own
    // reduced-motion rule does most of this already; this covers the rest.
    trace: 'on-first-retry',
  },

  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      // Font antialiasing differs by a hair between runs on the same machine.
      maxDiffPixelRatio: 0.01,
    },
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // 390px is the phone the product was designed around; 375 is the floor the
    // layouts must survive, and is covered by the assertions rather than here.
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],

  webServer: {
    command: 'npx vite --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
