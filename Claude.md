# Proof — working rules

Proof is a baker's cookbook and bake log. A recipe is a pattern; a bake is that
pattern running. The interface is the machine that runs it.

---

# Which document wins

Five planning documents exist and they do not all agree. In a conflict, the
order below decides — later entries are newer decisions.

| Document | Authority over | State |
|---|---|---|
| [.agents/VISION.md](.agents/VISION.md) | Original concept | **Stale on two counts.** Its "Black & Gold" design section is dead — see *The visual world* below. Its "private instance / single-user" framing is superseded by LAUNCH_PLAN.md. Read it for the product's intent, not for its design or its scope. |
| [ROADMAP.md](ROADMAP.md) / [ImprovementPlan.md](ImprovementPlan.md) | The resume-ready sprint | Largely delivered. Its UI sections describe the Black & Gold design that was replaced. Phases 4–5 (CI, E2E, LICENSE) were never finished and are still open. |
| [REWORK_PLAN.md](REWORK_PLAN.md) | How the visual design was arrived at | Complete. All eight phases shipped. Supersedes the UI sections of the two documents above. Read it for the reasoning; read DESIGN.md for the rules. |
| [DESIGN.md](DESIGN.md) | **The visual design, entirely** | Live, written from the built artifact. The reference for anything you draw. |
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

**The design language is the Step Row system, documented in full in
[DESIGN.md](DESIGN.md)** — read it before drawing anything. The reference world
is an early-80s rhythm machine: matte panels, silkscreened labels, lit step
keys, seven-segment readouts.

**The previous "Black & Gold" design — pitch black with gold accents,
glassmorphism, gradients, glows — was deliberately removed.** VISION.md and
ImprovementPlan.md still describe it. They are wrong on this point. Do not
restore any of it.

### Colour is temporal, never decorative

Red means a thing is happening **now** — and, per Launch Plan decision B3, it
may also mark the **one** solid primary control on a screen. Nothing else is
red. Orange is due next, yellow is queued, bone is complete, and an unlit key is
a phase not reached — drawn as deliberately as a lit one. Errors take `--fault`,
the caution lamp, never red; destructive controls carry the `--spoiled` rule.
Colour is never spent on decoration, on branding, or on a control that merely
wants attention. `src/designSystem.test.ts` enforces which files may draw red.

### One ban, two materials

**No glow, except a lit key or a lit segment.** Light means a thing is on.

Gradient and backdrop blur are permitted as *materials with one use each*, never
as decoration:

- `--faceplate` / `.faceplate` — the few-percent sheen of a moulded panel lit
  from above. The only gradient in the chrome.
- `.scrim` — the blurred layer behind something that genuinely sits *over* the
  interface: a modal, a sheet, a drawer. Never on a panel that is part of the
  page.

Neither goes on a photograph. **`src/designSystem.test.ts` enforces this and
fails the build on any ad-hoc `bg-gradient-to-*` or `backdrop-blur-*` utility in
a component.**

### Typography

Self-hosted variable fonts, latin subset, precached for offline: Archivo
Variable (display and instruction prose) and JetBrains Mono Variable (UI, labels
and data). Seven-segment readouts are reserved for instrument values — weights,
temperatures, timers, totals. Counts, servings and dates use tabular mono.

---

# The component layer

`src/components/ui` is the whole vocabulary: `Panel`/`PanelRow`, `Button`,
`Field`/`TextArea`/`Select`, `Sheet`, `SegmentReadout`, `StepRow`,
`RecipePlate`, `RecipeTile`, `InstrumentRow`, `Meter`, `Skeleton`.

- **Compose these rather than hand-rolling inline Tailwind** for a panel, a
  control, a readout or an overlay. Hand-rolling is how the previous system
  drifted into forty button styles and eleven copies of the same modal.
- **Every overlay is a `Sheet`.** It carries the focus trap, Escape, focus
  returned to whatever opened it, and a counted scroll lock. Never hand-roll a
  scrim — a modal you cannot leave by keyboard is a trap.
- `/lab` (development only) is a live gallery of every primitive in its real
  states. Add new primitives to it.

---

# UI/UX principles

- **Dark is the default**, and it is true `#000000`. Light is the faceplate
  inverted and is first-class, not a courtesy. Two themes only.
- **Mobile-first**: every layout must work at 375px with no horizontal scroll.
  Anything a thumb reaches repeatedly is a **44px** target. `size="sm"` is for
  dense desktop chrome and for inline affordances inside a chip.
- **Motion derives from one clock**: the chase light sweeping and a key flashing
  on press. framer-motion is used for page transitions and a few entrances;
  prefer CSS transitions, which the global `prefers-reduced-motion` rule
  collapses for free. **A JS timer is not covered by that rule — check
  `prefers-reduced-motion` yourself before animating with one.**
- **Loading skeletons**, never the word "Loading".
- **Report in the panel, not through the browser.** No `alert()`, no
  `confirm()`, no `prompt()`. Errors name the problem *and* the recovery.
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
- **E2E**: Playwright is installed and is the intended tool, but **no E2E specs
  exist yet** — this is an open gap from ImprovementPlan.md Phase 4, along with
  CI and a LICENSE. Do not describe E2E coverage as present.

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
- **Two themes only**: Light + Dark. OLED Black was consolidated into Dark.
- **No sidebar auto-hide**: Sidebar is always visible on desktop.
- **No markdown editor**: Notes are a panel and a textarea. The markdown widget brought its own toolbar, split pane and colour system, and was removed along with its dependencies.

---

# Known data reality

The live library holds **203 recipes**, each with exactly one final-product
photograph, all served from one external CDN. **199 of them carry the seed
script's `prepTime: "20 mins"` / `cookTime: "30 mins"` verbatim**, so most
recipes share an identical 50-minute total. The duration parser is correct; the
data is a placeholder. Surfaces must not present those timings as if they were
measured — `isPlaceholderTiming` in `src/lib/duration.ts` recognises them.

There are **3 bake logs** across 3 different recipes, so any surface that reads
iteration history has almost nothing real to show yet and must degrade honestly.
