# A. Platform Native: round 2 (rebuttal)

## 1. Rebuttals

### B, Tactile and Gestural

1. **L3: the Last-time card becomes a swipeable 5-dot pager.** The same card is now tap-to-open-entry, swipe-to-page, and stepper-with-arrows. Three behaviours on one 100px surface is how a baker opens the wrong bake with a floury thumb. It also hides four of the five bakes behind a gesture, and the user who asked for "All 5 bakes" now cannot see that there are five without counting dots. A single row with a chevron and "5 bakes" says it in two words and does one thing.
2. **L1: chevron-only back, with the chapter name demoted to a non-tappable eyebrow.** The iOS convention (chevron plus the previous title) exists because the title tells you where back goes. Drop it and the user must guess. B also leans on a custom edge-swipe with a parallax, which on the Android APK fights the system back gesture and on iOS Safari fights the browser's own edge swipe. Two competing back gestures is a known bug class, not polish.
3. **L8: swipe-right "Pin" on Contents rows, plus a long-press menu as the "twin".** A long-press menu is not a visible alternative; the brief says visible. Pin is also a feature nobody asked for, added to justify a gesture. And the shared-element transition (photo flies into the page) is B's signature: it needs the source element to exist, so it silently fails on refresh and on `/r/:slug` deep links, and the product is full of those.

### C, Action-first

1. **L8: chapters become accordions, each with an inline "Open Dessert (44)" button.** Every chapter tap now costs two taps to go where the old link went in one, and a 203-recipe cookbook with one row open at a time makes the contents page a moving target: the thumb that hit "Beef" lands on "Lamb" after "Dessert" collapses. This is the exact reverse of kitchen use, which wants one tap and a fixed layout.
2. **L3 and L6: "5 bakes" and "See all 14" expand in place and *do not navigate*.** The bake log is the main character, and C buries it under a disclosure in a card. A journal you read through in a 260 ms accordion has no URL, no back, no scroll position and cannot be linked. It also contradicts the brief's own rule that every screen keeps a real URL.
3. **L10: a sticky bottom action bar with "New recipe" above the tab bar.** That is a full-width FAB under another name, which the owner has ruled out, and it costs 48px of vertical space on a 667px phone on every Cookbook visit. Its ⌘K palette is a desktop idiom answering a phone complaint.

### D, Cookbook Objects

1. **L1: the back control is a "chapter tab" with a paprika notch and no chevron.** Nothing tells a first-time user that a cream tab hanging from the corner goes back. The universal back glyph is the cheapest learned affordance there is, and D deletes it for a metaphor. Android hardware back will do the right thing, but sighted tap users get a puzzle.
2. **L7: a 28x96px rotated "A-Z" side tab pinned to the screen edge.** Rotated text is hard to read, 28px wide fails the 44px target, and a right-edge tab collides with the system back-swipe zone on gesture-navigation Android. A segmented `Chapters | A-Z` control does the same job at 44px and reads normally.
3. **L8 and L5: varying-height "spine marks" per chapter and a perforated, scalloped tear-off slip animating into the tab badge.** The brief's own design contract says colour and ornament are never decorative; chapter spine heights encode nothing. The slip's CSS `mask` scallops plus a fly-to-badge animation are the most expensive pieces in the proposal, for a button that already said "Added 9".

## 2. Concessions

- **From B: the press physics and the stretched link.** A shared `.pressable` (scale 0.97, 80 ms in, spring out) and `::after inset:0` whole-card targets are right and cheap. I adopt both for every `ListRow`, `RecipeTile` and card, replacing my earlier flat darken-only pressed state on iOS-style rows. I also take B's shared-element transition for exactly one case: tile photo to recipe hero, with a graceful fallback to the plain push when the source element is missing (deep link, refresh).
- **From C: optimistic actions with Undo, and `?view=az`.** "Add 9 missing" collapses to "Added 9" with a 6 s Undo toast and per-ingredient "On list" tags. The A-Z segmented control gets a real, shareable, refresh-safe URL param rather than local state. I also take C's `aria-disabled` rather than `disabled` so a disabled control stays focusable and explains itself.
- **From D: the ribbon, once.** One paprika ribbon on the "Pick up where you left off" card is a lovely identity mark and it is the only solid paprika object on the Cookbook screen, which fits the brief's one-primary rule. It sits on top of an ordinary row with a chevron; it never replaces the chevron. D's "ink at 40%" for prose-only underlines is also correct, and I use it.

## 3. Final position: replacement list for L1 to L13

1. **L1**: `NavBar` back pair (chevron plus parent title, 44px), real `<a>`, falls back to the parent route on a cold deep link.
2. **L2**: "Source" inset row with a trailing external-link glyph, opening the Capacitor Browser or a new tab. Byline stays plain text.
3. **L3**: whole Last-time card is one chevron row, "5 bakes", stretched link, `.pressable`. No pager.
4. **L4**: Publish row in a footer group, button opening a medium-detent `Sheet`; state shown by a `PublishState` lock.
5. **L5**: tonal `Button` with optimistic "Added 9", Undo toast and "On list" tags.
6. **L6**: "See all" header control with chevron, a real link to `/bakes`.
7. **L7**: `Chapters | A-Z` segmented control, `?view=az`, in place.
8. **L8**: inset-grouped list, 52px rows, count and chevron, whole row is a stretched link. No accordion, no swipe-only actions.
9. **L9**: "Show 5 more" disclosure button, chevron rotates, loose notes as a normal row.
10. **L10**: toolbar `+` icon button in the NavBar (44px) with a Menu for New recipe, Import link, Scan; "Log a bake" stays a tonal Button on the recipe and a `+` on Bakes.
11. **L11**: desktop segmented nav in the top bar with a sliding thumb (240 ms), link semantics, `aria-current`; wordmark is brand only.
12. **L12**: back pair on all widths; right-click or long-press back opens the ancestry Menu as a bonus.
13. **L13**: toolbar icons (Favourite toggle, Share via system sheet, Edit) plus overflow Menu (Print, Duplicate, Compare, Delete); Compare becomes Select mode on Bakes with a bottom "Compare (2)" bar.
- **Globals**: ink links; ribbon on the resume card only; stretched-link and `.pressable` everywhere; shared-element photo transition for tile to hero with fallback.

## 4. Scorecard (1 to 10, higher is better; for build cost 10 means cheap and safe)

| Rival | App-feel polish | Kitchen usability | Cookbook identity fit | Accessibility and routing | Build cost and risk |
|---|---|---|---|---|---|
| **B** | 9 | 6 | 6 | 6 | 4 |
| **C** | 7 | 7 | 5 | 6 | 6 |
| **D** | 6 | 6 | 9 | 6 | 4 |

- **B polish 9**: pressed physics, springs and a continuous photo motion are the closest to native feel. **Kitchen 6**: the pager and long-press twins add risk with wet hands. **Identity 6**: it works in the palette but has little cookbook character. **A11y 6**: real `<a>` and visible twins are good; the swipe-back conflicts with system gestures. **Cost 4**: shared-element transitions and gesture arbitration are the costliest items of the four.
- **C polish 7**: optimistic Undo is excellent, but expanding in place feels like a web accordion. **Kitchen 7**: big verbs in the thumb zone are good; accordion contents shift under the thumb. **Identity 5**: neutral utility, nothing of a cookbook. **A11y 6**: disclosure semantics are right, but in-place bake history loses the URL. **Cost 6**: mostly composition of existing `Sheet` and `Menu`; the palette is extra.
- **D polish 6**: charming, but novel controls cost recognition. **Kitchen 6**: tabs and a rotated side index miss 44px targets in places. **Identity 9**: the strongest fit to a printed cookbook. **A11y 6**: stated semantics are correct but several shapes are undersized. **Cost 4**: masks, a vertical rotated index and bespoke transitions are all new art and QA.
