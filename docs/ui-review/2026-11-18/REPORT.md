# UI review 2026-11-18: what to change and why

*2026-11-18 · branch `feat/drafts-owner-sync` @ `08728e0` · demonstration: [before and after](https://claude.ai/artifact/TiXPx9fx4SebjoYCrFxCKV) (private until you share it)*

## The short version
Five reviewers, two of them strangers walking the live app, found no blockers and 13 major problems. Most of the
majors are about the bake log not quite reaching the baker: on a phone, "Start cooking" sits below the first screen
(F-01); the log sheet puts its note under three other blocks and labels its close "Done" (F-04); the Journal hides
the "Next time" line whenever a bake also has notes (F-07); and By recipe doesn't number photo bakes (F-08). The
rest are stranger-facing: a browser bubble blocks saving a recipe with an empty row (F-02), scaled amounts print
"2.17 cup" (F-05), a shared recipe is a dead end (F-12), and the cheesecake claims 1 h 35 for an overnight cake
(F-11). After three checking rounds the plan is 19 within-rules proposals, all small or medium.

The biggest single win is **P-01**: "Last time" and "Start cooking" on the first phone screen, with a one-tap jump to
the ingredients. It ranked first, with three of the five reviewers placing it in their top four. All four
rule-breaking ideas were dropped by the reviewers, and their useful parts survive as within-rules proposals, so
nothing waits on your ruling. 10 claims were thrown out as artifacts, chiefly "200 blank recipe tiles", which was a
capture timing bug that is now fixed.

## The plan
*Ranked by the reviewers' final rankings (Borda count across the five round-3 top-10 lists: 10 points for 1st, 1 for
10th). Ties are broken by the highest severity addressed. Where severity also ties, the tie is shown. 19 proposals.
No rule-breaking proposal survived, so none is listed separately.*

| Rank | Proposal | Borda | Severity | Cost |
|---|---|---|---|---|
| 1 | P-01 Start cooking on the first phone screen | 27 | major | S |
| 2 | P-06 The log sheet leads with the writing | 23 | major | S |
| 3= | P-03 An honest "ready in" · P-07 Next time follows you · P-10 By recipe numbers every bake | 19 each | major (all three) | S |
| 6 | P-05 The phone editor opens on the recipe | 16 | major | M |
| 7 | P-17 Baking mode says where you are | 15 | minor | S |
| 8= | P-04 Empty rows vanish on save · P-13 Sort and filter by the search | 14 each | major (both) | S |
| 10 | P-24 "Ready by…?" as one line | 13 | major | S |
| 11 | P-16 Labels that say where and how many | 13 | minor | S |
| 12 | P-22 One recipe's bakes, read down the page | 12 | major | S |
| 13= | P-12 The cupboard says what it saved · P-14 Somewhere to go next | 10 each | major (both) | M |
| 15 | P-09 "Best" says which best | 9 | major | S |
| 16 | P-25 Search understands when | 9 | minor | S |
| 17 | P-08 Scaling prints kitchen measures | 7 | major | S |
| 18 | P-15 Sign-up ends with a receipt | 5 | major | S |
| 19 | P-18 Backup comes first in Settings | 5 | minor | S |

Full text of every proposal: [proposals-v3.md](proposals-v3.md).

### 1. P-01: Start cooking on the first phone screen
- **Change:** at w375, on both your own and shared recipes:
  - the hero is cropped to 16:10 with a focal point (never below 200 px), still plain and full-bleed;
  - the headnote clamps to two lines;
  - the "Private · this device" chip becomes words in the meta line;
  - the meta line adds the oven temperature when step 1 states one.
  - "Last time" is the first block after the meta line, followed by "Start cooking" (the one paprika key) and
    "Log a bake" (outlined).
  - Under the keys, an ink row "Ingredients ↓ · Method ↓" jumps to each.
  - The docked "Start cooking" keeps today's after-scroll behaviour. Acceptance: at 375×812, with P-07's line
    present, "Last time" and both keys sit above the tab bar.
  - w1280 is unchanged.
- **Why:** "Start cooking" begins at 845 px on an 812 px screen, and the first ingredient is further down (F-01;
  `verify__recipe-scrolled-375.png`, `mid-bake__regular-recipe__light__w375__fold.png`).
- **Raised by:** Mid-Bake (MB-1), Link Follower (LF-3) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | AMEND | AMEND | – | AMEND |
| 2 | ADOPT | ADOPT | ADOPT | – | ADOPT |
| 3 | ADOPT | ADOPT | ADOPT | – | ADOPT |

- **What changed across rounds:**
  - Round 1, Keeper: focal crop, "Last time" first, one filled key, ink jump controls.
  - Round 1, Mid-Bake: the first ingredient one tap away.
  - Round 1, Link Follower: the jump row in the actions area, and the oven temperature in the meta line.
  - Round 2: the merged P-21 dock guard and the 375×812 acceptance check.
- **Cost:** S · **Keep-list risk:**
  - K-1: kept first after the meta line.
  - K-17: smaller, but plain and full-bleed.
  - K-10: provenance stays as words.
  - K-18: one filled key.

### 2. P-06: The log sheet leads with the writing
- **Change:** in the log-a-bake sheet, at all widths:
  - the order becomes "What happened" first (focused), Stars (always visible), "Next time", "What I changed", then a
    compact Photographs row, then a closed "When · Mark as my best" disclosure.
  - Form sheets close with an × labelled "Close", not "Done".
  - "Dictate" grows to 44 px, and "Log this bake" stays the only paprika key.
- **Why:** a stranger couldn't tell whether "Done" saves or discards, and the note sits under three other blocks
  (F-04; `verify__log-sheet-375.png`).
- **Raised by:** First-Timer (FT-3) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | – | ADOPT | – | ADOPT |
| 2 | ADOPT | – | ADOPT | – | ADOPT |
| 3 | ADOPT | – | ADOPT | – | ADOPT |

- **What changed across rounds:** the Keeper asked that Stars stay visible and "Mark as my best" stay one tap away
  (round 1, written in for v2).
- **Cost:** S · **Keep-list risk:** K-18 (one paprika key); K-4 (the stamp stays reachable).

### 3= (tie). P-03: An honest "ready in" on the recipe header
- **Change:** at all widths, own and shared:
  - the meta line keeps "Prep · Cook";
  - when a step names a wait of 4 hours or more, it adds a separate trailing item ("Chills overnight"), never a sum;
  - nothing is added for placeholder-only timings.
  - The planner caveat becomes "Some step times are guessed.", with the detail behind a tap.
- **Why:** the cheesecake header reads "Prep 20 min · Cook 1 h 15", while the method needs 1–2 hours cooling and an
  overnight chill (F-11, F-26; Link Follower step 1.4, `verify__bake-step10-375.png`).
- **Raised by:** Link Follower (LF-1), First-Timer (FT-9) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | ADOPT | ADOPT | – | AMEND |
| 2 | ADOPT | ADOPT | ADOPT | – | ADOPT |
| 3 | ADOPT | ADOPT | ADOPT | – | ADOPT |

- **What changed across rounds:** per the Keeper, the item is trailing and never summed, and holds one wrapped line at
  375 px.
- **Cost:** S · **Keep-list risk:** K-10, kept.

### 3= (tie). P-07: What you wrote for next time follows you
- **Change:**
  - Journal rows: "Next time: …" always keeps its line, in pencil, inside a three-line quote block, and "What happened"
    takes what's left.
  - The recipe's "Last time" card gains one clamped "Changed: …" line when the bake has one.
- **Why:** a Journal row prints "Next time" only when there are no notes (`BakesPage.tsx:259`), so the line a baker
  most needs disappears. "What I changed" is captured but shows only in the detail sheet (F-07, F-29;
  `mid-bake__regular-bakes-journal__light__w375__fold.png`).
- **Raised by:** Mid-Bake (MB-6, MB-10) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | – | ADOPT | – | AMEND |
| 2 | ADOPT | – | ADOPT | – | ADOPT |
| 3 | ADOPT | – | ADOPT | – | ADOPT |

- **What changed across rounds:**
  - Mid-Bake: "Next time" always survives the clamp.
  - Keeper: growth capped, and pencil on one line only. It ships with P-01 under the acceptance check.
- **Cost:** S · **Keep-list risk:** K-4 (at most one more line); K-1 (one line, only when it exists).

### 3= (tie). P-10: By recipe numbers every bake
- **Change:**
  - Every tile carries "Bake n", in the date slot, so tile height doesn't change.
  - On a phone the row opens scrolled to the newest bake.
  - The sparkline is labelled, or replaced by "3★ every time" when flat. The flat test sits beside the R11 tie rule.
  - Compare columns are headed "Bake 2 · Sep 11".
- **Why:** photo tiles show only a date, so you can't tell which attempt a photo is, and bakes 3–5 are off-screen on
  a phone (F-08, F-27; `mid-bake__regular-bakes-by-recipe__light__w375__fold.png`).
- **Raised by:** Mid-Bake (MB-7, MB-8) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | – | – | ADOPT | – | ADOPT |
| 2 | – | – | ADOPT | – | ADOPT |
| 3 | – | – | ADOPT | – | ADOPT |

- **What changed across rounds:**
  - Keeper caution (round 1): heading, count and Compare stay in place.
  - Provocateur's flat test (round 2).
- **Cost:** S · **Keep-list risk:** K-5. The strip is kept and numbers are added, which K-5 itself asked for.

*P-03, P-07 and P-10 each scored 19 and each addresses a major finding. They are shown as a tie.*

### 6. P-05: The phone editor opens on the recipe, not on the tools
- **Change:**
  - "Write it" opens without the import disclosure; the other two empty-cookbook doors open it.
  - Phone header:
    - Back and Save, plus "Tidy up" for imported recipes;
    - for hand-written recipes, "Tidy up" moves into ⋯;
    - the desktop header is unchanged.
  - "More details" starts closed, showing its summary, and empty times show only "min".
  - The phone order is Title, the two-line "A line about it", "Ingredients · Method" jump chips, Ingredients, Method,
    Photographs, More details.
  - Drafts:
    - "Draft kept" appears in the header once something changes;
    - leaving shows the toast "Draft kept · Discard";
    - the recipe page shows an "Unsaved draft · Open" row below the keys.
- **Why:** "Write it" opens a screen that reads as import tool and blank page at once, with Prep 30 and Cook 60
  placeholders that look like values (F-03; `first-timer__stranger-new-recipe__light__w375__fold.png`). Edits are
  kept as drafts, but nobody is told (F-14; `verify__editor-draft-375.png`).
- **Raised by:** First-Timer (FT-2), Librarian (LB-5, LB-6) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | – | ADOPT | AMEND | AMEND |
| 2 | ADOPT | – | ADOPT | ADOPT | ADOPT |
| 3 | ADOPT | – | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:**
  - Librarian: "Tidy up" stays visible for imports, plus the jump chips.
  - Keeper: the desktop header, summary line, two-line rows, paste hint and three doors are all kept.
  - Mid-Bake: the draft row sits below the keys.
- **Cost:** M · **Keep-list risk:** K-12 (desktop unchanged); K-9 (doors kept).

### 7. P-17: Baking mode says where you are
- **Change:**
  - One `.ui-label` line under the progress line: "Cheesecake · step 4 of 9 in this part".
  - The header reads "Step 4 of 11" in ink-2 at 15 px.
  - The dark unlit segment lifts to a 3:1 warm neutral.
  - No new keys, and the middle stays empty.
- **Why:** two bars for eleven steps read as a step counter and aren't one (F-15; First-Timer step 4.1,
  `mid-bake__regular-baking-mode__dark__w375__fold.png`).
- **Raised by:** Mid-Bake (MB-3, MB-4), First-Timer (FT-7) · **Severity addressed:** minor
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | – | ADOPT | – | AMEND |
| 2 | ADOPT | – | ADOPT | – | ADOPT |
| 3 | ADOPT | – | ADOPT | – | ADOPT |

- **What changed across rounds:** the Keeper limited it to one label line and a warm neutral, with no new keys.
- **Cost:** S · **Keep-list risk:** K-3 (one line); K-15 (lifted, not recoloured).

### 8= (tie). P-04: Empty rows vanish on save
- **Change:**
  - Native `required` goes from ingredient and step rows.
  - Empty rows are dropped on save, with the toast "Saved · 2 empty rows removed" and Undo.
  - Only a missing title blocks saving, with "Give it a title to save it." under the field.
- **Why:** a blank row blocks saving with the browser's own "Please fill out this field." bubble, against R9 (F-02;
  First-Timer step 3.3, `RecipeEditor.tsx:724`).
- **Raised by:** First-Timer (FT-1) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | – | ADOPT | ADOPT | ADOPT |
| 2 | ADOPT | – | ADOPT | ADOPT | ADOPT |
| 3 | ADOPT | – | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:** none. It was adopted as filed.
- **Cost:** S · **Keep-list risk:** none.

### 8= (tie). P-13: The cookbook's sort and filter sit by the search
- **Change:**
  - **Phone:** a "Sort and filter" icon button beside the search field, shown from two recipes on. It opens the
    Filter sheet with Sort first. A dot and a "Rating · Dessert · Clear" line show active state. Grid / List stays
    at the grid. Phone tiles get two-line titles.
  - **Contents:** shows 5 chapters plus "All chapters", with Loose notes as its own row; a chapter tap filters the
    grid in place.
  - The cookbook's order is unchanged.
- **Why:** on a phone, Filter sits about 1,320 px down, below the resume card, Recently baked and the whole chapter
  list (F-10, F-21, F-23; `verify__filter-375.png`).
- **Raised by:** Librarian (LB-1, LB-3, LB-9) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | AMEND | – | ADOPT | AMEND | AMEND |
| 2 | ADOPT | – | ADOPT | ADOPT | ADOPT |
| 3 | ADOPT | – | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:**
  - Librarian: the active state, Grid/List at the grid, and chapters filtering in place.
  - First-Timer: no button with one recipe.
  - Keeper: order and faces kept.
- **Cost:** S · **Keep-list risk:** K-6 (order and count kept); K-16.

*P-04 and P-13 each scored 14 and each addresses a major finding. They are shown as a tie.*

### 10. P-24: "Ready by…?" as one line
- **Change:**
  - The "Plan this bake" head becomes "Ready by 7 pm? Start at 11:20 am": a time `Field` with the answer in plain text.
  - It counts only the waits the method states, and placeholder-only recipes read "Add step times to plan this".
  - It works on the shared page before saving.
  - It sits below the keys and the jump row, with no paprika.
- **Why:** cooks plan backwards from a mealtime, and the current caveat is a sentence beginners skip (F-11, F-26;
  First-Timer step 3.4).
- **Raised by:** Link Follower (LF-1), First-Timer (FT-9) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | new in v2 | | | | |
| 2 | ADOPT | ADOPT | ADOPT | – | ADOPT |
| 3 | ADOPT | ADOPT | ADOPT | – | ADOPT |

- **What changed across rounds:**
  - Built in v2 from the Link Follower's and the Keeper's amendments to the rejected dial (P-20).
  - Round 2: Mid-Bake and Keeper placement checks.
- **Cost:** S · **Keep-list risk:** K-10 (meta line untouched).

### 11. P-16: Labels that say where and how many
- **Change:**
  - One plural helper ("Search 1 recipe…").
  - "Resume baking" and "Last baked" replace "Pick up where you left off", in the same slot.
  - The desktop landing reads "It stays on this device."
  - Back labels name their destination and go there.
  - Signed-out Published offers "Create an account".
  - The phone 404 gets the avatar.
  - A unit test covers the plurals and back labels.
- **Why:**
  - Copy slips: the "Pick up where you left off" card on a finished bake, "Search 1 recipes", and "phone" on desktop
    (F-16).
  - Back labels that don't go where they say (F-17).
  - The phone 404 missing its avatar (F-24).
  - Evidence: `Dashboard.tsx:210, 438`, `Profile.tsx:82`.
- **Raised by:** First-Timer (FT-5, FT-6, FT-8), Link Follower (LF-6, LF-11, LF-12), Librarian (LB-10) · **Severity
  addressed:** minor
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | ADOPT | ADOPT | ADOPT | AMEND |
| 2 | ADOPT | ADOPT | ADOPT | ADOPT | ADOPT |
| 3 | ADOPT | ADOPT | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:**
  - Keeper: same slot and weight, phone landing untouched.
  - Link Follower: truncation of back labels.
  - Provocateur: the unit test.
- **Cost:** S · **Keep-list risk:** K-6, K-8 (labels only).

### 12. P-22: One recipe's bakes, read down the page
- **Change:**
  - In By recipe, the recipe heading opens the Journal narrowed to that recipe (`?recipe=`), oldest to newest.
  - Rows are numbered "Bake 1…5", use the P-07 quote block, and keep Compare at four taps or fewer.
  - The strip is untouched, and no new primitive is needed.
- **Why:** reading one recipe's attempts on a phone means scrolling a sideways strip, and the Journal interleaves
  recipes (F-08, F-28).
- **Raised by:** Mid-Bake (MB-7, MB-9) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | new in v2 | | | | |
| 2 | – | – | ADOPT | – | ADOPT |
| 3 | – | – | ADOPT | – | ADOPT |

- **What changed across rounds:**
  - Built in v2 from Mid-Bake's and the Keeper's amendments to the rejected ladder (P-11).
  - Compare added in v3.
- **Cost:** S · **Keep-list risk:** K-5 (untouched); K-4.

### 13= (tie). P-12: The cupboard says what it saved you
- **Change:**
  - "Add from a recipe" becomes multi-pick, with one key reading "Add 3 recipes".
  - The toast reads "Added 15 · 4 already in your cupboard".
  - A muted "4 already in your cupboard ›" row folds open to the skipped names only, as ink chips that add back.
  - "Nothing to buy." is said once, and quick-add is unchanged.
- **Why:** live, adding three recipes skipped Eggs and Flour silently and took six taps (F-09;
  `verify__shop-filled-375.png`).
- **Raised by:** Librarian (LB-7) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | – | – | ADOPT | AMEND | AMEND |
| 2 | – | – | ADOPT | ADOPT | ADOPT |
| 3 | – | – | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:**
  - Librarian: a count with a fold-out instead of a wall of chips.
  - Keeper: quick-add unchanged, ink chips, hidden when nothing was skipped.
- **Cost:** M · **Keep-list risk:** K-14 (controls unchanged; the empty state becomes one line, as K-14 describes).

### 13= (tie). P-14: A shared recipe has somewhere to go next
- **Change:**
  - The credit becomes a whole-row ink link ("@proof · Proof Kitchen ›").
  - "More from @proof" (up to 3 tiles) sits at the foot of the page, only when there are others.
  - Save shows "Saved to your cookbook · Undo".
  - There is no sign-up prompt.
- **Why:** a stranger's only door ends in a dead end, the credit is small grey text, and saving happens without a
  word (F-12, F-18; `link-follower__stranger-shared-link__light__w375__fold.png`, `RecipeViewer.tsx:257`).
- **Raised by:** Link Follower (LF-4, LF-5, LF-7) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | – | ADOPT | ADOPT | – | AMEND |
| 2 | – | ADOPT | ADOPT | – | ADOPT |
| 3 | – | ADOPT | ADOPT | – | ADOPT |

- **What changed across rounds:** the Keeper asked for foot placement, an ink credit, and no sign-up prompt (R3, R26).
- **Cost:** M · **Keep-list risk:** K-11 (actions row untouched); K-10.

*P-12 and P-14 each scored 10 and each addresses a major finding. They are shown as a tie.*

### 15. P-09: "Best" says which best
- **Change:**
  - The summary reads "top rated: Braised stuffed cabbage", under the same R11 rules.
  - The stamp keeps its shape and ring and reads "My best ★3".
- **Why:** "best: Braised stuffed cabbage" and a "Best ★3" stamp on a cheesecake bake sit on one screen and mean
  different things (F-06; `mid-bake__regular-bakes-journal__light__w375__fold.png`).
- **Raised by:** Mid-Bake (MB-5) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | – | – | ADOPT | – | AMEND |
| 2 | – | – | ADOPT | – | ADOPT |
| 3 | – | – | ADOPT | – | ADOPT |

- **What changed across rounds:** the Keeper asked to keep the stamp's shape and ring and the tie rule.
- **Cost:** S · **Keep-list risk:** K-4 (reworded only).

### 16. P-25: Search understands when
- **Change:**
  - A month or season in a cookbook search also matches bakes by date.
  - Hits are headed with the months matched ("Baked Jun–Aug 2026").
  - Without a date word, search is unchanged.
- **Why:** "that rye loaf from the summer" is how a baker remembers, and live "summer" returns nothing (F-20;
  `verify__search-rye-375.png`).
- **Raised by:** Librarian (scenario 1) · **Severity addressed:** minor
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | new in v2 | | | | |
| 2 | – | – | ADOPT | ADOPT | ADOPT |
| 3 | – | – | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:** new in v2. In v3 it names the months matched, for the hemisphere.
- **Cost:** S · **Keep-list risk:** K-6 (unchanged).

### 17. P-08: Scaling prints kitchen measures
- **Change:**
  - Scaled amounts snap to kitchen fractions within 5%.
  - Otherwise they print the gram figure ("about 184 g"), or one decimal.
  - "½×" and "2×" sit as a `Segmented` control beside the stepper.
- **Why:** at 13 servings the cheesecake prints "2.17 cup", "7.58 tbsp" and "34⅔ oz" next to "1⅛ tbsp" (F-05;
  `verify__servings-13-375.png`).
- **Raised by:** Link Follower (LF-2) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | – | ADOPT | ADOPT | – | ADOPT |
| 2 | – | ADOPT | ADOPT | – | ADOPT |
| 3 | – | ADOPT | ADOPT | – | ADOPT |

- **What changed across rounds:** the Keeper made the presets `Segmented`, never paprika.
- **Cost:** S · **Keep-list risk:** none.

### 18. P-15: Sign-up ends with a receipt
- **Change:**
  - After "Create account", a toast says what happened, and mentions the confirmation email only when the server
    reports one was sent.
  - The sign-in line reads "Your cookbook stays on this device. An account lets you publish, and sync on Pro."
- **Why:** a successful sign-up closes the sheet in silence (F-13, `AccountSheet.tsx:84`). The sign-in line says only
  "Stored on this device." (F-19).
- **Raised by:** Link Follower (LF-8, LF-9) · **Severity addressed:** major
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | – | AMEND | ADOPT | – | ADOPT |
| 2 | – | ADOPT | ADOPT | – | ADOPT |
| 3 | – | ADOPT | ADOPT | – | ADOPT |

- **What changed across rounds:** the Link Follower asked that the toast never promise an email that may not come.
- **Cost:** S · **Keep-list risk:** none.

### 19. P-18: Backup comes first in Settings
- **Change:**
  - Export is the first row of "Your cookbook", with "Last exported: never" in muted ink.
  - The storage rows are said in plain words.
  - "Server · Reachable" moves to Account.
- **Why:** on a device-only cookbook, export is the backup, and it sits under "Kept when space runs low · Not
  promised" (F-22; `librarian__regular-settings__light__w375__text.txt`).
- **Raised by:** Librarian (LB-8) · **Severity addressed:** minor
- **How the reviewers voted:**

| Round | First-Timer | Link Follower | Mid-Bake | Librarian | Keeper |
|---|---|---|---|---|---|
| 1 | ADOPT | – | ADOPT | ADOPT | ADOPT |
| 2 | ADOPT | – | ADOPT | ADOPT | ADOPT |
| 3 | ADOPT | – | ADOPT | ADOPT | ADOPT |

- **What changed across rounds:** none of substance.
- **Cost:** S · **Keep-list risk:** none.

## Needs your ruling: proposals that break a rule
*None survived. All four rule-breaking proposals were dropped in checking (see Dropped). Their useful parts live on
as within-rules proposals P-01, P-22 and P-24, and as P-23 (open question 1).*

| P-ID | Breaks | What the break buys | Reviewer support (round 3) | Origin |
|---|---|---|---|---|
| none | | | | |

One labelled rule-break arrived after the last revision round. It is listed under Open questions rather than here,
because no reviewer voted on it.

## Keep list
*What the Keeper established must survive, and which proposals were amended to protect it.*

| K-ID | What works | Fragile because | Protected by |
|---|---|---|---|
| K-1 | "Last time" panel under the recipe title | Collapsing it or pushing it down | P-01 (stays first after the meta line), P-05 (draft row below the keys), P-07 (one clamped line) |
| K-2 | Two-pane desktop recipe | One-column consolidation | P-01 (w1280 unchanged) |
| K-3 | Baking mode's one step, one Next | Filling the empty middle | P-17 (one label line, no new keys) |
| K-4 | Journal rows: plate, note, stars, Best stamp | Dropping notes, best on ties | P-07 (capped growth), P-09 (stamp kept, R11 kept), P-06 (stamp one tap away) |
| K-5 | By recipe strip | Replacing or merging it | P-10 (numbers added), P-22 (adds a view, strip untouched); P-11 dropped for harming it |
| K-6 | Resume card, Recently baked, Contents, real-count search | Reordering, losing the count | P-13 (order kept), P-16 (label in same slot), P-25 |
| K-7 | Four-destination shell | Fifth tab, paprika tab, chrome in baking | P-23's desktop half revised to keep one shell; P-19 dropped for harming it |
| K-8 | Landing promise and one key | Sign-up wall, second key | P-16 (phone line untouched) |
| K-9 | Empty cookbook's three doors and starters | One paprika "Add" key | P-05 (doors route to their own starts) |
| K-10 | Meta line prints real times; provenance chip | Placeholder totals | P-01 (provenance as words), P-03 (trailing item, never summed), P-24 |
| K-11 | Shared page's single Save key | Filled secondaries, gating | P-14 (actions row untouched), P-01 |
| K-12 | Editor with live preview, one Save | Losing the preview, second filled key | P-05 (desktop header, summary, rows, hint kept), P-04 |
| K-13 | Account sheet, four rows | Re-adding items | P-15 (a toast, not a page) |
| K-14 | Shop's quick-add and segmented control | Replacing quick-add, padding the empty state | P-12 (controls unchanged, one-line empty state) |
| K-15 | Dark baking mode | True black, failing contrast | P-17 (lifted to a warm neutral, not recoloured) |
| K-16 | Type system | Swapping faces | P-13 (sheet keeps Fraunces); P-19 dropped for harming it |
| K-17 | Plain photographs | Overlays, thumbnails | P-01 (focal crop, still plain and full-bleed); P-02 dropped for harming it |
| K-18 | One paprika key per screen | Highlighting weak actions | P-01, P-06, P-08, P-12, P-14, P-24 (each states its single filled key or "no paprika") |

**Keep items a verified finding contradicts:**
- K-14 claims "Nothing to buy." once, but it prints twice (F-09).
- K-6's search count prints "Search 1 recipes" (F-16).
- K-6's "Pick up where you left off" also labels a finished bake (F-16).
- K-5's photo tiles carry no number (F-08).

The plan resolves all four (P-12, P-16, P-10).

## Dropped
- **P-02, index card (RULE-BREAK: R7).** Rejected in both rounds by the First-Timer, Link Follower, Mid-Bake and
  Keeper: it costs the photo (K-17), and P-01 does the job.
- **P-11, vertical ladder (RULE-BREAK: R20).** Rejected twice by the Keeper (K-5). Mid-Bake asked to withdraw it for
  P-22.
- **P-19, one search field per destination (RULE-BREAK: R21).** Rejected in both rounds by the First-Timer, Link
  Follower, Mid-Bake and Keeper: it removes page titles (K-6, K-7, K-16). Replaced by P-23.
- **P-20, planning dial (RULE-BREAK: R19).** Rejected in both rounds by the First-Timer, Mid-Bake and Keeper: an
  L-cost bespoke control. Replaced by P-24.
- **P-21, docked key from the first frame.** Merged into P-01 as a guard after all three voters amended it back to
  today's behaviour.
- **P-23, search key on Bakes and Shop and one desktop search.** Not dropped, but not in the plan. See open
  question 1.

## Excluded findings
10 claims were capture or stand-in artifacts, or didn't survive verification, and were removed before round 1
closed. 4 were removed whole and 6 in part.

| Reviewer ID | Claimed | Why it's an artifact |
|---|---|---|
| LB-2 | 200 of 203 grid tiles are blank squares | Capture timing: the page shot stretched the page before lazy images loaded. Live, 16 of 16 plates in view loaded (`verify__grid-1280.png`). `capture.spec.ts` now waits for them. |
| MB-2 | No way to log a bake from baking mode | The shot was step 1. The last step's key is "How did it go?" and the ⋯ menu has "Finish and log". |
| MB-3 (part) | No timers or step ingredients | Step 1 has neither. Timed steps show timer chips, and step 5 shows "You need" (`verify__bake-step10-375.png`). |
| MB-4 (part) | "1 of 11" too dim in dark | `--ink-muted`, which the contrast test holds at 4.5:1. |
| LB-9 (part) | "Untitled " glued to typed titles | The title starts blank. "Untitled fhgfhgfNote" is junk in the live data. |
| LB-10 (part) | 404's back is a web link | It's a ghost `Button`. |
| LF-9 (part) | Avatar shows "NB" | The stand-in server's fixed account, "New Baker". |
| LF-13 | Console errors | socket.io belongs to the stand-in server, and the manifest error is dev noise. The CORS block is the photo-adopt fallback working as designed. |
| LF-10 | First Share tap did nothing | Couldn't be reproduced or told apart from a slow sheet. Not a blocker. |
| LB-11 | Recipe page unread | Not a finding: a screen outside the reviewer's area. |

## Open questions
1. **P-23 (search key on Bakes and Shop; one search on desktop) fell one condition short.**
   - The phone half is uncontested.
   - Its desktop half changed in v3 to meet the Keeper: one shell, one Ctrl K, and the cookbook's page field hidden
     from `md` up.
   - That cost the Librarian's ADOPT. A palette is a jump list, so a query no longer narrows the grid. The Librarian's
     amendment, a last palette row "See all N results in the cookbook" that opens the narrowed grid, arrived in the
     ratification round and couldn't be applied.
   - Borda 7. **Your call:** take the phone half now, and decide the desktop half with that amendment.
2. **An unvoted rule-break from the Provocateur (RULE-BREAK: R11).** Once "Ready by" is set, every step would print its
   own clock time ("11:20 Start", "12:35 Into the oven"), and baking mode would show the same. It buys the whole day
   laid out from one input; the break is printing times computed from durations. It arrived after the last revision
   round, so no reviewer voted on it.
3. **Imported and untidy recipes can't be found.** The Librarian asked twice for a way to find recipes that need
   tidying (an "Imported" filter, or the word in search). It has no ledger finding behind it, so no proposal answers
   it. It's a candidate for a follow-up run.
4. **Left out on purpose:**
   - F-25: no units or °F setting; the First-Timer looked for it.
   - F-28: the Journal interleaves recipes; P-22 answers most of it.
   - The first half of LF-6: a direct arrival at a shared link labels its back "Discover", which is where it goes.
5. **Smaller "too timid" calls from the Provocateur, none voted on:**
   - P-17 could draw one segment per step instead of adding a label line.
   - P-04 could save an untitled recipe as "Untitled recipe".
   - P-18 could print "not backed up" on the Bakes summary line.

## How this review ran
- **Capture:** 22 screen states, 56 shots, at w375 and w1280. Light everywhere; dark on the landing, shared link,
  recipe, baking mode, Bakes journal and cookbook. Capture problems found and fixed first:
  - **The screen list was stale.** Gallery, Analytics, Grocery, Pantry and the phone menu were replaced by Bakes
    (two views), Shop (two views), Published, sign-up and the account menu.
  - **A selector was stale.** The landing's step looked for a renamed button.
  - **Six folds were skeletons.** The capture now waits for the route's loading state to clear.
  - **A seventh problem was found in verification.** Lazy images were blank in page shots; the capture now waits
    for them after the stretch.
- **Reviewers (Sonnet):**
  - First-Timer and Link Follower: live walkthroughs, one after the other;
  - Mid-Bake Baker and Librarian: the screenshot set, plus 10 live checks the session ran;
  - Keeper: every screen (18 keep items);
  - Provocateur: the verified ledger.
- **Rounds:**
  - findings → verification: 44 raised, 29 ledger entries (13 major, 16 minor), 10 claims excluded;
  - provocations: 22, of which 4 were filed as rule-breaks and 3 relabelled by the session;
  - three checking rounds: 20 → 25 → 20 proposals; 19 in the plan.
- **Files:** `BRIEF.md`, `RULES.md`, `agents.md`, `round-1/`, `ledger.md`, `provocations.md`, `proposals-v1..3.md`,
  `check-1..3/`, `demo.html`.
