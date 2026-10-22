# D. Cookbook Objects: round 2

## 0. What the three artboards corrected in my opening

- **Margin notes already exist.** Desktop.dc.html sets `✎ {{st.margin}}` under method steps, and Baking.dc.html shows "Last time on this step" with the same quoted note. That is where the pencilled margin note belongs. I had put it on the Last-time card's "Next time" line, which the mock-up already sets in clean type. That was overdressing, and I drop it.
- **The stamp is for the personal best only.** Bakes.dc.html marks one entry "· Best" (header: "1 personal best"). A stamp on every bake would be decoration, and the repo rule says to draw only what the data supports. The stamp becomes the "Best" mark.
- **No gutter ribbon on desktop.** The desktop spread is an aside plus a method column with a "Your bakes" strip below, and "Start cooking" and "Log a bake" are already real buttons. My centre-fold ribbon had nothing to mark, so I cut it.
- **The Bakes screen already has a Journal / By recipe segmented control** (`aria-pressed` buttons). That is the mock-up's own answer for in-place view switching, and I adopt it for Chapters | A-Z.
- **Baking mode stays quiet.** It is dark, one-handed and timer-led, with a footer of Note / Back / Next. It gets the press state and haptics, and no new objects.
- **"Compare two" is a link in the Your bakes header** that points at the Bakes page. It is really a mode.
- **My own mistake.** I specified a 28px-wide A-Z side tab and a sticky right-edge placement. That fails the 44px rule, and A was right to say so. It also fights the Recently-baked scroll rail. I fix it below.

## 1. Rebuttals

### A, Platform Native
1. **"Push: incoming screen slides from `x: 100%` ... 350 ms ... outgoing `x: -30%`", plus per-tab stacks.** A's own estimate is 3 days and the riskiest item. A full-width parallax on every navigation is the heaviest animation here. A recipe opens maybe fifty times a week, and each time the baker waits 350ms on a propped phone. On desktop A silently replaces it with a cross-fade, so the signature feature exists on one form factor. My 24px, 220ms slide gives the "I went deeper" cue at a fraction of the cost.
2. **"Inset-grouped list ... chevron-right ... 1px inset separators"** for Contents. The mock-up's Contents is a book's table of contents with dot leaders (name ..... count). A turns it into iOS Settings, and the chevron is the web link in a different coat. C said the same, and the mock-up supports them. The owner chose a printed cookbook, and A deletes the one place it is most literal.
3. **Swipe-to-delete on Shop and bake rows, `--spoiled` red "Delete".** It puts a destructive action under the thumb on a screen that scrolls. The visible alternative is an "Edit mode and Select toolbar button", which means two taps for what a floury hand does by accident in one swipe. The bake log is the main character, and A makes its entries the easiest thing in the app to lose.

### B, Tactile & Gestural
1. **Last-time card as a swipe pager ("5-dot pager ... Swipe left/right pages through the bakes").** The mock-up's card says what happened *last time*, one fixed answer. B makes it a carousel inside a vertically scrolling page, next to an edge-swipe-back zone. A diagonal thumb will page it by accident. B also hides the destination "All 5 bakes" behind a final page of the carousel, so the original link job is now buried. The "1 of 5 ‹ ›" twin is a 40px-class control doing what one tappable card did before.
2. **Baking-mode pager ("whole-screen horizontal pager: swipe left/right through steps").** Baking mode is where hands are worst: wet, floury, one thumb. A stray swipe changes the step mid-bake while a timer runs. B carves out the footer and the timer chip, but the instruction text, which is where the thumb rests while reading, becomes a live swipe surface. The Back and Next buttons already work. This adds risk to the screen where a wrong move costs a cheesecake.
3. **Shared-element `layoutId` photo transition plus "swipe-right Pin" on chapter rows.** On `/r/:slug` cold loads and refreshes there is no source tile, so B needs a fallback, and the fallback is what most opens will actually be (deep links, share links, Android resume). Pin is a new feature that appears nowhere in CURRENT_FEATURES, brought in to justify a gesture. B's own estimate is three weeks.

### C, Action-first
1. **Contents rows as accordions ("Each chapter row is a 56px button ... expands inline ... 'Open Dessert (44)'").** Opening a chapter is now two taps and a scroll, on the most common action in the cookbook. A 203-recipe book becomes a long accordion with a wobbling page height under a floury thumb. It also removes the mock-up's dot-leader contents list.
2. **Source link behind a confirmation Sheet ("Open sugarspunrun.com in your browser?").** The project bans `confirm()` in spirit: report in the panel, don't interrupt. This adds a confirm step to a harmless, reversible tap and calls it safety. A link that leaves the app should simply say it does (an external glyph and `target=_blank`), as A, B and I all do.
3. **Docked paprika `ActionBar` on Cookbook ("one primary 'New recipe' (paprika-filled, 48px)") that hides on scroll.** On a 667px phone, 56px of bar plus the 56px tab bar is nearly 20% of the screen. The Cookbook is a browse screen, and C makes creation its loudest element, which is the floating action button the owner decided against, drawn as a strip. A bar that hides and returns moves under the thumb. Also "See all 14" does not match the mock-up's 17 bakes, so the chip invented a number.

## 2. Concessions (what I steal)

- **From A:** share goes through the system (`navigator.share` and Capacitor `Share`), with a Sheet fallback. Sheet detents with a grabber that is also a button (`aria-label="Resize"`). The back-fallback rule: with no history, navigate to the parent route instead of leaving the app. Fits: the chapter tab calls the same `navigate(-1)` or parent path.
- **From B:** the `Pressable` primitive (stretched link, cancel-on-8px-move, pressed on `pointerdown`) replaces my `.obj` utility, since it is better specified. Also the shelf that *ends in an "All bakes" tile* instead of a ribbon pull, and pull-to-refresh on Discover only (the one network tab). Fits: the tile is a card, which is already my object.
- **From C:** `useUndoableAction` and the Undo toast for the tear-off slip. The tombstones make it nearly free, and it beats my "inline Undo" idea. Also the desktop **Ctrl/Cmd+K palette**, built from an in-memory IndexedDB index so it works offline, plus the `?view=az` URL state. Fits: the palette is the card-catalogue drawer for the desktop top bar, and it adds zero chrome on a phone.

## 3. Final position: amended L1-L13

Shared: `Pressable` (pressed on `pointerdown`: `translateY(1px) scale(.985)` in 90 ms, release 140 ms). 2px paprika focus ring with offset. Disabled is 45% opacity with `aria-disabled`. Every object is a native `<a>` or `<button>`.

| # | Final replacement |
|---|---|
| L1 | **Chapter tab**: a 44px tab in the header with the chapter name and a 6px notch (no chevron). `<a href>` to the chapter, with `navigate(-1)` when in-app history exists and the parent route otherwise. 24px/220ms push, 180ms pop. Edge-swipe back is an accelerator only. |
| L2 | **Citation line**: plain muted "Adapted from sugarspunrun.com" plus a 44px external glyph. `<a target=_blank rel=noopener>`, Capacitor Browser on Android, label "opens in browser". No confirmation sheet. |
| L3 | **Whole Last-time card is one link** to the recipe's bakes, with a "5 bakes" corner fold. No margin-note treatment. Not a carousel. |
| L4 | **Visibility seal** (lock, "Private, this phone"), a button that opens the publish Sheet. Offline it reads "Publish when online" and is `aria-disabled`. |
| L5 | **Tear-off slip** with a real "Add 9 to Shop" button and the first three missing items. Success is announced via `aria-live`, with the shared Undo toast (6s, paused on focus), Medium haptic on add. |
| L6 | **Section heading is a full-row link**, and the shelf ends in an "All bakes" card tile. No ribbon pull. |
| L7 | **Chapters / A-Z as two index tabs** (a segmented control, in place, `?view=az`, 44px each), matching the Bakes screen's Journal / By recipe pattern. On the A-Z view a right-edge alphabet strip with 44px zones and a Selection haptic. The standalone 28px side tab is gone. |
| L8 | **Contents keep the printed table of contents**: dot leaders, tabular counts, 52px full-row links, pressed indent. No chevron, no accordion. |
| L9 | **"Show 5 more" disclosure row**, a button with `aria-expanded`, 280ms. |
| L10 | Cookbook: a 44px "New recipe" outlined icon-and-label button in the header (mobile) and the top bar (desktop). Bakes: "Log a bake" the same. Both open a Sheet. One solid paprika per screen, usually "Start cooking" or the ribbon card. |
| L11 | **Index-tab top bar** with `aria-current`; "Proof" a 44px button-styled home link. Plus Ctrl/Cmd+K palette and `g c/b/s/d`. |
| L12 | **Chapter tab** above the left page, with the full "Cookbook / Dessert" trail kept as a screen-reader breadcrumb. |
| L13 | Favourite (`aria-pressed`) and Share as icon buttons with tooltips; Print, Edit, Delete under a `Menu`. "Compare two" becomes a **Compare mode toggle** on the Your bakes header: tick two bakes, then a "Compare 2" button. |
| Objects kept | **Ribbon** only on the resume card (and not in Baking mode). **Stamp** only for personal best. **Margin note** only on method steps (the mock-up's `✎`) and in "Last time on this step". **Slip** only for missing ingredients. |
| Globals | Paprika is no longer the link colour. In prose, 1px ink underline at 40%. Whole-card stretched links. |

Cost revised: the 28px tab, gutter ribbon and per-bake stamp are gone, and `Pressable` and the Undo toast are shared with B and C. About 10 days, no dependency.

## 4. Scorecard

| | App-feel polish | Kitchen usability | Cookbook identity fit | Accessibility and routing safety | Build cost and risk |
|---|---|---|---|---|---|
| **A, Platform Native** | 8, the most familiar grammar and an excellent sheet and transition spec. | 7, large, fixed targets, but swipe-to-delete is a hazard. | 4, grouped lists and chevrons flatten the dot-leader contents and the paper look. | 8, real links and buttons, parent-route back fallback, detent grabber twin. | 5, 12-15 days and the stack transition is the riskiest piece. |
| **B, Tactile & Gestural** | 9, the best feel, and the shared photo is a real wow moment. | 5, pagers, long-press and swipe rows work against wet, floury thumbs. | 6, tactile and warm, but the objects are generic. | 6, many twins to keep honest, and deep-link fallbacks are the common case. | 3, about 3 weeks and the most fragile animation work. |
| **C, Action-first** | 6, solid and quick, but accordion screens feel like a form. | 8, big visible buttons and Undo suit messy hands, with the docked bar a cost. | 5, honest, but it is a dashboard-ish cookbook. | 8, plain buttons, state in the URL, with the added palette to keep accessible. | 5, 14-16 days, mostly composition, with the palette and toast the larger parts. |

My own cost and fit I leave to the judge. My honest weak points are that the skin has to be drawn well and that the objects need the 44px discipline I failed once above.
