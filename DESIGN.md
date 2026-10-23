# Proof — the cookbook design system

Written from the built app at the close of the UI overhaul (branch
`feat/ui-overhaul`, Phases 1–7), not from the plan. The plan, its decisions and
its 134 numbered changes are in [docs/ui-overhaul/](docs/ui-overhaul/); where
the build departs from them, [Deviations](#deviations-from-the-plan) says how and
why. The working rules an agent needs are in [CLAUDE.md](CLAUDE.md). This is the
reference for what the interface is.

It replaces two earlier systems, both removed on purpose: **Black & Gold**
(pitch black, gold, glass, glows) and the **Step Row** drum machine (true
black, silkscreened capitals, lit keys, seven-segment readouts). Neither comes
back.

---

## The thesis

**A printed cookbook you write yourself.** Warm paper, ink, one paprika accent,
a serif for the recipe and a quiet sans for the controls. The book is the
interface: a recipe reads like a page, the bake log reads like the notes in its
margin, and the controls are an app's controls — pressed, not clicked.

**Who it is for:** a baker with floury hands and the phone propped at arm's
length, hours into a ferment, and the same baker later, looking back at why one
loaf beat another. The bake log is the main character; nothing in the design
may demote it.

---

## Colour means one thing each

Colour is never decoration, branding, or a way for a control to ask for
attention. Each colour has one meaning, everywhere.

| Token | Light | Dark | Means |
|---|---|---|---|
| `--paper` | `#FBF7F0` | `#16120F` | The page. Dark is warm charcoal, never true black. |
| `--paper-raised` | `#FFFDF9` | `#2A231D` | A sheet lifted off the page: a panel, a sheet, a menu. |
| `--paper-sunk` | `#F4ECDD` | `#221C17` | A well in the page: a plate without a photograph, a skeleton. |
| `--paper-tonal` | `#EFE7D9` | `#1D1814` | A tonal track: a segmented control, a tag. |
| `--rule` / `--rule-strong` | `#E4DCCF` / `#CDBFA9` | `#2E2620` / `#4A3F35` | Hairlines; field outlines. |
| `--ink` / `--ink-2` / `--ink-muted` | `#1F1A17` / `#4A423C` / `#6B6159` | `#F1E9DC` / `#D8CDBE` / `#A99E91` | Text, in three weights of importance. Links and controls are ink. |
| `--accent` (paprika) | `#B5391F` | `#E26A4A` | **The one primary action on a screen** (Start cooking, Save) and a rating's stars. Never how a link announces itself. |
| `--sage` | `#4E6A3C` | `#9DB887` | Have it; done. |
| `--butter` | `#F6E9BF` | `#4A3F1E` | A timer, or the current step. A highlighter, not an alarm. |
| `--pencil` | `#6B5A2E` | `#D9C78E` | A margin note: what you wrote last time. |
| `--fault` (ochre) | `#8A4B0F` | `#E8A25A` | Something went wrong. Never the accent. |
| `--spoiled` | `#8C2F39` | `#E07A86` | The outline of a destructive control. Never a fill. |

`--on-accent` flips with the theme (white on light, charcoal on dark), because
the dark paprika is bright enough that cream on it fails contrast.

**A bake's phases** (`--key-now`, `--key-due`, `--key-queued`, `--key-done`,
`--key-unlit`) are the only time-named tokens, and only `StepRow` may use them:
the part running now is paprika, the next butter, the finished ink, the rest a
pale rule.

**Contrast:** every text pairing listed in `src/designSystem.test.ts` holds
4.5:1 in both themes, computed from `index.css`.

---

## Paper is flat

No glow, no gradient, no blur. Depth is a hairline, a soft corner, and a small
lift under a raised sheet:

- `--lift` — `0 1px 2px` at 14% ink (50% black in dark): a panel, a tile's plate.
- `--lift-sheet` — `0 -2px 16px`: a sheet rising from the bottom edge.
- `.scrim` — a flat dim (38% ink light, 55% black dark) behind a sheet, a
  dialog, or a phone's menu. Nothing else.

Photographs are never scrimmed, tinted or overlaid with text.

---

## Typography

Self-hosted variable fonts, latin subset, served from `/fonts` and precached by
the service worker so they work offline. All are SIL Open Font License.

| Face | Class | Used for |
|---|---|---|
| **Fraunces** (soft axis 60, weight 560) | `.font-title` | Titles and headings, in sentence case. Italic for section names and the 404's "p. 404". |
| **Source Serif 4** | `.font-prose` | The reading face: method, headnotes, notes, people's own words. Line height 1.55, proportional figures. |
| **Inter Tight** | `font-sans` (the default) | Controls, labels and figures. Tabular figures on the body, so quantities and times align. |
| **Caveat** (optional) | `.hand` | Bake notes in a handwriting face when Settings → Handwritten notes is on (`html[data-hand=on]`). Unlayered CSS, so it beats the notes' own italic and size. |

- Labels are `.ui-label`: 13px, medium weight, `--ink-muted`, sentence case.
  Uppercase tracked labels fail the build.
- Times print as a cookbook prints them: "45 min", "1 h 15" (`formatMinutes`).
  Amounts print as kitchen fractions: "⅔ cup", "1½".

---

## Geometry

| Token | Value | For |
|---|---|---|
| `--radius-key` | 4px | Plates, tiles, small chips' inner shapes. |
| `--radius-control` | 6px | Fields, buttons, selects. |
| `--radius-panel` | 8px | Panels, the hero plate on a wide page. |
| `--radius-sheet` | 16px | A sheet's top corners; the editor's preview. |

- **Mobile first.** Every layout works at 375px with no sideways scroll
  (asserted on every route by the visual suite). Anything a thumb reaches
  repeatedly is a 44px target; `size="sm"` is for dense desktop chrome and the
  × inside a chip.
- **The shell.** Four destinations — Cookbook, Bakes, Shop, Discover — as a
  bottom tab bar on a phone and a slim top bar on a desktop, with search (⌘K),
  New and the avatar (Settings, account) at its right. Content sits in a
  `75rem` column with a 16px phone gutter (32px from `md`). Shared pages
  (`/r/:slug`, `/@handle`), baking mode and the landing page have no app chrome.
- **Two panes** where a desktop has room: the recipe's ingredients beside its
  method, the editor beside "As it will read", baking mode's step beside its
  side panel.

---

## The component layer

`src/components/ui` is the whole vocabulary. Screens compose it; they do not
hand-roll a section, a control, a figure or an overlay in inline Tailwind.
Every primitive is shown in its real states at `/lab` (development only).

**Structure** — `Panel` / `PanelRow` (a raised sheet with a hairline, a heading
not a header bar; panels never nest), `PageHeader` (the screen's name in the
title face and its controls at the right; no rule, no introduction),
`Disclosure` (a real button with `aria-expanded`; closed bodies are `inert`).

**Controls** — `Button` (primary in paprika, secondary outlined, tonal, ghost,
and `danger`, outlined in `--spoiled`), `IconButton` (label required by
its type; a 44px round target; a tooltip on a pointer device), `BackButton`
(named for where it goes, a real link, history-aware), `Segmented` (a radio
group on a tonal track), `Switch` (`role="switch"`, named by
`aria-labelledby`, the whole row the target), `Menu` / `MenuItem`,
`Field` / `TextArea` / `Select` (one outline, one focus signal, errors wired by
`aria-describedby`; `Select` keeps the platform's popup).

**Overlays** — `Sheet` (bottom sheet or centred dialog, with detents, the focus
trap, Escape owned by the topmost sheet, focus returned to its opener, and a
counted scroll lock), `Toast` with `useToast` (one line, Undo, six seconds,
paused on hover or focus, announced politely), `DockedAction` (the primary
action kept above the phone's tab bar once its original scrolls away).

**The book** — `RecipePlate` (a photograph at a fixed footprint, or the
recipe's initial as an italic drop cap; never a broken image; takes a
`transitionName` for the shared photograph), `Photo` (a device photograph by
reference), `RecipeTile` (the picture, a two-line serif title and one line of
facts the recipe can prove), `MarginNote` (pencil, the reading italic),
`Stamp` (the personal best; one 160 ms press when earned), `Ribbon` (the
bookmark on "pick up where you left off"), `LetterRail` (the A–Z thumb index),
`Prose` (people's own words, line breaks kept), `Tag` (a tonal fact, never
pressable), `PublishState` (where a recipe stands with the shared cookbook, in
words).

**Figures** — `Readout` (a value in tabular figures with its unit and caption,
read as one value), `Meter` (one track with an ink fill), `Sparkline` (ratings
over bakes, drawn from three rated bakes), `Stars` / `StarRating` (a radio
group; the chosen star again clears it), `StepRow` (a bake's phases as one thin
line in 44px targets), `InstrumentRow` (present or absent chips, never colour
alone), `Skeleton` (the shape of network content on its way).

### It is an app, not a website

No web-style text links. Navigation is a `BackButton`, a whole-card link, a
row, a tab or a segmented control; an action is a `Button` or `IconButton`.
Every pressable thing carries `.pressable`. Haptics go through `haptic(kind)` —
selection, light, medium, success, warning — off on the web and when switched
off in Settings. Errors are reported in the panel, never through `alert()`,
`confirm()` or `prompt()`, and name the problem and the recovery. A reversible
action happens at once and offers Undo.

---

## Motion

Short and physical. CSS transitions are preferred because the global
`prefers-reduced-motion` rule collapses them; framer-motion runs under
`MotionConfig reducedMotion="user"`; a JS timer checks the preference itself.

| Moment | Timing |
|---|---|
| Press (`.pressable`) | Sinks to 0.97 in 80 ms, back over 140 ms. Reduced motion: no scale. |
| Tab switch | 140 ms cross-fade, no slide. |
| Push / pop | 24px slide and fade, 220 ms in / 180 ms back, `cubic-bezier(.2,.8,.2,1)`. A first load, a refresh, a deep link and a redirect do not animate. |
| Sheet | Rises over 280 ms, `cubic-bezier(.32,.72,0,1)`. |
| Disclosure | Height over 240 ms; chevron turns over 180 ms. |
| Stamp | One 160 ms press. |
| Toast | Six seconds. |
| Shared photograph | A cookbook tile's photograph grows into the recipe's hero over 340 ms on the sheet's curve; the rest of the page fades across in 200 ms. The View Transitions API, started by the tile. Waits at most 250 ms for the hero, then fades instead. Never under reduced motion, from a shared recipe, or without the API. |

---

## Honesty

- **Draw only what the data supports.** The import script's placeholder
  timing (`"20 mins"` / `"30 mins"` on 199 of 203 recipes) is never printed as
  measured (`isPlaceholderTiming`). A summary names a best only between two or
  more recipes and never on a tie. Discover features a recipe only when there
  are more than two, and offers tags only when one is used twice.
- **Loading is a skeleton, never the word.** A read from the device draws
  nothing for its few milliseconds rather than flashing one.
- **Absence is said, not padded.** An empty cookbook, an empty list, a recipe
  with no bakes each say so in one plain line and offer the way on.

---

## What enforces this

- `src/designSystem.test.ts` fails the build on any gradient, blur or
  zero-offset glow; on uppercase tracked labels; on a stock Tailwind palette
  colour; on the previous worlds' token names anywhere in a component; on the
  phase tokens outside `StepRow`; on the accent styling links; and on contrast
  below 4.5:1 for every listed pairing in both themes. It also checks that
  every pressable primitive uses `.pressable` and that `IconButton` requires a
  label.
- `npm run test:visual` (Playwright) compares 75 baselines — eighteen
  surfaces in both themes at desktop and phone widths, plus three overlays —
  and asserts the 375px floor on every route.
- `npm run audit:overhaul` writes the review screenshot set (25 screen states
  at 375 and 1280, both themes) into `audit-shots/overhaul/<label>/`.

---

## Deviations from the plan

- **Chapter, not Category** (change 26). The editor's field and the cookbook's
  Contents say Chapter, to match the mock-up's Contents and Chapters.
- **Analytics was not rebuilt.** The totals page is gone; Bakes opens on one
  summary line ("17 bakes · 6 recipes · best: Cheesecake") instead.
- **The shared photograph is started by hand.** React Router's
  `viewTransition` needs a data router and the app uses `<BrowserRouter>`, so
  the tile calls `document.startViewTransition` itself and `PageTransition`
  stands aside for that one change of page. It shipped after a throttled
  measurement (4× CPU, Pixel 7 emulation, production build): 2–7 of about 20
  frames over 20 ms, fewer than the push slide it replaces. It has not yet been
  checked on a real Android phone.
- **The handwriting face is optional and off by default** (change 18): the
  reading italic is the default margin note.
- **`Readout`, `Meter` and `InstrumentRow` survive** from the Step Row system,
  redrawn as plain figures, an ink track, and sage-edged chips. There are no
  seven-segment digits anywhere.

---

## Known gaps

- **No functional end-to-end specs.** The Playwright suites record and compare
  pictures; flows are asserted only in the unit suite.
- **Notes still confirm a delete** in a sheet rather than deleting at once with
  Undo.
- **Imported text is shown as stored** in the editor: the live library carries
  artefacts such as "graham cracker crumbs ((170g))" that the reading view
  cleans and the editor does not.
- **The shared photograph on Android** is unverified on hardware (above).
