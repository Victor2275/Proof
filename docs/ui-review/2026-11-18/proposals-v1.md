# Proposals v1: run 2026-11-18

Built from `ledger.md` (F-01 to F-29), the keep list (K-1 to K-18) and `provocations.md` (X-1 to X-22). Every major
finding (F-01 to F-13) has at least one proposal. Minor findings are grouped into P-03, P-05, P-07, P-10, P-13, P-14,
P-15, P-16, P-17 and P-18. Three minors are left out on purpose:
- **F-25** (no units setting) is a conversion feature, not a fix.
- **F-28** (the Journal interleaves recipes) is what Journal is for; By recipe answers it.
- **F-24** is folded into P-16.

**Provocations taken in:**
- adapted: X-3 (P-01), X-2 (P-03), X-4 (P-04), X-5 (P-05), X-6 (P-06), X-7 (P-07), X-16 (P-08), X-8 (P-09), X-11 (P-12),
  X-12 (P-13), X-13 and X-22 (P-14), X-14 (P-15), X-15 (P-16);
- as written, with their RULE-BREAK labels: X-1 (P-02), X-9 (P-11), X-19 (P-19), X-21 (P-20).

Rule-break proposals are judged on their merits. The label is for the owner to rule on.

Widths: **w375** is the phone (812 px tall, about 740 px above the tab bar). **w1280** is the desktop.

---

### P-01: Start cooking on the first phone screen
- Addresses: F-01
- Change (w375, own recipe and shared recipe):
  1. The hero photo is cropped to 16:10 (about 234 px tall, down from about 330), still full-bleed, plain and
     un-overlaid.
  2. The headnote clamps to two lines, with "more" opening the rest in place.
  3. The "Private · this device" chip moves into the end of the meta line as plain text ("… · Medium · Private").
  4. "Last time" stays directly under the title and meta line (K-1).
  5. "Start cooking" and "Log a bake" sit directly under "Last time", so the primary action lands at about 640 px.
  6. The Ingredients heading gains a small "Method ↓" control (ink, 44 px) that scrolls to step 1, and the Method
     heading gains "Ingredients ↑". This is X-3's ribbon pair, drawn as plain ink controls because the ribbon already
     means "pick up where you left off".
- w1280: unchanged (K-2).
- Why: the baker at the counter and the stranger cooking tonight both need the key and the note on the first
  screen. Today the photo and chip push "Start cooking" to 845 px.
- Cost: S
- Rules: WITHIN RULES
- Origin: session; X-3 (adapted)
- Keep-list risk: K-1 (stays in place, unchanged); K-17 (photo smaller but still plain and full-bleed);
  K-10 (the chip becomes words in the meta line, so its provenance survives).

### P-02: The phone recipe opens as an index card (RULE-BREAK)
- Addresses: F-01, F-11
- Change (w375 only): the first screen is a card. The title sits with the photo as a 72 px plate beside it, then
  "Last time", a "Ready by" line (P-03) and the "Start cooking" key, all inside 740 px. The full-width photo is the
  first thing below the card. w1280 unchanged.
- Why: it puts the bake log and the key first and keeps the photo one swipe away.
- Cost: M
- Rules: RULE-BREAK: R7 — as filed by the Provocateur. The session notes that no rule fixes the phone hero at full
  width; what X-1 really strains is K-17 and DESIGN.md's "a recipe reads like a page". The owner rules.
- Origin: X-1 (as written)
- Keep-list risk: K-17 (the photo is no longer the page's opening image on a phone); K-10 (shared page and own page
  stay identical, both get the card).

### P-03: An honest "ready in" on the recipe header
- Addresses: F-11, F-26
- Change (all widths, own and shared recipe):
  1. The meta line keeps "Prep · Cook" (K-10).
  2. It adds one more item only when the method's own step times prove it. When any step names a wait of 4 hours or
     more, it prints "Chills overnight" or "Rests 6 h" as a third item, so the cheesecake reads "Serves 12 · Prep 20
     min · Cook 1 h 15 · Chills overnight · Medium".
  3. When all of the recipe's time comes from the placeholder (`isPlaceholderTiming`), nothing is added.
  4. In "Plan this bake", the caveat becomes one line: "Some step times are guessed." Tapping it shows which steps.
- Why: a cook planning tonight is told 1 h 35 for an 8-hour cake. The data to say so is already in the method.
- Cost: S
- Rules: WITHIN RULES (R11: prints only what the step text states)
- Origin: X-2 (adapted: keeps Prep · Cook instead of replacing it)
- Keep-list risk: K-10 (kept; one item added).

### P-04: Empty rows vanish on save
- Addresses: F-02
- Change (editor, all widths): remove native `required` from ingredient and step rows. On save, empty rows are
  dropped. If any were dropped, the toast reads "Saved · 2 empty rows removed", with Undo, which restores them in the
  editor. A recipe with no title still blocks saving, with the error under the Title field in the app's own words:
  "Give it a title to save it."
- Why: a stranger hit a browser bubble and a jumping page. An empty row is never something to keep.
- Cost: S
- Rules: WITHIN RULES (R9, R22)
- Origin: X-4 (adapted)
- Keep-list risk: none.

### P-05: The phone editor opens on the recipe, not on the tools
- Addresses: F-03, F-14
- Change:
  1. "Write it" (`/new?start=blank`) opens without the import disclosure. The cookbook's "Paste a link or text" and
     "Photograph a page" doors open it.
  2. "Tidy up with AI" leaves the phone header for the ⋯ menu, so the header holds Back and "Create recipe" / "Save"
     only. Desktop keeps it in the header (K-12).
  3. "More details" starts closed on every recipe, showing its summary ("Serves 4 · Medium · Dessert"; K-12). An empty
     Prep or Cook field shows no number: the placeholder becomes "min".
  4. The phone order is Title, "A line about it" (2 lines until focused), Ingredients, Method, Photographs, More
     details.
  5. Once anything changes, the header shows "Draft kept" in `--ink-muted` beside the save. Leaving with changes shows
     the toast "Draft kept · Discard". The recipe page shows a one-line "Unsaved draft · Open" row while a draft
     exists.
- Why: on a phone, five blocks stand between the editor's top and the first quantity. Drafts are already safe, but
  nobody is told.
- Cost: M
- Rules: WITHIN RULES
- Origin: session; X-5 (adapted: no two-page split)
- Keep-list risk: K-12 (desktop header and preview unchanged; "More details" keeps its summary).

### P-06: The log sheet leads with the writing
- Addresses: F-04
- Change (log-a-bake sheet, all widths):
  1. The order becomes: "What happened" (focused, 4 rows), Stars, "Next time", "What I changed", then Photographs as a
     compact row, then a "When · Mark as my best" disclosure (closed; summary "Today, 21:40").
  2. On every sheet that holds a form, the close control is an × labelled "Close", not "Done". Detent sheets without a
     form keep "Done".
  3. "Dictate" grows to 44 px.
  4. "Log this bake" stays the only paprika key.
- Why: the note is the log's whole point, and "Done" next to "Log this bake" reads like save.
- Cost: S
- Rules: WITHIN RULES
- Origin: X-6 (adapted: "Next time" and "What I changed" stay visible)
- Keep-list risk: K-18 (still one paprika key).

### P-07: What you wrote for next time follows you
- Addresses: F-07, F-29
- Change:
  1. Journal row: when a bake has "Next time", the row's quote line is "Next time: …" in pencil (the margin-note
     colour), above the first line of "What happened". Both are clamped, at three lines in total.
  2. Recipe "Last time" card: under the note, a line "Changed: …" from `changes` when present. "Next time: …" is
     already there.
  3. By recipe tiles: no change.
- Why: the Journal hides the one line a baker most needs, and the recipe hides what changed.
- Cost: S
- Rules: WITHIN RULES (pencil = a note from a past bake, R14)
- Origin: X-7 (adapted: no new sticky-note object)
- Keep-list risk: K-4 (rows stay; one line can grow to three); K-1 (the card grows by one line when changes exist).

### P-08: Scaling prints kitchen measures
- Addresses: F-05
- Change (recipe and shared recipe, servings stepper):
  1. Scaled amounts snap to the nearest kitchen fraction (⅛, ¼, ⅓, ½, ⅔, ¾) when within 5%.
  2. Otherwise they print the gram figure the line already carries ("about 184 g"). With no gram figure, they print
     one decimal.
  3. Beside the − / + stepper, two segmented presets appear: "½×" and "2×".
  4. "Scaled from 12 · Back to 12" stays.
- Why: "2.17 cup" can't be measured, and the same list already prints "1⅛ tbsp".
- Cost: S
- Rules: WITHIN RULES (DESIGN.md: amounts print as kitchen fractions)
- Origin: X-16 (adapted: keeps the one-serving stepper)
- Keep-list risk: none.

### P-09: "Best" says which best
- Addresses: F-06
- Change (Bakes, both views):
  1. The summary line reads "17 bakes · 6 recipes · top rated: Braised stuffed cabbage". The R11 rules for naming one
     are unchanged.
  2. The stamp keeps its round shape and paprika ring but reads "My best", with the stars below ("★3").
- Why: one word with two meanings on one screen reads as a contradiction.
- Cost: S
- Rules: WITHIN RULES
- Origin: X-8 (adapted: no average figure printed)
- Keep-list risk: K-4 (summary and stamp both kept, reworded).

### P-10: By recipe numbers every bake
- Addresses: F-08, F-27
- Change (Bakes › By recipe, all widths; Compare sheet):
  1. Every tile carries its attempt number. A photo tile gets "Bake 2" as a small label under the photo, beside the
     date, the same place as the stars.
  2. On a phone the row opens scrolled to the newest bake, with the earlier ones to its left, so bake 5 is on screen.
  3. The sparkline is labelled "Stars, 5 bakes". When every rating is equal it is replaced by the words "3★ every
     time".
  4. The Compare sheet heads each column "Bake 2 · Sep 11".
- Why: you can't tell which attempt a photo is, and the newest attempts are the ones off-screen.
- Cost: S
- Rules: WITHIN RULES
- Origin: session
- Keep-list risk: K-5 (strip kept; numbers added, as K-5 itself asks of photoless tiles).

### P-11: By recipe as a vertical ladder (RULE-BREAK)
- Addresses: F-08, F-27, F-28
- Change (Bakes › By recipe, w375; w1280 may keep the strip): each recipe is a vertical list, newest first. Each rung
  is a row with "Bake 5", the date, stars, one line of "What I changed" (or of the note), and a photo thumb or
  numeral plate. Tap two rungs to compare. The sparkline is dropped. The view needs a new `BakeRung` row primitive
  in `/lab`.
- Why: the iteration is the product, and a sideways strip hides most of it on a phone.
- Cost: M
- Rules: RULE-BREAK: R20 — a new row primitive instead of composing the existing strip; buys a vertical, readable
  iteration view.
- Origin: X-9 (as written)
- Keep-list risk: K-5 (replaces the horizontal strip on a phone).

### P-12: The cupboard says what it saved you
- Addresses: F-09
- Change (Shop):
  1. The "Add from a recipe" sheet becomes multi-pick: tick several recipes, then one "Add" key showing a count
     ("Add 3 recipes").
  2. The toast reads "Added 15 · 4 already in your cupboard".
  3. The list ends with an ink-muted line, "In your cupboard, not added: Eggs, Flour". Each name is a 44 px chip that
     adds it back.
  4. Empty, the To buy view says "Nothing to buy." once; the count line is hidden at zero.
- Why: silent savings look like missing items, and planning three recipes takes six taps.
- Cost: M
- Rules: WITHIN RULES (ink, not pencil: the Provocateur's pencil version is X-11, labelled RULE-BREAK: R14)
- Origin: X-11 (adapted)
- Keep-list risk: K-14 (quick-add and segmented control unchanged; the empty line becomes single, as K-14 describes).

### P-13: The cookbook's sort and filter sit by the search
- Addresses: F-10, F-23, F-21
- Change (Cookbook):
  1. w375: a "Sort and filter" icon button (44 px, labelled) sits at the right end of the search field's row. It opens
     the existing Filter sheet with Sort added as its first group. Grid / List moves into the same sheet.
  2. Contents shows the first 5 chapters plus "All chapters", which opens the full list in a sheet. In both, Loose
     notes is its own row, not folded into the "5 more" fold-out.
  3. Phone tiles show two lines of title.
  4. w1280 keeps the "All recipes" control row and gains the same chapter cap.
- Why: changing the order takes about 1.6 screens of scrolling past showcase content.
- Cost: S
- Rules: WITHIN RULES
- Origin: session; X-12 (adapted: an index sheet only for "All chapters")
- Keep-list risk: K-6 (resume card, Recently baked and Contents all stay, in order).

### P-14: A shared recipe has somewhere to go next
- Addresses: F-12, F-18
- Change (`/r/:slug`, all widths):
  1. The credit becomes a whole-row link: avatar initials, "@proof · Proof Kitchen", a chevron (44 px).
  2. The page ends with "More from @proof": up to 3 `RecipeTile`s of that baker's other published recipes, then
     "All from @proof". It shows only when the baker has another one.
  3. "Save to my cookbook" shows the toast "Saved to your cookbook · Undo" and then opens the copy.
- Why: the only door a stranger comes through is a dead end, and the save happens without a word.
- Cost: M
- Rules: WITHIN RULES (no persuasion: R26)
- Origin: X-13 (adapted); X-22 (adapted: a row, not a stamp; the stamp version is labelled RULE-BREAK: R14)
- Keep-list risk: K-11 (actions row unchanged); K-10 (own page keeps its layout; the strip shows on shared pages
  only).

### P-15: Sign-up ends with a receipt
- Addresses: F-13, F-19
- Change (account sheet):
  1. After "Create account", the sheet closes and the toast says "Account made. Check your email to confirm it.".
  2. The sign-in sheet's line under the title reads "Your cookbook stays on this device. An account adds publishing,
     and sync on Pro."
  3. The create sheet's line is unchanged.
- Why: a silent success reads as failure to someone new.
- Cost: S
- Rules: WITHIN RULES
- Origin: X-14 (adapted)
- Keep-list risk: none.

### P-16: Labels that say where and how many
- Addresses: F-16, F-17, F-24
- Change:
  1. Counts go through one plural helper ("Search 1 recipe…").
  2. The cookbook card reads "Resume baking" while a bake runs and "Last baked" after one is logged. "Pick up where you
     left off" is retired.
  3. The desktop landing line reads "No account. It stays on this device."
  4. Back labels name their destination and always go there. The profile's back returns to the page you came from
     and is labelled with it ("The BEST Cheesecake Recipe"); with no history, "Discover". Published's back follows
     the same rule.
  5. Signed-out Published offers "Sign in" and "Create an account".
  6. The phone 404 gets the avatar.
- Why: small slips that each cost a moment of doubt.
- Cost: S
- Rules: WITHIN RULES
- Origin: X-15 (adapted)
- Keep-list risk: K-6 (card label changes; contents kept); K-8 (one word changes on desktop only).

### P-17: Baking mode says where you are
- Addresses: F-15
- Change (baking mode, all widths):
  1. Under the progress line, the current part's name in `.ui-label` ("Cheesecake · step 4 of 9 in this part").
  2. The header counter reads "Step 4 of 11" at 15 px in `--ink-2`.
  3. In dark, the unlit segment lifts from `--rule-strong` to a 3:1 non-text contrast.
  4. No beads; the line stays the StepRow K-3 protects.
- Why: two bars for eleven steps look like a step counter and aren't one.
- Cost: S
- Rules: WITHIN RULES
- Origin: session (X-18's beads considered; not taken, because they replace the StepRow K-3 protects)
- Keep-list risk: K-3 (adds one label line; middle stays empty); K-15 (dark lifted, not recoloured).

### P-18: Backup comes first in Settings
- Addresses: F-22
- Change (Settings › Your cookbook):
  1. Export is the first row, with "Last exported: never" or a date beneath.
  2. The storage rows say "This browser may clear your cookbook if space runs low" and "Ask to keep it".
  3. "Server · Reachable" moves to the Account section.
- Why: on a device-only cookbook, export is the backup, and it sits under system terms.
- Cost: S
- Rules: WITHIN RULES (X-17's pencil reminder on the cookbook page is labelled RULE-BREAK: R14 and not taken)
- Origin: session; LB-8
- Keep-list risk: none.

### P-19: One search, in the same place, on every destination (RULE-BREAK)
- Addresses: F-20, F-10
- Change (w375): the page title and "203 recipes" leave the cookbook's header. The header row is the search field,
  growing on focus, with "New" and the avatar beside it. Bakes, Shop and Discover get the same field, scoped to
  themselves. w1280: the cookbook's page search goes; Ctrl K's top-bar search is the one search.
- Why: two searches on desktop and none on three phone destinations.
- Cost: M
- Rules: RULE-BREAK: R21 — a phone header layout the shell rule doesn't describe, and no page title; buys one
  findable search everywhere.
- Origin: X-19 (as written)
- Keep-list risk: K-6 (the search's count and the "Cookbook" title go); K-16 (page titles in Fraunces leave the four
  destinations on a phone).

### P-20: Plan backwards from dinner with a dial (RULE-BREAK)
- Addresses: F-11, F-26
- Change (recipe page, all widths): "Plan this bake" becomes a flat printed dial. Turn it to "on the table at 7 pm"
  and it prints "Start at 11:20 am", with chill hours shaded on the ring. With placeholder timings it says "Add times
  to plan this" and shows no start.
- Why: cooks plan backwards from a mealtime, and the planner's caveat becomes a single gesture.
- Cost: L
- Rules: RULE-BREAK: R19 — a bespoke control, not a row, button or segmented control; buys backward planning in
  one gesture.
- Origin: X-21 (as written)
- Keep-list risk: none named; it replaces a collapsed disclosure.
