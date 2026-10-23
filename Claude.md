# Proof — working rules

Proof is a baker's cookbook and bake log. A recipe is a pattern; a bake is that
pattern running. The interface is the machine that runs it.

---

# Which document wins

Several planning documents exist and they do not all agree. In a conflict, the
order below decides — later entries are newer decisions.

| Document | Authority over | State |
|---|---|---|
| [.agents/VISION.md](.agents/VISION.md) | Original concept | **Stale on two counts.** Its "Black & Gold" design section is dead — see *The visual world* below. Its "private instance / single-user" framing is superseded by LAUNCH_PLAN.md. Read it for the product's intent, not for its design or its scope. |
| [ROADMAP.md](ROADMAP.md) / [ImprovementPlan.md](ImprovementPlan.md) | The resume-ready sprint | Largely delivered. Its UI sections describe the Black & Gold design that was replaced. Phases 4–5 (CI, E2E, LICENSE) were never finished and are still open. |
| [REWORK_PLAN.md](REWORK_PLAN.md) | The Step Row ("drum machine") design | **Replaced** by the UI overhaul (decided 2026-10-21, built 2026-10-23). It describes a removed look. Do not draw from it. |
| [docs/ui-overhaul/](docs/ui-overhaul/) | **Why the design is what it is** | Decided 2026-10-21, built through Phase 7. `AUDIT_REPORT.md` (the printed-cookbook direction, the 134 changes, decisions), `APP_FEEL_DEBATE.md` (how links became app controls) and `HANDOFF.md` (how the build went). |
| [DESIGN.md](DESIGN.md) | **The visual design system as built** | Rewritten from the shipped app at the overhaul's close (2026-10-23): tokens, faces, primitives, motion, what enforces them, and the deviations from the plan. The reference for anything you draw. |
| [LAUNCH_PLAN.md](LAUNCH_PLAN.md) | **Distribution, the local/global split, accounts, money** | Live, decided 2026-09-18. The authority on the public multi-user direction and its phasing. Where an older document disagrees on multi-user scope, this one wins. |

`CURRENT_FEATURES.md` describes what exists. `TESTED_FEATURES.md` mirrors it as
a manual-testing checklist.

---

# Architecture rules

- **Framework**: React + Vite (Single Page App). Do not suggest Next.js or SSR frameworks. Narrow exception: public recipe routes (`/r/:slug`) may have `<title>`, OpenGraph and schema.org JSON-LD injected into `index.html` by Express before serving, for crawlers. That is meta injection, not SSR — it introduces no framework and no render-on-server path.
- **Backend**: Node.js + Express + MongoDB. Server is modular: `routes/`, `middleware/`, `services/`, `models/`.
- **Styling**: Tailwind CSS v4, with a bespoke primitive layer in `src/components/ui`. There is no shadcn/ui in this project and no component library to reach for — see *The component layer* below.
- **State Management**: TanStack Query for server state. Local React state for UI-only state.
- **Scope**: Multi-user is the committed destination — see [LAUNCH_PLAN.md](LAUNCH_PLAN.md). The app is **local-first**: IndexedDB is the source of truth for a user's own cookbook, and the server holds only (a) content deliberately published to the global cookbook and (b) cloud-sync data for paying accounts. Accounts, per-user ownership, and onboarding for strangers are in scope and expected.
- **Scope limits (still in force)**: Keep it simple. No row-level security policies, no federated invitation flows, no organizations/teams/roles beyond `user` and site `operator`, no per-tenant databases. Ownership is a single `ownerId` field plus a published/private distinction — nothing more elaborate. Multi-user being the direction of travel is not a licence to add tenancy plumbing inside an unrelated task.
- **Focus**: Performance, fast deployments, and clean iteration logic.
- **Security**: Never hardcode tokens or secrets. Sessions are crypto-random opaque tokens, never guessable IDs.
  - *Current state*: a single `ADMIN_PIN` gates all writes; sessions live in an in-memory `Map` in `server/middleware/auth.js`; reads are public.
  - *Target state*: `ADMIN_PIN` means **site operator only** (moderation queue, takedowns, metrics). User accounts are email + password (argon2id), with sessions in a DB-backed collection with a TTL index. Local-only writes need no auth at all — they never reach the server. Publishing and sync require a verified user session.
  - Do not migrate auth piecemeal inside unrelated work; it is a dedicated phase.

---

# The visual world

**The design language is a printed cookbook you write yourself** — warm paper,
ink, one paprika accent, a serif for the recipe and a quiet sans for the
controls. It was built screen by screen on `feat/ui-overhaul` from the plan in
[docs/ui-overhaul/](docs/ui-overhaul/), and [DESIGN.md](DESIGN.md) records it as
built.

**Two previous designs were deliberately removed: "Black & Gold" (pitch black,
gold, glass, glows) and the "Step Row" drum machine (true black, silkscreened
caps, lit keys, seven-segment readouts).** VISION.md, ImprovementPlan.md and
REWORK_PLAN.md still describe them. Do not restore either.

### Colour means one thing each

**Paprika (`--accent`) is the one primary action on a screen** — Start
cooking, Save — and a mark of rating (stars). It is never how a link announces
itself: links and controls are ink and say what they are by shape and by the
press. Sage is "have it / done", butter is a timer or the current step, pencil
is a margin note from a past bake. Errors take `--fault` (ochre), never the
accent; destructive controls carry the `--spoiled` rule and are never filled.
The `key-*` tokens survive only for a bake's phase states in `StepRow`.

### No glow, no gradient, no blur

Paper is flat. Depth comes from a hairline, a soft corner and a small lift
(`--lift`) under a raised sheet. The `.scrim` behind a sheet is a flat dim.
**`src/designSystem.test.ts` fails the build on any gradient, blur or
zero-offset glow**, on tracked uppercase labels, and on contrast below 4.5:1 for
every text pairing it lists.

### Typography

Self-hosted variable fonts, latin subset, precached for offline: **Fraunces**
(titles, `.font-title`, sentence case), **Source Serif 4** (the reading face —
method, headnotes, notes; `.font-prose`) and **Inter Tight** (controls, labels
and figures; `font-sans`, tabular numerals). **Caveat** is an optional
handwriting face for bake notes only (Settings → Handwritten notes, `.hand`),
off by default. Labels are `.ui-label`: small,
medium weight, sentence case. Times print as a cookbook does: "45 min",
"1 h 15" (`formatMinutes`).

---

# The component layer

`src/components/ui` is the whole vocabulary: `Panel`/`PanelRow`, `Button`,
`IconButton`, `BackButton`, `Segmented`, `Field`/`TextArea`/`Select`, `Sheet`
(with detents), `Menu`, `Disclosure`, `Toast` (`useToast`), `PageHeader`, `Stars`/`StarRating`,
`Stamp`, `MarginNote`, `DockedAction`, `Ribbon`, `LetterRail`, `Sparkline`, `Readout`, `StepRow`, `RecipePlate`, `Photo`, `RecipeTile`,
`InstrumentRow`, `Meter`, `Skeleton`, `PublishState`, `Tag`, `Prose`, `Switch`.

- **Compose these rather than hand-rolling inline Tailwind** for a section, a
  control, a figure or an overlay. Hand-rolling is how a previous system drifted
  into forty button styles and eleven copies of the same modal.
- **It is an app, not a website: no web-style text links.** Navigation is a
  `BackButton`, a whole-card link, a row, a tab or a segmented control; an
  action is a `Button` or `IconButton`. Every pressable thing uses `.pressable`
  (sinks and tints on pointer-down). See `docs/ui-overhaul/APP_FEEL_DEBATE.md`.
- **Haptics go through `haptic(kind)`** in `src/lib/haptics.ts` — one kind per
  moment (selection, light, medium, success, warning), off on the web and when
  switched off in Settings.
- **Every overlay is a `Sheet`.** It carries the focus trap, Escape, focus
  returned to whatever opened it, and a counted scroll lock. Never hand-roll a
  scrim — a modal you cannot leave by keyboard is a trap.
- `/lab` (development only) is a live gallery of every primitive in its real
  states. Add new primitives to it.

---

# UI/UX principles

- **Paper (light) is the default** (`src/lib/theme.ts`, mirrored in the inline
  script in `index.html`). Dark is the same book at night — warm charcoal
  `#16120F`, never true black. Two themes only.
- **Mobile-first**: every layout must work at 375px with no horizontal scroll.
  Anything a thumb reaches repeatedly is a **44px** target. `size="sm"` is for
  dense desktop chrome and for inline affordances inside a chip.
- **Motion is short and physical**: a press (80 ms), a 24px slide, a sheet
  rising (280 ms). framer-motion is used for page transitions and a few entrances;
  prefer CSS transitions, which the global `prefers-reduced-motion` rule
  collapses for free. **A JS timer is not covered by that rule — check
  `prefers-reduced-motion` yourself before animating with one.**
- **Loading skeletons**, never the word "Loading".
- **Report in the panel, not through the browser.** No `alert()`, no
  `confirm()`, no `prompt()`. Errors name the problem *and* the recovery.
- **Undo, not "Are you sure?"** A reversible action (a delete, an add) happens
  at once and offers Undo in a toast (`useUndoableAction`); Undo of a delete is
  `repo.restore`, which clears the tombstone.
- **Draw only what the data can support.** A panel with nothing to report says
  so; it does not invent a reading, pad a chart with zeroes, or rank a tie.
- **No orphan or debug code**: no `console.log`, no debug blocks, no unreferenced
  files or dependencies.

---

# Testing

- **Every new feature gets an automated unit test**, and the suite is run before
  anything is called done. Vitest for both `src/` and `server/`.
- `npm test` (frontend) · `npm run test:server` · `npm run test:all`
- Typecheck with `npx tsc -b` and lint with `npm run lint` before committing.
- **E2E**: Playwright runs the visual-regression baselines (`npm run test:visual`,
  `e2e/visual.spec.ts`) and the Phase 0 audit matrix (`npm run audit:ui`). Both
  seed the cookbook into IndexedDB (`e2e/seed.ts`). There are **no functional
  end-to-end specs** (flows asserted step by step) yet, and no CI or LICENSE —
  open gaps from ImprovementPlan.md Phase 4. Do not describe functional E2E
  coverage as present.
- Frontend tests run against a real in-memory IndexedDB (`fake-indexeddb`);
  `src/test/utils.tsx` seeds records and renders screens. Mock the server
  (`src/lib/api`), never the repository.

---

# Feature tracking rule

Whenever any changes are made to the codebase, you MUST:

1. Update `CURRENT_FEATURES.md` to accurately reflect the changes.
2. Update `TESTED_FEATURES.md` so it stays a 1-to-1 mirror, using empty
   checkboxes `[ ]` for new entries so they can be ticked off by hand.
3. Ensure a unit test exists for every new feature.

---

# Key decisions

### Product
- **No recipe versioning**: Git-style version control has been removed. Recipes are simple CRUD.
- **The bake log stays the main character**: Growth, social, and monetization features must not demote the iteration notebook to a side feature.
- **Landing page**: First-time visitors see a hero page before the dashboard. It is the single **Persuade** surface in an otherwise **Operate** product, and it renders outside the app shell.
- **No ads, ever.**

### Data and distribution
- **Local-first, not server-first**: A user's own cookbook lives in IndexedDB and works with no network and no account. Offline capability is structural and must never be traded away for a server-side convenience.
- **Publishing snapshots, it does not flag**: Publishing copies a recipe into a separate `PublishedRecipe` collection. Do **not** implement it as a `visibility` field on the private record — editing a local recipe must never silently mutate a live public page, and private recipes must have no server-side representation at all.
- **The free tier stores nothing server-side**: Free users must cost ~$0 to host. Cloud sync and backup are the paid tier. Never move free-tier data to the server for convenience.
- **Client-generated IDs**: Records use client-generated ULIDs (`String` `_id`), not Mongo `ObjectId`, because offline-created records need identities before they reach a server.
- **Soft deletes everywhere**: Every record carries `updatedAt` and `deletedAt`. Deletes are tombstones — sync depends on it.

### Interface
- **Two themes only**: Light (paper, the default) + Dark (warm charcoal). OLED Black was consolidated into Dark.
- **Four destinations, a slim top bar on desktop** (decided 2026-10-21, built in overhaul Phase 2): Cookbook, Bakes, Shop, Discover — a bottom tab bar on the phone and a slim top bar on desktop, replacing the sidebar. Settings and account sit behind an avatar. There is no sidebar, no More drawer and no floating + button: "New" is a labelled header button. Shared pages (`/r/:slug`, `/@handle`) and baking mode render with no app chrome (`isChromeFree` in `src/lib/destinations.ts`). Old addresses (`/gallery`, `/analytics`, `/grocery`, `/pantry`) redirect to Bakes and Shop.
- **No markdown editor**: Notes are a panel and a textarea. The markdown widget brought its own toolbar, split pane and colour system, and was removed along with its dependencies.

---

# Known data reality

The live library holds **203 recipes**, each with exactly one final-product
photograph, served from four hosts (Cloudinary, TheMealDB and two food blogs). **199 of them carry the seed
script's `prepTime: "20 mins"` / `cookTime: "30 mins"` verbatim**, so most
recipes share an identical 50-minute total. The duration parser is correct; the
data is a placeholder. Surfaces must not present those timings as if they were
measured — `isPlaceholderTiming` in `src/lib/duration.ts` recognises them.

There are **3 bake logs** across 3 different recipes, so any surface that reads
iteration history has almost nothing real to show yet and must degrade honestly.
