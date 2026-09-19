# Proof — Public Launch Plan

> Distribution, the local/global cookbook split, and monetization.
> Decisions in this document were made by Victor on 2026-09-18. Where I recommended
> against a choice, the choice stands and the risk is recorded under **Accepted risk**.

---

## 0. The thesis

**Free users must never touch your database.**

Everything else in this plan follows from that one line. Today every recipe is written
straight to MongoDB behind a single `ADMIN_PIN`, which means every new user is a cost
and a moderation liability from their first keystroke. Inverting it — IndexedDB is the
source of truth, the server only ever holds *published* content and *paying* users'
sync data — gives you:

- a free tier with a marginal cost of **$0.00 per user**, so growth can never hurt you;
- a paid tier (sync + backup) whose price maps exactly to the cost it creates;
- offline-first as a structural property rather than a feature you maintain;
- a moderation surface limited to the handful of things people deliberately publish.

That is the whole business model. The rest is execution.

---

## 1. Target state in one picture

```
┌─────────────────────────── DEVICE (free, no account) ────────────────────────────┐
│  Local Cookbook — IndexedDB is the source of truth                               │
│  recipes · bake logs · photos (blobs) · pantry · notes · folders · timers         │
│  Works fully offline. Never leaves the device unless the user says so.           │
└───────────────┬────────────────────────────────────────────┬─────────────────────┘
                │ "Publish"  (explicit, per item)            │ "Sync"  (paid)
                ▼                                            ▼
┌───────────── GLOBAL COOKBOOK ──────────────┐   ┌────── PRIVATE CLOUD MIRROR ──────┐
│  PublishedRecipe (a snapshot, not a link)  │   │  A copy of the local cookbook,   │
│  AI pre-screened · attributed · rateable   │   │  per account.                    │
│  Public, crawlable, forkable by anyone     │   │  Restores to any device.         │
└────────────────────────────────────────────┘   └──────────────────────────────────┘
```

**The key architectural decision: publishing copies, it does not flag.**

The obvious implementation — add `visibility: 'public'` to the existing `Recipe` doc —
is wrong here, for three reasons:

1. In a local-first world the private record lives on the device. There is no row to flip.
2. An author editing their local copy at 11pm should not silently mutate a public page
   other people have saved and are baking from.
3. It keeps the free tier free: a private recipe has no server-side representation at all.

So `POST /api/published` takes a **snapshot**. The author later presses "Push update" to
publish changes. This also happens to be the correct metaphor for an app called *Proof* —
a proof is a thing you commit to, and the bake log records what happened after.

---

## 2. Decisions locked

| Area | Decision |
|---|---|
| Audience | Bakers first, general cooks welcome. Don't make the UI hostile to a chili recipe. |
| 12-month goal | A few hundred active users. Infra planned to that number, not beyond. |
| Surfaces | Web PWA (primary) · Google Play (Android, Capacitor) · open-source self-host |
| Name | **Undecided** — see §3 |
| Local cookbook | Local-first: IndexedDB is truth, cloud sync is optional and paid |
| Account required | Only to publish or to sync. Full app usable anonymously, forever. |
| Publishable | Recipes · bake logs · folders/collections · pantry & grocery templates |
| Moderation | Gemini pre-screen on publish + user reports → admin queue |
| Discovery → library | **Fork**: an editable copy lands in your local book, attribution preserved |
| Social | Ratings / "I baked this" · public baker profiles · comments (all users) · **posting bake results is paid-only** |
| Ownership | Author keeps full control, can edit or unpublish anytime |
| Auth | Email + password (self-host friendly, no vendor lock-in) |
| Migration | Victor becomes user #1; the existing ~200 recipes seed the global cookbook |
| Anonymous → account | Seamless claim: local data attaches on signup |
| Hosting | Stay on Render free, kept warm by UptimeRobot |
| Database | Atlas M0 free now, data layer written so the exit isn't a rewrite |
| Images | Stay on-device as blobs; upload to Cloudinary only on publish |
| AI | Small free monthly quota, unlimited on paid |
| Money | Freemium subscription, priced to cover costs (~$3/mo), Stripe |
| Effort | Steady over 2–3 months, phases that each ship standalone |
| Risk | Long-lived branch, one cutover, breaking changes allowed |
| Launch | r/Sourdough + r/Breadit · baking Discords · own TikTok/IG baking content |
| Untouchable | Offline-first. The bake log stays the main character. |

---

## 3. Open decision: the name

Not decided yet, and it blocks the domain purchase and the Play listing. My recommendation:

**Keep "Proof" as the product name; qualify it in the domain and store listing.**

The name is genuinely good — it means both the fermentation stage and the evidence your
bake log accumulates. The problem is purely findability: "proof" is saturated in software
(proofreading, ZK-proofs, design proofing).

- Domain candidates, cheapest first: `proof.kitchen`, `proofbakes.app`, `proofloaf.com`,
  `bakeproof.app`. A `.kitchen` or `.app` is ~$12–20/yr.
- Play Store listing title: **"Proof — Sourdough Lab"** (store search indexes the title;
  "sourdough" is the query your users actually type).
- The longer internal name *Victor's Culinary Lab* should be retired from user-facing
  copy — it doesn't scale past user #1.

**Action:** pick a domain before Phase 2, because account emails need a sending domain.

---

## 4. Phase plan

Six phases, each independently shippable. Branch: `feat/public-launch`. Merge to `main`
at the end of Phase 1 (the app is strictly better at that point even with nothing else built).

---

### Phase 0 — Pre-UI check *(weeks 0–2, runs before and alongside Phase 1)*

The UI was built for exactly one user who is also the administrator. Every screen assumes
it. Bolting account menus and publish buttons onto that will produce something that looks
assembled rather than designed, and the first impression of a stranger arriving from
r/Sourdough is the entire conversion event. Do this before the multi-user surfaces exist,
not after.

> **Relationship to REWORK_PLAN Phase 8.** The Step Row visual rework is seven phases done
> with **Phase 8 — Finish** still open: copy rewrite, reduced-motion audit, Capacitor
> safe-area check, Playwright visual-regression baselines, finish review, and `DESIGN.md`
> written from the built artifact. That work is a **prerequisite of this phase, not a
> duplicate of it** — run REWORK_PLAN Phase 8 first, or fold it in as Stage C0. Phase 0
> here adds only what Phase 8 does not cover: the *multi-user* dimension. Where they
> overlap (visual-regression baselines, copy), do it once, under Phase 8.

Three stages, in order. **Do not start Stage C before Stage B is answered** — that is the
whole point of the sequencing.

#### Stage A — Examination *(2–3 days, no code changes)*

Produce `.agents/UI_AUDIT.md`: an inventory, not a fix list. Fixing during the audit is
how audits die half-finished.

**A1. Screen inventory.** All 13 routes in [src/App.tsx](src/App.tsx#L108-L120) —
Dashboard, Settings, Analytics, Pantry, GroceryList, BakingMode, RecipeViewer,
RecipeEditor, Gallery, GeneralNotes, Lab, LandingPage, NotFound. For each, capture a
screenshot matrix and record what's wrong:

| Axis | Values |
|---|---|
| Width | 375 · 768 · 1280 |
| Theme | light · dark |
| Data | empty · typical · overflowing (200 recipes, 60-char titles, 40 ingredients) |
| State | loading · loaded · error · offline |

That's the matrix that finds "buggy looks." Most defects in this app will be in the
**empty** and **overflowing** columns, because it has only ever been used with one
person's real, well-formed data. A stranger's first session is the empty column.

Playwright is installed but **no E2E specs exist yet** — an open gap from ImprovementPlan
Phase 4. Script this capture rather than clicking through it, and it doubles as the
visual-regression baseline REWORK_PLAN Phase 8 wants. One piece of work, two debts paid.

**A1b. Audit against the real data, not a clean fixture.** The live library is 203
recipes of which **199 carry the seed script's placeholder `prepTime: "20 mins"` /
`cookTime: "30 mins"` verbatim**, and there are **3 bake logs in total**. So the "typical"
column above is a lie unless you use production data: most rows read an identical 50 MIN,
and every iteration-history surface is nearly empty. `isPlaceholderTiming` in
[src/lib/duration.ts](src/lib/duration.ts) already recognises the placeholder — confirm
every surface degrades honestly rather than presenting seed data as measurement.
**This is also a publishing blocker — see the note on Phase 2.**

**A2. Catalogue the single-user assumptions.** These are the ones that matter most,
because they are invisible until a second user exists. Known already:

- **The UI branches on "am I the admin?", a global boolean.** `adminToken` in
  `localStorage` gates UI across **13 components** — AISubstitutionsModal, BakingMode,
  BasicInfoForm, BottomNav, Dashboard, EditorHeader, GroceryList, InstagramExporter,
  RecipeDrawer, RecipeEditor, RecipeViewer, Settings, Sidebar. In a multi-user app the
  question is never "am I admin?" — it is **"is this record mine?"** (per record) and
  **"what plan am I on?"** (per feature). That is a different *shape* of conditional, and
  it is spread across a third of the component tree. This is the single largest UI work
  item in the whole launch, and it is not a visual change at all.
- No surface anywhere for: sign in/up, account menu, profile, publish, published-vs-local
  state, moderation status, upgrade/paywall, sync status, storage usage.
- Copy is written for an owner who knows everything already. No first-run guidance beyond
  the landing page, and the onboarding modal assumes the library is yours.

**A3. Catalogue the visual defects.** Verified during this examination — start here:

| # | Finding | Evidence |
|---|---|---|
| 1 | Literal `"Loading photographs…"` text, violating the project's own skeleton rule | [RecipeEditor.tsx:809](src/components/RecipeEditor.tsx#L809) |
| 2 | **Three** different skeleton implementations in three different greys | `ui/Skeleton.tsx` · Dashboard's inline `bg-panel-sunk` · Gallery's inline `bg-key-unlit` |
| 3 | `Skeleton`, a *primitive*, is itself still on legacy tokens — which is why #2 doesn't match | [ui/Skeleton.tsx](src/components/ui/Skeleton.tsx) |
| 4 | Gallery uses `useState` + `fetch` instead of TanStack Query — violates the State Management rule, and has no cache, retry, or offline path. It will not survive the local-first rewrite. | [Gallery.tsx:128-135](src/components/Gallery.tsx#L128-L135) |
| 5 | 7 components still on "previous world" aliases the CSS marks *"do not add new uses"* | AISubstitutionsModal · PhotoSlider · RecipeDrawer · ReverseBakeScheduler · SideBySideCompare · TimerManager · ui/Skeleton |

**A4. Design language — settled, but finish the cleanup.** This was an open contradiction
until CLAUDE.md was rewritten; it is now decided and needs no re-litigation. The design
language is the **Step Row system** ([REWORK_PLAN.md](REWORK_PLAN.md)) — an early-80s
rhythm machine, colour strictly temporal (red = happening *now*, one per screen), one ban
(no glow except a lit key), two materials (`--faceplate`, `.scrim`). **Black & Gold and
glassmorphism were deliberately removed. Do not restore any of it.**

What remains is document cleanup, not a decision: **VISION.md** and **ImprovementPlan.md**
still describe the dead Black & Gold design. Correct or annotate them as part of Stage C.

`DESIGN.md` is owed by REWORK_PLAN Phase 8, written from the built artifact. Do not write
it here and do not write it early.

**A5. Inventory the design system — it is better than you think.**

- `src/components/ui/` already provides Panel/PanelRow, Button, Field/TextArea/Select,
  Sheet, SegmentReadout, StepRow, RecipePlate, RecipeTile, InstrumentRow, Meter, Skeleton.
  **Every new multi-user surface is assembled from these.** Anything that can't be is a
  gap to record now, not a licence to hand-roll inline Tailwind.
- **`src/designSystem.test.ts` fails the build** on ad-hoc `bg-gradient-to-*` or
  `backdrop-blur-*` in a component. The guard rail already exists — new surfaces inherit it.
- **Every overlay is a `Sheet`**, which carries the focus trap, Escape, focus restoration
  and counted scroll lock. Auth, publish, paywall and upgrade all inherit accessible
  overlay behaviour for free by using it. This materially shrinks Stage C.
- `/lab` is a live dev-only gallery of every primitive in its real states. **New primitives
  get added to it** — that is where the new multi-user components should be designed and
  reviewed before they are wired to anything.

#### Stage B — Question phase *(half a day of decisions, answered before any code)*

The audit produces facts; these produce direction. Answer all of them in writing at the
top of `.agents/UI_AUDIT.md`. The `/impeccable` skill in this repo is built for exactly
this conversation and should drive it.

**Identity and language** *(B1 was "rhythm-machine or Black & Gold?" — already settled by
CLAUDE.md. Step Row wins. These are what's genuinely still open.)*

- **B1.** Does the instrument metaphor hold for screens a machine wouldn't have — a
  sign-up form, a pricing table, a public profile, a comment thread? Where is the seam,
  and what governs the far side of it? *(Blocks most of Stage C — answer first.)*
- **B2.** CLAUDE.md calls the landing page *"the single **Persuade** surface in an
  otherwise **Operate** product."* Publishing adds more Persuade surfaces — `/r/:slug`,
  `/@handle`, pricing. Do they join the landing page's register, or does Operate extend
  outward to cover them?
- **B3.** Colour is temporal: red means *happening now*, one per screen. What colour, if
  any, may a **publish**, **upgrade**, or **sign-up** button take? Under the current rule
  the honest answer is *none* — a save button is not "now" — which means the most
  commercially important buttons in the app are deliberately quiet. Confirm that's
  intended, because it is unusual and it is right.
- **B4.** Does a published recipe seen by a stranger look identical to a local one seen by
  its owner, or does public reading get its own treatment?

**Ownership and trust — the multi-user core**

- **B5.** How does a recipe show that it's **yours** vs. **someone else's fork in your
  library**? One badge, a whole visual treatment, or a separate section?
- **B6.** How does a recipe show it's **local-only** vs. **published** vs. **published
  with unpushed local edits**? This is a three-state indicator on every card and header,
  and getting it wrong means people publish by accident — the one mistake that's hard to
  take back.
- **B7.** How do **moderation states** (pending, flagged, rejected) appear to the author
  without alarming them?
- **B8.** Attribution on a fork — how prominent? Legal-minimum footnote, or a first-class
  "adapted from @handle" line? (§3 of this plan leans on it heavily.)
- **B9.** Where does **sync status** live — persistent chrome, or only when something is
  wrong? *Recommendation: only when wrong. A permanent green tick trains people to ignore it.*

**Free vs. paid, without being obnoxious**

- **B10.** How do locked features present themselves — hidden, visible-but-disabled, or
  visible-with-a-teaser? *This is the decision that most determines whether the app feels
  generous or nagging.*
- **B11.** Where does the AI quota counter (`3 of 5 left this month`) live?
- **B12.** What does hitting the quota wall look like — modal, inline, toast?
- **B13.** How many upgrade prompts per session is acceptable? Pick a number and enforce it.
- **B14.** Does a Pro badge appear on public profiles? *(Vanity sells; it also stratifies
  a small community. Genuinely a judgment call.)*

**Strangers**

- **B15.** What does a brand-new, empty cookbook look like? Right now it looks broken.
  This is the single highest-leverage screen in the app and it currently doesn't exist.
- **B16.** First-run path: straight into an empty local cookbook, or into the global
  cookbook to fork something first? *Recommendation: the global cookbook — your 200 seeded
  recipes mean a stranger's first action can be "fork this," which is far easier than
  "create your first recipe from nothing."*
- **B17.** Where and how is the anonymous user told their data is device-only? It must be
  honest without being frightening.
- **B18.** What does the seamless claim moment look like, so it reads as gaining an account
  rather than risking the data?
- **B19.** Does the baking-mode / kitchen experience change at all for a non-owner? *(It
  shouldn't. Confirm.)*
- **B20.** Sign-in: full page, sheet, or modal? Reachable from where on mobile —
  `BottomNav` is already full.

**Navigation and structure**

- **B21.** `BottomNav` and `Sidebar` need "browse the global cookbook" and an account
  affordance. What gets demoted? Adding without removing is how navigation rots.
- **B22.** Are local and global one browsing surface with a filter, or two destinations?
- **B23.** Does Settings split into Account / App / Data / Operator?
- **B24.** `/lab` is already dev-only, so it needs no launch decision — but it *is* where
  every new multi-user primitive should be built and reviewed first. Confirm that's the
  working method for Stage C.

**Quality bar** *(several of these are already answered by CLAUDE.md — listed so they are
consciously carried into new surfaces rather than rediscovered)*

- **B25.** *Settled:* one `Skeleton`, composed from `src/components/ui`, never the word
  "Loading". Confirming it is what makes A3 #1–#3 fixable.
- **B26.** *Settled:* 44px for anything a thumb reaches repeatedly; `size="sm"` only for
  dense desktop chrome. The open part: does that hold on the genuinely new dense surfaces
  — comment threads, rating rows, browse grids — or do those need a different density?
- **B27.** *Settled:* no `alert()` / `confirm()` / `prompt()`; errors name the problem
  *and* the recovery. The open part: write the actual copy for the new failure modes —
  publish rejected by moderation, payment failed, sync conflict, quota exhausted.
- **B28.** Contrast and focus rings on the new surfaces, and screen-reader labels on
  icon-only buttons. Name the standard you're holding to (WCAG AA is the sane default).
- **B29.** What's the error-state pattern when the server is unreachable but local works
  fine? This is now the *normal* case, not an exception. The `api-stale` event already
  exists to build on — decide what it looks like when it's routine rather than alarming.
- **B30.** What are the loading rules when reads are instant (local) but publish and sync
  are slow (network)? Most current spinners become wrong: **a local read should never
  flash a skeleton at all.** Getting this wrong is what will make a local-first app feel
  slower than the server-backed one it replaced.

#### Stage C — Implementation *(the fixes; foundation before Phase 2, surfaces ride Phases 2–4)*

**C0. REWORK_PLAN Phase 8**, in full, first. `DESIGN.md` comes from there — written from
the built artifact, not from this plan's intentions.

**C1. Foundation — do this before any new screen exists.**

1. Correct **VISION.md** and **ImprovementPlan.md**, which still describe the dead Black &
   Gold design. CLAUDE.md is already fixed; these two are the remaining stale copies.
2. Retire the legacy aliases from all 7 components, then **delete the alias block from
   [src/index.css](src/index.css)** so the debt cannot regrow. The CSS already marks it
   *"do not add new uses"* — deleting it is what makes that enforceable.
3. One `Skeleton`, on current tokens; replace Dashboard's and Gallery's inline versions.
4. Kill `"Loading photographs…"` and any other loading text.
5. Move Gallery onto TanStack Query (required by Phase 1 regardless).
6. Fix everything the A1 matrix found in the **empty** and **overflowing** columns, and
   everything A1b found reading placeholder data as if it were measured.

**C2. The ownership refactor — the big one.**

Replace the global `isAdmin` boolean across all 13 components with `useSession()`
(who am I), `useOwnership(record)` (is this mine), and `usePlan()` (what may I do).
Purely structural, invisible when done right, and everything in Phases 2–4 depends on it.
Do it as its own commit series with tests, not smeared through feature work.

**C3. New surfaces**, built from `src/components/ui/` primitives, landing with the phase
that needs them:

| Surface | Lands with |
|---|---|
| Auth (sign in / up / verify / reset), account menu, Settings split | Phase 2 |
| Empty-cookbook first run, anonymous-data notice, claim moment | Phase 2 |
| Publish flow + preview, three-state published indicator, moderation states | Phase 3 |
| Global browse, `/r/:slug`, `/@handle`, fork affordance, ratings, comments | Phase 3 |
| Sync status, storage meter, quota counter, paywall, upgrade, Stripe return | Phase 4 |

**C4. Re-run the Stage A matrix** at the end of Phase 4, including every new surface.
The audit is a gate, not a one-off — the point is that the last screenshot matrix is
clean before anything is posted to Reddit.

**Ships as:** an app that looks designed rather than extended, and whose first-run
experience — the only one a stranger judges — is deliberate.

---

### Phase 1 — Local-first core *(weeks 1–3, the big one)*

This is the "local cookbook" and it is ~60% of the total engineering effort. Nothing else
works until this does.

1. **Client-generated IDs.** Switch `_id` from Mongo `ObjectId` to a client-generated
   **ULID** (`String` `_id` in every Mongoose schema). Offline-created records need real
   identities before they ever see a server. This is the breaking change that justifies
   the branch.
2. **Repository layer.** Insert `src/lib/repo/` between
   [queries.ts](src/lib/queries.ts) and [api.ts](src/lib/api.ts). Every hook calls the
   repo; the repo decides local vs. remote. Today `queries.ts` calls `api` directly —
   that coupling is what makes the app server-dependent.
3. **Generalize IndexedDB.** [localDB.ts](src/lib/localDB.ts) currently stores only bake
   logs in one store. Expand to: `recipes`, `bakeLogs`, `photos`, `pantry`, `notes`,
   `folders`, plus a `meta` store for sync cursors. Bump `DB_VERSION`, write the upgrade path.
4. **Photos as blobs.** Bake-log photos go into IndexedDB as `Blob`s, rendered via
   `URL.createObjectURL`. Compress client-side to WebP at max 1600px **before** storing —
   a 4MB phone photo becomes ~200KB. This one step is the difference between a viable
   free tier and a storage bill. (It also replaces the current data-URL approach in
   `saveLocalBakeLog`, which inflates every photo by ~33%.)
5. **Storage durability.** Call `navigator.storage.persist()` on first write and surface
   remaining quota in Settings. Browsers evict non-persisted origins; users must never
   lose a bake log to a cache sweep.
6. **Tombstones and timestamps.** Every record carries `updatedAt` and `deletedAt`.
   Deletes are soft. Sync in Phase 4 is impossible without this, and retrofitting it is
   painful — do it now even though nothing reads it yet.
7. **Export / import.** One-click `.zip` (JSON + photos) and restore. This is the free
   tier's backup story, a GDPR requirement, and an insurance policy against sync bugs.
8. **Retire the PIN from the write path.** Local writes are simply allowed. `ADMIN_PIN`
   narrows to meaning "site operator" — moderation queue, takedowns, metrics.

**Ships as:** an app that installs, works with no network and no account, and can't lose
your data. Genuinely launchable on its own.

### Phase 2 — Identity *(weeks 3–5)*

1. `User` model: `email`, `passwordHash` (argon2id, or bcrypt cost 12), `handle`,
   `displayName`, `emailVerifiedAt`, `plan`, `aiQuotaUsed`, `createdAt`.
2. **Sessions must move out of memory.** [auth.js](server/middleware/auth.js) keeps
   sessions in a `Map`, so every Render restart logs everyone out. Move to a `Session`
   collection with a TTL index, opaque token in an httpOnly cookie.
3. **Email sending.** Even with email+password you need verification and password reset.
   Resend free tier = 3,000/mo, 100/day — far beyond a few hundred users. Requires the
   domain from §3.
4. **Seamless claim.** On signup, the local cookbook is already there and simply becomes
   "yours" — no import prompt, no data movement, no moment where the user wonders if they
   lost something.
5. **Account deletion + data export** endpoints. Play requires deletion; the export is the
   Phase 1 zip, already built.
6. **Migrate the existing instance.** A one-shot script: assign every current recipe to
   your `ownerId`, then publish them to seed the global cookbook. A new user's first
   impression is 200 real recipes, not an empty shelf. This is the single highest-leverage
   asset you have that a competitor starting today does not.

   > **Blocker, found during the Phase 0 examination.** Of the 203 recipes, **199 carry
   > the seed script's placeholder `prepTime: "20 mins"` / `cookTime: "30 mins"`
   > verbatim**, so nearly every recipe claims an identical 50-minute total. That is
   > tolerable in a private instance where you know to ignore it. Published to strangers
   > it is a library that visibly isn't real, on the exact screen that decides whether
   > someone stays — and a sourdough recipe claiming a 50-minute total is *conspicuously*
   > wrong to the audience you're targeting.
   >
   > Fix the data before seeding: either correct the timings, or let
   > `isPlaceholderTiming` suppress the figure entirely on published recipes. Seeding with
   > 30 genuinely good, correctly-timed recipes beats seeding with 203 that advertise
   > their own placeholder. **Do not publish the library as-is.**

### Phase 3 — The global cookbook *(weeks 5–7)*

1. **`PublishedRecipe` collection** (snapshot, per §1):
   ```
   _id, authorId, authorHandle, sourceLocalId, slug,
   title, description, ingredients[], instructions[], tags[], imageUrls[],
   bakeLogSnapshot?, collectionId?,
   forkedFrom: { publishedId, authorHandle, title } | null,
   sourceUrl, sourceAttribution,
   moderation: { state, reason, checkedAt },
   stats: { saves, bakedCount, ratingSum, ratingCount },
   publishedAt, updatedAt, unpublishedAt
   ```
2. **Publish flow.** Preview → confirm → Gemini pre-screen → live. Screen checks: is this
   actually a recipe, is it spam or abuse, does it look copy-pasted from a commercial
   source. Clean submissions auto-approve; anything else lands in the admin queue.
3. **Attribution rule (important).** Your AI URL importer makes it trivially easy for a
   user to publish someone's food blog wholesale. Recipes created via URL import carry
   `sourceUrl`, and the publish screen **requires** either a visible source credit or a
   substantially edited body. Ingredient lists aren't copyrightable; headnotes and photos
   very much are.
4. **Fork to local.** "Save & edit" pulls a copy into IndexedDB with `forkedFrom` intact.
   The original shows a fork count. This is the loop that makes the global book feed the
   local one.
5. **Discovery.** Browse, tag filter, sort by recent / most baked / rating. Reuse
   `fuse.js` for client-side search over a cached index; a real text index can wait.
6. **Baker profiles** at `/@handle` — published recipes, bake count, a short bio.
   These are the pages people paste into Discord, which is free distribution.
7. **Ratings + "I baked this."** No free text, so no moderation cost.
8. **Comments.** Open to all users per your decision — see **Accepted risk** below.
9. **Public recipe pages are your SEO engine.** Each published recipe gets `/r/:slug` with
   server-injected `<title>`, OpenGraph tags and **schema.org Recipe JSON-LD**, so Google
   can show it as a rich result with photo, time and rating. This does not require
   Next.js and does not break the SPA rule in CLAUDE.md: add Express middleware that
   injects meta + JSON-LD into `index.html` for the `/r/:slug` route before serving it,
   and let React hydrate over it. It slots in right next to the existing SPA catch-all at
   [server/index.js:154](server/index.js#L154). Cheapest user acquisition available to
   you — every recipe your users publish becomes a landing page working for you indefinitely.
10. **Report + takedown queue** behind the operator PIN.

### Phase 4 — Sync, billing, quotas *(weeks 7–9)*

1. **Sync engine.** Deliberately boring: last-write-wins on `updatedAt`, a per-record
   `dirty` flag, tombstones for deletes, and a `since` cursor per device.
   `POST /api/sync` takes dirty records, returns everything changed since the cursor.
   **Do not build CRDTs.** The conflict case — the same baker editing the same recipe on
   two devices within seconds — is rare and low-stakes. Show "this recipe changed on
   another device" and let them pick.
2. **Photo sync** uploads blobs to Cloudinary, replaces local blob refs with URLs,
   keeps the local copy as cache.
3. **Stripe.** Checkout + Customer Portal (so you write almost no billing UI) and one
   webhook endpoint writing `plan` and `planExpiresAt` onto the `User`.
4. **Entitlements.** One `requirePlan('pro')` middleware, one `usePlan()` hook. Gate:
   sync, unlimited AI, posting bake results.
5. **AI quotas.** Per-user monthly counter, reset on the 1st. Free: 5 AI actions/month
   (import, substitution and NL search all draw from one pool). Paid: unlimited, soft-capped
   with an alert to you at an abuse threshold.
6. **Pricing.** $3/mo or **$24/yr**, annual preselected.
   At $3/mo Stripe's 2.9% + 30¢ takes **13%**; on an annual plan it's 4%. Push annual.

### Phase 5 — Distribution *(weeks 9–12)*

1. **PWA polish.** Install prompt, app shortcuts, offline page, maskable icons.
2. **Google Play.** $25 one-time, privacy policy URL, data-safety form, screenshots,
   signed release build. The APK path already exists (`npm run build:apk`).
   **Sell nothing inside the Android app** — no purchase UI, no link to pricing. Users
   subscribe on the web and sign in; this keeps you entirely out of Play Billing's 15%
   and out of its policy surface. (The Netflix model. Accepting an account that was
   upgraded elsewhere is fine; *linking* to your purchase page from inside the app is the
   part that isn't, in most regions.)
3. **Self-host / open source.** MIT or AGPL, `docker-compose.yml`, `.env.example`,
   a `SELFHOST.md`. Costs you nothing, earns credibility with exactly the Hacker News /
   r/selfhosted crowd who evangelize, and is a large part of why email+password beat
   Google Sign-In.
4. **Launch sequence**, in this order:
   - Baking Discords / The Perfect Loaf forum first — small, forgiving, high-intent.
     This is your bug-catching audience.
   - Then r/Sourdough and r/Breadit. **Read the self-promo rules first.** The post that
     works is "I got tired of losing track of why one loaf beat another, so I built this
     for my own bakes" with crumb photos, and the link *in a comment*. The post that gets
     removed is a launch announcement. Roughly one shot per subreddit — make it count.
   - TikTok/IG in parallel: your own bakes, app visible incidentally. Slowest, highest
     ceiling, compounds.
   - Show HN last, framed as the local-first, self-hostable angle rather than the recipes.

---

## 5. Money

### What it costs you

| Item | Cost |
|---|---|
| Render web service (free, UptimeRobot-warmed) | $0 |
| MongoDB Atlas M0 (512MB) | $0 |
| Cloudinary free (25 credits/mo) | $0 |
| Resend free (3k emails/mo) | $0 |
| Gemini Flash — free quota + moderation, ~300 users | ~$3–5/mo |
| Domain | ~$12–20/yr |
| Google Play, one-time | $25 |
| **Year one total** | **≈ $100** |

### Why the free tier can't hurt you

Free users store nothing on your server. Their entire cost is the bytes of the app bundle
and their AI quota, which is capped at 5 calls/month.

### When the ceilings actually bite

- **Atlas M0 (512MB).** A synced recipe is ~4KB, a bake log ~1KB plus image *references*.
  A heavy paying user runs ~3MB. That's roughly **170 paying subscribers** before M0 fills
  — about $4,000/yr of revenue against a $9/mo M2 upgrade. The ceiling is not a problem;
  it's a milestone.
- **Cloudinary (25 credits).** Bandwidth, not storage, is what runs out, and it runs out
  if one published recipe goes viral. **This is the ceiling that will actually hit first.**
  The exit is Cloudflare R2: 10GB free and, decisively, **zero egress fees forever**.
  Keep image URL construction behind [server/services/cloudinary.ts](server/services/cloudinary.ts)
  so the swap stays a day's work rather than a week's.
- **Render free (750 instance-hours).** An always-pinged service uses ~730. You have room
  for exactly one service — no second worker, no staging instance on the free plan.

### What it earns

At 300 active users and a realistic 5% conversion: 15 subscribers × $24/yr ≈ **$360/yr**.

Against ~$100/yr of costs that's cost-covering with a small margin — which is precisely
what you asked for. Be clear-eyed that this is not income; it's a project that stops
costing you money, and a portfolio piece that demonstrably has real users.

### Free vs. Proof Pro

| | Free | Pro — $3/mo · $24/yr |
|---|---|---|
| Local cookbook, unlimited recipes | ✓ | ✓ |
| Full offline, Baking Mode, timers, scheduler | ✓ | ✓ |
| Bake logs, photos, analytics | ✓ | ✓ |
| Publish to the global cookbook | ✓ | ✓ |
| Browse, fork, rate, comment | ✓ | ✓ |
| Export / import backup | ✓ | ✓ |
| **Cloud sync + backup across devices** | — | ✓ |
| **AI import, substitutions, NL search** | 5/month | Unlimited |
| **Post bake results on published recipes** | — | ✓ |
| Baker profile badge | — | ✓ |

Note that the free tier is deliberately generous and publishing is *not* paywalled —
free users publishing recipes is how the global cookbook grows, which is the thing that
makes the app worth paying for. Never charge for the behavior you want more of.

---

## 6. Accepted risk

Recorded, not re-argued. Your call stands in each case.

1. **Open comments are the unguarded flank.** Ratings are unmoderatable-by-design and
   bake-result posting is paywalled (payment being the strongest anti-spam signal there
   is) — but comments are free text, free tier, on public pages. That's the surface that
   attracts spam and worse. Cheap mitigations that don't change your decision: require a
   verified email, add a 24-hour account age gate, run the same Gemini screen on comment
   bodies, and rate-limit to ~5/hour.
2. **"Minimal legal" plus user-generated recipe content.** One thing I'd add back despite
   the minimal choice: **register a DMCA agent with the US Copyright Office (~$6, one
   form)**. It's the difference between being a protected intermediary and being the
   publisher of whatever a user pasted in from a food blog. Given the AI URL importer
   makes that paste one click, $6 is cheap insurance. Everything else — a full DMCA
   workflow, complete GDPR tooling — can genuinely wait.
3. **Email + password means you own breach risk.** argon2id, no password in any log, and
   rate-limit the login route the way `authLimiter` already rate-limits the PIN route.
   Chosen for good reason (self-host + no vendor lock-in), just don't cut corners on it.
4. **One breaking cutover.** The `ObjectId` → ULID change touches every model and route.
   The live Render deploy is part of your portfolio, so: branch, migrate a *copy* of the
   Atlas data, verify, then cut over. Keep the nightly JSON backup job running throughout.

---

## 7. Immediate next steps

1. ~~Update CLAUDE.md~~ — **done.** It now records multi-user as the committed
   destination, the Step Row design language, and the key decisions from this plan.
   Still stale and worth correcting: **VISION.md** and **ImprovementPlan.md**, which
   describe the removed Black & Gold design (Phase 0, C1.1).
2. **Finish REWORK_PLAN Phase 8** — it gates Phase 0 and produces `DESIGN.md`.
3. Pick the name and buy the domain (§3) — it blocks account email in Phase 2.
4. Cut `feat/public-launch`.
5. **Run Phase 0 Stage A** (the screenshot matrix against production data). It's two or
   three days, needs no decisions, and everything else is easier once it exists.
6. Answer Phase 0 Stage B in writing before any Stage C code.
7. Start Phase 1 item 1: ULID `_id` across the five Mongoose models, with tests.

**Two things to fix early, independent of everything above:** the 199 placeholder recipe
timings (they block seeding the global cookbook — see Phase 2), and the absence of any
E2E specs (Playwright is installed but unused; the Stage A matrix is the natural first spec).

---

*Written 2026-09-18.*
