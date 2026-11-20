# UI review: rules

*Run 2026-11-18 · derived from CLAUDE.md, DESIGN.md and LAUNCH_PLAN.md as of `08728e0`*

## Hard rules

| # | Rule | Source |
|---|---|---|
| R1 | The bake log stays the main character. Growth, social and money features must not demote the iteration notebook to a side feature. | CLAUDE.md · Key decisions; LAUNCH_PLAN §2 "Untouchable" |
| R2 | Local-first: a user's own cookbook works with no network and no account. Offline is never traded away. | CLAUDE.md · Data and distribution; LAUNCH_PLAN §2 |
| R3 | The free tier stores nothing server-side. An account is needed only to publish or to sync; the full app is usable anonymously, forever. | CLAUDE.md; LAUNCH_PLAN §2 |
| R4 | Publishing makes a snapshot copy. Private recipes have no server-side representation; editing a local recipe never changes a live public page. | CLAUDE.md |
| R5 | No ads, ever. | CLAUDE.md |
| R6 | React + Vite single-page app. No SSR framework (meta injection for `/r/:slug` only). | CLAUDE.md · Architecture |
| R7 | Every layout works at 375 px with no sideways scroll. Anything a thumb reaches repeatedly is a 44 px target; `size="sm"` only for dense desktop chrome and the × in a chip. | CLAUDE.md · UI/UX; DESIGN.md · Geometry |
| R8 | Two themes only, light (paper, the default) and dark (warm charcoal `#16120F`, never true black), both first-class. | CLAUDE.md; DESIGN.md |
| R9 | No `alert()`, `confirm()` or `prompt()`. Errors are reported in the panel and name the problem and the recovery. | CLAUDE.md; DESIGN.md · App not website |
| R10 | Loading shows skeletons, never the word "Loading". A read from the device draws nothing for its few milliseconds. | CLAUDE.md; DESIGN.md · Honesty |
| R11 | Draw only what the data supports: no invented readings, no zero-padded charts, no ranked ties. Placeholder timings are never printed as measured. A best is named only between two or more and never on a tie. | CLAUDE.md; DESIGN.md · Honesty |
| R12 | Every overlay is a `Sheet` (focus trap, Escape, focus return, counted scroll lock). No hand-rolled scrim. | CLAUDE.md · Component layer; DESIGN.md |
| R13 | Motion respects `prefers-reduced-motion`; a JS timer checks it itself. Motion is short and physical (press 80 ms, 24 px slide, sheet 280 ms). | CLAUDE.md; DESIGN.md · Motion |
| R14 | Colour means one thing each. Paprika (`--accent`) is **the one primary action on a screen** and a rating's stars, never how a link or control announces itself. Sage = have it/done; butter = a timer or the current step; pencil = a margin note from a past bake. | DESIGN.md · Colour; CLAUDE.md |
| R15 | Errors take `--fault` (ochre), never the accent. Destructive controls are outlined in `--spoiled`, never filled. | DESIGN.md · Colour |
| R16 | Paper is flat: no glow, no gradient, no blur. Depth is a hairline, a soft corner, a small lift. The scrim is a flat dim behind a sheet and nothing else. Photographs are never scrimmed, tinted or overlaid with text. | DESIGN.md · Paper is flat (enforced by `designSystem.test.ts`) |
| R17 | Type: Fraunces for titles (sentence case), Source Serif 4 for reading text (method, headnotes, notes), Inter Tight for controls, labels and figures (tabular). Caveat only for bake notes, optional, off by default. No uppercase tracked labels. Times print "45 min", "1 h 15". | DESIGN.md · Typography |
| R18 | Text contrast at least 4.5:1 for every pairing, in both themes. | DESIGN.md (enforced by test) |
| R19 | It is an app, not a website: no web-style text links. Navigation is a back button, a whole-card link, a row, a tab or a segmented control; an action is a `Button` or `IconButton`. Everything pressable sinks on press. | DESIGN.md; CLAUDE.md |
| R20 | Compose `src/components/ui`; don't hand-roll a section, control, figure or overlay. Panels never nest. | DESIGN.md · Component layer |
| R21 | The shell: four destinations (Cookbook, Bakes, Shop, Discover), a bottom tab bar on a phone and a slim top bar on a desktop; search, New and the avatar at the right. No sidebar, no More drawer, no floating + button. "New" is a labelled header button. Shared pages, baking mode and the landing page have no app chrome. | CLAUDE.md · Interface; DESIGN.md · Geometry |
| R22 | Undo, not "Are you sure?": a reversible action happens at once and offers Undo in a toast. | CLAUDE.md; DESIGN.md |
| R23 | The two removed looks, Black & Gold and the Step Row drum machine, never come back. | CLAUDE.md; DESIGN.md |
| R24 | Absence is said, not padded: an empty list says so in one plain line and offers the way on. Copy says less: no explaining or reassuring second sentences. | DESIGN.md · Honesty; owner's standing preference (2026-10-26) |
| R25 | No recipe versioning; recipes are plain CRUD. No markdown editor: notes are a panel and a textarea. | CLAUDE.md · Key decisions |
| R26 | The landing page is the single persuasive surface and renders outside the app shell. Everything else is for operating, not persuading. | CLAUDE.md · Product |
| R27 | Posting bake results on published recipes and cloud sync are paid (Pro). Publishing itself is free and never paywalled. | LAUNCH_PLAN §2, §5 |

No conflicts between CLAUDE.md and DESIGN.md on the look this run. R24's "copy says less" comes from the owner's
standing preference, recorded 2026-10-26, rather than from either document.

## The intended look
- **A printed cookbook you write yourself.** A recipe reads like a page, the bake log reads like notes in its margin,
  and the controls are an app's controls: pressed, not clicked. It's for a baker with floury hands and the phone at
  arm's length, and the same baker later, looking back at why one loaf beat another.
- **Paper and ink.** Warm paper `#FBF7F0`; raised sheets slightly lighter, sunk wells (an empty plate, a skeleton)
  slightly darker; hairline rules. Ink in three weights (ink, ink-2, muted). Dark is the same book at night, warm
  charcoal.
- **One paprika accent** `#B5391F`, spent on the single primary action of a screen and on stars. Everything else
  that's pressable is ink: outlined secondary, tonal or ghost buttons, rows, cards, tabs.
- **Quiet supporting colours, each with one job:** sage (have it / done), butter (a timer or the current step),
  pencil (what you wrote last time), ochre (a fault), a wine outline (destructive).
- **Three faces.** Fraunces titles in sentence case, italic for section names. Source Serif 4 for anything people
  read or wrote. Inter Tight for controls and numbers, with aligned tabular figures. Labels are small,
  medium-weight, sentence case. Never shouting capitals.
- **Flat.** No shadows beyond a 1–2 px lift under a raised sheet; no gradients, glows or blur; photographs shown
  plain, never darkened or written over.
- **Geometry.** Soft small corners (4 / 6 / 8 px; 16 px on a sheet's top corners). A 75rem column with a 16 px phone
  gutter. Two panes where a desktop has room: ingredients beside method, editor beside preview, baking step beside
  its side panel.
- **Navigation.** Four destinations, a bottom tab bar on the phone and a slim top bar on the desktop, with search,
  "New" and an avatar menu (Settings, sign in, published, help). Back buttons are named for where they go. Overlays
  are sheets that rise from the bottom on a phone or sit centred on a desktop.
- **The book's furniture:** recipe plates (a photo, or the recipe's initial as an italic drop cap), tiles with a
  two-line serif title, a ribbon bookmark on "pick up where you left off", a round "Best" stamp for a personal best,
  pencil margin notes, an A–Z letter rail, kitchen fractions ("⅔ cup").
- **Density.** Generous on the phone (44 px targets, big type in baking mode); denser chrome on the desktop. Short,
  plain copy that says what a thing is and stops.
- **Honest.** Nothing is drawn that the data can't prove: no fake timings, no chart padded with zeros, no "best" on
  a tie, no spinner word.
