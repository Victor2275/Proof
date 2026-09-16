# Proof: Tested Features Tracker

This is a 1-to-1 mirror of CURRENT_FEATURES.md. Use checkboxes to track manual testing status.

## 1. Core Recipe Management
- [ ] **Structured Schema (MongoDB)**: Recipes stored with all required fields.
- [ ] **Fuzzy Search & Filtering**: Typo-tolerant search on dashboard.
- [ ] **Nested Sub-Recipe Drawers**: Linking recipes to instruction steps.
- [ ] **Compact & Grid Views**: Dashboard view toggle.
- [ ] **Recipe Folders**: Organizing recipes into named folders.
- [ ] **Sub-recipe Instruction Links**: Inline drawer for linked recipes.

## 2. "The Kitchen Lab" (Active Baking Mode)
- [ ] **Distraction-Free Focus Mode**: Step-by-step baking UI.
- [ ] **Step row is the navigation (Phase 4)**: keys are live — red now, orange due, complete behind — and pressing one jumps to the first step of that phase.
- [ ] **Timers dock as readouts**: a running timer counts down on segments in Baking Mode's head and turns red past its end, instead of floating over the step.
- [ ] **Scale readout**: the live weight and the step's target only appear once a scale is connected.
- [ ] **Show All**: steps grouped under the same phase headings, running step outlined, tapping one returns to focus there.
- [ ] **Context-Aware Smart Ingredients**: Highlights relevant quantities per step.
- [ ] **Voice Commands**: Next, Back, Read, Ingredients, Start timer, Quiet, Show all, Help.
- [ ] **Wave-to-Advance**: Motion detection via front camera.
- [ ] **Swipe Gestures**: Touchscreen step navigation.
- [ ] **Real-Time Timers (Socket.io)**: Timer sync across devices.
- [ ] **Haptics**: Tactile feedback on timer/step events.
- [ ] **Wake Lock**: Screen stays on during baking.
- [ ] **Audio & Notifications**: Speech synthesis for timer announcements.
- [ ] **Reverse Bake Scheduler**: Backward time calculation from target eating time.
- [ ] **Bluetooth Scale Integration**: Auto-advance on target weight reached.
- [ ] **Voice Dictation in Bake Log**: Speech-to-text for bake notes.

## 3. Bake Logs & Learning
- [ ] **Visual-First Bake Logs Grid**: Photography grid with flip animation.
- [ ] **Custom Image Tags**: Labels on bake log images.
- [ ] **Before & After Photo Comparison**: Slider component.
- [ ] **AI Photo Tagging**: Gemini-powered auto hashtag generation.
- [ ] **Personal Bests**: Gold badge marking on best bakes.

## 4. Data Insights, AI, and Utilities
- [ ] **AI Recipe Extraction**: URL → structured recipe via Gemini.
- [ ] **AI Recipe Restructuring**: Raw text → structured recipe with diff preview.
- [ ] **AI Ingredient Substitutions**: Gemini-powered swap suggestions.
- [ ] **Smart Pantry**: Inventory tracking with pantry-matching on recipes; stock panel with a lit lamp per item, a count in the head, and a named remove control per row.
- [ ] **Barcode Scanning**: UPC scan to add pantry items.
- [ ] **Grocery List Generator**: Missing ingredients → shopping list.
- [ ] **Recipe bank**: a dozen latching keys with a search field; engaged recipes stay visible whatever the search says.
- [ ] **Checklist**: real checkboxes, strike-through, and a count that decrements as items are ticked.
- [ ] **Baking Analytics**: Charts for baking habits and history.
- [ ] **Nightly DB Backup (cron)**: JSON backup of MongoDB data.
- [ ] **Orphaned Image Cleanup**: Cloudinary cleanup via Admin API.
- [ ] **Offline PWA Engine**: Offline recipe reading via Workbox cache.

## 5. Sub-Resources & Media
- [ ] **Bake Logs**: Attach logs with photos and notes to recipes.
- [ ] **Bake logs grid**: notes on hover, one click opens the make, attempts numbered from the oldest, personal best marked in text as well as an icon.
- [ ] **Cloudinary Image Upload**: Images stored on Cloudinary via multer.
- [ ] **PDF / Recipe Card Export**: jspdf + html2canvas print output.
- [ ] **Shareable bake card**: 1080×1080 pattern card (photo plate, name, real instrument values, complete key row, site address), alone or as a carousel.
- [ ] **Card provenance**: no fabricated timing; labelled phase keys where proved, one key per step for a short generic recipe, phase keys past sixteen steps.
- [ ] **Card resolution**: a card exported from a phone is still 1080 (2160 at 2×), not the size of the preview.
- [ ] **Log slide**: appears only when the bake or recipe actually has notes.
- [ ] **QR Code Deep-links**: qrcode.react for recipe sharing.

## 6. Security & Auth
- [ ] **PIN-Gated Admin Access**: PIN required for write operations.
- [ ] **Crypto-Random Session Tokens**: No hardcoded secrets — UUID tokens with 24h TTL.
- [ ] **Rate Limiting**: AI and auth endpoints rate-limited.

## 2a. Dashboard (Phase 2 — hero surface)
- [ ] **Pattern-list cookbook**: rows read without a photograph; title, segment-readout time, mini step row.
- [ ] **Bank rail**: folder filtering, vertical + capped-scroll on desktop, horizontal scroller on mobile.
- [ ] **Smart shelves**: Personal Bests and Recently Baked, hidden while searching/filtering.
- [ ] **Now Baking / chase light**: dashboard panel, sidebar strip, and lit row all reflect the same running bake; resumes at the correct step after closing the tab.
- [ ] **Duration parsing**: bare-minutes and unit-annotated/bracketed prepTime+cookTime sum correctly.
- [ ] **Phase derivation on real data**: dashboard step rows match each recipe's actual instructions.

## 2b. Application shell (Phase 2)
- [ ] **Sidebar redesign**: active state readable without colour alone; chase-light strip appears only when a bake is running.
- [ ] **Bottom nav restructure**: four dock slots + working More sheet (inert while closed) + FAB New Recipe.
- [ ] **Onboarding/PIN/status bars retheme**: PIN keypad still works exactly as before; banners read in the amber "due" tone.

## 2c. Photo plates (Phase 2a)
- [ ] **Bake history by recipe (Phase 5)**: one row per recipe, oldest bake on the left, counting attempts not photographs.
- [ ] **Bake history by date**: every bake newest-first, cut into months.
- [ ] **Bake history empty state**: unlit plates rather than an illustration of absence.
- [ ] **Gallery grid**: photographs lead, names read underneath, two up at 390px and three or four on a desktop.
- [ ] **Hover**: the detail panel slides up, the border lights, and nothing resizes or shifts.
- [ ] **Provenance**: a recipe with real phases shows a step row; a generic one shows bake type and ingredient count instead. No tile claims 50 MIN.
- [ ] **Show more**: paging loads the next 48, and resets when you search or pick a bank.
- [ ] **Plates**: every recipe shows its photograph; tiles keep their geometry where one is missing.
- [ ] **Dead or absent image**: falls back to an unlit plate, never a broken-image glyph.
- [ ] **Scroll performance**: photographs load as rows come into view, not all at once.
- [ ] **Step keys**: a three-phase recipe still reads as keys, not as wide empty boxes.

## 3a. Recipe Viewer (Phase 3)
- [ ] **Masthead**: title leads; the photograph reads as a framed plate at desktop and at 390px, with ingredients still reachable without a long scroll.
- [ ] **Readouts**: total/prep/cook/serves read correctly; a recipe with no times shows `--`.
- [ ] **Scaling**: 0.5x-3x changes quantities and the serving count, and the serving display lights while scaled.
- [ ] **Method**: steps grouped under phase headings with numbering matching Baking Mode.
- [ ] **Ingredients**: checkboxes, baker's percentages, pantry lamps and the substitutions button all behave as before.
- [ ] **Controls**: share/QR/PDF, favourite, edit, start recipe and schedule bake all still work from both the desktop and mobile menus.
- [ ] **Start recipe menu**: opens fully rather than being clipped by the control row.

## 7. UI/UX Foundation
- [ ] **"Step Row" Visual World (Phase 0 foundation)**: Rhythm-machine design language — matte panels, silkscreen labels, lit step keys, segment readouts; colour is temporal, not decorative.
- [ ] **One enforced ban, two defined materials**: no glow except a lit key or segment; `--faceplate` and `.scrim` are the only gradient and blur, enforced by `src/designSystem.test.ts`.
- [ ] **Two Themes**: Light and Dark only; dark is default and true `#000000`, OLED consolidated in.
- [ ] **Self-hosted typography**: Archivo Variable + JetBrains Mono Variable, latin subsets, precached for offline use.
- [ ] **Component layer (Phase 1)**: Panel, Button, Field, SegmentReadout, StepRow, InstrumentRow, Meter in `src/components/ui`.
- [ ] **Seven-segment readouts**: Ghost segments visible, fixed width, reserved for instrument values, announced as one value.
- [ ] **Step row**: One key per phase, temporal colour, labels below the keys, collapses to a named running phase at 390px.
- [ ] **Phase derivation**: Bread vocabulary with a generic fallback; monotonic; never invents a levain for a non-bread recipe.
- [ ] **Component lab** (`/lab`): Dev-only primitives gallery, absent from production builds.
- [ ] **Themed browser surfaces**: Selection, caret, scrollbars and focus rings themed from the palette.
- [ ] **Global reduced-motion support**: `prefers-reduced-motion` collapses all animation.
- [ ] **Retired: global font switcher**: sans/serif/mono preference removed.
- [ ] **Onboarding & Landing**: A dedicated hero landing page with a 3-step carousel modal to introduce new users to the app functionality.
- [ ] **Skeletons & Empty States**: Polished animated skeleton loaders for data fetching, custom illustrated 404 pages, and a tailored empty state for the gallery.
- [ ] **XSS Sanitization**: rehype-sanitize on user markdown.
- [ ] **Error Boundary**: Catches unhandled render errors gracefully.
- [ ] **Server Architecture**: Modular Express server architecture with separated routes and services.
