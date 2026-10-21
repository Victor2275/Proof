# Proof: Tested Features Tracker

This is a 1-to-1 mirror of CURRENT_FEATURES.md. Use checkboxes to track manual testing status.

## 1. Core Recipe Management
- [ ] **Structured Schema (on the device)**: Recipes stored in IndexedDB with all required fields; an ingredient with no amount stores none.
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
- [ ] **Real-Time Timers**: timers run offline and survive a reload; signed in, they sync between the same account's devices.
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
- [ ] **Offline PWA Engine**: app shell and fonts cached; with the network off the cookbook still opens, edits and saves.

## 5. Sub-Resources & Media
- [ ] **Bake Logs**: Attach logs with photos and notes to recipes.
- [ ] **Bake logs grid**: notes on hover, one click opens the make, attempts numbered from the oldest, personal best marked in text as well as an icon.
- [ ] **Photographs on the device**: a photo added in the editor or a bake log is stored on the device and still shows offline.
- [ ] **PDF / Recipe Card Export**: jspdf + html2canvas print output.
- [ ] **Shareable bake card**: 1080×1080 pattern card (photo plate, name, real instrument values, complete key row, site address), alone or as a carousel.
- [ ] **Card provenance**: no fabricated timing; labelled phase keys where proved, one key per step for a short generic recipe, phase keys past sixteen steps.
- [ ] **Card resolution**: a card exported from a phone is still 1080 (2160 at 2×), not the size of the preview.
- [ ] **Log slide**: appears only when the bake or recipe actually has notes.
- [ ] **QR Code Deep-links**: qrcode.react for recipe sharing.

## 6. Security & Auth
- [ ] **Operator PIN**: only the Operator tools and the AI ask for it; saving a recipe, bake, note or pantry item never does.
- [ ] **Crypto-Random Session Tokens**: sessions survive a server restart; the `sessions` collection holds hashes, not tokens.
- [ ] **Rate Limiting**: PIN, sign-in and AI routes throttle repeated attempts from one caller, not from everyone at once.

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
- [ ] **Start recipe menu**: opens fully rather than being clipped by the transport strip.
- [ ] **Layout pass — reading order**: the title comes first; the scale bank sits under the Ingredients heading and is missing from an exported PDF; folder and difficulty sit beside the tags, not above the title.
- [ ] **Transport strip**: Recipe / Previous makes and (from `md`) Start recipe sit in one ruled strip below the masthead; at 375px both view keys are fully visible with no sideways scroll.
- [ ] **Masthead persists**: switching to Previous makes keeps the title, plate and readouts above the history.
- [ ] **Wide masthead**: at 1280px and up the step row sits in the plate's column on the plate's bottom edge; at 768 and 1024 it runs full width under the plate.
- [ ] **Lab notes with ingredients**: lab notes follow the ingredient list (beside the method when two-column), and the Ingredients and Method heads' rules line up.
- [ ] **Schedule from anywhere**: on Previous makes, or scrolled deep into the method, Start → Schedule bake switches to the recipe view and brings the schedule into view.
- [ ] **Missing recipe**: `/recipe/<unknown id>` shows the 404 panel with Back to the cookbook.
- [ ] **Long units**: a unit like "tablespoon heaped" stays inside the quantity column at 375px and does not overlap the name.
- [ ] **Make sheet**: titled "Make N" like its tile; the bake date shows day, month, year and time without seconds.
- [ ] **Scheduler title**: reads "Reverse bake schedule" and fits on one line at 375px.

## 6a. Recipe Editor and Notes (Phase 6)
- [ ] **Shared `Sheet` primitive**: Tab stays inside an open sheet, Escape closes it, focus returns to the control that opened it, and the page behind does not scroll.
- [ ] **Sheet stacking**: a sheet opened over another sheet — Escape closes only the top one, and the page stays locked until both are shut.
- [ ] **`TextArea` and `Select`**: multi-line fields and the difficulty picker match `Field`'s outline, focus signal and error wiring.
- [ ] **Editor instrument bar**: reports the recipe's name, ingredient count and step count live as they are typed; singular/plural is correct at one.
- [ ] **Editor controls on a phone**: 44px targets, labels collapse to icons below `sm`, and the bar stays usable at 375px.
- [ ] **Field-by-field AI review**: only changed fields are drawn; each can be kept or rejected alone; applying takes exactly what was kept.
- [ ] **AI review with nothing to say**: a model that proposes no change says so rather than showing an empty diff.
- [ ] **Prep and cook times survive a save**: open a recipe storing `"20 mins"`, confirm the field reads 20, save without touching it, and confirm the value is still there.
- [ ] **Retyped times normalise**: typing 45 into prep time and saving stores `"45"`, not `"45 mins"`.
- [ ] **Photographs panel**: Add photographs opens the file dialog from a real button; the empty state names the unlit plate.
- [ ] **Sub-recipe link search**: the sheet searches rather than listing all 203 recipes, and caps the list.
- [ ] **Step reordering carries its links**: move a step with a linked sub-recipe and confirm the link moved with it.
- [ ] **Editor overlays**: AI review, link, crop, past bakes and delete confirmation all behave as sheets.
- [ ] **Delete asks first**: no `window.confirm`; the sheet's Keep leaves the recipe alone.
- [ ] **Notes without the markdown editor**: a note is a title field and a textarea, with no toolbar or split pane.
- [ ] **Notes on a phone**: All notes opens the list as a bottom sheet, and switching notes works at 390px.
- [ ] **Notes save state**: the head LED lights on an unsaved edit; the Save control appears only when there is something to save, and reads "Saved" otherwise.
- [ ] **Notes save failure**: with the server unreachable, the typed text stays on screen and the error names the recovery.

## 6b. The selected make, and the viewer's overlays
- [ ] **Make detail as a sheet**: open a bake from a recipe's Previous makes — panels for the bake, its notes and its photographs, with a fixed foot.
- [ ] **Before/after comparison**: a make with two photographs still shows the side-by-side compare.
- [ ] **Labelling photographs**: Label them, type a label, Save — the label shows on the photograph afterwards.
- [ ] **Deleting a bake asks first**: no browser confirm; Keep leaves it alone, Delete removes it.
- [ ] **Personal best latches**: the key reads as engaged when on, and a screen reader announces it as a pressed toggle.
- [ ] **Set as cover**: confirms in the panel rather than through an alert box.
- [ ] **Failures report in the panel**: with the server down, deleting shows a named error inside the sheet rather than an alert box.
- [ ] **Phone start and share sheets**: both rise from the bottom edge and close on Escape and on the scrim.
- [ ] **QR dialog**: readable in dark mode — the code keeps its white surround.
- [ ] **Stacked sheets announce separately**: with the delete confirmation open over the make, each dialog carries its own name.

## 7a. Analytics, Settings, Landing, 404 (Phase 7)
- [ ] **Settings keys latch**: each preference reads ON or OFF, lights when on, and persists across a reload.
- [ ] **Theme bank**: exactly one of Light/Dark/System is down; picking System forgets the stored preference and follows the device.
- [ ] **Settings on a phone**: every key is a 44px target at 375px.
- [ ] **Backup without a PIN**: names the admin PIN as the recovery rather than failing silently.
- [ ] **Analytics with three bakes**: only months containing a bake are drawn, and the panel says there is not enough to read a trend.
- [ ] **Analytics with nothing logged**: says so rather than drawing an empty chart.
- [ ] **Baked more than once**: stays empty until a recipe has actually been baked twice, then ranks it.
- [ ] **Library meter**: 3 of 203 lights one cell, not zero, and shows no orange at the top.
- [ ] **Analytics load**: a skeleton, not the word "loading", and no long pause from reading the offline store repeatedly.
- [ ] **Landing hero**: the step row chases through the phases and the readout counts them off.
- [ ] **Landing under reduced motion**: with the OS setting on, the row holds on one phase and nothing moves.
- [ ] **Landing has no app chrome**: no sidebar, no bottom nav, at every width.
- [ ] **Landing CTA**: "Open the cookbook" enters the app and the landing page does not reappear on the next visit.
- [ ] **404**: an unlit panel with the seven-segment 404, readable in both themes, linking back to the cookbook.

## 7b. Mobile targets and the last alerts
- [ ] **375px sweep**: no horizontal scroll on the editor, notes, analytics, settings, landing or 404.
- [ ] **Thumb targets**: the editor's row controls, Add row / Add step, the notes controls and every sheet's close control are all 44px.
- [ ] **Known exception**: the × inside a tag chip is smaller by design; confirm it is still hittable.
- [ ] **Mobile ingredient row**: two lines per ingredient, with units like "clove crushed" and "juice of 1" fully visible at 375px.
- [ ] **Desktop ingredient row**: still one line — grip, quantity, unit, name, delete.
- [ ] **Copy confirmations**: copying a link or a grocery list shows a status strip that clears itself, with no browser alert.

## 8. Finish (Phase 8)
- [ ] **Reduced motion**: with the OS setting on, the landing chase holds still, the recipe drawer does not spring, and the onboarding modal does not slide.
- [ ] **Visual baselines**: `npm run test:visual` passes on a clean checkout; `npm run test:visual:update` regenerates.
- [ ] **375px floor**: no horizontal scroll on any of the ten routes.
- [ ] **Safe areas on a real Android device**: the floating action button and the notice bars clear the gesture bar; the recipe drawer's last row is not under it. *(Only simulated so far.)*
- [ ] **Signal control contrast**: "Start recipe" is legible at arm's length in both themes.
- [ ] **App icon**: install the PWA and confirm the step-row mark appears; rebuild the APK and confirm the launcher icon is not the old chef's hat.
- [ ] **Offline fonts**: load with the network off and confirm no request to fonts.googleapis.com and no fallback typeface.
- [ ] **PWA splash**: a cold start shows black, not a white flash.
- [ ] **Baking Mode reports in the panel**: force a scale failure and a bake-log failure; both appear as a bar under the head, neither is a browser dialog, and typed notes survive.
- [ ] **Finish by voice**: say "finish" and confirm the panel asks rather than the browser.

## 9. Public launch — Phase 0 UI audit
- [ ] **Bread phases**: Arepa pelua opens baking mode on COOK, not LEVAIN; Challah reads Mix → Bulk → Bake.
- [ ] **Template descriptions**: Danish Rye Bread's page shows no "A delicious Side dish." line; the three real descriptions still show.
- [ ] **Baker's %**: on Danish Rye Bread it says the flour needs to be weighed and shows no percentages; on a recipe weighed in grams it shows them.
- [ ] **This step needs**: Danish Rye step 1 lists Rye Grain and Water only; "Allow the bread to cool" lists nothing.
- [ ] **Scale target**: with a scale connected, a step with any un-weighed ingredient shows no target.
- [ ] **Reverse schedule**: Arepa's schedule marks steps without a stated time as assumed and explains it above the list.
- [ ] **Now Baking total**: a running bake of a placeholder-timed recipe shows dashes, not 50 MIN.
- [ ] **Tablet rail**: at 768–1023px the sidebar is an icon rail with tooltips; at 1024+ it has labels; the running bake's lamp still shows in the rail.
- [ ] **Recipe Viewer at 768 and 1024**: ingredients read in one column above the method, names on one line; at 1280 they sit side by side.
- [ ] **Cookbook header**: at 768 and 1024 the search sits full width under the title with Inspire Me beside it; at 1280 they share the title's row; nothing scrolls sideways.
- [ ] **Sub on a touch tablet**: the ingredient Sub control is visible without hovering.
- [ ] **Phone browser top**: every page's headline has space above it, not flush to the top edge.
- [ ] **Onboarding**: at 375px nothing overlaps; the step row lights the current screen; Back, Skip, Next, Escape and the × all work; it does not come back after closing.
- [ ] **PIN prompt**: desktop focuses the PIN field; the phone keypad's C and ⌫ keys clear and delete; a wrong PIN shows the error inside the dialog; reopening starts empty.
- [ ] **AI substitutions**: a skeleton while waiting; a sentence if nothing comes back; Try again after a failure; Escape closes.
- [ ] **Sub-recipe drawer**: rises from the bottom, shows a skeleton then the recipe; with the server down it says so and offers Try again.
- [ ] **Baking Mode sheets**: Ingredients, Log bake and Voice commands open as sheets; Escape closes the sheet without leaving Baking Mode; the arrow keys do not change the step while one is open.
- [ ] **Barcode scanner**: the camera view opens in a sheet and closes on Escape.
- [ ] **Bottom nav More**: on a phone, More opens a sheet; Escape and × close it and focus returns to More.
- [ ] **Timer prompt and docked timers**: the prompt shows the duration on a segment display; docked timers read on segments, light red only past zero, and their buttons are named.
- [ ] **Recipe Viewer menus**: Share and Start recipe open menus that close on Escape or a click outside and walk with the arrow keys; on a phone, ⋮ opens More actions with share, favorite and edit.
- [ ] **Reverse scheduler**: drawn as a panel with a timetable; the default target reads 09:00 tomorrow in local time.
- [ ] **No "Loading" text**: navigating to a new screen and opening the Instagram exporter show skeletons.
- [ ] **Red means now**: on a recipe, the timer chips in the method are outlined, not red; only the Start key is red.
- [ ] **New Recipe key**: lit on the cookbook with nothing baking; unlit on every other screen, and unlit on the cookbook while a bake runs.
- [ ] **Now Baking**: the panel's border, lamp and running key are red; the total and Resume are not; the sidebar shows only the lamp.
- [ ] **Faults**: an error (e.g. Analytics with the server down) reads in the amber fault colour in both themes, legible in light.
- [ ] **Offline bar in light theme**: legible amber-brown, not pale orange.
- [ ] **Delete**: the editor's Delete shows a dark red rule with an ink legend; it fills on hover.
- [ ] **AI substitutions**: no purple; the generate control is the standard primary key.
- [ ] **Audit snapshot**: `npm run audit:snapshot` writes the live library to `e2e/audit/.data/` and reports the record counts.
- [ ] **Audit matrix**: `npm run audit:ui` shoots every cell into `audit-shots/`; a stopped run continues with `AUDIT_RESUME=1`.
- [ ] **Audit report**: `npm run audit:report` writes `audit-shots/report.md` and a contact sheet per surface and theme.
- [ ] **Separate from the baselines**: `npm run test:visual` does not pick up the audit specs.

## 10. Public launch — Phase 1: the local-first cookbook
- [ ] **Works offline**: with the network off, create, edit and delete a recipe, log a bake with a photo, add a note and a pantry item; reload; all still there.
- [ ] **Client-minted ids**: a new recipe's address is a 26-character ULID.
- [ ] **Tombstones**: a deleted recipe vanishes from the cookbook, search and grocery list, and does not come back on reload.
- [ ] **Compressed photographs**: a 4 MB phone photo adds roughly 200 KB to Settings' storage reading.
- [ ] **Upgrade carries old offline bakes**: a bake logged offline on the previous version still appears, photo included, after updating.
- [ ] **Storage kept**: Settings shows whether the browser will keep the cookbook, the space used as a meter, and whether the server is reachable.
- [ ] **Export**: Settings → Export downloads `proof-cookbook-YYYY-MM-DD.zip` holding JSON files and the photographs.
- [ ] **Import**: importing that file on a fresh browser restores everything; importing it again reports nothing new; an older export does not overwrite a recipe edited since.
- [ ] **Not a backup**: importing an unrelated `.zip` names the problem.
- [ ] **Copy the server library** (operator): brings the server's recipes, bakes, notes and pantry onto the device; a second run adds nothing.
- [ ] **No offline bar**: going offline adds no strip across the screen.
- [ ] **Editor never offers a blank form**: `/edit/<unknown id>` says the recipe is not in the cookbook, with no Save or Delete.
- [ ] **Failed reads named**: a blocked database shows a named failure and Try again in Gallery, Analytics, Grocery and the cookbook, never an empty or zeroed panel.
- [ ] **Photo-less bake**: a bake with no photograph shows in the gallery as an unlit plate and is counted.
- [ ] **Server library retired**: `POST /api/recipes`, `/api/bakelogs`, `/api/notes`, `/api/pantry` and `/api/upload` answer 404; `GET /api/library` asks for the operator PIN.
- [ ] **String-id migration**: a dry run against a copy of the database reports the counts and writes nothing; `--apply` backs up first, then every record and reference is a string; a second run reports nothing to do.
- [ ] **Published photos kept**: after the nightly sweep, a published recipe whose library record was deleted still shows its photograph.
- [ ] **Photographed legacy bake**: a bake whose photos are only in its labelled list shows them in the gallery and on the recipe's previous makes.
- [ ] **AI gate**: as a stranger, Import from a URL, Restructure and Substitutions explain why they are closed instead of asking for a PIN.

## 11. Public launch — the shared cookbook, read side
- [ ] **Published API**: `/api/published` lists only approved, live recipes; `/api/published/<slug>` returns one; with the database down both answer 503 saying your own recipes are unaffected.
- [ ] **Seed script dry run**: `npx tsx scripts/curate-library.js` reports the counts and the withheld recipes with reasons, and writes nothing.
- [ ] **Seed script writes**: `--publish` and `--fix-library` each write a backup to `server/backups/` first, and a second run changes nothing new.
- [ ] **Starter shelf**: a fresh browser's cookbook shows "Start from one of these" with featured recipes; Save adds one and opens it.
- [ ] **Starter shelf offline**: with no connection the shelf says so and still offers Write a recipe.
- [ ] **Shared recipe page**: `/r/<slug>` shows Shared by @handle, no Edit or Favorite, and Save to my cookbook; once saved, Open my copy.
- [ ] **Fork attribution**: a saved copy reads "Adapted from @handle", linking to the original; its Share copies the original's address.
- [ ] **Unpublished page**: an unpublished slug reads as "Nothing at this address".

## 12. Public launch — Phase 2: accounts
- [ ] **Sign up**: More → Account → Create an account with email, handle and a 10+ character password; the account appears in Settings.
- [ ] **Handle rules**: `proof`, `admin` and a taken handle are refused with the reason on the handle field.
- [ ] **Sign in / out**: signing in on a second browser works; Sign out in Settings signs only that device out.
- [ ] **Wrong password**: says the email and password don't match, the same as for an unknown email.
- [ ] **Offline account**: with the network off, Settings still shows the signed-in account.
- [ ] **Session ended elsewhere**: after changing the password on one device, the other is signed out and asked to sign in again.
- [ ] **Profile**: display name, bio and handle save; a taken handle is refused.
- [ ] **Export account data**: downloads `proof-account.json` with the account and its published recipes.
- [ ] **Delete account**: refused with a wrong password; with the right one the account is gone and its recipes unpublished, and the cookbook on the device is untouched.
- [ ] **Claim line**: Settings → Account reads "Your N recipes and M bakes stay on this device."
- [ ] **AI for strangers**: Import from a URL offers Sign in instead of running.
- [ ] **AI allowance**: a confirmed account sees "5 of 5 left this month", which drops after an import and does not drop after a failed one; the sixth in a month is refused with when it resets.
- [ ] **Import fence**: importing `http://127.0.0.1/` or `http://169.254.169.254/` is refused; a normal recipe page imports and keeps its source URL.
- [ ] **Timers offline**: signed out and offline, a step's timer starts, rings, and survives a reload.
- [ ] **Timers per account**: two devices signed into one account share timers; a third signed into another account does not see them.
- [ ] **Content-Security-Policy**: the deployed page sends the header, the console shows no CSP violations, and the theme still applies before first paint.
- [ ] **Claim script**: `claim-library.js --email=<operator>` dry run reports the counts; `--apply` makes the account @proof and the author of the seeded recipes.

## 13. Public launch — Phase 3: the global cookbook (server)
- [ ] **Publish**: an unconfirmed account is refused; a confirmed one publishes and the recipe appears at `/r/<slug>` without its Favorite tag.
- [ ] **Push update**: republishing after an edit keeps the same address, even after renaming.
- [ ] **Attribution**: an imported recipe is refused without a credit, and accepted with one or with "my own words".
- [ ] **Photographs**: a device photo is published to Cloudinary; a hot-linked photo is left behind and the count says so.
- [ ] **Pre-screen**: with Gemini configured a normal recipe goes live; without it, the recipe is held for the operator.
- [ ] **Unpublish**: the author's unpublish removes the page; another account cannot unpublish it.
- [ ] **Browse**: sorting by most baked and by recent, and filtering by tag and author, return the right recipes.
- [ ] **Ratings**: rating twice replaces the first; the author can't rate their own; "I baked this" counts.
- [ ] **Comments**: a day-old confirmed account can comment; a new one is told to wait; a held comment shows only to its author.
- [ ] **Reports & queue**: a report reaches the operator's queue with its target; take down, approve and resolve all work.
- [ ] **Profiles**: `/api/profiles/<handle>` lists live recipes and bake counts, with no email.
- [ ] **Link previews**: pasting `/r/<slug>` into a chat shows the recipe's title, description and photo; Google's Rich Results Test reads the Recipe data.

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
- [ ] **Error Boundary**: Catches unhandled render errors gracefully.
- [ ] **Server Architecture**: Modular Express server architecture with separated routes and services.
