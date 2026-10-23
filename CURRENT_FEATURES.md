# Proof: Current Features Tracker

This document exhaustively tracks every capability, component, and technical integration currently active in the Proof codebase.

## 1. Core Recipe Management
- **Structured Schema (on the device)**: Recipes live in the device's IndexedDB, not the server (Launch Plan Phase 1), with precise, structured fields: `title`, `description`, `imageUrls`, `servings`, `difficulty`, `prepTime`, `cookTime`, `tags`, `ingredients` (Object: Name, Qty, Unit — the amount is `null` for "to taste" or "to serve" rather than an invented 1, the unit empty for a plain count), `instructions`, `folder`, and `labNotes`.
- **Fuzzy Search & Filtering**: Uses `fuse.js` to enable rapid, typo-tolerant searching across recipe titles and tags on the dashboard.
- **Nested Sub-Recipe Drawers**: Allows linking recipes to specific instruction steps. Linked recipes slide up in a native drawer without losing context in the parent recipe.
- **Compact & Grid Views**: UI toggle on the dashboard to switch between large image cards and dense list views.
- **Recipe Folders**: Recipes can be organized into named folders for easy browsing.
- **Sub-recipe Instruction Links**: Any instruction step can link to another recipe, which opens inline in a drawer.

## 2. "The Kitchen Lab" (Active Baking Mode)
Rebuilt in the UI overhaul, Phase 3: see section 18. Kept from before, all of it:
- **Hands-free navigation**: voice commands ("Next", "Back", "Read", "Ingredients", "Start timer", "Quiet", "Show all", "Up/Down", "Help", "Finish", "Close"), wave to advance through the front camera, and swipe.
- **Real-time timers**: times in a step start timers that run on the device and survive a reload; signed in, they sync live between the account's own devices over Socket.io (see §12). Finished timers are spoken (`speechSynthesis`), notified and felt (haptics).
- **Wake lock** keeps the screen on mid-bake.
- **Zero-touch Bluetooth scale**: the live weight reads beside the step's target once a scale is connected, and the step advances when the target is reached.
- **Reverse bake scheduler**: "Plan this bake" on the recipe page works back from when you want to eat to when to start each step.
- **Dictation** in the bake log.

## 3. Bake Logs & Learning
The bake log lives on its recipe since the UI overhaul, Phase 3 (section 18): "Last time" under the title, "Your bakes" along the foot, a sheet per bake.
- **Labelled photographs**: a bake's photographs carry labels ("Dough", "Crumb"), shown under each picture.
- **Before and after**: a bake with two photographs shows them side by side; "Then and now" wipes between a recipe's first and latest photographed bakes with a slider that works by keyboard.
- **Personal best**: one per recipe, stamped.

## 4. Data Insights, AI, and Utilities
- **AI Recipe Extraction**: Paste a URL from any recipe website and Gemini scrapes & structures it into the app format.
- **AI Recipe Restructuring**: Paste raw text and Gemini formats it into structured ingredients and instructions, with a live diff preview before accepting.
- **AI Ingredient Substitutions**: `AISubstitutionsModal.tsx` connects to Gemini to generate smart ratios for missing ingredients (e.g., swapping AP Flour for Whole Wheat).
- **The cupboard and barcode scanning**: what is already in the kitchen, read by a recipe's "have it" mark, "Add missing to Shop" and the cookbook's "Can make now". Kept under Shop → In the cupboard since the UI overhaul, Phase 6 (section 21); `html5-qrcode` scans a UPC barcode to add a thing.
- **The shopping list**: Shop → To buy, saved on the device, grouped by aisle, filled from a recipe's missing ingredients or typed (section 21). `GroceryList` and its bank of recipe keys are gone.
- **Baking Analytics**: removed in the UI overhaul, Phase 4. Bakes opens on one summary line — "17 bakes · 6 recipes · best: Cheesecake" — in its place (section 19).
- **Automated Maintenance**:
  - `node-cron` runs a nightly script to dump the MongoDB database into a JSON backup.
  - Clean-up script queries Cloudinary's Admin API to automatically delete orphaned images that are no longer linked to any recipe or log.
- **Offline PWA Engine**: `vite-plugin-pwa` configures Workbox to cache the app shell and fonts. The cookbook itself needs no cache: it is on the device, so it reads and writes the same with no network.

## 5. Sub-Resources & Media
- **Bake Logs**: Dedicated logging objects attached to recipes, storing the date, photos, success notes, and a "Personal Best" flag.
- **Image Architecture**: Photographs are captured via `@capacitor/camera` (or file upload), compressed on the device and kept there as blobs (see §10). Cloudinary holds only the server's own library and, later, published copies.
- **Export Engine**:
  - `jspdf` and `html2canvas` generate beautiful printable PDFs and square recipe cards.
  - **Shareable cards** (`InstagramExporter.tsx`): redesigned in the UI overhaul, Phase 5 — printed pages on paper (section 20).
    - **Provenance applies here too**: no fabricated timing, and the keys are exact in every branch — labelled phase keys where the recipe proved its phases, one key per step for a short generic recipe, and phase keys again past sixteen steps where a key per step stops reading as a row.
    - **Rendered from literals**: html2canvas rasterises outside the document's cascade, so the card's palettes, fonts and seven-segment fills are pinned values rather than tokens. It loads nothing that could fail — no remote logo, no stock fallback photograph.
    - **Fixed**: the card was captured through the preview's CSS transform, so a card exported from a phone came out under 900px square and its size depended on the window width. The scale now comes off for the duration of the capture; every card renders at 1080 (2160 at 2× device scale).
  - `qrcode.react` creates scannable deep-links.

## 6. Security & Auth
- **Operator PIN**: The PIN now means the site operator only: server backup, photo re-hosting, copying the server library, and (for now) the AI. Writing to your own cookbook needs nothing — it never reaches the server. A stranger is never shown a PIN prompt for saving a recipe.
- **Crypto-Random Session Tokens**: Sessions are 256-bit random tokens, stored server-side only as their SHA-256 in a `Session` collection with a TTL index, so a restart or deploy signs nobody out and a copy of the collection is not a set of working sessions — no hardcoded secrets.
- **Rate Limiting**: The PIN (5/min), sign-up, sign-in, password and deletion routes (10 per 15 min) and each AI route (10/min) are rate-limited per caller; the server trusts Render's one proxy hop so the limit is per person, not global.

## 2a. Dashboard (Phase 2 — hero surface)
Rebuilt as the cookbook home in the UI overhaul, Phase 4: see section 19. Still true from here:
- **Provenance gates the data**: `isPlaceholderTiming` recognises the import script's `"20 mins"` / `"30 mins"` pair, which 199 of the 203 live recipes carry verbatim; no time is printed unless it is real.
- **Duration parsing**: `src/lib/duration.ts` reads both the bare-minutes convention ("30") and unit-annotated or bracket-wrapped text ("[50 mins]", "1 hr 30 mins") into one total, printed as a cookbook does ("1 h 15").
- **The running bake** (`src/lib/activeBake.ts`, `localStorage`-backed, live across tabs) surfaces on the cookbook's resume card and as the timer pill (section 17).

## 2b. Application shell (Phase 2)
- **Sidebar, bottom nav, More and the floating New**: replaced in the UI overhaul by four destinations, a phone tab bar, a desktop top bar and an avatar menu — see section 17.
- **PIN auth modal, offline/stale bars**: retheme only — the PIN numeric keypad's interaction is unchanged (an explicit favourite). The onboarding modal was removed in the UI overhaul, Phase 5 (section 20).
- **Fixed**: dangling `hover:` / `dark:hover:` Tailwind fragments left by Phase 0's glow-stripping script across 15 files.

## 2c. Photo plates (Phase 2a)
- **`RecipePlate` primitive**: A square, fixed-ratio image plate bordered by the panel's own hairline rule — a specimen mounted on the faceplate, not a floating card with a shadow. Three sizes: `row` (beside a pattern row), `tile` (a smart-shelf tile), `hero` (the framed plate on a recipe, sized by its wrapper).
- **Lazy and fault-tolerant**: Images are `loading="lazy"`, so a 203-row library does not fetch 203 photographs on first paint, and a dead URL falls back to the unlit plate instead of a broken-image glyph. The footprint is identical with or without a photograph, so a row's geometry never shifts.
- **Adopted by gallery tiles, smart shelves and the Recipe Viewer**: The amendment behind this is recorded in [REWORK_PLAN.md](REWORK_PLAN.md) — every recipe in the live library has exactly one final-product photograph, so the original assumption of uneven coverage was paying for a cold first screen to solve a problem that does not exist.
- **Step keys are capped as well as floored**: A recipe deriving only three phases used to stretch each key across a third of the row, where a 200px-wide rectangle stops reading as a key. Keys now have a maximum width, so the row shortens when there is less to play.

## 3a. Recipe Viewer (Phase 3)
Replaced by the printed-cookbook recipe page in the UI overhaul, Phase 3: see section 18. The fixes recorded here still hold: a missing recipe shows the 404 panel with the way back, a long unit stays inside its column, and a shared recipe that is unpublished is a page that no longer exists.

## 6a. Recipe Editor and Notes (Phase 6)
The editor itself was rebuilt as an open paper form in the UI overhaul, Phase 6 (section 21). Still true from here:
- **Shared `Sheet` primitive**: One overlay component replaces eleven hand-rolled scrim-and-panel copies. It traps Tab inside itself, closes on Escape, returns focus to whatever opened it, and locks the page behind from scrolling — none of which any of the eleven copies did, so a modal was previously a keyboard trap. Escape is owned by the topmost sheet only, and the scroll lock is counted, so a sheet opened over another sheet behaves. Renders through a portal, so no transformed ancestor can clip it. `placement="bottom"` is the thumb-reachable sheet; `center` is the dialog.
- **`TextArea` and `Select` primitives**: Multi-line values and the difficulty picker carry the same outline, focus signal and error wiring as `Field`, rather than being bare browser controls. `Select` keeps the native popup — the platform's list is what every thumb and screen reader knows — and themes only the closed state.
- **Field-by-field AI review** (`AIReviewSheet`): "Tidy up with AI" opens a panel per field that actually differs, current reading beside proposed, each kept or rejected on its own — so a better title can be taken without also taking rewritten ingredients. A field the model echoed back unchanged is not drawn as a change, and a model that proposed nothing says so.
- **Fixed — prep and cook times were silently wiped on save**: The time fields were `type="number"` while 199 of the 203 live recipes store `"20 mins"` / `"30 mins"`, so the browser rendered both empty and saving erased them. They are read through `parseDurationMinutes`, and a retyped time is written back as bare minutes, the schema's own convention.
- **Sub-recipe linking is searched, not listed**: The link sheet renders a search field and at most 24 matches instead of all 203 recipes as buttons. Moving a step carries its linked sub-recipes with it.
- **Notes rebuilt without the markdown editor**: `@uiw/react-md-editor` and `rehype-sanitize` are removed from the dependency tree along with the `editor-vendor` chunk they needed. A note is a panel and a textarea.
- **Notes reachable on a phone**: The note list was `hidden md:flex`, so a phone could see whichever note loaded first and reach no other. The same list is a bottom sheet at that width.
- **Notes report their own save state**: the head shows a Save control only when there is something to save — otherwise it reads "Saved" rather than offering a disabled button. A failed save keeps the typed text and says so.

## 6b. The selected make, and the viewer's overlays
Rebuilt as the bake sheet in the UI overhaul, Phase 3 (section 18). Still true: every overlay is a `Sheet`; each stacked sheet carries its own accessible name; a latching control (Personal best) is announced as a toggle in both states; the QR code keeps its white quiet zone in both themes; failures report in the panel or a toast, never through `alert()`.

## 7a. Analytics, Settings, Landing, 404 (Phase 7)
- **Settings**: rebuilt in the UI overhaul, Phase 6, with the `Switch` primitive in place of latching keys (section 21).
- **Fixed — every meter grew an orange tip near full**: `Meter`'s `hotAt` defaults to 1, meaning the scale has no dangerous end, but the warm band 15% below it fired regardless. Any meter running near full showed orange cells it was never asked for. A meter with no hot end now has no warm band either.
- **Fixed — a real but tiny value read as empty**: 3 of 203 recipes rounds to zero lit cells, so a meter captioned "3 of 203" sat entirely dark. A non-zero value now lights at least one cell: some is not none, and that difference is the reading.
- **The landing page**: rewritten in the UI overhaul, Phase 5 (section 20); the drum-machine demonstration is gone.
- **The chase holds still under reduced motion**: The global CSS rule collapses animation, not a timer, so the page checks `prefers-reduced-motion` itself and leaves the row on one lit phase.
- **The landing page is routed outside the app shell**: It rendered inside the sidebar and bottom nav — chrome for sections a first-time visitor has not reached, around a product they have not agreed to use. It is a sibling of the shell now, full-bleed.
- **Removed: `public/hero.jpg`**: 807KB of blurred stock photography, unreferenced once the landing page stopped using it, and precached by the service worker.
- **404**: "That page isn't in this book.", with a search and the way back, since the UI overhaul, Phase 6 (section 21).

## 7b. Mobile targets and the last alerts
- **44px targets across the rebuilt surfaces**: A sweep at 375px found the editor's row controls, its Add row / Add step keys, the notes page's controls and `Sheet`'s own close control all sitting between 24px and 36px. Everything a thumb reaches repeatedly is now 44px. The close control keeps its small cross and grows only its hit area, with a negative margin so the panel head's spacing is unchanged. The one remaining exception is the × inside a tag chip, which is a dense inline affordance the design system's `sm` size exists for — 44px there would deform the chip into a block.
- **No horizontal scroll at 375px** on any rebuilt surface.
- **The mobile ingredient row is two lines, not five**: Stacking every field turned a sixteen-ingredient recipe into a 3,800px scroll. Quantity and unit share the first line; the name and the row's controls share the second. The controls ride with the name rather than the unit, because three 44px targets beside the unit left it about 60px wide and that column holds words — "juice of", "cm piece", "clove crushed". `md:contents` dissolves both wrappers at desktop width, where the row fits on one line.
- **The last two `alert()`s are gone**: "Link copied" and "Grocery list copied" were operating-system modal dialogs, raised over a sheet, needing a second click, to confirm something that had already worked. They are a status strip that takes itself away after two and a half seconds.

## 8. Finish (Phase 8)
- **Reduced motion in all three layers**: The global CSS rule reaches CSS only. `MotionConfig reducedMotion="user"` covers framer-motion, which writes inline styles from its own loop — the recipe drawer and onboarding modal had been animating regardless of the OS setting for the whole rework. A JS timer is outside both, so the landing page's chase light checks for itself and the guard test fails any future one that does not.
- **Visual regression baselines** (`e2e/`, `npm run test:visual`): 47 images across ten surfaces, both themes, desktop and phone, plus the `Sheet` as a centred dialog and as a bottom sheet. Fixtures never touch the live database or the image CDN, the clock is pinned because several surfaces print relative dates, and photographs resolve to a flat grey square — deliberately flat, since a fixture that already looked like a gradient would hide the day somebody adds one. The 375px floor is asserted on every route rather than photographed, and polls rather than measuring once.
- **Fixed — the baselines could not see small changes**: `maxDiffPixelRatio` of 1% on a full-page desktop shot is roughly 29,000 pixels of silent allowance. It hid a button's legend changing colour and a floating action button moving 16px. The budget is an absolute 150 pixels.
- **Fixed — four surfaces floated behind the bottom nav on a phone**: Both floating action buttons, the copied-link strip and the error bar hard-coded `bottom-24`, which is the nav's height with no device inset and therefore behind the nav on any phone that has one. One `.above-nav` utility adds the inset and carries its own desktop value. The recipe drawer reserved no inset at all.
- **Fixed — the signal control failed contrast**: White on the dark theme's `#FF3B30` is 3.55:1, under the 4.5 that text that size needs, on "Start recipe" and "Next". `--on-signal` flips with the theme because the red does not: 5.92:1 dark, 5.75:1 light. Guarded by computing the ratio from `index.css`.
- **Fixed — an installed Proof had no icon**: The PWA manifest named `pwa-192x192.png`, `pwa-512x512.png`, `favicon.ico`, `apple-touch-icon.png` and `masked-icon.svg`; none of the five existed. The artwork that did exist — including what `capacitor-assets` reads for the Android launcher — was a gold chef's hat from the Black & Gold world. The mark is now the step row: four keys, two complete, one lit red, one unlit, drawn from the design tokens by `scripts/generate-icons.mjs` at every size the web and Capacitor need.
- **Fixed — the app still loaded Inter from Google Fonts**: `index.html` preconnected to two Google domains and pulled a face the design system does not use, on every load, for the whole rework. The CDN guard only ever checked the stylesheet. Self-hosting exists because the scene is a kitchen with no signal.
- **No browser dialogs anywhere**: Seven remaining `alert()` and `confirm()` calls are gone, three of them inside Baking Mode. Failing to connect a scale or save a bake log now reports as a bar under the head — not an overlay, so it never covers the instruction and never has to be dismissed before baking continues. Finishing by voice asks on the panel with two large keys, answerable the same hands-free way the question was raised.
- **Orphans removed**: `public/icons.svg`, `public/gallery-empty.jpg`, `public/logo.png`, the `icons/` directory, and the unused `class-variance-authority` dependency.
- **[DESIGN.md](DESIGN.md)**: the design system written from the built artifact rather than from the plan, recording four deviations from the direction contract — the gallery amendment, the dimmed queued and complete keys, two faces instead of three, and where the step row lives on the cookbook — along with the known gaps.

## 9. Public launch — Phase 0 UI audit
- **Draws only what the data supports** (harden pass): the bread reading needs a leavening agent and a rise, and more than one phase — eight live recipes read as bread (all yeasted), down from eighteen that included kebabs, steaks and puddings; opening steps join the phase a bread actually starts in rather than Levain, while generic recipes keep Prep. The seed's "A delicious {area} {category} dish." (200 of 203 recipes) is not printed in the recipe header or on the Instagram card. Baker's percentages are computed by weight (g, kg, oz, lb; ml and l for water only) and replaced by a sentence when the flour is measured by volume. "This step needs" matches every distinguishing word of an ingredient as a whole word, and the Bluetooth scale's auto-advance target exists only when every ingredient in the step is weighed. The reverse schedule takes a step's own stated time, shares a real recorded total, or assumes 15 minutes and says so per step and in a caveat; the placeholder timing is no longer spread as a total, and the running bake's total on the dashboard reads unknown instead of 50 MIN.
- **Tablet widths** (adapt pass): the 256px sidebar had left a tablet 416px, where the recipe's ingredient names wrapped a letter per line and the cookbook's search row ran 245px off the page; it became a 64px icon rail, and since the UI overhaul (section 17) a slim top bar gives the page its full width. The Recipe Viewer goes two-column (ingredients beside method) by its own width, with a container query, rather than by the viewport: single column at 768 and 1024, side by side at 1280. The cookbook's title and search share a row only from 1280. The ingredient Sub control hides until hover only on devices that can hover; keyed to width, it was invisible on touch tablets. The phone browser's top padding is the safe-area inset plus 1.5rem — the inset's own fallback never applied in a browser, so headlines sat flush against the top edge. The audit matrix, re-run at 375, 768, 1024 and 1280, finds no sideways scroll anywhere.
- **Every overlay is a `Sheet`** (polish pass): the last eleven hand-rolled overlays now share its focus trap, Escape, focus return and scroll lock. Onboarding draws its progress as a step row (the screen you are on is lit, the next is due) with Skip/Back and Next, and no longer prints its pager over the description at 375px. The PIN prompt keeps its phone keypad, takes focus in the PIN field on desktop, names its keys for a screen reader, starts clean on each open, and reports a wrong PIN inside the dialog instead of a floating toast. AI substitutions is a ruled list with a skeleton while it waits, a sentence when nothing comes back, and Try again after a failure. The sub-recipe drawer is a bottom sheet printed like the recipe page, with a skeleton and a retry instead of "Loading…" and a silent failure. Baking Mode's ingredients list, bake log and voice-command list are sheets, and Escape or the arrow keys pressed in an open sheet no longer leave Baking Mode or turn the step behind it. The pantry's barcode scanner and the timer prompt are sheets.
- **`Menu` primitive**: a dropdown hung from its trigger. It closes on Escape and returns focus to the trigger, closes on any press outside it, and walks its items with the arrow keys, Home and End. The Recipe Viewer's Share and Start recipe dropdowns use it. On a phone the unlabelled ⋮ is a 44px "More actions" control that opens one bottom sheet with Share (copy link, QR code, PDF) and Recipe (favorite, edit) groups, which replaces the separate phone share sheet.
- **Timers and the scheduler in the panel language**: the running timers are a sheet opened from the timer pill (section 17), each time on butter with a minus sign past zero, and its remove and pause controls are 44px and named. The reverse scheduler is a `Panel` with a printed timetable (start time in mono beside each step) in place of the rounded card and dot timeline. Fixed on the way: its default "tomorrow at 9:00" was written as UTC, so outside UTC it showed the wrong hour.
- **No "Loading" text left in the shell**: the route fallback and the Instagram exporter fallback are skeletons. A failed PDF export or favorite toggle is reported in the status strip instead of the console. `Sheet` takes an `initialFocus` ref, and centres a sized bottom sheet on a wide screen. A focused button in a bank of joined buttons is lifted so its focus ring is not painted over. The pantry's remove controls are 44px.
- **Red is spent on "now" again** (quieter pass, Launch Plan decision B3): red marks only what is happening now — the lit step key, the running bake, an overdue timer, the scale on target, the focused field — and the one primary control on a screen. Timer chips in the method are outlined queued keys until started. The Now Baking panel keeps its border, lamp and running key; its total and Resume go ink. Ingredient checkboxes, the selected note, photo selection, the onboarding icons and pager, and a scaled serving count are ink. The phone's Start key on the Recipe Viewer is a proper lit key with an accessible name, and four hand-rolled red buttons (sub-recipe drawer, reverse scheduler, timer prompt, AI substitutions) are the `Button` primitive.
- **The fault lamp**: a new `--fault` token (`#8f4c00` light, `#ff9a00` dark) for every error, refused save and outage — the same caution amber as the offline bar, deepened in light so it reads as text (5.7:1 on a panel). Fixed on the way: the offline and stale bars used the due amber, which reads at 2.6:1 on the light faceplate. Destructive controls carry the `--spoiled` rule with an ink legend instead of red text. The AI substitutions sheet loses its purple, and the crash screen and sub-recipe error lose stock Tailwind reds.
- **Guarded**: `designSystem.test.ts` fails the build if red appears outside the files that report something happening now, if an error is drawn in red, if the destructive variant goes back to red text, if a stock Tailwind palette colour or the legacy `accent` alias is used, or if `--fault` drops below 4.5:1 on a panel in either theme.
- **The Phase 0 audit matrix** (`e2e/audit/`, `npm run audit:snapshot` → `audit:ui` → `audit:report`): 14 routes × 375/768/1280 × light/dark × empty/typical/overflowing, plus loading, error and offline states at the phone and desktop widths — 264 cells — and a stranger's first session walked end to end. The *typical* column is a snapshot of the live library read from the public API, not a fixture, because the point is what the real data does to the surfaces. It records rather than asserts: each cell writes a full-page shot and measured facts (sideways overflow, loading text, placeholder timings, red regions, sub-44px targets, unlabelled icon buttons, console errors, time to settle), and the report script turns them into tables and contact sheets. Resumable with `AUDIT_RESUME=1`. Findings and the Stage B decisions are in `.agents/UI_AUDIT.md`.
- **The UI-overhaul review set** (`e2e/overhaul/`, `npm run audit:overhaul`): 25 screen states shot at 375 and 1280, each as the first screen and as the full scrolled page (the app scrolls inside `<main>`, so the shell is let out to the page's height before the long shot), with the visible text beside every image. Two people rather than a matrix: a *stranger* on an empty device arriving at the landing page or a shared link, and a *regular* with the live library plus a believable 14-bake history so the iteration surfaces have something to show. `OVERHAUL_LABEL` names the set (`before` by default) so a later run lands beside it in `audit-shots/overhaul/<label>/`. Excluded from `npm run test:visual`. The review it fed, five reviewers and a 134-item change list, is [docs/ui-overhaul/AUDIT_REPORT.md](docs/ui-overhaul/AUDIT_REPORT.md).

## 10. Public launch — Phase 1: the local-first cookbook
- **The cookbook lives on the device**: IndexedDB is the source of truth for recipes, bake logs, notes, pantry and folders (`src/lib/repo`). Every screen reads and writes through the repository, never the server, so the whole app works with no network and no account. Reads are TanStack queries with `networkMode: 'always'`, so a query never waits on a network it does not use.
- **Client-minted identities**: every record gets a ULID when it is created, before any server sees it — time-ordered, so "newest first" stays a string sort.
- **Sync-ready records**: every record carries `createdAt`, `updatedAt` and a `deletedAt` tombstone. Deletes are soft: the record leaves every read but stays in the store, so a later sync can tell "deleted here" from "never existed here". A patch can never move a record's id or timestamps.
- **Photographs as compressed blobs**: a photograph is shrunk to 1600px on its long edge and stored as WebP (JPEG where the browser cannot encode WebP), typically ~200 KB from a 4 MB phone photo. Records refer to it as `photo:<id>`; `Photo` and `usePhotoSrc` draw it through shared, counted object URLs. Photographs no live record uses are collected an hour after they were orphaned.
- **The old offline store is carried across**: version 1 of the device database held only offline bake logs with photos as data URLs. The upgrade to version 2 moves them, converting each data URL into one stored blob, inside the upgrade transaction.
- **Storage that is kept**: the first write asks the browser for persistent storage. Settings → Data on this device reports whether it was granted, how much space the cookbook uses (as a meter), and whether the server is reachable — one line, not a bar across every screen (decision B29).
- **Export and import**: the whole cookbook as one `.zip` — a JSON file per record type and the photographs as image files, readable without Proof. Import merges by `updatedAt`: importing twice changes nothing, an old backup never overwrites a recipe edited since, and deletions survive the round trip. A file that is not a backup is named as such.
- **Copying the server library here** (operator): the recipes, bakes, notes and pantry stored on the server before Phase 1 come onto the device with their ids kept, so links and bake references still resolve. Running it twice adds nothing.
- **No offline bar**: being offline is the normal case now, so it is not announced on every screen. Each network feature says so itself when it cannot be reached.
- **Honest failure states** (audit #1–#3): the editor shows no form — and no Save or Delete — until the recipe being edited is in it, so a failed read can never be saved over a real recipe. A recipe that is not on the device says so, in the viewer, the editor and Baking Mode. Bakes and both Shop views name a failed read and offer a retry instead of drawing an empty or zeroed panel. Local reads draw nothing for their few milliseconds rather than flashing a skeleton (B30).
- **A bake with no photograph is still a bake**: the gallery draws it as an unlit plate, so the history and Analytics agree on the count. A deleted recipe's bakes stay, under "A deleted recipe".
- **Ownership, not admin** (C2): `useSession()` (who is here — anonymous or the operator), `useOwnership(record)` (is this mine: a record on this device is, a shared one is not) and `usePlan()` (what may I do) replace every `adminToken` check.
- **The server library is retired from the write path**: the server's recipes, bake logs, notes and pantry are no longer an API anyone writes to — the old CRUD routes (two of which had no auth at all) and the photo upload route are gone, along with demo mode and the multer dependencies. What remains is one operator-only read, `GET /api/library`, which Settings uses to copy the library onto a device.
- **String ids on the server**: every server record now has a string `_id` (a ULID for anything new), an `ownerId` for when accounts arrive, and a `deletedAt` tombstone, matching the device. `server/scripts/migrate-string-ids.js` rewrites the pre-Phase-1 ObjectIds as their hex strings — the ids the device already holds — keeping bake-log and sub-recipe references pointing at the same records; dry run by default, backs up every collection before `--apply`, idempotent, and `--owner=<id>` assigns unowned records to an account.
- **Orphan photo cleanup counts published copies**: the nightly Cloudinary sweep keeps any image a published recipe still uses, so a recipe deleted from the library cannot take a live public page's photograph with it.
- **One reading of a bake's photographs** (`bakePhotoUrls`): older bakes filled only the labelled list or only the plain one; the gallery and the bake grid read whichever has them, and copying the server library fills both.
- **The AI explains itself instead of asking for a PIN** (B10): import, restructure and substitutions stay visible; reaching for one opens a sheet saying what it does, that it opens to everyone with accounts as a monthly allowance, and that everything on the device is unaffected.

## 11. Public launch — the shared cookbook, read side
- **`PublishedRecipe`**: a separate collection of snapshots — publishing copies, it does not flag — with its own ULID, slug, author handle, attribution, moderation state and stats. Only approved, unpublished-null recipes are ever served.
- **`GET /api/published`** (paged, `featured`, `tag`) and **`GET /api/published/:idOrSlug`**: public, read-only. With the database down they answer 503 with a message that says your own recipes are unaffected.
- **The seeded library** (`server/scripts/curate-library.js`): an editorial review of all 203 server recipes (`server/data/library-edits.json`) — real timings, servings and difficulty, real descriptions, methods rewritten where they could not be cooked from, and a publish/withhold verdict with a reason. Dry run by default; `--publish` seeds the shared cookbook, `--fix-library` repairs the operator's own records. Both back up the collections they touch to `server/backups/` first, and both are idempotent.
- **The starter shelf** (B15/B16): an empty cookbook offers featured shared recipes under its three doors, each one press to add (section 20). Offline, it says the shared cookbook needs a connection and the doors still work.
- **`/r/:slug`**: a shared recipe in the same viewer (B4) — no edit, favorite or lab notes; "Shared by @handle · from Source"; one primary control, Save to my cookbook. A recipe already saved offers Open my copy instead of a second one. An unpublished recipe reads as a page that no longer exists; an unreachable server says so with a retry.
- **Fork to local**: saving makes an editable copy on the device that remembers where it came from (`forkedFrom`), and brings the photograph onto the device where the host allows it. The copy's header reads "Adapted from @handle", linked to the original, and its Share menu copies the original's address — a recipe that exists only on this device offers no link at all.

## 12. Public launch — Phase 2: accounts
- **Accounts are optional and for publishing**: email, password and a public `@handle` (3–24 letters, numbers or underscores, unique case-insensitively; site and route names such as `proof`, `admin`, `settings` are reserved). The cookbook never needs an account. Passwords are argon2id (OWASP's minimum parameters), never logged or returned.
- **Bearer sessions, not cookies**: the session token is sent as an `Authorization` header and kept on the device beside the account. The Android app is a WebView on another origin, where Android blocks third-party cookies by default; a header works the same on the web and in the app, and carries no CSRF risk. Users' sessions last 30 days; the operator's 24 hours.
- **Endpoints** (`/api/auth`): sign up, sign in, sign out, read and update the account (display name, bio, handle), change password (signs every other device out), export everything the server holds as JSON, and delete the account (password required; its published recipes come down with it; the cookbook on the device is untouched).
- **One answer for a failed sign-in**: a wrong password and an unknown email get the same message, and an unknown email still runs a password check, so neither the message nor its timing tells anyone who has an account.
- **The account is known offline**: it is stored on the device with its token, so the app knows who is signed in with no network, and refreshed from the server on start, on reconnecting and on returning to the tab. A session ended elsewhere (password change, deleted account, expiry) signs the device out and opens the sign-in sheet with a line saying so.
- **The sign-in sheet** (B20): one `Sheet` for signing in and making an account, opened from what needed it, More → Account, or Settings — never a permanent button in the chrome. Making an account says first that the cookbook stays exactly where it is. The server's objection lands on the field it names.
- **Settings → Account** (B18, B23): signed out, one line and the way in. Signed in: handle, email (marked unconfirmed until confirmed), plan, the month's AI allowance, and "Your N recipes and M bakes stay on this device." Profile, change password, export account data, sign out, and delete account behind a password sheet. The operator's tools keep their own "Operator sign-in".
- **The AI as a monthly allowance**: the operator, and accounts with a confirmed email, may use import, restructure and substitutions — 5 actions a month between them for a free account. A call is charged before it runs and refunded if it fails, atomically, so racing requests cannot overspend; a new month starts the count again. "3 of 5 left this month" sits in the foot of the AI sheet and under the import (B11); at zero the server's message says when it resets. A stranger reaching for the AI is offered sign-in, and an unconfirmed account is told to confirm its email.
- **Import is fenced**: the server fetches only public http(s) pages on their default ports, checks every address a name resolves to at connect time (no loopback, private, link-local or metadata addresses), follows redirects by hand under the same check, and stops at 10 seconds or 3 MB. Imported photographs are no longer re-hosted to Cloudinary; the recipe records its `sourceUrl`. Restructure refuses more than 20,000 characters; substitutions cap their inputs. The unused photo-tagging endpoint is gone.
- **Timers belong to an account**: they used to be one list shared by every connected client. They run on the device now, kept in localStorage, so offline and signed-out timers work; signed in, a socket presents the session and joins the account's own room, timers started offline merge in when it connects, and nobody else's screen sees them. Socket input is validated. Timers from the old shared list are discarded on restart.
- **A Content-Security-Policy on the page**: with sessions held on the device, the server sends the app's page with a policy that allows only its own scripts — the one inline script, the theme bootstrap, by a hash computed from the built file (line endings normalised as the browser parses them) — and refuses framing, plugins and foreign form targets. Every response also carries `nosniff` and a strict referrer policy, and JSON bodies are capped at 1 MB.
- **The operator becomes user #1** (`server/scripts/claim-library.js --email=…`): gives the operator's account the reserved `@proof` handle, authorship of every copy published under it, and ownership of the pre-Phase-1 library records. Dry run by default.

## 13. Public launch — Phase 3: the global cookbook (server)
- **Publishing is a snapshot, and publishing again is "push update"**: `POST /api/published` (confirmed email, 30 an hour) takes a copy of a recipe keyed by its author and the recipe's id on their device, so the same recipe republished keeps its address even under a new title, and editing it on the device never touches the public page. Private tags such as Favorite never travel. A second recipe of the same name gets `-2`.
- **The attribution rule**: a recipe imported from another site (`sourceUrl`) is published only with a visible credit, or with the author's word that the method and description are their own.
- **Only the author's photographs travel**: photographs taken on the device are sent as compressed data and uploaded to Cloudinary on publish; a photo already in the shared cookbook is kept; a picture hot-linked from another site stays behind, and the response says how many did.
- **The pre-screen**: Gemini reads every published recipe and every comment. A clean one goes live; anything else is held for the operator — never rejected by the model alone — and so is everything when the model can't be asked.
- **Moderation states the author can see** (`GET /api/published/mine`): approved, pending (with the screen's reason), rejected (with the operator's reason, fixed by resubmitting, which is screened again). A stranger's view of a recipe carries no author id, device id or moderation notes.
- **Unpublish** by the author at any time; the operator can take a live recipe down.
- **Browse**: `GET /api/published` sorts by recent, most baked, rating or title and filters by tag and author; `GET /api/published/index` lists every live recipe in brief for searching on the device.
- **Saves, ratings and "I baked this"**: saving a shared recipe counts toward its saves. An account rates a recipe 1–5 and/or marks it baked — once, replaced on rating again, never its own; the counts are recomputed from the ratings, and a deleted account's ratings come off.
- **Comments, guarded** (Accepted risk 1): a confirmed email, an account at least a day old, the screen, and five an hour. A held comment is visible only to its author. A comment's author or the recipe's author can take it down.
- **Reports and the moderation queue**: anyone may report a recipe or a comment (rate-limited per address, a reason required). The operator's queue (`/api/moderation`) lists held recipes, held comments and open reports with what each is about, and approves, rejects, takes down, removes and resolves.
- **Baker profiles** (`GET /api/profiles/:handle`): the public profile, live recipes and how often they have been baked; the seeded library's handle works before anyone claims it.
- **Shared links that describe themselves**: `/r/:slug` is served with the recipe's own title, description, OpenGraph image and schema.org Recipe JSON-LD (durations in ISO 8601, ingredients, steps, author, rating when there are votes; the seed's placeholder timing is never published as a measurement), and `/@handle` with the baker's name. Every value is escaped, and the JSON-LD cannot close its own tag. It is meta injection into the built page, not a server render.
- **Account export and deletion cover the shared cookbook**: ratings and comments are exported, and deleted with the account.

## 14. Public launch — Phase 3: the global cookbook (app)
- **Where a recipe stands** (B6, B7): under each recipe's header, `PublishState` — a short bank of keys, LOCAL · LIVE · EDITS, read like the step row — says in light and in words whether the recipe is only on this device, waiting for review (LIVE lit queued), live, or live with edits not yet pushed (EDITS lit due). One control beside it: Publish, Push update, or Manage, with a link to the public page. A rejection is a sentence with its reason and the fix, never red.
- **The publish sheet**: says before anything happens that a copy goes public under @handle, that the recipe here stays private and editable, and that later edits stay private until pushed. It counts the photographs from this device that will travel and the ones from other sites that stay behind. An imported recipe asks for its credit, starting from the site's name, or the author's word that the method and description are their own. Afterwards: live with a link to the page, or waiting for a look with the screen's reason. Unpublish takes a second press. Signed out, or unconfirmed, the sheet says what publishing takes instead.
- **Public on the cookbook's tiles**: a recipe in the shared cookbook carries a quiet `Public` tag; the private default adds nothing.
- **Discover** (`/discover`, B21, B22): the shared cookbook as its own destination. The whole index comes down once and is searched (title, description, tags, baker) and sorted (Recent, Most baked, Top rated — unrated recipes after rated ones — and A–Z) on the device; laid out as a magazine since the UI overhaul, Phase 6 (section 21). A skeleton while it arrives; offline, it says the shared cookbook needs a connection and that the cookbook works without one.
- **Navigation** (B21): Discover is a destination of its own, one of the four (section 17); Moderation is in the operator's avatar menu.
- **Baker profiles** (`/@handle`, B2, B14): a bookshelf since the UI overhaul, Phase 5 (section 20). An unknown handle, or any unknown single-segment address, is the 404.
- **A shared recipe's conversation**: "What bakers noticed" since the UI overhaul, Phase 5 (section 20). Signed in, stars and an "I baked this" toggle; the author is told ratings come from other bakers. A note's author or the recipe's author can delete it, and anyone can report it. The server's reason for refusing a note (a day-old account, a confirmed email) is shown on the field, keeping what was typed. "Report this recipe" opens a sheet that asks what is wrong.
- **Shared links come home**: a shared recipe's back link goes to Discover, and its "Shared by @handle" links to the baker's page; a published fork reads "Shared by @ada · adapted from @proof". Saving a recipe counts toward its saves.
- **The moderation page** (`/moderation`, operator only; linked from Settings → Operator): held recipes with the screen's reason, the source and credit, and the method to read; held comments; open reports with what they are about. Approve, hold back with a reason the author will see, remove, take down, or leave up — one press each.
- **New primitives**, in `/lab`: `PublishState`, `Tag` and `Prose` (people's own words, B1).

## 15. Public launch — Phase 2: account email
- **Confirming an address**: signing up emails a link (`/verify?token=…`) that confirms the account once; it works for a day, and asking again replaces it. Settings → Account offers "Send the link again" until it is confirmed. A confirmed email is what opens publishing, comments and the AI.
- **Resetting a password**: "Forgot password?" in the sign-in sheet emails a link (`/reset?token=…`) that works for an hour, with the same answer whether or not an account uses the address. Setting the new password signs every device out, and following the link confirms the address too.
- **Links are stored as hashes**: like sessions, a link's token is kept only as its SHA-256 in an `EmailToken` collection with a TTL index, and is deleted when used. Account deletion removes them.
- **Sent through Resend** (`RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_ORIGIN` for the links). Until Proof has its own domain (LAUNCH_PLAN §3, deferred), Resend's test sender delivers only to the Resend account's own inbox. An email that can't be sent is reported, not hidden: a new account is told its confirmation couldn't be sent, and a resend says the site can't send email yet and to ask the operator.
- **Confirming by hand** (`server/scripts/verify-account.js --email=…`): the operator confirms an account while the site can't send email.

## 16. UI overhaul — Phase 1: the cookbook foundation

The Step Row "drum machine" look is replaced by a printed cookbook (decided in [docs/ui-overhaul/](docs/ui-overhaul/)). Phase 1 swaps the foundation underneath every screen at once; each screen's structure is rebuilt in Phases 2–6. **Entries elsewhere in this file that describe lit keys, seven-segment readouts, silkscreened labels, signal red or a true-black dark theme describe the previous look**: the screens keep their behaviour, now drawn in the new foundation, and each entry is rewritten when its screen is rebuilt.

- **Paper and ink**: new tokens — paper `#FBF7F0`, raised, sunk and tonal paper, ink in three strengths, paprika accent `#B5391F` for the one primary action, sage (have it), butter (timers, current step), pencil (margin notes), ochre fault, spoiled rule for destructive controls. The previous world's token names are mapped onto these so every screen took the new look at once; they are transitional and retire screen by screen.
- **Paper is the default theme**: with nothing chosen the app opens light (`src/lib/theme.ts`, and the inline script in `index.html` before first paint). Dark is the same book at night — warm charcoal `#16120F`, never true black. The PWA theme and splash colours are paper.
- **Theme choice in Settings is a segmented control** (Light | Dark | System). "System" is now stored rather than erased, so an absent key can only mean "never chosen".
- **Three self-hosted faces**: Fraunces (titles, `.font-title`), Source Serif 4 (the reading face, `.font-prose`) and Inter Tight (controls and figures), latin subset, precached for offline, with their OFL licences. Archivo and JetBrains Mono are removed.
- **Sentence case everywhere**: the uppercase, letter-spaced silkscreen label is replaced by `.ui-label` (small, medium weight, sentence case). Photo "Before / After" labels lose their capitals too.
- **No gradient, no blur, no glow**: the faceplate sheen and the blurred scrim are gone. Sheets sit over a flat dim; raised paper gets a small lift shadow.
- **One press, everywhere** (`.pressable`): a control sinks to 97% and tints on pointer-down, in 80 ms, and settles back. Reduced motion keeps the tint and drops the scale.
- **New primitives**: `IconButton` (a 44px round control whose words are required by its type and shown as a tooltip), `BackButton` ("‹ Dessert": a real link to the parent that goes back through history when there is in-app history, and follows the link on a cold shared link so it never leaves the app), `Segmented` (a radio group: one Tab stop, arrow keys move the choice, a selection haptic), and `Readout` (plain tabular figures with a caption and a unit, replacing the seven-segment `SegmentReadout`; units written in capitals print in lower case).
- **Restyled primitives**: `Button` (ink outline at rest, one filled paprika primary, a new `tonal` variant, danger outlined in the spoiled rule), `Panel` (raised paper with its title as a serif heading — no header bar, no lamp), `Field`/`TextArea`/`Select` (paper wells, ink edge on focus), `Sheet` (rounded top, grabber, flat scrim, serif title), `Menu` (one raised sheet, rows), `StepRow` (a thin line of named phase segments; selectable segments are 44px targets), `Meter` (one rounded track with an ink fill, paprika past a hot end), `InstrumentRow` (chips, ticked in sage when present), `PublishState` (words with an icon: "Private · only on this device"), `Tag` (a tonal pill), `Skeleton`, `Prose`.
- **Recipe photographs never leave an empty box**: a recipe or bake with no usable photograph shows a drop cap — its initial in italic Fraunces on paper — at the same size, and its name is printed once, under the plate.
- **A tile is a picture, a name and one line**: `RecipeTile` drops the hover-reveal panel and the mini step row. The line is the chapter plus the real time, printed as a cookbook does ("Bread · 1 h 15", via the new `formatMinutes`); the import placeholder time is still never printed, and the ingredient count stands in.
- **One haptics vocabulary** (`src/lib/haptics.ts`): `haptic('selection' | 'light' | 'medium' | 'success' | 'warning')`, silent on the web and when switched off in Settings.
- **Guarded** (`src/designSystem.test.ts`, rewritten): fails the build on any gradient, blur or zero-offset glow; tracked uppercase labels or the retired class names; a stock Tailwind colour; the accent filling anything but the primary button or drawing an error; a link coloured by the accent; the rebuilt primitives using the transitional token names; a true-black dark theme or a non-paper light theme; a missing self-hosted face or licence; and contrast below 4.5:1 for ten text pairings, in both themes.
- **Component lab** (`/lab`, development only) shows every primitive, including the four new ones, in its real states.

## 17. UI overhaul — Phase 2: the shell and navigation

Thirteen destinations spread over a sidebar and a More drawer become four, and the app's chrome becomes an app's rather than a website's (AUDIT_REPORT changes 19–31, APP_FEEL_DEBATE slices 1–3).

- **Four destinations** (`src/lib/destinations.ts`): **Cookbook** (`/`), **Bakes** (`/bakes`), **Shop** (`/shop`) and **Discover** (`/discover`). Every screen belongs to one of them — a recipe, the editor and Loose notes are pages of the Cookbook — or sits behind the avatar (Settings, Moderation, My published recipes).
- **Phone tab bar** (`TabBar`): four tabs, icon over label, a full quarter of the bar each and 58px tall, the current one marked by weight and `aria-current`, with a selection haptic on change. There is no More drawer and no floating + button.
- **Desktop top bar** (`TopBar`): the Proof wordmark is a home button; the four destinations are a segmented `<nav>` of links whose paper thumb slides to the chosen one over 240 ms; on the right, the running timer, New and the avatar. The sidebar is deleted, and the page takes its full width up to a 75rem reading column.
- **New** (`NewRecipeSheet`): a labelled header button — the Cookbook's header on a phone, the top bar on a desktop — opens a sheet of the ways in, each a whole-card target: *Write it* (the blank editor) and *Paste a link or text* (the editor with the import already open, `/new?start=paste`).
- **Avatar** (`AccountMenu`): a menu dropped from the top bar on a desktop, a bottom sheet on a phone. Settings, Sign in (or Account, signed in), My published recipes, Export or import (Settings → Data on this device), Help, and Moderation for the operator. Signed in, it shows the baker's initials and @handle.
- **Help** (`HelpSheet`): the cookbook, cooking, bakes, shop and "it stays on this device", each in a sentence or two.
- **My published recipes** (`/published`, change 132): the signed-in baker's recipes in the shared cookbook with where each stands; each row opens the recipe on this device. Signed out, it says publishing needs an account and why.
- **Bakes merges Gallery and Analytics** (`BakesPage`): rebuilt in Phase 4 as a journal and a By recipe view with a summary line (section 19).
- **Shop merges Grocery and Pantry** (`ShopPage`): To buy | In the cupboard, `?view=cupboard`. Both views were rebuilt in Phase 6 (section 21).
- **Old addresses redirect**: `/gallery` and `/analytics` go to Bakes, `/grocery` and `/pantry` to the matching Shop view, so bookmarks and notifications still land.
- **Loose notes** (change 24): General Notes is renamed and reached from a row at the end of the Cookbook's chapter list, with Back to the Cookbook.
- **The timer pill** (`TimerPill`, change 27): while a bake is open or a timer runs, a butter pill reads "Oven · 12:04" — the timer nearest its end, running before paused, with "+1" for each other — sticky at the top of a phone screen and in the desktop top bar. It returns to baking mode, or with no bake open, opens the timers sheet. A timer past its end gains a minus sign and weight, never an alarm colour. Baking mode shows its own timers, so the pill stays out of it. The floating timer stack is gone; `TimerManager` keeps the timers and their sheet.
- **Chrome-free public pages** (change 28): a shared recipe (`/r/:slug`), a baker's profile (`/@handle`) and baking mode render with no tab bar and no top bar.
- **Transitions** (`PageTransition`, `src/lib/navigation.ts`): changing destination cross-fades over 140 ms; going deeper slides the new page in 24px from the right over 220 ms; going back slides it from the left over 180 ms; the first page, a reload, a deep link and a redirect do not animate. Only the arriving page moves. Under reduced motion `MotionConfig` keeps the fade and drops the slide.
- **Scroll memory** (`useScrollMemory`): Back returns to where you were on the page you left, and returning to a destination returns to its own scroll; anything else starts at the top. Per-tab navigation stacks were not built: the remembered scroll covers the case without freezing router outlets.
- **Sheet detents**: a bottom `Sheet` with `detents` rests at half or 92% of the screen. Its grabber is a button that cycles the two; dragged, it moves between them or closes below 30%; it always shows Done; the drag holds pointer capture and never moves focus, so the trap is unchanged. A medium haptic marks a snap.
- **Toast and Undo** (`ToastProvider`, `useToast`, `useUndoableAction`): one report at a time, above the tab bar, for six seconds — paused while hovered or focused — announced politely, with its one action a real button. `useUndoableAction` runs an action at once and offers Undo, which runs its inverse; a failed action is reported instead. Every record can be undeleted by `repo.restore`, which clears its tombstone; the photo collector counts a record deleted within the last hour as live, so it returns with its photographs.
- **Disclosure**: a row with `aria-expanded` that opens a list in place — the height over 240 ms, the chevron over 180 ms — and keeps its closed body `inert`.
- **PageHeader**: a screen's name in the title face with its controls at the right and an optional line of counts, no rule and no introduction.
- **Component lab**: the page header, the disclosure, the toast and a sheet with detents are in `/lab`.

## 18. UI overhaul — Phase 3: the recipe page and baking mode

The recipe page reads like a page of a cookbook, the bake log moves onto it, and baking mode is rebuilt around one large step (AUDIT_REPORT changes 58–97).

**The recipe page** (`RecipeViewer`, `RecipeHeader`, `IngredientList`, `InstructionList`, `RecipeBakes`)
- **Reading order**: photograph → title → one-line headnote → facts → Last time → Start cooking and Log a bake → ingredients → method → Your bakes. On a phone the photograph runs edge to edge at 4:3 and loads at once; ingredients follow the Start button.
- **Desktop spread**: from a 56rem page, the photograph, title, facts, Last time, buttons and ingredients sit on the left page and the method on the right; Your bakes runs under both.
- **Nav bar**: a back button named after the recipe's chapter ("‹ Dessert", which returns to `/?chapter=Dessert`), and an icon toolbar: Favourite (a heart toggle), Share, Edit (desktop) and ⋯ — Edit, Plan this bake, Copy ingredients, Print, Save as PDF, Share as a card, Duplicate, Delete. A visually hidden breadcrumb gives a screen reader the trail.
- **Facts as one line**: "Serves 12 · Prep 20 min · Cook 1 h 15 · Medium" (`factsLine`). The import placeholder times are left out, and the owner gets a quiet "Add times".
- **Headnote**: entities decoded and the blog's own asides ("Be sure to check out my video…") taken out (`headnote`).
- **Provenance in one line**: "Adapted from sugarspunrun.com ↗" opens the source in a new tab; "Adapted from @handle" opens the original; a shared recipe says "Shared by @handle". The publish meter is gone: a chip — "Private · this device", "Waiting for review", "Public", "Public · edits not shared", "Held back" — opens the publish sheet, which now also says why a recipe was held back and links to the public page.
- **Last time**: the latest bake's date, stars, first line and its note to next time (pencilled), and how many bakes — one card, one target, opening this recipe's bakes.
- **Start cooking** is the page's one paprika button. On a phone, once it scrolls off the top, a docked bar with the title and Start cooking rises above the tab bar (`DockedAction`).
- **Plan this bake**: the reverse scheduler opens in place under the buttons.
- **Ingredients**: one tick per row, the whole row the control; kitchen fractions and sensible units ("⅔ cup", "1 tbsp" for 0.51 fl oz, "⅛ tsp", "a pinch"); a weight written into the name moves to its own column; the note after a comma is set in italic. "Serves 12 [– +]" scales the list, with a way back to the written amount. Baker's % appears only for a recipe whose flour is weighed, as a column, and Settings → Baker's math turns it on by default. The pantry says "✓ have" in sage, only once there is a pantry. Substitutes sit behind a small icon per row.
- **Add missing to Shop**: one tonal button, "Add 9 missing to Shop", previewing the first two; it adds them to the shopping list at once with Undo, and the rows then say "On list".
- **Method**: printed whole, no "Read more". The recipe's own "--- Crust ---" lines (and short "For the crust:" lines) are serif subheads, not numbered steps; a bread whose wording proves its phases gets those as subheads; anything else is one run of numbers. Numbers count real steps only and match baking mode. HTML entities, doubled parentheses and orphan footnote marks are cleaned on display (`cleanText`).
- **Inline timers**: a time in a step is a butter chip inside the sentence; a range ("50–60 min") is one timer at its shorter end.
- **Margin notes**: the newest note any bake made about a step is pencilled under that step.
- **See also**: a sub-recipe linked to a step opens in a sheet from the step.
- **Your bakes**: oldest to newest along the foot; a bake with no photograph is a note card (its number and first line), never a blank; the date and stars under each; the personal best stamped; a "Log a bake" tile at the end. "Then and now" wipes between the first and latest photographed bakes once there are two.
- **Share**: the system share sheet where there is one; otherwise Proof's own — copy link and QR for a recipe with an address, or the line "Private · only on this device, so it has no link" with Publish; then Copy as text, Save as PDF and Print.
- **Delete and Duplicate**: Delete happens at once with Undo; Duplicate opens the copy.
- **Shared recipe** (`/r/:slug`): the same page without the owner's controls; its one primary action, Save to my cookbook, sits under the facts (or Open my copy).

**Logging a bake** (`LogBakeSheet`, `BakeDetailSheet`)
- **"How did it go?"**: stars, when, photographs, what happened (with dictation), what I changed, next time, and Mark as my best. Reachable from the recipe page, from Your bakes, and as the last step of baking mode, where the notes made at each step arrive already filed.
- **New bake-log fields**: `rating`, `changes`, `nextTime` and `stepNotes` (each `{ stepIndex, text, at }`). All local; no server work.
- **One personal best per recipe**: marking a bake as the best unmarks the one before it.
- **The bake sheet**: date, stars, stamp, photographs (labelled, side by side when there are two), what happened, what changed, next time and the step notes. Edit, Set as cover, Share card and Delete — at once, with Undo.

**Baking mode** (`BakingMode`)
- **The head**: ×, the recipe, "3 of 12", and ⋯ for all ingredients, all steps, the Bluetooth scale, voice commands and wave to advance, Finish and log, and Stop without logging. Under it, a thin line of the bake's named parts, each as long as its steps, pressable to jump; and any running timers as butter chips.
- **The step**: set in the reading face at 28–32px in the top third, its section named above it; on the first step, the last bake's note to next time.
- **This step**: what it needs ("You need", from `ingredientsForStep`), its timer as one big butter press that becomes the countdown, and "Last time on this step" with the last bake's note.
- **Note**: a button beside Back files a note against the current step; notes wait on the running bake (`addActiveBakeNote`) until it is logged.
- **The foot**: Note, Back (gone but holding its place on step 1) and a wide Next. The last Next reads "How did it go?" and opens the bake log; saving it ends the bake and opens the recipe with the new bake stamped if it is the best.
- **Desktop side panel**: on a wide screen, this step's ingredients, its last note and a quick-note field sit in a column beside the step.
- **Kept**: swipe, arrow keys, voice, wave to advance, the scale's auto-advance, wake lock, haptics, sub-recipes, resuming a bake at its step.

**Underneath**
- **New libraries**: `recipeText` (entities, cleaning, headnotes, method sections), `quantities` (kitchen fractions, unit changes, weights out of names), `method` (printed sections and baking-mode parts), `facts`, `stepTimers` (times in a step, ranges), `share` (system share, recipe as text).
- **The shopping list is kept on the device**: IndexedDB version 3 adds a `shopping` record store (`ShoppingItem`), with `repo.getShopping`, `addShoppingItems`, `updateShoppingItem`, `deleteShoppingItems`, and Undo through `repo.restore`. It is in the export.
- **New primitives**, in `/lab`: `Stars` and `StarRating` (a radio group; the chosen star again clears it), `Stamp` (the personal best, pressed on once when earned), `MarginNote` (pencil, reading italic) and `DockedAction`. `TextArea` grows with its text and takes a ref. `StepRow` draws each part as long as its steps.
- **Restyled**: the before/after slider is a range input over the photographs, so it works by keyboard; side-by-side photographs are captioned under each picture and show photographs stored on the device.
- **Removed**: the Recipe / Previous makes tabs, the transport strip, the publication strip, the bake-logs grid, "Read more" (`ExpandableInstruction`), the old timer parser, and the phone's floating Start key.
- **Tests**: the frontend suite waits up to 5 s for an async result and 20 s per test, because a full parallel run is slower than one file alone.

## 19. UI overhaul — Phase 4: the cookbook and Bakes

The cookbook reads like the front of a book — contents, an index, the last bake — and the bake log becomes a journal (AUDIT_REPORT changes 43–57, 98–108).

**The cookbook** (`Dashboard`, `src/lib/cookbook.ts`)
- **Search first**, full width, under the title: "Search 203 recipes, ingredients, notes". The unlabelled shuffle beside it is gone.
- **Pick up where you left off**: one card with a paprika ribbon (`Ribbon`) — the bake running now ("Resume baking", into baking mode), or the last bake, with its stars, how many bakes, and its note to next time pencilled.
- **Recently baked**: one strip in place of Personal Bests and Recently Baked; a recipe already on the card above is not repeated. Its header row and its last tile, "All bakes", open Bakes. A recipe with a best bake carries the stamp.
- **Contents**: chapters as a printed table of contents — the name, dotted leaders, the count — each a 52px row opening the chapter. The eight largest show; the rest and Loose notes sit behind "N more chapters and loose notes" (`Disclosure`).
- **Index A–Z**: Chapters | A–Z switches the contents in place and keeps `?view=az`. Recipes are filed under their first real letter ("The", "A" and accents ignored), with a thumb-index rail down the right (`LetterRail`): a press or a sliding thumb jumps, with a selection tick; empty letters are pale.
- **A chapter is a page** (`/?chapter=Dessert`): its name, Back to the cookbook, and its recipes with the same sort and filter. A recipe's back button returns here.
- **All recipes**: a grid of tiles or a list of thumbnails with full titles (Grid | List, remembered on the device), sorted by Recently added, A–Z, Recently baked or Rating (remembered; unrated after rated, never-baked after baked), and filtered in a sheet (`CookbookFilterSheet`) by chapter, difficulty, baked or not yet, favourites, published (signed in) and "Can make now" (with a cupboard: at most two things short). The filter button counts what is on; "N of M shown" and Clear filters say so.
- **Tiles say when they were baked**: "Baked 3 days ago · ★4" once a recipe has been baked, its chapter until then; never an ingredient count (change 51). Titles wrap to two lines.
- **The next page arrives as the end comes into view** (36 at a time); a "Show more" button stays for a keyboard.
- **Search** reads titles, tags, ingredients and descriptions, and, as a second group, "In your bake notes": bakes whose notes, changes, note to next time or step notes say the words, with a line of context, each opening that bake. "Surprise me from these" picks one of the results; "Surprise me" under All recipes picks from the list.

**Search or jump to** (`CommandPalette`, change L11)
- ⌘K or Ctrl+K anywhere, or the top bar's search button on a desktop, opens one field that reaches a recipe (by name or ingredient), a chapter, a place in the app, or an action: write a new recipe, paste one from a link, resume the bake running. A combobox: the arrow keys move, Enter opens, Escape closes. It reads the device, so it works offline.

**Bakes** (`BakesPage`)
- **The summary line**: "17 bakes · 6 recipes · best: Cheesecake" (`summaryLine`). A best is named only between two or more recipes, from recipes rated more than once, and not on a tie at the top. The totals page and its "6 of 203 baked" meter are gone (`Analytics` and `Gallery` are removed; `/analytics` and `/gallery` redirect here).
- **Journal**: by month, newest first; each bake its own photograph or a note card with the recipe's initial, the recipe, "Oct 17 · Bake 5", its stars, the first line of what happened (or its note to next time), and the stamp on a best. A bake opens in its sheet.
- **By recipe** (`?view=recipe`): each recipe baked more than once as a strip, oldest to newest, a photo-less bake a note card with its number; its stars as a sparkline once three bakes are rated (`Sparkline`); recipes baked once gathered in one short list.
- **One recipe** (`?recipe=…`, from a recipe's Last time card): the page narrows to it, titled with it, with Open the recipe and Every recipe.
- **Compare**: ticks two bakes in either view; a bar offers "Compare (2)", opening them side by side (`CompareBakesSheet`) — photographs (with a wipe between them when both have one), stars, what happened, what changed, next time.
- **Log bake**: choose the recipe from a searchable list (`RecipePickerSheet`, recently baked first), which opens its log sheet.
- **Nothing logged**: one sentence about what the log is for, and Log a bake.

**New primitives**, in `/lab`: `Ribbon`, `LetterRail`, `Sparkline`. `RecipeTile` takes its line (`caption`) and a best-bake stamp (`best`).

## 20. UI overhaul — Phase 5: first run and sharing

What a stranger meets — the landing page, an empty cookbook, a shared link, a baker's page, a card on a feed — rewritten in the cookbook's own words (AUDIT_REPORT changes 16, 32–42, 107, 117, 127–130).

**The landing page** (`LandingPage`)
- **"Bake it. Write it down. Bake it better."** over a real loaf: the library's own Danish rye, cropped to 4:3 and self-hosted (`public/landing/danish-rye.webp`, precached with the other assets), edge to edge on a phone, beside the words on a desktop.
- **One solid action**, "Open my cookbook", at the top and again at the foot; under it, as a sentence, "No account. It stays on your phone."
- **The bake log leads**: an example recipe page — facts, last time's bake with its stars and a pencilled note to next time, and three bakes as note cards with the best stamped — drawn with the app's own pieces, so it cannot promise more than the app does. Works offline, timers and sharing follow as three short lines. "See an example recipe" at the foot returns to it. The drum-machine demonstration and its chase light are gone.

**First run** (changes 39–42)
- **No onboarding tour**: the modal is deleted; the empty cookbook is the welcome.
- **The empty cookbook**: "Your cookbook is empty", where it is kept in one plain line, and the three ways in as whole cards (`NewRecipeDoors`): Write it, Paste a link or text, Photograph a page.
- **The starter shelf**: "Or start from one of these" — large photographs with a small "Add" beside each, in place of heavy Save boxes.

**Photograph a page** (change 117)
- A third way in: the editor's import offers "Photograph a page" (opening the camera on a phone); New and the empty cookbook open on it (`/new?start=photo`). The photograph is shrunk on the device and read into the form by the AI (`POST /api/ai-photo`, Gemini; JPEG, PNG or WebP, at most 4 MB, kept nowhere; behind the same allowance and burst limit as the other AI routes, with a 503 when the AI is not configured and a 422 when no recipe can be read).

**Sharing**
- **The shared page** (`/r/:slug`, change 128): Save to my cookbook leads under the facts, with Copy link and Print beside it.
- **What bakers noticed** (`SharedRecipeCommunity`, changes 129–130): the readings print only when there are some ("4.5 of 5 from 2 ratings · baked 2 times · saved 3 times"); with none, "Be the first to bake this." What bakers wrote is set as pencilled notes in the margin under their handles. Stars (`StarRating`) and "I baked this" for an account; "What you noticed" for a confirmed one.
- **A baker's page as a bookshelf** (`/@handle`, change 127): back to Discover, the baker's initials on a round plate, name, handle and counts, their own words, Share profile (the system sheet, or copies the address), and their recipes "On the shelf".
- **Cards** (`InstagramExporter`, change 107): printed pages on paper at 4:5 (1080×1350), in light paper or night, as one card or all of them: a bake's own card (its photograph, stars, what happened and the note to next time), the recipe's page (photograph or drop cap, title, headnote, facts), the ingredients in kitchen fractions, and the method. Opened from a recipe's ⋯ or a bake's Share card; it is a full `Sheet`. `lib/sevenSegment` is deleted.
- **Print** (change 16): the recipe on paper — light whatever the screen's theme, the app's chrome left off, the ingredients beside the method, and at the foot ruled lines for "My notes" and, for a recipe with an address, a QR code back to it. The printer's paper (A5, A4, Letter) decides the size.

## 21. UI overhaul — Phase 6: the remaining screens

The editor, Shop, Discover, Settings and the 404 in the cookbook's own words, with the last of the P3 changes (AUDIT_REPORT changes 18, 26, 31, 109–126, 131, 133, and the shared photograph).

**The editor** (`RecipeEditor`, `EditorHeader`, `BasicInfoForm`)
- **An open paper form** (change 109): no panels or silkscreen heads; the recipe's fields in reading order on the page.
- **The bar** (change 111): Back, named for where it goes; the recipe's name with its ingredient and step counts as they are typed; "Tidy up with AI" in words; Save in paprika; and ⋯.
- **Delete is in ⋯ and happens at once** (change 110), with Undo in a toast (`repo.restore`). The confirm sheet is gone.
- **More details** (change 112): servings, difficulty and the times sit behind a `Disclosure`. Times are minutes that print "1 h 15" beside the field (change 115).
- **Chapter** (change 26): the folder field is named Chapter, matching the cookbook's Contents.
- **Amounts as a cook writes them** (change 113, `AmountField`, `lib/parseIngredient`): "1½", "1 1/2", "2/3", "½" or "0.5" are stored as numbers and shown back as kitchen fractions. Anything it cannot read stays in the name, never dropped.
- **A pasted list splits into rows** (change 118): pasting "2 cups flour / ½ tsp salt / 3 eggs, beaten" into one ingredient name makes one row each, split into amount, unit and name.
- **Section headings and rows**: a `--- Crust ---` line edits as a heading. Each row's ⋯ (`RowMenu`) offers Move up, Move down, Link a recipe to it and Remove.
- **Start from a link, text or a photograph** (change 117): one disclosure for a URL import, pasted text read by the AI (`api.restructureRecipe`), and Photograph a page.
- **Two panes on a wide screen** (change 120): at `xl` the form sits beside a live "As it will read" preview (`RecipePreview`).

**Edit here** (change 119, `EditInPlace`)
- The recipe page's ⋯ → Edit here turns the title, the line about it, the ingredients (one per line, read like a pasted list) and each method step into fields in the same spread. Save writes them back; Cancel leaves the recipe as it was. Photographs, times and chapter stay in the full editor.

**Shop** (changes 121–124, `ShopPage`, `ToBuy`, `Cupboard`, `lib/aisles`, `lib/shopping`)
- **To buy** is the saved `shopping` store, grouped by aisle in the order a shop is walked (Fruit and veg, Dairy and eggs, Meat and fish, Flour, grains and bread, Baking and sweet, Tins, jars and oils, Spices and seasoning, Frozen, then Everything else). A thing the words don't place goes under Everything else, never into a wrong aisle.
- **Three ways on**: "Add from a recipe" (`RecipePickerSheet`) adds only what is missing from the cupboard and not already listed, with Undo; a typed add; and a recipe page's "Add missing to Shop".
- **Tick to the basket**: a ticked thing moves to the basket at the foot of the list; "Clear ticked" empties it, with Undo.
- **Share list** appears only when there is something on the list, and shares it as plain text.
- **In the cupboard** is a shelf of chips with a typed add, a barcode scan, and remove with Undo, under one plain line saying what it is for.
- `GroceryList` and `Pantry`, and their tests, are deleted.

**Discover** (changes 125, 126)
- One search and a Sort `Select`; tags in a filter sheet, with the tag in force as a removable chip.
- The first recipe full-width with its headnote, then two to a row.
- Bylines read "@ada · baked 9 times", the count only when there is one.

**Settings** (change 131, `Switch`)
- Appearance, While you bake, Your cookbook, Account, Help, then Operator.
- Every on/off is a `Switch` (`role="switch"`, named by `aria-labelledby`, the whole row the target), the new primitive in `/lab`.
- **Handwritten notes** (change 18): an Appearance switch that sets margin notes, bake-sheet notes, baking mode's "last time" note and community notes in Caveat, self-hosted (`public/fonts/caveat-latin-variable.woff2`, OFL). Applied before first paint from `index.html` as `html[data-hand=on]`; `.hand` is unlayered CSS so it wins over the notes' own italic and size.

**404** (change 133)
- "That page isn't in this book.", a search that hands over to the cookbook (`/?q=`, which the cookbook now reads on load), and "Back to the cookbook".

**A timer leads back to its step** (change 31)
- A timer started from a step — baking mode's big timer press, its "start timer" voice command, or a time in a step on your own recipe's page — remembers the recipe and step (`startTimer(…, { from })`).
- Its notification reads "Step 4 · 12 min is up" with "Tap to go back to step 4."; pressing it focuses Proof and opens baking mode at that step (`/recipe/:id/bake?step=4`). Baking mode reads `?step=` over a resumed position, also while it is already open, and clears it once read.
- The origin stays on the device: it is never sent over the timer socket, and a sync from the server keeps the origin this device already knew. A shared recipe's timers have no origin.

**The shared photograph** (APP_FEEL_DEBATE §5, `lib/sharedPhoto`)
- Pressing a recipe's tile in your cookbook grows its photograph into the recipe page's over 340 ms, while the rest of the page fades across in 200 ms (the View Transitions API; `::view-transition-*` in `index.css`).
- The tile starts the transition itself, because React Router's `viewTransition` needs a data router. The update waits up to 250 ms for the recipe's hero to be drawn; slower, it goes ahead as a plain fade. PageTransition stands aside for that one change of page.
- Only a warm, in-app press morphs: a browser without the API, reduced motion, a press with a modifier key, and a shared recipe's tile all navigate as before.

**Fixed**
- Client ULIDs are monotonic within a millisecond (`lib/ulid`). Records made in the same millisecond, such as a recipe's missing ingredients added together, used to sort at random.

**New primitive**, in `/lab`: `Switch`. `RecipePlate` takes a `transitionName`.

## 7. UI/UX Foundation
- **Stack**: React, Vite, Tailwind CSS (`@tailwindcss/postcss`), shadcn/ui, TanStack Query for server state management.
- **"Step Row" Visual World (Phase 0 foundation)**: The Black & Gold glassmorphic world has been replaced by an early-80s rhythm-machine design language: matte panels, silkscreened labels, lit step keys, and seven-segment readouts. Colour is temporal, never decorative — red marks *now*, orange *due*, yellow *queued*, white *complete*, and an unlit key is drawn as deliberately as a lit one.
- **One enforced ban, two defined materials**: No glow except a lit key or segment. Gradient and backdrop blur were banned alongside it and are now permitted as materials with one use each: `--faceplate`, the few-percent sheen of a moulded panel lit from above (the only gradient in the chrome), and `.scrim`, the blurred layer behind a modal or sheet that sits over the interface. Neither touches a photograph. `src/designSystem.test.ts` requires both tokens to exist and fails the build on any ad-hoc `bg-gradient-to-*` or `backdrop-blur-*` utility in a component.
- **Two Themes**: Light and Dark only. Dark is the default and is now true `#000000`; the former separate OLED theme is consolidated into it and the orphaned `.oled` token block has been deleted.
- **Self-hosted typography**: Archivo Variable (weight + width axes) for the faceplate display voice and instruction prose, JetBrains Mono Variable for UI, labels and data. Latin subsets only, served from `/fonts`, precached by the service worker so they survive an offline kitchen. Tabular figures are on globally.
- **Component layer (Phase 1)**: A bespoke primitive set replaces hand-rolled inline Tailwind: `Panel`/`PanelRow` (flat bordered surfaces with a silkscreen head and status lamp), `Button` (primary/secondary/ghost/danger, 44px touch target, real press travel), `Field` (unit slot, focus signal, errors wired via `aria-describedby`), `SegmentReadout`, `StepRow`, `InstrumentRow` and `Meter`. Exported from `src/components/ui`.
- **Seven-segment readouts**: SVG digits that render all seven segments and dim the unlit ones, so a value has a fixed width and absence is drawn as deliberately as light. Reserved for instrument values — timers, temperatures, weights, hydration — with tabular mono for counts and dates. Announced to screen readers as one value.
- **Step row**: The signature component. One key per phase of a bake, coloured temporally — red is now, orange due, dim amber queued, grey complete, unlit not yet reached. Labels print beneath the keys; below `sm` they drop and the running phase is named above the row so it stays legible at 390px. A recipe with no phases renders as dark keys rather than as an error.
- **Phase derivation** (`src/lib/phases.ts`): Derives a bake's phases from instruction text with a bread vocabulary (levain, autolyse, mix, bulk, shape, proof, bake, rest), assigned monotonically so a recipe never jumps backwards. Falls back to a generic prep/cook/finish vocabulary unless the text names something a bread bake actually has, so a soup is never given a levain.
- **Component lab** (`/lab`, development only): A gallery of every primitive in its real states, registered behind `import.meta.env.DEV` so it never reaches a production bundle.
- **Themed browser surfaces**: Text selection, caret, scrollbars and focus rings are themed from the palette rather than left at browser defaults.
- **Global reduced-motion support**: `prefers-reduced-motion: reduce` collapses every animation and transition app-wide.
- **Retired: global font switcher**: The sans/serif/mono `data-font` preference has been removed so the design owns its own typography.
- **Landing**: a dedicated landing page for first-time visitors (section 20); there is no onboarding tour — the empty cookbook is the welcome.
- **Skeletons & Empty States**: Polished animated skeleton loaders for data fetching, custom illustrated 404 pages, and a tailored empty state for the gallery.
- **Icons**: Standardized clean iconography via `lucide-react`.
- **Fault Resilience & Crash Protection**: `ErrorBoundary.tsx` wraps the routing tree to catch unhandled rendering exceptions, preventing white-screen crashes.
- **Server Architecture**: Modular Express server architecture with separated `routes/`, `services/`, and `middleware/`.
