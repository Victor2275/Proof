# Proof — the Step Row design system

Written from the built artifact at the close of Phase 8, not from the plan.
Where the code and the [direction contract](.impeccable/surfaces/src-components-dashboard-tsx.md)
disagree, this document records what shipped and why — those cases are listed
under [Deviations](#deviations-from-the-direction-contract).

The plan of record is [REWORK_PLAN.md](REWORK_PLAN.md). The working rules an
agent needs are in [CLAUDE.md](CLAUDE.md). This is the reference.

---

## The thesis

**A recipe is a pattern. A bake is that pattern running. The interface is the
machine that runs it, with a chase light that always says where *now* is.**

Everything below follows from that sentence. The reference world is an early-80s
rhythm machine: matte panels, silkscreened labels, lit step keys, seven-segment
readouts.

It refuses two things on purpose — the photo-card grid every cookbook app
ships, and the dark glassmorphic dashboard with a gold glow, which is what Proof
itself looked like before this rework.

**Who it is for:** one baker, phone propped at arm's length, hands floured,
hours into a ferment. Every judgement call is settled by that person, not by a
screenshot.

---

## Colour is temporal, never decorative

Colour carries *when*, not *what kind*. It is never spent on branding, on
categories, or on a control that merely wants attention.

| Token | Light | Dark | Means |
|---|---|---|---|
| `--key-now` | `#e02a20` | `#ff3b30` | Happening **now**. One per screen. |
| `--key-due` | `#e07d00` | `#ff9a00` | Due next. |
| `--key-queued` | `#cbbc84` | `#7a6000` | Queued, not yet reached. |
| `--key-done` | `#b0aba1` | `#57564f` | Complete. |
| `--key-unlit` | `#d2cdc2` | `#2a2a2a` | Not reached — a designed absence. |
| `--signal` | `#c81e14` | `#ff3b30` | The one solid control on a screen: the action that starts or commits. |
| `--on-signal` | `#ffffff` | `#000000` | The legend on a lit key. |
| `--spoiled` | `#6d2018` | `#5a1a12` | Destructive. A rule around the control, never its legend. |
| `--fault` | `#8f4c00` | `#ff9a00` | The caution lamp: an error, an outage, a refused save. Needs attention, is not *now*. |

### The ground

| Token | Light | Dark |
|---|---|---|
| `--ground` | `#e8e4dc` | `#000000` |
| `--panel` | `#f2efe9` | `#1a1a1a` |
| `--panel-sunk` | `#dcd7cc` | `#0d0d0d` |
| `--rule` | `#c9c4b8` | `#2e2e2e` |
| `--ink` | `#171614` | `#f2f2f2` |
| `--ink-muted` | `#63605a` | `#8a8a8a` |
| `--silkscreen` | `#4a4640` | `#bdbdbd` |

**Dark is the default and it is true black.** Not because black is fashionable
but because of the scene: a kitchen before dawn, the only lit object a propped
phone. **Light is the faceplate inverted** — classic machines wore cream
plastic — and it is first class, not a courtesy. Both themes are shot in the
visual baselines; neither is allowed to rot.

### What red costs

Red is spent on two things only: **what is happening now** (a lit step key and
its label, the running bake wherever it appears, a timer counting past zero, the
scale reaching its target, the focused field) and **the one solid primary control
on a screen** (Launch Plan decision B3). A screen whose *now* is already lit
should not add a red control beside it. In practice:

- The editor's **Save** is outlined, not filled. Nothing in the editor is
  running; it writes a pattern, it does not play one.
- The landing page's **call to action** is outlined, because the chase light
  above it is that page's one *now* — and the chase light is the whole argument
  being made.
- The Recipe Viewer's **START RECIPE** *is* solid red. It starts the machine.
- Inside a `Sheet`, the confirming action may be primary: a modal is its own
  screen.
- The **New Recipe** key is lit only on the cookbook with nothing baking. On any
  other screen it is an unlit key, and the phone's **Start** key takes that
  corner on the Recipe Viewer.
- A **timer written into the method** is a queued key — outlined, ink — until it
  is started. Lighting every one put sixteen red regions on a recipe where
  nothing had begun.
- The **Now Baking** panel is lit by its border, its lamp and its running key.
  Its total and its Resume control stay ink; the sidebar shows only the lamp.
- **Errors are faults, not now.** They take `--fault`, the same caution lamp as
  the offline bar. Destructive controls carry the `--spoiled` rule with an ink
  legend. A scaled serving count says so in its label rather than lighting up.

---

## One ban, two materials

**No glow, except a lit key or a lit segment.** Light means a thing is on. A
halo around a control that is doing nothing is the previous world's habit.

Gradient and backdrop blur were banned with it, and were re-permitted on
2026-09-15 as **materials with one defined use each**:

| Material | Where it belongs |
|---|---|
| `--faceplate` / `.faceplate` | A panel's own surface. A ~3% ramp of tone, top to bottom, so a panel reads as a moulded object rather than a rectangle. **The only gradient in the chrome.** |
| `.scrim` | A layer that genuinely sits *over* the interface — modal, sheet, drawer. The blur says the panel beneath is still there and is not what you are operating. |

**Neither ever touches a photograph.** No scrim over a recipe's own plate.

`src/designSystem.test.ts` fails the build on any ad-hoc `bg-gradient-to-*` or
`backdrop-blur-*` utility in a component. That guard is the reason the system
has not drifted into forty button styles the way its predecessor did.

---

## Typography

Two self-hosted variable faces, latin subset, served from `/fonts` and precached
by the service worker so they survive a kitchen with no signal. **No web font
CDN, in the stylesheet or the document** — both are guarded.

| Voice | Class | Face | Setting |
|---|---|---|---|
| Faceplate display | `.font-faceplate` | Archivo Variable | stretch 118%, weight 800, `-0.01em`, uppercase |
| Instruction prose | `.font-prose` | Archivo Variable | stretch 100%, weight 400, line-height 1.6 |
| Silkscreen label | `.label-silkscreen` | JetBrains Mono Variable | 11px, weight 600, `0.14em`, uppercase |
| UI and data | *(default)* | JetBrains Mono Variable | 16px, tabular figures globally |

**Seven-segment readouts are reserved for instrument values** — weights,
temperatures, percentages, timers, totals. Counts, servings and dates use
tabular mono. Spending segments on every number spends the effect and costs
legibility in dense lists.

Every digit renders all seven segments and dims the unlit ones, so a value has a
fixed width and **absence is drawn as deliberately as light**. A readout is
announced to a screen reader as one value, not a row of glyphs.

---

## Geometry

Controls are squared. Three radii, and nothing else:

| Token | Value | Used by |
|---|---|---|
| `--radius-key` | `2px` | Step keys, meter cells |
| `--radius-control` | `3px` | Buttons, fields, chips |
| `--radius-panel` | `4px` | Panels, sheets |

Depth comes from a hairline rule, the ground behind it, and the faceplate sheen
— **never from a drop shadow**.

---

## The component layer

`src/components/ui` is the whole vocabulary. Surfaces compose it; they do not
hand-roll inline Tailwind for a panel, a control, a readout or an overlay.

| Primitive | What it is |
|---|---|
| `Panel` / `PanelRow` | A matte panel with a silkscreened head and a status lamp. Panels do not nest — content inside a panel gets a rule, not another panel. |
| `Button` | `primary` / `secondary` / `ghost` / `danger`; `sm` 36px, `md` 44px, `lg` 56px. Real press travel. `engaged` declares a toggle and is undefined otherwise, so ordinary buttons are not announced as switches. |
| `Field` / `TextArea` / `Select` | Outlined at rest; rule and unit turn signal on focus. Errors wired via `aria-describedby`. `Select` keeps the platform's own popup. |
| `Sheet` | Every overlay in the app. `center` is a dialog, `bottom` is a thumb-reachable sheet. |
| `SegmentReadout` | Seven-segment digits with ghost segments. `sm`/`md`/`lg`/`xl`, tone `signal` or `ink`. |
| `StepRow` | The signature. One key per **phase**, not per instruction. `mini` for a dashboard signature, `full` for a labelled, operable row. |
| `RecipePlate` / `RecipeTile` | A square image plate mounted in the panel's own border, and the gallery tile built from it. |
| `InstrumentRow` | A bank of lamps — presence and absence readable in one sweep. |
| `Meter` | Discrete cells that fill left to right. A machine's meter counts in cells. |
| `Skeleton` | The shape of the content, never the word "Loading". |

`/lab` (development only) is a live gallery of every primitive in its real
states. New primitives go in it.

### Sheet is not optional

`Sheet` replaced **eleven** hand-rolled scrim-and-panel overlays. Not one of
them trapped focus, closed on Escape, returned focus to whatever opened it, or
stopped the page behind from scrolling. A modal you cannot leave by keyboard is
a trap. It also handles the cases that only appear in a real app: Escape belongs
to the **topmost** sheet, the scroll lock is **counted** so a sheet over a sheet
behaves, the title id is **generated** so two open sheets do not share one
accessible name, and it renders through a portal so no transformed ancestor can
clip it.

---

## Motion

All motion derives from one clock: the chase light sweeping and a key flashing
on press. There is no decorative animation.

Reduced motion is handled in **three** places, because one is not enough:

1. **CSS** — a global `prefers-reduced-motion: reduce` rule collapses every
   animation and transition.
2. **framer-motion** — `<MotionConfig reducedMotion="user">` wraps the app.
   framer-motion writes inline styles from its own loop and never touches CSS,
   so the rule above cannot reach it.
3. **JS timers** — outside both. Anything animating on `setInterval` checks
   `prefers-reduced-motion` itself. The landing page's chase light is the one
   that does; the guard test fails any future one that does not.

---

## Floors

These are not preferences. The direction contract calls arm's-length legibility
"the product working", and each of these is enforced in CI.

- **Contrast**: every text node was measured against its real computed
  background across eleven surfaces in both themes. Body text and Baking Mode
  are clean. The signal control's legend is guarded at **≥ 4.5:1** by computing
  the ratio from the tokens — it is 5.92:1 dark, 5.75:1 light.
- **Touch targets**: **44px** for anything a thumb reaches repeatedly. `sm`
  (36px) is for dense desktop chrome and for inline affordances inside a chip.
- **Width**: every surface works at **375px** with no horizontal scroll,
  asserted on all ten routes.
- **Safe areas**: the bottom nav reserves the device inset, and the `.above-nav`
  utility adds it for everything floating above the nav rather than guessing a
  fixed offset.
- **No browser dialogs**: no `alert`, `confirm` or `prompt`. Every surface
  reports in its own panel, and errors name the problem **and** the recovery.

---

## Honesty

A rule that turned out to matter more than expected, and which is now a
standing instruction:

**Draw only what the data can support.** A panel with nothing to report says so.
It does not invent a reading, pad a chart with zeroes, or rank a tie.

Worked examples in the build:

- **Analytics** draws only months that contain a bake, and states outright when
  there are too few to read a trend. "Baked more than once" stays empty until
  something has actually been baked twice, because ranking a three-way tie of
  one bake each invents an order.
- **Cookbook tiles** show bake type and ingredient count — always true — unless
  the recipe can prove more. `derivePhasesWithReading` reports whether phases
  were *proved* or merely generic; `isPlaceholderTiming` recognises the seed
  script's `"20 mins"` / `"30 mins"` pair that 199 of 203 recipes carry.
- **The Instagram export** claims nothing the recipe cannot prove.
- **The landing page** derives its demonstration from `derivePhases`, the app's
  own vocabulary, so it cannot claim a levain the parser would not find.

---

## What enforces this

| Guard | Covers |
|---|---|
| `src/designSystem.test.ts` — *red is temporal* | Red drawn only by the files that report something happening now; no error in red; a destructive control on the spoiled rule; no stock Tailwind palette colour and no legacy `accent` alias; `--fault` readable on a panel in both themes. |
| `src/designSystem.test.ts` | The ban, both material tokens, self-hosted faces in CSS *and* HTML, reduced motion in all three layers, no browser dialogs, the contrast floor, safe-area reservation, every promised icon shipping. |
| `e2e/visual.spec.ts` | 47 baselines: ten surfaces × two themes × desktop and phone, plus the sheet as dialog and as bottom sheet. Budget is **150 absolute pixels** — a ratio scales with the page and hid a whole button's legend changing colour. |
| `scripts/generate-icons.mjs` | Every shipping raster, drawn from the tokens. Re-running reproduces them exactly. |

Fixtures never touch the live database or the image CDN. A baseline that depends
on live data fails the first time someone logs a bake.

---

## Deviations from the direction contract

Recorded because the artifact is the authority, not the intention.

**1. The cookbook is a gallery, not a list of patterns.**
The contract specified a list where each row is a name, a segment readout and a
miniature step row, with "no photograph required for any row to read". Checked
against the real library that reasoning collapsed: every one of the 203 recipes
has exactly one photograph, and the pattern beside each would have been 203
identical rows of `PREP COOK FINISH · 50 MIN`. The list was spending its density
on placeholder text. Amended 2026-09-15 and recorded in REWORK_PLAN.md.

**2. `--key-queued` and `--key-done` are dimmer than specified.**
The contract names `#FFE100` yellow and `#F2F2F2` white. The dark theme ships
`#7a6000` and `#57564f`. A seven-phase row with five complete keys at pure white
is a white slab, not five keys — the Instagram exporter hit exactly that and had
to be reworked around it — and a bright yellow queued key competes with the red
*now*, which breaks the rule that red is spent once. The dimmer values keep the
chase light the brightest thing in the row. This was undocumented until now.

**3. Two faces, not three.**
The contract asked for a display grotesque, a mono, and "a humanist companion
for instruction prose only". Prose is set in Archivo at normal width and weight
instead. One family carrying two voices is one fewer file to precache for an
offline kitchen, and it keeps the type a single system.

**4. The step row's home on the cookbook moved.**
It reports in the Now Baking panel rather than on every row, where its keys are
lit and therefore reporting rather than decorating.

---

## Known gaps

Honest about what is not done:

- **Six overlays are still hand-rolled** — the bottom nav's More sheet, the
  pantry scanner, the AI substitutions modal, and three in Baking Mode. They
  predate `Sheet` and still lack its focus trap and Escape handling. Migrating
  them is mechanical and wants its own pass.
- **The selected-make detail's layout is rebuilt but untested by reality** — the
  library holds three bake logs across three recipes, so the iteration reading
  renders as rows of one.
- **Placeholder timings** — 199 of 203 recipes share `"20 mins"` / `"30 mins"`.
  A data problem, not a UI one. The editor no longer makes it worse.
- **All recipe photography is one external CDN** — no local copy, no resizing,
  and a tile downloads a full-size photograph to display it at 280px.
- **The library is paginated, not virtualised** — 48 tiles a page, but four
  presses of *Show more* still leaves 200 tiles mounted.
- **No CI** — the guards above exist and pass, but nothing runs them
  automatically. This is the largest remaining gap.
- **Android safe areas were measured in a browser with the inset simulated**,
  not on a physical device.
