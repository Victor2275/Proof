import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { seedDevice } from '../seed.ts';
import { people } from './fixtures.ts';

/*
 * The regular baker's device, as one script a live browser can run before the
 * app starts — so /ui-review can check a veteran's claim in the Playwright MCP
 * browser rather than guess from a screenshot.
 *
 *   npm run review:seed [-- <out path>]
 *
 * It records what seedDevice would hand Playwright instead of reimplementing
 * it, so the live device and the captured one cannot drift apart.
 */

const OUT = process.argv[2] ?? join(process.cwd(), 'audit-shots', 'review', 'seed-regular.js');

const parts = ["localStorage.setItem('hasVisited', 'true'); localStorage.setItem('hasSeenOnboarding', 'true');"];
const recorder = {
  addInitScript: async (fn: (arg: unknown) => void, arg: unknown) => {
    parts.push(`(${fn.toString()})(${JSON.stringify(arg)});`);
  },
} as unknown as Page;

await seedDevice(recorder, people.regular);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, parts.join('\n'));
process.stdout.write(`regular device script: ${OUT}\n`);
