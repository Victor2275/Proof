> Verbatim reviewer output from the 2026-10-21 audit. Read [AUDIT_REPORT.md §1](../AUDIT_REPORT.md#capture-problems-found-and-corrected-during-the-audit) first: findings about Discover showing only an offline error, blank tiles low on the desktop dashboard, a short desktop sidebar, or bake photos identical to the recipe photo come from the capture, not the app.

# Alternative-Design Challenger

## Headline
The current UI is a drum machine wearing a cookbook's content. Every screen is a stack of bordered panels with silkscreen headers ("IDENTITY", "ADD TO STOCK", "SHOPPING FOR"), all-caps tracked mono labels, and a lit-key metaphor that explains itself in paragraphs ("Dark is the default: the scene this was built for is a kitchen before dawn..."). That is *crowded by construction*: each idea gets a box, a header, a hairline, and a caption. A cookbook is the opposite: one voice, generous margins, serif type, a photograph, a list, a paragraph. My verdict is to throw out the panel system, the seven-segment readouts, the step-row "keys", the all-caps mono chrome and 13-item navigation. Replace them with a paper-and-ink editorial system where a recipe reads like a page of a book, the bake log reads like pencilled margin notes on that page, and the app has four destinations, not thirteen. The bake log stays the main character by being *physically attached to the recipe page* (a "Notes in the margin" section, a "Last time" line on the page) rather than hidden in a separate Gallery that is a different place.

## Findings
| # | Screen | Finding (current design) -> proposed alternative | Evidence | Severity | Suggested change |
|---|---|---|---|---|---|
| 1 | Global | All-caps, letter-spaced mono is used for titles, nav, buttons, captions, filters ("PERSONAL BESTS", "ALL (203)", "DESSERT (44)"). Nothing reads as prose; scanning is slow. -> Sentence-case serif for titles and prose, small-caps used only for tiny section kickers, mono only for quantities. | regular-01-dashboard__dark__w375__fold.png | blocker | Replace type system (see directions). Ban `text-transform: uppercase` outside a 3-item kicker style. |
| 2 | Global | Every section is a `Panel` with a square lamp-icon header ("IDENTITY", "TOTALS", "IN STOCK") and hairline-ruled rows. Boxes inside boxes make every page dense. -> Pages are open paper: sections divided by whitespace and a single thin rule, headings in the serif. No card chrome. | regular-04-editor, regular-08-pantry, regular-11-settings (w375 fold) | blocker | Delete Panel header bar. Section = heading + content. Cards only for tappable recipe thumbnails. |
| 3 | Global | Every page opens with an explanatory paragraph about the machine: Analytics "What the bake logs can prove. Panels report only what the data supports...", Pantry "so a lamp lights beside every ingredient you already own", Grocery "Pick what you are baking. Everything those recipes need that the pantry does not already hold lands on the list." -> No intro paragraphs; one-line subtitle at most, and only when the screen is empty. | regular-07-analytics__dark__w375__fold.png, regular-08-pantry__dark__w375__fold.png | major | Remove all page-level descriptions; move to empty states. |
| 4 | Global nav | 13 destinations: sidebar of 8 + New Recipe, phone bottom nav (Cookbook, Discover, Gallery, More) hiding Pantry, Analytics, Grocery, Notes, Settings, Account behind a "More" sheet. -> Four tabs: Cookbook, Bake (log), Shop (pantry+grocery), Discover; profile/settings behind an avatar/menu; Analytics folded into the bake log header. | regular-14-mobile-menu__dark__w375__fold.png | blocker | See Navigation section. |
| 5 | Global | A red 56px "+" FAB floats over photographs on every phone screen (covers the stir-fry photo, the editor's Folder field, the Pantry). It sits above content that is being read or edited. -> No FAB. "New recipe" is a plus in the page header on the Cookbook only. | regular-01-dashboard__dark__w375__fold.png, regular-04-editor__dark__w375__page.png | major | Remove FAB; header "+ Add" on Cookbook and an "Add" row in the empty states. |
| 6 | Dashboard | "MY COOKBOOK" 62px display headline + "203 RECIPES" + search + shuffle icon + hairline + category chips + two shelves = 800px before one recipe grid cell is seen. The first recipe photo is a lone cheesecake at 2/3 width. -> A cookbook opens on a *cover and contents*: small title, search, then immediately one photo-led "Pick up where you left off" strip and the index of recipes. | regular-01-dashboard__dark__w375__fold.png | blocker | See Dashboard wireframe. |
| 7 | Dashboard | Category rail: "ALL (203) / DESSERT (44) / SIDE (31) / \" horizontally scrolls and cuts off, 18 folders exist. -> A cookbook has chapters. Show 6-8 chapters as a *Contents* list ("Desserts 44", "Sides 31"...) and put the rest under "More chapters". | regular-01-dashboard__dark__w375__fold.png, w1280 fold | major | Contents page as the index; chips only appear after search. |
| 8 | Dashboard | Smart shelves "PERSONAL BESTS" (one tile) and "RECENTLY BAKED" duplicate the same cheesecake twice on one screen. -> One strip "Recently baked" with a small star on the personal best; no separate shelf. | regular-01-dashboard__dark__w375__fold.png | major | Merge shelves; dedupe. |
| 9 | Dashboard | Titles are truncated mid-word with ellipsis: "THE BEST CHEESECAKE...". -> Serif titles wrap to two lines; clean the stored title. | w375/w1280 fold | minor | Allow two-line clamp; strip "Recipe" suffix from imported titles in display. |
| 10 | Recipe page | Header = 3-line 62px all-caps title + 5-line mono description + photo thumbnail beside four seven-segment readouts + tags + two blank grey keys + status ("LOCAL LIVE EDITS / ONLY ON THIS DEVICE") + PUBLISH + red FAB triangle. The ingredients are not visible on the first screen at all. -> Photo full-bleed at top (4:3), title below in serif, one line of facts "Serves 12 · Active 20 min · Bakes 75 min · Medium", then ingredients. | regular-02-recipe__dark__w375__fold.png / __page.png | blocker | See Recipe wireframe. |
| 11 | Recipe page | The two unlabeled grey squares (phase "keys" COOK / FINISH in w1280) mean nothing without reading the design docs; on 375px they have no labels at all. -> Delete. Phase headings appear in the method itself ("Make the crust", "Bake"). | regular-02-recipe__dark__w375__fold.png | blocker | Remove StepRow from recipe page. |
| 12 | Recipe page | Seven-segment readouts for total/prep/cook/serves are decorative; "1:35 HR" vs "1:15 HR" dim unlit segments make numbers harder to read than plain text. -> Plain tabular text. | regular-02-recipe__dark__w1280__fold.png | major | Replace SegmentReadout in recipe viewer with inline facts. |
| 13 | Recipe page | Storage-state widget "LOCAL LIVE EDITS" three bars + "ONLY ON THIS DEVICE" + "PUBLISH" is jargon and takes a full row. -> A quiet footer line: "Private - on this phone. Publish..." in the share sheet, not in the page. | regular-02-recipe__dark__w375__fold.png | major | Move to Share sheet and Settings. |
| 14 | Recipe page | Start recipe is a red play triangle in a FAB on phone, "START RECIPE" red bar on desktop; Previous makes is a tab hiding the bake history. -> A single bottom "Start cooking" bar, and "Your notes on this recipe" as an always-visible section below the method. | regular-02-recipe__dark__w1280__fold.png | major | Bake log inline on the recipe page. |
| 15 | Baking mode | Header has X, truncated title "THE BEST CHEE...", bluetooth icon, list icon, "SHOW ALL"; below it a 2-key step row with "COOK - NOW"; then 40% of the screen is black empty, step text 30px mono sits mid-screen, Back/Next at bottom. -> Large serif step text at the top third, ingredient amounts for this step directly under, timer as a big tappable chip, Next as a huge bottom bar. One "..." for the rest. | regular-03-baking-mode__dark__w375__fold.png | major | See Baking wireframe. |
| 16 | Baking mode | Step text is mono; long instructions in monospaced wrap badly and read as code. -> Serif 28px for the step, mono only for temperatures/weights highlighted in a color. | regular-03-baking-mode__dark__w375__fold.png | major | Typography change. |
| 17 | Bake log (Gallery) | "BAKE HISTORY - Each row is one recipe, oldest bake on the left." rows with horizontally scrolling tiles, half of them grey blank squares (no photo), dates in tracked mono "AUG 30, 2026" with "01" numbering misaligned right. Cut off the "0" of the third tile at the edge. -> Bake log as a *dated journal*: month headings, one entry per line (photo thumbnail, recipe name, one-line verdict, stars), and an icon for photo-less bakes that is typographic (the recipe's initial). Per-recipe progression appears on the recipe page. | regular-06-gallery__dark__w375__fold.png | blocker | See Bake log entry wireframe. |
| 18 | Bake log | Nothing in the log tells you *what changed* between attempts or *what to do next time*; the product's core value (improving across attempts) has no "next time" field visible. -> Every bake entry has "What I changed" and "Next time" lines; the recipe page shows the latest "Next time" at the top as a sticky-note. | regular-06-gallery, regular-02-recipe | blocker | Add structured "Next time" note; surface on recipe page. |
| 19 | Analytics | Bar chart of blocks per month plus a Totals table in mono caps; "LIBRARY BAKED AT LEAST ONCE 6 OF 203" meter is a metric about the library, not about the baker. -> Delete as a destination. A single "Your baking" strip on the Bake tab: "17 bakes this year, 6 recipes, best: Cheesecake 5 stars." Charts only appear on a recipe's page ("Rating by attempt"). | regular-07-analytics__dark__w375__fold.png | major | Merge into Bake tab header. |
| 20 | Pantry | A page for 3 items with an Add panel + In Stock panel; the barcode button is an unlabeled icon. -> A section of "Shop", titled "In the cupboard", chips you can tap to remove, one input. | regular-08-pantry__dark__w375__fold.png | minor | Merge with Grocery. |
| 21 | Grocery | 203 recipe names as outlined all-caps buttons, "COPY LIST / DOWNLOAD / SHARE" three buttons wrapping onto two lines before any list exists. -> Shopping list is created *from a recipe* ("Add ingredients to list" on the recipe page) and lives as a checklist; picker only when starting a list from scratch. | regular-09-grocery__dark__w375__fold.png | major | See Shop screen. |
| 22 | Notes | General Notes is a separate destination from recipe lab notes and from bake notes: three places to write. -> One "Notes" concept: notes belong to a recipe or a bake; a free note is a "Loose page" inside the Cookbook's Contents. | CURRENT_FEATURES 6a | major | Merge. |
| 23 | Settings | Appearance gets a 5-line explanation of "kitchen before dawn"; Account has a sign-in/create row; ordering puts Account before the data safety info. -> Short list: Appearance, Your cookbook (export/import/storage), Account (optional), Help. | regular-11-settings__dark__w375__fold.png | minor | Cut copy, reorder. |
| 24 | Editor | Sticky bar with back arrow, title truncated "THE BEST CHEESECAKE R...", "10 INGREDIENTS 12 STEPS", then three buttons (AI sparkle, red-outlined trash, SAVE RECIPE), then Identity panel with 8 fields before ingredients. -> Edit in place on the recipe page (tap a line to edit it), like Bear/Notion: no separate form. A short form only for New. | regular-04-editor__dark__w375__page.png | major | See Editor/New redesign. |
| 25 | Editor | The trash icon sits next to Save, both 44px, red outline; accidental-tap risk. -> Delete at the bottom of the page, in text, with confirmation. | regular-04-editor__dark__w375__page.png | major | Move to a "Delete this recipe" text link at the foot. |
| 26 | Landing | "PROOF" wordmark, tagline "A recipe is a pattern. A bake is that pattern running. This is the machine that runs it, with a light that always says where now is." plus a demo panel of 7 coloured keys and a segment readout "01 OF 07", then three feature boxes ("HANDS FREE", "TIMERS THAT FOLLOW", "EVERY BAKE, KEPT"). The keys demonstrate nothing a baker understands. -> A real photograph of a loaf, a headline in the human voice ("The notebook for every loaf you've baked"), a single real recipe page + bake note screenshot, a one-line promise "No account. It all stays on your phone." | stranger-01-landing__dark__w375__page.png | blocker | See Landing wireframe. |
| 27 | Landing | CTA "OPEN THE COOKBOOK" is outlined and quiet (by design, because red is "now"). It is the only action on the page and should be the loudest. -> One solid filled primary button in the accent colour. | stranger-01-landing__dark__w375__page.png | major | Filled button. |
| 28 | Empty cookbook | "START FROM ONE OF THESE" with 2-up photos and an outlined SAVE button under each: 4 buttons above the fold, no way to write your own besides the red FAB. -> Three big choices at top: "Write a recipe", "Paste a link / photo", "Save a starter"; the starter shelf is a horizontal row below. | stranger-03-empty-cookbook__dark__w375__fold.png | major | See Cookbook empty state. |
| 29 | Onboarding | Modal with progress drawn as step row. -> Replace with *no onboarding*: the empty cookbook IS the onboarding. | stranger-02-onboarding | major | Delete modal; one-line tooltips on first use. |
| 30 | Discover | Search + four sort buttons "RECENT / MOST BAKED / TOP RATED / A-Z" as dense outlined chips, and an offline error panel with header "SHARED COOKBOOK". -> Search and one sort dropdown; the offline case shows a quiet line and the cookbook's own recipes still searchable in the same box. | regular-12-discover__dark__w1280__fold.png | minor | Single sort select, quiet error. |
| 31 | Shared link | Full app sidebar appears around a public recipe, with "Gallery / Analytics / Pantry..." for a stranger, and "SAVE TO MY COOKBOOK" bar in a red. -> The public recipe page is a clean standalone page, no app chrome: photo, title, "by @handle", ingredients, method, and one "Save to my cookbook" button. Print and copy-link at the top. | stranger-05-shared-recipe-link__light__w1280__fold.png | blocker | See Public page. |
| 32 | Profile | Profile is a separate destination with same chrome. -> A "Bookshelf": avatar, handle, one line bio, grid of published recipes. | stranger-06-profile | minor | Treat as a page of a book. |
| 33 | 404 | Seven-segment "404" with unlit segments. -> A line: "That page isn't in this book." with a link to the contents. | regular-13-not-found | minor | Simple copy. |
| 34 | Light theme | Light theme is a beige faceplate with a red CTA (`#c8200f`-ish) and black ink; reads as grey-beige instead of paper. -> Warm white paper (`#FBF7F0`) with ink and one accent. | stranger-05-shared-recipe-link__light__w1280__fold.png | major | New palette. |
| 35 | Dark theme | True `#000000` with `#1a1a1a` panels: reads as a machine, not a kitchen at night. -> Warm charcoal (`#17130F`) paper-at-night with cream text. | regular-01-dashboard__dark__w1280__fold.png | major | New palette. |
| 36 | Placeholders | 199 of 203 recipes show 20 + 30 min. -> The recipe facts line omits timing when it is placeholder; show "Time: not set - add" as a tappable gap, never a fake readout. | CLAUDE data note | major | Omit and invite. |
| 37 | Desktop | 1280px layouts leave 256px sidebar + content; recipe is a 2-column container with tiny photo thumbnail. -> At desktop, open as a *two-page spread*: ingredients + photo on the left page, method on the right page. | regular-02-recipe__dark__w1280__fold.png | major | Spread layout. |

---

## Three whole-app directions

### Direction A: "Printed cookbook / editorial"
**Concept.** The app is a hardback cookbook you write yourself. Ottolenghi (big photo, generous white, short headnote), Salt Fat Acid Heat (hand-drawn marginalia, confident serif), Kinfolk (quiet, whitespace, small caps), NYT Cooking (clean ingredient/method split, "Notes" sections, rating stars). Chapters, a contents page, an index at the back.

**Typography.** Headlines: **Fraunces** (variable, "soft" optical axis; warm and bookish) or **Newsreader Display**. Body/method: **Source Serif 4** at 18px/1.6. Labels and quantities: **DM Sans** or **Inter Tight** small, quantities with tabular numerals. Handwritten margin notes (bake notes only): **Caveat** or **Reenie Beanie**, sparingly. All self-hostable variable fonts.

**Palette.**
- Light: paper `#FBF7F0`, ink `#1F1A17`, secondary ink `#6B6159`, rule `#E4DCCF`, accent (tomato/paprika) `#B5391F`, success (sage) `#5E7A4A`, highlight (butter) `#F3E3A8`.
- Dark: page `#16120F`, ink `#F1E9DC`, secondary `#A99E91`, rule `#2B241E`, accent `#E26A4A`, sage `#9DB887`, highlight `#4A3F1E`.

**Layout & navigation.** Bottom tab bar on phone with 4 text+icon items (Cookbook, Bake, Shop, Discover). Desktop: slim top bar with the same four words, no sidebar; content in a 720px reading column, or a two-page spread for recipes. Cookbook home is a *contents page*: chapter names with counts, tap to open a chapter as a photo grid; search on top.

**Recipe page.** Full-bleed photo, title in Fraunces 34px, one-sentence headnote in italic, facts line, then "Ingredients" (quantities in a left column, tabular), "Method" with numbered paragraphs under phase subheads, then "Your notes" with the bake history as margin-note cards.

**Bake log.** Bakes appear as dated "pencilled notes" under the recipe ("Sep 11 - 4 stars - Pulled 5 min early, top cracked"), with an expanding photo. The Bake tab is the journal across all recipes, by month.

**Sharing.** Share sheet with "Copy link", "Print card", "Send as image"; the public page is a book page. Print stylesheet yields a single A5 page.

**Gives up.** The quirky identity of the drum machine; dense info density for power users; highly distinctive "app" feel. Fonts cost ~150KB.

```
 +--------------------------+
 |  <  Desserts        ...  |
 |  [ full-bleed photo    ] |
 |  [ cheesecake slice    ] |
 |                          |
 |  The Best Cheesecake     |
 |  Creamy, no water bath.  |
 |  Serves 12 · 20 min prep |
 |  · 75 min bake · Medium  |
 |                          |
 |  Last time (Sep 11)      |
 |  "Pull at 70 min, wobble |
 |   in the middle."  ★★★★  |
 |  ------------------------|
 |  Ingredients   [½ 1 2 3x]|
 |  250 g  graham crumbs    |
 |   75 g  butter, melted   |
 |  ...                     |
 |  Method                  |
 |  The crust               |
 |  1  Preheat oven to 160C.|
 |  ...                     |
 |  Your notes (5)  + Add   |
 | [   Start cooking      ] |
 +--------------------------+
```

### Direction B: "Recipe-card box"
**Concept.** The cookbook is a wooden recipe box of 4x6 index cards. Each recipe is a card (front: title, photo, ingredients; back: method and the bake log, stamped with dates). Borrow from index cards, Paprika (cards + categories) and Mela (clean card with big photo), and Bear's tag-first organization. Browsing = flicking through divider tabs ("Breads", "Desserts"). Baking = one card propped up.

**Typography.** Titles **Playfair Display** or **Young Serif**; card body **Libre Franklin**; handwritten annotations and stamps **Gaegu** or **Kalam**; typewriter dates **Special Elite** for the log stamps.

**Palette.**
- Light: table `#EDE6D8`, card `#FFFDF7`, ruled blue line `#C7D6E8`, red margin line `#E3A9A0`, ink `#2A2622`, accent (stamp red) `#C0392B`, tab colours (muted): `#D9B26F`, `#9BB59A`, `#C98E86`, `#8FA9C4`.
- Dark: table `#1B1815`, card `#26211C`, rule `#3A4552`, ink `#EFE7D8`, accent `#E46A55`.

**Layout & navigation.** The home is a *stack of divider tabs* (chapters) across the top; below, cards in a 2-up grid with slight rotation-free offset shadow (no skeuomorphic excess). Tab bar: Box, Log, Shop, Find.

**Recipe page.** A card: top photo strip, title, ingredients on ruled lines; "Flip" (tap) shows the back: method steps and a column of dated stamps ("SEP 11 ★★★★ crust cracked"), which is the bake log.

**Bake log.** Stamps on the back of the card; the Log tab is a pile of recently stamped cards.

**Sharing.** "Mail this card": exports the card as an image (4x6 ratio), a printable PDF with cut lines, or a link.

**Gives up.** Long recipes don't fit a "card" (needs scroll); the flip adds a tap; whimsy risks kitsch; hard to do tablet two-column.

```
 +--------------------------+
 | Breads| Desserts| Sides ▸|
 | +----------------------+ |
 | | [photo strip]        | |
 | | The Best Cheesecake  | |
 | |----------------------| |
 | | 250 g graham crumbs  | |
 | | 75 g butter          | |
 | | 900 g cream cheese   | |
 | | ...                  | |
 | |      [ Flip -> ]     | |
 | +----------------------+ |
 |  Serves 12 · 75 min      |
 | [   Start cooking      ] |
 | Box   Log   Shop   Find  |
 +--------------------------+
```

### Direction C: "Baker's field notebook"
**Concept.** A kitchen notebook: dot-grid paper, pencilled annotations, polaroid-style bake photos taped in, margin scribbles. The bake log leads: the home screen is *today's page*. Borrow from Hamelman's *Bread* (formula tables, baker's percentages in a ledger), Tartine's process photographs, kitchen notebooks, and Bear's calm UI. Recipes are "formulas" with a tidy table; every bake is a dated notebook entry.

**Typography.** Headings **Instrument Serif** (italic accents) or **Lora**; text **IBM Plex Sans**; numbers/formulas **IBM Plex Mono**; handwriting **Caveat** for annotations only.

**Palette.**
- Light: page `#F6F2E9` with 1px dot grid `#D8D1C2`, ink `#23211E`, pencil `#6F6A62`, accent (flour-blue ink) `#2F5D8A`, highlighter `#F4E27A`, oven red `#C2452D` for timers only.
- Dark: page `#14161A`, dot `#2A2E35`, ink `#E9E6DF`, pencil `#9A968D`, accent `#7FB2E5`, highlighter `#5B4F1B`, oven `#F0795E`.

**Layout & navigation.** Home = "Today": a running-bake card if one is live, "Next time" notes from the last bake of recently baked recipes, then the recipe list. Nav: Today, Recipes, Shop, Discover (Notebook = Today + Recipes together).

**Recipe page.** A formula: a compact table (ingredient, grams, baker's %), a timeline of stages with a clock-time, and the *previous bake's annotations* drawn in the margin as pencil notes tied to specific steps ("less water here").

**Bake log.** Each bake is a notebook page: polaroid photo, rating, three prompts (What I did differently / How it turned out / Next time). Side-by-side compare of two bakes as a spread.

**Sharing.** "Tear out this page": share a bake as a notebook-page image; share the recipe as a link.

**Gives up.** Less appetising browsing (photo-light); less friendly to casual cooks; handwriting fonts risk gimmickry; the most opinionated to build.

```
 +--------------------------+
 | . . . . . . . . . . . .  |
 | Cheesecake        ★★★★   |
 | Formula · 12 servings    |
 | . . . . . . . . . . . .  |
 | Graham crumbs   250 g    |
 | Butter           75 g    |
 | Cream cheese    900 g    |
 | . . . . . . . . . . . .  |
 | 1 Preheat 160C           |
 | 2 Crust, 10 min          |
 |   ~ less butter, Sep 11  |
 | 3 Filling ...            |
 | . . . . . . . . . . . .  |
 | Bakes: Aug30 Sep11 Oct3  |
 | [ Log a bake ] [ Start ] |
 +--------------------------+
```

## Your recommendation
**Direction A (Printed cookbook / editorial), with Direction C's "Next time" notes and margin annotations grafted onto the recipe page.** Reasons:
1. It is the least crowded by nature: a page of a book has a photo, a title, two lists and notes; nothing else is permitted.
2. It reads as "cookbook" to anyone in two seconds; a recipe-card box (B) fights long recipes and doubles the taps; a notebook (C) makes browsing recipes unappetising, and Proof's data is 203 photographed recipes.
3. It keeps the bake log central *without a separate machine*: the recipe page ends in "Your notes" and begins with "Last time". The Bake tab is a journal.
4. It's the cheapest to build well: serif type, one accent colour, two themes via four tokens; no illustrative assets.
5. It prints, shares and renders for crawlers (`/r/:slug`) in the same visual language as the app.
Use C's handwriting font only on bake notes, and B's index-card ratio for the shareable image export.

---

## Screen-by-screen redesigns

### 1. Landing (stranger-01-landing)
- **Remove:** the "machine" paragraph, the seven-key demo, the segment readout, the three feature boxes, the outlined CTA.
- **Merge:** the three features become three lines under one screenshot.
- **New layout:** a real loaf photo, a human headline, one primary button, then an actual recipe page screenshot and one bake note.
```
 +--------------------------+
 |  Proof                   |
 | [ full-bleed loaf photo ]|
 |                          |
 |  Bake it. Write it down. |
 |  Bake it better.         |
 |  A cookbook that keeps   |
 |  your notes from every   |
 |  attempt.                |
 | [ Open my cookbook   ]   |
 |  No account. It stays on |
 |  your phone.             |
 |  ----------------------  |
 |  [ recipe page shot ]    |
 |  "Last time: pull 5 min  |
 |   early."                |
 |  Works offline · Timers  |
 |  · Share a link          |
 +--------------------------+
```
- **Nav:** none; single CTA leads straight into the empty cookbook (no onboarding).

### 2. Onboarding (stranger-02)
- **Remove:** the entire modal.
- **Replace:** the empty cookbook is the onboarding. First action = "Write a recipe / Paste a link / Save a starter". A dismissible one-line banner "Your recipes live on this phone. Export any time in Settings."

### 3. Empty cookbook (stranger-03)
- **Remove:** "START FROM ONE OF THESE" header, big SAVE button per photo, red FAB.
- **New layout:**
```
 +--------------------------+
 | My Cookbook         [+]  |
 |                          |
 | Nothing here yet.        |
 | [ Write a recipe       ] |
 | [ Paste a link or text ] |
 | [ Photograph a page    ] |
 |                          |
 | Or start with one of ours|
 | [img][img][img] ->       |
 |  tap = preview, + = save |
 +--------------------------+
```

### 4. Dashboard / Cookbook (regular-01)
- **Remove:** page title as a hero, "203 RECIPES" caption, shuffle button, separate Personal Bests shelf, category chip row, FAB.
- **Merge:** shelves into one "Recently baked" strip; chips into Contents.
- **New layout (phone):**
```
 +--------------------------+
 | Cookbook         [+] [🔍]|
 | [ Search 203 recipes... ]|
 |                          |
 | Pick up                  |
 | [photo]  Cheesecake      |
 | Last: Sep 11 ★★★★        |
 | Next time: pull at 70m   |
 |                          |
 | Recently baked  see all ->|
 | [img][img][img][img] ->  |
 |                          |
 | Contents                 |
 |  Desserts ........ 44    |
 |  Sides ............ 31    |
 |  Vegetarian ....... 27    |
 |  Chicken .......... 23    |
 |  More chapters ->        |
 |                          |
 | Cook  Bake  Shop  Find   |
 +--------------------------+
```
- **Desktop:** left column Contents (sticky), right the grid; no app sidebar.
- **Nav:** top-level tabs; tapping a chapter opens a photo grid with a chapter title in serif and a sort select (A-Z, Recent, Most baked).

### 5. Recipe page (regular-02) wireframe: see Direction A. Details:
- **Remove:** segment readouts, step row keys, "LOCAL LIVE EDITS" widget, tabs "RECIPE / PREVIOUS MAKES", FAB, separate Favorite/Share/Edit buttons.
- **Merge:** "Previous makes" -> "Your notes" section; Favorite -> star next to title; Edit/Share/Print/Delete -> one "..." menu; Share also visible as an icon.
- **Desktop:** two-page spread: left = photo, title, facts, ingredients (sticky); right = method; notes underneath spanning both.
- **Scale:** a small "Serves 12 [-][+]" stepper replaces the 0.5x/1x/2x/3x bank; quantities update live; baker's % is a toggle visible only when flour is weighed.
- **Nav:** back arrow labelled with the chapter ("< Desserts").

### 6. Baking mode (regular-03)
- **Remove:** truncated title bar, bluetooth and list icons in the header (move to "..."), step-row keys, "SHOW ALL" button as a header chip, mono step text.
- **Merge:** "Show all" and ingredients list into one bottom-sheet "Ingredients & all steps".
- **New layout:**
```
 +--------------------------+
 | x  Cheesecake   2 of 12 ⋯|
 | ━━━━━━━━░░░░░░░░░░░░░░░░ |
 | The crust                |
 |                          |
 | Preheat the oven to      |
 | 160 C (325 F).           |
 |                          |
 | You need                 |
 |  250 g graham crumbs     |
 |   75 g butter            |
 |                          |
 | ( ⏱ Start 10 min timer ) |
 |                          |
 | Running: Oven 12:04      |
 |                          |
 | [ Back ]  [  Next  ->  ] |
 | Ingredients · All steps  |
 +--------------------------+
```
- Progress is a simple thin bar with phase ticks, not keys. Timer chips inline in the step text. Screen stays awake; large 64px Next. At finish: "How did it go?" opens the bake log entry directly.
- **Nav:** X exits to the recipe; "Finish" goes to the new bake entry.

### 7. Bake log entry (new, replaces Gallery detail + Log Bake modal)
- **Remove:** the "selected make" sheet of nested panels, the separate dictation and personal-best controls scattered across.
- **New layout:**
```
 +--------------------------+
 | Sep 11 · Cheesecake      |
 | [ photo(s) + add ]       |
 | How did it turn out?     |
 | ★ ★ ★ ★ ☆   [mic]        |
 | Notes                    |
 | [ top cracked, 5 min..]  |
 | What I changed           |
 | [ less butter       ]    |
 | Next time                |
 | [ pull at 70 min    ]    |
 | [ ] Mark as my best      |
 | [ Save to my notes ]     |
 +--------------------------+
```
- The entry is a single scroll sheet, with a date preset to today. Voice dictation is the mic in the notes field.

### 8. Bake tab (Gallery + Analytics merged)
- **Remove:** "BY RECIPE / BY DATE" toggle, horizontal tile rows, blank grey tiles, separate Analytics page.
- **New layout:** a journal by month; a header strip "17 bakes · 6 recipes · Best: Cheesecake".
```
 +--------------------------+
 | Bake log      [ + Log ]  |
 | 17 bakes · 6 recipes     |
 | [Journal] [By recipe]    |
 | October                  |
 | [img] Cheesecake  ★★★★   |
 |       Oct 3 · "pull early"|
 | [ C ] Prawn stir-fry ★★★ |
 |       Oct 1 · no photo   |
 | September                |
 | ...                      |
 +--------------------------+
```
- "By recipe" shows one row per recipe with a small sparkline of stars across attempts, which is the improvement view, drawn only when there are 3+ bakes.

### 9. Recipe editor (regular-04) and New recipe (regular-05)
- **Remove:** Identity panel, silkscreen headers, sticky counters bar, trash beside save.
- **New:** edit in place. The recipe page has an "Edit" mode: title, headnote, facts and each ingredient/step become inline fields with drag handles; Save/Cancel pinned bottom.
- **New recipe:** a three-door start (type, paste text or link, photo) then the same in-place editor. AI restructure appears as "Tidy up with AI" after pasting, not as a sparkle icon.
```
 +--------------------------+
 | Cancel   New recipe  Save|
 | Title ____________       |
 | [ + Add photo ]          |
 | Ingredients              |
 |  250 | g | graham crumbs |
 |  + add (paste a list)    |
 | Method                   |
 |  1 ______________        |
 |  + add step              |
 | More: time, serves, tags |
 +--------------------------+
```
- Ingredients accept pasted multi-line lists and parse them. "More details" (time, serves, difficulty, chapter, tags) collapsed.

### 10. Shop (Pantry + Grocery merged) (regular-08, 09)
- **Remove:** two destinations, copy blocks, 203-button recipe bank, "ADD TO STOCK" panel.
- **New layout:** "Shopping list" on top (checkbox rows, grouped by aisle), "Add from a recipe" opens a searchable sheet; below, "In the cupboard" as chips.
```
 +--------------------------+
 | Shop             [Share] |
 | To buy (7)               |
 | [ ] 900 g cream cheese   |
 | [ ] 6 eggs               |
 | [x] flour                |
 | + Add from a recipe      |
 | In the cupboard          |
 | (Flour)(Eggs)(Yeast) [+] |
 +--------------------------+
```
- On any recipe, ingredients you have in the cupboard show a small check; "Add missing to list" button.

### 11. Notes (regular-10)
- **Remove:** as a destination.
- **Replace:** a "Loose notes" chapter inside the Cookbook Contents; notes on recipes and bakes live where they belong.

### 12. Settings (regular-11)
- **Remove:** explanation paragraphs, Account panel up top.
- **New:** a plain list: Appearance (Light / Dark / Auto), Your cookbook (storage, Export, Import), Profile & publishing (optional account), Help, About. Reached from an avatar icon top-right of the Cookbook, not from nav.

### 13. Discover (regular-12, stranger-04)
- **Remove:** four sort chips, "SHARED COOKBOOK" panel for the error.
- **New:** a magazine-style feed: a featured recipe full-width, then a 2-up grid; one search box searching shared recipes, filtered by chapter pills; sort dropdown. Offline: "You're offline. Showing recipes you've seen." with cached items.

### 14. Public profile (stranger-06)
- **New:** "@handle's bookshelf": name, one-line bio, "N recipes shared", grid of covers; each opens the public recipe page.

### 15. Shared recipe page (stranger-05)
- See Findability & sharing; standalone, no app chrome.

### 16. Not found (regular-13)
- "That page isn't in this book." + Back to contents + search field.

### 17. Mobile "More" menu (regular-14)
- **Remove entirely.** With four tabs and an avatar menu, nothing needs a "More" sheet.

## Navigation & information-architecture alternatives

Current: 13 destinations (Cookbook, Discover, Gallery, Analytics, Pantry, Grocery, Notes, Settings, New Recipe, Account, Profile, plus modals), and phone hides 6 of them.

**Model 1: Four-tab "Cook / Bake / Shop / Find" (recommended)**
- Cookbook (recipes, chapters, loose notes) · Bake log (journal, by-recipe progress, stats) · Shop (list + cupboard) · Discover (shared recipes; profile and publishing inside).
- Settings and account behind the avatar. New recipe is "+" in Cookbook header. Analytics is a strip, not a page. Gallery is the Bake log. Notes merged into recipes and bakes. 13 -> 4 + 1 menu.
- Pros: every task has one home; the bake log has a permanent tab (central). Cons: Shop mixes two jobs; Discover might be too prominent for a local-first product (it could demote to a link inside Cookbook).

**Model 2: Single "notebook" with a command bar (no tabs)**
- Home is one scroll: running bake, recent notes, contents. A persistent search/command field at the top ("Find a recipe, a bake, an ingredient, or type 'new'") and a "Kitchen" menu (Shop, Discover, Settings).
- Pros: least chrome, extremely cookbook-like (open the book, read the contents). Cons: less discoverable for non-power users; no 44px tab thumb reach; harder to explain Discover.

**Model 3: Two-spine "My book / Their books"**
- Two tabs only: Mine (cookbook, bake log, shop all as sections within a segmented control) and Everyone's (Discover and profiles). Pros: matches the local/global split in the product direction literally. Cons: Mine becomes overloaded.

**Merge decisions**
- Gallery -> Bake log: yes. A photo-only view of bakes is a view of the log, not a place.
- Analytics -> Bake log header and per-recipe star trend: yes. Drop standalone.
- Pantry + Grocery -> Shop: yes. They exist to answer one question: "what do I need to buy?"
- General Notes -> Cookbook "Loose notes" chapter: yes.
- Discover: keep but demote on desktop to the top bar right side; on phone it keeps a tab in Model 1.
- Settings/Account/Profile -> avatar menu.
- New recipe -> header "+" on Cookbook only.
- Onboarding -> deleted.
- Timers: a global "Running" pill at the top of any screen ("Oven 12:04") that returns to baking mode.

## Findability & sharing alternatives

**Search**
- One search field on Cookbook that searches recipe titles, ingredients ("buttermilk"), tags, *and your bake notes* ("cracked"), with results grouped: Recipes, Notes. Show matched snippet in bold.
- Recent searches and "Suggested: quick, no-oven, uses what's in my cupboard".
- Filters appear as a single "Filter" sheet: Chapter, Time (only if real), Difficulty, "I've baked this", "I can make this now" (pantry match: "Missing 2 things").
- A "Surprise me" lives inside search results, not a header button.

**Indexes and contents**
- **Contents page** as the home of the Cookbook (chapters with counts, dotted leaders, as in a printed book).
- **Back-of-book Index**: an A-Z list by ingredient ("Butter ... 41 recipes"); tapping opens the results. Mobile has a letter scrubber on the right edge like iOS Contacts.
- Tags become "also in" cross-references under each recipe title.
- Favorites: a heart; appear as the first chapter, "Favourites".

**Share sheet** (one sheet, same for recipe and bake)
- Header preview of what you're sharing (card thumbnail).
- Options: Copy link (public recipe page; only if published, otherwise "Publish to get a link"), Send a copy (a file, works offline), Print card, Save as image (4x6 card, 1080 square), Save as PDF, QR code (small, inside "More").
- Share a **bake**: "Share this bake" produces a page-style image: photo, recipe name, date, stars, one-line note, tiny "Proof" credit.
- Private vs public stated in plain words: "Only on this phone" / "Anyone with the link can see this". No jargon like "LOCAL LIVE EDITS".

**Printable recipe card**
- A5 or 4x6 print stylesheet: title, facts line, two-column ingredients/method, a blank lined "My notes" area, QR to the public page. No photo option for ink saving. Export as PDF and via system print.

**Public recipe page (`/r/:slug`)**
```
 +-----------------------------------+
 | Proof                [Open app]   |
 | [ photo, wide ]                   |
 | The Best Cheesecake               |
 | by @proof · Dessert               |
 | Serves 12 · 75 min · Medium       |
 | [ Save to my cookbook ] [Print]   |
 | Ingredients   |  Method           |
 | ...           |  1 ...            |
 | What bakers noticed (3)           |
 |  @sam: "pull at 70 min"           |
 +-----------------------------------+
```
- Standalone page: no app sidebar. A single filled button "Save to my cookbook"; secondary Print and Copy link. "Notes from bakers who made it" shows the bake log in public, a differentiator (Mela/Paprika/NYT only show comments).
- Meta tags and JSON-LD retained; OpenGraph image is the recipe card.
- Saved copy remembers its source ("Adapted from @proof") and shows a quiet line at the bottom, not a badge.

**Other findability ideas**
- "Cook next" shelf: recipes with a Next-time note come first on the home.
- A "Seasonal" or "What's in my cupboard" row, since the pantry exists.
- On recipe thumbnails: stars from your own bakes and a small checkmark "baked 3 times"; no timing unless real.
- Deep link from a timer notification into the exact step in baking mode.

---

## Addendum: below-the-fold findings from the re-captured w1280 page shots
(Re-viewed regular-02-recipe__dark__w1280__page.png and regular-01-dashboard__dark__w1280__page.png.)

| # | Screen | Finding -> proposed alternative | Evidence | Severity | Suggested change |
|---|---|---|---|---|---|
| A1 | Dashboard (desktop) | Past the two shelves, the main grid is a wall of **empty black squares with only a title** (Spicy North African Potato Salad, McSinghs Scotch Pie, Chicken Parmentier, Pork Cassoulet...). Photos fail to appear (likely lazy-load in the capture, but the unlit plate has no designed fallback), so the "gallery cookbook" is mostly dead black. -> Recipe tile fallback is a typeset "title card": paper colour per chapter, the title in the serif, no empty box. A list ("index") view that needs no photo is the default for chapters past the first screen. | regular-01-dashboard__dark__w1280__page.png | major | Designed no-photo tile; offer Index (text list with dotted leaders) as an alternative to the photo grid. |
| A2 | Dashboard (desktop) | The same cheesecake and stir-fry appear three times on one page: Personal bests, Recently baked, and the main grid. -> Dedupe into one strip (see #8). | regular-01-dashboard__dark__w1280__page.png | minor | Remove duplicate shelves. |
| A4 | Recipe (desktop) | Below the fold the recipe confirms the page is a *spreadsheet of fragments*: ingredients list with lamp squares (tiny hollow squares at the far right of every row) and checkboxes on the left, quantities like "0.51 fl oz" brown sugar, "0.67 cup" sour cream, "0.13 tsp" salt, "32 oz" cream cheese, and untidy imported text "graham cracker crumbs ((170g))", "brown sugar ((can substitute white))", "cream cheese² (softened to room temperature (910g))". Two checkboxes systems and two states per row is noise. -> Ingredient lines as prose-quality text: "1 cup (170 g) graham cracker crumbs", "½ cup sour cream", "⅛ tsp salt" (cook-friendly fractions, not decimals), parenthetical grams moved into a right-aligned secondary column; one tick circle per row (tap to cross off while cooking); pantry state a small "have" word, not a hollow square. Clean the import's double parentheses and footnote marks on save. | regular-02-recipe__dark__w1280__page.png | major | Fraction formatter, import cleanup, single tick control, prose-style ingredient line. |
| A5 | Recipe (desktop) | The method is truncated step by step with "READ MORE" links (steps 02, 05, 07, 08, 10, 11, 12), so a person cooking taps to expand about half of the instructions; "---Cheesecake---" appears as a numbered step 04 (a heading imported as a step); timer chips ("60 minutes", "10 minutes") are boxed outlines that break the sentence ("for 50-[60 minutes](or longer...)"). -> Never truncate method text; full paragraphs, 18px serif, phase subheads ("The crust", "The filling", "Bake and cool") derived from "---X---" lines; timers as an underlined inline time ("50-60 minutes") with a tiny clock that starts the timer on tap. | same | blocker | Remove READ MORE; convert "--- X ---" steps to subheads; inline timer link style. |
| A6 | Recipe (desktop) | Lab notes panel "LAB NOTES & ITERATIONS" shows only "Extracted from: https://sugarspunrun.com/..." and the page ends at the method with nothing about the five previous makes (hidden in a tab). -> A "Source" line under the title ("Adapted from sugarspunrun.com") and a visible "Your notes (5)" section at the end of the page, with the last bake's "Next time" pinned at the top. | same | major | Bake log on the page, source as byline (confirms #14 and #18). |
| A7 | Recipe (desktop) | Below the masthead the page is two columns of unequal weight: a narrow ingredient column of ~390px and a method column, both small mono at ~14px, with the 800px of the masthead above them holding 4 readouts and 2 blank keys. At 1280 the first screen holds no ingredient at all. -> Two-page spread: left page photo + ingredients sticky, right page method, masthead reduced to title + facts line (~160px tall). | same | blocker | See Direction A spread. |
| A8 | Recipe (desktop) | The scale control "0.5X 1X 2X 3X" and "COPY LIST" and "BAKER'S %" are three small controls on the Ingredients head, with "Copy list" being a grocery action in disguise. -> A "Serves 12 [-][+]" stepper and one "Add to shopping list" button that includes only what the cupboard lacks; Baker's % only for weighed-flour recipes. | same | minor | Replace as in Recipe page redesign. |

Net effect on the recommendation: the below-the-fold views strengthen it. The recipe page's core problem is that the *reading* part (ingredients, method) is the smallest and most truncated thing on it, while decorative instrumentation dominates the top. Direction A's reading-first spread, un-truncated method, subheads from imported "--- X ---" lines, and always-visible notes directly fix this.


Note: an earlier draft of this addendum mentioned clipping at the right edge and a short sidebar in the w1280 page shots (A2, A3). Those are screenshot-stitching artifacts, not app issues, and have been removed.
