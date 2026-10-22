# Proof UI overhaul: audit report

*Audit date: 2026-10-21. Branch: `feat/ui-overhaul`. Status: audit complete, awaiting a direction decision before any UI code changes.*

## 0. The short version

Five independent reviewers looked at the same 25 screens. They agree on the verdict: **Proof has a strong cookbook and bake log underneath, but it is dressed as 1980s audio hardware.** The result is crowded by construction. Every idea gets a bordered panel, a silkscreened header, an all-caps monospace label and an explanatory paragraph.

The things that make Proof worth using are all present but buried:
- the bake log;
- one-step-at-a-time baking mode;
- ingredients beside the method;
- the photo-led cookbook.

The worst offenders:
- On a phone, the recipe page shows no ingredient on its first screen.
- The bake log has three different names and no home in the navigation.
- Empty grey "step keys" and blank Gallery tiles look broken.
- A red floating **+** covers content on every screen.
- The landing page describes the app's design metaphor instead of what the app does.

**This report recommends a complete visual replacement, not a polish.** It proposes:
- a **"printed cookbook" look**: a warm paper page, a serif face and one accent colour;
- **four destinations instead of thirteen**;
- a recipe page that reads like a page of a book;
- a bake log attached to the recipe it belongs to, the way you'd pencil notes in a cookbook's margin.

Section 7 lists **134 concrete changes**, each tagged with the reviewers who raised it.

Three decisions only you can make are in section 10.

---

## 1. How the audit was run

| Step | What happened |
|---|---|
| Screenshots | A new capture spec, [`e2e/overhaul/capture.spec.ts`](../../e2e/overhaul/capture.spec.ts), shot **25 screen states** at **375px (phone)** and **1280px (desktop)**. Each state has a *fold* shot (the first screen) and a *page* shot (scrolled, capped at 3200px), plus a text dump. Dark theme throughout, and light for landing, dashboard, recipe, baking mode and the shared link. 98 images in total. |
| Two personas | **Stranger**: an empty device arriving at the landing page or a shared link. **Regular**: the live 203-recipe library plus a realistic bake history (17 bakes across 6 recipes). The live data has only 3 bakes, too thin to judge the iteration surfaces. |
| Five reviewers | Five Sonnet agents read the same shots, with a shared brief ([`reviews/0-brief.md`](reviews/0-brief.md)) and the same output template. The brief told them the overhaul is a complete new look and not to read or rely on DESIGN.md. |
| Synthesis | I merged and de-duplicated the findings, ran the Impeccable design detector over `src/components`, scored Nielsen's ten heuristics, and resolved the places where reviewers disagreed. |

Re-run the screenshots with:
```
npm run audit:overhaul                         # "before" set
OVERHAUL_LABEL=after npm run audit:overhaul    # after the overhaul
```
Shots land in `audit-shots/overhaul/<label>/`, which is git-ignored.

### Capture problems found and corrected during the audit
Saying this up front, so no finding below rests on a bad screenshot.

1. **Desktop page shots were first cut at 800px.** The app scrolls inside `<main>`, not the document. They were re-captured at full length, and every reviewer re-reviewed the desktop shots and appended an addendum.
2. **Side-effects of that fix, not app bugs:** the desktop sidebar stops partway down the page, and wide rows push past the right edge in *page* shots. The *fold* shots show the real chrome. Reviewers were told this, and findings based on it were withdrawn.
3. **Discover first showed an "offline" error.** My mock didn't answer `/api/published/index`. It is fixed and re-shot, and the real Discover screen is a working photo grid. **Every "Discover only shows an error" finding in the agent reports is a capture artifact.** The real remaining Discover issues are listed in §7.
4. **Blank tiles low on the desktop dashboard come from lazy loading.** Recipe tiles use `loading="lazy"` and hadn't loaded when the shot was taken. Treat those findings as unverified. A designed no-photo tile is still worth having, because some recipes and many bakes really do lack a photo.
5. **Gallery bake photos identical to the recipe photo come from my fixture.** It reused the recipe image as each bake's photo. The blank Gallery tiles are realistic, since about half the fixture's bakes have no photo, as real ones often won't.

---

## 2. What every reviewer agreed on

These came up independently in all five reports, or in four with no dissent.

| # | Consensus finding | Reviewers |
|---|---|---|
| 1 | **All-caps, letter-spaced monospace everywhere** (nav, labels, buttons, titles, even prose) is the main source of noise, and the main reason it doesn't read as a cookbook. | Pessimist, New user, Familiar, Challenger. The Optimist calls the heavy titles "the right instinct, even if the face changes". |
| 2 | **The recipe page buries the recipe.** On a phone, ingredients start 3–4 scrolls down, under a giant title, a mono paragraph, four seven-segment readouts, two blank keys, a publish-state meter and a Publish button. | All five (the Optimist protects the content, not the order) |
| 3 | **The two unlabelled grey "COOK / FINISH" boxes** on the recipe and shared pages look like broken images. | Pessimist (blocker), New user, Familiar, Challenger (blocker) |
| 4 | **The bake log has no proper home.** It is a "Previous makes" tab on the recipe, a "Gallery" whose title says "Bake History", and a "Lab notes & iterations" panel that holds only a source URL. | All five. The Optimist ranks "bake log as a peer of the recipe" first on its must-keep list. |
| 5 | **The red floating "+"** covers photos, the editor's Folder field, the profile's tile titles and the shared page's Save sentence. It also appears on Settings and the 404 page. | Pessimist (blocker), New user, Familiar, Challenger |
| 6 | **Seven-segment readouts** for times and servings are decoration. Unlit "ghost" segments make 1:35 read like 8:88, and they present placeholder times as precise measurements. | Pessimist, New user, Familiar, Challenger |
| 7 | **The dashboard shows the same cheesecake three times** (Personal Bests, Recently Baked, then the grid). The category chip row is clipped on phones. | Pessimist, New user, Familiar, Challenger |
| 8 | **Imported recipe text looks like machine output:** "0.51 fl oz", "0.13 tsp", "((170g))", "cream cheese²", "--- Cheesecake ---" as a numbered step, "Don&#39;t", and "READ MORE" truncating about half the steps. | Pessimist, New user, Familiar, Challenger |
| 9 | **"Not in your pantry" is printed under every ingredient**, ten times for a user who never set up a pantry. | Pessimist, New user, Familiar |
| 10 | **The landing page** sells the design metaphor ("A recipe is a pattern… a light that always says where now is"). Its only button is a quiet outline, there is no food photo, and the "PHASE 88 OF 07" readout looks broken. | Pessimist (blocker), New user (blocker), Challenger (blocker). **The Optimist disagrees** (see §5). |
| 11 | **Baking mode is the best screen** (one big instruction, huge Next), but its header crams in five unlabelled controls. It shows none of the step's ingredients, timer or note, and nothing leads to logging the bake. | All five |
| 12 | **The light theme** is the closest thing to paper. Dark mode's true black with grey panels reads as a machine, not a kitchen. | Optimist, Pessimist, Challenger |

---

## 3. What each reviewer said

Full reports, verbatim, are in [`reviews/`](reviews/). Each summary below is in that reviewer's voice.

### 3.1 The Optimist: "what to protect" ([full report](reviews/1-optimist.md))
**Verdict:** *"Under a crowded, drum-machine skin, Proof has unusually good substance… The overhaul should change the clothes and keep the skeleton."*

34 strengths (25 plus 9 from the desktop addendum). The ranked **must-survive list**:
1. The bake log as a **peer of the recipe** (never demoted).
2. Gallery rows: **one recipe per row, oldest bake to newest**, numbered and dated. *"You can see a cheesecake's crumb improve across five attempts."*
3. Baking mode's **single-instruction focus**: a huge step, "Step n / N", Back/Next in the thumb zone.
4. **Method grouped by phase**, with step numbers that match between the recipe page and baking mode.
5. The **hands-free kit**: voice, wave, swipe, timers parsed from step text, wake lock and ingredient highlighting.
6. **Ingredients beside the method** on desktop, with aligned quantities, scaling, baker's %, copy list, pantry check and substitutions.
7. A **photo-first cookbook grid** with chapter counts, search and shuffle.
8. Personal Best and Recently Baked shelves on the home screen.
9. **Honest data presentation**: "--" rather than a fake time, no invented charts.
10. A shared recipe page with **one primary action**, "Save to my cookbook".
11. The starter shelf for an empty cookbook.
12. Local-first honesty copy: "No account. Nothing to set up.", "Only on this device", Export .zip.
13. Pantry → grocery list → share.
14. Light and dark themes, with light's warm paper tone.
15. 44px targets and a four-slot phone dock.

Addendum additions: **checkable ingredients** and **timer chips inside steps** are daily-use features with no visual emphasis. "Lab notes" already sits under the ingredients, so it is the natural place for "last time".

**Under-sold features it found:**
- the reverse bake scheduler;
- baker's % as a printed bread formula;
- the before/after photo slider;
- the shareable recipe card;
- "Adapted from @handle" credit;
- sub-recipe links ("see also: Pastry cream, p. 42");
- Bluetooth scale and voice controls;
- Inspire Me;
- Export framed as "save my cookbook".

**Ideas to amplify:**
- the recipe as a printed spread;
- bake history as a film "proof strip" with pencilled notes;
- the phase row as a chapter timeline or ribbon bookmark;
- the cookbook home as a table of contents;
- warm light as the hero theme;
- the share page as a first-class page;
- **last bake's notes in the recipe's margin**;
- baking mode kept dark and large;
- charming empty states.

### 3.2 The Pessimist: "every issue" ([full report](reviews/2-pessimist.md))
**Verdict:** *"Proof does not look like a cookbook. It looks like audio hardware that happens to hold 203 recipes."*

**93 findings: 9 blockers, 60 majors, 24 minors.** Its 9 blockers:
1. Blank grey step keys on the recipe page.
2. Blank grey Gallery tiles for bakes without a photo.
3. The FAB on every screen.
4. The shared link's Save button sits under the tab bar, with the FAB covering its sentence.
5. The bake log has no navigation entry and three names.
6. The recipe page is "a dashboard, not a recipe".
7. "Lab notes" holds only a source URL.
8. All-caps tracked mono as the global type.
9. Landing copy about the design metaphor.

**Its ten systemic root causes:**
1. Uppercase tracked monospace everywhere.
2. The instrument metaphor leaks into copy ("lamp", "NOW", "phase", "machine", "live edits", "fuzzy match").
3. Decorative hardware stands in for information (step keys, segment bars, a 3-bar meter, panel lamps).
4. Every screen is a stack of bordered panels with 3–4 line intros.
5. The bake log is not structurally central.
6. Navigation and the FAB don't match tasks ("More" is a junk drawer).
7. Data quality shows through (placeholder times, decimal amounts, "---" steps, HTML entities, test notes such as "Untitled fhgfhgfNote").
8. Colour is overloaded: red means now, primary and new; olive reads as mud.
9. No warmth and no photography in the chrome.
10. Sharing is an afterthought.

**Distinctive catches nobody else made:**
- Dashboard tiles render a bare "HR"/"MIN" unit with the value missing.
- The editor shows "75 MIN" while the recipe page says "1:15 HR".
- "Folder" in the editor versus "category" on the dashboard.
- The Analytics "6 OF 203 baked" meter is a guilt metric.
- The Analytics intro repeats its own total.
- Settings' design-rationale copy ("a kitchen before dawn") is addressed to users.
- The disabled Back button in baking mode is nearly invisible.
- Touch targets below 44px: the kebab, the pantry "×" and the back link.
- Light-theme secondary text is below 4.5:1 contrast.

### 3.3 The New User: first impressions, blind to the code ([full report](reviews/3-new-user.md))
**Verdict:** *"What I got looked like a piece of audio gear from 1982 that happened to contain a cheesecake… It doesn't feel like a cookbook. It feels like a dashboard for an oven."*

47 findings (30 phone, 17 laptop). **The 5-second test** (what a stranger thinks each screen is):

| Screen | Stranger's guess | Actual purpose |
|---|---|---|
| Shared recipe link | "Some kind of cheesecake timer, or a recipe in a weird font." | Read a friend's recipe and save it |
| Landing | "A music thing? Something with levels and keys?" | Introduce a baker's cookbook and bake log |
| Onboarding | "A tutorial about searching and folders." | Orient a newcomer. It fails, because it teaches features, not the first step. |
| Empty cookbook | "A recipe catalogue with Save buttons." **(passes)** | Start a cookbook |
| Profile | "Somebody's recipe collection, like a food blog." **(passes)** | Show a baker's published recipes |

**Words it didn't understand:** "a bake" as a noun; "pattern running"; "where now is"; "COOK — NOW"; "phase"; PUBLISH vs SAVE vs SHARE; "LOCAL LIVE EDITS"; "baker's %" on a cheesecake; "Not in your pantry" ("I never made a pantry"); Analytics ("sounds like work"); General notes; Gallery ("of what?"); the unlabelled shuffle icon; the Bluetooth icon; "Lab notes & iterations" ("engineer words"); and "Proof" itself, for non-bakers.

**What would have made it stay** (15 items, top 8):
1. A one-sentence promise and a real loaf photo.
2. A stranger-friendly shared page with Save above the fold and no member navigation.
3. A sentence-case serif and a comfortable sans.
4. Plain numbers ("Prep 20 min · Cook 1 h 15 · Serves 12").
5. Delete the unlabelled boxes.
6. **Bake log on the dashboard and on every recipe** ("Last baked 3 days ago · 4★ · 'less sugar'" with "Bake again").
7. Labelled buttons instead of the floating + and play icons.
8. Each recipe shown once.

**On a laptop:** the empty cookbook and the profile "look like a cookbook". The profile grid is "what a cookbook should feel like; use it as the model for the dashboard". The dashboard and recipe page "still look like an instrument panel".

### 3.4 The Familiar User: months of use, 203 recipes ([full report](reviews/4-familiar-user.md))
**Verdict:** *"I know where everything is, and I still spend my time scrolling past decoration to reach the three things I actually use: find a recipe, read the ingredients, log the bake."*

43 findings (25 phone, 18 desktop), plus a friction count for each of 8 loops:

| Loop | Phone today | Main friction |
|---|---|---|
| Pick a recipe for the weekend | 2 taps by name; 2–3 taps, 1–2 sideways swipes and 3–6 scrolls by category | Duplicated shelves; no "baked it" filter or sort; truncated titles; 48-tile paging; no A–Z |
| Read ingredients at the counter | 1 tap, **3–4 scrolls to the first ingredient** | Ingredients below the fold; repeated "Not in your pantry"; 0.51 fl oz |
| Bake and log | 1 + ~12 Next + 3–4 for the log modal | **No way to jot notes mid-bake**; unlabelled icons; "READ MORE" on steps |
| Compare attempts | 2 taps via the tab, or 1 tap + scrolls + swipes via Gallery | History hidden behind a tab; blank plates carry no rating or note; no "bake 3 vs bake 4" view |
| Edit after learning something | 2 taps, then 3–8 scrolls | Can't edit the step you're reading; no "note for next time" |
| Share or publish | 3 taps to share; 4–6 plus sign-in to publish | Private recipes offer no link and don't say so; no "my published" list |
| Grocery and pantry | 2 taps to reach, 1–2 per recipe | No "add to list" on the recipe; a wall of 203 recipe buttons |
| Settings, notes, analytics | 2 taps each | A junk-drawer menu; manifesto copy |

**What it would lose if the redesign broke it:** By Recipe progression rows; big-step baking mode with voice, wave and wake lock; inline timers that survive a reload; scaling and baker's %; Personal Best; local-first with zip export; fuzzy search; step-aware ingredients; the reverse scheduler; the before/after slider; light and dark themes; share by link, QR or PDF with attribution.

**Its 21 redesign requests, the headline ones:**
- A recipe page ordered title → one meta line → **ingredients on the first phone screen** → method.
- An **always-visible "Your bakes" strip** under the title, with **"Log a bake"** reachable from the recipe, baking mode and the cookbook.
- A **"Next time" note** that resurfaces when you next start the recipe.
- A side-by-side **this-bake vs last-bake** view.
- A **cookbook index with an A–Z rail** and a list view.
- **Friendly fractions**.
- A phone dock of **Cookbook / Bakes / Shop / Discover**.
- A print-ready recipe page.
- Desktop: a sticky left column, a baking-mode side panel (this step's ingredients, timers, last note, quick note) and a two-pane editor with live preview.

### 3.5 The Challenger: aggressive alternative designs ([full report](reviews/5-challenger.md))
**Verdict:** *"The current UI is a drum machine wearing a cookbook's content… Throw out the panel system, the seven-segment readouts, the step-row 'keys', the all-caps mono chrome and the 13-item navigation."*

43 "current → proposed" rows (37 plus 6 from the addendum). **Three whole-app directions:**

| | **A. Printed cookbook / editorial** *(recommended)* | **B. Recipe-card box** | **C. Baker's field notebook** |
|---|---|---|---|
| Concept | A hardback cookbook you write yourself: Ottolenghi, *Salt Fat Acid Heat*, Kinfolk, NYT Cooking | A wooden box of 4×6 index cards: front is ingredients, back is method plus dated bake "stamps" | A kitchen notebook with dot grid, taped-in photos and pencilled margins; home is "Today" |
| Type | Fraunces (titles), Source Serif 4 (body), DM Sans or Inter Tight (UI), Caveat (bake notes only) | Playfair or Young Serif, Libre Franklin, Kalam, Special Elite (date stamps) | Instrument Serif or Lora, IBM Plex Sans and Mono, Caveat |
| Light | paper `#FBF7F0`, ink `#1F1A17`, rule `#E4DCCF`, paprika `#B5391F`, sage `#5E7A4A` | table `#EDE6D8`, card `#FFFDF7`, ruled blue `#C7D6E8`, stamp red `#C0392B` | page `#F6F2E9`, dots `#D8D1C2`, flour-blue ink `#2F5D8A`, highlighter `#F4E27A` |
| Dark | `#16120F` page, `#F1E9DC` ink, `#E26A4A` accent | `#1B1815` / card `#26211C` | `#14161A`, ink `#E9E6DF`, accent `#7FB2E5` |
| Gives up | The quirky identity; ~150 KB of fonts | Long recipes don't fit a card; the flip costs a tap; risk of kitsch | Less appetising browsing; the most opinionated build; handwriting gimmick risk |

**Its recommendation:** A, plus C's **"Next time" notes and margin annotations** on the recipe page. Use C's handwriting face only on bake notes, and B's index-card ratio for the shareable image.

**Its navigation models:**
1. **Cookbook / Bake log / Shop / Discover** plus an avatar menu *(recommended)*.
2. A single notebook page with a command bar and no tabs.
3. Two tabs only, "My book / Their books".

**Its merges:**
- Gallery → Bake log.
- Analytics → a summary strip on the Bake log plus a per-recipe star trend.
- Pantry + Grocery → Shop.
- General notes → a "Loose notes" chapter.
- Settings and Account → the avatar menu.
- New recipe → a header +.
- Onboarding → deleted (the empty cookbook *is* the onboarding).
- Running timers → a global "Oven 12:04" pill.

**Findability and sharing:**
- Search across titles, ingredients, tags **and your bake notes**.
- A **Contents page** (chapters with dotted leaders and counts) and a **back-of-book Index** by ingredient, with an A–Z scrubber.
- A filter sheet including "I've baked this" and "I can make this now (missing 2)".
- One share sheet: copy link, send a copy, print card, image, PDF, QR.
- A shareable *bake* card.
- An A5 print stylesheet with a blank "My notes" area.
- A **standalone public recipe page with no app chrome** and a "What bakers noticed" section.

It also drew ASCII wireframes for landing, empty cookbook, dashboard, recipe, baking mode, bake entry, bake log, editor and Shop. They are reproduced in §6.

---

## 4. My synthesis: design health

### Nielsen heuristic scores (current UI)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Publish state, timers and offline messages are explicit, but phrased in jargon ("LOCAL LIVE EDITS") |
| 2 | Match between system and real world | **1** | Machine metaphor throughout: phase, lamp, now, live edits, pattern running. A cook's vocabulary is absent. |
| 3 | User control and freedom | 3 | Sheets trap focus and close on Escape; back links exist. Mid-bake notes are impossible. |
| 4 | Consistency and standards | 2 | Three names for the bake log; Folder vs Category; recipe actions differ between phone and desktop; "75 min" vs "1:15 HR" |
| 5 | Error prevention | 2 | Delete sits beside Save in the editor; the FAB covers controls |
| 6 | Recognition rather than recall | **1** | Unlabelled shuffle, Bluetooth, list and kebab icons; six destinations hidden under "More"; unlabelled step keys |
| 7 | Flexibility and efficiency | 3 | Hands-free, scaling and fuzzy search are strong; no A–Z, no "baked" filter, no add-to-list from a recipe |
| 8 | Aesthetic and minimalist design | **1** | Boxes in boxes, intros on every page, the same recipe three times, decoration in place of data |
| 9 | Error recovery | 3 | Errors name the problem and the recovery, honestly |
| 10 | Help and documentation | 2 | Help exists only as long page intros, in the wrong register |
| | **Total** | **21 / 40** | **Needs substantial work.** Function scores well (3s); presentation scores badly (1s). That is the signature of a skin problem, not a product problem. |

### Design specificity
The current design is *specific*: nobody would mistake it for a template, and the Impeccable detector found **zero anti-pattern violations** in `src/components`. The system is consistent with itself. The problem is that it is specific to the **wrong world**. It is authored for a drum machine, not a cookbook, so a well-built system is faithfully producing the wrong feeling. That is why a polish can't fix it, and why this report recommends replacement.

### The single biggest opportunity
**Put the bake log on the recipe page.** Every reviewer converged on it from a different direction:
- the Optimist's "notes in the margin";
- the Pessimist's "Lab notes holds only a URL";
- the New user's "Last baked 3 days ago · 4★";
- the Familiar user's "Your bakes strip";
- the Challenger's "Last time / Next time".

It fixes the product's core promise ("the bake log is the main character"), the cookbook feel (marginalia) and the familiar user's main loop, all at once.

---

## 5. Where the reviewers disagreed, and my ruling

| Topic | For | Against | Ruling |
|---|---|---|---|
| **Landing copy** ("A recipe is a pattern…") | Optimist: "some of the best copy in the app" | New user, Pessimist and Challenger: blocker; a stranger can't tell what the app does | **Replace.** Keep the *idea* (recipe as template, bake as attempt) but say it in a cook's words, with a food photo. A stranger's 5-second guess was "a music thing". |
| **Phase row / step keys** | Optimist: a real insight, because bakers navigate by phase | Everyone else: unlabelled boxes that look broken | **Keep the concept, delete the keys.** Phases become serif subheads in the method ("The crust", "Bake and cool") and a thin progress line with named ticks in baking mode. |
| **Gallery rows (oldest → newest per recipe)** | Optimist and Familiar: the best iteration view in the app | Pessimist: a cut-off horizontal strip that needs instructions | **Keep the progression, move it.** It becomes the "Your bakes" strip on each recipe page. The Bake log tab is a dated journal with a "By recipe" view. No blank tiles: a bake with no photo becomes a note card. |
| **Floating + button** | Optimist: thumb-reachable | Everyone else: it covers content everywhere | **Remove.** A labelled "New recipe" in the Cookbook header and in empty states. |
| **Onboarding modal** | (none) | New user: replace with one card. Challenger: delete. | **Delete.** The empty cookbook becomes the onboarding, with three doors: write, paste or photograph, start from a starter. |
| **Recipe editor** | Optimist: single-scroll is right | Challenger: edit in place on the recipe page. Familiar: two-pane with live preview. | **Phase 1:** restyle the single scroll, collapse "More details", put Delete in a menu and show fractions. **Later:** edit-in-place as its own project. |
| **Settings copy** ("a kitchen before dawn") | Optimist: reads like a person | Pessimist and Challenger: design rationale shown to users | **Cut to one plain line per setting.** |
| **Navigation count** | Familiar: 5 tabs including More | Challenger: 4 tabs plus an avatar menu | **4 tabs plus an avatar menu** (§6.2). Nothing left needs a "More" drawer. |
| **Desktop chrome** | (none) | Challenger: no sidebar, a slim top bar | **Needs your decision.** CLAUDE.md records "the sidebar is always visible on desktop" as a key decision. See §10. |

---

## 6. The proposed new look

### 6.1 Visual direction: "The cookbook you write yourself"
This is Challenger direction A, refined with the other reviewers' notes.

- **Paper and ink, not panels.** Sections are divided by whitespace and a single hairline, with headings in a serif. There are no bordered card chrome, header bars or lamp icons. Cards exist only for tappable recipe photos.
- **Type, three faces with clear jobs, all self-hosted and precached for offline:**
  - **Fraunces** (variable, soft optical axis): titles, sentence case.
  - **Source Serif 4**: recipe prose, method and headnotes, at 17–18px with a 60–70 character measure.
  - **A humanist sans** (Inter Tight or DM Sans): UI labels, buttons, quantities with tabular numerals.
  - *Optional:* a handwriting face only on bake notes, behind a setting.
  - **Retired:** JetBrains Mono, Archivo extended caps, seven-segment digits.
- **Colour:**
  - One accent, **paprika**, for the one primary action per screen and for links.
  - **Sage** for "done / in your pantry".
  - **Butter** as a highlight for the current step and timers.
  - No temporal colour code to memorise.
- **Themes:**
  - **Light "paper"** (`#FBF7F0` ground, `#1F1A17` ink).
  - **Dark "kitchen at night"**: warm charcoal `#16120F` with cream ink, *not* true black.
  - Which is the default is a decision for you (§10).
- **Photography leads.** Recipe photos at 4:3, full width on the phone. A recipe or bake without a photo gets a **typeset title card** (chapter colour plus the title in serif), never an empty box.
- **The voice is a cook's.** "Start cooking", "Log a bake", "Last time", "Next time", "Private: only on this phone", "Your bakes". There are no "machine", "phase", "lamp", "live edits" or "lab".

### 6.2 Information architecture: 13 destinations become 4
| New destination | Absorbs | Phone | Desktop |
|---|---|---|---|
| **Cookbook** | Dashboard, Notes (as "Loose notes"), New recipe (header +), search, Contents and Index | Tab 1 | Primary nav |
| **Bakes** | Gallery, Analytics (a summary strip plus per-recipe trends), "Previous makes", the Log a bake sheet | Tab 2 | Primary nav |
| **Shop** | Grocery list and Pantry ("In the cupboard") | Tab 3 | Primary nav |
| **Discover** | Discover and profiles | Tab 4 | Primary nav |
| *Avatar menu* | Settings, Account, My published recipes, Export or Import, Help | Header avatar | Header avatar |

Other changes:
- **"More" is gone.**
- **The FAB is gone.**
- A **running-timer pill** ("Oven · 12:04") floats at the top of any screen while a bake runs, and returns you to baking mode.
- Public routes (`/r/:slug`, `/@handle`) render **without the app chrome**.

### 6.3 Key screens (wireframes, phone)

**Recipe page**: the heart of the overhaul.
```
+--------------------------+
| < Desserts      ♡  ⤴  ⋯ |   back is named after the chapter; share always visible
| [ full-bleed 4:3 photo ] |
| The Best Cheesecake      |   Fraunces, sentence case
| Creamy, no water bath.   |   one-line headnote, italic
| Serves 12 · Medium       |   timings only when measured (placeholder → "Add times")
| ┌ Last time · Oct 5 ★★★★ |   the bake log, on the page
| │ "Pull at 70 min, the   |
| │  centre still wobbles" |
| └ 5 bakes →   + Log bake |
| [   Start cooking      ] |   the one paprika button
| Ingredients  Serves[-12+]|
| ○ 1 cup (170 g) graham…  |   fractions; grams secondary; one tick per row
| ○ ½ cup brown sugar      |
| + Add missing to list    |
| Method                   |
| The crust                |   phase subheads from "--- X ---" lines
| 1  Preheat to 160 °C…    |   full steps, never "Read more"
| 2  Mix crumbs… ⏱10 min   |   inline timer as an underlined time
| Your bakes               |   the proof strip: oldest → newest
| [img][note][img][img]→   |   a bake with no photo is a note card, never blank
| Adapted from sugarspun…  |   source as a quiet credit
+--------------------------+
```
On desktop it becomes a **two-page spread**: the left page has the photo, facts, "Last time" and sticky ingredients; the right page has the method. "Your bakes" spans both below.

**Cookbook home**
```
+--------------------------+
| Cookbook        [+] (VG) |
| [ Search recipes, notes ]|
| Pick up where you left   |
| [photo] Cheesecake ★★★★  |
|  Next time: pull at 70m  |
| Recently baked     all → |
| [img][img][img][img] →   |
| Contents                 |
|  Desserts ........... 44 |
|  Sides .............. 31 |
|  …       Index A–Z →     |
| Cookbook Bakes Shop Find |
+--------------------------+
```

**Baking mode**
```
+--------------------------+
| ×  Cheesecake   3/12   ⋯ |
| ━━━━━━━●━━━━━━━━━━━━━━━  |   thin progress with named phase ticks
| The crust                |
| Press the crumbs into    |   serif step text, 28–32px
| the tin and bake for     |
| 10 minutes.              |
| You need                 |   this step's ingredients
|  170 g graham crumbs     |
| ( ⏱ Start 10 min )       |
| Last time: "crust was    |   last bake's note, tied to this step
|  pale, give it 12"       |
| [✎ Note]  [Back] [Next→] |   jot a note mid-bake
+--------------------------+
```
The last step becomes **"How did it go?"**, the Log a bake sheet: date, stars, photos, notes, "What I changed", "Next time" and "Mark as my best".

**Landing**
```
+--------------------------+
| Proof                    |
| [ real loaf photograph ] |
| Bake it. Write it down.  |
| Bake it better.          |
| Your recipes, and what   |
| happened every time you  |
| made them.               |
| [ Open my cookbook ]     |   solid primary
| No account. It stays on  |
| your phone.              |
| [recipe page + bake note]|
| Works offline · Timers · |
| Share a link             |
+--------------------------+
```

**Bakes tab**: a journal by month, with a "17 bakes · 6 recipes · best: Cheesecake" summary strip and a [Journal | By recipe] switch. By recipe shows the proof strip and a star sparkline once a recipe has 3 or more bakes.

**Shop**: "To buy" checklist grouped by aisle → "+ Add from a recipe" (a searchable sheet) → "In the cupboard" chips.

---

## 7. The change list (134 changes)

**Reviewer tags:** **O** Optimist · **P** Pessimist · **N** New user · **F** Familiar user · **C** Challenger · **S** Synthesis (mine).
**Priority:** **P0** must ship in the first overhaul pass · **P1** same release · **P2** follow-up · **P3** later.

### 7.1 Foundation and visual system
| # | Change | Pri | Source |
|---|---|---|---|
| 1 | Replace the type system: Fraunces titles, Source Serif 4 prose, humanist sans UI; retire JetBrains Mono, Archivo extended and seven-segment | P0 | P N F C |
| 2 | Sentence case everywhere. Uppercase only for one tiny "kicker" style, if at all | P0 | P F C |
| 3 | New palette tokens: paper and ink, warm dark, one paprika accent, sage, butter highlight | P0 | P C O |
| 4 | Delete the Panel header bar (square lamp plus caps label); sections become a heading plus whitespace | P0 | P C |
| 5 | Delete page-level explanatory paragraphs (Analytics, Pantry, Grocery, Discover, Settings); keep copy for empty states only | P0 | P C F |
| 6 | Remove the floating + button on every screen | P0 | P N F C |
| 7 | A designed no-photo tile (typeset title card in the chapter colour) for recipes and bakes; never a blank box | P0 | P N F O C |
| 8 | Replace every SegmentReadout in the product UI with plain tabular text | P0 | P N F C |
| 9 | Delete the StepRow "keys" from the recipe, shared page, landing, onboarding and baking mode | P0 | P N F C |
| 10 | Rewrite all copy in a cook's vocabulary; a glossary of one term each (Bakes, Category, Private/Published) | P0 | P N S |
| 11 | Retire the temporal colour code (red now / orange next / yellow queued); colour marks the primary action and timers only | P1 | P C |
| 12 | Photos at 4:3 with rounded softness; full-bleed on the phone recipe page | P1 | C |
| 13 | Light-theme secondary text ≥ 4.5:1 contrast | P0 | P |
| 14 | Touch targets ≥ 44px for the kebab, pantry ×, back links and desktop action buttons | P0 | P |
| 15 | Replace the retired `--faceplate` and `.scrim` materials; the overlay scrim stays as a plain dim, without the machine look | P1 | S |
| 16 | A print stylesheet for recipes (A5 / Letter; two columns; blank "My notes" lines; QR) | P1 | F C O |
| 17 | Self-host the new fonts (latin subset) and precache them for offline | P0 | S |
| 18 | An optional handwriting face for bake notes, behind a setting | P3 | C O |

### 7.2 Navigation and information architecture
| # | Change | Pri | Source |
|---|---|---|---|
| 19 | Four destinations: Cookbook, Bakes, Shop, Discover | P0 | F C P |
| 20 | Header avatar menu: Settings, Account, My published recipes, Export/Import, Help | P0 | C P |
| 21 | Delete the "More" drawer | P0 | C P |
| 22 | Merge Gallery and Analytics into **Bakes** | P0 | C P F |
| 23 | Merge Pantry and Grocery into **Shop** | P1 | C F N |
| 24 | General notes becomes "Loose notes" inside the Cookbook | P2 | C F |
| 25 | One name for the bake log: "Bakes" (not Gallery, Bake History or Previous makes) | P0 | P N |
| 26 | "Category" everywhere (drop "Folder") | P1 | P |
| 27 | A running-timer pill visible on every screen while a bake runs | P1 | C |
| 28 | Public routes (`/r/:slug`, `/@handle`) render without the app nav | P0 | N C P |
| 29 | Desktop chrome: slim top bar *or* a restyled sidebar (decision §10) | P0 | C S |
| 30 | Back links named after the place you came from ("< Desserts") | P2 | C |
| 31 | A timer notification deep-links to the exact step in baking mode | P3 | C |

### 7.3 Landing and first run
| # | Change | Pri | Source |
|---|---|---|---|
| 32 | New headline in a cook's words ("Bake it. Write it down. Bake it better.") | P0 | N P C |
| 33 | A real food photograph above the fold (a real bake, never stock passed off as a user's) | P0 | N P C |
| 34 | A solid primary "Open my cookbook" button | P0 | N P C |
| 35 | "No account. It stays on your phone." as readable text, not tiny caps | P0 | N O |
| 36 | Lead with the bake log; hands-free and timers become secondary lines | P0 | N P |
| 37 | Show a real recipe page and a bake note instead of the drum-machine demo | P1 | N C |
| 38 | A "See an example recipe" link and a second CTA at the foot | P2 | N |
| 39 | Delete the onboarding modal | P0 | C N P |
| 40 | Empty cookbook: three doors ("Write a recipe", "Paste a link or text", "Photograph a page") plus the starter shelf | P0 | C N P |
| 41 | Starter shelf: large photos with a small "Add" control, not heavy black SAVE boxes | P1 | N P |
| 42 | The "stored on this device" note near the top in plain words | P1 | N |

### 7.4 Cookbook (home)
| # | Change | Pri | Source |
|---|---|---|---|
| 43 | Search first, full width, without the unlabelled shuffle beside it | P0 | F P C |
| 44 | One "Pick up where you left off" card (last bake, stars, "Next time") | P0 | N F C |
| 45 | Merge Personal Bests and Recently Baked into one strip; Personal Best becomes a badge | P0 | all five |
| 46 | De-duplicate: a recipe appears once above the grid | P0 | P N F C |
| 47 | Categories become a **Contents** list with counts (dotted leaders); small categories go under "More chapters" | P1 | C O F |
| 48 | A back-of-book **Index A–Z** with a letter scrubber | P1 | C F |
| 49 | A list view (thumbnail plus full title) alongside the photo grid | P1 | F P |
| 50 | Titles wrap to 2 lines, never "THE BEST CHEESECAK…" | P0 | P N F |
| 51 | Tile meta shows last baked and stars, never ingredient count or a bare unit | P0 | P F |
| 52 | Filter sheet: Category, Difficulty, Baked / not yet, Favourites, Published, "Can make now" | P1 | F C P |
| 53 | Sort: A–Z, Recently baked, Rating, Recently added | P1 | F |
| 54 | Search also matches ingredients and your bake notes, with results grouped | P2 | C |
| 55 | "Surprise me" lives inside search results and is labelled | P2 | O C |
| 56 | Infinite scroll or chapter pages instead of "Show 48 more" | P1 | P N |
| 57 | A labelled "+ New recipe" in the header | P0 | all |

### 7.5 Recipe page
| # | Change | Pri | Source |
|---|---|---|---|
| 58 | Order: photo → title → headnote → facts line → Last time → Start → ingredients → method → Your bakes | P0 | all |
| 59 | Ingredients visible on the first phone screen after the photo | P0 | F P |
| 60 | Facts as one line: "Serves 12 · Prep 20 min · Bake 1 h 15 · Medium" | P0 | N F C |
| 61 | **Placeholder timings hidden** (`isPlaceholderTiming`), replaced by a quiet "Add times" | P0 | P C S |
| 62 | A "Last time" note card under the title (date, stars, one line) | P0 | F C N O |
| 63 | A "Your bakes" proof strip (oldest → newest) at the foot, always visible, not a tab | P0 | O F C |
| 64 | "Log a bake" available on the recipe page without entering baking mode | P0 | F |
| 65 | A "Next time" note shown on the recipe and when you next start it | P0 | C F |
| 66 | Delete the "LOCAL / LIVE / EDITS" meter; private/published state becomes one line in the share sheet | P0 | P N F C |
| 67 | Delete the RECIPE / PREVIOUS MAKES tabs | P0 | C F |
| 68 | One labelled "Start cooking" button, the same at every width | P0 | P N F |
| 69 | Share always visible as an icon; Favourite as a heart; Edit, Print, Publish and Delete in "⋯" | P0 | P F C |
| 70 | Kitchen fractions (½, ⅓, ⅛) instead of decimals ("0.51 fl oz", "0.13 tsp") | P0 | P N F C |
| 71 | Weights as a secondary column ("1 cup (170 g)" → 1 cup … 170 g) | P1 | F C |
| 72 | One tick per ingredient row (mise en place); drop the second pantry square | P0 | F C O |
| 73 | Pantry status: only a positive "have" mark, and only once a pantry exists | P0 | P N F |
| 74 | A "Serves 12 [– +]" stepper replaces the 0.5×–3× key bank | P1 | C P |
| 75 | Baker's % only when flour is weighed (bread-type recipes); show it as a printed formula table | P1 | P N O |
| 76 | "+ Add missing to list" under the ingredients | P0 | F C |
| 77 | Method shown in full; delete "READ MORE" | P0 | P N F C |
| 78 | "--- X ---" lines render as phase subheads, not numbered steps | P0 | P N F C |
| 79 | Decode HTML entities ("Don&#39;t") and strip doubled parentheses and orphan footnote marks on display and import | P0 | P N F |
| 80 | Inline timers as an underlined time with a small clock, never a box that breaks the sentence | P1 | C F |
| 81 | The source URL becomes a quiet "Adapted from sugarspunrun.com" credit | P1 | N C P |
| 82 | Strip import boilerplate from headnotes ("Be sure to check out my video…") | P2 | P |
| 83 | Desktop: a two-page spread (sticky photo, facts and ingredients on the left; method on the right) | P0 | C F O |
| 84 | Sub-recipe links as "see also: Pastry cream →" opening a side sheet | P2 | O |
| 85 | Reverse scheduler surfaced as "Plan this bake (eat at 7:00 → start at …)" | P2 | O |
| 86 | "Then and now": first vs latest bake side by side, once there are 2 or more | P2 | O F |

### 7.6 Baking mode
| # | Change | Pri | Source |
|---|---|---|---|
| 87 | Keep: one big step, huge Next, swipe, voice, wave, wake lock | P0 | O F |
| 88 | Step text in serif at 28–32px, anchored in the top third | P0 | C P |
| 89 | A thin progress line with named phase ticks, plus "Step 3 of 12" in words; delete the colour keys | P0 | P N F C |
| 90 | Show this step's ingredients under the step | P0 | N F C |
| 91 | Show this step's timer as a big tappable chip | P0 | N F C |
| 92 | A **Note** button that writes into this bake's log entry | P0 | F P N |
| 93 | The last bake's note, shown on the step it was about | P1 | O C |
| 94 | Header: ×, title, step count, "⋯" (scale, Bluetooth, all steps); no unlabelled icons | P0 | P N F |
| 95 | The last step opens the "How did it go?" bake entry | P0 | N C F |
| 96 | Hide or raise the contrast of the disabled Back button on step 1 | P1 | P |
| 97 | Desktop: a side panel with this step's ingredients, timers, last note and a quick note | P1 | F |

### 7.7 Bakes (bake log, gallery and analytics)
| # | Change | Pri | Source |
|---|---|---|---|
| 98 | Journal by month: thumbnail, recipe, date, stars, one-line note | P0 | C P |
| 99 | A "By recipe" view that keeps the oldest → newest progression | P0 | O F |
| 100 | A bake without a photo shows as a note card (date, stars, first line of the note) | P0 | P F |
| 101 | Each bake's own photo; the recipe hero photo is never shown as a bake | P1 | P |
| 102 | Bake entry fields: date, stars, photos, notes (with mic), "What I changed", "Next time", "Mark as my best" | P0 | C F |
| 103 | Summary strip: "17 bakes · 6 recipes · Best: Cheesecake" | P1 | C O |
| 104 | Per-recipe star sparkline once a recipe has 3 or more bakes; none before that | P2 | C F |
| 105 | Delete the "6 of 203 baked" library meter | P1 | P |
| 106 | Compare two bakes side by side (photos, notes, changes) | P2 | F C |
| 107 | Share a bake as a page-style image card | P3 | C |
| 108 | Recipes with a single bake are grouped in one compact list | P2 | F |

### 7.8 Editor and new recipe
| # | Change | Pri | Source |
|---|---|---|---|
| 109 | Restyle as an open paper form; delete the Identity/panel headers | P0 | C P |
| 110 | Delete goes to "⋯" or a foot link with in-panel confirmation, away from Save | P0 | P C |
| 111 | Label the AI button ("Tidy up with AI") | P0 | P C |
| 112 | Collapse "More details" (times, serves, difficulty, category, tags) | P1 | C |
| 113 | Amounts shown as fractions in inputs, not raw floats ("0.6666") | P1 | F |
| 114 | One duration format everywhere ("1 hr 15 min") | P1 | P F |
| 115 | One input style (the title is mono, the description is not) | P0 | P |
| 116 | Auto-growing textareas | P1 | P |
| 117 | New recipe starts with three doors: type it, paste a link or text, photograph a page | P1 | C P |
| 118 | Pasting a multi-line ingredient list splits it into rows | P2 | C |
| 119 | Edit in place on the recipe page | P3 | C |
| 120 | Two-pane editor with live preview on desktop | P3 | F |

### 7.9 Shop, Discover, Profile, Settings, 404
| # | Change | Pri | Source |
|---|---|---|---|
| 121 | Shop: "To buy" checklist grouped by aisle, then "In the cupboard" chips | P1 | C F |
| 122 | "+ Add from a recipe" opens a searchable sheet (recent and favourites first), replacing the wall of 203 buttons | P1 | P F C |
| 123 | One "Share list" button, hidden until the list has items | P1 | P |
| 124 | Pantry copy in plain words ("Mark what's in your kitchen; recipes will tell you what's missing") | P1 | P |
| 125 | Discover: one search plus a "Sort" select instead of four wrapping chips ("A– / Z") | P1 | P N F C |
| 126 | Discover: a magazine layout with one featured recipe full-width, then a 2-up grid; tags as a filter sheet, not a clipped row | P2 | C |
| 127 | Profile as a "bookshelf": name, bio, avatar, Share profile, grid of covers | P2 | N P C |
| 128 | Shared page: Save directly under the title and photo; Print and Copy link beside it | P0 | N P C |
| 129 | Shared page: rating and comment panels hidden until they have content ("Be the first to bake this") | P1 | N F |
| 130 | Shared page: "What bakers noticed", public bake notes as marginalia | P3 | C |
| 131 | Settings: Appearance, Your cookbook (storage, export, import), Account, Help; one plain line each; a standard switch | P1 | C P F |
| 132 | "My published recipes" list in the avatar menu, plus a "Published" filter in the Cookbook | P1 | F |
| 133 | 404: "That page isn't in this book." plus a search field and a link back | P2 | C P |
| 134 | Clean the test note ("Untitled fhgfhgfNote") from the live library | P2 | P |

---

## 8. What must survive (non-negotiable carry-overs)

Drawn from the Optimist's and Familiar user's must-keep lists and the product constraints:

- **The bake log stays central.** In the new design it gets *more* prominent, not less.
- Baking mode's single-step focus, swipe, voice, wave, wake lock, haptics and timers that survive reloads and sync across devices.
- Ingredients beside the method on desktop; scaling; baker's %; substitutions; checkable ingredients.
- Photo-first browsing; fuzzy search; categories with counts.
- Personal Best; the oldest → newest progression view.
- Honest data: no fake timings, no padded charts, no invented popularity.
- Local-first and offline: no account needed; Export/Import; the "only on this device" honesty in plain words.
- Shared page with a single primary "Save to my cookbook"; "Adapted from @handle".
- Two themes; 375px with no horizontal scroll; 44px targets; `prefers-reduced-motion` respected.
- Every overlay is a focus-trapped `Sheet` with Escape, focus return and scroll lock.

---

## 9. Proposed build plan

All work happens on `feat/ui-overhaul`. Each phase ends with `npx tsc -b`, `npm run lint`, `npm test` and the `after` screenshot set.

| Phase | Scope | Changes |
|---|---|---|
| **1. Foundation** | Fonts, tokens and both themes; rebuild every `src/components/ui` primitive in the new look (Panel → Section, Button, Field, Sheet, Menu, RecipeTile with typeset fallback, Tag, Prose); new `/lab` gallery; rewrite `designSystem.test.ts` for the new rules | 1–18 |
| **2. Shell and navigation** | 4 destinations, avatar menu, no FAB, no More, timer pill, chrome-free public routes, new desktop chrome | 19–31 |
| **3. Recipe page and baking mode** | The heart: reading-first page, Last time / Your bakes / Next time, display cleanup (fractions, subheads, entities, no Read more), Log a bake sheet, new baking mode | 58–97 |
| **4. Cookbook and Bakes** | Home with Contents/Index/list view, de-duplication, filters; Bakes journal plus By recipe, note cards, summary strip | 43–57, 98–108 |
| **5. First run and sharing** | Landing, onboarding removed, empty cookbook, shared page, profile, print stylesheet | 32–42, 16, 127–130 |
| **6. Remaining screens** | Editor, Shop, Discover, Settings, 404 | 109–126, 131–134 |
| **7. Documentation** | A new DESIGN.md written from the built result; update CLAUDE.md (*The visual world*, *The component layer*), PRODUCT.md (brand commitments), CURRENT_FEATURES.md and TESTED_FEATURES.md; new visual-regression baselines | (docs) |

Data-model additions this needs. They are small, local-first, and need no server work:
- `nextTime`, `changes` and `rating` on a bake log, if they don't already exist.
- A `stepIndex` on a mid-bake note.

---

## 10. Decisions needed from you

> **Decided 2026-10-21:**
> - **Default theme:** light paper, with a warm dark "kitchen at night".
> - **Desktop navigation:** a slim top bar replaces the sidebar.
> - **Visual direction:** the printed cookbook (A) is the likely choice, pending review of the mock-up at <https://claude.ai/artifact/SzCyNPm6Seykqcyd8HN96U>.

1. **Visual direction.**
   - **A. Printed cookbook / editorial.** Recommended by the Challenger and by me.
   - **B. Recipe-card box.**
   - **C. Baker's field notebook.**
   - **A + C's margin notes.** The default if you don't choose.
2. **Default theme.** A cookbook suggests **light "paper" by default**, with a warm dark "kitchen at night". CLAUDE.md currently mandates dark, true `#000000`. Either keep dark as the default (re-coloured warm) or switch to light.
3. **Desktop navigation.** CLAUDE.md records "the sidebar is always visible on desktop; it never disappears" as a key decision. The Challenger proposes a slim top bar instead, for a book-like reading width. Keep a (restyled, 4-item) sidebar, or switch to a top bar?

Rewriting DESIGN.md, `src/designSystem.test.ts`, and the visual sections of CLAUDE.md and PRODUCT.md comes with whichever answers you give. Those documents describe the look being replaced.

---

## Appendix: screens captured

`audit-shots/overhaul/before/` (git-ignored; regenerate with the command in §1).

| Persona | Screens |
|---|---|
| Stranger | 01 landing (dark, light) · 02 onboarding · 03 empty cookbook · 04 discover · 05 shared recipe link (dark, light) · 06 profile |
| Regular | 01 dashboard (dark, light) · 02 recipe (dark, light) · 03 baking mode (dark, light) · 04 editor · 05 new recipe · 06 gallery · 07 analytics · 08 pantry · 09 grocery · 10 notes · 11 settings · 12 discover · 13 not found · 14 mobile "More" menu (phone only) |

Each screen has `w375` and `w1280` variants, each with `fold`, `page` and `text` files.
