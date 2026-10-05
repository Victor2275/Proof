# Proof — UI Audit (Launch Plan Phase 0)

> Stage A (examination) and Stage B (decisions) from [LAUNCH_PLAN.md](../LAUNCH_PLAN.md) §4,
> Phase 0. Stage B decisions sit at the top, as the plan asks. Stage C (the fixes) has not
> started: **nothing in this document has been fixed yet.**
>
> Branch `feat/public-launch` · Run 2026-10-01 against a snapshot of the live library
> (203 recipes, 3 bake logs, 1 note, 3 pantry items).

---

## How to re-run this

The audit is scripted so it can be re-run at Stage C4 once the multi-user surfaces exist.

```
npm run audit:snapshot   # read the live library into e2e/audit/.data/   (public GETs only)
npm run audit:ui         # shoot the matrix into audit-shots/            (AUDIT_RESUME=1 to continue a stopped run)
npm run audit:report     # audit-shots/report.md + contact sheets in audit-shots/sheets/
```

| Piece | What it does |
|---|---|
| [e2e/audit/matrix.spec.ts](../e2e/audit/matrix.spec.ts) | 14 routes × 3 widths (375 · 768 · 1280) × 2 themes × 3 datasets (empty · typical · overflowing), plus loading / error / offline at 375 and 1280. 264 cells. Records only: nothing fails on what it finds. |
| [e2e/audit/first-run.spec.ts](../e2e/audit/first-run.spec.ts) | A stranger's first session walked end to end: landing page, then onboarding, then the cookbook. Nothing in storage. |
| [e2e/audit/datasets.ts](../e2e/audit/datasets.ts) | *Typical* is the live snapshot, not a fixture (A1b). *Overflowing* is 200 recipes, 60-character titles, 40 ingredients, 30 steps, 60 bake logs, 80 pantry items. |
| [scripts/audit-report.mjs](../scripts/audit-report.mjs) | Measured facts per cell (sideways overflow, "Loading" text, placeholder timings, red regions, sub-44px targets, unlabelled icon buttons, console errors, time to settle). It also renders contact sheets. |
| [playwright.audit.config.ts](../playwright.audit.config.ts) | Separate from the visual-regression config, which compares against committed images. |

Screenshots and the snapshot are gitignored (`audit-shots/`, `e2e/audit/.data/`): they are
the output of a run, not source.

**What the states mean.** *Loading*: the API never answers. *Error*: every read answers
500. *Offline*: a returning user, where the read cache in `localStorage` is warm,
`navigator.onLine` is false and the API is unreachable.

**Harness caveats.**
- The shell scrolls inside `<main>`, so the harness unrolls `<main>` before a full-page
  shot. As a side effect, fixed chrome (bottom nav, the `+` key) is drawn once, part way
  down a long shot. That placement is not a defect.
- The landing page renders outside the shell, so it never reports "settled". That is a
  harness gap, not a finding.
- Settle times are measured against the Vite dev server and are inflated. They are only
  comparable with each other.
- `scripts/ui-audit.mjs` is an earlier, narrower layout check: two viewports, needs both
  live servers, not wired into `package.json`. This matrix covers everything it did.
  **Candidate for deletion in C1**, left in place pending your call.

---

# Stage B — Decisions

Decided by Victor on 2026-10-01 unless marked otherwise. *Default* means the question
was already settled by CLAUDE.md or DESIGN.md, or has an obvious answer. It was recorded
here rather than asked, and stands unless overruled.

### Identity and language

| # | Decision |
|---|---|
| **B1** | **Chrome is instrument; people's words are printed matter.** Controls, labels, readouts and panels stay Step Row on every surface, including sign-up, pricing, profiles and comments. User-written content (comments, bios, recipe prose) is set in Archivo on a plain panel. Instrument dressing is not forced on it. This is the seam for every new surface. |
| **B2** | **Split by job.** `/r/:slug` and `/@handle` are **Operate**: a public recipe looks like the product, with one quiet "get Proof" line. **Pricing** joins the landing page as **Persuade**. |
| **B3** | **`--signal` may mark the one primary control on a screen**, commercial or not: Publish, Upgrade, Sign up, Start recipe. `--key-now` stays strictly temporal. This is a *change* from CLAUDE.md, which says "a save button is not now". DESIGN.md already defines `--signal` as "the one solid control", so the two documents converge on this reading. **Carry into C1:** amend CLAUDE.md's colour section. The rule is still **one** signal control per screen. Today several screens have more (see A3), and the landing page deliberately keeps its CTA quiet because the chase light is that page's "now" (comment at [LandingPage.tsx:113](../src/components/LandingPage.tsx#L113)). That reasoning still holds under B3: a screen whose "now" is already lit gets no signal control. |
| **B4** | **One viewer, owner controls off.** A stranger sees the same `RecipeViewer` without edit, delete or lab notes. They gain an attribution line, a ratings strip and "Save & edit" (fork). |

### Ownership and trust

| # | Decision |
|---|---|
| **B5 / B8** | **A first-class line under the title**, `ADAPTED FROM @handle`, linking to the original. Nothing is added to dashboard rows or tiles. |
| **B6** | **Three-position indicator in the recipe header** (`LOCAL · LIVE · LIVE + EDITS`). Dashboard rows and tiles carry a small `LIVE` tag only when published, so the default private state adds no chrome. |
| **B7** | **Moderation lives in the B6 indicator.** *Pending* is a queued (yellow) position. *Rejected* shows inline in the recipe header with the reason and the fix (edit, resubmit). No notifications surface, and no red. |
| **B9** | **Sync status only when something is wrong.** Silent when healthy. Conflicts, failures and long-unsynced states use the existing caution-bar slot. Settings shows "last synced". |

### Free vs. paid

| # | Decision |
|---|---|
| **B10** | **Teaser at the point of use.** Pro controls are visible and work up to the gate. Tapping one opens a `Sheet` saying what it does, what it costs, and that everything local stays free. No lock glyphs scattered through the chrome. |
| **B11 / B12** | **The quota lives inside each AI sheet.** "3 of 5 left this month" sits in the sheet's foot in tabular mono. At zero, the same sheet says so inline: when it resets, and the upgrade option. No toast, no modal, no global counter. |
| **B13** | **Zero unsolicited upgrade prompts.** Upgrade appears only when the user reaches for a Pro feature, or in Settings. |
| **B14** | **A subtle Pro badge on public profiles.** A small silkscreen `PRO` in the `/@handle` header only, never on comments or recipe pages. *(Chosen against the recommendation; recorded, not re-argued.)* |

### Strangers

| # | Decision |
|---|---|
| **B15 / B16** | **The stranger lands in their own empty cookbook, and its empty state is a seeded shelf**: "Start from one of these", hand-picked global recipes, each one tap to fork. The local book stays home, and the first action is still "fork this". *(Today the empty state reads "No recipes found." — see A1.)* |
| **B17** | *Default.* A single silkscreen line in the empty-state shelf and in Settings → Data: "Stored on this device. Export any time; an account adds backup." Honest without alarm, and never a banner. |
| **B18** | *Default.* The claim moment is a confirmation, not a migration. After sign-up the cookbook is unchanged, and one line in the account sheet reads "Your N recipes and M bakes are now backed to this account" (Pro) or "…stay on this device" (free). No import step and no progress bar. |
| **B19** | *Default, confirmed by the plan.* Baking mode does not change for a non-owner. |
| **B20** | **Sign-in is a `Sheet`**, opened from the action that needs it (Publish, Sync), plus an "Account" row in More and Settings. No permanent sign-in button in the chrome. |

### Navigation and structure

| # | Decision |
|---|---|
| **B21 / B22** | **Two destinations.** Bottom nav becomes **Cookbook · Discover · Gallery · More**, and **Pantry moves into More**. Keeping your book and the public book apart is what keeps "is this mine?" answerable. |
| **B23** | **Settings splits into Account / App / Data.** Account appears only once signed in. Operator tools (backup, re-host photographs) move to an Operator section that appears only after the operator PIN. *(Today they are shown to everyone — see A2.)* |
| **B24** | *Default.* Yes: every new multi-user primitive is built and reviewed in `/lab` before it is wired to anything. |

### Quality bar

| # | Decision |
|---|---|
| **B25** | *Settled.* One `Skeleton`, on current tokens, never the word "Loading". |
| **B26** | *Default.* 44px holds on every new surface a thumb reaches: comment actions, rating rows, browse tiles. `size="sm"` stays desktop-only. The current defect counts are in A3. |
| **B27** | *Default.* The copy is written in Stage C next to each surface, using the house pattern: problem, then recovery. Seeds: **publish rejected**: "Held back: this reads like a copy of [source]. Add a credit or rewrite the method, then resubmit." **Payment failed**: "The card was declined. Your recipes are untouched — update the card to keep sync running." **Sync conflict**: "Changed on another device. Keep this version, or open the other one?" **Quota exhausted**: "That was the last AI action this month. Resets on the 1st; Pro removes the limit." Open question for C1: errors currently use `--signal` text and borders. Under B3, signal means the primary control, so errors need their own token or should use `--spoiled`. |
| **B28** | *Default.* **WCAG 2.2 AA.** 4.5:1 for text, 3:1 for UI and focus rings, and an accessible name on every icon-only control. |
| **B29** | *Default.* Server unreachable while local works is the **normal** case once Phase 1 lands. It gets no amber bar, just a single line in Settings. The caution bar is reserved for "your change did not save". |
| **B30** | *Default.* **A local read never shows a skeleton.** Skeletons are for network reads only: Discover, public pages, sync. Publish and sync show progress on the control that started them, not on the page. |

---

# Stage A — Findings

Ordered by what a stranger would hit first and how much it costs them. Every finding
was checked against a screenshot or the source. None of it is a measurement taken on
trust.

## The ten that matter most

| # | Finding | Evidence |
|---|---|---|
| 1 | **The editor offers to save a blank form over a recipe it failed to load.** On a 500 or while offline, `/edit/:id` renders "UNTITLED RECIPE" with an empty form and live **Delete** and **Save** buttons. If the server recovers before the user notices, Save PUTs the blank form over the real recipe. `getRecipe` here has no `catch` and bypasses TanStack Query (`useRecipe` exists and is unused). | `editor__typical-error__*`, [RecipeEditor.tsx:131-139](../src/components/RecipeEditor.tsx#L131-L139) |
| 2 | **A cached recipe cannot be opened offline.** The banner says "Offline — viewing cached recipes", the recipe is in `cached_recipes`, and the viewer says **"Recipe not found."** Baking mode says **"NO RECIPE LOADED"**. `getRecipe` is not a `cachedRead`, and nothing falls back to the cached list. A 500 produces the same message, so an outage reads as a deleted recipe. | `recipe-viewer__typical-offline__*`, `baking-mode-states` sheet, [api.ts:166](../src/lib/api.ts#L166) |
| 3 | **Outages are drawn as emptiness on four surfaces**, which is the exact failure `api.ts`'s own comment says was fixed. On a 500 or offline: Gallery says "No bakes logged yet". Grocery says "No recipes yet — add one". Pantry (500) says "0 items in stock". Analytics names the error, then draws a full panel of zeros beneath it. The causes are `.catch(() => [])` in [GroceryList.tsx:50](../src/components/GroceryList.tsx#L50) and [queries.ts](../src/lib/queries.ts) (`useRecipeBakeLogs`), the uncached `getBakeLogs`, and Gallery's own `useEffect` fetch. | `gallery-states`, `grocery-states`, `pantry-states`, `analytics-states` sheets |
| 4 | **✓ Addressed 2026-10-01 by the polish pass** (now a `Sheet`, progress drawn as a step row). **The onboarding modal is broken on a phone and cannot be left by keyboard.** At 375px the progress dots, a divider rule and the Next button overprint the body copy, which is cut off mid-sentence. It is a hand-rolled scrim with no `role="dialog"`, no focus trap and no Escape. It is the second screen every stranger sees. | `first-run/2-onboarding__w375.png`, [OnboardingModal.tsx](../src/components/OnboardingModal.tsx) |
| 5 | **A stranger is shown someone else's library as "My Cookbook".** With nothing in storage, a visitor passes the landing page into 203 recipes under the heading **MY COOKBOOK**, every one with live edit and delete affordances that fail only on submit, via the PIN modal. This is the single-user assumption at its most visible. | `first-run/3-cookbook__*` |
| 6 | **✓ Addressed 2026-10-01 by the harden pass.** **Bread phases are forced onto non-bread recipes.** Arepa pelua (beef) is filed under **LEVAIN / MIX / SHAPE / BAKE / REST**, and baking mode opens on **"LEVAIN — NOW"** for "Cook the meat". Two causes: "shape the dough" plus "mix" satisfies the bread signature, and steps before the first matched phase are assigned to the first phase. Fails "draw only what the data supports" and "don't make the UI hostile to a chili recipe". | `recipe-viewer__typical__*`, `baking-mode__typical__*`, [phases.ts:146-150](../src/lib/phases.ts#L146-L150) |
| 7 | **✓ Addressed 2026-10-01 by the adapt pass** (sidebar is a rail below 1024; the viewer goes two-column by its own width). **At 768–1024px the recipe viewer is unreadable.** With the 256px sidebar, the ingredient column collapses until names wrap **one letter per line**. Measured "Garlic" label: hidden at 768, 30px at 900, 92px at 1024, 204px at 1280. | `recipe-viewer__typical__dark__w768.png` |
| 8 | **The empty cookbook reads as a failed search.** A stranger's first library says "No recipes found." beside an `ALL (0)` chip. B15 calls this the highest-leverage screen in the app. | `dashboard__empty__*` |
| 9 | **The dashboard counts zero while it is still loading, and on error.** It shows "0 RECIPES · ALL (0)" over skeleton tiles and over the "Couldn't load your cookbook" panel. That is a reading the data can't support. | `dashboard-states` sheet |
| 10 | **✓ Addressed 2026-10-01 by the quieter pass** (see CURRENT_FEATURES §9). **Red is spent on things that are not happening now.** Inline timer chips in the method ("2 hours", "5 minutes") are red before any timer runs, so the viewer shows 16 red regions. Baking mode shows the lit key, its label and an idle timer chip. Ingredient checkboxes use `text-signal`. The destructive button variant uses `text-signal`, not `--spoiled`. The red `+` key is on every screen, including those whose primary control is something else (B3 allows one signal control per screen). | report.md "Red regions" table, [Button.tsx:37-38](../src/components/ui/Button.tsx#L37-L38), [IngredientList.tsx:86](../src/components/IngredientList.tsx#L86) |

## A1 — The matrix, by surface

Only what the shots show. The full measured table is in `audit-shots/report.md`.

| Surface | Empty | Typical (live data) | Overflowing | Loading / error / offline |
|---|---|---|---|---|
| **Dashboard** | "No recipes found." (#8) | Clean at 375 and 1280. **At 768 `<main>` scrolls sideways 245px**: the search row overflows. | Paginates at 48 ("Show 48 more"), good. Long titles cut to two words in 3-up tiles, so near-identical recipes can't be told apart. | Zero counts while loading and on error (#9). The error panel names the problem and offers "Try again" (good), but prints the raw "Internal server error". Offline works from cache. |
| **Recipe viewer** | "Recipe not found." for a missing id. Fine, but see offline. | Placeholder timings drawn as ghost segments, honest. Phases wrong (#6). Red timer chips (#10). Collapses at 768 (#7). Unlabelled ⋮ menu, and an unlabelled mobile play button still on old-world styling (`bg-accent`, `rounded-full`). 39 sub-44px targets at 375 (scale keys, row buttons). | 60-char title wraps to six lines at 375 but holds. 40 ingredients hold at 375 and 1280. | Offline / 500 shows "Recipe not found." (#2). |
| **Baking mode** | "NO RECIPE LOADED" + Back. An uncaught `ApiError` reaches the console. | "LEVAIN — NOW" on a beef dish (#6). Idle timer chip is red. Unlabelled `aria-pressed` toggle. 5 sub-44px targets in the top bar. | Holds. | Offline: "NO RECIPE LOADED" with no reason (#2). Error: same, no recovery named. |
| **Editor** (`/edit/:id`) | Missing id renders a blank "Untitled recipe" form with Delete. Uncaught `pageerror`. | Clean. Tag-remove × buttons and the photo input are under 44px. | Holds. | **Blank form over an unloaded recipe (#1).** |
| **Editor** (`/new`) | — | Clean. | — | — |
| **Gallery** | Good empty state that teaches the loop, but its CTA "Open the cookbook" is red alongside the red `+` (two signals). | **Drops photo-less bakes**: 3 bake logs, 2 rows. Arepa pelua's bake has no photo and no notes, so 1 of 3 bakes is invisible in "Bake history". Headline flush to the top edge on mobile web. | Holds. | Outage drawn as "No bakes logged yet" (#3). Still on `useState` + `useEffect`. |
| **Analytics** | Honest: "No bakes logged yet". | **Exemplary degradation**: "3 bakes across 2 months. Not enough to read a trend yet". "Baked more than once" explains why it's empty. Headline flush to top on mobile web. | Holds. | Error draws zeros under the error line (#3). |
| **Pantry** | Good empty copy. | Remove × buttons are 3 sub-44px targets. Add and scan are offered to a stranger and fail only via the PIN modal. | 80 items hold. | 500 shows "0 items in stock" (#3). Offline works from cache. |
| **Grocery** | Fine. | Recipe chips, "191 more — search to narrow": good. | Holds. | 500 shows "No recipes yet — add one" (#3). |
| **Notes** | Fine. | Fine. | 30 long notes hold. | Error and offline say "Could not reach the notebook. Your unsaved text is still here." **This is the model the other surfaces should copy.** |
| **Settings** | — | Operator tools shown to everyone (A2). Headline flush to top on mobile web. | — | — |
| **Not found** | — | Clean, in voice ("Nothing at this address"). | — | — |
| **Landing** | — | Clean at all widths. Chase light holds under reduced motion. | — | — |
| **Lab** | — | 11 red regions is expected: it is a gallery of every lit state. Not a finding. | — | — |

**Every width:** headlines on Analytics, Gallery, Pantry and Settings sit flush against the top
edge in a phone browser. `pt-safe` is `env(safe-area-inset-top, 20px)`, and the 20px
fallback only applies where the variable is undefined. Browsers define it as `0`, so
outside Capacitor the top padding is zero. [index.css:349-351](../src/index.css#L349-L351)

**Light theme:** no surface turns to soup. Every finding above reproduces identically in
light. No light-only defects were found.

**Not reproduced:** no surface printed the word "Loading" in a settled state, and no
surface scrolled sideways at 375 or 1280.

## A1b — The live data

- **Placeholder timings are mostly handled.** No captured cell shows "50 MIN".
  `RecipeTile` and `RecipeHeader` draw ghost segments for the seed pair. Two code paths
  still present them as measurements:
  - The dashboard's **now-baking row** (`PatternRow`, [Dashboard.tsx:105](../src/components/Dashboard.tsx#L105))
    calls `totalRecipeMinutes` with no `isPlaceholderTiming` guard. It is only drawn
    during an active bake, which the matrix does not stage.
  - **ReverseBakeScheduler** builds a schedule from `parseInt(prepTime)`. It reads the
    placeholder as real, **invents 30 and 45 minutes** when the field is empty, and turns
    "1 hour 15 mins" into 1 minute. It doesn't use the duration parser at all.
    [ReverseBakeScheduler.tsx:40-42](../src/components/ReverseBakeScheduler.tsx#L40-L42)
- **Still a publishing blocker.** 199 of 203 recipes carry `20 mins` / `30 mins`. The
  surfaces degrade honestly, but a published library of 199 recipes with no time at all
  is barely better than one with the wrong time. Correct the data before seeding (Phase 2).
- **Iteration history is nearly empty, and one of its three entries is blank.** The
  Arepa pelua bake log has no photo and no notes. The Gallery hides it, Analytics counts
  it. Pick one behaviour.
- **The live data's shape differs from the fixtures.** `GET /api/bakelogs` returns
  `recipeId` **populated** (`{ _id, title }`). The visual-regression fixtures in
  [e2e/fixtures.ts](../e2e/fixtures.ts) use a bare string, so those baselines never
  exercise the shape production serves.
- **The fixture router has a bug.** `pinEnvironment` matches `/recipes/:id/bakelogs` with
  `path.startsWith('/recipes/')` and answers with the *recipe object*. So the
  `recipe-viewer` visual baseline has never rendered a bake history.
- **Photos come from four hosts, not one CDN** (`res.cloudinary.com`, `www.themealdb.com`,
  `sugarspunrun.com`, `addapinch.com`). CLAUDE.md says "all served from one external
  CDN". Settings → Re-host exists for this. Two of the hosts are food blogs, which bears
  on the attribution rule in Phase 3.
- The live note is test debris (`"Untitled fhgfhgfNote"` / `"fhfh"`). Clean it before the
  library is seeded.
- Fields from the removed versioning system (`commitMessage`, `isLatestVersion`,
  `parentRecipeId`, `versionNumber`) are still on every live recipe and still in the
  `Recipe` type. `SideBySideCompare.tsx` is still imported by the viewer.

## A2 — Single-user assumptions

The plan counted 13 components branching on `adminToken`. **That is now 5 call sites**
(App, Sidebar, Settings, BakingMode, AISubstitutionsModal), and the shape of the problem
has changed. Most of the UI no longer branches at all: it **shows every write control to
everyone**, and a stranger finds out it's not theirs only on submit, when a 401 raises
the PIN modal.

| Assumption | Where it shows |
|---|---|
| The library belongs to whoever is looking | "MY COOKBOOK" over another person's 203 recipes (#5). Sidebar "My Cookbook". Onboarding: "organize *your* cookbook exactly how you like". |
| Every visitor can edit | Edit, delete, add-to-pantry, scan, restructure and photo upload are all live for a stranger. Failure comes through a modal titled **"Admin Access Required"**, a hand-rolled scrim at [App.tsx:51](../src/App.tsx#L51), not a `Sheet`. |
| Every visitor is the operator | Settings shows **Backup** ("Needs the admin PIN") and **Re-host photographs** to everyone. Errors say "Admin required." ([Pantry.tsx:82](../src/components/Pantry.tsx#L82), [:91](../src/components/Pantry.tsx#L91)). AI substitutions say "Admin PIN required". |
| One person's private lab | PWA manifest description: *"A private digital laboratory for recipe formulation."* ([vite.config.ts:17](../vite.config.ts#L17)) |
| Settings copy contradicts itself | "Everything here is stored on this device, not the server", directly above a backup that reads the server's whole database. |
| No surface exists for any multi-user state | Confirmed: no sign-in, account, profile, publish, published-vs-local, moderation, upgrade, sync status or storage usage anywhere. |

C2's `useSession()` / `useOwnership()` / `usePlan()` refactor is still the right shape.
The work is now less "replace 13 conditionals" and more "**add** the conditional that
should have been there": owner controls rendered only for owned records.

## A3 — Visual defects and design-system debt

The plan's table, re-verified against today's code, plus what the matrix found.

| # | Finding | Status / evidence |
|---|---|---|
| 1 | Loading text instead of skeletons | **Still present, and wider than listed:** "Loading photographs…" [RecipeEditor.tsx:809](../src/components/RecipeEditor.tsx#L809). The app-wide `Suspense` fallback "Loading…" [App.tsx:251](../src/App.tsx#L251). "Loading exporter…" over a hand-rolled `bg-black/90` scrim [RecipeViewer.tsx:893](../src/components/RecipeViewer.tsx#L893). "Loading..." / "Loading sub-recipe..." [RecipeDrawer.tsx:49](../src/components/RecipeDrawer.tsx#L49), [:63](../src/components/RecipeDrawer.tsx#L63). |
| 2 | Several skeleton implementations | **Still present.** `ui/Skeleton` (`bg-black/10 dark:bg-white/10`), Dashboard inline, Gallery inline, RecipeDrawer's pulsing text. |
| 3 | `Skeleton` primitive on legacy tokens | **Still present.** `SkeletonCard` uses `bg-sidebar/50`, `border-border-subtle`, `rounded-2xl`. |
| 4 | Gallery bypasses TanStack Query | **Still present**, and it causes finding #3. **Also:** GroceryList (`useState` + `useEffect`, errors swallowed) and RecipeEditor's recipe load. |
| 5 | Components on legacy aliases | **9 files, not 7.** `sidebar` / `paper` / `border-subtle` / `accent` in AISubstitutionsModal, PhotoSlider, RecipeDrawer, ReverseBakeScheduler, SideBySideCompare, TimerManager, ui/Skeleton, plus `accent` in **RecipeViewer** (the mobile play button) and **utils/timerParser.tsx**. |
| 6 | **Overlays not built on `Sheet`** *(new)* | **✓ Addressed 2026-10-01 by the polish pass**: all nine, plus Baking Mode's ingredients list and the bottom nav's More sheet; the viewer's dropdowns use the new `Menu`. Originally: **9 hand-rolled overlays**, despite "every overlay is a Sheet": AuthModal (App), AISubstitutionsModal, OnboardingModal, RecipeDrawer, Pantry's barcode scanner, BakingMode's finish dialog and voice help, TimerManager's start-timer prompt, and the exporter fallback. TimerManager's prompt is still fully old-world: `bg-black/50`, `rounded-t-3xl`, `shadow-2xl`, `font-bold`. |
| 7 | **Touch targets under 44px at 375** *(new)* | Recipe viewer 39 (scale keys 0.5×–3×, per-ingredient row buttons, "← Cookbook"). Dashboard 14 (every folder chip). Baking mode 5 (top-bar keys). Pantry 3 (remove ×). Editor 3 (tag ×, photo input). Lab 12 is expected (a gallery). |
| 8 | **Icon-only controls with no accessible name** *(new)* | Dashboard shuffle key. ~~Recipe viewer ⋮ menu~~ (named "More actions", polish pass). Recipe viewer mobile play button. Baking mode `aria-pressed` toggle. |
| 9 | **Sideways scroll at 768** *(new)* | **✓ Addressed 2026-10-01 by the adapt pass**: no cell overflows at 375, 768, 1024 or 1280. Originally: Dashboard only: `<main>` scrolls 103px (empty) to 245px (typical). The recipe viewer doesn't scroll, it collapses (#7). |
| 10 | **Zero top padding on mobile web** *(new)* | **✓ Addressed 2026-10-01 by the adapt pass**: `pt-safe` is the inset plus 1.5rem. Originally: `pt-safe` fallback never applies in a browser (see A1). |
| 11 | **Onboarding pager is a `tablist` with no tabpanels** *(new)* | [OnboardingModal.tsx:90-94](../src/components/OnboardingModal.tsx#L90-L94). Screen readers announce tabs that control nothing. |

## A4 — Design language

Settled, as the plan says. B3 above amends the colour rule: `--signal` now marks the one
primary control per screen, while `--key-now` stays strictly temporal. VISION.md and
ImprovementPlan.md still describe Black & Gold. Correct or annotate them in C1, together
with CLAUDE.md's colour paragraph, its "no E2E specs exist" line (the Phase 8 visual
baselines and this audit are both Playwright specs), and its "one external CDN" line.

## A5 — What the design system can and can't build

**It covers most of what Stage C needs.** `Sheet` covers auth (B20), paywall teasers
(B10), the quota wall (B11/12), publish confirmation and the onboarding replacement.
`Panel` + `PanelRow` cover Settings' split (B23) and profiles. `RecipeTile`'s ghost-segment
readout is the right model for unknown values everywhere. Notes' error copy is the right
model for every outage.

**Gaps to build in `/lab` before wiring (B24):**

| Gap | Needed by |
|---|---|
| A **three-position state indicator** (LOCAL · LIVE · LIVE + EDITS, plus a queued position for moderation) | B6, B7 |
| A **tag/badge** primitive for `LIVE` on rows and `PRO` on profiles: silkscreen, no colour | B6, B14 |
| An **attribution line** (`ADAPTED FROM @handle`, linked) | B5/B8 |
| A **seeded empty-state shelf**: a row of forkable tiles with a single explanatory line | B15/B16 |
| A **printed-matter block** for user-written prose (comment, bio) under B1 | Comments, profiles |
| An **error-state pattern** that replaces content instead of zeroing it: a generalised Notes panel | #2, #3, #9, B29 |
| An **error colour** distinct from `--signal` once signal means "primary control" | B3, B27 |

---

## What this hands to Stage C

**C1 (foundation)** grows from the plan's list:

- the plan's six items;
- fixes #1–#3 and #9, before anything else. They are data-safety and honesty defects,
  not polish;
- the 9 hand-rolled overlays onto `Sheet`, onboarding first;
- the recipe viewer's 768–1024 layout, and the dashboard's 768 overflow;
- `pt-safe` on mobile web;
- the phase deriver's bread false positive and its first-phase assignment;
- red spent outside B3;
- the touch targets and accessible names from A3 #7–#8;
- the fixture router bug and the populated `recipeId` shape in `e2e/fixtures.ts`;
- the CLAUDE.md corrections listed in A4.

**Not done here, by design:** no fixes, no new primitives, no copy changes. Stage A is an
inventory, and the plan is explicit that fixing during the audit is how audits die
half-finished.
