# UI overhaul: handoff

*Updated 2026-10-23 at the close of Phase 7. Branch `feat/ui-overhaul`. **The overhaul is done.** Every phase is committed; nothing of it is waiting in the working tree.*

Read this before changing a screen, then read [DESIGN.md](../../DESIGN.md), which records the design as built.

---

## 1. Where things stand

| Phase | State | Commit |
|---|---|---|
| 1. Foundation (fonts, tokens, themes, primitives) | Done | `ea49369` |
| 2. Shell and navigation | Done | `d4276cd` |
| 3. Recipe page and baking mode | Done | `92c4093` |
| 4. Cookbook and Bakes | Done | `a1748c5` |
| 5. First run and sharing | Done | `dbaa6fe` |
| 6. Remaining screens | Done | `d4a975f` |
| 7. Documentation and clean-up | Done | the commit that carries this file |

All 134 changes in [AUDIT_REPORT.md](AUDIT_REPORT.md) §7 are built, P3 included, except change 134, which is data (§3).

**At the close:** `npx tsc -b` clean; `npm run lint` shows only warnings that predate the overhaul; the frontend suite (56 files, 608 tests) and the server suite (16 files, 151 tests) pass; `npm run test:visual` passes against 75 baselines that were each looked at.

---

## 2. What the last two phases settled

- **Change 31, the timer deep-link.** A step's timer remembers its recipe and step (`startTimer(…, { from })`). Its notification reads "Step 4 · 12 min is up" and opens baking mode at that step (`/recipe/:id/bake?step=4`). The origin stays on the device and is stripped from everything sent over the timer socket.
- **The shared photograph shipped.** React Router's `viewTransition` needs a data router, so the cookbook tile calls `document.startViewTransition` itself (`lib/sharedPhoto.ts`), and `PageTransition` keeps its key for that one navigation, because framer's exit waits on animation frames the browser pauses during a transition. The user chose to ship it after a throttled measurement: on a production build with 4× CPU throttling and Pixel 7 emulation it drops 2–7 of about 20 frames, fewer than the push slide it replaces, and it is clean at full speed. **It has not been checked on a real Android phone**, and TESTED_FEATURES keeps that check open.
- **Transitional token names are retired.** `ground`, `panel`, `panel-sunk`, `silkscreen`, `signal` and `on-signal` are gone from code and CSS; `designSystem.test.ts` forbids them in every component. `key-*` remains, for `StepRow` alone.
- **Documents.** DESIGN.md is rewritten from the build. CLAUDE.md names it as the reference; PRODUCT.md and README are brought up to date.

---

## 3. Open items for the owner

1. **Change 134 needs the operator.** The test note "Untitled fhgfhgfNote" is in the *live* library, not in code. Delete it from the live data.
2. **The landing photograph's licence.** `public/landing/danish-rye.webp` is TheMealDB's Danish rye, a stock-licensed library image. Confirm the licence before a public launch.
3. **The shared photograph on Android hardware** (§2).
4. **Known gaps** carried in DESIGN.md: no functional end-to-end specs; Notes still confirm a delete rather than offering Undo; the editor shows imported text as stored (the live library has artefacts such as "((170g))").
5. **The `AccountSheet` tests** have shown timing flakiness under the full suite. They passed in every run during Phases 6 and 7.

---

## 4. Decisions worth knowing

- **"Chapter"** is used where the audit said "Category" (change 26), to match the mock-up's Contents and Chapters.
- **Analytics** was replaced by the Bakes summary line, not rebuilt.
- **Discover** features a recipe only when there are more than two, and offers tags only when a tag is used twice: it draws only what the data supports.
- **The editor bar on a phone** says "Tidy up", without its sparkle, so the bar stays on one line at 375px; its accessible name stays "Tidy up with AI".

---

## 5. Tooling and gotchas

- **The `/ui-review` harness is not part of the overhaul** and is still uncommitted: `e2e/review/`, the `review:*` and `test:review` scripts in `package.json`, `tsconfig.e2e.json`, the `**/review/**` ignore in `playwright.config.ts`, and its lines in the two feature files. Never `git add -A`. To stage the feature files without its lines, write a blob with `git hash-object -w --stdin --path=<file>` from a copy with those lines removed, then `git update-index --cacheinfo`.
- **Line endings.** The repo is CRLF on checkout. A Python edit must read with `newline=''`, normalise to `\n`, edit, and write back with `\r\n` if the file had it.
- **Python on Windows** defaults to cp1252. Always pass `encoding='utf-8'`.
- **`--update-snapshots` only rewrites failing shots.** A change under the 150-pixel budget (an icon hidden, a gap narrowed) leaves the old baseline in place. Use `--update-snapshots=all -g <surface>` after a small visual change, and check the file times.
- **Framer's exit never finishes in jsdom.** A test that navigates inside `PageTransition` only sees the new page on the shared-photograph path; render routes without it otherwise.
- **Toasts in tests.** `useToast` is a no-op outside a provider. If the action navigates away, the provider must sit above the `Routes`.
- **Tests that mock `lib/settings`** must spread `importOriginal()`. **Tests that render `TimerManager`** mock `useNavigate`, since it now navigates from a notification.
- **`.hand` must stay unlayered CSS**, or the notes' italic and size utilities win over it.
- **The AI burst limiter** (10 per minute) is shared across server tests.
- **Screenshots:** `OVERHAUL_LABEL=<label> npm run audit:overhaul` writes to `audit-shots/overhaul/<label>/` (gitignored). `before/` and `phase1/` through `phase7/` exist.
- **The impeccable design hook** deliberately ignores `overused-font` for Fraunces and Inter.
