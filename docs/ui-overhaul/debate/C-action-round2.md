# C — Action-first: round 2

## 1. Rebuttals

### A, Platform Native
1. **"Row with trailing chevron opens a pushed screen" for L3/L6/L7/L9.** A's answer to "too many links" is to give links a chevron. The owner's complaint was that the app is a series of places you travel to; A keeps every one of those trips and just re-labels the arrow. It also pays the trip's full cost: a push animation, a lost scroll position, and a back tap, to read five bakes that would fit in the card you are already looking at.
2. **"Pull-to-refresh on Discover", "large-title collapse", iOS-flavoured with a "single platform flag" for Android.** Proof ships as PWA, APK and a 1280px desktop site. A's own risk list admits the large-title collapse causes layout shift and that two idioms diverge. A faithful iOS grammar in a Capacitor WebView on Android is the uncanny-valley case: close enough to be judged against the real thing, never close enough to win. The paper-and-ink identity is the asset; A spends it on borrowed chrome.
3. **Its attack on me ("inline expansion destroys every place has a name") is half right but overreaches.** It claims URLs become meaningless. They do not, if state lives in the URL, but A is right that I did not specify that for every disclosure (see concessions).

### B, Tactile and Gestural
1. **"Swipe left/right pages through the bakes (snap, 280ms spring)" on the Last-time card.** The card is the highest-value block on the recipe page and B makes it a carousel showing one bake at a time. A baker comparing "pulled at 55" with "pulled at 60" must page and remember. A list shows them at once. B itself adds a "1 of 5 < >" stepper, i.e. a second control for what a plain expanding list shows for free.
2. **Swipe-right "Pin" on Contents rows, swipe-left Delete on bake rows, 380 ms long-press with a 1.03 lift.** Each ships with a "visible twin" that B then has to build and test, so the gesture adds a feature to nothing. Wet or floury thumbs skid and fire the wrong swipe; a destructive swipe next to a scroll is the classic misfire. B's Undo toast saves it, but it is my mechanism, imported.
3. **Interactive swipe-back with parallax and a progress-tied photo** needs a stack of rendered screens, which React Router 7 does not keep. It is the highest-risk item in the whole debate and B budgets two days. On refresh or a cold `/r/:slug` there is no previous screen to reveal.

### D, Cookbook Objects
1. **L6 "Recently baked" with a 14x28 ribbon pull; L7/L8 index tabs on the screen edge.** A 14px ribbon is a 14px target inside a 48px row, and the heading remains the same old `<a href="/bakes">`. The link has not been replaced; it has been decorated. D's own words, "the shape is a redundant cue on top of correct semantics", concede that the interaction is unchanged. The "too many links" count is the same.
2. **Tear-off slip with a perforated scalloped CSS `mask` and a 14px fly into the Shop badge.** It's the best-looking answer to L5 and it is also a bigger, custom, masked component for what is a one-line tonal button plus Undo. On a 375px page it adds a card where a button was. Charm per pixel is high; cost per feature is the highest of the four.
3. **A rotated 56px stamp and the "single paprika object" rule.** CLAUDE.md allows red for "now" and one solid primary control. A ribbon is a second paprika solid beside the primary button on the same screen; D's `designSystem.test.ts` change loosens a guard that exists to stop exactly this drift.

## 2. Concessions

- **From A: back-with-fallback and native Share.** `navigate(-1)` with a parent-route fallback on a cold deep link, plus `navigator.share()` / Capacitor Share for "Share", beats my Share-sheet idea. Detent bottom sheets (50% / 92%, grabber that is a button) are better than my plain `Sheet` for Log a bake and Publish. I take the detent `Sheet` extension.
- **From B: stretched-link cards and selection haptics.** I already used the stretched-target pattern; B's spec for it, and the `selectionChanged` haptic on segmented controls and letter-rail scrubs, are better than mine. I also take B's Pager for **Baking mode steps only**, where a floury hand swipes between steps and big Back/Next remain.
- **From D: the stamp and the resume ribbon, as state, not navigation.** A bake saved leaves a stamp with a one-shot thump; the resume card carries a ribbon only while a timer is live. Both are *feedback after an action*, which is my philosophy applied to D's art. I drop the slip but steal its content: the Add-to-Shop button previews "Butter, sour cream, +7".
- **My own errors, conceded openly.** (i) A is right that chapter accordions made the cookbook a long page; (ii) B is right that the action bar plus tab bar is two chrome layers on 375px; (iii) A and B are right that the palette does nothing for the phone. I fix each below.

## 3. Final position (replacement list)

| # | Final replacement |
|---|---|
| L1 | 44px back **button** (`navigate(-1)`, fallback to the chapter route on a cold link) plus a "Dessert" **ChapterChip** opening a prev/next peek Sheet. Android back runs the same path. |
| L2 | **SourceChip** "Source · sugarspunrun.com ↗" opening a small Sheet: Open / Copy link. |
| L3 | **Disclosure** on the Last-time card, "5 bakes ▾", expanding to a list in place (all five visible at once), with a secondary "Open bake journal" button. State in the URL as `?bakes=1` so refresh and back behave. |
| L4 | **PublishState chip** plus a "Publish" button opening a detent Sheet; becomes "Public · Copy link" with Undo. |
| L5 | **Tonal button** "Add 9 missing to Shop", with a preview of the first items, optimistic, "Added 9 · Undo" toast. |
| L6 | **"See all" is a real button that navigates** to Bakes (revised: no in-place grid; the strip stays a strip). |
| L7 | **Segmented "Chapters | A–Z"** in place, `?view=az`, with B's letter-rail scrub and selection haptic. |
| L8 | **Chapter rows are plain links, 56px stretched, chevron-less**; no accordion (revised after A). Pressed tint only. |
| L9 | One **"Show 5 more"** disclosure, the only honest in-place expansion in the Contents list. |
| L10 | **ActionBar only where there is a true primary verb and not stacked with chrome**: it replaces the header "+ New recipe" as the docked bar on the Cookbook and *merges visually with the tab bar* (one 104px block, hairline between) so it reads as a single chrome layer. |
| L11 | Desktop top bar as **nav pills** (`aria-current`), wordmark to Cookbook, ⌘K field right. |
| L12 | **ChapterChip** with `[` and `]` for prev/next recipe; no breadcrumb row. |
| L13 | Verbs **Start cooking · Log a bake · Share** (native Share), Favourite as `aria-pressed` toggle, the rest in `Menu`; **Compare** as a mode toggle on the bakes list. |
| Global | Ink links without underline except in prose; stretched whole-card targets; pressed state 80/140ms; Undo toast for every quick action; stamp on bake saved. |

## 4. Scorecard (rivals only)

| Debater | App-feel polish | Kitchen usability | Cookbook identity fit | Accessibility and routing safety | Build cost and risk (10 = cheap/safe) |
|---|---|---|---|---|---|
| **A, Platform Native** | **8**: the most recognisable "real app"; push/pop and detent sheets are proven. | **8**: stable bars, 44px rows, no hidden controls. | **5**: the skin is Proof's, the grammar isn't; the result could be any app. | **9**: semantic links for navigation, buttons for actions, real routes, visible twin for every gesture. | **6**: about 13 days; per-tab stacks and iOS/Android divergence are fiddly but known. |
| **B, Tactile and Gestural** | **9**: the best-feeling when it works; interactive back and springs. | **5**: swipes and long-press fail on wet, floury thumbs; carousel hides data. | **6**: neutral; the paper metaphor shows up only in motion. | **6**: every gesture has a twin, but the gesture conflicts (edge zone vs pager vs scroller) are a standing risk. | **3**: swipe-back, shared elements and swipe rows are the costliest and most fragile code in the set. |
| **D, Cookbook Objects** | **6**: charming, but "link wearing a costume" in several places; little new interaction. | **7**: big visible targets, no gestures; the slip and stamp read at a glance. | **10**: by far the most Proof; it would look like itself in a screenshot. | **8**: real `<a>`/`<button>` with decorative cues; but small ribbon/tab shapes must be hit-area padded. | **5**: bespoke art, masks and SVG per object; about 10 days, but no routing risk. |

Honest note: if the judge weights *identity* heavily, D's skin should be laid over whichever interaction system wins; the stamp and resume ribbon are the part I would ship from D.
