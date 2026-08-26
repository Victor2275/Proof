# 2ndMind Mastermind Context

This document contains the complete current context for Victor Gusev. Treat this as the absolute source of truth.

## File: AGENTS.md

```markdown
# 2ndMind — AI Context Vault

Personal context for Victor Gusev. Read this file first; it tells you what else to open.

## Load order

1. **Always load:** `context/00_meta/core_profile.md` (identity) and
   `context/00_meta/ai_directives.md` (how to respond).
2. **Always check:** `context/04_operations/current_sprint.md` for what is active right now.
3. **Then load by topic** using the routing table below. Load only what the question needs.

Total across all live files is roughly 27 KB (~7k tokens), so loading everything is affordable
if the question is broad. It is not affordable to touch `99_archive/`.

## Routing table

| If the question is about… | Read |
|---|---|
| Who Victor is, school, year, timezone | `context/00_meta/core_profile.md` |
| How to respond, tone, domain mode | `context/00_meta/ai_directives.md` |
| Design, branding, colors, portfolio site | `context/00_meta/brand_and_voice.md` |
| Target roles, companies, locations, timeline | `context/01_engineering/career_targets.md` |
| Languages, tooling, OS, code standards | `context/01_engineering/technical_standards.md` |
| Courses, grades, academic background | `context/01_engineering/coursework_and_labs.md` |
| Physics labs, ESP32 instrumentation work | `context/01_engineering/labs/` |
| Jobs, internships, leadership roles | `context/01_engineering/experience/` (fast index: `experience_and_roles.md`) |
| Projects, portfolio, "what have you built" | `context/01_engineering/projects/` (fast index: `project_catalog.md`) |
| Dragon boat, erg, PRs, nutrition, recovery | `context/02_physical_performance/benchmarks_and_logs.md` |
| Workout programming, weekly split, tapering | `context/02_physical_performance/training_blocks.md` |
| Cooking, baking, recipes | **Proof** — https://proof-cdvj.onrender.com. Not in this vault. |
| CAD, 3D printing, makerspace, the Turret | `context/03_craft_and_creative/fabrication_and_cad.md` |
| This week's priorities, scheduling | `context/04_operations/current_sprint.md` |
| Applications, cover letters, interview prep | `context/04_operations/internship_pipeline.md` |
| Past sprints, parked automation ideas | `context/04_operations/logbook_archive.md` |
| The website, the web app, deploying it | `web/context.md` |
| Why the site looks/works the way it does; undoing a choice | `web/DECISIONS.md` |

## Rules for reading this vault

- **Never glob `context/99_archive/`.** It holds full lab reports, superseded resumes, and
  transcripts. Open a file there only when Victor names that specific document. The one-line
  summaries in `context/01_engineering/coursework_and_labs.md` are sufficient for every normal
  question.
- **Never read `context/assets/`.** Binary images only.
- **Never glob `web/`.** That is the Next.js app that renders this vault as a website. It
  carries its own `AGENTS.md` and `context.md` — read those instead. `web/node_modules/`
  will swamp any search that reaches it.
- **Check the `updated:` frontmatter field.** A file marked `stability: volatile` whose
  `updated:` date is more than ~14 days old should be treated as suspect — say so rather than
  presenting it as current fact.
- **Canonical sources:** career facts come from the per-entry files in
  `01_engineering/projects/`, `01_engineering/experience/`, and `01_engineering/labs/` —
  one file per project, role, or lab,
  structured data in frontmatter. `project_catalog.md` and `experience_and_roles.md` are
  **generated indexes**: read them for a one-file overview, never edit them. Same for
  `99_archive/resume.md`, and the `## Lab Experiments` section of `coursework_and_labs.md`.
  After changing any entry, run `python scripts/build_indexes.py`.
- **Dimaag.ai:** the technical specifics in `experience_and_roles.md` (PPO, Isaac Lab, LiDAR
  raycasting, sim-to-real validation, tracking accuracy) are shareable — use them freely.
  Anything beyond that documented scope is not recorded in this vault; say so rather than
  guessing at it.
- **Dates are ISO 8601.** Write new dates that way.

## When you change something

If Victor tells you a fact that contradicts this vault, or you notice something stale:
update the file, bump its `updated:` field to today, and say what you changed.

## Structure

```
context/
├── 00_meta/                  identity + behavioral directives
├── 01_engineering/           academics, standards, career targets
│   ├── projects/             one file per project (canonical)
│   ├── experience/           one file per role (canonical)
│   └── labs/                 one file per physics lab (canonical)
├── 02_physical_performance/  dragon boat training and benchmarks
├── 03_craft_and_creative/    cooking, CAD, fabrication
├── 04_operations/            sprints, internship pipeline, logbook
├── assets/labs/               extracted lab report images (binary)
└── 99_archive/                full lab reports, transcripts, superseded docs

web/                          Next.js app — public portfolio + private second brain
```

```

## File: web/context.md

```markdown
---
updated: 2026-08-25
domain: engineering
stability: volatile
summary: Project expectations for the 2ndMind web app — scope, architecture, conventions.
read_when: Working anywhere inside web/.
---

# 2ndMind Web — Project Context

Per `context/00_meta/ai_directives.md` §6, every new software project is initialized with a
`context.md` stating expectations. This is that file.

Design and architecture decisions are logged in `DECISIONS.md`, each with its reason and
reversal steps. Add to it rather than explaining a choice only in a commit message.

## What this is

Two surfaces over one markdown vault:

- **Public** — a portfolio host for hiring managers. Statically generated. Contains only
  whitelisted public fields. No database, no auth.
- **Private** — a second brain and daily logging tool for Victor alone. Auth-gated,
  server-rendered, reads and writes the vault.

Ships **2026-09-20**, the day UCLA fall term begins.

## Non-negotiables

1. **The vault at `../context/` is the source of truth** for projects, experience, coursework,
   sprint, standards, brand. Postgres holds only time-series that markdown handles badly:
   workout sessions, sets, erg results.
2. **Public routes must never import private loaders.** A test enforces this. Public pages are
   built from a field whitelist, so private data cannot reach the bundle even by accident.
3. **No screen requires typing markdown**, and every write path is under three interactions
   from the dashboard. If logging is slower than the app it replaces, it will not get used,
   and the whole project fails.
4. **Writes go through the GitHub Contents API**, not the filesystem. Vercel functions have an
   ephemeral read-only FS and no git binary. One commit per save; last-write-wins on conflict.
   *Reads* of single editable files go the same way; the one exception is the freshness audit,
   which walks 34 files on disk rather than making 34 API calls (DECISIONS.md D-022).
   That bulk read only works because `next.config.ts` widens the file-tracing root — see
   D-023, which was verified by counting traced files in the build output, not by assumption.
5. **Every write bumps the file's `updated:` frontmatter** so freshness stays honest without
   relying on discipline.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind v4 + shadcn/ui |
| Fonts | Self-hosted in `src/app/fonts/` — see below |
| Database | Neon Postgres + Drizzle |
| Auth | Self-hosted WebAuthn (`@simplewebauthn`), credential in env, no database |
| Vault I/O | `@octokit/rest`, `gray-matter`, `zod` |
| Tests | Vitest + Testing Library |
| Host | Vercel Hobby, `vercel.app` subdomain |

Budget is **$0**. Everything above must stay on a free tier.

## Auth is self-hosted, not Clerk

Original plan was Clerk passkey auth. Checked their pricing on 2026-08-20 while writing account
setup instructions: passkeys are Pro-only ($20-25/mo), not on the free Hobby plan, and it's an
ongoing cost, not one-time — well outside the $0 (max $5) budget. `@clerk/nextjs` has been
removed.

There is exactly one user, forever. That makes Clerk's actual job — multi-tenant identity,
org management, session UI for arbitrary sign-ups — pure overhead here. Auth is a WebAuthn
ceremony (`@simplewebauthn/server` + `@simplewebauthn/browser`) against one row in the Neon DB
holding Victor's registered credential, plus a signed session cookie. No vendor, no recurring
cost, no dashboard to configure. Built in Days 16-20 alongside the vault-write flow.

## Fonts are self-hosted on purpose

`next/font/google` fetches at build time. Significant parts of this project are written in a
car and on a 13-hour flight, so a network dependency in the build is unacceptable. The three
faces live in `src/app/fonts/` and load via `next/font/local`. Source files came from the
`@fontsource` packages; re-copy from there to add a weight.

- Display: Bricolage Grotesque (variable, headings only)
- Body: Instrument Sans (400/500/600)
- Data: IBM Plex Mono (400/500/600) — dates, splits, PRs, file paths

## Theme

Dark only in V1, per `context/00_meta/brand_and_voice.md`. V2's redesign replaced the original
teal/rose pairing: **magenta** (`#d94f93`) is the primary accent, **steel** (`#5484a4`) the
secondary, and peach (`#f6c992`) remains the single warm note — eyebrows and tier markers,
nothing structural — on near-black grounds carrying the magenta hue. The
dark palette lives in `:root` and `.dark` mirrors it, so adding light mode in V2 means
redefining `:root` and nothing else. `<html>` carries a hardcoded `dark` class.

The ground is deliberately not a flat fill: `<html>` paints the base colour and `body`'s
`::before`/`::after` layer three drifting radial pools plus an SVG-noise grain over it.
That is also why `body` must stay background-less — giving it an opaque background buries
both layers.

Motion is centralised as two custom utilities in `globals.css` rather than repeated Tailwind
chains: `card-scan` (lift, a magenta glow, and a trace sweeping across the card the way a scope
refreshes) and `link-wipe` (underline growing from the leading edge). Both, and the ambient
drift, collapse under `prefers-reduced-motion`.

## Testing expectations

`ai_directives.md` §6 requires automated tests after any feature. For V1 that means **unit
tests, no end-to-end suite** — the deadline does not allow both, and the bugs in this codebase
will live in pure logic, not in browser choreography. Required coverage:

- session signing and verification (forgery, tampering, expiry)
- frontmatter edits, including CRLF files and regex-metacharacter labels
- vault write path validation
- vault frontmatter parsers and zod schemas
- resume variant filtering (each variant includes and excludes the right entries)
- the public-field whitelist
- workout CSV parsing and PR derivation
- freshness thresholds, including parity with `scripts/audit_freshness.py`
- the database layer, against real Postgres (see below)

Run with `npm test`. Typecheck with `npm run typecheck`. **391 tests across 21 files** as of
2026-08-25, all passing. A drop from that count is a regression, not noise.

### Layout is checked by measurement, not by looking

`npm run shots` (dev server must be running) is the third gate. It sweeps the public pages at
four device widths reporting horizontal overflow, sub-40px tap targets and sub-12px text, and
it measures every resume variant against one printed Letter page. It exits non-zero on a
fault, so it can gate a commit. See D-077 — the resume ran at 1.33 pages for weeks because the
only check anyone ran was looking at it.

### The database tests are not mocked

`@electric-sql/pglite` is Postgres compiled to WASM. The suite runs the *committed migration
SQL* into a fresh in-memory database per test, then exercises the real queries. This is why
query functions take the handle as their first argument instead of importing a singleton.

It matters because the interesting bugs here are ones a mock cannot see: `numeric` columns
arriving as strings (so `"95" > "155"`), a re-import appending duplicate sets to an existing
session, `sum()` returning null for a bodyweight-only workout. Each of those has a test that
fails without its fix.

## Postgres holds what markdown cannot

Everything not listed here is markdown. Four tables live in Neon via Drizzle, with migrations
committed under `drizzle/` and applied with `npm run db:migrate`:

- `workouts` / `workout_sets` — training data, tabular and queried across rows.
- `tasks` — one model for everything actionable (D-037).
- `log_entries` — structured daily logging, per-category fields in JSONB.
- `bodyweight_entries` / `rehab_completions` — feature 5 (D-058, D-059).

Rules that hold the athletics side together, each with a decision entry:

- **Records are derived on read, never stored** (D-025). A stored PR has no invalidation
  story and reads high forever after a correction.
- **Imports are idempotent** (D-026). Hevy exports are cumulative, so re-importing is the
  normal workflow, not an accident.
- **Warmups are stored but never ranked** (D-029) — yet they *do* count toward volume, which
  is a deliberate asymmetry, not an oversight (D-060).
- **Splits are weight-adjusted with Concept2's formula** (D-057). The vault's one athletic
  goal is a weight-adjusted split, so raw splits alone cannot answer whether it is close.

The programme itself is not in the database and not in code. SPM targets, the rehab protocol,
the weekly split and the goal are parsed out of `context/02_physical_performance/` on each
request (D-056), so editing the vault changes the site with no deploy. Every parser returns
empty rather than throwing, and every panel names the heading it looked for — a parse miss has
to read as a parse miss, not as an empty box.

Health data is the category that must never become public — bodyweight above all. No public
route imports `lib/db` or `lib/athletics`, the public build has no `DATABASE_URL` at all, and
the built client chunks are scanned after each change with a positive control.


## Style guide — DECISION NEEDED

`ai_directives.md` §6 says Victor is unopinionated on style guides and that tradeoffs should
be outlined rather than chosen for him. Current state: ESLint via `eslint-config-next`, which
catches correctness but says almost nothing about formatting.

| Option | Gets you | Costs you |
|---|---|---|
| **Prettier + eslint-config-next** | Zero formatting arguments, one command, universal in the React world | One more dev dependency and a pre-commit hook to keep honest |
| **Biome** | Formatter and linter in one fast Rust binary; replaces Prettier and most of ESLint | Smaller ecosystem; some `eslint-config-next` rules have no equivalent |
| **ESLint only, no formatter** | Nothing new to install | Diffs fill with whitespace churn; formatting gets argued in review |

Recommendation: **Prettier**, because it is the boring choice and this project has 31 days.
Not installed yet — Victor decides.

## Known accepted issues

- `npm audit` reports 4 moderate advisories, all the same esbuild dev-server issue reaching us
  through `drizzle-kit`'s bundled loader. Dev-dependency only, does not affect the Next dev
  server or production. `npm audit fix --force` downgrades and breaks `drizzle-kit`. Left alone
  deliberately.
- `src/components/ui/form.tsx` is not vendored — the shadcn registry did not emit it. Its
  dependencies (`react-hook-form`, `@hookform/resolvers`) are installed; the wrapper is
  hand-authored when forms land.

```

## File: web/DECISIONS.md

```markdown
---
updated: 2026-08-25
domain: engineering
stability: volatile
summary: Dated log of design and architecture decisions for the web app, each with its reason and how to reverse it.
read_when: Before changing anything that looks deliberate, or when Victor wants something undone.
---

# Decision Log

Every non-obvious choice, why it was made, and **how to undo it**. Victor reviews the site
and reverses things; this file exists so reversing is a lookup, not an archaeology dig.

Newest first. When a decision is reversed, do not delete the entry — move it to
[Reversed](#reversed) with a note. The history of what was tried and rejected is the
useful part.

---

## 2026-08-25 · V2 rev 4 — the cut, and three features that fit inside it

### D-089 · Project updates live in markdown, and `writeVaultFile` finally gets a caller

**Decision.** The Working page's dated updates are stored as entries in each project's own
markdown file, written from `/private` through `writeVaultFile`. Not Postgres.

**Why.** The public site is statically generated and free. Updates in Postgres would make the
Working page the first public page needing a database, turning a static page dynamic for
content that changes weekly. Markdown keeps it static; the cost is that saving an update is a
commit plus a Vercel rebuild, so it appears in about a minute.

That is the right trade *here* and was the wrong one for tasks — D-036 moved those to Postgres
precisely because a commit-and-deploy per save made logging slower than the app it replaced.
The difference is frequency: tasks change many times a day, a project update perhaps weekly.

This makes V2 §7.9 the **first live caller of `writeVaultFile`**, dormant since D-036 and
exercised only by its own tests. A real `409` becomes reachable for the first time, so the
retry has to work. D-080 is unaffected: this is a human writing, not a model, so it needs no
approval gate, and nothing AI-driven writes to the vault in V2.

**How to reverse.** Move updates to a Postgres table and make `/now` dynamic. Expect to revisit
static export assumptions across the public build.

### D-088 · The Working page is built on `status: active`, not a new entity

**Decision.** A project appears on the public `/now` page when its frontmatter says
`status: active`. No new data model. Nav becomes About / Now / Projects / Resume.

**Why.** The schema has carried `status: active | archived` since the beginning. Reusing it
means `/now` and `/projects` cannot disagree — a project cannot be in progress on one page and
finished on another — and it means the page costs 6h instead of 9h.

The alternative, a separate list, buys the ability to show motion on work that will never be a
portfolio project: coursework, this vault, one-off experiments. That is a real gap, but it is
**additive** — a separate list can be added later without moving anything that exists — so
adding it speculatively now would be paying for an option before knowing it is wanted. Recorded
in `V3_PLAN.md` §2.

**How to reverse.** Introduce a `working` entity and read from it instead; `/projects` is
unaffected either way.

### D-087 · Semantic search is cut, and this time it stays cut

**Decision.** Semantic search leaves V2 and moves to `V3_PLAN.md` §2 as recorded-but-unscheduled.
The Working page, the public→private button and read-only job-sheet access take its place.

**Why.** It has now been evaluated three times. Rev 1 cut it on **cost** ($10 of credit). Rev 2
reinstated it when the budget turned out to be $10 *per month*, which removed that objection.
Rev 4 cuts it on **time**, which was always the real constraint: at 12h it was the largest item
in V2 and the only remaining Hard one, and Victor rated it the lowest-frequency capability in
the plan.

The arithmetic is the argument. Three requested features cost 11.5h; semantic search cost 12h.
Trading them left V2 **shorter** than before the features arrived, with slack going from ~19%
to ~34%. Victor offered extra hours to fit everything; they were declined and held in reserve,
because eleven consecutive 6h days ending the day before move-in is how the last week of a
deadline goes wrong.

Nothing had been built, so nothing was wasted.

**How to reverse.** It is intact in `V3_PLAN.md` §2 with its design notes — Postgres vectors,
re-embed only on `updated:` change, hard token ceiling, private-only surface.

---

## 2026-08-25 · Closing out "Today"

### D-086 · A failed summary is not cached, and a missing key never reaches the cache

**Decision.** `cachedSummary` throws when `callModel` returns `ok: false`, and
`generateDailySummary` catches it and turns it back into a message. A missing or placeholder
`GEMINI_API_KEY` is checked *before* the cache and short-circuits, like the empty-day case.

**Why.** `unstable_cache` stores whatever its function returns, and `callModel` deliberately
returns failures as values rather than throwing (so a nice-to-have panel cannot 500 the
dashboard). Composed naively those two correct decisions produce a wrong one: a single 404 or
rate limit pinned "the summary could not be generated" to the dashboard for the full six-hour
TTL, long after the cause had gone. A rejected promise is not stored, so throwing at the cache
boundary means only successes occupy it.

The key check moved out for a second reason: `unstable_cache` needs a Next request context, so
anything behind it cannot be tested outside one — the first version of the test got
`Invariant: incrementalCache missing` and the too-broad catch reported it as a summary
failure. A missing key is a configuration state, not a model failure. There is nothing to
memoise about it.

**How to reverse.** Return the result instead of throwing, and put the key check back inside
`callModel`. Accept that a transient failure sticks for six hours.

### D-085 · `gemini-2.5-flash` is retired; the model id is `gemini-3.6-flash`

**Decision.** `MODEL` is exported from `lib/ai/gemini.ts`, is `gemini-3.6-flash`, and is what
the dashboard panel prints as its `meta`.

**Why.** Every call was returning `404 — "This model models/gemini-2.5-flash is no longer
available to new users"`. The API names its own replacement, which is where the new value came
from. The daily summary had been silently degrading to its fallback string, because
`callModel` catches everything: **a retired model does not fail loudly here.** Found only by
reading the dev server log while screenshotting the page for D-084.

That is also why the panel now prints the live `MODEL` constant rather than a hardcoded
"Gemini 2.5 Flash" label — the label had already drifted from the truth once.

Two tests guard it: one asserts the id still contains `flash` (the budget is ~$10/month), one
asserts it is not the retired string.

**How to reverse.** Change the constant. Nothing else references a model name.

### D-084 · The task list comes before the numbers that describe it

**Decision.** `/private` orders as: schedule (when there are events), the Due list, a compact
three-across stat row, goals, backlog, finished, and the AI summary last. The stats no longer
stack on a phone, and their hints are hidden below `sm`.

**Why.** Feature 3 was "largely built" and had never been reviewed against the question it
exists to answer: *what do I do now*. Measured at 390px, **the first task sat 791px down the
page** — past the fold on any phone. What occupied that space was a failed AI panel (~170px
saying it could not generate a summary) and three stat cards stacked into ~290px to show three
zeros. Two of those three restate what the panels below already say: "Due today" is the length
of the very next list, and "Done today" is the count in "Finished today". So the page opened
with a summary of the answer and put the answer below the fold.

The AI summary moved to the bottom because it answers "how did today go", not "what do I do
now", and because it is the slowest thing on the page — last means the network round trip is
the thing nobody is waiting for. When it fails it now gets one muted line rather than a panel:
still shown, because a silently missing summary is a key nobody notices is broken, but at the
weight the message deserves.

After: **356px.** No panel was deleted and nothing was built — the review was the feature,
exactly as V2_PLAN predicted.

`SkeletonStats` was updated to match the new grid. When the two drifted, three stacked
placeholders collapsing into one row moved the page ~200px under the reader's thumb as the
tasks resolved.

**How to reverse.** Move the blocks back in `app/private/page.tsx`; they are three
independent JSX chunks. Put `sm:grid-cols-3` back on the stat row and the skeleton together.

### D-083 · `shots` signs its own session and gates the fold

**Decision.** `npm run shots` now sweeps `/private` and `/private/log`, minting a session
cookie from `SESSION_SECRET` (loaded via `--env-file-if-exists=.env.local`). It reports how far
down the page the first task sits and **exits non-zero above 500px** on a phone width. Skipped
silently when the secret is absent, or with `SHOTS_PRIVATE=0`.

**Why.** `/private` is the page Victor opens most and the only one he uses on a phone daily,
and it was the one page nothing could see — behind a passkey, so the sweep stopped at the
sign-in screen. That is how 791px survived. The session is an HMAC over a JSON payload, so a
valid cookie can be minted from the same secret the app verifies against; the secret is
already on this machine, the server is this machine, and the minted token lives fifteen
minutes rather than the app's seven days.

500px because a 390×844 phone shows roughly 690px once browser chrome is subtracted. The gate
was verified in both directions — lowered to 300px it fails with exit 1, restored to 500px it
passes with exit 0. A gate that has never fired is not known to be a gate.

The script also reports a redirect to `/signin`, so a rejected cookie cannot silently become a
screenshot of the sign-in page recorded as a healthy layout.

**How to reverse.** Delete the private block and `data-task-list` from `task-list.tsx`, and
drop `--env-file-if-exists` from the `shots` script.

---

## 2026-08-25 · The case-study page

### D-082 · Project sections are stored in narrative order, not reordered at render

**Decision.** `scripts/order_case_study_sections.py` puts each project file's sections into
the order a case study reads in — problem, what was built, what did not work, what it
measured, then anything else. Five of six files moved. The renderer then displays them in
file order, with no reordering of its own.

**Why.** Four files opened with `## Architecture` and reached `## The problem` third, because
the D-073 skeleton was appended to files that already had an architecture paragraph. That is
invisible today only because the misplaced sections are all still unwritten and
`dropUnwritten` removes them — it stops being invisible the moment the prose lands, which is
why this ran before Victor writes rather than after.

Reordering in the renderer was the alternative and is worse: the public page would then
disagree with the file, which breaks the one rule this vault runs on. The vault is also read
directly by AI agents, so a file that reads in the wrong order is wrong for them too, not just
for the website.

The script moves whole sections and never edits a line inside one. Verified by comparing the
sorted set of non-blank lines before and after: identical for all six files. It is idempotent,
and `--check` reports drift without writing.

**How to reverse.** Move the sections back by hand; nothing depends on the order but reading.

### D-081 · A case study is styled by role, and the results carry the weight

**Decision.** `CaseStudy` renders a project body by mapping each `##` heading to a role and
giving each role its own treatment. `Measured results` gets the primary magenta, a panel, and
its numbers wrapped in mono; `What did not work` gets the steel secondary and a panel of its
own; the problem and the architecture are plain. Sections carry a mono index and a rule to the
edge. Everything else falls through to plain `Prose` exactly as before.

**Why.** Every section was styled identically, so the one number Victor measured and the one
thing he abandoned looked exactly like a paragraph about the stack. Those are the two sections
an engineer actually reads: results are the payload, and "what did not work" is the section
almost no student portfolio has at all.

Three rules make the half-written states — which is most of the portfolio until the write-ups
land — look deliberate rather than broken:

- **A section keeps its own heading.** The role picks the colour and the container, never the
  wording. `solenoid-bit-reader` still says "Design decisions" and "Results", because D-073
  kept that wording on purpose and a renderer quietly retitling an author's section is an
  editorial act disguised as styling.
- **The index counts sections that are present**, not the role's slot in the skeleton.
  Numbering by role would print `01 03 04` on a half-written project, advertising exactly the
  gap `dropUnwritten` exists to hide.
- **One section is still a case study**, and is rendered without an index — it does not need
  to be told it is the first of one.

Failure is steel, not red. This section is evidence of judgement; colouring it like a warning
would say the opposite.

Number emphasis is opt-in on `Prose` (`numbers`) and used only inside a results panel. `Prose`
also renders experience entries, lab write-ups, the private calendar's rules and every vault
document, and highlighting every figure across those would be noise where it is signal on one
panel. A test asserts the marked-up text is character-identical to the plain text — altering a
measured figure on a portfolio page is the D-069 failure mode with extra steps.

Verified against `solenoid-bit-reader` plus throwaway one-, two- and four-section fixtures at
390px and 1280px, since solenoid alone is one section from complete and cannot show the
partially-filled case. The fixtures were deleted immediately; they were never committed.

**How to reverse.** Put `<Prose>` back in `projects/[slug]/page.tsx` and delete
`case-study.tsx`, `lib/vault/case-study.ts` and the `numbers` prop. Bodies then render as an
undifferentiated run of headings again.

---

## 2026-08-25 · V2 replan and the resume gate

### D-080 · The AI approval gate is over proposals, not over a markdown diff

**Decision.** Feature 6's approval surface reviews a **typed list of changes** — a before and
an after per item, approved or rejected individually — rather than a rendered diff of two
markdown documents. `writeVaultFile` stays dormant through V2; nothing AI-driven writes to the
vault at all.

**Why.** V2_PLAN rev 1 specified a markdown diff and justified building it first because
"draft sprint goals depends entirely on the approval UI". That dependency does not exist.
Sprint goals are Postgres rows: `saveSprintGoals` → `replaceGoals` writes `tasks` rows with
`source='goal'` (`src/app/private/actions.ts:144`). Nothing about goals touches markdown.

Following rev 1 would have spent 10h — the largest single item before the deadline — building
a markdown-diff UI that **no V2 feature calls**: goals write rows, resume tailoring writes
nothing, semantic search reads. It would have shipped a code path exercised only by its own
tests, which is the exact condition (`writeVaultFile` dormant since D-036) the plan named as
its own risk.

The constraint Victor set — *nothing writes on a model's say-so* — is unchanged and is in fact
satisfied more strongly this way, because in V2 the model cannot reach the vault at all.

**How to reverse.** Build the diff view and give `writeVaultFile` a caller. Do it in that
order and only once something genuinely drafts markdown; a writer whose first job is
case-study prose collides with D-073 and needs Victor's explicit sign-off, not an agent's
judgement.

### D-079 · Semantic search is reinstated; the cut line moves to its re-embedding

**Decision.** Feature 6 keeps all four capabilities including semantic search. It stays last
in build order. The declared cut is now, in order: (1) drop incremental re-embedding for
on-demand full re-index, (2) drop the feature.

**Why.** Rev 1 cut it on cost, against "$10 of credits, total, for the life of this". The
budget is **$10 per month**. Cost was the objection, so the cut lapses — but a plan without a
declared cut line decides under pressure, so a new one is named with a dated trigger (V2_PLAN
§2.4). Reinstating 12h is affordable only because D-080 gave back 7h; the two are linked.

**How to reverse.** Take cut 1, then cut 2.

### D-078 · Coursework is four entries, and it is shared by every variant

**Decision.** `coursework:` in `resume_config.md` drops from seven to four — Algorithms and
Complexity, Software Construction, Object-Oriented Design, Linear Algebra. Dropped:
Programming Languages, Discrete Structures, Logic Design.

**Why.** The SWE variant printed at 1.03 pages and coursework is the lowest-signal content on
the sheet. Worth knowing before editing it: this is **one flat list consumed by all three
variants** (`src/lib/resume.ts:126`), so the trim shortened ml and robotics too. That was
acceptable — both had room — but a variant-specific coursework line would need a schema
change, and was judged not worth it for one line of text.

Measured: the trim alone moved swe 1.03 → 1.01, i.e. it recovered ~19px of the ~29px needed.
It did **not** close the gap on its own, which is why D-076 exists.

**How to reverse.** Put the three back. Expect swe to return to 1.01 and check with
`npm run shots`.

### D-077 · The resume's page count is measured, not eyeballed

**Decision.** `npm run shots` measures every resume variant against one printed Letter page
and exits non-zero if any runs over. Two numbers per variant: `pages`, from Chromium's own PDF
writer at Letter/0.5in — the same path as the print dialog Victor actually uses — and `ratio`,
the print-emulated sheet height over one page. A print-media PNG is written alongside the PDF.

**Why.** V2_PLAN rev 1's completion test for the resume was "`shots.mjs` reports every variant
under 1.00 pages". `shots.mjs` could not do that: it measured horizontal overflow, tap targets
and font size, and only ever loaded `/resume/swe`. The plan's own rule is *measure, do not
assume*, and its completion test assumed a measurement that did not exist. The resume printed
at 1.33 pages for weeks for exactly this reason.

`ratio` is there because it is the number that makes an overflow *fixable*: "1.03" says trim a
line, "2 pages" says nothing. Two attempts at measuring it were wrong before the third was
right, and both failure modes are worth remembering — `documentElement.scrollHeight` never
reports less than the viewport, so every variant that fit read exactly 1.00; and `main`
carries `flex-1` inside the layout's flex column, so it is stretched to the viewport whatever
it holds. Both measure the window, not the content. `.resume-sheet` is the only element whose
height is the content's. The fixed version independently reproduced the three figures rev 1
had recorded by hand (1.03 / 0.98 / 0.90), which is what says it is right.

Only `swe` is screenshotted at the four device widths. The three variants are one component
fed different data, so a mobile layout fault appears in all of them identically; what differs
between variants is length, and length is what the new measurement covers.

**How to reverse.** Delete `measureResumes` and its call. Page count returns to being checked
by printing the page and counting.

### D-076 · Bullet leading, not bullet count, closed the last 13px

**Decision.** Print bullet `line-height` 1.26 → 1.20, and `.resume-sheet section` margin-top
0.5rem → 0.375rem. Font sizes are unchanged.

**Why.** After D-078 the SWE sheet still measured 973px against 960 available. Probing where
the height actually went: 17 bullets over 27 rendered lines were 432px — **44% of the page** —
so leading there is worth more than anything else on the sheet, and it costs no content. The
alternative levers were both worse: `main` and `.resume-sheet` padding are already zeroed in
print, and everything else on the page is text Victor wrote.

The 9.6pt floor from the earlier density pass is deliberately untouched. Leading is
whitespace; type size is legibility, and shrinking it further is how a resume starts looking
like it is hiding from its own length.

Result: swe 0.98, ml 0.93, robotics 0.86 — all one page, with headroom rather than sitting at
0.999 where the next added bullet breaks it again.

**How to reverse.** Both values back to 1.26 and 0.5rem. swe returns to two pages.

---

## 2026-08-24 · Mobile and case studies

### D-075 · A hover-only affordance must not occupy space without hover

**Decision.** The "Read more →" hint on a project card is `hidden` and becomes `block` only
under `@media (hover: hover)`.

**Why.** It was `opacity-0` with `group-hover:opacity-100`, which still reserves its box. On a
phone that is roughly 32px of permanently invisible space per card — six cards, no touch user
could ever resolve any of it into text. Opacity hides ink, not layout.

**How to reverse.** Drop the `hidden [@media(hover:hover)]:block` pair and accept the empty space.

### D-074 · Only a real photograph earns a figure

**Decision.** Project cards and detail pages render an image only when one exists. Without one,
a card gets a 1px accent rail instead of a 16:9 generated placeholder.

**Why.** Five of six projects have no photograph, and the generated stand-in cost about 180px
each. Measured, the projects page ran to **6,150px on a 390px phone** — most of it decorative
charts of nothing, above the actual writing. It is now **3,950px**, and the one project that
does have a photograph reads as the strongest by contrast rather than being lost among five
lookalikes.

The `ProjectFigure` placeholder generator is kept, not deleted: it is still the right thing if
a future layout wants a uniform grid.

**How to reverse.** Render `ProjectFigure` unconditionally again.

### D-073 · Case studies are skeletons in the vault, and unwritten sections do not publish

**Decision.** Every project file carries the four sections Victor chose — the problem and its
constraint, architecture, what did not work, measured results. Unwritten ones hold a
`> **To write:** …` prompt. `dropUnwritten` strips those prompts *and* removes any heading left
with nothing under it, so the public page shows only what he has actually written.

**Why.** The write-ups are 24–80 words. A case study needs content, and content that is not
recorded cannot be produced by an agent — the water bottle scale (D-069) is what that looks
like when it goes wrong. So the structure is built and the prose is Victor's to add, in the
file where he already edits.

Publishing an empty `## Measured results` would be worse than having no section: it advertises
a gap. Publishing the prompt itself would be worse again — a portfolio page asking its own
author what he tried that failed.

Two bugs found while building it, both fixed and pinned by tests:
- The prompt matcher caught only the opening line of a blockquote, so the *wrap* of each prompt
  was published as if it were prose. Prompts now run to the end of their quote.
- `water-bottle-scale.md` had a "Still to write up" list that was publishing its own gaps. It
  now uses the same convention as every other file.

`solenoid-bit-reader.md` keeps `## Design decisions` and `## Results` rather than gaining
duplicates: it already answers both questions, with a real measured number.

**How to reverse.** Delete `dropUnwritten` and the skeleton sections. Bodies then publish
verbatim, prompts included.

---

## 2026-08-24 · V2 close-out decisions

### D-072 · A local browser is the only MCP server

**Decision.** `.mcp.json` runs `@playwright/mcp` locally, isolated, at a 1280×900 viewport.
Nothing else is configured.

**Why.** Two of the remaining tasks — resume design and the mobile layout pass — are purely
visual, and until now the site has only ever been verified by grepping built HTML. That caught
fabricated content and privacy leaks, but it cannot answer "does this look right", which is the
actual question for both jobs.

Local matters more than the capability. The repo is private and holds health data; a browser
driven on Victor's own machine sends nothing anywhere. The alternatives considered — Sentry,
Semgrep, Datadog, a Neon MCP — all ship code, telemetry or query results to a third party, and
three of them imply paid tiers against a $0 budget. Sentry alone remains defensible later, and
would need scrubbing rules before it touches the private site.

`--isolated` so no browser profile persists between runs, and no cookie or session from ordinary
browsing is reachable from an automated one.

**How to reverse.** Delete `.mcp.json`. Verification returns to inspecting built output.

### D-071 · The whole log, health included, may be sent to the model

**Decision.** The AI summary sends everything: sprint goals and all six log categories,
athletics and bodyweight among them. Asked directly, Victor chose this over excluding health.

**Why.** It is his data and his call, and a summary that silently omits training is a summary of
a fraction of his day.

**This does not loosen the publication rule, which is unchanged and absolute.** Health data must
never reach a public page. The two are different acts: one sends data to an API under Victor's
own key for a private page only he can see; the other bakes it into a world-readable static
bundle. A future agent reading "everything goes to Google" as licence to publish bodyweight
would be misreading this entry.

Practical consequences worth stating: prompts leave the machine, so anything sent is subject to
Google's retention, and the summary is cached — meaning health-derived text sits in the Next
cache alongside everything else.

**How to reverse.** Filter by category in `AiSummary` before building the prompt. The
`summarise()` output is already per-category, so the filter is one predicate.

### D-070 · Feature 6 gets all four capabilities, summaries first

**Decision.** Read-only summaries, draft-sprint-goals behind an approval diff, resume tailoring,
and semantic search — all four, built in that order, after the public-site work.

**Why.** Victor picked the public site as the priority for the pre-term window: the resume is
what gets him interviews and fall recruiting is imminent, whereas feature 6 is for him alone and
fits the 4h/week he will have during term.

On cost, he judged the $10 sufficient — semantic search will be used rarely and Flash is cheap.
That is a real constraint rather than a guess, so embeddings must be cached and re-embedding
must be incremental, not a full pass on every vault edit.

Draft-sprint-goals is what forces the approval-gated write UI to exist. That gate is
non-negotiable: nothing writes to the vault on a model's say-so.

**How to reverse.** Build only the summaries and drop the rest; nothing else depends on them.

---

## 2026-08-24 · Review of external changes

### D-069 · Nothing on the public site may be inferred, only recorded

**Decision.** Project entries state what Victor has told us and nothing else. Where detail is
missing the file says so under a "Still to write up" heading and carries `draft: true`, which
keeps it on the portfolio but off every resume.

**Why.** The water bottle scale entry was rewritten with invented specifics — an ESP32 (Victor
said Arduino Uno), an HX711 amplifier, "±2g accuracy", a 5-second-window state machine and MQTT
streaming — and marked `draft: false` with `resume_variants: [swe, robotics]`. All of it reached
the built portfolio and two resume pages. Fabricated technical detail on a hiring-facing
document is the worst failure this project can produce: it is discovered in an interview, by
someone asking a follow-up question.

The previous placeholder had listed exactly what needed filling in. Those prompts became the
fabrication — "one measured number: accuracy in millilitres" became "±2g accuracy".

**How to reverse.** Fill the entry in with real detail from Victor, then set `draft: false` and
add resume variants. Do not do it the other way round.

### D-068 · `experience[0]` is "most recent", never "now"

**Decision.** The homepage spotlight is headed "Most recent" and prints the entry's real
`dateEnd`.

**Why.** It was headed "What I'm working on now" with a hard-coded `— Present`. Dimaag.ai's
vault entry says `date_end: 2026-08`, so the public site told every hiring manager that a
finished internship was ongoing — a claim about employment produced by a string literal and an
array index.

The "what I'm working on now" section Victor actually asked for is about current *work* —
2ndMind, coursework — and is still unbuilt. Reusing the experience list for it was not the same
feature.

**How to reverse.** Only with a field that says a role is current, and only driven by data.

### D-067 · The AI summary is cached and reads the live log

**Decision.** `generateDailySummary` wraps the model call in `unstable_cache` (6h TTL, tag
`ai-summary`) keyed on the prompt, and the dashboard feeds it today's `log_entries` rows plus
the sprint goals section — not `logbook_archive.md`.

**Why.** Two defects. The call sat uncached on `/private`, which is `force-dynamic` and the page
Victor opens most, so every load re-summarised an unchanged day against a $10 lifetime credit
budget. And it summarised the *retired* free-text logbook — the thing feature 2 replaced and
Victor asked to rework or delete — so it described a system he stopped using while ignoring
everything he has written since.

Keying the cache on the prompt rather than on time means a real change in goals or log produces
a new summary immediately; only repetition is free.

**How to reverse.** Call `callModel` directly and pass whatever context is wanted.

### D-066 · `app/error.tsx` shows a digest, not a message

**Decision.** The message is rendered only in development; production shows the digest.

**Why.** This boundary sits at the root of `app/`, so it covers the public portfolio. Next
redacts server-thrown messages in production, but anything thrown in a client component arrives
verbatim — and this page is reachable by anyone. A digest locates the real trace in the Vercel
logs and tells a passer-by nothing.

It is deliberately **not** renamed to `global-error.tsx`. That file replaces the root layout,
must render its own `<html>`/`<body>`, and fires only for errors thrown in the layout itself.
Renaming would trade the boundary that catches nearly everything for the one that catches the
rarest case. Both may exist; one may not become the other.

**How to reverse.** Render `error.message` unconditionally, and accept that public visitors see
internal strings.

### D-065 · Structure is parsed, text is edited by offset

**Decision.** `frontmatter.ts` locates sections and bullets with an mdast parse, then edits the
located byte range as text rather than re-printing the tree.

**Why.** This closes a real corruption bug: a `##` inside a fenced code block used to terminate
a section, so replacing an earlier section left a dangling fence and a fake heading behind. A
regex cannot tell that a line is inside a fence. Measured on the old implementation before the
change, so the benefit is established rather than assumed.

Editing by offset, not re-printing, because `mdast` round-tripping normalises whitespace, list
markers and emphasis characters — rewriting parts of a file nobody touched and making every
diff unreadable.

Note what this does *not* do: `setLabelledBullet`, `getLabelledBullet` and `setFrontmatterField`
still use the same regexes as before, now applied inside a narrowed range. The `m`-flag and
CRLF traps therefore still apply, which is why the module header still documents them.

**How to reverse.** The pre-AST implementation is at commit `4fe26eb`. Reverting reintroduces
the code-fence bug.

### D-064 · No client runtime in the root layout without a caller

**Decision.** `<Toaster />` removed from `app/layout.tsx`.

**Why.** It was mounted globally while nothing in the codebase calls `toast()`. That shipped a
client component — and its hydration cost — to every page including the statically generated
public portfolio, for zero functionality. The public site's whole value is arriving as finished
HTML.

**How to reverse.** Add it back at the same time as the first `toast()` call, and preferably in
the private layout rather than the root one.

---

## 2026-08-22 · Athletics depth (feature 5)

### D-063 · The `db:migrate` script loads `.env.local` itself

**Decision.** `node --env-file-if-exists=.env.local ./node_modules/drizzle-kit/bin.cjs migrate`.

**Why.** `drizzle-kit` does not read `.env.local` the way Next does, so `npm run db:migrate`
failed with an empty `url` even with the variable sitting right there in the file. Every
migration therefore needed a remembered incantation, which is exactly the kind of friction
that ends with migrations not being run.

**How to reverse.** Put `"drizzle-kit migrate"` back and set `DATABASE_URL` in the shell first.

### D-062 · The Los Angeles offset is computed, not hard-coded

**Decision.** `zoneOffsetMinutes(now, timeZone)` in `lib/tasks/queries.ts`, replacing the
`const LA_OFFSET_MINUTES = 420` repeated in three pages.

**Why.** 420 is only correct while Los Angeles is on daylight time. It would have gone wrong
on **2026-11-01**, during term — and quietly: "today" would have begun at 11pm the night
before, filing every late-evening task and log entry under tomorrow for the whole of winter.
The new function formats the instant in the zone and reads it back as UTC, which is the only
way to get a real offset without shipping a timezone database.

**How to reverse.** Pass a literal offset to `dayBounds` again. Do not — the constant is wrong
for five months of the year.

### D-061 · Charts are server-rendered SVG, not `recharts`

**Decision.** `components/site/chart.tsx` draws `TrendChart` and `BarChart` by hand. `recharts`
stays unused in `package.json`.

**Why.** These are one `<polyline>` each. Using the library would add a client boundary and a
charting runtime to a page that currently arrives as finished HTML, turning a streamed render
into one that waits for hydration — the exact regression D-045 was written to prevent.

**How to reverse.** `recharts` is already installed; replace the two components. Accept that
the athletics page then ships JavaScript to draw its charts.

### D-060 · Warmup sets count toward volume but never toward a record

**Decision.** `weeklyVolume` deliberately does not apply `isWorkingSet`; `strengthRecords`,
`ergRecords` and `flagSpm` all do.

**Why.** Victor was asked directly and said volume should include warmups — they are load the
body absorbed. A record set by a warmup, though, is not a record. This was V1 finding F10,
where the two rules were inconsistent by accident rather than on purpose; they are now
inconsistent on purpose, which is different, and the test says so.

**How to reverse.** Add `if (!isWorkingSet(effort)) continue;` to `weeklyVolume`.

### D-059 · The rehab checklist is its own table, not `tasks`

**Decision.** `rehab_completions`, keyed `(completed_on, slug)`.

**Why.** D-037 merged everything actionable into `tasks` so there would be one list to read.
Four rehab items every day is ~1,400 rows a year, which would bury the thing D-037 was
protecting. A daily-recurring checklist is a different shape from a to-do: it is never "done",
only "done today".

**How to reverse.** Insert four `tasks` rows a day with `source: "rehab"` and delete this
table. Expect the task list to become unreadable within a fortnight.

### D-058 · Bodyweight is a table, and it is health data

**Decision.** `bodyweight_entries`, one row per day, `date` rather than `timestamp`.

**Why.** It is the second input to every weight-adjusted split on the site, so "the weight
closest to this piece" has to be an indexed lookup rather than a scan through JSONB. `date`
because a weigh-in belongs to a morning, not an instant — storing days as timestamps is what
forces the noon-UTC trick used elsewhere here, and it breaks the first time Victor travels.

One reading per day, upserted: weighing twice in a morning is normal, and two rows would put
two contradictory points on one day of the chart.

**Privacy.** This is the field Victor named as never publishable. No public route imports the
schema, and the built client chunks were scanned — the only hits were the form's own UI copy.

**How to reverse.** Drop the table and delete `adjusted.ts`; the site falls back to raw splits.

### D-057 · Splits are weight-adjusted with Concept2's formula

**Decision.** `factor = (bodyweight_lbs / 270) ^ 0.222`, applied to time.

**Why.** The vault states exactly one athletic goal — "sub-2:00 **weight-adjusted** 500m
split" — so a site showing only raw splits could not answer whether he is close to it. At
215 lb the two differ by about seven seconds.

The direction is worth stating because it is the opposite of the intuitive reading: the
adjustment discounts *lighter* athletes, so **putting on mass makes this goal harder**. Both
the raw and the adjusted line are charted for that reason — an adjusted line alone would let
a lighter month read as a faster month. There is a test pinning the direction specifically.

The number the page leads with is the **required raw split**, because "sub-2:00 adjusted" is
not something anyone can pace to on a monitor and "2:06.2" is.

**How to reverse.** Show `splitPer500S` only and drop the Adjusted column.

### D-056 · The protocol is parsed from the vault, not written in code

**Decision.** SPM targets, the rehab protocol, the weekly split and the goal are read from
`context/02_physical_performance/` at request time by `lib/athletics/protocol.ts`.

**Why.** All four already live in the vault. A copy in TypeScript would drift: Victor edits
the markdown, the site keeps showing last month's programme, and nothing says which is right.
Parsing means editing the vault *is* editing the app — no code change, no deploy.

The cost is that reformatting those files can stop a section parsing. Every parser returns
empty rather than throwing, and every panel says "not found in the vault, from this heading"
rather than rendering an empty box — so a parse miss reads as a parse miss. Tests run against
the real vault files, which is what would actually catch a reformat.

Parsing is line-based, not one large regex: the vault is CRLF, `$` under `m` does not match
before a `\r`, and multi-line patterns have already caused silent bugs in this repo.

**How to reverse.** Hard-code the four structures in `protocol.ts` and delete the vault reads.
The panels stop tracking the vault.

### D-055 · The week's plan is compared to logged sessions coarsely, on purpose

**Decision.** `weekReview` reports whether a day has *any* session, never which planned item
was done. Future days are never "missed".

**Why.** Nothing in the data links a logged workout to a line of the programme. Matching on
the title would mark a rest-day walk as "Team Land Practice, complete" — a confident wrong
answer, which is worse here than an honest coarse one. And a review that shows the whole week
red on a Monday morning is the fastest way to make this view ignored.

**How to reverse.** Match `PlannedDay.items` against workout titles and report per item.
Expect false positives.

---

## 2026-08-21 · V2 scope

### D-054 · Vitest hook timeout raised to 30s

**Decision.** `hookTimeout: 30_000` in `vitest.config.mts`.

**Why.** The first `beforeEach` in each database test file boots PGlite and runs every
migration; three such files run in parallel workers, and under that load the first hook was
measured at ~16s, past vitest's 10s default. It surfaced as three "Hook timed out" failures
that passed on a re-run — the same flakiness D-050 fixed, from a different cause.

Raised rather than masked: the work genuinely takes that long once per file, and every
subsequent hook is a TRUNCATE taking milliseconds. Verified with two consecutive clean runs.

**How to reverse.** Lower it and the suite goes back to failing intermittently on a cold run.

---

### D-053 · The agenda shows the whole feed, unfiltered

**Decision.** `/private/calendar` lists every event in the Google feed. No classification, no
course-code filter.

**Why.** Victor's calendar is one general calendar — 182 events covering classes, practice and
personal life, of which only about 40 carry anything resembling a course code. A regex
deciding what is a "class" would drop a real one the moment it is titled without a code, and a
silently missing class is worse than a cluttered list. Asked, and he chose showing everything.

**How to reverse.** Filter in `Schedule`. If it ever happens, mark rather than hide, so a
misclassification is cosmetic.

---

### D-052 · Canvas import is a button, not a scheduled job

**Decision.** Assignments are pulled into the task table when Victor presses *Import Canvas*.

**Why.** A nightly sync needs a paid tier, which he ruled out. A free-plan cron would also be
the one part of this able to fail silently at 3am with nobody watching — and there is still no
error reporting (finding F6). A button is honest about when the data was last pulled.

The action calls `updateTag("calendar")` before fetching, because otherwise it would re-read
the 15-minute cache and appear to do nothing.

**How to reverse.** Move the body into a route handler and point a cron at it, once something
watches for failures.

---

### D-051 · Calendar comes from private iCal URLs, via ical.js

**Decision.** Both feeds are read from the secret iCal URLs Google Calendar and Canvas publish
(`GOOGLE_CALENDAR_KEY`, `CANVAS_CALENDAR` — Victor's own names, kept rather than renamed to
match the plan). Parsing uses `ical.js`.

**Why.** No OAuth, no consent screen Google must review, no refresh-token rotation, and no
cost — the objection D-034 raised against calendar sync in V1 does not apply to a feed URL.
The URL *is* the credential, so it lives in the environment and never reaches the browser.

`ical.js` rather than something hand-rolled, because the real feed has 37 recurring rules with
`UNTIL`/`BYDAY`, one VTIMEZONE, nested VALARM blocks and 50 all-day entries. A homemade RRULE
expander gets DST wrong, and the symptom is a class that silently stops appearing.

Two details that cost time: `TimezoneService.register` takes `(component, name?)`, not
`(name, component)` — reversed, it type-checks in plain JS and registers nothing, putting
every event seven hours out. And occurrences are capped at 400 per rule, which the real feed
needed: it contains an unbounded monthly recurrence that otherwise expands to 2058.

**Known limitation, not a defect.** As of 2026-08-22 the Canvas feed is empty (211 bytes, zero
events) and Victor's Fall 2026 classes are not yet in Google Calendar — the recurring classes
in the feed are Fall 2025 and have ended. The pipeline is correct and will fill in; the UI says
so rather than looking broken.

**How to reverse.** Unset the variables; every page keeps working without them.

---

### D-050 · One Postgres per test file, truncated between tests

**Decision.** `src/test/pg.ts` builds one PGlite instance per file and `TRUNCATE ... RESTART
IDENTITY CASCADE`s between tests.

**Why.** The first version made a fresh database and re-ran every migration for *each* test.
With three database test files running concurrently it took 88–155s and, once, failed three
tests that passed on a re-run. A suite that is flaky teaches you to ignore red, which is worse
than having no suite. Now **7s**, and deterministic.

The table list is parsed out of the migration SQL rather than hand-written, because a
hand-written list silently stops truncating a table added later.

**How to reverse.** Go back to per-test instances. Do not.

---

### D-049 · Dictation is feature-detected with `useSyncExternalStore`

**Decision.** The dictate button reads support through `useSyncExternalStore` with a server
snapshot of `false`, and renders nothing when the API is absent.

**Why.** Two constraints met at once. `window` does not exist on the server, so detecting
during render would break hydration; setting state in an effect is what the React lint rule
warns about and causes a cascading render. `useSyncExternalStore` is built for exactly this —
external, non-reactive state — and gives a clean server snapshot.

Rendering nothing rather than a disabled button is deliberate: Safari on iOS has no Web Speech
API, and a control that visibly does nothing is worse than no control.

**How to reverse.** Feature-detect however you like, but do not set state in an effect.

---

### D-048 · Log entries are one table with JSONB fields

**Decision.** `log_entries` holds all six categories: a `category`, an `occurredAt`, a `note`,
and per-category fields in `jsonb`. `searchText` is denormalised on write.

**Why.** The alternative was a column per field across every category — mostly nulls, and a
migration every time Victor wants a field changed. D-039 promises that changing fields is
cheap, and a migration per edit is not cheap.

`searchText` is written by `createEntry` rather than by callers, for the same reason
`bumpUpdated` lives in `writeVaultFile`: an entry whose caller forgot would exist but never be
findable again.

Search uses `plainto_tsquery`, not `to_tsquery` — the latter raises a syntax error on a bare
`&`, so a stray character in the search box would 500 the page. A test covers that.

**How to reverse.** Promote hot fields to real columns; the JSONB stays for the rest.

---

### D-047 · Categories are data, and the form is generated from them

**Decision.** `lib/log/categories.ts` declares six categories and their fields. One
`LogForm` renders any of them; the summary line, the search index and the validation all read
the same definitions.

**Why.** Six bespoke forms would be six places to change when Victor edits the fields, and
D-039 committed to that being a one-file edit. Tests assert the structural invariants that
matter — unique field names, options on every select, and **no category longer than eight
fields**, because the constraint from Q16 is that a log must be fillable in fifteen seconds.

Deliberately absent: any mood or energy scale. Victor put that in V3, and a 1–5 filled in from
habit rather than reflection is worse than nothing. A test pins that too.

**How to reverse.** Edit the array. That is the whole point.

---

### D-046 · The freshness walk is memoised at module scope

**Decision.** `loadFreshness` caches the 34-file disk read in a module-level variable.

**Why.** The vault ships inside the serverless bundle, so its contents are fixed for the life
of a deployment — re-reading every file on every request was repeated work with no possible
change to find. Module scope is the right cache: it survives across requests in a warm
function and is discarded automatically when a new deployment starts a new instance, so there
is no invalidation to get wrong. Ages are still computed per call, since those move with the
clock rather than the files.

**How to reverse.** Call `readVaultFiles()` directly; `resetFreshnessCache()` already exists
as the test seam.

---

### D-045 · Loading boundaries and streaming, because the server cannot get faster

**Decision.** A `loading.tsx` under `/private`, and a Suspense boundary around every
database or GitHub read on Today, Work, Academics, Athletics, Calendar and Hobbies.

**Why.** Victor reported it still felt slow after D-042 made the server measurably faster, so
I measured the thing I had not: production. `/signin` — a dynamic page with *no* database and
*no* API call — costs 335–440ms of Vercel function time, against 70ms to connect. That
overhead is not mine to remove, and it is paid on every navigation because every private page
is `force-dynamic`.

The mistake was optimising server time when the problem was that **nothing appeared on screen
while it ran**. With no loading boundary the App Router has nothing to show, so a click left
the old page sitting there and the app read as frozen rather than busy.

Measured after: TTFB 50–110ms across every private page, and the streaming order is verified
in the HTML — the shell and skeleton ship at byte ~6.7k, the content arrives at ~30k.

This also matters most exactly when the app feels worst: Neon's free tier suspends after a
few minutes idle, so the first query after a break is slow. The shell no longer waits for it.

**How to reverse.** Delete `loading.tsx` and unwrap the Suspense boundaries. Do not, unless
the pages stop being `force-dynamic`.

---

### D-044 · The academic tracker's vault implementation is deleted, not kept alongside

**Decision.** `checklist.ts`, its 25 tests, `academic-tracker.tsx`, `tracker.ts`, and the
academics actions are removed. `/private/sprint` and its form go too — goals are edited
inline on Today now.

**Why.** D-037 merged the tracker into the task model. Leaving the vault version in place
would have shipped both, which is the exact failure the merge exists to prevent, and keeping
unused-but-tested modules "in case" is how dead code accumulates. Everything is one `git
show` away if feature 5's rehab checklist wants it back.

**How to reverse.** `git show b069dcb -- web/src/lib/vault/checklist.ts` and friends.

---

### D-043 · Freshness is a badge, not a panel

**Decision.** The dashboard's full-width freshness section is replaced by a chip in the page
header that appears **only when something is stale**, expanding to a list on click.

**Why.** Victor's verdict on V1: it "should be here as an alert that something is not fresh,
almost as a notification. The full bar itself should be removed." The audit is unchanged —
this reverses only the presentation. A permanent list of 34 healthy files is furniture.

**How to reverse.** `freshness-panel.tsx` in git history; the report shape is identical.

---

### D-042 · Vault reads are cached; the write path is not

**Decision.** `readVaultFileCached` wraps reads in `unstable_cache` tagged `vault`, and
`writeVaultFile` calls `updateTag` after committing. Actions keep the uncached reader.

**Why.** Measured: private pages spent 300–800ms on serial GitHub round trips, against 33ms
for the one page making no network call. After caching, best-of-five steady state went
320→69ms (work), 377→32ms (calendar), 761→186ms (academics).

Three specifics worth keeping:
- **`unstable_cache`, not `use cache`.** The directive needs `cacheComponents: true`, which
  changes every dynamic API in the app and conflicts with the `force-dynamic` these pages
  rely on. Deprecated, but the migration is contained to one function.
- **`updateTag`, not `revalidateTag`.** The latter now requires a cache profile, and the
  recommended `"max"` is stale-while-revalidate — which serves the *pre-edit* content on the
  next read, making a save look like it did nothing.
- **The write path must not use the cache.** It needs a live blob SHA; a cached one turns
  last-write-wins into last-write-fails.

**How to reverse.** Call `readVaultFile` directly and delete the tag. Pages get slow again.

---

### D-041 · Every GitHub request has an 8-second deadline

**Decision.** Octokit is constructed with a `fetch` that carries `AbortSignal.timeout`.

**Why.** `fetch` has no default timeout, so a network problem was not a slow page but a hung
one — when the connection dropped mid-session, pages sat for minutes. 5s was the first value
and it fired during ordinary use on a working connection, which is worse than no timeout: it
turns slow into broken. 8s rides out a bad moment and still fails before anyone assumes the
app has died.

**How to reverse.** Remove the custom fetch. Do not, unless something else bounds the wait.

---

### D-040 · The card sweep plays once (reverses half of D-012)

**Decision.** `infinite` becomes `forwards`, and the keyframes drop the 55%-then-hold that
existed only to pause between loops. Duration 0.85s.

**Why.** Victor: "once it does the sweep once it should not repeat it when still hovering."

D-012 said explicitly which half of it must survive a reversal, and that instruction is
followed here: the corrected base transform (resting off-card) and the 260% travel stay,
because those were the bug fix — without them the highlight parks itself over the card and
never exits. Only the looping goes.

**How to reverse.** `forwards` → `infinite` and restore the hold keyframe.

---

### D-039 · Log fields are proposed from the vault, then edited

**Decision.** I draft three or four fields per log category from what the vault already
records — SPM and drag factor for erg work, course and grade for academics — and Victor
strikes out what is wrong.

**Why.** Victor chose this over specifying fields from scratch. Starting from the vault means
the fields match the vocabulary already in use, so a logged erg piece and the PR table talk
about the same quantities.

**How to reverse.** Fields live in one schema module per category; changing them is a
migration, not a rewrite.

---

### D-038 · Voice input is worth building — Android confirmed

**Decision.** Quick-log screens get Web Speech API dictation.

**Why.** I had assumed iPhone and was ready to drop this: Safari on iOS has no Web Speech
API, and the iOS keyboard's own dictation button already covers every text field for free.
Victor logs from Android/Chrome, where the API exists. About an hour of work.

**How to reverse.** Feature-detect and fall back to a plain field — which is also what any
future iPhone would get.

---

### D-037 · Everything actionable is one task model

**Decision.** Sprint goals, the academic tracker, daily to-dos, and Canvas assignments become
rows in one `tasks` table, each with a source and a due date. The homepage filters to today
and this week.

**Why.** V2 was about to ship a fourth place to look for "what should I be doing". Victor
named "too complex to use" as the thing that would make him abandon the project, so four
competing lists is not a style question, it is the failure mode. Nothing is deleted: sprint
goals become tasks tagged as goals, tracker items become tasks with a course.

**Cost.** This partly supersedes D-032, which put tracker items in `current_sprint.md`. Those
rows move to Postgres. The markdown tracker section stays readable but stops being the
editable source.

**How to reverse.** The task source column makes the origin of every row recoverable, so
splitting them back out is a query, not an archaeology exercise.

---

### D-036 · High-frequency writes go to Postgres, not the vault

**Decision.** Anything logged often — daily entries, tasks, workouts — is written to Postgres
and saved immediately. The vault keeps prose that is written rarely and read by AI agents.

**Why.** Finding F2: every vault write is a commit and a deploy, so ticking three boxes was
three commits, three builds, and a plausible route to Vercel's Hobby ceiling. Victor asked
for immediate saves (Q77) and accepted logs living outside the vault (Q76).

**The tension, stated.** Victor also wants the site to create vault files (Q80), which can
never be instant — a GitHub round trip is 1–2 seconds. Resolution: two visibly different
actions. Logging is silent and instant; writing to the vault shows a publishing state,
because it is editing the permanent record.

**Deferred.** Syncing Postgres logs back into vault summaries is V3 by Victor's own call
(Q76).

**How to reverse.** The vault write path is untouched and still used for prose, so reverting
means pointing the log actions back at it and accepting the commit-per-save cost again.

---

## 2026-08-21

### D-035 · Checklist editing lives in its own module, not in `frontmatter.ts`

**Decision.** `lib/vault/checklist.ts` holds the `- [ ]` item reader and writers.
`frontmatter.ts` stays about frontmatter and generic section edits.

**Why.** Checklists are one markdown convention, not a property of every vault file. Keeping
them apart means `frontmatter.ts` does not grow a second vocabulary. Both modules repeat the
same two guards on purpose — `\r?\n` for CRLF files, `(?![\s\S])` rather than `$` for
end-of-input — and each has its own tests for them.

**How to reverse.** Merge the file back; nothing else depends on the split.

---

### D-034 · The Calendar page has no calendar

**Decision.** `/private/calendar` states plainly that live sync is out of scope for V1 and
shows the operating rules from the sprint file instead.

**Why.** Google Calendar reads need an OAuth consent screen Google must review before it
works beyond a test account, plus refresh-token storage and rotation. That is days of work
for a read-only view of an app already open in another tab, and it would be the only part of
2ndMind that can lock itself out without warning. A page that says so is more useful than a
page pretending to be finished.

**How to reverse.** V2 candidate. If it happens, an `.ics` subscription URL is a fraction of
the work of OAuth and covers reading.

---

### D-033 · The Work page is not an application tracker

**Decision.** `/private/work` renders pipeline strategy and career targets. It does not log
or count applications.

**Why.** `internship_pipeline.md` records that a background script already scans Gmail and
maintains a master Google Sheet, and explicitly asks AI assistants to leave that data entry
alone. A second tracker would be a competing source of truth for facts the sheet already
owns — the exact failure this vault exists to prevent.

**How to reverse.** If the sheet is ever retired, this is where its replacement goes.

---

### D-032 · The academic tracker edits the sprint file in place

**Decision.** Tracker items are `- [ ]` rows under `## 3. Academic Tracker` in
`current_sprint.md`. Adding, ticking, and removing each commit that one file. Adding reuses a
blank placeholder row before appending.

**Why.** The tracker already existed there as prose. Moving it to Postgres would split "what
am I working on" across two stores; keeping it in markdown means it still reads correctly
with no site at all, which is the property that makes this a vault and not an app.

A test reads the **real** `current_sprint.md` and asserts the section is found and everything
outside it stays byte-identical, so renaming or re-numbering the heading fails loudly in CI
instead of silently doing nothing in the UI.

**How to reverse.** Point the actions at a different file and heading; the pure functions
take both as parameters.

---

### D-031 · Athletics degrades to an explanation when `DATABASE_URL` is absent

**Decision.** `/private/athletics` renders a short "no database connected" page rather than
throwing. `isDatabaseConfigured()` is a separate function from `db()`.

**Why.** The same shape as D-021, applied before it could bite: the page someone opens to
find out why athletics is broken must not be the page that crashes on it. Verified by
loading the route with the variable unset — 200, self-explaining — and again with the
variable set but the tables missing, which renders the migration hint.

**How to reverse.** Delete `isDatabaseConfigured` and let `db()` throw.

---

### D-030 · Estimated 1RM is capped at 12 reps

**Decision.** `estimateOneRepMax` returns null above 12 reps rather than extrapolating.

**Why.** Epley drifts badly at high rep counts. Uncapped, a set of 20 light reps outranks a
genuine heavy single and sits at the top of the strength board forever — a wrong number that
looks plausible, which is the worst kind.

**How to reverse.** Raise or remove `E1RM_REP_CAP` in `lib/athletics/prs.ts`. A different
formula (Brzycki, Lombardi) would be a better fix than a higher cap.

---

### D-029 · Warmup sets are stored but never ranked

**Decision.** Every set from an import is written, including warmups; `isWorkingSet()`
excludes `warmup` and `drop` from records.

**Why.** Throwing them away at import would be lossy and irreversible — session volume and
history would be wrong forever. Counting them toward a PR would be wrong in the other
direction, and a single mistyped warmup would set a permanent fake record.

**How to reverse.** Change `isWorkingSet` to return true. The data is all still there.

---

### D-028 · The database layer is tested against real Postgres, in WASM

**Decision.** `@electric-sql/pglite` (dev dependency) runs the committed migration SQL and
the real queries in the test suite. Query functions take the handle as a parameter so the
same code runs on PGlite and on Neon.

**Why.** A mocked query builder asserts that the code called the mock, which is worth very
little — it would have accepted the numeric-as-string bug in D-027 without complaint. This
costs nothing, needs no server, and runs offline, which matters for the Taiwan trip.

**Cost.** About 17 seconds of the suite, from spinning up a fresh database per test.

**How to reverse.** Drop the dependency and delete `athletics/__tests__/queries.test.ts`.
Keep the parameter-passing shape regardless; it is good design independent of testing.

---

### D-027 · Numeric columns are declared `mode: "number"`

**Decision.** `numeric("weight_lbs", { …, mode: "number" })` on every numeric column.

**Why.** Postgres `numeric` arrives as a *string* by default in node-postgres, to protect
precision. Under string comparison `"95" > "155"` is true, so a warmup would outrank every
working set and every PR would be quietly wrong. A test asserts `typeof` is number and that
the max of a real stored session is 155.

**How to reverse.** Drop the mode and convert at each call site — but then every comparison
becomes a place to forget.

---

### D-026 · Imports are idempotent through a derived `external_id`

**Decision.** Each imported session gets `hevy:<ISO timestamp>:<title-slug>`, uniquely
indexed. Sets are written only for workouts the insert actually created.

**Why.** A Hevy export is cumulative — every export contains the entire history — so the
natural workflow is re-importing a growing file. Without this, the second import doubles
everything, and the damage shows up only as inflated PRs and volume, with no error anywhere.
The second half matters as much as the first: skipping the workout row but still appending
its sets would duplicate the sets against the original session.

Manual entries leave `external_id` null, and Postgres treats nulls as distinct in a unique
index, so hand-logged sessions never collide.

**How to reverse.** Drop the unique index. Do not, unless imports become one-shot.

---

### D-025 · Personal records are computed on read, never stored

**Decision.** No `records` table. `strengthRecords()` and `ergRecords()` run over every
stored set on each page load.

**Why.** A stored record is a cached answer with no invalidation story: correct a mistyped
weight and the PR keeps reading high forever, silently. At this scale — a few thousand sets
— recomputing is free.

**How to reverse.** Add a materialised table if the set count ever makes this slow. It will
not at one athlete's volume.

---

### D-024 · Training data lives in Postgres, not in the markdown vault

**Decision.** Athletics is the one feature backed by a database (Neon free tier).

**Why.** Everything else in 2ndMind is prose that a human writes and reads. Training data is
tabular and queried *across* rows — "best set of Bench Press at five reps" is a group-by. A
Hevy export is thousands of set rows, which no markdown file should hold. The rest of the
site is unaffected and builds without `DATABASE_URL`.

**Privacy.** Health data is the category that must never be public. No public route imports
`lib/db` or `lib/athletics`, and the public build runs with no database configured at all.

**How to reverse.** Nothing else depends on it; delete the routes, the two lib folders, and
the dependency. The vault's `benchmarks_and_logs.md` remains the hand-written record.

---

### D-023 · `outputFileTracingRoot` is what puts the vault in the serverless bundle

**Decision.** `next.config.ts` sets `outputFileTracingRoot` to the repo root and excludes
`context/99_archive/**`. It sets no `outputFileTracingIncludes`.

**Why.** Measured rather than assumed, because the first version of this config was wrong in
two ways. With no config, **zero** vault markdown files are traced into `/private` — the
freshness widget would have thrown ENOENT in production while working perfectly locally.
Widening the root alone fixes it: Next's analysis of the `readdirSync` in `vault/load.ts`
then pulls the tree in by itself, making the `includes` entries redundant. And an explicit
`include` *beats* an `exclude`, so adding one made the 10 archive files impossible to leave
behind — the build kept shipping superseded resumes and transcripts into the function.

**How to reverse.** Remove both keys and the freshness panel loses its data source in
production only, which is the hardest kind of regression to notice. Verify any change by
reading `.next/server/app/private/page.js.nft.json` and counting traced `.md` files: 34 is
correct, 44 means the archive came along, 0 means it is broken.

---

### D-022 · The freshness audit reads the filesystem, narrowing D-019

**Decision.** `loadFreshness()` walks `context/` on disk. D-019's rule — private pages read
the vault over the GitHub API — still holds for every *editable* file.

**Why.** Freshness inspects 34 files to read one frontmatter field from each. Over the API
that is 34 round trips per dashboard render, against a rate limit, to compute something that
changes once a day.

**Cost, stated plainly.** After a write through the site, the panel shows the pre-edit date
until Vercel redeploys. That self-corrects in a couple of minutes, because a vault write is
a commit and a commit triggers a deploy — but it is a real window where the dashboard and
the vault disagree.

**How to reverse.** Swap `readVaultFiles()` for API reads, and add caching, or the dashboard
becomes unusably slow.

---

### D-020 · Vault writes validate the path before anything else

**Decision.** `assertVaultPath` rejects traversal, backslashes, non-`context/` prefixes, and
non-`.md` files — in that order.

**Why.** A fine-grained PAT with "Contents: read and write" covers **every file in the repo**,
not just the vault. That includes `web/` and `.github/workflows/`. Path validation is the only
thing between a bug in a form handler and an arbitrary repo write, including a workflow file
that would then run with the repo's own permissions. Shape is checked before prefix so a
backslash path reports as traversal rather than as "outside the vault", which would point at
the wrong defect.

**How to reverse.** Don't.

### D-021 · A misconfigured deployment explains itself instead of crashing

**Decision.** `isAuthConfigured()` is separate from `getSession()`, and `/signin` renders a
"Not configured" notice rather than throwing.

**Why.** Found by probing the live deploy: with `SESSION_SECRET` unset, `/signin` returned
**500**. The sign-in page is exactly where someone looks when auth is broken, so it was the
one page that must not be the page that crashes. `/private` was already failing closed
correctly; only the explanation was missing.

**How to reverse.** Don't — but note the rule it encodes: auth failures fail closed, and
configuration failures stay legible.

### D-019 · Private pages read the vault over the API, not the filesystem

**Decision.** `/private/*` fetches vault files through the GitHub Contents API even though
the repo is checked out beside the app.

**Why.** Two reasons. Vercel's runtime filesystem contains only what the build traced, and
dynamically-constructed paths are not traced — so `fs.readFileSync` would work locally and
404 in production. And after a write, the local copy is stale by definition; the API is the
thing that just changed.

**Cost.** Every private page load is a network round trip. Acceptable for one user; if it
ever isn't, cache per-request rather than reverting to the filesystem.

### D-018 · Passkey auth with no database

**Decision.** The enrolled credential lives in two environment variables
(`PASSKEYS`, one `label:credentialId:publicKey` entry per device; the older
`PASSKEY_CREDENTIAL_ID` / `PASSKEY_PUBLIC_KEY` pair is still read). Sessions are
HMAC-signed cookies built on
Web Crypto. There is no user table and no auth vendor.

**Why.** Following D-006 (Clerk gates passkeys behind $20-25/mo). With exactly one user, the
stored values are not secret — the private key never leaves the authenticator — so a database
buys nothing here. Web Crypto rather than a JWT library because `proxy.ts` may run on an edge
runtime with no Node `crypto`, and an HMAC over JSON is the whole requirement.

**What this design gives up.** Signature counters, which detect a cloned authenticator, need
somewhere to persist. Platform passkeys (Touch ID, Windows Hello) report counter 0 and never
increment, so there is nothing to compare — which is the only reason this works. **A hardware
key that does increment would need real storage.** Rotating or adding a device means
re-running enrolment and pasting new values into Vercel.

**Enrolment is closed by default.** `PASSKEY_REGISTRATION_SECRET` must be both set and
supplied. An open registration endpoint on a deployment with no credential configured would
hand the private site to whoever found it first.

**Enrolment is a page, not a script.** `/signin/register` runs the ceremony through
`@simplewebauthn/browser`. The first draft of this was a console snippet in a markdown file;
that was fragile enough to be a bad answer, and hand-rolling base64url in a copy-pasted
script is exactly where this goes wrong silently. The page 404s when the gate is shut.

**No recovery flow, deliberately.** Lose the device and you re-open the gate and re-enrol.
Since Victor controls the environment variables, that path is always available to him and to
nobody else — which is a better property than any recovery mechanism a single-user app could
offer. Written up in `REGISTER_PASSKEY.md`.

**How to reverse.** Move the credential into Neon (`DATABASE_URL` already exists for
athletics) and store the counter alongside it. The ceremony code does not change.

### D-017 · The resume is generated from the vault, in two languages

**Decision.** `/resume/[variant]` renders from `web/src/lib/resume.ts`; `99_archive/resume.md`
is written by `scripts/build_indexes.py`. Both select entries by each entry's own
`resume_variants` field. A test asserts the two agree.

**Why.** Victor asked for a genuinely generated resume, not a maintained document — bullets
already live in canonical entries and a hand-written copy guarantees drift. The vault must
also stay readable without running the web app, which is why the Python copy exists at all.
The duplication is the cost of that, and the drift test is what makes it safe.

**How to reverse.** Delete `build_resume` from `build_indexes.py` and the
"archived copy agrees with the site" describe block. The site is unaffected.

### D-016 · Print styling, not a PDF library

**Decision.** The PDF comes from the browser's own print dialog, driven by an `@media print`
block. No PDF generation dependency.

**Why.** $0 budget, and browser "Save as PDF" produces **selectable text** — which is what
resume parsers read. A rasterised dark-theme screenshot would be unparseable by the ATS
systems these applications go through. Victor also said he would export the PDF manually.

**Consequences worth knowing.** Everything themed is forced to near-black; muted greys that
read well on `#0a161b` print as illegible haze, so they are darkened to `#333`. Links print
without underlines because the URLs are already spelled out in the contact line.
`.resume-block` sets `break-inside: avoid` so a bullet list is never orphaned from its job
title across a page boundary.

**How to reverse.** Delete the `@media print` block in `globals.css`.

### D-015 · RLC lab dropped from the robotics resume variant

**Decision.** `labs/rlc.md` had `resume_variants: [robotics]`; now `[]`.

**Why.** Consistency with D-014. Having argued that assigned coursework is padding on the
portfolio, leaving it on the resume would be incoherent — and the solenoid project already
covers ESP32 instrumentation, better and with a self-directed result.

**How to reverse.** Put `robotics` back in that file's `resume_variants` and rerun
`python scripts/build_indexes.py`.

### D-014 · Labs cut to one entry, promoted to a project

**Decision.** Four of the five Physics 4BL labs (optics, RLC, sound, resistor/LED) are now
`public: false`. The solenoid bit reader moved to `01_engineering/projects/` as a hardware
project. The `/labs` route and its nav entry are gone.

**Why.** Victor's read was right. Those four are *assigned coursework* — every student in the
course measures an I-V curve and the speed of sound. They demonstrate compliance, not
capability, and on a portfolio they dilute the work that does differentiate. The solenoid lab
is categorically different: a self-directed macro-scale hard-disk-reader analog, 387-turn
coil, op-amp gain staging, calibration matrix, 100% decode accuracy. That is a build, and it
belongs next to the other builds rather than filed under coursework.

A `/labs` index holding one item also reads as an abandoned section, which is worse than no
section.

**How to reverse.** Flip `public: true` on the four lab files, restore `web/src/app/labs/`
from git history (`git show 2699a2a:web/src/app/labs/page.tsx`), and re-add the nav entry in
`site-header.tsx`. The lab entries were never deleted from the vault, so nothing is lost.

**Note.** The four labs stay in the vault deliberately — they are real academic history and
useful context for any AI reading the vault. Only their *publication* changed.

### D-013 · Projects carry a hero image, with a generated placeholder fallback

**Decision.** `image` is an optional project frontmatter field. When absent, `ProjectFigure`
renders a deterministic SVG placeholder derived from the project slug rather than a grey box.

**Why.** Victor has no photography yet but will. A placeholder that is on-palette and varies
per project keeps the grid looking designed in the meantime, and dropping a real file in later
is a one-line frontmatter change with no component edit.

**How to reverse.** Delete the `image` field and render nothing; the grid falls back to the
text-only cards from commit `2699a2a`.

### D-012 · The card sweep loops while hovered

**Decision.** `card-scan`'s highlight sweep repeats on a 2.4s cycle (sweep, then pause)
instead of firing once.

**Why.** Two reasons, one of them a bug fix. The one-shot version ended with the highlight
*parked over the card*: the animation had no fill mode, so on completion the transform
reverted to its base value and left a bright static band sitting on the left of every hovered
card. The keyframes also only travelled to 120% of the bar's own width — about 54% of the
card — so it never actually exited. Base transform now rests off-card and the travel is
260%. Looping is also the thematically right behaviour: a scope refreshes continuously.

**How to reverse.** Drop `infinite` from the animation shorthand in `globals.css` and keep
the corrected keyframes and base transform — those are the bug fix and should not be reverted
independently.

---

## 2026-08-20

### D-011 · Breadth content is its own vault entity, not a projection of the training logs

**Decision.** `context/03_craft_and_creative/pursuits/` holds the portfolio framing of dragon
boat, fabrication, and baking. The public build never reads `benchmarks_and_logs.md` or
`culinary_formulas.md`.

**Why.** Those files hold bodyweight, protein and creatine targets, and a lower-back rehab
protocol. Victor is comfortable storing health data in the cloud; that is not the same as
publishing it to recruiters. A separate entity means the risk is structurally absent rather
than mitigated by an allowlist that someone has to maintain correctly forever.

**How to reverse.** Not recommended. If the breadth section is cut entirely, delete the
`pursuits/` directory, `pursuitSchema`, `loadPursuits`, `publicPursuits`, and the section in
`page.tsx`.

### D-010 · Collaborator names are never published; group size is

**Decision.** `collaborators` is excluded from the public lab projection. The site shows
"N-person group lab" instead.

**Why.** Victor asked for the names to come off. Beyond that, they are private individuals
who did not agree to appear on a public portfolio. Group size stays because silently
presenting group work as solo misrepresents it to exactly the audience the site is for.

**How to reverse.** Add `collaborators` back to `PublicLab`, `toPublicLab`, and
`PUBLIC_LAB_KEYS`, and delete the privacy test in `public.test.ts`. The names were never
removed from frontmatter.

### D-009 · `## Notes` sections are stripped from every public body

**Decision.** `stripInternalSections()` removes the vault's `## Notes` convention from
project, experience, and lab bodies before rendering.

**Why.** Those sections hold relative links into `99_archive` and notes-to-self about
frontmatter. Bodies render verbatim on public pages, so they were being published. Handling
it at the projection layer rather than per-file means the next entry added is covered without
anyone remembering to.

**How to reverse.** Delete the call sites; the function is pure and independently tested.

### D-008 · Palette replaced with Victor's six swatches

**Decision.** Gold/warm-near-black is gone. Teal `#09A1A1` primary, rose `#D396A6`
secondary, peach `#F6C992` as the single warm note, on grounds derived from `#30525C`.

**Why.** Victor supplied the palette and said the gold and the flat background were not to
taste. Only `#30525C` was dark enough to build grounds from, so the page and card colours are
that hue driven down in lightness — this keeps surfaces the same temperature as the accents
instead of fighting them.

**Resolved 2026-08-21.** The supplied image labelled a *pink* swatch `#30525C`, which is a
dark slate teal, so the hex codes were treated as authoritative over the swatch colours.
Victor confirmed the result: "I like the current palette, keep using what is currently
there." The palette is settled — do not reopen it without being asked.

**How to reverse.** `git show a81dee8:web/src/app/globals.css` has the gold palette intact.

### D-007 · The background is not a flat fill

**Decision.** `<html>` paints the base colour; `body::before` layers three drifting radial
pools and `body::after` adds SVG-noise grain.

**Why.** Victor asked for the solid background to go. The grain is not decoration — wide
radial fills band visibly on 8-bit displays, and noise dithers them out.

**Constraint this creates.** `body` must stay background-less. Giving it an opaque background
buries both layers, and the symptom (a flat page) looks like the CSS simply did not apply.

**How to reverse.** Delete the two pseudo-element rules and put `bg-background` back on
`body` in `layout.tsx`.

### D-006 · Auth is self-hosted WebAuthn, not Clerk

**Decision.** `@clerk/nextjs` removed; `@simplewebauthn/server` + `/browser` in.

**Why.** Clerk gates passkeys to its Pro tier at $20-25/mo — recurring, and far outside the
$0 (max $5) budget. There is exactly one user forever, which makes Clerk's real job
(multi-tenant identity, org management, arbitrary sign-up flows) pure overhead.

**How to reverse.** Reinstall `@clerk/nextjs` and accept the subscription, or use Clerk's
free-tier email-code sign-in and give up passkeys.

### D-005 · Motion lives in two custom utilities, not repeated class chains

**Decision.** `card-scan` and `link-wipe` are `@utility` blocks in `globals.css`.

**Why.** The same hover treatment appears on five surfaces. As a Tailwind chain it was ~90
characters repeated per element, and changing the feel meant editing every one. Both collapse
under `prefers-reduced-motion` in one place.

**How to reverse.** Inline the CSS at each call site.

### D-004 · `SiteHeader` is a Client Component

**Decision.** It uses `usePathname` for the active-route indicator.

**Why.** The alternative is threading the pathname from every page. It receives only a name
string, so the RSC payload cost is negligible.

**How to reverse.** Drop the indicator and the `"use client"` directive.

---

## Earlier

### D-003 · Public projections name every field explicitly

Never spread-and-delete. A field added to the vault tomorrow is private by default, and
reaching a public page requires a deliberate edit plus a test update. **Do not "simplify"
this into a spread.** Two real leaks were caught by scanning built output, not by the type
system.

### D-002 · Fonts are self-hosted

`next/font/google` fetches at build time; a meaningful chunk of this project is written in a
car and on a plane. Files came from `@fontsource`.

### D-001 · Monorepo — `web/` inside the vault repo

Vault writes trigger public rebuilds, and other projects can clone and read `context/`
directly, which Victor asked for.

---

## Reversed

*(nothing yet)*

```

## File: context/00_meta/ai_directives.md

```markdown
---
updated: 2026-08-20
domain: meta
stability: stable
summary: Behavioral rules governing how AI assistants respond to Victor.
read_when: Always — load first, every session.
---

# AI Directives

These rules supersede default assistant behavior. They are the single source of truth for
*how* to respond. Facts about Victor live elsewhere; see `core_profile.md` and the numbered
domain folders.

## 1. Precedence

When directives conflict, apply in this order:

1. **Safety and factual accuracy** — never fabricate to satisfy a style rule.
2. **Technical judgment (§4 Challenger)** — on architecture, code, planning, and training
   decisions, unsolicited critique is *required*, not optional.
3. **Scope discipline (§3)** — everywhere else, answer exactly what was asked.

In short: **challenge the approach, not the topic.** Critique a chosen data structure, a
training split, or a sprint plan without being asked. Do not append general life advice,
unrelated trivia, or safety boilerplate.

## 2. Communication Style

- **Density:** Concise with structured analysis. For simple queries, extreme brevity.
- **Formatting:** Default to bullet points and logical outlines over long-form paragraphs.
  Prefer raw text and code representations. Use Mermaid diagrams for system visualization.
- **Summarization:** For long or complex prompts, lead with a TLDR.
- **Tone:** Technical, direct, efficient.

## 3. Anti-Preferences (hard guardrails)

- **No pleasantries.** No conversational filler, no introductory or closing fluff.
- **Answer the prompt exactly.** No unrelated trivia or general life advice.
  (Bounded by §1 — technical critique is in scope.)
- **Code must run.** Requested features ship working, bug-free, and tested.
- **MVP exception:** incomplete logic is acceptable *only* alongside a working MVP, and every
  gap must be heavily documented — what is missing, and how to implement it.

## 4. The Challenger Directive

- **Aggressive auditing.** Constantly challenge ideas.
- **Call out flaws.** Explicitly naming a bad idea or flawed logic is mandatory, not optional.
- **Constructive iteration.** Propose better architectures and optimizations for good ideas.

## 5. Domain Interaction Modes

Calibrate tone, depth, and analytical frame to the domain of the prompt.

### Engineering — `01_engineering/`
- Assume the technical baseline of a 2nd-year CS undergrad per coursework and resume.
  Skip rudimentary explanations.
- Enforce best practices; keep code heavily documented.
- Treat `01_engineering/` as an overview of overarching skills. Deep project-specific
  architecture belongs in the project's own repo, not here.

### Physical Performance — `02_physical_performance/`
- **Recovery first.** Be highly cognizant of total physical recovery and overtraining risk.
  Evaluate the body as a whole, not just CNS load.
- **Goal alignment.** Sub-2:00 weight-adjusted 500m split, balanced against team requirements.
- **Holistic support.** Training plans, dietary guidance, and recovery work together.

### Craft & Creative — `03_craft_and_creative/`
- Drop engineering-grade tolerances. Shift to a qualitative, flow-state approach for
  recipes, baking, and creative builds.

### Operations & Planning — `04_operations/`
- **Aggressive realism.** Audit schedules strictly for realism; refuse to rubber-stamp overload.
- **Student context.** Balance that strictness against an ambitious student running several
  demanding tracks at once.
- **Milestone tracking.** Plan against active milestones on a ~30-day sprint cycle.

## 6. Engineering Project Rules

- **Testing:** automated tests written and run after any feature is added. Active projects
  maintain a large test bank that runs continuously during development.
- **Bootstrapping:** every new software project is initialized with a `context.md` stating
  project expectations.
- **Style guides:** Victor is currently unopinionated. When initializing a project, outline
  the tradeoffs (e.g. PEP 8 vs Google) so he can choose deliberately.

## 7. Context Maintenance

- **Audience:** this vault targets general AI assistants first, code copilots second.
- **Chronology:** all skills, projects, and updates are dated. Dates are ISO 8601.
- **Active updates:** when you detect contradictory or outdated information in these files
  during a session, say so and prompt Victor to update it. Check the `updated:` field in
  frontmatter — a `volatile` file older than ~14 days should be treated as suspect.

```

## File: context/00_meta/brand_and_voice.md

```markdown
---
updated: 2026-08-20
domain: meta
stability: stable
summary: Visual identity, color palette, portfolio links, logo concept.
read_when: Design, branding, portfolio, or personal-site work.
---

# Brand and Aesthetic

## 1. Personal Identity & Portfolio
- **Persona:** Specialized Robotics Engineer.
- **Links:** 
  - GitHub: [Victor2275](https://github.com/Victor2275)
  - Resume: `Victor_Gusev_Resume.pdf`
- **Future Assets:** Needs a centralized personal website/portfolio designed in Figma.

## 2. Aesthetic Guidelines
- **Color Palette:** Dark themes dominating, cool-toned. Six canonical swatches, chosen
  2026-08-20 (these supersede the earlier Gold-and-Rose direction):

  | Swatch | Hex | Role |
  |---|---|---|
  | Teal | `#09A1A1` | Primary accent — links, active states, fills |
  | Rose | `#D396A6` | Secondary accent |
  | Peach | `#F6C992` | The single warm note; eyebrows and emphasis only |
  | Slate teal | `#30525C` | Structural surfaces and borders |
  | Steel | `#5484A4` | Mid-tone, chart series |
  | Pale blue | `#ACC0D3` | Muted text, chart series |

  Grounds are `#30525C` driven down in lightness (`#0A161B` page, `#0F2129` card) so the
  surfaces share the accents' temperature. Backgrounds are never flat fills — see
  `web/src/app/globals.css`, which is the implementation of record.
- **Logo Concept:** A dark, teal-accented theme integrating the core pillars of the 2ndMind:
  3D Printing, Baking, Robotics, Dragon Boat, and Computer Science.

```

## File: context/00_meta/core_profile.md

```markdown
---
updated: 2026-08-20
domain: meta
stability: stable
summary: Identity facts — name, school, year, GPA, contact, timezone, graduation timeline.
read_when: Always — load first, every session.
name: Victor Gusev
persona: Specialized Robotics Engineer
degree: B.S. Computer Science and Engineering
school: University of California, Los Angeles
school_short: UCLA
academic_stage: 2nd-year undergraduate
admitted: 2025-09
graduation: 2028-06
fast_track: true
gpa: 3.64
gpa_scale: 4.00
timezone: America/Los_Angeles
primary_os: Windows
post_graduation: Master's degree
contact:
  email: gusev0219@gmail.com
  phone: "(925) 588-1919"
  github: https://github.com/Victor2275
  linkedin: https://www.linkedin.com/in/victorgusev/
---

# Core Profile

Identity facts only. Behavioral rules live in `ai_directives.md`.

Structured values are in the frontmatter above and are the canonical source for the
public site's About page and for every generated resume variant. Notes that do not fit a
field:

- **Timeline:** 3-year fast track. Admitted September 2025, expected graduation June 2028.
- **Post-graduation intent:** Master's degree.
- **Contact:** all four channels above are public and appear on the portfolio site.

```

## File: context/01_engineering/career_targets.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Target roles, company tiers, locations, graduation timeline.
read_when: Career strategy, job targeting, role fit questions.
---

# Career Targets

## Timeline & Education
- **Degree**: B.S. Computer Science and Engineering (UCLA)
- **Timeline**: 3-year fast track. Expected graduation: June 2028.
- **Post-Graduation**: Intent to pursue a Master's degree.

## Target Roles & Domains
- **Priority 1 (Highest)**: Robotics, Computer Vision, Embedded & Autonomous Systems.
- **Priority 2**: AI/ML Platforms & Systems.
- **Priority 3**: Core Software Engineering, Firmware.
- **Priority 4**: Full Stack.
*(Targeting roles like ML Engineer, Systems Engineer, Core SWE).*

## Company & Location Preferences
- **Company Tiers**: FAANG+ / Top Tier Enterprise / High-profile tech.
- **Locations**:
  - Los Angeles Area (within 25 miles of UCLA)
  - Bay Area (within 50 miles of Walnut Creek / Silicon Valley / SF)
  - Remote
  - Other reputable locations (as secondary options)

## Interview Preparation
- **Metrics**: LeetCode proficiency and System Design mock performance.

```

## File: context/01_engineering/coursework_and_labs.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: volatile
summary: All 26 courses with terms and grades, plus 5 physics lab summaries.
read_when: Academic background, prerequisite knowledge, transcript questions.
---

# Coursework and Labs

## Degree Progress

- **UCLA Major**: B.S. in Computer Science and Engineering
- **Admitted**: 09/2025
- **Expected Graduation**: June 2028 (3-year fast-track)

## Core Curricula

### Systems & Hardware

- **Fall 2024** Assembly Lang Prog/Comp Org (A): DVC course on low-level assembly language.
- **Fall 2026** Logic Dsgn-Dgtl Sstm [M51A] (Enrolled): UCLA course on digital system logic design.
- **Fall 2026** Systems and Signals [102] (Enrolled): UCLA course on systems and signals analysis.
- **Fall 2026** Intro-Elec Engr [3] (Enrolled): UCLA introductory electrical engineering course.
- **Spring 2026** Electrodynmc&Optics [Physics 1C] (B+): UCLA course on electrodynamics and optics.
- **Spring 2026** Lab-Elctrcty&Mgntsm [Physics 4BL] (A): UCLA laboratory on electricity and magnetism.

### Software Engineering & Languages

- **Summer 2023** Introduction to Programming (A): DVC introductory programming course.
- **Fall 2023** Adv Programming with C & C++ (A): DVC advanced C/C++ programming.
- **Summer 2024** Object Oriented Progrmng C++ (A): DVC course on object-oriented programming in C++.
- **Fall 2024** Prog Design & Data Structures (A): DVC course on programming design and data structures.
- **Spring 2025** Python Programming (A): DVC Python programming course.
- **Winter 2026** Software Constr [35L] (A): UCLA software construction fundamentals.
- **Spring 2026** Programming Langs [131] (B-): UCLA study of programming language paradigms.

### AI, ML, & Math

- **Fall 2025** Calc of Sevrl Var [32A] (A): UCLA multivariable calculus part A.
- **Fall 2025** Discrete Structures [61] (A): UCLA discrete mathematics.
- **Winter 2026** Calc of Sevrl Var [32B] (B-): UCLA multivariable calculus part B.
- **Spring 2026** Algorithms&Complxty [180] (A-): UCLA algorithms and complexity analysis.
- **Fall 2026** Probability&Stats [131A] (Enrolled): UCLA probability and statistics.
- **Spring 2025** Linear Algebra [MATH-194] (B): DVC linear algebra course.
- **Spring 2025** Intro to Differential Equation [MATH-292] (A): CCC differential equations course.
- **Past** Machine Learning: External MIT Online course on machine learning.

### Other Sciences & Engineering

- **Fall 2024** Engineering Drawing (A): DVC engineering drawing.
- **Spring 2025** Comp Aid Dsgn/Draft Autocad (A): DVC AutoCAD drafting.
- **Summer 2025** 3D Modeling and Animation I (A): DVC 3D modeling and animation.
- **Fall 2025** Mechanics [Physics 1A] (A-): UCLA classical mechanics.
- **Winter 2026** Osciltns&Waves&Flds [Physics 1B] (A): UCLA oscillations, waves, and fields.

## Lab Experiments

<!-- BEGIN:labs -->
| Lab | Date | Focus | Hardware |
|---|---|---|---|
| [Linear and Non-Linear Circuit Elements: I-V Curves in Resistors and LEDs](labs/resistor-led.md) | 2026-04-10 | I-V characterization of a 1 kΩ resistor and colored LEDs using an ESP32. | ESP32, Potentiometer |
| [Sound Waves and Fourier Transforms](labs/sound.md) | 2026-04-21 | Speed of sound via phase-shift analysis, plus Fourier decomposition of complex signals. | ESP32 |
| [RC and RLC Circuit Behavior Measured via ESP32](labs/rlc.md) | 2026-05-01 | ESP32 used as an oscilloscope substitute to characterize RC and RLC transient and frequency response. | ESP32 |
| [Geometric and Wave Optics via Physical Methods and Digital Imaging](labs/optics.md) | 2026-05-15 | Critical angle, refractive index, and laser wavelength measured with prisms, lenses, and double-slit diffraction. | ESP32 Camera |

Full reports live in `99_archive/`; figures in `assets/labs/`.
<!-- END:labs -->

```

## File: context/01_engineering/experience_and_roles.md

```markdown
---
updated: 2026-08-25
domain: engineering
stability: volatile
summary: Generated index of professional and leadership roles. Canonical data lives in experience/.
read_when: Resume work, interview prep, experience questions.
---

> **Generated file — do not edit.** Source of truth is `experience/`.
> Regenerate with `python scripts/build_indexes.py`.

# Professional Experience and Roles

| Role | Organization | Type | Start | End | On CV |
|---|---|---|---|---|---|
| [Software Engineering Intern](experience/dimaag.md) | Dimaag.ai | internship | 2026-06 | 2026-08 | robotics, ml, swe |
| [Lifeguard](experience/lifeguard.md) | Seasonal | other | 2022 | 2025 | no |
| [Robotics Programming Lead](experience/first-robotics.md) | FIRST Robotics | leadership | 2021-08 | 2025-05 | robotics, ml, swe |
| [Head Coach](experience/mathcounts.md) | MathCounts | leadership | 2021-08 | 2025-06 | no |

```

## File: context/01_engineering/project_catalog.md

```markdown
---
updated: 2026-08-25
domain: engineering
stability: volatile
summary: Generated index of all projects. Canonical data lives in projects/.
read_when: Portfolio, resume bullets, or "what have you built" questions.
---

> **Generated file — do not edit.** Source of truth is `projects/`.
> Regenerate with `python scripts/build_indexes.py`.

# Project Catalog

## Tier 1

| Project | Status | Year | Category | Stack | Links |
|---|---|---|---|---|---|
| [Proof](projects/proof.md) | active | 2026 | software | React, MongoDB, Cheerio, Gemini API, Socket.io | [Live](https://proof-cdvj.onrender.com) |
| [Solenoid Bit Reader](projects/solenoid-bit-reader.md) | archived | 2026 | hardware | ESP32, LM358N op-amp, 387-turn copper coil | — |
| [Micromouse Simulator](projects/micromouse-simulator.md) | archived | 2024 | robotics | Java, Java Graphics | [GitHub](https://github.com/Victor2275/MicroMouseSim) |
| [TaskAble](projects/taskable.md) | archived | 2024 | software | React, Firebase Firestore, Gemini API | [GitHub](https://github.com/Victor2275/HOTHproject) |

## Tier 2

| Project | Status | Year | Category | Stack | Links |
|---|---|---|---|---|---|
| [Water Bottle Scale](projects/water-bottle-scale.md) | active | 2026 | hardware | Arduino Uno, Load cell | — |
| [5 Second Rule](projects/five-second-rule.md) | archived | 2024 | software | Unity, C# | [Itch.io](https://mcalmic.itch.io/5-second-rule) |

## Confidentiality Notes

- **Dimaag.ai**: see `experience/dimaag.md`, field `confidential_scope`. The
  documented technical scope is shareable; anything beyond it is deliberately not
  recorded in this vault. Say so rather than speculating.

## Hardware & CAD Models

- None documented yet. The Turret (see `03_craft_and_creative/fabrication_and_cad.md`)
  is the intended first entry. FIRST Robotics models may be added later.

```

## File: context/01_engineering/resume_config.md

```markdown
---
updated: 2026-08-25
domain: engineering
stability: stable
summary: Skill groups, coursework line, and per-variant headlines that configure the generated resume.
read_when: Resume generation, or changing what appears on a resume variant.
skills:
  - group: Programming Languages
    variants: [robotics, ml, swe]
    items: [Python, C++, C, Java, JavaScript, TypeScript, Assembly]
  - group: Robotics & Embedded
    variants: [robotics, ml]
    items:
      [ROS, NVIDIA Isaac Lab, ESP32, PID Control, LiDAR, Sensor Integration, Computer Vision]
  - group: Machine Learning
    variants: [ml, robotics]
    items: [PyTorch, Reinforcement Learning, PPO, Domain Randomization, Sim-to-Real]
  - group: Web & Backend
    variants: [swe, ml]
    items: [React, Node.js, Express, Socket.io, MongoDB, Next.js]
  - group: Tools & Hardware
    variants: [robotics, ml, swe]
    items: [Git, Docker, Linux, SolidWorks, 3D Printing]
# Four, not seven. This list is shared by every variant and is the lowest-signal content on
# the page — the four kept are the ones a recruiter reads as load-bearing, and dropping the
# rest is what brings the SWE variant back under one page. Dropped 2026-08-25: Programming
# Languages, Discrete Structures, Logic Design.
coursework:
  [
    Algorithms and Complexity,
    Software Construction,
    Object-Oriented Design,
    Linear Algebra,
  ]
variants:
  - id: robotics
    label: Robotics
    headline: Autonomous systems — reinforcement-learning planners, LiDAR and vision pipelines, and the embedded instrumentation underneath them.
  - id: ml
    label: Machine Learning
    headline: Reinforcement learning applied to physical systems, from PPO training pipelines in simulation through validated hardware deployment.
  - id: swe
    label: Software Engineering
    headline: Full-stack systems with real-time synchronization and AI-assisted data pipelines, built and tested end to end.
---

# Resume Configuration

Drives `/resume/[variant]` on the site and the generated `99_archive/resume.md`.

## Why this file exists

The resume must be a **generated artifact**, not a maintained document. Experience and project
bullets already live in their own canonical entries, and duplicating them into a hand-written
resume guarantees the two drift. What was *not* already in the vault is the connective tissue:
which skills to list, in what groups, and which of the three variants each group belongs to.
That is what this file holds, and nothing else.

## Editing rules

- **Skills** appear in file order, filtered by `variants`. To emphasise a group for a
  particular variant, move it up; to drop it, remove that variant from its list.
- **Coursework** is a single line on every variant. Keep it to courses that signal capability
  to an engineer reading quickly; grades are never published.
- **Headlines** are one sentence, written in the third person implied by a resume summary
  line. They are the only variant-specific prose on the document.

Everything else — which roles, projects, and labs appear — comes from the `resume_variants`
field on each canonical entry. Add or remove a variant there, not here.

```

## File: context/01_engineering/technical_standards.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Preferred languages, tooling, OS, and code guidelines.
read_when: Writing or reviewing code; bootstrapping a project.
---

# Technical Standards

## 1. Programming Languages
- **Primary**: Python
- **Secondary**: Java, C++
- **Tertiary (Learning/Adapting)**: JavaScript, C, Assembly, C#, Elisp

## 2. Environment & Tooling
- **OS**: Windows (Primary driver)
- **IDE**: Antigravity IDE
- **Version Control**: Git / GitHub
- **Other Go-To Tech**: ROS, NVIDIA Isaac Lab, PyTorch, React, Node.js, Express, MongoDB, Docker, Linux, Solidworks, 3D Printing.

```

## File: context/01_engineering/experience/dimaag.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: SWE internship building a hybrid RL and classical local planner for autonomous vehicles.
read_when: Resume work, interview prep, experience questions.
title: Software Engineering Intern
org: Dimaag.ai
slug: dimaag
type: internship
date_start: 2026-06
date_end: 2026-08
resume_variants: [robotics, ml, swe]
public: true
bullets:
  - >-
    Architected a hybrid Reinforcement Learning and classical local planner for autonomous
    vehicles to improve accuracy and speed of travel along complex curved paths
  - >-
    Implemented PPO algorithm training pipelines, 2D LiDAR sensor raycasting, and domain
    randomization within NVIDIA Isaac Lab
  - >-
    Bridged the sim-to-real gap by validating policies across various simulators,
    implementing domain randomization to ensure seamless hardware deployment
  - >-
    Validated and deployed autonomous navigation policies on physical hardware, achieving
    reliable tracking at >12 mph with sub-decimeter trajectory accuracy
  - >-
    Integrated advanced LLM tooling into the engineering pipeline to automate architectural
    documentation, generate robust system test cases, and parse complex training logs
confidential_scope: >-
  The technical architecture and contributions recorded in this file — PPO training
  pipelines, LiDAR raycasting, Isaac Lab, sim-to-real validation, tracking accuracy — are
  shareable and safe for resumes, interviews, and portfolio material. Dimaag.ai business and
  product details beyond that scope remain confidential and are deliberately not recorded
  anywhere in this vault. If a question needs specifics not found here, say so rather than
  speculating.
---

# Software Engineering Intern — Dimaag.ai

Architected a hybrid Reinforcement Learning and classical local planner for autonomous
vehicles.

## Key contributions

- Implemented PPO training pipelines, 2D LiDAR raycasting, and domain randomization in
  NVIDIA Isaac Lab.
- Validated policies across simulators and physical hardware (tracking >12 mph with
  sub-decimeter accuracy).
- Integrated LLM tooling for automated documentation, test case generation, and log parsing.

```

## File: context/01_engineering/experience/first-robotics.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Software lead for a 15-20 person FIRST team; PID, vision, and LiDAR localization.
read_when: Resume work, interview prep, experience questions.
title: Robotics Programming Lead
org: FIRST Robotics
slug: first-robotics
type: leadership
date_start: 2021-08
date_end: 2025-05
links:
  org: https://www.firstinspires.org/
resume_variants: [robotics, ml, swe]
public: true
bullets:
  - >-
    Led software development for a 15-20 member robotics team, building semi-autonomous
    competition robots
  - >-
    Implemented PID control systems, vision tracking (Limelight), and LiDAR-based
    localization
  - >-
    Collaborated with mechanical and electrical leads to safely deploy and test software on
    the physical robot hardware
  - >-
    Engineered autonomous routines and vision pipelines that propelled the team to the FIRST
    World Championships, ranking in the top 5% of regional competitors
---

# Robotics Programming Lead — FIRST Robotics

Led software development for a 15-20 member team building semi-autonomous robots.

## Key contributions

- Implemented PID control systems, vision tracking (Limelight), and LiDAR-based localization.
- Engineered autonomous routines propelling the team to FIRST World Championships
  (top 5% of regionals).
- Safely deployed and tested software on physical hardware.

```

## File: context/01_engineering/experience/lifeguard.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Seasonal certified lifeguard — CPR, First Aid, lifesaving.
read_when: Resume work, interview prep, experience questions.
title: Lifeguard
org: Seasonal
slug: lifeguard
type: other
date_start: 2022
date_end: 2025
seasonal: true
resume_variants: []
public: true
bullets: []
---

# Lifeguard

Certified in CPR, First Aid, and lifesaving techniques. Worked seasonally.

```

## File: context/01_engineering/experience/mathcounts.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Head coach running weekly competitive math training for 15-25 students.
read_when: Resume work, interview prep, experience questions.
title: Head Coach
org: MathCounts
slug: mathcounts
type: leadership
date_start: 2021-08
date_end: 2025-06
resume_variants: []
public: true
bullets: []
---

# Head Coach — MathCounts

Led weekly competitive math training for 15-25 students.

## Key contributions

- Coordinated assistant coaches and designed problem-solving curricula.
- Developed leadership and technical communication skills.

```

## File: context/01_engineering/labs/optics.md

```markdown
---
updated: 2026-08-21
domain: engineering
stability: stable
summary: Critical angle, refractive index, and laser wavelength measured with prisms, lenses, and double-slit diffraction.
read_when: Academic background, hands-on instrumentation, or portfolio questions.
title: Geometric and Wave Optics via Physical Methods and Digital Imaging
slug: optics
course: Physics 4BL
term: Spring 2026
date: 2026-05-15
collaborators: [Ethan Chang]
category: hardware
tags: [optics, imaging, esp32-cam]
stack: [ESP32 Camera]
report: ../../99_archive/optics_lab.md
hero_image: optics_lab_image1.png
image_count: 15
resume_variants: []
public: false
bullets:
  - >-
    Measured critical angles, refractive indices, and laser wavelength using prisms, lenses, and double-slit diffraction captured with an ESP32 camera
---

# Geometric and Wave Optics via Physical Methods and Digital Imaging

Physics 4BL, Spring 2026 · 2026-05-15

## Abstract

Examined both the geometric and wave properties of light via refraction, total internal reflection, lens optics, and double slit diffraction. A prism, three lenses (double convex, double concave, and plano convex), and a double slit apparatus were used to experimentally determine the critical angle, refractive indices, and laser wavelength, captured using an ESP32 camera.

## Notes

Full report with figures and data: [`99_archive/optics_lab.md`](../../99_archive/optics_lab.md).
Figures live in `context/assets/labs/`. Group lab — co-authored with Ethan Chang.

```

## File: context/01_engineering/labs/resistor-led.md

```markdown
---
updated: 2026-08-21
domain: engineering
stability: stable
summary: I-V characterization of a 1 kΩ resistor and colored LEDs using an ESP32.
read_when: Academic background, hands-on instrumentation, or portfolio questions.
title: "Linear and Non-Linear Circuit Elements: I-V Curves in Resistors and LEDs"
slug: resistor-led
course: Physics 4BL
term: Spring 2026
date: 2026-04-10
collaborators: [Ethan Chang, Savanah Elias]
category: hardware
tags: [esp32, circuits, data-acquisition]
stack: [ESP32, Potentiometer]
report: ../../99_archive/resistor_lab.md
hero_image: resistor_lab_image1.png
image_count: 12
resume_variants: []
public: false
bullets:
  - >-
    Characterized linear and non-linear circuit elements by generating I-V curves for a 1 kΩ resistor and multiple colored LEDs using an ESP32 and a potentiometer-controlled circuit
---

# Linear and Non-Linear Circuit Elements: I-V Curves in Resistors and LEDs

Physics 4BL, Spring 2026 · 2026-04-10

## Abstract

Investigated the relationship between voltage, current, and resistance by testing Ohm's Law and examining non-linear circuit elements. Using an ESP32 microcontroller and a potentiometer-controlled circuit, voltage measurements were collected across a 1 kΩ resistor and several colored LEDs to generate I-V curves.

## Notes

Full report with figures and data: [`99_archive/resistor_lab.md`](../../99_archive/resistor_lab.md).
Figures live in `context/assets/labs/`. Group lab — co-authored with Ethan Chang, Savanah Elias.

```

## File: context/01_engineering/labs/rlc.md

```markdown
---
updated: 2026-08-21
domain: engineering
stability: stable
summary: ESP32 used as an oscilloscope substitute to characterize RC and RLC transient and frequency response.
read_when: Academic background, hands-on instrumentation, or portfolio questions.
title: RC and RLC Circuit Behavior Measured via ESP32
slug: rlc
course: Physics 4BL
term: Spring 2026
date: 2026-05-01
collaborators: [Ethan Chang]
category: hardware
tags: [esp32, data-acquisition, signal-processing, instrumentation]
stack: [ESP32]
report: ../../99_archive/rlc_lab.md
hero_image: rlc_lab_image1.png
image_count: 16
resume_variants: []
public: false
bullets:
  - >-
    Built an ESP32-based data acquisition system as an oscilloscope substitute to characterize RC and RLC transient and frequency response
  - >-
    Extracted circuit time constants from exponential curve fits and identified resonance in underdamped oscillatory responses
---

# RC and RLC Circuit Behavior Measured via ESP32

Physics 4BL, Spring 2026 · 2026-05-01

## Abstract

Investigated the time-dependent and frequency-dependent behavior of RC and RLC circuits using an ESP32-based data acquisition system as an alternative to an oscilloscope. For RC circuits, voltage responses to square wave inputs were recorded and analyzed through exponential curve fits to extract time constants. RLC resonance curves were analyzed for underdamped oscillatory response.

## Notes

Full report with figures and data: [`99_archive/rlc_lab.md`](../../99_archive/rlc_lab.md).
Figures live in `context/assets/labs/`. Group lab — co-authored with Ethan Chang.

```

## File: context/01_engineering/labs/sound.md

```markdown
---
updated: 2026-08-21
domain: engineering
stability: stable
summary: Speed of sound via phase-shift analysis, plus Fourier decomposition of complex signals.
read_when: Academic background, hands-on instrumentation, or portfolio questions.
title: Sound Waves and Fourier Transforms
slug: sound
course: Physics 4BL
term: Spring 2026
date: 2026-04-21
collaborators: [Ethan Chang, Savanah Elias]
category: hardware
tags: [signal-processing, fourier, acoustics]
stack: [ESP32]
report: ../../99_archive/sound_lab.md
hero_image: sound_lab_image1.png
image_count: 10
resume_variants: []
public: false
bullets:
  - >-
    Measured the speed of sound via phase-shift analysis and applied Fourier transforms to decompose complex acoustic signals and identify material properties of unknown media
---

# Sound Waves and Fourier Transforms

Physics 4BL, Spring 2026 · 2026-04-21

## Abstract

Explored the physics of sound: its speed in air, and the analysis of complex sound signals. Measured the speed of sound via phase shift analysis and used Fourier transforms to decompose complex signals, demonstrating the relationships between wave speed, frequency, and wavelength to identify material properties of unknown mediums.

## Notes

Full report with figures and data: [`99_archive/sound_lab.md`](../../99_archive/sound_lab.md).
Figures live in `context/assets/labs/`. Group lab — co-authored with Ethan Chang, Savanah Elias.

```

## File: context/01_engineering/projects/five-second-rule.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Unity game built in a 72-hour Ludum Dare jam, with combat and enemy AI.
read_when: Portfolio, resume bullets, or "what have you built" questions.
title: 5 Second Rule
slug: five-second-rule
tier: 2
status: archived
year: 2024
category: software
tags: [game, hackathon, unity]
stack: [Unity, C#]
event: Ludum Dare Game Jam 58
links:
  itch: https://mcalmic.itch.io/5-second-rule
resume_variants: []
public: true
bullets: []
---

# 5 Second Rule

## The problem

> **To write:** what were you actually solving, and what made it hard? The constraint
> is the interesting part - what you could not do, or could not afford, or could not
> measure. This is the section interviewers open with.

## Architecture

Game created during Ludum Dare Game Jam 58 (72-hour cycle). Implemented player movement,
combat, abilities, and enemy AI.

## What did not work

> **To write:** what you tried first and abandoned, and why. Almost no student
> portfolio has this section, which is exactly why it is convincing to an engineer.

## Measured results

> **To write:** one number, ideally more. Accuracy, latency, throughput, uptime, scale.
> A result without a number reads as a claim; with one it reads as engineering.

```

## File: context/01_engineering/projects/micromouse-simulator.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Java maze-solving simulator with Flood Fill pathfinding and a visualization engine.
read_when: Portfolio, resume bullets, or "what have you built" questions.
title: Micromouse Simulator
slug: micromouse-simulator
tier: 1
status: archived
year: 2024
category: robotics
tags: [algorithms, simulation, visualization]
stack: [Java, Java Graphics]
links:
  github: https://github.com/Victor2275/MicroMouseSim
resume_variants: [robotics, swe]
public: true
bullets:
  - Designed a full maze-solving simulator for Micromouse competitions using Java
  - Implemented Flood Fill pathfinding algorithm to autonomously solve unknown mazes
  - >-
    Built a graphical visualization engine using Java Graphics to animate traversal and
    decisions
  - Developed file parsing pipeline to load and replay real competition mazes
---

# Micromouse Simulator

## The problem

> **To write:** what were you actually solving, and what made it hard? The constraint
> is the interesting part - what you could not do, or could not afford, or could not
> measure. This is the section interviewers open with.

## Architecture

Maze-solving simulator featuring Flood Fill pathfinding algorithm and a graphical
visualization engine. Uses a file parsing pipeline to load competition mazes.

## What did not work

> **To write:** what you tried first and abandoned, and why. Almost no student
> portfolio has this section, which is exactly why it is convincing to an engineer.

## Measured results

> **To write:** one number, ideally more. Accuracy, latency, throughput, uptime, scale.
> A result without a number reads as a claim; with one it reads as engineering.

## Post-mortem

Learned various algorithms to solve mazes, and learned how to iterate and understand big O.

```

## File: context/01_engineering/projects/proof.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: volatile
summary: Full-stack recipe PWA with AI-assisted import and real-time cross-device timers.
read_when: Portfolio, resume bullets, or "what have you built" questions.
title: Proof
slug: proof
tier: 1
status: active
year: 2026
category: software
tags: [web, ai, pwa, full-stack]
stack: [React, MongoDB, Cheerio, Gemini API, Socket.io]
links:
  live: https://proof-cdvj.onrender.com
resume_variants: [swe, ml]
public: true
bullets:
  - >-
    Architected a full-stack progressive web application (PWA) with MongoDB and React to
    version-control recipe iterations and manage real-time inventory states
  - >-
    Integrated the Gemini API and web scraping (Cheerio) to autonomously extract,
    intelligently restructure, and import recipes directly from raw URLs
  - >-
    Engineered a real-time, cross-device timer synchronization system using Socket.io to
    track concurrent baking stages across multiple platforms
  - >-
    Maintained application stability by creating over 100 automated test cases to prevent
    bugs during new feature deployments
---

# Proof

## The problem

> **To write:** what were you actually solving, and what made it hard? The constraint
> is the interesting part - what you could not do, or could not afford, or could not
> measure. This is the section interviewers open with.

## Architecture

Full-stack progressive web app (PWA) with MongoDB/React. Real-time cross-device sync via
Socket.io. Gemini API handles extracting and restructuring recipe data from scraped URLs.

## What did not work

> **To write:** what you tried first and abandoned, and why. Almost no student
> portfolio has this section, which is exactly why it is convincing to an engineer.

## Measured results

> **To write:** one number, ideally more. Accuracy, latency, throughput, uptime, scale.
> A result without a number reads as a claim; with one it reads as engineering.

## Post-mortem

Still in progress, no post-mortem yet.

## Notes

Hosted on Render's free tier, which sleeps after roughly 15 minutes idle. A external pinger
hits the backend every 5 minutes to keep it warm. This works, but it consumes most of a free
Render account's monthly instance-hour allowance on a single service.

```

## File: context/01_engineering/projects/solenoid-bit-reader.md

```markdown
---
updated: 2026-08-21
domain: engineering
stability: stable
summary: Macro-scale hard-disk-reader analog decoding falling magnetic bits at 100% accuracy.
read_when: Portfolio, robotics resume bullets, or embedded/instrumentation questions.
title: Solenoid Bit Reader
slug: solenoid-bit-reader
tier: 1
status: archived
year: 2026
category: hardware
tags: [esp32, electromagnetism, signal-processing, instrumentation, embedded]
stack: [ESP32, LM358N op-amp, 387-turn copper coil]
links: {}
image: /labs/solenoid_lab_image1.png
figure_count: 10
event: Physics 4BL
group_size: 2
resume_variants: [robotics]
public: true
bullets:
  - Built a macro-scale hard-disk-reader analog — a 387-turn copper coil on a high-permeability iron core, read by an ESP32 — decoding falling binary magnetic bits via Faraday's Law of Induction
  - Amplified sensor output 20x with an LM358N op-amp to fit the ESP32 ADC's 0-3.3V window, and calibrated bit-time windows against gravitational acceleration to establish the system's 40 mm resolution limit
  - Achieved 100% decoding accuracy across all binary test sequences using a start-bit clock synchronization scheme
---

# Solenoid Bit Reader

A hard drive reads data by sensing the magnetic field of bits passing a coil. This is that
mechanism rebuilt at a scale you can watch: magnets fall past a hand-wound solenoid under
gravity, and the induced voltage spike is decoded back into the binary sequence they encode.

## The problem

Faraday induction gives you a voltage proportional to the *rate of change* of flux, so a
falling magnet produces a brief spike rather than a level. Two constraints shaped the design:

- **The ESP32's ADC only reads 0-3.3V**, and the raw coil output was far below that. An
  LM358N operational amplifier stage provides 20x gain to bring spikes into readable range.
- **Gravity means the bits do not arrive at a constant rate.** Each successive magnet is
  moving faster than the last, so the time window for a bit shrinks continuously down the
  drop.

## Design decisions

**Presence-based encoding over polarity-based.** With a unipolar ADC, encoding a 1 as
north-up and a 0 as south-up would put half the signal below the readable floor. Encoding
instead as magnet-present versus empty-slot keeps every symbol inside the window, at the cost
of needing a clock to know when an empty slot went by.

**A start bit for clock synchronization.** Since empty slots produce no signal, the decoder
cannot count them directly. A known start bit establishes t=0, and a calibration matrix built
across three intervals maps the shrinking windows that follow.

## What did not work

> **To write:** what you tried first and abandoned, and why. Almost no student
> portfolio has this section, which is exactly why it is convincing to an engineer.

## Results

Four binary sequences decoded at 100% accuracy. The calibration work established a 40 mm
resolution limit — closer than that and adjacent spikes merge at the velocities reached
toward the end of the drop.

```

## File: context/01_engineering/projects/taskable.md

```markdown
---
updated: 2026-08-20
domain: engineering
stability: stable
summary: Hackathon education app linking student and teacher views with AI task breakdowns.
read_when: Portfolio, resume bullets, or "what have you built" questions.
title: TaskAble
slug: taskable
tier: 1
status: archived
year: 2024
category: software
tags: [web, ai, hackathon, education]
stack: [React, Firebase Firestore, Gemini API]
event: UCLA HOTH
links:
  github: https://github.com/Victor2275/HOTHproject
resume_variants: [swe, ml]
public: true
bullets:
  - >-
    Built an educational web app linking student interfaces to a teacher dashboard through
    Firebase Firestore, developed with a small team during UCLA HOTH
  - >-
    Integrated the Gemini API to generate task breakdowns that decompose assignments into
    manageable steps for students
  - >-
    Implemented a reward system and emotion logging to track student engagement alongside
    task completion
---

# TaskAble

Built at UCLA HOTH (Hack on the Hill).

## The problem

> **To write:** what were you actually solving, and what made it hard? The constraint
> is the interesting part - what you could not do, or could not afford, or could not
> measure. This is the section interviewers open with.

## Architecture

Educational web app linking student interfaces to a teacher dashboard via Firebase. Gemini
API generates task breakdowns. Features reward system and emotion logging.

## What did not work

> **To write:** what you tried first and abandoned, and why. Almost no student
> portfolio has this section, which is exactly why it is convincing to an engineer.

## Measured results

> **To write:** one number, ideally more. Accuracy, latency, throughput, uptime, scale.
> A result without a number reads as a claim; with one it reads as engineering.

## Post-mortem

Began to understand how to use AI workflows, as well as working in a small team of
non-technical people.

```

## File: context/01_engineering/projects/water-bottle-scale.md

```markdown
---
updated: 2026-08-24
domain: engineering
stability: volatile
summary: Battery-powered load-cell scale that measures how much water is left in a bottle.
read_when: Portfolio; hardware and embedded work.
title: Water Bottle Scale
slug: water-bottle-scale
tier: 2
status: active
year: 2026
category: hardware
tags: [arduino, sensors, embedded, hardware]
stack: [Arduino Uno, Load cell]
links: {}
draft: true
resume_variants: []
public: true
bullets:
  - Built a rechargeable, water-sealed scale that reads the remaining water in a bottle from a load sensor, powered by an Arduino Uno and an internal battery.
---

# Water Bottle Scale

A scale that measures how much water is left in a water bottle. It uses a load sensor to read
the remaining weight, runs from an internal rechargeable battery, and the enclosure is sealed
against water so it survives being around a bottle that gets refilled and spilled.

Built on an Arduino Uno.

## The problem

> **To write:** what actually made this hard? Weighing something at rest is easy; a bottle
> that gets picked up, refilled and knocked over is not. Say what the real difficulty was.

## Architecture

> **To write:** which load cell and amplifier, how the cell is mounted, how the seal is
> achieved and what it is rated for, and the battery - chemistry, capacity, charge circuit.

## What did not work

> **To write:** what did you try first and abandon? A sealing approach, a mounting, a sensor
> that drifted? This section is the one interviewers remember.

## Measured results

> **To write:** one number. Accuracy in grams or millilitres, or measured battery runtime.
> This is what unlocks `draft: false` and a place on the resume.

```

## File: context/02_physical_performance/benchmarks_and_logs.md

```markdown
---
updated: 2026-08-20
domain: physical
stability: volatile
summary: Dragon boat PRs, SPM targets, nutrition baseline, back rehab protocol.
read_when: Training, nutrition, recovery, or performance questions.
---

# Benchmarks and Logs

## 1. Core Goal and Objective
- **Target:** Sub-2:00 weight-adjusted 500m split in Dragon Boat.
- **Milestone Date:** May 2027.
- **Role:** Engine.

## 2. Telemetry and Targets
*Current Weight: 215 lbs. Drag Factor: 1.*

### Personal Records (PRs)
- **Raw PERG 500m:** 2:17
- **Rower 5k:** 18:50 (approx. 1:53 split)
- **Bench Press (5RM):** 145 lbs
- **Squat (5RM):** *Baseline testing needed*

### SPM (Stroke Per Minute) Targets
- **200m Sprints:** 80 - 85+ SPM (Maximal explosive power).
- **500m Race Pace:** 72 - 76 SPM (Sustained threshold).
- **2000m Head Race:** 62 - 66 SPM (Aerobic power, maximum length/reach).

## 3. Nutrition & Recovery Baseline
To sustain 7 days of active movement at 215 lbs, glycogen and protein synthesis are paramount.

**Daily Habits:**
- **Protein**: 170g - 200g daily.
- **Creatine**: 5g daily (for maximum power output and recovery).
- **Hydration**: 0.5 to 1.0 Gallon daily.
- **Pre-Workout**: Light meal with carbs 1-2 hours before water/PERG.
- **Post-Workout**: Large meal/Greek yogurt at dining hall for glycogen replenishment.

**Lower Back Rehab Protocol:**
*(Perform these daily or post-practice to prevent lower back shear during rotation.)*
- **Pallof Presses**: 3x10 per side (Anti-rotation stiffening).
- **Couch Stretch / Psoas Release**: 2 mins per side (Releases hip flexors that pull on the lower back).
- **Hamstring Flossing**: 1 min per side (Allows hips to hinge properly on the erg).
- **Glute Bridges**: 3x15 (Activates glutes to fire during the leg drive, saving the back).

```

## File: context/02_physical_performance/training_blocks.md

```markdown
---
updated: 2026-08-20
domain: physical
stability: stable
summary: Weekly training split, strength program, technique focus, taper protocol.
read_when: Programming workouts or planning around training load.
---

# Training Blocks and Active Periodization

## 1. The "Everyday" Schedule & Load Management
*Goal: Maintain a 7-day-a-week training habit without central nervous system burnout.*

**Polarization Rule (80/20):** 80% of cardio volume must be strictly Zone 2 (conversational pace, HR ~135-150 bpm). Only 20% should be high-intensity interval training (HIIT).

### Weekly Layout
- **Monday**: 
  - Solo PERG (High Intensity: e.g., 15 x 30s ON / 30s OFF)
  - Lower Body & Core Strength
- **Tuesday**: 
  - Team Land Practice (Form & Mobility Focus)
  - Zone 2 Recovery Cardio (Concept2 Rower, 30-45 mins steady state)
- **Wednesday**: 
  - Solo PERG (Zone 2 Technique Focus: Right-side paddling drills for ambidextrous balance)
  - Push/Pull Strength
- **Thursday**: 
  - Team Land Practice (Taxing / Conditioning)
- **Friday**: 
  - Active Recovery (Zone 2 Rower or Swimming)
  - Light Mobility & Lower Back Rehab
- **Saturday**: 
  - 1-hour Water Practice (50% Active Paddling / 50% Drills)
- **Sunday**: 
  - 1-hour Water Practice (50% Active Paddling / 50% Drills)

---

## 2. Strength & Power Architecture
*Goal: Safe, beginner-friendly linear progression to build structural armor and prevent lower-back shear.*

### Phase 1: Structural Foundations (8-12 weeks)
**Rest Intervals:** 3 Minutes between compound sets.
**Progression:** Add 5 lbs per week to Squats/RDLs; 2.5 lbs to Upper Body. If form breaks, deload by 10%.

**Workout A: Legs & Rotational Power**
- **Goblet or Front Squats**: 3 sets of 5 reps (Focus: Upright torso, driving through quads).
- **Romanian Deadlifts (RDLs)**: 3 sets of 8 reps (Focus: Hamstring stretch, glute squeeze, keeping lower back neutral).
- **Box Jumps**: 3 sets of 5 reps (Focus: Explosive leg drive).
- **Cable Woodchoppers (Heavy)**: 3 sets of 8 reps per side.

**Workout B: Push/Pull & Grip**
- **Overhead Barbell Press**: 3 sets of 5 reps.
- **Pendlay Rows**: 3 sets of 5 reps (Focus: Explosive pull, lat engagement).
- **Bench Press**: 3 sets of 5 reps.
- **Farmer's Carries**: 3 sets of 30 meters (Heavy dumbbells, focus on grip crush and core bracing).
- **Medicine Ball Slams/Throws**: 3 sets of 10 reps (Focus: Speed and rotational power transfer).

---

## 3. Dragon Boat Mechanics & Technique Focus
- **Current Weakness:** Rotation and core transfer.
- **Correction:** The core transfers power, it doesn't generate it. Leg drive off the footrest must initiate the stroke. Ensure glutes are firing. Use Pallof Presses as a pre-activation warmup to train *anti-rotation* and stiffen the trunk.
- **Side Preference:** Currently left-dominant. Implement 10-15 minutes of right-side technique paddling on every Zone 2 PERG day.

---

## 4. Race Tapering Protocol (7-Day Lead Up)
*Goal: Shed fatigue without losing neuromuscular sharpness.*

- **Days 7 to 4:** Cut total volume (minutes/meters) by 40-50%. Keep intensity high (e.g., hit race pace for short bursts, 10-20 seconds).
- **Days 3 to 2:** Cut total volume by 70%. Very short, explosive bursts (5-10 strokes at 100% effort) just to keep the nervous system firing.
- **Day 1 (Day before race):** Active recovery. 15-20 minutes of very light movement, stretching, and mental visualization. No heavy lifting.
- **Race Day:** Maximum effort.

```

## File: context/03_craft_and_creative/fabrication_and_cad.md

```markdown
---
updated: 2026-08-20
domain: craft
stability: stable
summary: CAD stack, 3D printing setup, makerspace access, the Turret capstone.
read_when: CAD, 3D printing, hardware fabrication questions.
---

# Fabrication and CAD

## 1. Overarching Capstone Goal
- **Project:** The Turret.
- **Description:** A physical hardware build integrating 3D printed components and microcontrollers (ESP32) for targeting and movement. 
- **Methodology:** Project-based, hands-on learning broken into highly modular tasks to fit a 1-2 hour/week constraint.

## 2. Software Stack
- **SolidWorks (Primary):** Used for rigid, parametric engineering, robotics part design, and tolerancing.
- **Blender (Secondary):** Used exclusively for fun, organic mesh modeling.
- **Fusion 360:** Backup parametric tool if SolidWorks is unavailable.
- **Figma:** Target software for designing UI mockups for hardware/web integration.

## 3. Hardware & Manufacturing Logistics
- **Printing Technology:** FDM (Fused Deposition Modeling).
- **Manufacturing Location:** UCLA Makerspace (access to FDM printers and CAM/CNC routing).
- **Electronics:** ESP32 microcontrollers, integrated with physics-based robotics logic.
- **Documentation:** Builds and processes will be photographed and videographed for portfolio logging. 
- **Reverse Engineering:** Relying on makerspace digital calipers to measure and model tolerances.

```

## File: context/03_craft_and_creative/pursuits/culinary.md

```markdown
---
updated: 2026-08-25
domain: craft
stability: stable
summary: Precision baking as portfolio breadth — the domain that motivated the Proof project.
read_when: Public-site breadth section, or explaining where Proof came from.
title: Precision Baking
slug: culinary
public: true
order: 3
kicker: Formulas, by weight
discipline: Craft
resume_variants: []
bullets:
  - Cooks and bakes to gram-accurate formulas rather than volume measures, treating a recipe as a parameterised process to be versioned and iterated.
  - Working through sous-vide, fermentation, and other technique-led methods where the controlled variable is time and temperature rather than ingredients.
facts:
  - label: Measurement
    value: By weight
  - label: Techniques
    value: Sous-vide, fermentation
  - label: Built from it
    value: Proof
carryover: >-
  Proof exists because of this. Keeping formulas by weight across dozens of iterations is a
  version-control problem wearing an apron, and the recipe PWA is the direct result of
  wanting real diffs between one bake and the next.
---

# Precision Baking

Portfolio-facing framing only. The formulas themselves are **not in this vault** — Victor keeps
recipes in Proof (https://proof-cdvj.onrender.com), which is the thing this pursuit exists to
explain. `culinary_formulas.md` was retired to `99_archive/superseded/` on 2026-08-25 once Proof
had replaced it in practice.

This is the one pursuit with a direct engineering artifact attached: the Proof project in
`01_engineering/projects/proof.md`. That link is the reason this belongs on a portfolio at
all, rather than reading as an unrelated hobby.

```

## File: context/03_craft_and_creative/pursuits/dragon-boat.md

```markdown
---
updated: 2026-08-20
domain: physical
stability: stable
summary: Dragon boat as portfolio breadth — the publishable framing, not the training telemetry.
read_when: Public-site breadth section, or resume "Interests" line.
title: Dragon Boat
slug: dragon-boat
public: true
order: 1
kicker: Competitive paddling
discipline: Athletics
resume_variants: []
bullets:
  - Trains as an engine seat, the position responsible for sustained power output through the middle of the boat.
  - Working toward a sub-2:00 500m split by May 2027, with training programmed against stroke-rate targets for sprint, race, and head-race distances.
facts:
  - label: 500m erg
    value: "2:17"
  - label: 5k erg
    value: "18:50"
  - label: Seat
    value: Engine
carryover: >-
  Structured training is a measurement problem before it is a fitness problem. Programming
  against stroke-rate bands and split targets is the same discipline as instrumenting a
  system: decide what to measure, hold the protocol steady, and let the numbers say whether
  the change worked.
---

# Dragon Boat

Portfolio-facing framing only. The operational detail — bodyweight, nutrition targets, the
lower-back rehab protocol, weekly programming — stays in
`02_physical_performance/benchmarks_and_logs.md` and is never published.

The two erg PRs above are duplicated from that file on purpose, because the public site
needs them before the Athletics database exists. Once workout data lands in Postgres, PRs
should be read from there and removed from this frontmatter.

```

## File: context/03_craft_and_creative/pursuits/fabrication.md

```markdown
---
updated: 2026-08-20
domain: craft
stability: stable
summary: CAD and fabrication as portfolio breadth — SolidWorks, FDM, makerspace, the Turret.
read_when: Public-site breadth section, or resume "Skills" line.
title: Fabrication and CAD
slug: fabrication
public: true
order: 2
kicker: Design for manufacture
discipline: Hardware
resume_variants: []
bullets:
  - Designs rigid parametric parts in SolidWorks with explicit tolerancing, and prints them FDM at the UCLA Makerspace.
  - Reverse-engineers existing hardware with digital calipers to model mating parts against measured, rather than assumed, dimensions.
facts:
  - label: Primary CAD
    value: SolidWorks
  - label: Process
    value: FDM
  - label: Shop
    value: UCLA Makerspace
carryover: >-
  Designing a part that has to physically fit another part is unforgiving in a way software
  rarely is: a tolerance error is not a failing test, it is a printed object in the bin. It
  is the fastest feedback loop available for learning to specify something precisely before
  committing to it.
---

# Fabrication and CAD

Portfolio-facing framing. The full stack, makerspace logistics, and the Turret capstone plan
live in `03_craft_and_creative/fabrication_and_cad.md`.

The Turret is deliberately not listed as a project yet — it starts after move-in on
2026-09-20. When it does, it becomes a canonical entry under `01_engineering/projects/`
and this file should stop being the place it is mentioned.

```

## File: context/04_operations/current_sprint.md

```markdown
---
updated: 2026-08-25
domain: operations
stability: volatile
summary: This week's goals, operating rules, and academic tracker.
read_when: Always — anything about current priorities or scheduling.
---

# Current Sprint: 1-Week Horizon

## 1. Active Sprint Goals
*Identify top 3 priorities across all domains for the week here.*
- **Engineering / Career:** 2ndMind is live at https://victorgusev.vercel.app. V1 complete
  2026-08-21. V2 features 0, 1, 2, 4 and 5 shipped; 3 is largely built; 6 (AI) is the only
  one not started. Its scope is now decided (V2_PLAN rev 2, D-076 to D-080).
- **Athletics:** Programming resumes at move-in (2026-09-20); nothing scheduled before then.
- **Academics:** Fall term starts 2026-09-20. Nothing due this sprint.

### 2ndMind build status
Plan runs to 2026-09-18 (real code deadline — travel 08-29 to 09-07, move-in 09-19).

- [x] Days 1-6 — vault refactor, typed parser, public-field whitelist
- [x] Days 7-12 — public site, breadth section, analytics, SEO, deployed
- [x] Days 13-15 — resume generator, three variants, print-to-PDF
- [x] Days 16-20 — passkey auth, vault writes, sprint editor, logbook, dashboard
- [x] Days 21-29 — freshness widget, athletics (Neon + Drizzle, Hevy import, PRs)
- [x] Days 30-32 — Work, Academics (tracker), Calendar, Hobbies. **V1 complete.**

### V2 — scoped 2026-08-21, replanned 2026-08-24, revised 2026-08-25

Full ordered plan with difficulty and estimates: `V2_PLAN.md` at the repo root.
Scope decided 2026-08-24: **features only** — per-session revocation and error
aggregation move to V3.

Revision 2 (2026-08-25) changed four things, all Victor's call:

- The AI approval gate is over **structured proposals, not a markdown diff** — sprint goals
  are Postgres rows, so the dependency that justified a 10h diff UI did not exist. 10h → 4h,
  and nothing AI-driven writes to the vault in V2 at all (D-080).
- **Semantic search is reinstated** — the $10 is per month, not lifetime. It stays last in
  build order, and the new cut line is its incremental re-embedding (D-079).
- The case-study page design is built **against fixtures now**, not deferred behind the prose.
- "Close out Today" loses its one-real-day-of-use gate.

Revisions 3 and 4 (2026-08-25) added ten requested items as `V2_PLAN.md` §7. **Seven are in
V2**: the domain, the uploads list, the four uploaded images, retiring culinary, the public
`/now` Working page, the public→private button, and read-only access to the job sheet.

**Semantic search is cut** to pay for them (D-087) — 12h out against 11.5h in, so V2 got
shorter while gaining three features. It has now been assessed three times: cut on cost,
reinstated when the budget turned out to be monthly, cut on time. **V3 is its own document,
`V3_PLAN.md`** — resumes, filament and printers, and editing the job sheet, ~26h scheduled at
a term-time rate of ~4h/week.

Budget after all revisions: **~41.5h of my work against ~60h available**, ~34% slack.

**Done 2026-08-25 (~5.5h):** housekeeping, the resume page-count gate and one-page fix
(§1.1), the case-study page design (§1.2), and feature 3's close-out (§1.4). Remaining before
Taiwan, in order: the domain (§7.1, blocks the passkey), summarise-my-week (§1.5), the images
(§7.3), culinary (§7.4) — ~6h against ~10.5h left.

**Found while doing it:** `gemini-2.5-flash` was retired and every AI call had been 404ing
silently — the daily summary showed a fallback string and nothing else said so. Now
`gemini-3.6-flash` and verified working (D-085). Failures were also being cached for six
hours (D-086). Both were blockers for feature 6 that no one knew about.


Priority is Victor's: fix V1's findings and make it faster and cleaner before adding
features. Four ship before term, two during. Full plan and reasoning in `web/DECISIONS.md`
D-036 to D-039.

- [x] **0 · Foundation** — done 2026-08-21. Vault reads cached and time-limited; tasks live
      in Postgres, so saves are immediate and no longer commit or deploy. Measured: work
      320->69ms, calendar 377->32ms, academics 761->186ms.
- [x] **1 · Redesign** — done 2026-08-21. Magenta palette, active tab, single-shot sweep,
      freshness as a badge, shared page shell with collapsible reference prose, scrolling
      nav on narrow screens.
- [x] **2 · Structured logging** — done 2026-08-21. Six categories, fields generated from
      one definition file, full-text search over everything, dictation on Android, soft
      delete with undo. Replaces the old free-text logbook.
- [x] **3 · Today** — closed out 2026-08-25. The review was the feature: nothing new was
      built. The first task on `/private` sat 791px down a phone screen, behind a failed AI
      panel and three stacked stat cards; it now sits at 356px. `npm run shots` signs its own
      session, sweeps the private pages and fails above 500px, so this cannot regress
      unnoticed (D-083, D-084).
- [x] **4 · Calendar** — done 2026-08-22. Google and Canvas private iCal feeds via ical.js,
      agenda for today plus seven days, Canvas assignments importable as tasks. No OAuth, no
      cost. Two data gaps, neither a defect: the Canvas feed is empty (211 bytes, zero
      events) and Fall 2026 classes are not yet in Google Calendar.
- [x] **5 · Athletics depth** — done 2026-08-22. Concept2 weight-adjusted splits against
      the sub-2:00 goal, bodyweight table, rehab checklist and SPM targets parsed from this
      vault, week-plan-vs-logged review, server-rendered SVG charts.
- [ ] **6 · AI, narrowly scoped** (~14h) — summarise the week, draft sprint goals, resume
      tailoring. Semantic search is cut (D-087). Every model-proposed change is approved item
      by item before it is applied; nothing AI-driven writes to the vault in V2 (D-080).
- [ ] **7 · New scope, rev 3-4** (~14.5h) — domain, images, culinary retired, public `/now`
      page, public→private button, job sheet read-only. `V2_PLAN.md` §7.

**Time budget:** ~4h/day until 2026-09-20, then ~4h/week. Six features is 80-106h against
~76h before term, which is why only 0-3 are pre-term. Taiwan 08-29 to 09-07 is assumed to
be zero work.

**Biggest structural change:** everything actionable becomes one task model (D-037). Sprint
goals, the academic tracker, daily to-dos, and Canvas assignments stop being four separate
lists.

**V1 shipped 2026-08-21**, four weeks ahead of the 2026-09-18 code deadline. Public
portfolio, resume generator, passkey auth, vault writes, freshness audit, athletics with
Hevy import, and the Work/Academics/Calendar/Hobbies surfaces are all live.

**Open on Victor, in priority order:**
1. **Buy `victorgusev.com`** — before any more passkey work. Changing the domain invalidates
   the passkey enrolled on `victorgusev.vercel.app`, because a passkey is bound to its origin.
   Cloudflare Registrar at ~$10.50/yr; full instructions in `V2_PLAN.md` §7.1.
2. **Publish the internship sheet as CSV** and send the URL — needs a connection, so before
   you fly. It unblocks §7.6. See `UPLOADS_NEEDED.md` §1.2.
3. **Write the five case studies.** The prompts wait in each project file under
   `> **To write:**`. Nothing publishes until prose replaces them, and no agent will fill them
   in — that is the point of the convention (D-073) and D-069 is what happens when one tries.
   Plane work: no network, no computer beyond a text editor.
4. **Add Fall 2026 classes to Google Calendar.** No code is waiting on this — the schedule
   appears on its own once they exist.
5. **`UPLOADS_NEEDED.md`** — the data only you can supply, split into what needs a connection
   and what is plane work. Requested for 2026-08-27.

**Reported done 2026-08-25, not yet verified from here:** production passkey enrolled, and
`GOOGLE_CALENDAR_KEY` / `CANVAS_CALENDAR` / `DATABASE_URL` / `GEMINI_API_KEY` set in Vercel.
The weekly summary (V2_PLAN §1.5) is the first thing that will notice if the key is missing.

**Cut rule:** spent. Days 16-20 and 21-29 both landed early; the CSV import shipped.

**Retiring `/sprint-review`:** goal editing now lives on `/private` itself; the separate
`/private/sprint` route no longer exists. The slash command comes out once Victor confirms
he has used the editor at least once — still open.

## 2. Operational Rules & Boundaries
- **The Weekly Purge:** At the start of every sprint, any blocker or to-do that has rolled over twice must be: (1) Hard-scheduled into a calendar block, (2) Delegated to an AI, or (3) Ruthlessly deleted. No endless piling up.
- **Deep Work Curfew:** Deep, stimulating engineering/study blocks must conclude by 10:30 PM to allow a 30-minute neurological wind-down for an 11:00 PM sleep target.
- **Academic Front-Loading:** The majority of the 8-10 weekly study hours should be front-loaded on Monday and Tuesday to clear the end of the week for projects and racing.
- **Focus Mechanism:** Utilize the Pomodoro technique (25 minutes deep work, 5 minutes rest) for all textbook studying and LeetCode prep.

## 3. Academic Tracker (Secondary to Canvas)
*Use this space to manually track upcoming midterms or massive projects that span multiple sprints.*
- [ ] 
- [ ] 

```

## File: context/04_operations/internship_pipeline.md

```markdown
---
updated: 2026-08-20
domain: operations
stability: volatile
summary: Application strategy, pipeline parameters, automated tracking system.
read_when: Internship applications, cover letters, interview prep.
---

# Internship Pipeline & Career Ops

## 1. Application Strategy (The "1 + 4" Rule)
*Goal: Sustain application volume without burning out on cover letters.*
- **Target Velocity:** 5 applications per day during peak Fall season.
- **Execution:**
  - **1 High-Priority Application:** Use an AI to heavily tailor a targeted cover letter for a top-tier/dream role.
  - **4 Quick-Apply Applications:** Volume-based submissions prioritizing speed (Greenhouse/Lever 1-click apply).

## 2. Pipeline Parameters
- **Target Domains:** Robotics, Computer Vision, Embedded Systems, OR pure Software Engineering (Full Stack/Backend) at top-tier FAANG+ companies.
- **Timelines:** Summer 2027 and Fall/Spring Co-ops.
- **Interview Prep:** 3 to 4 hours per week strictly blocked in Google Calendar for LeetCode and Online Assessment (OA) prep.

## 3. Automated Tracking System
*Note to AI Assistants: Victor runs a background script that actively manages his master Google Sheet tracker.*
- **System Functions:** The script scans Gmail for recruiter emails, OA invites, and application confirmations, then populates the master Google Sheet. 
- **Action Items:** High priority items (OAs, interviews) are fed directly to Victor via email digests or the "High Priority" tab in the sheet.
- **AI Task:** AIs should assist primarily in cover letter tailoring and LeetCode mock interviews, leaving the sheet data-entry to the background automation.

```

## File: context/04_operations/logbook_archive.md

```markdown
---
updated: 2026-08-20
domain: operations
stability: volatile
summary: Past sprint summaries and a parking lot of future automation ideas.
read_when: Reviewing history or picking up a parked idea.
---

# Logbook Archive & Future Automations

## 1. Past Sprint Summaries
*At the end of every 1-week sprint, drop a simple bulleted summary of accomplishments and missed targets here. No heavy post-mortems required.*

- *(Sprint logs will be appended here)*

---

## 2. Future Automations Parking Lot
*Ideas for AI workflows or scripts that shouldn't be built right now, but should be remembered for future capacity.*

- **The Morning Digest:** An automated cron job that pulls the weather, Google Calendar events, and the top 3 High-Priority internship tasks into a daily chat briefing.
- **Daily Standup Cron:** An AI prompt at 9 PM asking for a quick text-based debrief of the day's blockers.

```

