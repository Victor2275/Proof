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

### Phase 4 — Baking Mode ✅

The surface the product exists for: one baker, phone at arm's length, hands
floured. Every decision made for that scene rather than for a screenshot.

- **The step row is the navigation.** Elsewhere the row reports; here its keys
  are controls. The running phase is the one red thing on screen, and pressing
  "Shape" jumps to the first step of shaping — never into the middle of a
  phase, which would be a jump nobody could predict from the label. A wide
  NEXT bar with BACK beside it sits at the foot at every width, replacing the
  desktop arrows that floated beside the step and the separate mobile bar.
- **Timers dock in the head** as seven-segment countdowns, turning signal red
  once they run past the end. The floating timer stack sat exactly where the
  instruction is. `src/lib/timerBus.ts` publishes a read-only view of the
  timers `TimerManager` owns rather than opening a second websocket — the
  connection-per-consumer leak this codebase already fixed once.
- **Only measured things are displayed.** The scale readout and its target
  appear when a scale is connected and the step has something to weigh;
  otherwise there is no empty display pretending to measure.
- **Show All** groups the method under the same phase headings the row draws,
  with the running step outlined and every step a control back into focus.
- Ingredients sheet, bake log and voice help rebuilt on `Panel`, `Field`,
  `Button` and `.scrim`. Voice, wave-to-advance, PiP, haptics, wake lock,
  swipe and Bluetooth auto-advance all kept intact.

### Phase 5 — Gallery, Pantry, Grocery, Instagram export ✅

**Gallery — bake history as iterations.** A gallery of every photograph in date
order is a screensaver: it says a lot of baking happened and nothing about
whether any of it got better. The default reading groups a recipe's bakes into
one row running oldest to newest, so the row *is* the progress; sorting by date
stays as the second reading, cut into months. One tile is one bake, not one
photograph — counting photographs would inflate every row into a progression
that never happened. An attempt number is printed only where there is a
sequence to count. `BakeLogsGrid` (a recipe's own makes) was rebuilt on the same
tile, losing a 3D flip that hid the notes behind an animation and a second
click.

**Pantry and Grocery as the machine's inventory.** The pantry is a stock panel:
a lit lamp beside every item — the same lamp a recipe uses for "you have this" —
on hairline-ruled rows rather than forty bordered pills. The grocery list is a
bank and a list: recipes latch like keys, shown a dozen at a time behind a
search field, because 203 recipes rendered as 203 keys is a wall between a
shopper and the list. The list keeps real checkboxes rather than lamps — it is
operated one-handed in an aisle, and the platform's checkbox is what every thumb
and every screen reader already knows.

**The Instagram exporter was a full redesign, not a retheme.** It is the only
surface in Proof that someone who has never seen the app will look at, and it is
seen out of context: a fixed-size image on someone else's feed, with no
navigation, no hover, and no second screen to explain it. That makes it a
Persuade surface inside an Operate product. The old export was a polaroid — a
photo, a rotation, a caption — which is what every food account on earth posts.

What Proof has that they do not is the pattern, so the card is the bake as the
machine finished it: the photograph mounted as a plate, the name at display
scale, the instrument values that are real, and the step row across the foot
with every key complete, the line closed on the right by the site address.
Three rules follow from being rasterised rather than rendered — every colour is
a literal (html2canvas rebuilds the node outside the cascade), nothing is loaded
that could fail (the remote logo and the stock fallback photograph are gone),
and nothing is claimed that the recipe cannot prove.

Two defects were found by measuring rather than looking: the card was captured
through the preview's CSS transform, so a card exported from a phone came out
under 900px square and its size depended on the window width; and a row of
sixteen touching bone keys reads as a white bar rather than as keys. The scale
now comes off for the capture, and every branch of the key row is exact —
labelled phase keys where the recipe proved its phases, one key per step for a
short generic recipe, phase keys again past sixteen steps.

### Phase 6 — Editor + Notes ✅

**A `Sheet` primitive first.** The same scrim-and-panel had been hand-rolled
eleven times, and this phase would have added five more. It is one component
now, and it carries what none of the eleven copies had: a focus trap, Escape,
focus returned to whatever opened it, and a counted scroll lock so a sheet over
a sheet behaves. `TextArea` and `Select` joined `Field` for the same reason —
forms are this phase's subject, and a bare browser control is a second design
system.

**The editor keeps its single scroll** — authoring means moving between the
ingredients and the step that uses them — but every section is a panel with a
silkscreened head, and a sticky bar reports the name, ingredient count and step
count as they are typed, in tabular mono rather than segments.

**The AI diff became a review.** A git-style JSON diff, in purple, with green
additions and red deletions, broke the one rule the palette has and offered a
single all-or-nothing decision. It is now one panel per field that actually
differs, current reading beside proposed, each kept or rejected on its own.

**A data-loss bug came out of it.** The prep and cook fields were
`type="number"` while 199 of the 203 live recipes store `"20 mins"` /
`"30 mins"`. The browser rendered both fields empty, so saving any of those 199
recipes silently wiped both times. They read through `parseDurationMinutes` now
and write back bare minutes, so an edited recipe leaves in the schema's own
convention — which also means the placeholder-timing problem below shrinks by
one recipe every time one is edited.

**Notes lost the markdown editor.** `@uiw/react-md-editor` and
`rehype-sanitize` are out of the dependency tree along with the `editor-vendor`
chunk. The widget carried its own toolbar, split pane and colour system, and
watched the document element with a `MutationObserver` to keep its theme in
step with the app's. A note is a panel and a textarea. The note list was
`hidden md:flex`, so a phone could reach exactly one note; it is a bottom sheet
at that width now.

### Phase 7 — Analytics, Settings, Landing, 404 ✅

**Settings became keys.** Every preference was an iOS sliding pill: a control
from a different machine, and the only widget in the app carrying state by a
moving dot rather than by light. They latch now, print ON or OFF as well as
lighting, and carry `aria-pressed`. Theme is a bank where exactly one key is
down.

**Analytics reports only what it can prove.** Three bake logs cannot fill a
twelve-month bar chart, and eleven empty bars beside one read as nothing at
all. Only months containing a bake are drawn; below three of them the panel
says there is not enough to read a trend. "Baked more than once" refuses to
rank a three-way tie of one bake each, because printing the top three of that
invents an order that does not exist.

Three bugs came out of building it. Analytics gathered offline logs by asking
for each recipe's logs in turn, and that helper reads the whole IndexedDB store
and filters it — 203 transactions and 203 full reads on load. `Meter`'s `hotAt`
defaults to 1, meaning "no hot end", but the warm band 15% below it fired
anyway, so every meter near full grew an orange tip. And 3 of 203 rounds to
zero lit cells, so a meter captioned "3 of 203" sat entirely dark.

**The landing page demonstrates instead of asserting.** It is the only screen a
stranger sees, and it spent that on three feature cards over a blurred stock
photograph that could have fronted any cookbook app. The hero is the machine
running: a step row chasing a real sourdough's phases, derived by
`derivePhases` rather than hand-placed, so the page cannot claim a levain the
parser would not find. Its call to action is outlined — the chase light is the
page's one "now", and a red button beside it would spend the argument to
decorate a control. It is routed outside the app shell now; it had been
rendering inside a sidebar of sections a first-time visitor has not reached.
`public/hero.jpg` (807KB, precached) went with it.

**404 is an unlit panel** with the number on a seven-segment readout, ghost
segments showing — absence drawn as deliberately as light. Neutral ink, not
signal red: nothing on that page is running.

### Phase 8 — Finish ✅

**Reduced motion, in three layers.** The CSS rule only reaches CSS.
framer-motion writes inline styles from its own loop, so the recipe drawer
still sprang up the screen for someone who had asked for no motion;
`MotionConfig reducedMotion="user"` covers it. A JS timer is outside both, so
the guard fails any decorative `setInterval` that does not check for itself.

**Visual baselines.** 47 images — ten surfaces, two themes, desktop and phone,
plus the sheet as a dialog and as a bottom sheet — against fixtures that never
touch the live database or the image CDN, with the clock pinned. The 375px
floor is asserted on every route rather than photographed. Also closes the
"Playwright is installed but there are no specs" gap from ImprovementPlan.md.

**Capacitor safe areas.** The nav reserved the device inset correctly; the four
things floating above it did not, each hard-coding `bottom-24` — exactly the
nav's height with no inset, and therefore behind the nav on any phone with one.
One `.above-nav` utility, verified by simulating a 34px inset. Not verified on
a physical device.

**Copy.** Every remaining browser dialog is gone — seven, three of them inside
Baking Mode, which is the worst place in the product for an OS modal.

**The finish review** found three things worth more than the review itself:

- White on the signal red is 3.55:1, under the floor, on the app's most
  important control. The legend flips with the theme now and is guarded at 4.5.
- The baselines could not see that fix. A 1% ratio on a full-page shot is
  ~29,000 pixels of silent allowance; it had also been hiding a floating action
  button moving 16px. The budget is 150 absolute pixels.
- The PWA manifest named five icon files, none of which existed, so an
  installed Proof had no icon — and the artwork that did exist was a gold chef's
  hat from the Black & Gold world. The mark is the step row now, drawn from the
  tokens by `scripts/generate-icons.mjs`. `index.html` was also still pulling
  Inter from Google Fonts on every load, for a face the design does not use.

**[DESIGN.md](DESIGN.md)** is written from the artifact, including four
deviations from the direction contract and the known gaps.

---

## Standing rules

- Tests are written for every new feature and kept green
  ([CLAUDE.md](CLAUDE.md)).
- `CURRENT_FEATURES.md` and `TESTED_FEATURES.md` mirror every change.
- No orphan or debug code.
- The admin PIN gates writes; reads stay public.
- Merge cadence: phases 0–5 were merged to `main` together and are live.
  `main`, `rework/step-row` and `ui-bugfixes` are all at the same commit.
  Phase 6 onward commits to `main` at each green checkpoint, which deploys.

## Open items

- **`CLAUDE.md` still specifies "Black & Gold aesthetic, glassmorphic
  components."** That is the design this rework replaced, and it now contradicts
  both the code and the design-system guard rail test. It should be rewritten to
  describe the Step Row world, ideally at Phase 8 when DESIGN.md exists to point
  at.
- **Placeholder durations in production data.** Most recipes carry
  `prepTime: "20 mins"` / `cookTime: "30 mins"` verbatim, so most rows read an
  identical 50 MIN. The parser is correct; the data is a seed-script
  placeholder. A data question, not a UI one — though Phase 6 stopped the
  editor making it worse: those fields were `type="number"`, which cannot hold
  `"20 mins"`, so the editor rendered them empty and saving any of those 199
  recipes wiped both times outright.
- **No CI.** The guards exist and pass — `designSystem.test.ts`, 275 unit
  tests, 47 visual baselines — but nothing runs them automatically. With the
  rework finished this is the largest remaining gap, and it is the last
  unfinished item of ImprovementPlan.md Phase 4 alongside a LICENSE.
- **The library is rendered a page at a time, not virtualised.** 48 tiles per
  page keeps in-flight image requests near what the connection pool can serve,
  but a baker who clicks Show more four times still ends up with 200 mounted
  tiles. If the library keeps growing, this wants windowing rather than a
  bigger page.
- **Recipe photography is all one CDN.** Every image points at themealdb, which
  is fine until it is not: there is no local copy, no resizing, and a tile
  downloads a full-size photograph to display it at 280px. Worth revisiting
  when the library holds real bake photography.
- **The older overlays have not moved onto `Sheet` yet.** Phase 6 built the
  primitive and put the editor's five and the notes' two on it. The bottom nav's
  More sheet, the pantry scanner, the AI substitutions modal and Baking Mode's
  three are still hand-rolled, and still lack the focus trap and the Escape key
  that the primitive provides. Migrating them is mechanical and wants its own
  pass, because Baking Mode's overlays are the ones most worth getting right.
- **The selected-make detail view is still the old world.** Its offending
  colours — a yellow personal-best pill, a pink Instagram link, a green save —
  are now on `Button`, but the panel around them (rounded-2xl cards, 4px
  left-border headings, shadowed photos) was not in Phase 5's scope. It sits
  between Phases 5 and 6; fold it into whichever runs next.
- **The bake history has almost no data to prove itself on.** The live library
  holds three bake logs across three different recipes, so the iterations
  reading — the whole reason the gallery groups by recipe — renders as rows of
  one. It is correct, and it stays untested by reality until something is baked
  twice.
