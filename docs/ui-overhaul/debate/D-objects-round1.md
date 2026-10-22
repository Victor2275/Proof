# D. Cookbook Objects: an owned vocabulary, not borrowed chrome

## 1. Thesis

An app feels polished when every control belongs to one world, answers a touch the same way each time, and moves on a single clock. A back chevron and a blue-ish list row are not "app" in themselves. They are the idiom of iOS and Material, and a printed-cookbook identity wrapped in them is "any app" again. Proof has chosen paper, ink and paprika. The honest way to remove links is to give each navigation job a small physical object from a cookbook and kitchen. Where you left off is a **ribbon**. Chapters and the A-Z index are **index tabs**. A recipe is a **card** that sinks under the thumb. A bake outcome is a **stamp**, and the "next time" note is a **pencilled margin note**. The missing-ingredients list is a **tear-off slip**. Screens move like **pages**.

The objects are skeuomorphic-lite. They are flat shapes in the existing palette with one shadow token and one motion clock. There are no leather textures, paper-curl shaders or drop-shadow stacks. Each object is a real `<a>` or `<button>`. The shape is a *redundant cue* on top of correct semantics, never a substitute for them. That is also what kills "link-ness": text stops being the affordance. A shape, an edge and a depression are.

## 2. Replacement table

Shared tokens. Rest shadow `0 1px 0 ink/8%`. Pressed state is `translateY(1px) scale(.985)` with the shadow collapsed. Focus is a 2px paprika ring with a 2px paper offset, always visible on keyboard focus (`:focus-visible`). Disabled is 45% opacity, no shadow, `aria-disabled`.

| # | Replacement | Look and behaviour | Semantics |
|---|---|---|---|
| L1 "‹ Dessert" | **Chapter tab (back)** | A 44px-high tab that hangs from the top-left page edge, rounded on the bottom corners only. It is cream `#F4ECDD` with the chapter name in Inter Tight 14/600 and a 6px paprika notch on its leading edge instead of a chevron. Pressed: the tab drops 2px, as if tucked in. Tapping runs the pop transition (page slides right 24px and fades, 220ms). Android hardware back and the browser back do the same pop. | `<a href="/cookbook/dessert">`, label "Back to Dessert". It is a link, because it navigates. |
| L2 "Adapted from sugarspunrun.com" | **Citation line with a source stamp** | Plain, non-underlined text "Adapted from sugarspunrun.com" followed by a 24x24 outlined "arrow out of box" glyph inside a 44px hit area. No paprika text. Pressed: the glyph box fills with cream. | `<a target=_blank rel="noopener noreferrer">`, with `aria-label="Open sugarspunrun.com, opens in browser"`. An external link stays a link and must say so. |
| L3 "All 5 bakes →" | **The Last-time card is itself the control**, with a **margin note** inside it | The whole card (full width, 4px radius) is one 100px-or-taller target. Inside, "Next time" is set as a pencilled note: Source Serif italic, a hand-drawn underline in an SVG 1px stroke, and a bracket in the margin. The footer reads "5 bakes" with a **page-corner fold** glyph (12px triangle) bottom-right. Pressed: the card lifts to the "held" state (see §3) and is then tucked back on release. | One `<a href="/r/slug/bakes">` wrapping the card, with `aria-label="Last time, Oct 17, 4 of 5 stars. Open all 5 bakes"`. The margin note is plain text inside. No nested interactive elements. |
| L4 "Private... Publish to get a link" | **Visibility seal** | A small round wax-free "seal" badge (28px circle, outlined) reading a lock glyph and "Private". Tapping opens the `Sheet` for publishing. The seal fills paprika-tint 120ms after publishing (the state change is the object changing). | `<button aria-haspopup="dialog">Private. Only on this phone. Publish...</button>`. Opens a Sheet, so it is a button. |
| L5 "+ Add 9 missing to shopping list" | **Tear-off slip** | A full-width card with a perforated top edge (dashed 1px rule plus 6px scallops via a CSS `mask`) listing the first three missing items in small type and "+6 more". A paprika-bordered `Button` "Add 9 to Shop" sits inside it. On press the slip translates up 14px and fades over 240ms into the Shop tab badge, which ticks to "+9". An inline "Undo" `Button` stays for 6s, which is a status, not a toast overlay. | A `<button>`. Result is announced by an `aria-live="polite"` region: "9 items added to Shop." |
| L6 "All bakes →" | **Section heading is a ribbon pull** | "Recently baked" becomes a heading with a 14x28 ribbon tab at its trailing edge. The whole heading row is the 48px target. Pressed: ribbon extends 4px. | `<h2><a href="/bakes">Recently baked<span class="sr-only">, all bakes</span></a></h2>`. |
| L7 "Index A-Z →" | **Side index tab** | A vertical tab on the right page edge, 28px wide x 96px tall, with "A-Z" set rotated 90 degrees. It is sticky to the viewport edge on the Cookbook screen and sits above the tab bar. On the index screen the tab becomes an alphabet strip (letters 44px apart in vertical rhythm, one-handed on the thumb edge), the A-Z "thumb index" of a real cookbook. | `<a href="/cookbook/index">` with a text label "Index A to Z". The alphabet strip is `<nav aria-label="Jump to letter">` of anchor links. |
| L8 Contents rows | **Chapter tabs list** | Each row is a 52px strip with a coloured notch (a 4px-wide spine mark in a neutral warm tone, *not* decorative colour, only differing in height by chapter number so the shape varies), the chapter name, a dot leader, and the count in tabular figures. Pressed: row fills cream; a 6px indent slides in (80ms). Whole row is the target, not just the name. | `<ul>` of `<li><a href>` rows. One link per row, full width. |
| L9 "5 more chapters, and loose notes →" | **Fold-out tab** | A final row of the list that reads "Show 5 more" and *expands in place* (height 280ms, `ease-out-quart`). Loose notes becomes its own tab in the list. It is a disclosure, not navigation. | `<button aria-expanded aria-controls>`. |
| L10 "+ New recipe", "+ Log a bake" | **Blank-card tile and a ribbon-marked "Log a bake"** | "+ New recipe" becomes a dashed-outline blank recipe card at the head of the Cookbook grid, and in the header a 44px square paprika-outline icon button (a pencil on card). "Log a bake" is a 44px outlined `Button` with a small stamp glyph. Only one solid paprika control per screen (the decided "no FAB" is respected). | `<button>` that opens a `Sheet` for the quick form, or a link for a full-page create route. A control that opens a Sheet is a `button`. |
| L11 Desktop top bar | **Index-tab bar** | The four destinations are tabs along the top edge: 40px tall, inactive tabs recessed 4px below the active tab, which is paper-coloured and joined to the page below with no bottom border. The "Proof" wordmark is a 40px logo button, no underline. Pressed: tab sinks 1px. | `<nav aria-label="Primary"><a aria-current="page">`. Real links, as destinations are. |
| L12 Breadcrumb | **Chapter tab** (same object as L1) | On desktop the L1 tab sits above the left page: "Dessert" in a tab, with the recipe title beneath it, since the second level of a breadcrumb adds nothing. | Same `<a>`. A visually hidden `<nav aria-label="Breadcrumb"><ol>` is retained for screen readers. |
| L13 "Compare two", action row | **Pencil-case action strip** | Favourite and Share are 44px icon buttons. Print, Edit and More collapse into a `Menu`. "Compare two" becomes a toggle chip, "Compare", that turns each bake row into a selectable card (check corner). | `<button aria-pressed>` for Favourite and Compare; `Menu` for the rest. |
| Global `a {color: paprika; underline}` | **Retired** | Body links in prose keep a 1px underline in *ink* at 40% (the one place a "link" is honest, as in a printed footnote). Paprika is for the current/next state only. | |
| Last-time card, tiles partly tappable | **Whole-card targets** | Every `RecipeTile` and card is a single anchor with the stretched-link pattern (`::after` inset 0). Photo, title and meta all share one pressed state. | One link per card. |
| No pressed states or transitions | **See §3** | | |

### The ribbon (where you left off)
The Cookbook header's "Pick up where you left off" becomes the **ribbon bookmark**: a 14px-wide paprika strip with a notched (V) tail that hangs off the top edge of that card (and only that card). It is the only solid paprika object on the screen. Tapping the card resumes the most recent *bake in progress* or *recipe viewed*, and the ribbon text in the card reads "Resume baking" when a timer is live. The ribbon is aria-hidden and decorative; the card is the link.

## 3. The interaction system

**One clock.** `--t-press: 90ms`, `--t-page: 220ms`, `--t-sheet: 280ms`, `--t-fold: 280ms`. One easing for entrances, `cubic-bezier(.2,.8,.2,1)` ("settle"), and `cubic-bezier(.4,0,1,1)` for exits. Nothing exceeds 320ms. All of it is CSS transitions, which the global reduced-motion rule collapses. The only JS-driven motion is the page-turn (framer-motion), gated by `useReducedMotion()`.

**Pressed feedback ("held").** Every object uses a shared `.obj` utility: on `:active` it is `translateY(1px) scale(.985)` and the shadow collapses in 90ms. A *recipe card* is the exception, with a slightly deeper lift when long-pressed (see below). The state is on `:active`, which fires on touch immediately, so there is no 300ms feel.

**Screen transitions.**
- *Push* (list to recipe, recipe to bakes): the new page enters from the right by 24px with opacity 0 to 1 over 220ms "settle"; the old page dims 4%. It is a short slide, not a full-width travel, so it costs one composited layer.
- *Pop*: reverse, 180ms.
- *Tab switch* (Cookbook/Bakes/Shop/Discover): a 120ms cross-fade, no slide, because the tabs are peers.
- *Chapter open*: the index tab "pulls" the page, the list slides in 24px from the tab edge. It is the same push, directed by where the tab sits.
- *Sheet*: slides up 280ms with the existing `Sheet` scrim. Nothing new.
- Routes keep real URLs. Transitions wrap `<Outlet>` with `AnimatePresence`, and the browser/Android back event simply triggers the pop variant. Refresh and deep links render without the animation.

**Haptics (`@capacitor/haptics`).** `Light` impact on a card or tab press down (not on every scroll). `Medium` when a bake is stamped saved or the slip is added. `Notification.Success` on a bake logged. `Selection` ticks along the A-Z strip. Haptics are skipped on web and when the user disables them in settings.

**Gestures with visible alternatives.** Edge-swipe back (from the left 20px) is the only gesture added, and the chapter tab is its visible alternative. Long-press on a recipe card opens a `Menu` (Add to shopping, Favourite, Share) and the same actions exist behind the "⋯" on the recipe page. Nothing is only reachable by gesture.

**Loading and empty states.** `Skeleton` blocks keep the card silhouette (photo block, two lines). Empty states are *blank cards*: a dashed-outline card saying what goes here and a single `Button` ("Log your first bake"). With 3 bake logs in the library, the Bakes shelf shows three real stamps and says so honestly. No fabricated entries.

**The stamp.** A saved bake leaves a 56px circular stamp (outlined, rotated -4 degrees, star count in the middle, month in small caps) on the bake card. It is static SVG, and on creation it "thumps" once (scale 1.25 to 1, 160ms) with a Medium haptic. It is the single "delight" moment, so the owner gets the feeling of closing the loop. Reduced motion: it simply appears.

## 4. Phone vs desktop

Same objects, different arrangement.
- **Phone**: chapter tab top-left, A-Z tab on the right edge, ribbon on the resume card, tear-off slip full width in the ingredients section, tab bar at the bottom (Cookbook/Bakes/Shop/Discover) with the active tab shown as a *raised tab*, not an underline.
- **Desktop 1280**: the top bar is the tab row; the recipe is a two-page spread whose gutter holds the ribbon (a long ribbon hanging down the centre fold, marking the current step and linking to baking mode). The A-Z tab sits on the right edge of the right-hand page. The slip lives in the left-hand page below the ingredients. Hover: objects lift 1px and show their shadow. Keyboard: Tab order follows reading order; `g c`, `g b`, `g s`, `g d` jump to destinations; `/` focuses search; `[` is back. Press `?` for a shortcuts `Sheet`. Pointer cursors stay default (`cursor: pointer` only where the object is a link).

## 5. Wireframes

Phone recipe page (header to ingredients):

```
+--------------------------------------+
| [|Dessert]                  ♡  ⇧  ⋯  |   chapter tab (44px) | 44px icon buttons
+--------------------------------------+
|           [  photo 390x292  ]        |
+--------------------------------------+
| The Best Cheesecake Recipe           |   Fraunces 34
| The creamiest cheesecake, no water   |
| bath required.                       |
| Serves 12 · Prep 20 · Bake 1h15      |
| Adapted from sugarspunrun.com  [↗]   |   citation + 44px glyph
|                                      |
| +----------------------------------+ |
| | Last time · Oct 17        ★★★★☆  | |   whole card = one link
| | "Pulled it at 55 min, centre     | |
| |  still wobbly. No cracks."       | |
| | ~Next time~ 10 min longer.  (margin note, pencilled)
| |                    5 bakes  ◣    | |   corner fold
| +----------------------------------+ |
|  (o Private)   <- seal, opens Sheet  |
|                                      |
| Ingredients                          |
| ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   |   perforated top
|  Missing: cream cheese, sour cream,  |
|  vanilla  +6 more                    |
|  [ Add 9 to Shop ]                   |   tear-off slip
| └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   |
| 1 cup  graham crumbs                 |
+--------------------------------------+
| Cookbook | Bakes | Shop | Discover   |
+--------------------------------------+
```

Cookbook home:

```
+--------------------------------------+
| Cookbook                [✎]   (avatar)|
| ( Search 203 recipes ...           ) |
|                                      |
| Pick up where you left off           |
| ▌RIBBON                               |
| [img 112] The Best Cheesecake Recipe |   whole card = link
|           Baked Oct 17 · ★★★★ · 5     |
|           ~Next time~ 10 min longer   |
|                                      |
| Recently baked  ▮         (ribbon pull) |
| [128x96][128x96][128x96] ->  (peek)   |
|                                      |
| Contents                          [A |
| ▌Bread ................. 31   (row) |  Z]  <- side index tab
| ▌Cakes ................. 28         |
| ▌Dessert ............... 24         |
| ▌Show 5 more  v   (disclosure)       |
+--------------------------------------+
| Cookbook | Bakes | Shop | Discover   |
+--------------------------------------+
```

## 6. Build cost and risk

New primitives in `src/components/ui`, composed from the existing ones (`Panel`, `Button`, `Sheet`, `Menu`, `Tag`, `RecipeTile`):
1. `ObjectPress` / `.obj` CSS utility (one class and one hook for haptics): 0.5 day.
2. `ChapterTab` (back and breadcrumb): 0.5 day.
3. `IndexTab` + `AlphaStrip`: 1.5 days (scroll-spy, selection haptics).
4. `Ribbon` (CSS clip-path, decorative) and `ResumeCard`: 0.5 day.
5. `CardLink` (stretched link, whole-card target) and a `RecipeTile` update: 1 day.
6. `BakeStamp` (SVG + one-shot animation): 1 day.
7. `MarginNote` (italic text + SVG underline): 0.5 day.
8. `TearSlip` with undo and live region: 1.5 days.
9. `PageTransition` wrapper (framer-motion + `useReducedMotion`) and route variants: 1.5 days.
10. `TabBar` and `TopTabs`: 1.5 days.
11. `/lab` entries and tests (the project requires them): 1.5 days.
12. Desktop spread ribbon and shortcuts: 1 day.

About 12 working days. Roughly 6 KB of CSS and about 3 KB JS, with SVG inlined. No new dependency.

**Risks and mitigations.**
- *Gimmickry.* The test for every object is "does it carry information a link wouldn't?" The ribbon marks a state ("resume"). The tab shows hierarchy and position. The stamp records a result. The slip shows what will be added. Anything that fails the test (a page-curl, paper texture, sound effects) is excluded. There is exactly one celebratory animation (the stamp thump), and it can be turned off.
- *Cost on a mid-range Android.* Everything animates `transform` and `opacity` only. No filters, no blur, no large box-shadows animated. Perforation is a static `mask`. The page transition is one translating layer. We budget 16ms frames and test on the Capacitor APK; if frames drop, the push becomes a cross-fade by a single flag.
- *Accessibility regressions from shape-as-affordance.* Mitigated by retaining native elements, labels that include destination, `aria-current`, and visible focus rings. The vertical A-Z label is also a text label. An axe check goes in each primitive's test.
- *Design-system rules.* Paprika is spent only on the ribbon and the single primary button. Any additional use fails the `designSystem.test.ts` equivalent we update.
- *Stale route transitions on back.* Use `AnimatePresence mode="popLayout"` and skip the animation on the initial load and on `popstate` that crosses more than one entry.

## 7. Why the others are wrong

**A, Platform Native.** Chevron rows and a large-title nav bar make this look like Settings. They would erase the cookbook identity the owner just chose, and they are two idioms (iOS and Material) in one PWA with an Android APK, so one of them is always wrong. A chevron says "list of settings", not "a chapter of a book". Also, the app runs on desktop, where a "native nav bar" has no referent.

**B, Tactile and Gestural.** "Content is the control" hides behaviour. Swipe and long-press do not exist for a keyboard user, a screen reader or someone with flour on both hands whose finger skids across the screen. Shared-element transitions are the most expensive animation on a mid-range Android, and they fail on cold deep links (`/r/:slug`) where there is no source element. My system gets the same tactility from the pressed state and one short page slide, and it keeps a visible target for everything. The only gesture I add is edge-swipe back, with the chapter tab as its visible twin.

**C, Action-first.** Contextual action bars and inline expansion turn a cookbook into a dashboard. The bake log is a *journal*, and a reader wants to turn the page, not collapse panels; inline expansion also breaks "every screen has a URL" and makes browser back ambiguous. A command palette is a power-user desktop feature for a product whose main moment is a phone on a counter. I do use disclosure once (L9), where it is honest. And C's action bars add a second persistent chrome layer on a 375px screen already carrying a tab bar.

**The shared flaw of all three** is that they borrow polish from somewhere else. The mock-up's own words, "printed cookbook", already name a set of objects: tab, ribbon, card, stamp, slip. Using them makes the product *recognisable* in a screenshot, which none of the other three can claim.
