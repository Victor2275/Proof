# A. Platform Native: round 1

## 1. Thesis

An app feels polished when the user never has to learn it. A phone user has spent a decade inside iOS and Android; they know that a title at the top-left of a bar goes back, that a row with a chevron opens something, that a row with a switch toggles something, that a segmented control picks one of a few views, that a sheet rises from the bottom and drops away when you drag it, and that the Share icon opens the system's own share panel. Every one of those expectations is free polish if we meet it exactly, and every deviation is a tax paid on each tap. Proof's paper-and-ink skin supplies the character; the platform supplies the grammar. So: the nav bar, the inset-grouped list, the toolbar icon, the segmented control, the detent sheet, the native share sheet and the platform push/pop, all drawn in Fraunces, Inter Tight, paper `#FBF7F0`, ink `#1F1A17` and paprika `#B5391F`. Links disappear because their jobs are taken by things the user already knows how to read: rows navigate, bars go back, buttons act. Nothing needs a tooltip, a tutorial, or a discovery gesture, which matters most for a user with flour on their thumbs who cannot afford to guess.

Rule of the system: **navigation is a row or a bar; an action is a button; an external thing leaves through the system.** Paprika is never again used for "clickable". It marks the single primary action per screen and a selected state, nothing else.

## 2. Replacement table

Common to all rows: rest = `--paper-raised` fill (`#FFFDF9` light, `#201A16` dark) with a 1px `--rule` hairline; pressed = fill darkens 6% (`#F3EDE2`), instant in, 120 ms ease-out out; focus = 2px paprika ring with 2px offset (`:focus-visible` only); disabled = 40% opacity, `aria-disabled`, no pressed state. Min hit area 44px high.

| # | Replacement | Look and behaviour | Semantics |
|---|---|---|---|
| L1 back "‹ Dessert" | **NavBar** with back affordance: a 44x44 chevron-left icon button plus the previous screen's title ("Dessert"), the pair forming one 44px-tall target at the left, ink colour, 17px Inter Tight 500. The chevron is 12x20 stroke 2.5. Pressed: the pair drops to 40% opacity (the iOS convention). Hardware back / swipe-back calls the same `navigate(-1)`; if there is no history (deep link) it navigates to the parent route instead of leaving the app. | `<a href="/cookbook/dessert">` rendered by `Link`, with `aria-label="Back to Dessert"`. It is navigation, so a link. |
| L2 "Adapted from sugarspunrun.com" | An **inset-grouped row** in a "Source" group at the foot of the Method: leading label "Source", trailing value "sugarspunrun.com", trailing external-link glyph (arrow-up-right, 16px) instead of a chevron. Tapping hands off to the system via Capacitor `Browser.open` (in-app Safari/Custom Tab) or `target=_blank rel=noopener` on web. The byline under the title becomes plain, non-interactive ink-muted text: "Adapted from sugarspunrun.com". | Row is `<a target=_blank>` with visually hidden "(opens in browser)". |
| L3 "All 5 bakes →" | The whole **Last-time card becomes one inset row** with a trailing chevron and a trailing value "5 bakes". The entire card is the 100px-tall target; the text "All 5 bakes" is gone. Pressed: the full card darkens. | One `<a>` wrapping the card, `aria-label="Last time, Oct 17, 4 stars. Open all 5 bakes"`. |
| L4 "Private... Publish to get a link" | A **footer Group** with one row: leading cloud-up icon, title "Publish", subtitle "Private. Only on this phone.", trailing chevron. Tapping opens a **Sheet at medium detent** (see 3.4) containing the publish flow with a primary "Publish" button. | Row is a `<button aria-haspopup="dialog">` (it opens a sheet; it is an action, not a route). |
| L5 "+ Add 9 missing to the shopping list" | A real **Button**, variant `tonal` (paper-sunken fill `#F3EDE2`, ink label, 44px high, 12px radius, full-width inside the Ingredients group), label "Add 9 missing to Shop". Pressed: scale 0.98 over 80 ms, medium haptic tick. On success the label cross-fades to a check plus "Added 9" for 1.6 s, and a toast with an **Undo** button appears above the tab bar. Disabled with caption "You have everything" when nothing is missing. | `<button>`, result announced via `role=status`. |
| L6 "All bakes →" | A **section header row**: "Recently baked" left, a trailing **"See all" text-button with chevron**, 44px high. This is the one place the platform itself uses a text affordance (iOS "See All"), and it is a labelled control in the header, not an inline link. Also, the Bakes tab is one tap below. | `<a>` to `/bakes`; it is routing, so a link. |
| L7 "Index A-Z →" | A **segmented control** in the Contents header: `Chapters | A-Z`. Switching swaps the list in place (same route, `?view=az`, no push). | `role=tablist` pair or radio-group semantic; arrow keys move selection. |
| L8 Contents rows | **Inset-grouped list**: one rounded 16px container, rows 52px high, chapter name left (Source Serif 17px), count right in muted tabular figures, chevron-right 14px in `--ink-3`. 1px inset separators starting at the text edge. First and last rows round the container. Pressed row fill `#F3EDE2`. | Each row an `<a>`; the list is `<ul>` with count included in the accessible name ("Dessert, 44 recipes"). |
| L9 "5 more chapters, and loose notes →" | The last row of the group is **"Show 5 more"** with a chevron-down that rotates 180 deg on expand (inline, 220 ms). Loose notes get a normal row, "Loose notes", with a count. | `<button aria-expanded>`; a disclosure, so a button. |
| L10 "+ New recipe", "+ Log a bake" | **Toolbar icon buttons** in the NavBar trailing slot: a 44x44 round-cornered `+` (Plus, 22px, stroke 2) for New recipe on Cookbook, and for Bakes. Long label is exposed via `aria-label` and, on desktop, a tooltip. On Cookbook, tapping opens a small **Menu** ("New recipe / Import from web / Scan a page"), exactly as iOS's "+" does. On the recipe page, "Log a bake" is already a bottom-of-hero Button, which stays. | `<button aria-haspopup="menu">` / `<a>` for the single-destination case. |
| L11 Desktop top-bar links, wordmark | **Segmented control** centred in the slim bar: `Cookbook | Bakes | Shop | Discover`, 32px high pill, selected segment raised paper with a 1px rule and ink label, unselected muted; no underlines. The "Proof" wordmark becomes a non-link brand mark; "home" is the first segment. Keyboard: Tab to the group, arrow keys move, Enter follows. | `<nav aria-label="Primary"><a aria-current="page">...` (segmented visuals, link semantics, because it navigates). |
| L12 Breadcrumb | **Back chevron plus parent title** at the left of the bar (the L1 component), shown at all widths. Hierarchy deeper than one level uses the long-press/right-click **back history menu** (a Menu listing ancestors) as an extra, never the only route. | link, see L1. |
| L13 "Compare two", action row | **Toolbar**: Favourite (heart, toggle with `aria-pressed`), Share (system share), Edit (pencil), and an overflow **Menu** (`...`) holding Print, Duplicate, Compare bakes, Delete (destructive, red-ink). "Compare two" moves into the Bakes screen's toolbar as **Select** (iOS pattern), then a bottom action bar "Compare (2)". All icon buttons 44x44, labelled by `aria-label` and desktop tooltips. | `<button>`s; Menu is the existing primitive. |
| Global `a {paprika; underline}` | Delete the rule. Links are ink; text-level links are not used. Paprika is only primary-button fill and selected states. | |
| Last-time card, tiles partly tappable | Whole-card tap targets (see L3, `RecipeTile` becomes one `<a>` with the title as the accessible name; no nested interactive elements, the favourite heart moves to the toolbar). | |
| No pressed, transitions, haptics | Defined in section 3. | |

## 3. The interaction system

**3.1 Pressed feedback.** Rows and tiles: background to `--press` immediately (0 ms in, 120 ms out). Buttons: scale 0.98 plus darken, 80 ms in, 140 ms out. Nav-bar items: opacity 0.4. Never a ripple on iOS-feeling chrome; on Android (Capacitor `Capacitor.getPlatform()==='android'`) a Material 3 state layer (12% ink overlay) replaces opacity. Pressed state applies on `pointerdown`, not `click`, so it reads as instantaneous.

**3.2 Transitions between screens.** React Router 7 view transitions with framer-motion `AnimatePresence` per stack:
- **Push (drill in)**: incoming screen slides from `x: 100%` to 0 over 350 ms with the iOS curve `cubic-bezier(0.32, 0.72, 0, 1)`, while the outgoing screen translates `x: -30%` and dims 10%. Pop is the exact reverse.
- **Tab switch**: no slide. 150 ms cross-fade (opacity only), and each tab **remembers its own stack and scroll position**.
- **Android**: the Material 3 shared-axis X: 300 ms, `cubic-bezier(0.2, 0, 0, 1)`, 30px offset plus fade.
- **Sheet**: rises 320 ms on the same iOS curve; scrim fades 200 ms; dismiss by drag-down past a 25% threshold or velocity over 0.5 px/ms, by Escape, by the scrim, or the visible Close/Done button.
- **Reduced motion**: all of the above become a 100 ms opacity fade; no scale, no slide, framer-motion's `useReducedMotion()` checked in the shared `useTransitionVariants` hook.

**3.3 Large titles that collapse.** Cookbook, Bakes, Shop, Discover use a 34px Fraunces large title below a 44px bar; at 48px scroll, the large title fades and a 17px centred title fades in, with a hairline appearing under the bar. Implemented with an `IntersectionObserver` sentinel (no scroll handler jank). Recipe pages use an inline title only: the hero photo is the large title.

**3.4 Bottom sheets with detents.** `Sheet` gains `placement="bottom"` detents: `medium` (50% of viewport) and `large` (92%, with the page behind scaled to 0.96 on iOS). A 36x5 grabber sits at the top; the grabber is a button (`aria-label="Resize"`), so a user without drag can tap it to cycle detents. Used for: Publish, Log a bake, ingredient scale, timers, Share fallback. Focus trap, Escape and scroll lock remain as the existing primitive provides.

**3.5 Share.** `navigator.share()` on web, Capacitor `Share.share()` in the APK, which opens the system sheet with title, URL `/r/:slug` and text. Fallback where unsupported: a medium-detent Sheet with "Copy link" and "Print".

**3.6 Haptics** (`@capacitor/haptics`, no-op on web, skipped under reduced-motion-adjacent "reduce haptics" user preference stored in Settings):
- `ImpactStyle.Light`: tab change, segmented control change, sheet detent snap, stepper +/- on servings.
- `ImpactStyle.Medium`: primary button press (Add to Shop, Start cooking), sheet dismiss by drag.
- `NotificationType.Success`: bake logged, recipe added, published.
- `NotificationType.Warning`: destructive confirm opening.
- `NotificationType.Error`: validation failure.
- `selectionChanged()`: timer wheel, scrubbing the star rating.

**3.7 Gestures, each with a visible alternative.** Edge swipe back (from the left 20px) = back chevron. Drag sheet down = Close/Done. Pull-to-refresh on Discover only (the one network list) = a "Refresh" toolbar button. Swipe-to-delete on Shop and bake rows (iOS pattern: swipe reveals a red "Delete") = the row's Edit mode and a Select toolbar button. Never a gesture alone.

**3.8 Loading and empty.** Skeleton rows at the real row height (52px) with a 1.4 s shimmer paused under reduced motion. Empty groups use the iOS "ContentUnavailable" shape: 48px icon, 17px title, 15px muted line, one tonal button. Persisted tab state means returning to Cookbook is instant, never a spinner.

## 4. Phone vs desktop

The grammar is the same; the density changes. **Phone**: bottom tab bar (83px incl. safe-area, 4 items, labelled), NavBar 44px with back/title/actions, inset-grouped lists full-bleed with 16px margins, sheets from the bottom. **Desktop (1280)**: the slim top bar carries the segmented destination control (L11), avatar right; the NavBar's back affordance sits at the left of the page header (chevron + parent title), preserving the one idiom. Inset groups cap at 640px reading width on the left page of the spread; toolbar icons gain tooltips and visible `Cmd/Ctrl` hints in the overflow Menu; Sheets with `placement="bottom"` become centred 480px popovers/dialogs (macOS sheet behaviour); row hover is the same fill as pressed at 60%; every row and button keyboard-focusable with the same ring; Backspace/`Alt+Left` = back, `[`/`]` not needed. Push/pop slides are replaced by a 150 ms cross-fade (desktop users don't expect lateral slides). Context menus (right-click on a tile) offer the same actions as the overflow Menu. Swipe is off; its alternatives are always present.

## 5. Wireframes

Recipe page, phone, header to ingredients:

```
+-----------------------------------+
| < Dessert          ( heart )( ... )|  NavBar 44px: back pair | Favourite, More (share inside bar too)
|                          (share)  |
+-----------------------------------+
| [        hero photo 4:3         ] |
|                                   |
| The Best Cheesecake Recipe        |  Fraunces 28
| The creamiest cheesecake, no      |
| water bath required.              |
| Serves 12 . Prep 20 . Bake 1h15   |
| Adapted from sugarspunrun.com     |  plain text, not a link
|                                   |
| +-------------------------------+ |
| | Last time . Oct 17   **** *   | |  one inset row
| | "Pulled it at 55 minutes..."  | |
| | Next time: leave it in...     | |
| | 5 bakes                     > | |
| +-------------------------------+ |
|                                   |
| [  Start cooking  ]  (Log a bake) |  primary paprika | tonal
|                                   |
| INGREDIENTS         [-] 12 [+]    |
| +-------------------------------+ |
| | 1 cup  graham cracker  170 g  | |
| | 2 tbsp sugar                  | |
| | ...                           | |
| +-------------------------------+ |
| [ Add 9 missing to Shop ]         |  tonal button
+-----------------------------------+
|  Cookbook  Bakes  Shop  Discover  |
+-----------------------------------+
```

Cookbook home, phone:

```
+-----------------------------------+
| Cookbook                      (+) |  large title 34px | toolbar +
| [ Search the cookbook          ]  |
+-----------------------------------+
| PICK UP WHERE YOU LEFT OFF        |
| +-------------------------------+ |
| | [img] The Best Cheesecake   > | |
| |       Baked Oct 17 . 5 bakes  | |
| +-------------------------------+ |
| RECENTLY BAKED          See all > |
| [tile][tile][tile]  ->  scroll    |
| CONTENTS                          |
| ( Chapters | A-Z )                |  segmented
| +-------------------------------+ |
| | Dessert                 44  > | |
| | Side                    31  > | |
| | Vegetarian              27  > | |
| | Chicken                 23  > | |
| | Show 5 more              v    | |
| +-------------------------------+ |
| ALL RECIPES                       |
+-----------------------------------+
|  Cookbook  Bakes  Shop  Discover  |
+-----------------------------------+
```

## 6. Build cost and risk

New primitives in `src/components/ui` (compose; no new colour):
1. **NavBar** (back pair, title, large-title collapse, trailing slot): 2 days.
2. **List / ListRow** (inset-grouped container, row with leading/trailing/chevron/value/destructive, pressed state, `as={Link|button}`): 2 days. This one replaces `Panel`/`PanelRow` in most screens.
3. **Segmented** (links or radios variant): 1 day.
4. **Sheet detents + grabber + drag** (extend existing; framer-motion `drag="y"`): 2 days. Most risk: focus trap while dragging.
5. **Toolbar/IconButton** (44px, tooltip, aria-label required via type): 1 day.
6. **StackTransition + `useTransitionVariants`** (push/pop with direction from `navigationType`, per-tab stacks and scroll restoration): 3 days; the highest-risk piece.
7. **`lib/haptics.ts` and `lib/share.ts`**: 1 day.
8. **Toast with Undo**: 0.5 day.

Total roughly 12-13 engineer days, plus 2 for tests and the `/lab` gallery entries. Risks: (a) per-tab stack memory with React Router 7 is fiddly; mitigate with `<Outlet>` per tab and keyed `ScrollRestoration`; (b) swipe-back conflicts with horizontal scroll rails (restrict to a 20px left edge and Android uses the system gesture anyway); (c) iOS and Android idioms diverge; ship one set (iOS-flavoured) with the Android state layer and transition timing swapped by a single platform flag, not two forks; (d) `designSystem.test.ts` allows red only in listed files, so the destructive swipe action needs `--spoiled` styling, not raw red; (e) the large-title collapse adds layout shift if unmeasured, so reserve its height.

## 7. Why the others are wrong

**B, Tactile and Gestural.** "Content is the control" means the control is invisible. The brief's hard rule is that nothing hides behind a gesture with no visible alternative, so B must draw every alternative anyway and ends up building my UI plus a gesture layer on top. Long-press is the worst discoverability affordance there is, and it is physically unreliable with floury, wet or gloved fingers, where a clean 44px button is not. Shared-element transitions are the most expensive and most fragile animation to build over a lazy-loaded SPA, they break on deep links and refresh (no source element to fly from), and they collide with reduced motion. They are garnish; the grammar is the meal.

**C, Action-first.** Inline expansion instead of navigation destroys the one property a native app has over a page: every place has a name, a back button, and a position in a stack. Expanding things inline makes the Cookbook a long accordion on a 375px screen, wrecks scroll position, and makes URLs meaningless for deep links. Contextual action bars appear and vanish, so the user's thumb target moves; the platform's toolbar is stable. A command palette is a keyboard-desktop idiom; the owner's complaint is about the phone feel, and the palette gives a phone user nothing.

**D, Cookbook Objects.** Ribbon bookmarks, index tabs and stamps are charming and are a bespoke grammar that every user must decode: is the ribbon a bookmark, a favourite, a back button? Metaphor costs comprehension each time, and skeuomorphism dated badly on iOS 6 for exactly that reason. Index tabs on a 375px screen are 16px targets, failing the 44px rule; stamps are decoration, and the CLAUDE.md rule that colour and ornament are never decorative argues the same direction. D belongs in the illustration and empty-state layer, not the navigation layer.

**The real test.** Hand the app to someone who has never seen it, with flour on both hands. In my system they already know how to go back, open a chapter, share a recipe and dismiss a sheet. In the others they have to find out. Familiarity is the polish.
