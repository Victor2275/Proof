# Proof — The Step Row Rework

The plan of record for the full visual rework of Proof. Supersedes the UI
sections of [ImprovementPlan.md](ImprovementPlan.md) and [ROADMAP.md](ROADMAP.md),
both of which describe the Black & Gold design this rework replaces.

**Branch:** `rework/step-row` · **Live:** https://proof-cdvj.onrender.com/
(main auto-deploys; the branch does not)

---

## The world

**Thesis.** A recipe is a pattern and a bake is a pattern running; the interface
is the machine that runs it, with a chase light that always says where *now* is.

It refuses the photo-card grid that every cookbook app ships, and refuses its
opposite — the dark glassmorphic dashboard with a gold glow, which was the
incumbent design here.

**Reference world.** Early-80s rhythm machine. Matte panels, silkscreened
labels, lit step keys, seven-segment readouts. Recorded in full as a direction
contract at [.impeccable/surfaces/src-components-dashboard-tsx.md](.impeccable/surfaces/src-components-dashboard-tsx.md).

### Colour is temporal, never decorative

| Token | Value | Means |
|---|---|---|
| `--key-now` | `#FF3B30` red | Happening **now**. One per screen, never anything else. |
| `--key-due` | `#FF9A00` orange | Due next. |
| `--key-queued` | `#FFE100` yellow | Queued, not yet reached. |
| `--key-done` | `#F2F2F2` white | Complete. |
| `--key-unlit` | `#2A2A2A` | Not reached — a designed absence, drawn as deliberately as a lit key. |

### One ban, and two materials

**No glow, except a lit key or a lit segment.** Light in this world means
something is on; a halo around a control that is doing nothing is the previous
world's habit and stays out.

Gradient and backdrop blur were originally banned alongside it. They are now
permitted — as **materials with one defined use each**, not as decoration:

| Material | Token | Where it belongs |
|---|---|---|
| Faceplate sheen | `--faceplate` / `.faceplate` | A panel's own surface. A moulded faceplate lit from above is not one flat value; the ramp is ~3% of tone top to bottom, which makes a panel read as an object rather than a rectangle. The only gradient in the chrome. |
| Scrim | `.scrim` | A layer that genuinely sits *over* the interface — a modal, a sheet, a drawer. The blur says the panel beneath is still there and is not what you are operating. Never on a panel that is part of the page. |

Neither goes on a photograph: no scrim over a recipe's own plate.

`src/designSystem.test.ts` enforces this — it requires both tokens to exist and
fails the build on any ad-hoc `bg-gradient-to-*` or `backdrop-blur-*` utility in
a component, which is how the previous system drifted into forty button styles.

### Typography

Self-hosted variable fonts, latin subset, precached for offline:
Archivo Variable (display / faceplate voice) and JetBrains Mono Variable
(UI and data). Seven-segment readouts carry instrument values only — weights,
temperatures, percentages, timers, totals.

---

## Amendment · photography (2026-09-15)

The direction contract assumed **uneven photo coverage** and concluded that "no
photograph is required for any row to read." Checking the live database against
that assumption showed the opposite: **203 of 203 recipes have exactly one
image**, a final-product shot, and none have more than one. Coverage is uniform,
not patchy, and it will stay that way — the final-product shot is the photo this
library has.

The defensive posture was therefore solving a problem that does not exist, at
the cost of a cold first screen. The amendment:

- **The photo is a plate, not a card.** Each pattern row gains a square image
  plate at its left edge — a specimen mounted on the faceplate, sitting in the
  panel's own border, not a floating rounded card with a shadow.
- **The pattern still reads without it.** Title, segment readout, and step row
  keep their current weight and are unchanged in structure. A missing or broken
  image degrades to an unlit plate, not a hole in the layout. The row remains
  legible if every image in the library vanished.
- **Smart shelves get plates too**, at shelf-tile scale, so the top of the
  dashboard reads as a shelf of real food.
- **The Recipe Viewer is title-led**, with the photo as a framed plate rather
  than a full-bleed hero — consistent with the world, and it keeps ingredients
  and method above the fold.

### Second pass: the cookbook is a gallery

The plate-on-a-row version kept the list, on the reasoning that density and
scanability are the point of an Operate surface. Seen against the real library
that reasoning did not survive: the pattern beside each plate was **203 rows of
`PREP COOK FINISH · 50 MIN`** — a step row derived from a generic vocabulary
that fits any recipe, and a time that 199 recipes share verbatim. The list was
spending its density on placeholder text, and suppressing the one honest thing
every recipe owns.

- **Tiles, photograph first**, name silkscreened underneath. Two up on a phone,
  four on a desktop.
- **Hover reveals what the recipe can prove**: a flat panel slides up over the
  photograph's lower half with bake type, real time, real phases. The tile's
  border lights at the same moment.
- **Nothing scales on hover.** A grid whose tiles grow under the cursor is a
  grid that shifts while you read it. The highlight is a border and a panel, so
  it costs no layout.
- **Provenance decides what the panel says.** `derivePhasesWithReading` reports
  whether a recipe's phases were *proved* (it named a levain, an autolyse, a
  bulk) or merely *generic*; `isPlaceholderTiming` recognises the seed script's
  `"20 mins"` / `"30 mins"` pair, which 199 of 203 recipes carry verbatim.
  Neither is drawn unless it is real — otherwise the tile shows bake type and
  ingredient count, which are always true.
- **The step row keeps one home on this page**: the Now Baking panel, where its
  keys are lit and therefore reporting rather than decorating.

---

## Phases

Each phase ends test-green and typechecked, and is verified with screenshots at
desktop and 390px mobile in both themes against real production data before it
is committed.

### Phase 0 — Foundation ✅ `d425d2d`

- Rewrote `src/index.css` as a token system; true-black dark theme, cream light
  theme, legacy aliases kept for phased migration.
- Self-hosted Archivo + JetBrains Mono; added `woff2` to the PWA precache glob
  (`vite-plugin-pwa` omits it by default, so fonts were not available offline).
- Stripped 38 glow shadows, 28 backdrop-blurs, 4 gradients across 24 files.
- Removed the font-family switcher and the OLED theme.
- Added `src/designSystem.test.ts` as a guard rail for the bans.

### Phase 1 — Primitives ✅ `d425d2d`

`SegmentReadout`, `StepRow`, `Panel`, `Button`, `Field`, `InstrumentRow`,
`Meter` in `src/components/ui/`, plus `src/lib/phases.ts` (`derivePhases`) and a
dev-only `Lab` gallery route.

The step row's unit is **one key per phase**, not per instruction. Phases derive
from an ordered bread vocabulary (levain → autolyse → mix → bulk → shape →
proof → bake → rest) that must prove itself via signature phases before being
accepted, falling back to a generic prep/cook/finish reading — so a chicken soup
never gets a fabricated "levain."

### Phase 2 — Dashboard + shell ✅ `b7e11ba`

- Pattern list replacing the photo-card grid; bank rail by folder; search;
  Personal Bests and Recently Baked smart shelves from real bake logs.
- `src/lib/activeBake.ts` — localStorage-backed "what is baking right now,"
  live across the app. Baking Mode writes to it; the dashboard and the sidebar
  chase light read from it.
- `src/lib/duration.ts` — parses both the schema's bare-minutes convention and
  AI-import's messier `[50 mins]` / `1 hr 30 mins` strings.
- Sidebar redesigned; bottom nav restructured to four slots + More sheet + FAB.
- Onboarding modal, PIN modal, offline/stale bars rethemed.

### Phase 2a — Photo plates ✅

- `RecipePlate` primitive: fixed-ratio image plate with lazy loading, an unlit
  fallback, and no gradient scrim.
- `RecipeTile`: the gallery tile — photograph, name, and a hover panel carrying
  only what the recipe can prove.
- The cookbook grid, the smart shelves and the Recipe Viewer's framed plate all
  compose from those two.
- `derivePhasesWithReading` and `isPlaceholderTiming` expose provenance, so a
  surface can tell the difference between data and a default.

### Phase 3 — Recipe Viewer ✅

The second reading surface. Title-led with a framed photo plate at every width
— a full-width square on a phone would push the ingredients off screen.
Instrument values (total, prep, cook, servings) as segment readouts; the method
as a full labelled step row in the masthead and as steps grouped under
silkscreened phase headings below; ingredients as an instrument panel with
pantry lamps; controls onto `Button`/`Panel`, with START RECIPE the only solid
signal-red control on the page.

### Phase 4 — Baking Mode ⬜ *(next)*

The surface the product exists for: one baker, phone at arm's length, hands
floured. Only the `activeBake` plumbing landed in Phase 2 — no visual work yet.
Large type, the step row as the primary navigation element, timers as segment
readouts, voice and wave controls kept.

### Phase 5 — Gallery, Pantry, Grocery, Instagram export ⬜

The photo-heaviest surfaces. Gallery is Experience mode — the bakes lead.
Pantry and Grocery are checklists, and should read as a machine's own inventory
panel.

**The Instagram exporter is a full redesign, not a retheme.** It is the only
surface in Proof that someone who has never seen the app will look at, and it is
seen out of context: a fixed-size image on someone else's feed, with no
navigation, no hover, and no second screen to explain it. That makes it a
Persuade surface inside an Operate product, and the composition itself — what a
shared bake card actually *is* in this world — has to be designed rather than
recoloured. The current export borrows the old world's photo-with-a-caption
layout wholesale.

### Phase 6 — Editor + Notes ⬜

Recipe editor forms onto `Field`/`Panel`; markdown editor replaced with native
controls per the earlier decision; general notes rethemed.

### Phase 7 — Analytics, Settings, Landing, 404 ⬜

Analytics charts rebuilt on the meter/segment vocabulary. The `/welcome`
landing is the single **Persuade** surface in the app and gets its own
treatment. 404 as an unlit panel.

### Phase 8 — Finish ⬜

Copy rewrite pass, full reduced-motion audit, Capacitor safe-area check on
Android, Playwright visual-regression baselines, the finish review against the
direction contract, and finally **DESIGN.md written from the built artifact** —
not from intentions, and not before the build is done.

---

## Standing rules

- Tests are written for every new feature and kept green
  ([CLAUDE.md](CLAUDE.md)).
- `CURRENT_FEATURES.md` and `TESTED_FEATURES.md` mirror every change.
- No orphan or debug code.
- The admin PIN gates writes; reads stay public.
- Merge cadence: the branch merges to `main` — and therefore deploys live —
  **after Phase 3**.

## Open items

- **`CLAUDE.md` still specifies "Black & Gold aesthetic, glassmorphic
  components."** That is the design this rework replaced, and it now contradicts
  both the code and the design-system guard rail test. It should be rewritten to
  describe the Step Row world, ideally at Phase 8 when DESIGN.md exists to point
  at.
- **Placeholder durations in production data.** Most recipes carry
  `prepTime: "20 mins"` / `cookTime: "30 mins"` verbatim, so most rows read an
  identical 50 MIN. The parser is correct; the data is a seed-script
  placeholder. A data question, not a UI one.
- **The library is rendered a page at a time, not virtualised.** 48 tiles per
  page keeps in-flight image requests near what the connection pool can serve,
  but a baker who clicks Show more four times still ends up with 200 mounted
  tiles. If the library keeps growing, this wants windowing rather than a
  bigger page.
- **Recipe photography is all one CDN.** Every image points at themealdb, which
  is fine until it is not: there is no local copy, no resizing, and a tile
  downloads a full-size photograph to display it at 280px. Worth revisiting
  when the library holds real bake photography.
- **No shared `Sheet`/`Dialog` primitive.** The bottom nav's More sheet is
  bespoke. Worth formalising if Phases 4–6 need more sheets.
