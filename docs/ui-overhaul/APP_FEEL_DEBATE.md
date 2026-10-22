# From "website" to "polished app": the debate and the verdict

*2026-10-21 · Branch `feat/ui-overhaul` · Follows [AUDIT_REPORT.md](AUDIT_REPORT.md) and the printed-cookbook mock-up.*

> **The owner's request:** "I want the app to feel more like an app and less like a website, so there are too many links in the website page. These should be replaced with something else."

Four Sonnet agents each argued a different philosophy:
- **Round 1:** each wrote a full proposal.
- **Round 2:** each read its three rivals, rebutted them, conceded what was better, revised its own position and scored the others.

Every file is in [`debate/`](debate/), including the shared [brief](debate/BRIEF.md) with the 13-item link inventory (L1–L13).

---

## 1. The four positions

| | Debater | Thesis (round 1) | What it changed in round 2 |
|---|---|---|---|
| **A** | **Platform Native** | "Polish is never having to learn the app." Use iOS and Material grammar in Proof's paper skin: a back chevron plus the parent title, inset-grouped rows with chevrons, segmented controls, detent sheets, the system share sheet, a 350 ms iOS push. Navigation is a row or a bar, an action is a button. | Took B's press physics and whole-card targets, B's shared-element photo transition (with a fallback), C's Undo and `?view=az`, and D's ribbon on the resume card. |
| **B** | **Tactile & Gestural** | "The content is the control." Whole cards press with spring feedback, and the photo flies from tile to page. Edge-swipe back, swipe rows, long-press menus, a swipeable Last-time card. Haptics everywhere. | Conceded the most. Shared-element transitions are now an optional enhancement. Every gesture sits behind a setting. Baking mode has no swipes. Took A's tappable grabber and back fallback, C's Undo, and D's margin notes and letter rail. |
| **C** | **Action-first** | "A website makes you go somewhere for everything." Expand in place, a docked action bar with 1–3 verbs, optimistic actions with Undo, and a ⌘K palette on desktop. | Dropped its chapter accordions and the in-place "See all" grid. Merged the action bar into the tab bar. Took A's back fallback, native share and detent sheets, B's stretched links, and D's stamp and ribbon as feedback. |
| **D** | **Cookbook Objects** | "Polish is an owned vocabulary, not borrowed chrome." A chapter tab for back, index tabs, a resume ribbon, a bake stamp, pencilled margin notes, a tear-off shopping slip, page-turn motion. | After reading the artboards it had skipped, it cut its 28 px side tab (it broke the 44 px rule), the desktop gutter ribbon and the stamp on every bake. Took A's system share, detents and back fallback, B's `Pressable`, and C's Undo, ⌘K and `?view=az`. |

## 2. Peer scorecard

Each debater scored only its rivals, from 1 to 10. Cost is scored so that 10 means cheap and safe. The figures are averages of three judges.

| Debater | App-feel polish | Kitchen usability | Cookbook identity | Accessibility and routing | Build cost and risk | **Total /50** |
|---|---|---|---|---|---|---|
| **A: Platform Native** | 7.7 | **7.7** | 4.3 | **8.7** | 5.3 | **33.7** |
| **D: Cookbook Objects** | 6.0 | 6.0 | **9.7** | 6.7 | 4.7 | **33.0** |
| **C: Action-first** | 6.3 | 7.0 | 5.0 | 7.0 | **6.0** | **31.3** |
| **B: Tactile & Gestural** | **9.0** | 5.3 | 6.0 | 6.0 | 3.3 | **29.7** |

How to read it:
- **B** is rated the *most* polished and the *least* usable in a kitchen.
- **D** owns the identity, scoring nearly 10 from all three rivals.
- **A** is the safest.
- **C** is the cheapest.

No single approach wins every column.

## 3. Verdict

**A wins the debate, narrowly, and the build is a deliberate hybrid: A's grammar, D's surface, C's feedback and B's touch.**

A wins because the other three each adopted its structural pieces in round 2:
- the 44 px back control with a parent-route fallback for deep links;
- the system share sheet;
- detent sheets with a grabber you can tap.

A also scored highest on kitchen use and on accessibility and routing, which matter most for this user. It loses on identity: chevron rows on a cookbook look like a settings screen. So the **structure** comes from A and the **content surfaces** come from D.

Each rival also contributed one piece that *every other debater* ended up adopting. That is the strongest signal the debate produced, so all four pieces are in:

| Universally adopted | From |
|---|---|
| `Pressable`: one press state on `pointerdown`, whole-card stretched links, cancelled by scrolling | **B** |
| Optimistic actions with **Undo** instead of confirmation (`useUndoableAction`, tombstone-backed) | **C** |
| Back with fallback, system share, detent sheets with a tappable grabber | **A** |
| One ribbon on the resume card; margin notes on method steps; a printed table of contents | **D** |

### What was ruled out, and why
- **B's swipeable Last-time card.** It hides 4 of 5 bakes behind a gesture, and the recipe page already has a "Your bakes" strip.
- **C's in-place expansion of the bake history.** It duplicates that same strip and complicates the URL.
- **Chapter accordions** (C withdrew them) and **D's 28 px side tab** (D withdrew it).
- **A's 350 ms full-width iOS push.** It is iOS-specific, wrong on Android and on desktop, and slower than it needs to be. The rulings use C and D's short 24 px slide instead.
- **A confirmation sheet before opening the external source.** Three of four debaters rejected it; tapping a link to another site doesn't need to be confirmed.
- **Any gesture as the only path.** All four agreed every gesture is an accelerator with a visible twin.

---

## 4. The ruling, item by item

**Global rules:**
- Links are ink and never underlined, except inside prose, where they get a 1 px ink underline at 40 % opacity.
- **Paprika means the one primary action on a screen.** It no longer means "clickable".
- Every card, tile and row is a single whole-surface target.

| # | Today | Replacement | Semantics | Source |
|---|---|---|---|---|
| L1 | "‹ Dessert" text link | **BackButton**: a 44 px chevron plus the parent's name, ink and no underline, sitting in a slim nav bar. It goes back through history, or to the parent route on a cold deep link. Android hardware back and edge-swipe (an accelerator) run the same path. | `<a>` with `aria-label="Back to Dessert"` | A (+ B, C, D) |
| L2 | "Adapted from sugarspunrun.com" | **Citation line**: muted text plus an external glyph, the whole line a 44 px target. It opens the in-app browser on Android or a new tab on the web. No confirmation. | `<a target=_blank>`, "opens in browser" | D (+ A, B) |
| L3 | "All 5 bakes →" | **The whole Last-time card is one target**, with "5 bakes" and a corner mark. It opens this recipe's bake history. "Next time" is set as a pencilled margin note. | One stretched `<a>` with a full accessible name | A + D |
| L4 | "Publish to get a link" | **PublishState chip** (a lock icon and "Private · this phone") in the meta row. It opens the publish flow in a **detent Sheet**, and after publishing it turns into "Public · Copy link", with Undo. | `<button aria-haspopup="dialog">` | B, C, D (+ A's sheet) |
| L5 | "+ Add 9 missing…" | **Tonal Button** "Add 9 missing to Shop", previewing "butter, sour cream +7". It acts instantly, turns into "Added 9 ✓" with "On list" tags, and shows an **Undo toast** for 6 s. | `<button>` with an `aria-live` result | C (+ A, B, D) |
| L6 | "All bakes →" | **The whole "Recently baked ›" header row** is the target, and the strip **ends in an "All bakes" tile**. | `<a href="/bakes">` | B (+ D) |
| L7 | "Index A–Z →" | **Segmented control "Chapters \| A–Z"** that swaps the view in place and writes `?view=az` to the URL. In A–Z view, a right-edge **thumb-index letter rail** with 44 px zones and a selection haptic. | radiogroup; `<nav>` of anchors for the rail | A, C, D (+ B's rail) |
| L8 | Contents rows | **Printed table of contents**: dot leaders, tabular counts, 52 px full-row targets, no chevron. Pressing tints the row and slides it 4 px in. | `<ul>` of `<a>`, count in the accessible name | D (+ C) |
| L9 | "5 more chapters…" | **"Show 5 more"** disclosure row with a rotating chevron, 240 ms. Loose notes become a normal row. | `<button aria-expanded>` | All four |
| L10 | "+ New recipe", "+ Log a bake" | **Labelled header button** ("New" or "Log bake", icon plus label, 44 px) opening a bottom Sheet with the three ways in: **Write · Paste a link · Photograph a page**. | `<button aria-haspopup="dialog">` | B + D |
| L11 | Desktop text-link nav | **Segmented navigation in the slim top bar** with a sliding thumb (240 ms), no underlines. The wordmark is a button-styled home link. A **⌘K palette** on the right, which works offline from IndexedDB. | `<nav>` of `<a aria-current>`; palette is a combobox | A + B; ⌘K from C |
| L12 | Breadcrumb | **The same BackButton** at the top of the left page. The full trail stays in a visually hidden breadcrumb `<nav>` for screen readers. | link | A + D |
| L13 | "Compare two" and the text action row | **Icon toolbar**: Favourite (a toggle with a small pop), Share (**system share sheet**) and Edit, with an overflow **Menu** holding Print, Duplicate, Compare and Delete. **Compare** becomes a selection mode on the bakes list: tick two, and a docked "Compare (2)" bar appears. | buttons; `aria-pressed` on the favourite | A (+ B, C, D) |
| + | Recipe primary verbs | In-flow **Start cooking · Log a bake**. When they scroll out of view on a phone, a **slim docked bar** with Start cooking slides up above the tab bar, so the main action is always under the thumb while you read ingredients. | buttons | C (revised) |

## 5. The interaction system (one clock)

| Interaction | Spec |
|---|---|
| **Press** (`Pressable`) | Responds on `pointerdown` and cancels after 8 px of movement, so scrolling never presses anything. Cards and buttons scale to 0.97 with a 6 % ink tint: 80 ms in, spring out (stiffness 500, damping 32). Rows tint only, so long lists don't shimmer. Reduced motion: tint only. |
| **Focus** | A 2 px paprika ring with a 2 px paper offset, on `:focus-visible` only. Disabled controls use `aria-disabled`, so they stay focusable and can explain why. |
| **Tab switch** | A 140 ms cross-fade, no slide (tabs are peers). Each tab remembers its own stack and scroll position. |
| **Push / pop** | A 24 px slide plus fade, 220 ms `cubic-bezier(.2,.8,.2,1)`. Pop runs the reverse in 180 ms. Initial load, refresh and deep links don't animate. |
| **Sheet** | 280 ms `cubic-bezier(.32,.72,0,1)`. Detents at 50 % and 92 %. The grabber is a button that cycles detents, and there is always a visible Done. Built on the existing `Sheet`, so focus trap, Escape and scroll lock carry over. |
| **Disclosure** | Height animates over 240 ms, and the chevron turns over 180 ms. |
| **Undo toast** | 6 s, paused while hovered or focused. Announced with `aria-live="polite"`. Sits above the tab bar, and Undo is reachable by keyboard. |
| **Shared photo** (tile → recipe) | **An enhancement, built last.** A 340 ms spring on warm in-app navigation only. Cold loads, `/r/:slug` and reduced motion get a 200 ms fade. It gets cut if it drops frames on the test Android. |
| **Haptics** (`haptic(kind)`, Settings toggle, never on scroll) | Selection: segmented controls, letter rail, tab change. Light: toggle, check-off, add. Medium: Start cooking, sheet detent snap. Success: bake logged, timer done. Warning: a destructive action with Undo. |
| **Gestures** (Settings › "Gestures", on by default; all are accelerators) | Edge-swipe back (from the 20 px left edge). Drag a sheet. Swipe Shop and bake rows, with Undo. Long-press a tile for its menu, which duplicates the `⋯` menu. Baking mode keeps its existing step swipe *plus* the 64 px Back and Next buttons. Pull-to-refresh on Discover only. |
| **Identity touches** (D) | One paprika **ribbon** on the resume card ("Resume baking" while a timer runs). A **stamp** marks the personal best only, with one 160 ms "thump" on creation. **Margin notes** (✎) beside method steps and in baking mode. |

## 6. Build list (new `src/components/ui` primitives)

| Primitive | Effort | Notes |
|---|---|---|
| `Pressable` (+ stretched-link utility) | 0.5 d | Ship first. On its own it is the biggest jump in app feel. |
| `BackButton` / `NavBar` | 1 d | History fallback; Android back. |
| `Segmented` | 1 d | Radio and link variants; `?view=` sync. |
| `Sheet` detents + grabber + drag | 2 d | Extends the existing primitive. Riskiest part: the focus trap while dragging. |
| `Toast` + `useUndoableAction` | 2 d | Inverse operations via tombstones. |
| `Disclosure` | 1 d | |
| `IconButton` / `Toolbar` | 1 d | Labels required by type; tooltips on desktop. |
| `DockedAction` (recipe) | 0.5 d | Appears via IntersectionObserver. |
| `PageTransition` + per-tab stacks | 2–3 d | The riskiest piece (React Router 7 outlet freezing). |
| `LetterRail` | 1 d | Selection haptics. |
| `lib/haptics.ts`, `lib/share.ts` | 0.5 d | |
| `Ribbon`, `Stamp`, `MarginNote` | 1 d | Static CSS and SVG. |
| `CommandPalette` (desktop) | 2–3 d | A later slice. |
| `SharedPhoto` | 2 d | The final slice, cut if it drops frames. |
| Tests and `/lab` entries | 2 d | Required by the repo. |

**About 17–20 days in total**, delivered in slices:
1. `Pressable`, `BackButton`, `Segmented`, `IconButton`, the rule that links are ink.
2. Sheets, `Toast`/Undo, `Disclosure`, `DockedAction`.
3. Transitions and tab stacks.
4. Identity touches and `LetterRail`.
5. ⌘K.
6. Shared photo.

**This fits Phase 1 and Phase 2 of the overhaul plan:** the primitives belong to the Phase 1 foundation, and the transitions belong to Phase 2, the shell.
