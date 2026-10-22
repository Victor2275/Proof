# B: Tactile & Gestural. The content is the control.

## 1. Thesis

An app feels polished when the thing you touch answers your finger. It deforms under the thumb, it keeps its identity as it moves, and it never makes you hunt for a label to find out where to press. A website says "this blue word goes somewhere". An app lets you press the photograph and the photograph becomes the page. Proof's links are web-isms because they are small, coloured, labelled, and separate from the thing they describe. "All 5 bakes ->" sits under the bake it describes. "Dessert" sits above a chapter you are already inside. The fix is not nicer links. The fix is to make the content itself the target: the whole Last-time card, the whole tile, the whole row. Each press gets the same physical answer (a 0.97 scale on a spring and a light haptic), and each navigation is a continuous motion in which the photo you touched is the photo you arrive at. Gestures are accelerators only. Every gesture has a visible, 44px-or-larger button twin, because kitchen hands are floury and a hidden gesture is a bug, not a feature. Real `<a href>` elements remain underneath for semantics, deep links, middle-click, and screen readers; they just stop looking like links.

## 2. Replacement table

Shared press state ("Press" below), defined once as `.pressable`: on `:active`, `scale(0.97)` plus a surface tint of `rgba(31,26,23,.06)`, transitioning in 80ms ease-out and releasing on a spring (stiffness 500, damping 32, about 220ms). Focus is always a 2px paprika ring with 2px offset, `:focus-visible` only. Disabled is 40% opacity with no press response. Under reduced motion the scale is dropped and only the tint remains.

| # | Today | Replacement | Rest / pressed / focus / disabled | Semantics |
|---|---|---|---|---|
| L1 | "< Dessert" text link | **Back chevron button** (44x44, chevron only, no label) plus **edge-swipe back** (left 24px zone, drag right past 35% width or 600px/s velocity). Chapter name moves into a small Fraunces-italic eyebrow above the title: "Dessert", not tappable. | Rest: ink chevron. Pressed: 44px circular tint, haptic selection. During a drag the page follows the finger and the previous screen parallaxes in from -30%. Disabled: n/a. | `<button aria-label="Back to Dessert">` calling `navigate(-1)`, falling back to `/cookbook/dessert` on a cold deep link. Android hardware back runs the same path. |
| L2 | "Adapted from sugarspunrun.com" | **Source chip**: a 44px-high pill with a favicon-free outlined arrow-up-right glyph and the host. It opens the page in the Capacitor Browser (in-app sheet) or a new tab on web. | Rest: outlined pill, ink text (not paprika). Pressed: standard press. Focus: ring. Disabled when offline: shows "Source saved" in muted text and the host stays copyable. | `<a href target=_blank rel=noopener>`, announced as a link, which it is. External stays a link; honesty over camouflage. |
| L3 | "All 5 bakes ->" | **The whole Last-time card is the control**. A 5-dot pager sits on its bottom edge (current dot filled, the rest hollow). The card shows one bake. Swipe left/right pages through the bakes (snap, 280ms spring). Tapping the card opens that bake's full entry. The final page is "See all 5 bakes", a card-sized tile. | Rest: paper-2 card, a dot row, and a "1 of 5 ‹ ›" stepper with two 44px buttons that is the visible twin of the swipe. Pressed: card scales to 0.98. Focus: ring around the card. Disabled: with 0 bakes the card becomes the "Log your first bake" CTA. | Card is `<a href="/r/:slug/bakes/:id">` (stretched link). The pager is `role="group" aria-roledescription="carousel"`, with buttons "Previous bake" / "Next bake". |
| L4 | "Private... Publish to get a link" | **PublishState chip** in the meta row ("Private, this phone" with a lock). Press opens the existing publish `Sheet`. Long-press is not used here. | Rest: lock chip, 44px tall hit area, ink on paper-2. Pressed: press state. Disabled while offline: chip reads "Offline, publish later" and is `aria-disabled`. | `<button aria-haspopup="dialog">`. |
| L5 | "+ Add 9 missing to the shopping list" | **Solid secondary button** "Add 9 missing" (52px, outlined, basket glyph). On success the count rolls to "9 added" and the button becomes a tick that offers "Undo" for 6s (an inline toast, not a browser dialog). | Rest: outlined. Pressed: press state plus a success haptic on commit. Disabled: when 0 are missing, hidden entirely. | `<button>`, `aria-live=polite` result. |
| L6 | "All bakes ->" beside Recently baked | **The shelf header is the control**: the whole row "Recently baked ›" is a 48px target; the strip also ends in a final "All bakes" tile in the scroll. The chevron is a glyph, not an arrow in text. | Rest: Fraunces-italic title plus a muted chevron. Pressed: row tint. Focus: ring. | `<a href="/bakes">`. |
| L7 | "Index A-Z ->" | **Index becomes a sheet and a scrubber**: an "A-Z" segmented control (36px glyph button, 44px hit area) right of "Contents" opens a draggable index `Sheet` with detents 50% / 92%. A letter rail on the right edge lets you scrub (haptic selection tick per letter). | Rest: outlined "A-Z" key. Pressed: press state. The rail has 44px-wide touch zones with 24px visible. | Button with `aria-haspopup=dialog`. The route `/cookbook/index` also exists (deep link opens the sheet). |
| L8 | Contents rows as links | **Contents rows are full-width 56px rows** with the leader dots and count, a trailing chevron, and a **swipe-right "Pin" action** (reveals a 72px paprika-outlined "Pin" button). Press: row tints edge-to-edge, with a 0.99 scale. | Rest: rule-separated rows. Pressed: tint plus selection haptic. | Row is a stretched `<a>`. The pin swipe has a visible twin: the row's long-press menu AND a "..." in edit mode. |
| L9 | "5 more chapters, and loose notes ->" | **Disclosure row** "5 more chapters" with a chevron that rotates 90 degrees; rows spring open (height auto, 220ms, `[0.2,0.8,0.2,1]`). | Rest: muted row. Pressed: tint. Focus: ring. | `<button aria-expanded>`. It is an action, so it is a button, not a link. |
| L10 | "+ New recipe" / "+ Log a bake" | **Header glyph-plus-label key**: a 44px-high, filled-ink pill "+ New" (not paprika; red/paprika stays for the one primary on a screen). On the Bakes tab, "Log bake" appears in the same slot. New opens a bottom `Sheet` with three big tiles: Write, Import link, Scan. | Rest: ink pill. Pressed: 0.94 scale, medium impact. Disabled: n/a. | `<button aria-haspopup=dialog>`. |
| L11 | Desktop text-link nav, wordmark | **Segmented nav bar** with a sliding paprika underline thumb (`layoutId="nav-thumb"`, 240ms spring). The wordmark is a 44px button-shaped target. | Rest: ink text on paper. Hover: tint. Pressed: 0.97. Focus: ring. `aria-current="page"`. | `<nav>` of `<a>`. |
| L12 | Breadcrumb | **Back button plus title eyebrow**, same as L1, on desktop. The breadcrumb path is kept visually as non-link eyebrow text plus a `ChevronLeft` back button. Mouse back button and `Alt+Left` work as-is. | As L1. | Back is a button; the trail is plain text inside `nav aria-label="Breadcrumb"` with links only when the parent is not the previous history entry. |
| L13 | Compare two; action text row | **Icon action bar**: Favourite (toggle, heart fills with a 1.0 to 1.25 to 1.0 spring pop), Share, Print, Edit as 40px icon buttons with tooltips, and "..." as a Menu. "Compare two" becomes a **toolbar toggle** on the bakes list: it enters a selection mode in which tapping two bake rows selects them (check badge bounces in) and a bottom bar offers "Compare". | Rest: ink icons. Hover: tint plus tooltip after 400ms. Pressed: press state. Disabled: Compare needs 2+ bakes, otherwise it is hidden. | Icon buttons with `aria-label`; the favourite is `aria-pressed`. |
| G1 | Global `a` paprika underline | Retire it. Plain `a` becomes ink and undecorated; links inside prose keep a 1px underline in ink at 40% (hover 100%). Paprika is for the single primary and for stars. | | |
| G2 | Partly tappable Last-time card / recipe tiles | **Stretched-link pattern** (`::after` inset 0) on every card, tile and row, so the entire visible surface is the target and nested buttons sit above it. | | |
| G3 | No pressed states / transitions / haptics / gestures | Section 3. | | |

## 3. The interaction system

**Pressed feedback.** One `useTap()` hook / `.pressable` class. 0.97 scale on cards and tiles, 0.98 on wide rows and cards over 280px wide, 0.94 on small keys. In: 80ms ease-out. Out: spring (stiffness 500, damping 32). Tint layer `rgba(31,26,23,.06)` (light) / `rgba(241,233,220,.08)` (dark). Never a delay: the visual response starts on `pointerdown`, the action fires on `pointerup`/click, so scrolling does not trigger a press (cancel on more than 8px of movement).

**Screen transitions.** All driven by one `<AnimatePresence>` at the router outlet using `mode="popLayout"`.
- *Push (tile to recipe)*: shared element. The tile's `Photo` has `layoutId={"photo-"+id}`; the recipe hero has the same id. The photo grows from 128x96 to 390x292 over 340ms using `type:"spring", stiffness:260, damping:30`. The title crossfades (Fraunces 16px to 34px) in 200ms. The body slides in from +24px and fades in over 260ms, delayed 80ms. The previous screen scales to 0.96 and dims to 0.85 brightness.
- *Pop*: the reverse. A swipe-back drag is interactive (progress-tied), so the photo can be pulled partway and released either way.
- *Tab switch*: 160ms crossfade, no slide (tabs are peers). The active tab's icon gives a 1.0 to 1.15 to 1.0 spring pop; the underline thumb on desktop slides via `layoutId`.
- *Sheet*: slides up 320ms `cubic-bezier(.2,.8,.2,1)`, scrim fades in 200ms. Dismissal by drag or by Escape returns focus.
- Fallback when the shared photo is missing (no image, or the tile is off-screen): plain 220ms fade and 24px rise. Never block navigation on an animation: if a route resolves while an exit is in flight, jump to the end state.

**Draggable sheets.** The existing `Sheet` gains `placement="bottom"` + `detents={[0.5, 0.92]}`. A 36x5px grabber (the visible handle) plus a 44px-high drag zone. Release logic: project the position with `velocity * 0.2s`, snap to the nearest detent, or dismiss below 25%. Content scrolls only when at the top detent, which avoids scroll-vs-drag fights. Every sheet keeps a visible "Done" button (48px) in its header: the twin of drag-to-dismiss.

**Swipe actions on rows.** Bake rows: swipe left reveals Delete (the `--spoiled` rule, soft-delete tombstone, 6s Undo toast). Swipe right reveals Edit. Cookbook chapter rows: swipe right reveals Pin. Resistance 0.6 beyond the reveal width; a "full swipe" commits only for non-destructive actions. Visible twin: long-press menu AND the row's "..." button in the edit state.

**Long-press context menu.** 380ms hold, the pressed element lifts to scale 1.03 with a soft shadow, a `Menu` opens anchored to it (Favourite, Add to shopping list, Share, Edit, Delete). Haptic: medium impact at open. The twin on desktop is right-click, and on all platforms the recipe page's "..." menu. The long-press never holds the only copy of an action.

**Haptics (Capacitor Haptics, no-op on web, behind the existing Settings toggle).** `selectionChanged`: segmented control, letter-rail tick, pager snap, tab switch. `impact(Light)`: tile/row press commit, favourite on, ingredient check-off. `impact(Medium)`: long-press open, "Start cooking", sheet detent snap. `notification(Success)`: bake logged, shopping list added, timer done. `notification(Warning)`: destructive swipe past the commit line. Nothing fires on scroll, and nothing fires twice within 40ms.

**Pull-to-refresh: only on Discover**, the one tab whose content lives on a server. The cookbook, bakes and shop are local; refreshing them would be a lie, so they don't have it. It shows a paprika arc that fills as you pull; a threshold of 72px triggers it; haptic `Light`. The visible twin is a "Refresh" icon button in the Discover header. When offline it says so in-panel.

**Baking mode (dark).** The whole-screen horizontal pager: swipe left/right through steps (or tap the existing 64px Back / Next, which stay the primary route). Swipe is disabled while the timer chip is held, and the swipe zone excludes the bottom 96px footer so a floury thumb on Next never becomes a drag. Step change: 220ms slide, selection haptic. The 64px timer chip stays a plain tap that opens the timer `Sheet`.

**Loading and empty states.** Skeleton shapes keep the shared-element geometry (a 4:3 grey photo block), so the transition never jumps. Empty Last-time card: "Bake it once and this fills with your notes", with a 52px "Log a bake" button. Offline: nothing blocks, cached photos animate as normal.

**Reduced motion.** `useReducedMotion()` from framer-motion gates every JS-driven transition: shared-element becomes a 120ms crossfade, springs become instant, the pager snaps without a tween, tiles lose scale and keep their tint. Haptics are unaffected (they are not motion) but still obey the Settings toggle.

## 4. Phone vs desktop

The phone gets the full gesture set. The desktop gets the same physical language minus the fingers.
- Hover is the pressed state's cousin: tile photo lifts 2px with a 6% tint (150ms), cursor `pointer` on cards. No scale on hover; grids that shift under the cursor are the failure Proof's own docs call out.
- The shared-element photo transition works with the mouse identically (360ms).
- The recipe two-page spread is unchanged. The photo, title and actions live on the left page, and the Last-time pager sits on the right page, with arrow buttons visible and Left/Right keys paging it when focused.
- Keyboard: `Alt+Left` or `Backspace` (outside inputs) is back; `J/K` moves through list rows; `Enter` opens; `Space` on a row toggles select in Compare mode; `Shift+F10` or the menu key opens the row's context menu (the keyboard twin of long-press); `/` focuses search; `G` then `C/B/S/D` jumps between destinations.
- Trackpad two-finger horizontal swipe pages the Last-time carousel and goes back in history; edge-swipe back is disabled on pointer-fine devices to avoid fighting browser back.
- Swipe rows become hover-revealed icon buttons (Edit, Delete) on the row's right edge. Sheets become centred 560px dialogs (no detents) with Escape.
- The top bar's sliding thumb is the desktop counterpart of the tab pop.

## 5. Wireframes

Phone recipe, header to ingredients:

```
+--------------------------------------+
| (<)                  (heart)(share)(...)|  44px keys; (<) = Back to Dessert
|  [=============== PHOTO ============] |
|  [  layoutId photo-<id>, 292px      ] |
|  [  grabs from the tile on push     ] |
|  [==================================] |
|  DESSERT  (italic eyebrow, not link) |
|  The Best Cheesecake Recipe          |
|  The creamiest cheesecake, no bath.  |
|  Serves 12 - Prep 20 - Bake 1h15     |
|  [ sugarspunrun.com  ^ ] [ Private  ]|  source chip / publish chip, 44px
|                                      |
|  +--------------------------------+  |
|  | Last time - Oct 17      ****-  |  |  whole card = tap to open the bake
|  | "Pulled it at 55 min, centre   |  |   swipe left/right = next bake
|  |  still wobbly. No cracks."     |  |
|  | NEXT TIME - 10 min longer      |  |
|  | [<]    o o o o o    1 of 5 [>] |  |  visible twin of the swipe
|  +--------------------------------+  |
|  [ Start cooking        ][ Log bake ]|  52px, one paprika primary
|                                      |
|  INGREDIENTS            [ Add 9 missing ]  outlined, basket glyph
|  [ ] 2 cups cream cheese             |  whole row toggles; haptic Light
|  [x] 1 cup sugar                     |
+--------------------------------------+
```

Cookbook home:

```
+--------------------------------------+
| Cookbook             [+ New] (avatar)|
| ( search 203 recipes, ingredients ) |
|                                      |
| Pick up where you left off           |
| +[112px photo]--+ The Best Cheesecake|  whole block = one target,
| |  layoutId     | Baked Oct 17 ****  |  press 0.98, photo shared-element
| +---------------+ Next time - 10 min |
|                                      |
| Recently baked                    >  |  whole header row is the target
| [128px][128px][128px][ All bakes > ]|  strip ends in a tile, not a link
|                                      |
| Contents                      [ A-Z ]|  opens detent sheet + letter rail
| Bread ....................... 31   > |  56px rows, swipe right = Pin
| Cookies ..................... 22   > |  long-press = menu
| Dessert ..................... 40   > |
| [ 5 more chapters           v ]      |  button, aria-expanded
|------------------------------------- |
|  Cookbook | Bakes |  Shop | Discover |  tabs: pop + selection haptic
+--------------------------------------+
```

## 6. Build cost and risk

New or extended primitives in `src/components/ui`:

| Primitive | Effort | Notes |
|---|---|---|
| `Pressable` (and `useTap`) | S, 0.5 day | Wraps the stretched-link pattern, the scale/tint, cancel-on-move, and haptics. Everything else builds on it. |
| `SharedPhoto` (extends `Photo`) | M, 2 days | `layoutId` plus the fallback path; needs a `LayoutGroup` at the router outlet and skeleton geometry matching. |
| `RouteTransition` (outlet wrapper) | M, 2-3 days | AnimatePresence + React Router 7 `useOutlet` freezing; the riskiest. |
| `SwipeBack` | M, 2 days | Edge-zone drag, interactive pop, the Android hardware back interplay. |
| `SwipeRow` | M, 1.5 days | Reveal actions, resistance, undo toast, keyboard twin. |
| `Pager` (bake carousel, baking steps) | M, 1.5 days | Scroll-snap based, not JS drag (cheaper, accessible, offline-safe), with dots and buttons. |
| `Sheet` detents + drag | M, 2 days | Extends the existing `Sheet`; focus trap and scroll lock stay. |
| `useHaptics` | S, 0.5 day | One module mapping interaction types to Capacitor calls and the Settings toggle. |
| `PullToRefresh` | S, 1 day | Discover only. |
| Tests and `/lab` entries | M, 2 days | Required by the repo rules. Unit tests with fake gesture events; a Playwright pass for the shared element. |

Total: about 3 weeks for one developer. It ships in slices: Pressable + haptics first (a day or two and already a visible app-feel jump), then tiles/rows as stretched links, then shared-element, then the gestures.

What could go wrong:
1. **Shared-element on a long list.** `layoutId` across a virtualised cookbook of 203 tiles can mis-measure. Mitigation: only the tapped tile's photo gets the id for the transition's duration, and the fallback is a fade.
2. **Gesture conflicts**: horizontal Last-time pager inside a vertical scroller inside edge-swipe-back inside a tab pager. Rule: the edge zone is 24px and wins; the pager claims the horizontal axis only after a 10px lock; no tab swiping at all.
3. **Android hardware back** must stay in step with the interactive swipe. One `navigate(-1)` path, tested on the APK.
4. **Performance** on low-end Android: animate transform and opacity only, `will-change` only during a drag, cap springs to the one photo and one page.
5. **Hidden-gesture discoverability.** Answered by design: every gesture has its twin visible on screen, so nothing is lost if nobody ever discovers a swipe.
6. **Accessibility drift.** Stretched links need exactly one link per card; nested controls must sit above the `::after`. A lint-style test in `designSystem.test.ts` can assert it.

## 7. Why the others are wrong

**A, Platform Native.** Faithful iOS plus Material conventions sounds safe, and it is the one that makes the app look like every other app. But Proof ships to PWA, Android, and desktop, and "native" means two different things. A nav bar with a text "< Dessert" and chevron list rows is the *same web-link pattern in a nicer font*: the owner's complaint, solved by relabelling. Chevron rows are a polite way to keep the link. Failure mode for this user: a cookbook that looks like Settings. It has no motion identity, and the mock-up's printed-paper warmth gets flattened into grey table views.

**C, Action-first.** Contextual action bars and inline expansion are good for power users and bad for a phone on a counter. Inline expansion turns every list into an accordion where the page height changes under a floury thumb, and the cookbook's value (browsing photographs) is demoted into toolbar chrome. A command palette serves a 1280px keyboard user, who is the minority of this product's time. Action bars also put more buttons on the screen, the opposite of "fewer links". Expanding in place also breaks the shared-element continuity that tells you where you are, and makes deep links ambiguous (which row is open at `/r/:slug`?).

**D, Cookbook Objects.** Ribbon bookmarks, index tabs and stamps are charming and the cookbook theme is already carried by Fraunces and paper. But skeuomorphic metaphors are decoration that still needs a gesture model underneath. A ribbon you drag is a swipe with a costume. They cost bespoke art, they collide with the brief's ban on decorative colour, they age badly, and they fail the one-handed test when the "tab" is a 20px sliver. Take their idea of paper, take none of their widgets: the page-turn is the pager, and the physical feeling comes from spring and haptics, not illustration.

**The pitch.** The owner did not ask for prettier links; they asked for the app to stop feeling like a website. A website cannot do a photo that flies from the shelf into the page, a card you flick through like prints, a row you press that visibly gives. B does those, keeps every URL real, and never hides an action behind a gesture without a button twin on screen.
