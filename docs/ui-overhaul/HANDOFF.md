# UI overhaul: handoff

*Written 2026-10-22, after Phase 1. Branch `feat/ui-overhaul`, Phase 1 commit `ea49369`.*

This picks the overhaul up where it stopped. Read it before touching a screen.

---

## 1. Where things stand

**Phase 1 (foundation) is done and committed.** The whole app already draws in the new look: paper, ink, paprika, the three faces, and the restyled primitives. The *structure* of each screen is still the old one. The sidebar, the More drawer, the floating + button, the old recipe page and the old baking mode are all still there, and each one waits for its phase.

Verified at commit:

| Check | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run lint` | only warnings that were there before |
| `npm run test:all` | frontend 52 files / 493 tests, server 16 files / 150 tests, all passing |
| `npm run test:visual` | 89 passed against the 63 regenerated baselines in `e2e/__screenshots__/` |

**Next is Phase 2, the app shell.** See §4.

---

## 2. Read these first

| File | Why |
|---|---|
| [CLAUDE.md](../../CLAUDE.md) | Working rules. The visual-world, component-layer and interface sections are already rewritten for the overhaul. |
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | §6 the direction, the 4-destination IA and the phone wireframes; §7 the 134 numbered changes; §8 what must survive; §9 the phase plan. |
| [APP_FEEL_DEBATE.md](APP_FEEL_DEBATE.md) | §4 how each text link becomes an app control (L1–L13); §5 the timings for press, push, sheet and toast; §6 the primitives still to build. |
| Canvas mock-up (approved) | <https://claude.ai/artifact/SzCyNPm6Seykqcyd8HN96U>, the printed-cookbook comp the user signed off on. Its artboards: Main, Cookbook, Bakes, Baking, Desktop and Sheet. |

**Do not draw from** DESIGN.md, REWORK_PLAN.md, VISION.md's design section or ImprovementPlan.md's UI sections. They describe the two looks that were removed. DESIGN.md gets rewritten from the built result in Phase 7.

---

## 3. Locked decisions

These were all decided on 2026-10-21. Don't reopen them.

- **Direction: the printed cookbook you write yourself.** Warm paper, ink, one paprika accent, a serif for the recipe and a quiet sans for the controls.
- **Light paper is the default theme**, with a warm-charcoal dark. There are two themes only.
- **Desktop navigation is a slim top bar**, replacing the sidebar.
- **Four destinations: Cookbook, Bakes, Shop, Discover.** Settings and account sit behind an avatar. There is no More drawer and no floating action button.
- **It is an app, not a website.** There are no web-style text links. Navigation is a `BackButton`, a whole-card link, a row, a tab or a segmented control. Actions are a `Button` or an `IconButton`.
- **Colour means one thing each:**
  - Paprika is the one primary action on a screen, plus the rating stars.
  - Sage means "have it" or "done".
  - Butter means a timer or the current step.
  - Pencil is a margin note.
  - Ochre `--fault` marks errors.
  - The `--spoiled` rule marks destructive controls, which are outlined, never filled.

---

## 4. Phase 2: the shell and navigation

These are changes 19–31 in AUDIT_REPORT §7.2, plus slices 1–3 of the debate's build list.

### Where the shell lives today

- **Routes:** `src/App.tsx`, around lines 162–185, sit inside one `AnimatePresence`. `/welcome` and the outer catch-all are near line 247. The shell is drawn near line 297 (`<Sidebar className="hidden md:flex" />`) and line 305 (`<BottomNav />`).
- **Sidebar:** `src/components/Sidebar.tsx`, 102 lines. It gets deleted.
- **Phone bar, More and the FAB:** `src/components/BottomNav.tsx`, 137 lines. It holds the bottom bar, the More drawer and the floating + button.
- **Current routes:**
  - Own data: `/`, `/recipe/:id`, `/recipe/:id/bake`, `/new`, `/edit/:id`, `/gallery`, `/analytics`, `/pantry`, `/grocery`, `/notes`, `/settings`.
  - Public and account: `/discover`, `/r/:slug`, `/:at` (profiles), `/moderation`, `/verify`, `/reset`.
  - Development only: `/lab`.

### What to build

1. **Four destinations.**
   - Cookbook is `/`.
   - Bakes merges `/gallery` and `/analytics`.
   - Shop merges `/pantry` and `/grocery`.
   - Discover is `/discover`.
   - Pick the new paths (for example `/bakes` and `/shop`), and redirect the old paths to them so bookmarks, notifications and tests keep working.
   - Phase 2 only needs each tab to land somewhere sensible. Before Phase 4 rebuilds Bakes, it can show Gallery with a Segmented switch to Analytics. Before Phase 6 rebuilds Shop, it can show Grocery and Pantry behind a Segmented.
   - `/notes` becomes "Loose notes" inside the Cookbook (change 24). For now it can just be a row on the Cookbook.
2. **Phone tab bar.** Four tabs with icon plus label, 44px+, `aria-current`, and `haptic('selection')` on change. There is no More and no FAB.
   - "New recipe" moves to a labelled header button on the Cookbook (debate L10).
   - That button opens a bottom `Sheet` offering Write, Paste a link and Photograph a page. The last two should route to whatever import paths already exist.
3. **Slim desktop top bar.**
   - The wordmark is a home button.
   - The four destinations are a segmented nav with a sliding thumb (240 ms), drawn as `<nav>` of `<a aria-current>`.
   - The avatar menu sits on the right.
   - The page takes book-like reading widths.
   - ⌘K is a later slice; leave room for it on the right, but don't build it yet.
4. **Avatar menu** (a `Menu`, or a `Sheet` on the phone). It holds Settings, Account, My published recipes, Export/Import and Help. It replaces the Settings and account entries that sit in the sidebar and in More today.
5. **Running-timer pill** (change 27).
   - It reads like "Oven · 12:04", floats at the top of any screen while a bake runs, and returns to baking mode.
   - Timers already persist and sync. Read them from wherever `TimerManager` and `BakingMode` get them.
   - Use the butter colour, and `Readout` or tabular figures.
6. **Chrome-free public routes** (change 28). `/r/:slug` and `/:at` render without the tab bar or top bar. A stranger arriving from a shared link sees only the page.
7. **Transitions** (debate §5):
   - Tab switch: a 140 ms cross-fade.
   - Push: a 24px slide plus fade over 220 ms, using `cubic-bezier(.2,.8,.2,1)`.
   - Pop: the reverse, over 180 ms.
   - First load and deep links get no animation.
   - Respect reduced motion. `MotionConfig` is already in `App.tsx`; check that it reads `prefers-reduced-motion`.
   - Per-tab stacks with remembered scroll are the risky part (React Router outlet freezing). Ship the cross-fade and push first, and keep the stacks only if they hold up.
8. **Shared primitives this phase needs** (debate slice 2). Each one goes in `src/components/ui`, in `/lab`, in `index.ts`, and gets a unit test.
   - **`Sheet` detents** at 50% and 92%. The grabber is a button that cycles them, and there is always a visible Done. The focus trap must survive a drag.
   - **`Toast` + `useUndoableAction`:**
     - The toast lasts 6 s, pauses while hovered or focused, uses `aria-live="polite"`, sits above the tab bar, and its Undo works by keyboard.
     - Undo restores the record by clearing its `deletedAt`. Soft deletes already exist.
   - **`Disclosure`:** 240 ms for the height, 180 ms for the chevron.

### Phase 2 also retires

- The CLAUDE.md line under *Interface decisions*: "Until Phase 2 lands, the sidebar is still always visible on desktop". Change it to describe the top bar as built.
- The sidebar and More entries in `CURRENT_FEATURES.md` and `TESTED_FEATURES.md`. Rewrite them, don't append. Add a "## 17. UI overhaul — Phase 2" section in both, using `[ ]` checkboxes.
- The visual baselines, which change wholesale. Regenerate them with `npm run test:visual:update` and look at them before you commit.

---

## 5. Phases 3–7 at a glance

| Phase | Scope | Change numbers (AUDIT_REPORT §7) |
|---|---|---|
| 3. Recipe page and baking mode | Reading-first page. Last time / Your bakes / Next time. Fractions, subheads and entities in the display; no "Read more". Log-a-bake sheet. Icon toolbar (Favourite, Share through the system sheet, Edit, overflow menu). Docked "Start cooking" bar on the phone. New baking mode with margin notes. | 58–97 |
| 4. Cookbook and Bakes | Printed contents with dot leaders. Chapters \| A–Z segmented control with `?view=az` and a letter rail. De-duplication, filters. Bakes journal plus By recipe, note cards and a summary strip. Ribbon on the resume card, stamp on the personal best. | 43–57, 98–108 |
| 5. First run and sharing | Landing page; remove onboarding; empty cookbook; shared page with one primary "Save to my cookbook"; profile; print stylesheet. **Redesign `InstagramExporter`**, which still imports `lib/sevenSegment`; delete that module once nothing imports it. | 32–42, 16, 127–130 |
| 6. Remaining screens | Editor, Shop, Discover, Settings, 404. | 109–126, 131–134 |
| 7. Documentation | Rewrite DESIGN.md from the built result; run a final pass on CLAUDE.md and PRODUCT.md; new baselines. | — |

**Data-model additions** these phases need, all local-first with no server work:

- `nextTime`, `changes` and `rating` on a bake log, if they don't exist already.
- A `stepIndex` on a mid-bake note.

---

## 6. What Phase 1 left behind on purpose

- **Transitional token names.**
  - The old names (`ground`, `panel`, `panel-sunk`, `silkscreen`, `signal`, `on-signal`, `key-*`) are mapped onto the new tokens in `src/index.css`, so every screen took the new look at once.
  - 27 screen components still use them. Retire them screen by screen as each screen is rebuilt.
  - `designSystem.test.ts` already forbids them inside the primitives, except `key-*` in `StepRow`.
  - When the last screen stops using one, delete its mapping.
- **`.pressable` is a CSS class, not a component.** The debate specified a `Pressable` with an 8px move-cancel and a spring release. The CSS version (scale 0.97, 80 ms) covers the feel today. Write the component only if scrolling lists start registering presses.
- **The Sheet has no detents yet.** That work is in Phase 2 (§4, item 8).
- **There is no `Toast`, `Disclosure`, `DockedAction`, `LetterRail`, `Ribbon`, `Stamp`, `MarginNote`, `CommandPalette` or `SharedPhoto` yet.** Build each one in the phase that first needs it. `SharedPhoto` comes last and gets cut if it drops frames on Android.
- **Old feature entries.** Entries in `CURRENT_FEATURES.md` that describe keys, segment readouts, silkscreen or signal red describe the previous look. A note at the top of section 16 says so. Rewrite each entry when its screen is rebuilt.

---

## 7. Tooling and gotchas

- **Before/after screenshots:**
  - Run `OVERHAUL_LABEL=phase2 npm run audit:overhaul`.
  - It writes fold and full-page shots at 375 and 1280 into `audit-shots/overhaul/<label>/`.
  - That folder is gitignored, and `before/` and `phase1/` already exist there.
  - The spec mocks the published, comments and profile endpoints and the auth 401. A stranger redirect to `/welcome` is suppressed with a `visited` flag.
- **Design detector hook (impeccable).** `.impeccable/config.json` ignores the `overused-font` finding for Fraunces and Inter on purpose; both are approved choices. Treat any other finding on its merits.
- **Line endings.** The repo is CRLF on checkout (`core.autocrlf`). A Python script that writes files must keep whatever line ending the file already uses (`open(..., newline='')`, then detect `\r\n`), or the diffs explode.
- **Tests that mock `lib/settings`** must spread `importOriginal()`, or `SETTINGS_KEYS` disappears. `Settings.test.tsx` shows the pattern.
- **`RecipePlate`'s fallback is a drop cap**, so a title appears once per tile. Tests that look a title up by text will find one match, not two.
- **There are no `alert`, `confirm`, `prompt` or `console.log` calls.** Every overlay is a `Sheet`. Targets are 44px at 375px.
- **The uncommitted `/ui-review` harness is not part of the overhaul.** That means `e2e/review/`, `.claude/skills/ui-review/`, the `review:*` and `test:review` scripts in `package.json`, `tsconfig.e2e.json`, the extra `**/review/**` ignore in `playwright.config.ts`, and its entries in the two feature files. It came from another session and was deliberately left out of `ea49369`. Leave it for whoever owns it, and don't fold it into an overhaul commit by accident with `git add -A`.

---

## 8. Done means

At the end of every phase:

1. `npx tsc -b`, `npm run lint` and `npm run test:all` all pass.
2. `npm run test:visual` passes against baselines you have looked at.
3. An `OVERHAUL_LABEL=<phase>` screenshot set is taken and checked at 375 and 1280, in both themes.
4. `CURRENT_FEATURES.md` and `TESTED_FEATURES.md` are updated as mirrors of each other, with a unit test for every new feature.
5. Any new primitive is in `/lab`.
6. The commit is made only when the user asks for it.
