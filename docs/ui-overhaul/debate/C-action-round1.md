# C — Action-first: stay where you are, bring the verb to the thumb

## 1. Thesis

A website is a pile of places joined by links; you travel to do anything. An app is a small number of places where things get done. The test of "feels like an app" is how many times a task makes you leave the screen you are on. Reading the Last-time card, adding what is missing to the shop list, starting a timer, logging a bake: none of these is a destination. They are verbs. So the rule is: **a verb is a button, a noun is a row, and a row that holds more detail opens in place.** Real navigation survives only where the content really is a different thing (a chapter, a recipe, a bake). Everything else becomes (a) a disclosure that animates open, (b) a button that acts and offers Undo, or (c) a chip/segment that changes a view without changing the page. Each screen gets one **action bar** with at most three verbs, in the thumb zone. On desktop the same verbs get shortcuts and a ⌘K palette that reaches any recipe, chapter or action. Feedback is optimistic and instant: the UI moves first, the toast says what happened, and Undo is always one tap. This suits a floury-handed baker on a propped-up phone: one large target, no travelling, no hidden gesture, no dead-end screen to back out of.

## 2. Replacement table

Shared states unless noted: **rest** as described; **pressed** = scale .97 + surface darkens one step (`--paper-2`), 80 ms in, 140 ms out; **focus** = 2px paprika ring, 2px offset, never removed; **disabled** = 45% ink, no ring, `aria-disabled` (not `disabled`, so it stays focusable and explains itself in a tooltip/toast). Min target 44px.

| # | Replacement | Look and behaviour | Semantics |
|---|---|---|---|
| L1 "‹ Dessert" | **No back link on the recipe; a `ChapterChip` plus the native back.** The header becomes a 44px row: a square icon button (chevron-left, 44x44) that calls `navigate(-1)` when there is in-app history and otherwise `navigate('/cookbook/dessert')`, then the title region. Beside the title sits a pill chip "Dessert" (Inter Tight 13/600, paper-2 fill, 32px tall inside a 44px hit area) that opens a **ChapterPeek**, a bottom Sheet of the other recipes in the chapter with a prev/next pair. | Back = `<button aria-label="Back to Dessert">`; real URL still changes via the router, so Android hardware back, refresh and `/r/:slug` all work. Chip = `<button aria-haspopup="dialog">`. |
| L2 "Adapted from sugarspunrun.com" | **SourceChip** under the subtitle: small outlined chip "Source · sugarspunrun.com ↗" (external-arrow glyph is the one place an arrow survives, because leaving the app is a real event). Tap opens a **Sheet**: "Open sugarspunrun.com in your browser?" with **Open** (primary) / **Copy link** / Cancel. | `<button>` that ends in `window.open(url,'_blank','noopener')` via Capacitor Browser on Android. Sheet makes the leave-the-app moment deliberate and keeps flour-thumb mistaps harmless. |
| L3 "All 5 bakes →" | **In-place expand.** The Last-time card becomes a disclosure: a full-width 44px footer button "5 bakes ▾" with a **StarStrip** sparkline of the five ratings. Tap expands the card to a compact list of all five bakes (date, stars, first line of note), 260 ms height spring-free ease-out; each row expands again to the full note. A final "Open bake journal" **secondary button** is the only navigation (goes to Bakes filtered to this recipe). | `<button aria-expanded aria-controls>`; list is a region. Chevron rotates 180 degrees in 180 ms. The card stays one component, so there is no "page" to come back from. |
| L4 "Private — only on this phone. Publish to get a link" | **PublishState chip** in the recipe's action bar overflow *and* a quiet **status row** at the foot: lock glyph + "Only on this phone" + a 44px outlined button "Publish". Pressing it opens the existing publish **Sheet** (no navigation). After publishing, the row mutates to "Public" + **Copy link** button, with a "Link copied · Undo publish" toast. | `<button>` for Publish; status text is `role="status"` so the change is announced. |
| L5 "+ Add 9 missing to the shopping list" | **Real full-width tonal button** "Add 9 missing to Shop" (44px, paper-2 fill, ink text, plus icon). Runs optimistically: the button collapses to "Added 9 ✓" (check draws in 160 ms), each missing ingredient row gets a small "On list" tag, and a toast "Added 9 to Shop · **Undo**" stays 6 s. If the list is already complete it reads "On your list" and is `aria-disabled`. | `<button>`; toast is `role="status" aria-live="polite"`; Undo is a button inside the toast, focus-reachable, and the toast pauses its timer on hover/focus. Light haptic on add, none on undo. |
| L6 "All bakes →" | **Segmented switch plus count chip.** "Recently baked" header gets a trailing **"See all 14"** *button chip* that does not navigate: it expands the horizontal strip into a 2-column grid in place (strip of 3 becomes grid of up to 6, then "Open Bakes" button). Tapping the section title or the **Bakes** tab in the bar is the real jump. | Chip is `<button aria-expanded>`. The tab bar remains the sole way to go to Bakes, so there is exactly one route to each destination and no duplicate arrows. |
| L7 "Index A–Z →" | **View chips** in the Contents header: `Chapters | A–Z` as a two-segment control (`role="tablist"`-style radio group, 36px segments inside a 44px row). A–Z swaps the Contents list for an alphabetical list with a sticky letter rail, in place. URL gets `?view=az` so it is shareable and refresh-safe. | `role="radiogroup"` of two `role="radio"` buttons; selection announced. |
| L8 Contents rows | **Accordion rows.** Each chapter row is a 56px button: name, count, chevron. Tap expands the row inline to show its first 4 recipes as thumbnails plus a trailing **"Open Dessert (44)"** button. Double-purpose is avoided: the whole row toggles; the explicit button navigates. Only one open at a time. | `<button aria-expanded>` in a list; navigating button is a real `<Link>` styled as button. Honest naming: it opens a chapter, so a screen reader hears a link. |
| L9 "5 more chapters, and loose notes →" | **"Show 5 more" disclosure row** that expands the list in place (staggered 24 ms per row, capped at 8 rows), then flips to "Show fewer". Loose notes becomes a normal row at the bottom. | `<button aria-expanded>`. |
| L10 "+ New recipe", "+ Log a bake" | **Contextual action bar** (see section 3). On Cookbook: a **sticky bottom action bar** above the tab bar with one primary "New recipe" (paprika-filled, 48px) and a secondary icon button for Search/⌘K. On Bakes: primary "Log a bake". No FAB, honouring the brief: it is a full-width bar docked to the content, not a floating circle. | `<button>`. Opens the editor/log **Sheet** (bottom, full height on phone) so the page behind keeps its scroll position. |
| L11 Desktop top-bar nav | **Segmented nav pill group**: four 40px-tall tabs with icon + label, filled paper-2 pill on the active one, `aria-current="page"`. The wordmark "Proof" is a button-styled link with no underline that goes to Cookbook (and scrolls to top if already there). Trailing: a **⌘K field** ("Search or jump to…  ⌘K") and the avatar menu. | Nav uses `<nav>` with `<a>` elements (they navigate); styled as tabs. Underlines are gone everywhere. |
| L12 Breadcrumb | **Replaced by the ⌘K palette plus a ChapterChip** (same as L1) beside the title, with `[` and `]` for previous/next recipe in chapter. No breadcrumb row. A small "Dessert" chip remains visible for orientation. | Chip is a `<button>` opening the same ChapterPeek popover (anchored popover on desktop, Sheet on phone). |
| L13 "Compare two" + text action row | **Action bar + overflow Menu.** Primary verbs as real buttons: **Start cooking** (filled paprika), **Log a bake** (outlined), **Share** (icon+label); Favourite is a toggle icon button (`aria-pressed`); Print/Edit/Delete live in the existing `Menu` under "More". **Compare** is a mode toggle on the bakes list: switch "Compare" on, tick two bakes (check circles appear in place), a bar slides up "Compare 2 bakes" and opens a side-by-side Sheet. | Toggles are `aria-pressed`; Menu keeps its existing roles. |
| G `a{color:paprika}` + underlines | Links are ink, no underline, unless inside prose where they get a 1px underline in ink at 40% (WCAG still satisfied by non-colour cue). Paprika means "primary action" only. A lint test, like `designSystem.test.ts`, fails on `<a>` without a role/semantics class. | |
| G partly tappable cards and tiles | **Whole-surface tap** via a stretched-target pattern (`::after` inset-0 on the primary control) so the Last-time card, recipe tiles and rows are 100% hit area, while inner buttons stay independent. | One interactive control per card; no nested interactives announced twice. |
| G no pressed states / transitions / haptics | See section 3. | |

## 3. The interaction system

**Action bar.** One primitive, `ActionBar`, holds 1–3 verbs. Phone: docked above the tab bar, 56px tall plus safe-area, paper background with a 1px top hairline (no shadow, no blur; a hairline is enough). Verbs: filled primary (paprika, 48px), outlined secondary, and at most one icon button. On the recipe: **Start cooking · Log a bake · Share**. On Cookbook: **New recipe**. Bakes: **Log a bake**. Shop: **Add item**. Discover: none (browse only). The bar hides on scroll-down at 300 ms only if the user is reading the Method (more screen for steps), and it returns on scroll-up or any tap near the bottom edge, so a verb is never lost.

**Quick action + Undo.** `useUndoableAction(do, undo, label)` runs `do()` against IndexedDB immediately, shows a `Toast` ("Added 9 · Undo"), and keeps the inverse in memory for 6 s (pauses while hovered/focused or while a screen reader is reading it). The soft-delete tombstones in the data model make Undo cheap and correct: undo clears `deletedAt` or deletes the created row. This applies to add-to-list, favourite, delete bake, delete recipe, remove from list, publish/unpublish. No `confirm()` anywhere: confirmation is replaced by Undo, except Delete on a published recipe, which uses a Sheet.

**Pressed feedback.** All buttons, rows and cards: `transform: scale(.97)` plus `--paper-2` darkening, `transition: transform 80ms cubic-bezier(.2,.8,.2,1)` in, `140ms` out. Rows (list items) don't scale, they tint only, so long lists don't shimmer. Pure CSS, so `prefers-reduced-motion` collapses it. Tap highlight colour transparent.

**Transitions.** Four kinds, all CSS or framer-motion with a `useReducedMotion()` guard:
- *Tab switch*: cross-fade 120 ms, no slide (tabs are peers, not a stack); scroll position kept per tab.
- *Push* (list to recipe): incoming screen translates 24px from the right with 200 ms `cubic-bezier(.22,1,.36,1)`; outgoing dims 6%. *Pop* is the mirror in 170 ms. Browser/Android back runs a pop.
- *Disclosure*: height 220–260 ms `cubic-bezier(.22,1,.36,1)`, content fades in 100 ms behind it; chevron 180 ms.
- *Sheet*: rises 280 ms `cubic-bezier(.32,.72,0,1)`, scrim fades 200 ms; exit 200 ms. Reduced motion: opacity only, 80 ms.

The principle is that most interactions are disclosures, not pushes, so the push animation has to be good but is rare.

**Haptics (`@capacitor/haptics`, no-ops on web).** `impact(Light)` on toggle, chip select, and add-to-list; `impact(Medium)` on Start cooking and on Log-a-bake save; `notification(Success)` when a bake is saved or a timer completes; `notification(Warning)` on destructive actions that have Undo; nothing on plain navigation or scrolling. All behind a single `haptic(kind)` helper that also reads a Settings toggle.

**Gestures: only as accelerators, never the only path.** Swipe from the left edge = back (visible alternative: the 44px back button). Pull down on a Sheet to dismiss (alternative: Close button and Escape). Swipe a shop row left to delete (alternative: row's overflow Menu and long-press-free checkbox). Nothing depends on long-press. Everything a gesture does is already a button.

**Loading and empty states.** Skeletons only, shaped like the final content (card height reserved, so nothing jumps). Because data is local, most screens render from IndexedDB in one frame, so skeletons are for photos and for Discover. Empty states are an illustration-free sentence plus the one verb that fixes them ("No bakes yet. **Log your first bake**"), reusing the action bar's primary.

**Optimistic by default.** Every write lands in IndexedDB before the UI settles; failure (rare, quota) reverts the UI and toasts "Couldn't save · Try again" with a Retry button. Server-bound actions (publish, sync) show a pending state on the control itself, then the result; they never block navigation.

## 4. Phone vs desktop

Same verbs, different reach. The mobile action bar becomes a **sticky header toolbar** on desktop, right-aligned beside the title: Start cooking · Log a bake · Share + Favourite toggle + More. Disclosures stay disclosures. Sheets become anchored popovers or centred dialogs per `Sheet placement`.

- **⌘K / Ctrl+K command palette** (a `Sheet` with `placement="center"`, combobox semantics): searches recipes, chapters, bakes, and actions ("Log a bake for Cheesecake", "Add missing to Shop", "Switch to dark", "Go to Shop"). Fuzzy-matched against an in-memory index built from IndexedDB, so it works offline. Recent items first; ↑/↓, Enter, Esc. Tab-opens-actions: Tab on a recipe result reveals that recipe's verbs.
- **Shortcuts** (shown in a `?` cheat-sheet Sheet and in tooltips): `g c / g b / g s / g d` jump to destinations, `n` new recipe, `l` log a bake, `s` start cooking, `/` focus search, `[` `]` previous/next recipe in chapter, `f` favourite, `e` edit, `Shift+A` add missing to list. Shortcuts are suppressed inside inputs and when a Sheet is open.
- **Two-page spread**: left page reads, right page acts; the Last-time card and bake list expand in place on the right page, so the spread never reflows into a new route.
- **Hover** adds affordance only (tint, tooltip with shortcut); nothing is hover-only.

## 5. Wireframes

Phone recipe, header to ingredients (375px):

```
┌───────────────────────────────────┐
│ [<]  Dessert ▾               [♡][⋯]│  44px header: back, chapter chip, fav toggle, More
├───────────────────────────────────┤
│  The Best Cheesecake Recipe       │  Fraunces 28
│  Creamiest cheesecake, no water   │
│  bath required.                   │
│  Serves 12 · Prep 20 · Bake 1h15  │
│  [ Source · sugarspunrun.com ↗ ]  │  SourceChip -> Sheet
│ ┌───────────────────────────────┐ │
│ │ Last time · Oct 17   ★★★★☆    │ │  whole card = one tap target
│ │ "Pulled it at 55 minutes with │ │
│ │ the centre still wobbly..."   │ │
│ │ Next: 10 min longer in oven   │ │
│ │ ───────────────────────────── │ │
│ │ ▁▃▅▆▇  5 bakes            [v] │ │  disclosure, expands in place
│ └───────────────────────────────┘ │
│ Ingredients     [-] Serves 12 [+] │
│  1 cup  graham cracker   170 g    │
│  2 tbsp sugar                     │
│  ...                              │
│ [ + Add 9 missing to Shop        ]│  tonal button -> "Added 9 ✓" + Undo toast
├───────────────────────────────────┤
│ [ Start cooking ][Log a bake][⤴]  │  ActionBar, docked
│ Cookbook  Bakes  Shop  Discover   │
└───────────────────────────────────┘
```

Cookbook home:

```
┌───────────────────────────────────┐
│ Cookbook                    (avatar)│
│ [ Search the cookbook        ⌘K ] │
│ Pick up where you left off        │
│ ┌ photo  Best Cheesecake     ──┐  │  whole card taps -> recipe
│ │ Baked Oct 17 · ★★★★ · 5 bakes │  │
│ └───────────────────────────────┘ │
│ Recently baked      [ See all 14 ]│  chip, expands strip -> grid in place
│ [img][img][img]                   │
│ Contents          (Chapters|A–Z)  │  segmented view switch
│ Dessert ................. 44  [v]│  accordion rows
│   [t][t][t][t]  [Open Dessert 44] │
│ Side ..................... 31  [>]│
│ Vegetarian ............... 27  [>]│
│ [ Show 5 more chapters           ]│  disclosure
├───────────────────────────────────┤
│ [        + New recipe            ]│  ActionBar
│ Cookbook  Bakes  Shop  Discover   │
└───────────────────────────────────┘
```

## 6. Build cost and risk

New primitives in `src/components/ui` (existing ones reused: `Sheet`, `Menu`, `Button`, `Tag`, `Skeleton`, `PublishState`, `Panel`):
- `Disclosure` (animated height, `aria-expanded`, reduced-motion aware): ~1 day; used by L3, L8, L9, L6.
- `ActionBar` (+ scroll-hide behaviour, safe-area): ~1 day.
- `Toast` + `useUndoableAction` + queue: ~2 days; the biggest piece, and needs repository inverse operations (mostly already there thanks to tombstones).
- `Chip` / `Segmented` (radiogroup): ~1 day.
- `CommandPalette` + search index + shortcut registry (`useHotkeys`): ~3 days.
- `ChapterPeek`, `SourceSheet`, compare-mode bar: ~2 days.
- `haptic()` helper, pressed-state tokens, stretched-target utility, link-style lint test: ~1 day.
- Page transitions with router (push/pop direction): ~1.5 days.
- Lab gallery entries and tests for each: ~2 days.

Total roughly 14 to 16 working days. Mostly composition of what exists; no new dependency (framer-motion is already installed; `Sheet` already has the focus trap).

What could go wrong:
1. **Accordion fatigue and long pages.** Expanding in place can bury content. Mitigation: one-open-at-a-time, caps (4 recipes per chapter), explicit "Open" buttons so the real screen is always reachable.
2. **Docked bar eats vertical space** on 375x667 phones. Mitigation: scroll-hide, 56px cap, only on screens with a real primary verb.
3. **Undo toast vs screen readers and keyboards.** Needs `aria-live`, timer pause on focus, and a keyboard route to Undo; also a test that the toast never traps focus.
4. **Deep links.** View state (A–Z, expanded chapter, compare mode) must live in the URL (`?view=az`) or be harmlessly lost on refresh; tested against `/r/:slug` and hardware back.
5. **Shortcut collisions** with browser/OS keys and typing; handled by input suppression and a visible cheat-sheet.
6. **Palette index staleness** on large libraries (203 recipes is trivial; 10k is not): incremental index via Dexie hooks.

## 7. Why the others are wrong

**A, Platform Native.** Chevron list rows and nav bars are the grammar of *browsing*, and that is exactly the problem: "row, chevron, push a screen" is a link wearing a different coat. Replace "All 5 bakes →" with a "Bakes ›" disclosure chevron that still pushes a page, and the owner's complaint (too many links) is unchanged; the arrow just moved. It also forces two idioms (iOS and Material) onto a PWA, a Capacitor Android APK and a desktop web app from one codebase, so "faithful" means faithful to neither, and a 1280px pointer user gets a stretched phone. Native conventions give no answer for the thing this product actually does: act on a recipe in place.

**B, Tactile and Gestural.** Swipes, long-press and shared-element transitions are delightful for an expert and invisible to everyone else. Proof's user has flour on their hands and a screen that dims; precise drags and long-presses fail exactly there, and the brief itself bans hiding behind a gesture with no visible alternative. So B must build every visible alternative anyway, which is my button set, then add gesture and shared-element machinery on top (framer layout transitions across routes are the single most fragile thing in a React Router SPA, and break on refresh and hardware back). B also leaves the desktop keyboard user with nothing. I keep gestures only as accelerators on top of buttons.

**D, Cookbook Objects.** Ribbon bookmarks, index tabs and stamps are skins, not interaction. A ribbon that opens a page is still a link; an index tab is a link drawn in card stock. It risks making the page more decorative, and the project's own rules ("colour is never spent on decoration", "draw only what the data can support") argue against pictorial skeuomorphism, as does the previous Step Row and Black and Gold reworks that were deliberately stripped back. Metaphor also costs accessibility: each object needs a hidden accessible equivalent. D answers "what does it look like" while the owner asked "what does it do". It can be applied after, as styling on my buttons and chips (a stamp-style "Added ✓"), and costs nothing to combine; the reverse is not true.

**The bottom line.** The cheapest, most accessible, most testable way to stop a website feeling like a website is to stop sending people to pages. Buttons that act, disclosures that open in place, Undo instead of confirmation, one docked action bar per screen, and a command palette for the keyboard. Every one of those is a plain `<button>`, which is why it is also the easiest to make right on a screen reader.
