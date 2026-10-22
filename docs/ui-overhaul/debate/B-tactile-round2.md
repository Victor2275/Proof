# B, Tactile & Gestural: round 2

My rivals have landed two hits I have to take seriously: shared-element transitions are fragile on cold loads, and gestures fail on floury hands. I take both below. They did not land the main point, which is that B's baseline is the same visible-button set everyone else has, with physics on top.

## 1. Rebuttals

### A, Platform Native
1. **"Hardware back / swipe-back calls the same `navigate(-1)`... pressed: the pair drops to 40% opacity"; "Android: Material 3 shared-axis".** A has a pressed state of opacity and a 350ms iOS slide. That is a rented grammar. The iOS slide with `-30%` parallax of the outgoing screen is the most generic transition there is, and it says nothing about *which* thing you touched. On a 203-tile photo cookbook, the photograph is the continuity; A throws it away. Also, A ships two motion languages (iOS curve and M3 shared-axis) from one Capacitor codebase, which doubles the test matrix and means the PWA user sees whichever `getPlatform()` guesses.
2. **"Large titles that collapse" with an IntersectionObserver, and inset-grouped lists replacing `Panel`/`PanelRow` in most screens.** This is the largest restyle in the debate: it turns Fraunces-and-paper pages into Settings pages. A's own estimate is 12-13 days *plus* a rewrite of every list screen. The owner asked to remove links, not the cookbook's character.
3. **"Chevron-right in every row" and "See all >" kept as a header text-button.** A's own L6 concedes it is "the one place the platform itself uses a text affordance". That is the owner's complaint, a labelled arrow, preserved under a platform excuse. A chevron row is a link wearing a chevron.

### C, Action-first
1. **"Tap expands the card to a compact list of all five bakes... each row expands again to the full note"** and **accordion chapter rows ("Open Dessert (44)" button inside)**. With 203 recipes and 40+ in a chapter, in-place expansion makes the cookbook a tall accordion on a 375px screen. The thumb target moves as rows open above it, which is the worst thing to do to a person tapping with flour on their hands. Each chapter row also needs two taps to go where one tap went before. C turned a one-tap navigation into a two-tap disclosure and called it fewer links.
2. **"A sticky bottom action bar above the tab bar" with "New recipe" as the paprika primary.** That is two stacked bottom bars on a 375x667 screen (48px action bar plus 60px tab bar plus safe area is over 120px, a fifth of the display) and a de facto FAB, which the brief says the redesign dropped. It also fights the keyboard when search is focused.
3. **Command palette and `[` / `]` previous/next recipe, desktop-first.** Good for the 1280px user, but the brief's typical user is a phone on a counter. Where C replaces L12 breadcrumbs with the palette plus a chip, a mouse user loses their orientation. The palette is a feature, not a replacement for the link problem.

### D, Cookbook Objects
1. **"A 44px-high tab that hangs from the top-left page edge" as back, and a "side index tab 28px wide x 96px tall, sticky to the viewport edge".** The 28px-wide edge tab sits exactly where Android's system back-gesture zone and my own edge-swipe live, so it will lose touches to the OS. A user with flour on their thumb will hit the gesture, not the tab. A 6px notch replacing the chevron also makes the back control *less* recognisable than the universal glyph it replaced.
2. **"Tear-off slip" with a CSS `mask` scalloped edge, flying into the Shop tab badge, and a "perforated" top edge.** This is decoration with real cost (mask rendering and a fly-to-badge animation that must find the badge's rect) for a button that C and A both solve with a plain tonal button and a toast. CLAUDE.md says colour and form are never spent on decoration.
3. **Per-row "spine marks that vary in height by chapter number".** D concedes this is "not decorative colour", but varying shape by an arbitrary index encodes nothing. "Draw only what the data can support" applies to shape too.

## 2. Concessions

- **From A, steal the grabber-as-button and the "Done" twin on sheets, and the keyboard-operable segmented nav.** A cycles detents on a tapped grabber (`aria-label="Resize"`), which is better than my drag-only detent. I adopt it. I also adopt A's rule that a cold deep link with no history goes to the parent route, and A's per-tab scroll memory (tabs remember their own stack): it makes my tab crossfade feel instant and costs one keyed outlet.
- **From C, steal optimistic action with Undo, and the "On list" tag.** C's L5 (button collapses to "Added 9", rows get an "On list" tag, a 6s Undo) is better than my version, and C is right that a destructive swipe should always be undone rather than confirmed. I adopt the Undo toast for every swipe action. I also steal the `?view=az` URL for the A-Z view: refresh-safe, deep-linkable. And C is right that the shared element is fragile.
- **From D, steal the margin-note treatment of "Next time" and the chapter-tab idea as a *label*, not a control.** D's pencilled "Next time" in the Last-time card is a free, identity-rich use of Source Serif italic that costs nothing. The alphabet "thumb index" strip is the better visual for my A-Z letter rail, because it is what a real cookbook has. I keep both and drop the rest (seal, slip, ribbon).
- **Concession to all three on shared elements:** I now treat `layoutId` as progressive enhancement. It runs only on warm in-app navigation from a rendered tile to a rendered hero. Cold load, refresh, `/r/:slug`, hardware back after a long idle, and Low-Power / reduced motion all get a 200ms fade. I cap it by design on mid-range Android: transform and opacity of one image only. If the Phase-1 spike drops frames on the test device, the shared element is cut and the remaining system (press physics, haptics, pager, sheets) still ships.
- **Concession on gestures:** edge-swipe back, swipe rows, long-press and the pager become strictly *accelerators* behind a setting ("Gestures", default on). No acceptance criterion may depend on one. Baking mode has no swipe gestures at all (the footer is 64px buttons; a floury thumb sliding is a hazard, as C and A both said).

## 3. Final position (amended L1-L13)

Global: `.pressable` (0.97 scale on cards, tint, 80ms in, spring out, Light haptic on commit), stretched link on every card, tile and row, ink links with no underline, paprika only for the one primary and for stars. Every gesture has a visible twin; the shared photo is an enhancement with a fade fallback.

| # | Final replacement |
|---|---|
| L1 | 44px back-chevron button (`navigate(-1)`, parent-route fallback on deep link) plus optional edge swipe. Chapter name becomes a non-link italic eyebrow. |
| L2 | Source chip (outlined pill, host and arrow-up-right), real `<a target=_blank>`; opens the in-app browser on Capacitor. |
| L3 | Last-time card is a stretched link to the bake; swipe pager inside, with dots and "1 of 5 < >" buttons; last page is "See all 5 bakes". "Next time" set as D's pencilled margin note. |
| L4 | Publish state chip (lock, "Private, this phone") opening the publish `Sheet`; `<button aria-haspopup>`. |
| L5 | Outlined "Add 9 missing" button with C's optimistic "Added 9", "On list" tags and 6s Undo toast. |
| L6 | Whole "Recently baked ›" header row is a 48px link; the strip ends in an "All bakes" tile. |
| L7 | "A-Z" key opening a detent `Sheet` with a thumb-index letter rail (D's visual), `?view=az` deep link (C's idea). |
| L8 | 56px full-row stretched links, leader dots, count, chevron; swipe-right Pin with visible twin (row menu). |
| L9 | "Show 5 more" `<button aria-expanded>` disclosure (A, C and D all agree; so do I). |
| L10 | Ink-filled "+ New" pill opening a three-tile `Sheet` (Write, Import, Scan); on Bakes it is "Log bake". |
| L11 | Segmented nav with a sliding `layoutId` thumb; `aria-current`; wordmark is a button-shaped link. |
| L12 | Back button plus non-link eyebrow; hidden `nav aria-label="Breadcrumb"` for screen readers. |
| L13 | Icon action bar (heart pop, Share, Print, Edit, `...` Menu); Compare is a selection mode with a docked "Compare (2)" bar. |

## 4. Scorecard

| Rival | App-feel polish | Kitchen usability | Cookbook identity fit | A11y and routing safety | Build cost and risk (10 = cheap/safe) |
|---|---|---|---|---|---|
| **A, Platform Native** | 7: "iOS push, large titles, detents" are proven and smooth, but generic and not tied to the photograph. | 8: big, familiar targets and nothing hidden; the rows are in predictable places. | 4: "looks like Settings" is a fair attack; chevrons and grouped lists dilute the printed-page identity. | 9: real links, real buttons, `navigate(-1)` fallback; the safest of all four. | 5: roughly 13 days plus a restyle of every list; per-tab stacks are fiddly. |
| **C, Action-first** | 6: optimistic actions and Undo feel modern, but accordions and bars read as a dashboard. | 6: Undo and big buttons are excellent; moving layout under the thumb and a second bottom bar are not. | 5: the content is dressed as controls and toolbars; little of the cookbook shows. | 7: all buttons and `aria-expanded` are easy, but in-place expansion makes URL and back ambiguous in places. | 7: mostly buttons and a palette, low animation risk; the palette and the inline expansion are moderate work. |
| **D, Cookbook Objects** | 6: charming, but the objects are mostly skins on plain links; little new motion physics. | 5: a 28px edge tab, a 6px notch and a perforated slip are weak targets with messy hands. | 10: the most recognisable and most faithful to "printed cookbook". | 6: needs hidden accessible equivalents for each object; edge tab collides with system back. | 5: bespoke SVG, masks and fly-to-badge animations; ongoing art maintenance. |

Honest bottom line: A is the safest, D has the best identity, C has the best action feedback. B's edge is the continuous, physical feel, and I have just conceded that its riskiest parts must be optional. The strongest combined product is B's press physics and pager, A's sheet and back semantics, C's Undo, and D's typographic touches.
