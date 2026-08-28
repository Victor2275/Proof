import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Each test file spins up its own mongodb-memory-server; running them in
    // parallel intermittently crashes a worker ("Worker exited unexpectedly").
    // Serial is a few seconds slower but reliably green.
    fileParallelism: false,
  }
});
