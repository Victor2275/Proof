import { defineConfig } from 'vitest/config';

/*
 * The review server's answer table. Kept out of `npm test`, whose config is
 * scoped to src/, and away from capture.spec.ts, which is Playwright's.
 *
 *   npm run test:review
 */
export default defineConfig({
  test: { include: ['e2e/review/**/*.test.ts'] },
});
