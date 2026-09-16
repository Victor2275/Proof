# Proof: Current Features Tracker

This document exhaustively tracks every capability, component, and technical integration currently active in the Proof codebase.

## 1. Core Recipe Management
- **Structured Schema (MongoDB)**: Recipes are stored with precise, structured fields: `title`, `description`, `imageUrls`, `servings`, `difficulty`, `prepTime`, `cookTime`, `tags`, `ingredients` (Object: Name, Qty, Unit), `instructions`, `folder`, and `labNotes`.
- **Fuzzy Search & Filtering**: Uses `fuse.js` to enable rapid, typo-tolerant searching across recipe titles and tags on the dashboard.
- **Nested Sub-Recipe Drawers**: Allows linking recipes to specific instruction steps. Linked recipes slide up in a native drawer without losing context in the parent recipe.
- **Compact & Grid Views**: UI toggle on the dashboard to switch between large image cards and dense list views.
- **Recipe Folders**: Recipes can be organized into named folders for easy browsing.
- **Sub-recipe Instruction Links**: Any instruction step can link to another recipe, which opens inline in a drawer.

## 2. "The Kitchen Lab" (Active Baking Mode)
- **Distraction-Free Focus Mode**: `BakingMode.tsx` provides an ultra-clean, step-by-step UI optimized for reading at a distance.
- **The step row is the navigation** (Phase 4): the bake's phases run across the head of the screen as live keys — red for the phase running now, orange for due next, complete behind it — and pressing a key jumps to the first step of that phase. A baker returning to the kitchen mid-bulk navigates by phase rather than by hunting for instruction seventeen. The row is the same component the recipe page and the cookbook draw; this is the only place its keys are controls.
- **Timers dock as readouts**: any running timer appears in Baking Mode's own head as a seven-segment countdown and turns signal red once it runs past its end. Previously the timer stack floated over the page, which in a full-screen overlay meant it sat on top of the instruction. `src/lib/timerBus.ts` publishes a read-only view of the timers `TimerManager` owns, so no second websocket is opened.
- **Scale readout appears only when a scale is connected**: the live weight sits beside the step's target weight as a large readout, going signal red as it reaches target. With nothing connected there is no empty display pretending to measure.
- **Show All reads under the same phase headings** the row draws, with the running step outlined; every step is a control that drops back into focus there.
- **Context-Aware Smart Ingredients**: While in Focus Mode, the UI automatically highlights the exact quantities of ingredients mentioned in the current step (via `getSmartIngredients`).
- **Hands-Free Navigation (Voice & Gesture)**:
  - Voice Commands: Integrates `react-speech-recognition` for a full hands-free experience. Supported commands: "Next", "Back", "Read" (reads step aloud), "Ingredients" (reads required ingredients), "Start timer", "Quiet" (stops alarms), "Show all / Focus mode" (toggles view), "Up/Down" (scrolls), and "Help" (shows commands overlay).
  - Wave-to-Advance: Lightweight motion detection using the device's front camera to advance to the next step when a hand wave is detected.
  - Swipe Gestures: Touchscreen swipe support to advance or go back.
- **Real-Time Timers (Socket.io)**: `TimerManager.tsx` parses time text (e.g., "Bake for 45 mins") into clickable timers that instantly sync across all active devices via WebSockets.
- **Hardware Integration**:
  - **Haptics**: Leverages `@capacitor/haptics` to deliver aggressive tactile feedback when timers finish or steps change.
  - **Wake Lock**: Uses browser WakeLock API to keep the screen from turning off mid-bake.
- **Audio & Notifications**: Uses `window.speechSynthesis` to audibly announce when specific timers finish, alongside native browser Notifications.
- **Reverse Bake Scheduler**: `ReverseBakeScheduler.tsx` allows users to define a target "Eating Time" (e.g., 7:00 PM) and backward-calculates exactly when to start the prep and baking phases.
- **Zero-Touch Bluetooth Scale Integration**: Connects to standard Web Bluetooth scales. Auto-advances the step when the target weight of the current ingredient is reached.
- **Flour-Proof Voice Dictation**: A dictation microphone button in the Log Bake modal that transcribes speech into notes, auto-highlighting mentioned ingredients in bold.

## 3. Bake Logs & Learning
- **Bake logs grid**: past bakes as photo tiles; the date and notes slide over the photograph's lower half on hover and one click opens the make. Attempts are numbered from the oldest, so "Make 3" keeps meaning the same bake when a fourth is logged. A personal best is marked in text as well as an icon, and each tile offers a shareable card.
- **Custom Image Tags**: Bake log images support custom labels, which are beautifully displayed across grids and photo comparison sliders.
- **Interactive Before & After Photo Comparison**: A slider component to compare raw dough to baked bread.
- **AI Photo Tagging**: Cloud functions pass uploaded bake photos to Gemini 1.5 Flash to automatically generate relevant `#tags` (like `#sourdough` or `#overproofed`).
- **Personal Bests**: Ability to mark specific bake iterations as a "Personal Best" (indicated by a gold award badge).

## 4. Data Insights, AI, and Utilities
- **AI Recipe Extraction**: Paste a URL from any recipe website and Gemini scrapes & structures it into the app format.
- **AI Recipe Restructuring**: Paste raw text and Gemini formats it into structured ingredients and instructions, with a live diff preview before accepting.
- **AI Ingredient Substitutions**: `AISubstitutionsModal.tsx` connects to Gemini to generate smart ratios for missing ingredients (e.g., swapping AP Flour for Whole Wheat).
- **Smart Pantry & Barcode Scanning**:
  - `Pantry.tsx` tracks inventory, read as the machine's own stock panel: a lit lamp beside every item — the same lamp a recipe's ingredient list uses for "you have this" — on hairline-ruled rows, two columns on a desktop, with the count silkscreened in the head.
  - Integrates `html5-qrcode` to scan real-world UPC barcodes to log ingredients quickly.
- **Grocery List Generator**: `GroceryList.tsx` converts missing recipe ingredients into an aggregated shopping list. Recipes are a bank of latching keys with a search field above them, showing a dozen at a time — a 203-recipe cookbook rendered as 203 keys is a wall between a shopper and the list. Anything already engaged stays on the panel whatever the search says. The list keeps real checkboxes rather than lamps, because it is operated one-handed in an aisle, and carries state three ways: the box, a strike-through, and the count above the list.
- **Baking Analytics**: `Analytics.tsx` provides graphical insights into baking habits (e.g., total hours baked, most used recipes).
- **Automated Maintenance**:
  - `node-cron` runs a nightly script to dump the MongoDB database into a JSON backup.
  - Clean-up script queries Cloudinary's Admin API to automatically delete orphaned images that are no longer linked to any recipe or log.
- **Offline PWA Engine**: `vite-plugin-pwa` configures Workbox to cache the core application and API endpoints, allowing offline reading of recipes.

## 5. Sub-Resources & Media
- **Bake Logs**: Dedicated logging objects attached to recipes, storing the date, photos, success notes, and a "Personal Best" flag.
- **Image Architecture**: Images are captured via `@capacitor/camera` (or file upload) and stored on Cloudinary (via `multer-storage-cloudinary`).
- **Export Engine**:
  - `jspdf` and `html2canvas` generate beautiful printable PDFs and square recipe cards.
  - **Shareable bake card** (`InstagramExporter.tsx`, full redesign in Phase 5): a 1080×1080 card, exported alone or as a carousel of up to five. The composition is the bake as the machine finished it — the photograph mounted as a plate, the name at display scale, the instrument values that are real, and the step row across the foot with every key complete, closed on the right by the site address. Further slides carry the ingredients as an instrument panel, the method, the baker's log (only when there is one), and the link.
    - **Provenance applies here too**: no fabricated timing, and the keys are exact in every branch — labelled phase keys where the recipe proved its phases, one key per step for a short generic recipe, and phase keys again past sixteen steps where a key per step stops reading as a row.
    - **Rendered from literals**: html2canvas rasterises outside the document's cascade, so the card's palettes, fonts and seven-segment fills are pinned values rather than tokens. It loads nothing that could fail — no remote logo, no stock fallback photograph.
    - **Fixed**: the card was captured through the preview's CSS transform, so a card exported from a phone came out under 900px square and its size depended on the window width. The scale now comes off for the duration of the capture; every card renders at 1080 (2160 at 2× device scale).
  - `qrcode.react` creates scannable deep-links.

## 6. Security & Auth
- **PIN-Gated Admin Access**: A PIN is required for all write/delete operations. Read operations are fully public.
- **Crypto-Random Session Tokens**: Login generates a `crypto.randomUUID()` session token stored server-side with a 24-hour TTL — no hardcoded secrets.
- **Rate Limiting**: AI endpoints and the auth endpoint are rate-limited to prevent abuse.

## 2a. Dashboard (Phase 2 — hero surface)
- **Bake history as iterations** (`Gallery.tsx`, Phase 5): the default reading groups a recipe's bakes into one row running oldest to newest, so the row itself is the progress — this loaf against the same loaf three attempts ago. A second reading sorts every bake newest-first, cut into months. One tile is one bake, not one photograph: a bake with three photos is still one attempt, and the extras are marked rather than counted. An attempt number is only printed where there is a sequence to count.
- **Gallery cookbook**: The dashboard is a grid of photographs, two up on a phone and three or four on a desktop, each named underneath. Browsing a cookbook starts with "what do I feel like making," and a photograph answers that faster than any metadata.
- **Hover reveals what a recipe can prove**: a flat panel slides up over the photograph's lower half carrying bake type, real total time, and real phases; the tile's border lights at the same moment. Nothing scales — a grid whose tiles grow under the cursor shifts while you read it. The panel is not `aria-hidden`: hover is unavailable to keyboard and screen reader users, so hiding it would make them the only people who can never reach those facts.
- **Provenance gates the data**: `derivePhasesWithReading` reports whether a recipe's phases were *proved* (it named a levain, an autolyse, a bulk) or are merely the generic prep/cook/finish shape that fits anything; `isPlaceholderTiming` recognises the import script's `"20 mins"` / `"30 mins"` pair, which 199 of the 203 live recipes carry verbatim. Neither a step row nor a time is drawn unless it is real — otherwise the tile falls back to bake type and ingredient count, which are always true. The Recipe Viewer applies the same rule and shows an unlit `--` rather than a fabricated 50 MIN.
- **Paged rendering**: the grid draws 48 tiles at a time with a "Show more" control. Rendering the whole library put 203 `<img>` elements on the page and 170+ requests in flight at once, which stall behind the browser's six-connections-per-host limit and compete with the app's own API calls.
- **Bank rail**: Recipes are organised by folder ("bake type") as a vertical rail on desktop (internally scrolling past 70vh, since the real cookbook already has 18 distinct folders) and a horizontal scroller on mobile. Search (`fuse.js`) and bank filtering compose together.
- **Smart shelves**: "Personal Bests" and "Recently Baked" — derived from real bake logs, deduplicated to one entry per recipe, hidden automatically while searching or a bank filter is active so they don't compete with a deliberate query.
- **Now Baking / chase light**: A currently running bake (tracked in `src/lib/activeBake.ts`, `localStorage`-backed, live across tabs) surfaces as a dedicated panel at the top of the dashboard with a RESUME control into Baking Mode, as a persistent strip in the global sidebar reachable from any screen, and as the one lit key in that recipe's own row elsewhere in the list.
- **Duration parsing**: `src/lib/duration.ts` reads both the schema's bare-minutes convention ("30") and AI-import's unit-annotated or bracket-wrapped text ("[50 mins]", "1 hr 30 mins") into a single total, formatted for the segment readout.
- **Phase derivation reused for real recipes**: The Phase 1 `derivePhases` bread/generic vocabulary now drives every dashboard row, not just the component lab.

## 2b. Application shell (Phase 2)
- **Global sidebar redesign**: Same seven sections as before; active state is a filled panel block (lightness contrast) rather than the source world's own red nav highlight, keeping the signal colour reserved for "happening now" per the accent-scarcity rule.
- **Mobile bottom nav restructured**: Four fixed slots (Cookbook, Gallery, Pantry, More) instead of the previous five with no room for Pantry, Grocery List, or Analytics. A More sheet (properly `inert` while closed, not just visually hidden) holds Analytics, Grocery List, General Notes, and Settings. New Recipe moves to a floating action button.
- **Onboarding modal, PIN auth modal, offline/stale bars**: retheme only — the PIN numeric keypad's interaction is unchanged (an explicit favourite), offline/stale banners use the world's amber "due" tone instead of raw Tailwind yellow/amber.
- **Fixed**: dangling `hover:` / `dark:hover:` Tailwind fragments left by Phase 0's glow-stripping script across 15 files.

## 2c. Photo plates (Phase 2a)
- **`RecipePlate` primitive**: A square, fixed-ratio image plate bordered by the panel's own hairline rule — a specimen mounted on the faceplate, not a floating card with a shadow. Three sizes: `row` (beside a pattern row), `tile` (a smart-shelf tile), `hero` (the framed plate on a recipe, sized by its wrapper).
- **Lazy and fault-tolerant**: Images are `loading="lazy"`, so a 203-row library does not fetch 203 photographs on first paint, and a dead URL falls back to the unlit plate instead of a broken-image glyph. The footprint is identical with or without a photograph, so a row's geometry never shifts.
- **Adopted by gallery tiles, smart shelves and the Recipe Viewer**: The amendment behind this is recorded in [REWORK_PLAN.md](REWORK_PLAN.md) — every recipe in the live library has exactly one final-product photograph, so the original assumption of uneven coverage was paying for a cold first screen to solve a problem that does not exist.
- **Step keys are capped as well as floored**: A recipe deriving only three phases used to stretch each key across a third of the row, where a 200px-wide rectangle stops reading as a key. Keys now have a maximum width, so the row shortens when there is less to play.

## 3a. Recipe Viewer (Phase 3)
- **Title-led masthead**: The recipe's title leads at display scale with its folder and difficulty silkscreened above; the photograph is a framed plate beside the instruments rather than a full-bleed hero, at every width including the phone — a 390px-wide square would push the ingredients off the screen.
- **Instrument values as segment readouts**: Total, prep, cook and servings all read as seven-segment displays. Total leads; a missing duration reads as `--` rather than being omitted. Servings light in the signal colour while the recipe is scaled, with the multiplier in the caption, so the number on screen is never mistaken for what the recipe was written at.
- **The method as a step row**: The recipe's own phases appear as a full labelled step row in the masthead — the same row the dashboard draws in miniature and Baking Mode lights key by key.
- **Instructions grouped by phase**: Steps are printed under silkscreened phase headings so a baker can see which instructions each key on the step row stands for. Numbering stays absolute across the whole recipe, so "step 7" means the same thing here as in Baking Mode.
- **Ingredients as an instrument panel**: Quantities set in mono with tabular figures at a fixed column width, so the numbers line up down the list. The pantry indicator is a lamp — filled when the pantry has it, hollow when it does not — carrying state by shape as well as fill.
- **Controls onto the primitives**: The scale bank (0.5x–3x), the Recipe/Previous makes tabs, favourite and the dropdown menus are all `Button`/`Panel` components. START RECIPE is the only solid signal-red control on the page. Lab notes sit in a `Panel`.
- **Fixed**: the export node painted itself panel-coloured, laying a lighter slab behind the whole recipe that lined up with nothing; and `SegmentReadout` announced its silkscreened caption and its value as two unrelated pieces of text, leaving a screen reader user to guess which display a number belonged to.

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
- **Onboarding & Landing**: A dedicated hero landing page with a 3-step carousel modal to introduce new users to the app functionality.
- **Skeletons & Empty States**: Polished animated skeleton loaders for data fetching, custom illustrated 404 pages, and a tailored empty state for the gallery.
- **Sanitization**: `rehype-sanitize` ensures user-generated markdown is safe from XSS.
- **Icons**: Standardized clean iconography via `lucide-react`.
- **Fault Resilience & Crash Protection**: `ErrorBoundary.tsx` wraps the routing tree to catch unhandled rendering exceptions, preventing white-screen crashes.
- **Server Architecture**: Modular Express server architecture with separated `routes/`, `services/`, and `middleware/`.
