> Verbatim reviewer output from the 2026-10-21 audit. Read [AUDIT_REPORT.md §1](../AUDIT_REPORT.md#capture-problems-found-and-corrected-during-the-audit) first: findings about Discover showing only an offline error, blank tiles low on the desktop dashboard, a short desktop sidebar, or bake photos identical to the recipe photo come from the capture, not the app.

# Familiar user (home baker, months of use, 203 recipes)

## Headline
I know where everything is, and I still spend my time scrolling past decoration to reach the three things I actually use: find a recipe, read the ingredients, log the bake. The cookbook screen opens on a 14-pill category strip, then two "smart shelves" that repeat the same cheesecake twice, then a 48-tile wall. The recipe page makes me scroll past a title, a paragraph, four seven-segment readouts, two dead grey boxes, and a publish-status bank before I see a single ingredient. My iteration history, the reason I use Proof, is a second tab labelled "Previous makes (5)", and the Gallery shows half my bakes as blank grey squares. A cookbook look should put the ingredients and my last attempt's notes on the first screen of a recipe. It should make search the front door, and take away the shouting all-caps mono labels.

## Findings
| # | Screen | Finding | Evidence (screenshot file) | Severity | Suggested change |
|---|---|---|---|---|---|
| 1 | Cookbook | The first phone screen is title, count, search, a shuffle icon with no label, a category strip clipped at "VEGETARIAN..", then "PERSONAL BESTS". About 40% of the screen is chrome before any recipe I'd choose. | regular-01-dashboard__dark__w375__fold.png | major | Search first, with recent bakes directly under it. Category becomes a sheet or a section index, not a clipped scroller. |
| 2 | Cookbook | The same recipe appears three times in the first screens: Personal Bests (cheesecake), Recently Baked (cheesecake again), then the main grid. The text shows "THE BEST CHEESECAKE RECIPE" 3x, and Prawn Stir-Fry and Braised Cabbage twice. | regular-01-dashboard__dark__w375__text.txt | major | One "Bake again" row (recent, with last rating and date). A personal best is a badge on the tile, not its own shelf. |
| 3 | Cookbook | Recent-bake dates are on the tile as "3D AGO", "1W AGO", "2MO AGO". That's useful, but it is tiny all-caps mono, and there is no rating or "what I changed last time". | regular-01-dashboard__dark__w375__text.txt | minor | Show "Last baked 3 days ago, 4 stars" in plain sentence-case text. |
| 4 | Cookbook | 48 tiles per page, then "SHOW 48 MORE". Tile titles truncate ("THE BEST CHEESECAK..."). In a 203-recipe book there is no A-Z index and no alphabet jump. | regular-01-dashboard__dark__w375__text.txt; regular-01-dashboard__dark__w375__fold.png | major | Offer a list view with an A-Z rail, and a grid view with the full title wrapped to 2 lines. |
| 5 | Cookbook | The category strip carries counts "(44)". Category "MISCELLANEOUS (4)" and "STARTER (3)" are noise. The strip is 14 pills in a row, and I can't see them all. | regular-01-dashboard__dark__w375__text.txt | minor | Show 5-6 categories, plus "All categories". |
| 6 | Cookbook | The red floating "+" sits on top of the recipe photos and covers a tile's image corner on every scroll. It appears on every screen, including Gallery and Discover (greyed there). | regular-01-dashboard__dark__w375__fold.png; regular-12-discover__dark__w375__fold.png | major | Put "New recipe" in the header or the search bar. Drop the FAB. |
| 7 | Recipe | Before the ingredients I scroll past the title (3 lines), a description paragraph (5 lines of mono), 4 readouts, a photo, tags, two empty dark squares (the step row, with no labels at 375), the LOCAL/LIVE/EDITS bank, and a Publish button. | regular-02-recipe__dark__w375__page.png | blocker | The first screen after the title is the ingredients. Move publish state to the "..." menu. |
| 8 | Recipe | The two blank grey squares at 375 are the phase "keys". They have no label at phone width, so I can't tell what they do. On desktop they are labelled "COOK / FINISH" only. | regular-02-recipe__dark__w375__page.png; regular-02-recipe__dark__w1280__fold.png | major | Remove the step row from the recipe page, or make it a labelled outline of the method. |
| 9 | Recipe | Every ingredient row prints "Not in your pantry". The text file shows it nine times for nine ingredients. I haven't tracked a pantry, so this is 100% noise. | regular-02-recipe__dark__w375__text.txt | major | Show the pantry marker only when a pantry exists and the ingredient is in stock. Absence is not a message. |
| 10 | Recipe | The ingredient quantities are odd. "0.51 fl oz brown sugar", "0.13 tsp salt", "0.67 cup sour cream", and names with doubled parentheses such as "graham cracker crumbs ((170g))" and a footnote "cream cheese²". A baker can't measure 0.51 fl oz. | regular-02-recipe__dark__w375__text.txt | major | Convert to friendly fractions (1/2 oz, 1/8 tsp, 2/3 cup), show the weight as a second column, and clean the data. |
| 11 | Recipe | The method has a "--- Cheesecake ---" line as step 04. It is a section heading imported as a step. Steps are broken, e.g. "50-\n60 minutes" and "for \n10 minutes". Many steps carry "READ MORE", which hides text I need while my hands are wet. | regular-02-recipe__dark__w375__text.txt | major | Render "---X---" lines as group headings. Never truncate a step. Show timers as inline chips on a unit, not by splitting lines. |
| 12 | Recipe | Seven-segment readouts show TOTAL "1:35 HR", PREP "20 MIN", COOK "1:15 HR", SERVES "12". These are quick to scan but the digits look like "1:35" with a ghost "8" behind it. At 375 the readout wraps oddly (TOTAL above and PREP offset). | regular-02-recipe__dark__w375__fold.png | minor | Plain text row: "Prep 20 min · Cook 1 h 15 · Serves 12". |
| 13 | Recipe | "RECIPE | PREVIOUS MAKES (5)" is a tab. My attempt history is hidden behind it, and START RECIPE (red) is the only strong element, so it competes with the log. | regular-02-recipe__dark__w1280__fold.png | major | Always show a "Your bakes" strip (last attempt, rating, note) right under the title. START is a quiet primary. |
| 14 | Recipe | At 375, the recipe actions (Share, Favorite, Edit) hide behind a vertical "..." menu. At 1280 they are labelled buttons. I have to remember which is where. | regular-02-recipe__dark__w375__fold.png vs w1280 | minor | One consistent action cluster: Start, Share, Edit. |
| 15 | Baking mode | The step is huge, which is good. The head shows a bluetooth icon, a list icon, and a "SHOW ALL" button; none carries a label except "SHOW ALL". There is no timer, no ingredient list and no note field visible on screen. | regular-03-baking-mode__dark__w375__fold.png | major | Add a labelled "Ingredients" button, plus a persistent "Notes" button to jot while baking. Hide the bluetooth icon unless a scale is paired. |
| 16 | Baking mode | The phase keys are red/olive rectangles with a label "COOK — NOW". Red means "now", so the bright red square on a 12-step recipe tells me nothing beyond "you are in phase 1". About 22% of the screen goes to this. | regular-03-baking-mode__dark__w375__fold.png | major | A thin progress bar "Step 1 of 12", with the phase name as text. |
| 17 | Baking mode | "BACK" is disabled grey and "NEXT" is white; the next button is 100% of the thumb zone, which is right. But "STEP 01 / 12" is tiny grey mono above a very large instruction, in a vast empty black area. | regular-03-baking-mode__dark__w375__fold.png | minor | Put the step counter and phase in a clear heading. |
| 18 | Log a bake | Logging is a modal from inside baking mode (list icon). I can't find a way to log from the recipe page without starting baking mode. | regular-02-recipe__dark__w375__fold.png | major | A "Log a bake" button on the recipe page, with date, rating, notes and photo in one sheet. |
| 19 | Gallery | Rows are by recipe, oldest-left, and I can see progress. That is the best iteration view in the app. But half the tiles are blank grey plates and the date text is clipped ("0" at the right edge). A horizontal scroll hides the 3rd to 5th bake. | regular-06-gallery__dark__w375__fold.png | major | Make this the "Your bakes" section of each recipe. Use a rating and a one-line note instead of a blank plate. |
| 20 | Gallery | Tile caption shows "01   AUG 30, 2026" with the number far from the date; no rating, no note snippet. | regular-06-gallery__dark__w375__fold.png | minor | Caption: "Bake 1 · Aug 30 · 4 stars · 'a little overbaked'". |
| 21 | Grocery | I pick recipes from a stacked wall of full-width mono buttons ("SPICY NORTH AFRICAN POTAT..", "KHOBZ EL DAR (ALGERIAN SE..") with a search box. The FAB overlaps the buttons. COPY LIST, DOWNLOAD, SHARE are 3 equal buttons wrapping to 2 lines. | regular-09-grocery__dark__w375__fold.png | major | "Add to list" from the recipe page itself. This screen then becomes the list only, with check-offs grouped by aisle. |
| 22 | Settings | Descriptions are long and written like manifesto copy ("the scene this was built for is a kitchen before dawn..."). 5 preferences are OFF/ON keys, no clear reading of their state beyond the label. Theme is a 3-key bank. | regular-11-settings__dark__w375__text.txt | minor | Short labels, one line each, a standard switch. |
| 23 | Navigation | Dock: Cookbook, Discover, Gallery, More. More holds Pantry, Analytics, Grocery, Notes, Settings, Account. Grocery and Pantry are weekly tools for me, and they take 2 taps. | regular-14-mobile-menu__dark__w375__fold.png | major | Dock of 5: Cookbook, Bakes, Shop, Discover, More. |
| 24 | Discover | At 375 the sort tabs wrap to two lines ("MOST / BAKED", "TOP / RATED", "A- / Z"), and the error panel fills the screen. The copy reads sensibly ("Your own cookbook works offline"). | regular-12-discover__dark__w375__fold.png | minor | Single-line sort as a dropdown. |
| 25 | Everywhere | All-caps, letter-spaced mono is used for every label, count, tab, button, and heading. It is the main source of visual noise; nothing in the UI is quiet. | all | major | Sentence case, one serif for recipes, one sans for UI. Capitals only for tiny section markers. |

## Loop-by-loop friction

### 1. "What am I baking this weekend?"
Steps today: open the app (lands on Cookbook) -> either (a) tap search and type, (b) tap a category pill (horizontal scroll to find it, up to 2 swipes), or (c) look at "Recently Baked" about 1.3 screens down. A "shuffle" icon sits beside search with no label.
Estimated effort: by name 2 taps, 0 scrolls (but the search field comes 270px down). By category 2-3 taps, 1-2 horizontal swipes, then 3-6 vertical scrolls. By "last bake" 0 taps, 1-2 scrolls.
Pain points:
- Smart shelves duplicate the main grid, and the same recipe appears 3 times.
- No "show only recipes I've actually baked" filter or sort (Last baked, Rating, A-Z).
- Titles truncate to "THE BEST CHEESECAK...".
- 48-tile paging with "Show 48 more" in a 203 book; no alphabet jump.

### 2. Open a recipe, scan ingredients at the counter (phone)
Steps today: tap tile -> scroll about 2 screens (title, paragraph, readouts, photo, tags, grey boxes, publish bank, tabs) -> tap "Scale" if needed -> read the ingredients.
Estimated effort: 1 tap, 3-4 scrolls to the first ingredient, 0 taps to read. The ingredients then span two lines per row with "Not in your pantry" between.
Pain points:
- Ingredients are below the fold on every phone.
- "Not in your pantry" repeated per row doubles the list length.
- Odd quantities (0.51 fl oz, 0.13 tsp).
- Scale control (0.5x-3x) sits under the heading, which is good, but I can't see the step I'm working on next to the ingredients.

### 3. Start a bake, follow steps and timers, log the result
Steps today: START (red FAB, bottom right) -> baking mode -> Next x12 -> tap list icon for ingredients (unlabelled) -> timers appear as inline chips and dock in the head -> finish -> log modal (notes, rating, photo) -> save.
Estimated effort: 1 tap to start, about 12 Next taps, 2-3 taps for the log modal fields, 1 to save; 0 scrolls in focus mode. 3 taps whenever I want ingredients.
Pain points:
- No notes during the bake; I remember things after I've forgotten them.
- The red FAB and the big red phase key both claim attention.
- "READ MORE" truncation of steps in the recipe view; "--- Cheesecake ---" appears as step 4.
- Unlabelled bluetooth and list icons.

### 4. Compare with previous attempts
Steps today: on a recipe tap "PREVIOUS MAKES (5)" -> pick a tile -> sheet opens with before/after. Or More -> ... wait, Gallery is in the dock: tap Gallery -> By Recipe -> find the row -> swipe sideways.
Estimated effort: via recipe 2 taps and 0-1 scrolls; via Gallery 1 tap, 1-3 scrolls and 1-2 horizontal swipes, then 1 tap to open a bake.
Pain points:
- History is a tab, so it's invisible when I open the recipe.
- Blank grey plates for bakes with no photo, with no rating or note on the tile.
- No side-by-side "what I changed between bake 3 and bake 4" view.

### 5. Edit a recipe after learning something
Steps today: recipe -> (phone) tap "..." -> Edit; (desktop) Edit button -> long single-scroll editor -> Save.
Estimated effort: 2 taps on phone, 1 on desktop, then 3-8 scrolls in a 16-ingredient editor.
Pain points:
- I can't edit a step while I'm looking at it; I have to leave the recipe.
- I would like "Save this as a note to my next bake" instead of rewriting the method.
- The lab note is under "LAB NOTES & ITERATIONS" below the ingredients, and it holds only the "Extracted from" URL.

### 6. Share or publish, then find it again
Steps today: recipe page -> Share (desktop) or "..." (phone) -> copy link/QR/PDF. But "Share" only gives a link if the recipe is published; otherwise PUBLISH in the LOCAL/LIVE/EDITS bank -> sheet -> sign in with an email-confirmed account -> publish. To find my published ones: profile `/@handle` (via Settings or Account), or the "LIVE" tag on tiles.
Estimated effort: share 3 taps; publish 4-6 taps plus signing in; finding later 3-4 taps with no dedicated "My published" list.
Pain points:
- A recipe that exists only on my device offers no link at all, which isn't obvious.
- The LOCAL/LIVE/EDITS bank takes 3 keys and a caption to say one thing.
- No "Published" filter on the cookbook.

### 7. Grocery list and pantry
Steps today: More -> Grocery List -> search for each recipe and tap -> list builds -> Copy/Download/Share. Pantry: More -> Pantry.
Estimated effort: 2 taps to get there, then 1-2 taps per recipe plus typing, 3+ scrolls through the recipe wall.
Pain points:
- No "add to grocery list" on the recipe page; only "COPY LIST" next to Ingredients.
- The recipe selector is a wall of full-width buttons.
- The pantry is hidden under More, and its per-row "Not in your pantry" shows on every recipe, so it makes noise even when I don't use it.

### 8. Find a setting, an old note, or analytics
Steps today: More -> Settings / General Notes / Analytics. Account is in More too.
Estimated effort: 2 taps each, 0-2 scrolls.
Pain points:
- Notes and Analytics are a drawer of 6 icons; I have to remember which icon is which.
- Settings copy is long; theme and storage are mixed with operator tools.
- Analytics with only 17 bakes shows a "not enough to read a trend" message, which is honest but a dead end.

## Daily annoyances
- The FAB covers the corner of tile photos and list buttons on every phone screen.
- "Not in your pantry" on every ingredient row.
- "READ MORE" on steps, when I want the whole step.
- A step like "--- Cheesecake ---" counts as a step in "STEP 04 / 12".
- Quantities such as 0.13 tsp and 0.51 fl oz.
- Truncated titles ("THE BEST CHEESECAK...") in the gallery and cookbook.
- The Gallery dates are cut off at the right edge ("0" instead of "03").
- Blank grey plates for bakes where I didn't take a photo.
- The shuffle icon beside search has no label; I forgot what it does after months.
- Unlabelled bluetooth/list icons in baking mode.
- All-caps mono everywhere makes headings and body text hard to tell apart.
- Sort pills wrapping to two lines in Discover.
- Seven-segment "ghost" digits are unreadable at a glance for times like 1:35.
- Desktop and phone place Share/Favorite/Edit differently.
- Having to leave baking mode to look at my previous notes.
- The red "Start" key and the red phase key look the same, so red stops meaning anything.

## What I'd lose if it changed
- **Bake log as the notebook**: the By Recipe rows (oldest to newest) are how I see progress; don't flatten them into a plain date feed.
- **Big step text in baking mode** with a huge NEXT; swipe, voice and wave navigation; screen stays awake.
- **Inline timers in steps** that survive a reload, and timers docked in the head.
- **Scale 0.5x-3x** under the ingredient heading, and Baker's %.
- **Personal Best** marking and "Recently baked" with relative dates.
- **Offline, local-first cookbook** with no account, and the zip export/import.
- **Fuzzy search** that forgives typos, and the folder/category filter.
- **Context-aware ingredients** shown with the current step.
- **Reverse bake scheduler** (eating time -> start time).
- **Before/after photo slider** and numbered "Make N" identity.
- **Light and dark themes**, 44px targets, no horizontal scroll.
- **Honest empty states** ("not enough to read a trend", "Your own cookbook works offline").
- Share by link, QR, PDF, and the "Adapted from @handle" attribution.

## What I want from a cookbook-style redesign
1. Recipe page order: title, one-line meta ("Prep 20 min · Cook 1 h 15 · Serves 12"), ingredients, then method; ingredients visible on the first phone screen.
2. A "Your bakes" strip under the title: last attempt's date, rating and one-line note, with a "Log a bake" button, always visible and not a tab.
3. Replace the seven-segment readouts, the step-row keys and the LOCAL/LIVE/EDITS bank with plain type; show publish state only in a menu or a small line ("Private" / "Published").
4. A serif for recipe titles and instructions and a quiet sans for UI; sentence case, no letter-spaced capitals.
5. A cookbook index: A-Z with a jump rail, categories as chapters, and a "Baked it" filter and sort (last baked, rating).
6. Search first on the cookbook screen, with one "Bake again" row (recent bakes), not three repeats of the same recipe.
7. A list view as well as the photo grid, with full titles and a thumbnail; tiles show title (2 lines), last baked and rating.
8. Ingredients as a clean table: friendly fractions, weight in a second column, no per-row pantry text, tap-to-tick, and a visible "Add to grocery list" button.
9. Baking mode: a progress line ("Step 3 of 12 · Bake"), labelled Ingredients and Notes buttons, timers as a chip row, and a quick note field that saves into the bake log.
10. A "Log a bake" sheet reachable from the recipe page, baking mode and the cookbook: date, rating (stars), photo, notes, and "what I'd change next time".
11. A side-by-side "this bake vs last bake" view (photo, rating, notes, changes), reached from the recipe page.
12. Notes and "what I learned" that pin to the recipe and surface when I next start it ("Last time: bake 5 minutes less").
13. Phone dock of Cookbook, Bakes, Shop, Discover, More; no floating button; "New recipe" in the header.
14. A "My published recipes" list under Settings/Profile and a "Published" filter in the cookbook; share gives a clear message when the recipe is private.
15. Clean imported data: convert "---X---" lines into headings, merge split numbers ("50-60 minutes"), tidy double parentheses, and show a step in full instead of "READ MORE".
16. Print-friendly recipe layout (one page, ingredients left, method right) with a "Print / PDF" button in plain view.
17. Warm paper-like light theme as the default feel (cream, ink, one accent), with a dark theme for the kitchen at night; use colour for one action per screen.

## Addendum — desktop walk
Viewed at 1280: regular-01 dashboard, 02 recipe, 03 baking mode, 04 editor, 06 gallery, 07 analytics, 08 pantry, 09 grocery, 10 notes, 12 discover, and stranger-05 shared link (dark). Not viewed this pass: regular-05, 13 and the light variants.
Per the coordinator, the clipped right edge, the short sidebar and the blank dashboard tiles in the long shots come from how the shots were un-clipped. I report none of them as findings.

### Desktop findings
| # | Screen | Finding | Evidence (screenshot file) | Severity | Suggested change |
|---|---|---|---|---|---|
| D1 | Recipe | Desktop is the good layout: ingredients left, method right. But they start about 690px down, under title, blurb, readouts, photo, tags, grey "COOK / FINISH" boxes, the LOCAL/LIVE/EDITS bank and the tab bar. On a counter laptop I still scroll before reading. | regular-02-recipe__dark__w1280__page.png | major | Photo and meta in a slim left column; ingredients and method begin at the top. |
| D2 | Recipe | The two grey "COOK / FINISH" boxes are unlit blocks that do nothing I can see. | regular-02-recipe__dark__w1280__page.png | major | Remove from the recipe page. |
| D3 | Recipe | Each ingredient row has a checkbox on the left and a tiny hollow pantry square far right (about 8px). Two small squares per row, and the second reads as a bullet. | regular-02-recipe__dark__w1280__page.png | minor | One tick box; mark pantry status only with a word on "have it" items. |
| D4 | Recipe | "READ MORE" clips 7 of 12 steps even with lots of free width. Timer chips split sentences ("for 50- [60 minutes] (or longer...)", "cool on top of the oven for [10 minutes]. Once [10 minutes] has passed"). | regular-02-recipe__dark__w1280__page.png | major | Show whole steps; make the chip a quiet inline link using the number as written. |
| D5 | Recipe | "LAB NOTES & ITERATIONS" holds only "Extracted from: https://sugarspunrun.com/...". My own iteration notes live under "Previous makes (5)". | regular-02-recipe__dark__w1280__page.png | major | Replace with "Your notes from past bakes", newest first, beside the ingredients. |
| D6 | Baking mode | Desktop labels the head buttons (SCALE, INGREDIENTS, SHOW ALL), unlike the phone. The step sits in a narrow column in a big black field. No timers, no "last time" note, no note box. COOK/FINISH are two big red and olive blocks. | regular-03-baking-mode__dark__w1280__fold.png | major | Side column: ingredients for this step, timers, last bake's note, quick note. Phase as text. |
| D7 | Gallery | Rows run oldest to newest, which is the best progress view. But blank grey plates (cheesecake bakes 2 and 4; stir-fry 1, 3 and 5; cabbage 1 and 3) carry no rating or note, so I see nothing of what happened. | regular-06-gallery__dark__w1280__page.png | major | Caption each bake with rating and one-line note; blank plate becomes a note card. |
| D8 | Gallery | Captions are only "01   AUG 30, 2026". Single-bake recipes (Arepa Pelua, French Omelette, Banana Pudding) take a full row each. | regular-06-gallery__dark__w1280__page.png | minor | One compact list for single bakes. |
| D9 | Cookbook | Cheesecake appears in Personal Bests, Recently Baked and first in the grid, so the real grid begins about 500px down. | regular-01-dashboard__dark__w1280__page.png | major | One "Bake again" row, then the grid. |
| D10 | Cookbook | Tiles are about 200px with heavy all-caps titles. 3-4 per row means 203 recipes are many screens of scrolling. | regular-01-dashboard__dark__w1280__page.png | major | A denser list view with small thumbs and an A-Z rail. |
| D11 | Editor | One long column: identity, photographs, 10 ingredient rows, 12 step textareas. Amounts show raw floats ("0.6666", "0.125"). Time shows "75" minutes while the recipe page says "1:15 HR". | regular-04-editor__dark__w1280__page.png | major | Two-pane editor with live preview; sticky Save; fraction-friendly amounts; one time format. |
| D12 | Editor | No place for "what I learned"; "From past bakes" is only for photos. | regular-04-editor__dark__w1280__page.png | major | A "Next time" note that shows on the recipe and in baking mode. |
| D13 | Grocery | Clearest screen: search, recipe chips, "Add an extra", checklist ("0 remaining"). Only 12 of 203 recipes show ("191 more — search to narrow"). | regular-09-grocery__dark__w1280__page.png | minor | Recent and favorite recipes first; add-to-list from the recipe page; group by aisle. |
| D14 | Pantry | Honest and tidy, but 3 items (Flour, Eggs, Yeast) shows I don't keep it up, so per-row pantry markers on recipes are wasted. | regular-08-pantry__dark__w1280__page.png | minor | Pantry as a staples checklist; recipes mark only what is missing. |
| D15 | Analytics | 17 bakes, 6 recipes, 1 personal best, three months of segmented bars with no scale. The thing I want, whether a recipe improved across bakes, is absent. | regular-07-analytics__dark__w1280__page.png | minor | Per-recipe rating trend as a small sparkline. |
| D16 | Notes | General notes is a separate list and editor, disconnected from recipes. | regular-10-notes__dark__w1280__page.png | minor | Notes attach to recipes and bakes; general notes become "Kitchen notes". |
| D17 | Shared link | Same busy viewer: grey boxes, red "Save to my cookbook", a rating panel ("Not rated yet / 0 times / 0 times"), "Sign in to rate it", "Sign in to comment". A friend sees empty states, not a recipe to cook. | stranger-05-shared-recipe-link__dark__w1280__page.png | major | Print-like page: photo, "Shared by @proof", ingredients, method, one Save button; hide rating and comments until there are some. |
| D18 | Discover | Search and sort fit one line on desktop. The capture shows only the offline message, so I can't judge browsing. | regular-12-discover__dark__w1280__page.png | minor | When live, a photo grid with category and time filters. |

### Per-loop desktop friction notes
1. Weekend pick: search is top right; category rail is 1 click, then several screens of large tiles. Recently Baked is visible at once but duplicates the grid. About 1-2 clicks and 0-3 scrolls if recently baked; many scrolls if not.
2. Ingredients: 1 click, 1 scroll of about 690px, then the two-column layout reads well.
3. Bake and log: Start (1 click), NEXT x12, labelled head buttons, a log modal at the end, no notes during the bake. About 15 clicks.
4. Compare attempts: 1-2 clicks via the Previous makes tab or Gallery; 5 bakes with blank plates and no ratings or notes, so "what changed" is not answered.
5. Edit: 1 click to Edit, then a long single column; 3-5 scrolls to reach a step; no preview.
6. Share/publish: Share (top right) and Publish (mid-page) are in different places; the shared page itself is busy (D17); no list of my published recipes.
7. Grocery/pantry: 1 click each from the sidebar; 1-2 clicks per recipe plus typing.
8. Settings/notes/analytics: 1 click each on desktop (2 on phone).

### Desktop asks added to the redesign list
18. Recipe page with a sticky left column (photo, meta, scale, "Your bakes") and a scrolling right column (ingredients then method).
19. Baking mode with a side panel: this step's ingredients, timers, the last bake's note, a quick note box.
20. Two-pane editor (form left, live preview right) with sticky Save.
21. Cookbook list view with A-Z jump.
