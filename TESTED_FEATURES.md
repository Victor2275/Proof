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
Rebuilt in the UI overhaul, Phase 3: see section 18.
- [ ] **Voice Commands**: Next, Back, Read, Ingredients, Start timer, Quiet, Show all, Up/Down, Help, Finish, Close.
- [ ] **Wave-to-Advance**: motion detection via the front camera, switched on from ⋯.
- [ ] **Swipe Gestures**: swipe left for Next, right for Back.
- [ ] **Real-Time Timers**: timers run offline and survive a reload; signed in, they sync between the same account's devices.
- [ ] **Haptics**: tactile feedback on timer and step events (Android build).
- [ ] **Wake Lock**: the screen stays on during baking.
- [ ] **Audio & Notifications**: a finished timer is spoken and notified.
- [ ] **Reverse Bake Scheduler**: backward time calculation from a target eating time.
- [ ] **Bluetooth Scale Integration**: weight and target appear once connected; the step advances at the target.
- [ ] **Voice Dictation in Bake Log**: speech-to-text for "What happened".

## 3. Bake Logs & Learning
The bake log lives on its recipe: see section 18.
- [ ] **Custom Image Tags**: labels on bake photographs, shown under each picture.
- [ ] **Before & After Photo Comparison**: two photographs side by side; "Then and now" slider between first and latest bakes.
- [ ] **Personal Bests**: one per recipe, stamped.

## 4. Data Insights, AI, and Utilities
- [ ] **AI Recipe Extraction**: URL → structured recipe via Gemini.
- [ ] **AI Recipe Restructuring**: Raw text → structured recipe with diff preview.
- [ ] **AI Ingredient Substitutions**: Gemini-powered swap suggestions.
- [ ] **The model chain**: an AI feature still answers when the first model in `MODELS` is out of quota or overloaded; a bad request fails at once rather than trying every model.
- [ ] **The cupboard**: a thing in the cupboard marks the recipe's ingredient "have it"; see section 21 for the page.
- [ ] **Barcode Scanning**: UPC scan to add a thing to the cupboard.
- [ ] **The shopping list**: a recipe's missing ingredients go onto Shop → To buy; see section 21.
- [ ] **Baking Analytics**: gone; Bakes opens on its summary line instead (section 19).
- [ ] **Nightly DB Backup (cron)**: JSON backup of MongoDB data.
- [ ] **Orphaned Image Cleanup**: Cloudinary cleanup via Admin API.
- [ ] **Offline PWA Engine**: app shell and fonts cached; with the network off the cookbook still opens, edits and saves.

## 5. Sub-Resources & Media
- [ ] **Bake Logs**: Attach logs with photos and notes to recipes.
- [ ] **Bake logs grid**: notes on hover, one click opens the make, attempts numbered from the oldest, personal best marked in text as well as an icon.
- [ ] **Photographs on the device**: a photo added in the editor or a bake log is stored on the device and still shows offline.
- [ ] **PDF / Recipe Card Export**: jspdf + html2canvas print output.
- [ ] **Shareable cards**: see section 20.
- [ ] **Card provenance**: no fabricated timing; labelled phase keys where proved, one key per step for a short generic recipe, phase keys past sixteen steps.
- [ ] **Card resolution**: a card exported from a phone is still 1080 (2160 at 2×), not the size of the preview.
- [ ] **Log slide**: appears only when the bake or recipe actually has notes.
- [ ] **QR Code Deep-links**: qrcode.react for recipe sharing.

## 6. Security & Auth
- [ ] **Operator PIN**: only the Operator tools and the AI ask for it; saving a recipe, bake, note or pantry item never does.
- [ ] **Crypto-Random Session Tokens**: sessions survive a server restart; the `sessions` collection holds hashes, not tokens.
- [ ] **Rate Limiting**: PIN, sign-in and AI routes throttle repeated attempts from one caller, not from everyone at once.

## 2a. Dashboard (Phase 2 — hero surface)
Rebuilt as the cookbook home: see section 19.
- [ ] **Duration parsing**: bare-minutes and unit-annotated/bracketed prepTime+cookTime sum correctly.
- [ ] **Running bake**: the resume card and the timer pill reflect the same running bake; it resumes at the correct step after closing the tab.

## 2b. Application shell (Phase 2)
- [ ] **Shell**: replaced in the UI overhaul — see section 17.
- [ ] **PIN/status bars retheme**: PIN keypad still works exactly as before.

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
Replaced by the printed-cookbook recipe page: see section 18.
- [ ] **Missing recipe**: `/recipe/<unknown id>` shows the 404 panel with Back to the cookbook.
- [ ] **Long units**: a unit like "tablespoon heaped" stays inside the quantity column at 375px and does not overlap the name.

## 6a. Recipe Editor and Notes (Phase 6)
The editor was rebuilt in the UI overhaul, Phase 6: see section 21.
- [ ] **Shared `Sheet` primitive**: Tab stays inside an open sheet, Escape closes it, focus returns to the control that opened it, and the page behind does not scroll.
- [ ] **Sheet stacking**: a sheet opened over another sheet — Escape closes only the top one, and the page stays locked until both are shut.
- [ ] **`TextArea` and `Select`**: multi-line fields and the difficulty picker match `Field`'s outline, focus signal and error wiring.
- [ ] **Field-by-field AI review**: only changed fields are drawn; each can be kept or rejected alone; applying takes exactly what was kept.
- [ ] **AI review with nothing to say**: a model that proposes no change says so rather than showing an empty diff.
- [ ] **Prep and cook times survive a save**: open a recipe storing `"20 mins"`, confirm the field reads 20, save without touching it, and confirm the value is still there.
- [ ] **Retyped times normalise**: typing 45 into prep time and saving stores `"45"`, not `"45 mins"`.
- [ ] **Sub-recipe link search**: the sheet searches rather than listing all 203 recipes, and caps the list.
- [ ] **Step reordering carries its links**: move a step with a linked sub-recipe and confirm the link moved with it.
- [ ] **Notes without the markdown editor**: a note is a title field and a textarea, with no toolbar or split pane.
- [ ] **Notes on a phone**: All notes opens the list as a bottom sheet, and switching notes works at 390px.
- [ ] **Notes save state**: the Save control appears only when there is something to save, and reads "Saved" otherwise.
- [ ] **Notes save failure**: with storage blocked, the typed text stays on screen and the error names the recovery.

## 6b. The selected make, and the viewer's overlays
Rebuilt as the bake sheet: see section 18.
- [ ] **QR code**: readable in dark mode — the code keeps its white surround.
- [ ] **Stacked sheets announce separately**: with the log sheet open over a bake, each dialog carries its own name.

## 7a. Analytics, Settings, Landing, 404 (Phase 7)
- [ ] **Settings**: see section 21.
- [ ] **Theme**: exactly one of Light/Dark/System is chosen; picking System forgets the stored preference and follows the device.
- [ ] **Backup without a PIN**: names the admin PIN as the recovery rather than failing silently.
- [ ] **Library meter**: 3 of 203 lights one cell, not zero, and shows no orange at the top.
- [ ] **Landing**: see section 20.
- [ ] **Landing has no app chrome**: no top bar, no tab bar, at every width.
- [ ] **Landing CTA**: "Open my cookbook" enters the app and the landing page does not reappear on the next visit.
- [ ] **404**: see section 21.

## 7b. Mobile targets and the last alerts
- [ ] **375px sweep**: no horizontal scroll on the editor, notes, analytics, settings, landing or 404.
- [ ] **Thumb targets**: the editor's row controls, Add row / Add step, the notes controls and every sheet's close control are all 44px.
- [ ] **Known exception**: the × inside a tag chip is smaller by design; confirm it is still hittable.
- [ ] **Mobile ingredient row**: two lines per ingredient, with units like "clove crushed" and "juice of 1" fully visible at 375px.
- [ ] **Desktop ingredient row**: still one line — grip, quantity, unit, name, delete.
- [ ] **Copy confirmations**: copying a link or a grocery list shows a status strip that clears itself, with no browser alert.

## 8. Finish (Phase 8)
- [ ] **Reduced motion**: with the OS setting on, pages do not slide, sheets and the recipe drawer do not spring.
- [ ] **Visual baselines**: `npm run test:visual` passes on a clean checkout; `npm run test:visual:update` regenerates.
- [ ] **375px floor**: no horizontal scroll on any of the ten routes.
- [ ] **Safe areas on a real Android device**: the tab bar, the toast and the notice bars clear the gesture bar; the recipe drawer's last row is not under it. *(Only simulated so far.)*
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
- [ ] **Tablet width**: at 768–1023px the top bar fits its wordmark, four destinations, New and the avatar on one line with no sideways scroll.
- [ ] **Recipe Viewer at 768 and 1024**: ingredients read in one column above the method, names on one line; at 1280 they sit side by side.
- [ ] **Cookbook header**: at 768 and 1024 the search sits full width under the title with Inspire Me beside it; at 1280 they share the title's row; nothing scrolls sideways.
- [ ] **Sub on a touch tablet**: the ingredient Sub control is visible without hovering.
- [ ] **Phone browser top**: every page's headline has space above it, not flush to the top edge.
- [ ] **PIN prompt**: desktop focuses the PIN field; the phone keypad's C and ⌫ keys clear and delete; a wrong PIN shows the error inside the dialog; reopening starts empty.
- [ ] **AI substitutions**: a skeleton while waiting; a sentence if nothing comes back; Try again after a failure; Escape closes.
- [ ] **Sub-recipe drawer**: rises from the bottom, shows a skeleton then the recipe; with the server down it says so and offers Try again.
- [ ] **Baking Mode sheets**: Ingredients, Log bake and Voice commands open as sheets; Escape closes the sheet without leaving Baking Mode; the arrow keys do not change the step while one is open.
- [ ] **Barcode scanner**: the camera view opens in a sheet and closes on Escape.
- [ ] **Timer prompt and timers sheet**: the prompt shows the duration as plain figures; the timers sheet shows each timer on butter, a minus sign past zero, and named Pause and Remove buttons.
- [ ] **Recipe Viewer menus**: Share and Start recipe open menus that close on Escape or a click outside and walk with the arrow keys; on a phone, ⋮ opens More actions with share, favorite and edit.
- [ ] **Reverse scheduler**: drawn as a panel with a timetable; the default target reads 09:00 tomorrow in local time.
- [ ] **No "Loading" text**: navigating to a new screen and opening the card exporter show skeletons.
- [ ] **Red means now**: on a recipe, the timer chips in the method are outlined, not red; only the Start key is red.
- [ ] **New Recipe key**: lit on the cookbook with nothing baking; unlit on every other screen, and unlit on the cookbook while a bake runs.
- [ ] **Now Baking**: the panel's border, lamp and running key are red; the total and Resume are not.
- [ ] **Faults**: an error (e.g. Analytics with the server down) reads in the amber fault colour in both themes, legible in light.
- [ ] **Offline bar in light theme**: legible amber-brown, not pale orange.
- [ ] **Delete**: the editor's Delete shows a dark red rule with an ink legend; it fills on hover.
- [ ] **AI substitutions**: no purple; the generate control is the standard primary key.
- [ ] **Audit snapshot**: `npm run audit:snapshot` writes the live library to `e2e/audit/.data/` and reports the record counts.
- [ ] **Audit matrix**: `npm run audit:ui` shoots every cell into `audit-shots/`; a stopped run continues with `AUDIT_RESUME=1`.
- [ ] **Audit report**: `npm run audit:report` writes `audit-shots/report.md` and a contact sheet per surface and theme.
- [ ] **Separate from the baselines**: `npm run test:visual` does not pick up the audit specs.
- [ ] **Overhaul review set**: `npm run audit:overhaul` writes a fold shot, a full-page shot and a text file per screen into `audit-shots/overhaul/before/`; the desktop page shots run past 800px where the page does.
- [ ] **Overhaul label**: `OVERHAUL_LABEL=after npm run audit:overhaul` writes into `audit-shots/overhaul/after/` and leaves `before/` untouched.
- [ ] **Overhaul set separate from the baselines**: `npm run test:visual` does not pick up `e2e/overhaul/`.
- [ ] **/ui-review stops on a stale DESIGN.md**: with DESIGN.md still describing the Step Row design, `/ui-review` stops at preflight and says to rewrite it.
- [ ] **Review capture**: `REVIEW_LABEL=x npm run review:capture` writes `fold.png`, `page.png`, `text.txt` and `facts.json` per screen into `audit-shots/review/x/`, each named `<owner>__<screen>__<theme>__<width>`.
- [ ] **Capture facts**: a screen that calls an endpoint the stand-in doesn't know lists it under `unmocked` in its `facts.json`.
- [ ] **Review server**: `npm run review:api` answers `/api/published`, `/api/published/index`, a shared slug, profiles, sign-up and URL import on port 3001, and prints `UNMOCKED …` for anything else. It refuses to start, and says why, if the port is taken.
- [ ] **Review server tests**: `npm run test:review` passes.
- [ ] **Regular device for live checks**: after `npm run review:seed`, running `.claude/skills/ui-review/scripts/reset-regular.js` in the MCP browser opens the cookbook with the live library. `reset-empty.js` leaves a stranger's device that lands on `/welcome`.
- [ ] **Newcomers kept new**: the First-Timer and Link Follower agents have only `Read` and browser tools, and their round-1 task does not include `RULES.md`.
- [ ] **Three checking rounds**: a run leaves `proposals-v1..3.md` and `check-1..3/` in its run folder, and every rule-breaking proposal sits under "Needs your ruling" in `REPORT.md`, never in the plan.
- [ ] **Demonstration**: a run ends with a published artifact of before/after pairs, linked at the top of `REPORT.md`.
- [ ] **Review set separate from the baselines**: `npm run test:visual` does not pick up `e2e/review/`.

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
- [ ] **Failed reads named**: a blocked database shows a named failure and Try again in Bakes, Shop and the cookbook, never an empty or zeroed panel.
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
- [ ] **Starter shelf**: a fresh browser's cookbook shows "Or start from one of these" with featured recipes; Add adds one and opens it.
- [ ] **Starter shelf offline**: with no connection the shelf says so, and the three doors above it still work.
- [ ] **Shared recipe page**: `/r/<slug>` shows Shared by @handle, no Edit or Favorite, and Save to my cookbook; once saved, Open my copy.
- [ ] **Fork attribution**: a saved copy reads "Adapted from @handle", linking to the original; its Share copies the original's address.
- [ ] **Unpublished page**: an unpublished slug reads as "Nothing at this address".

## 12. Public launch — Phase 2: accounts
- [ ] **Sign up**: avatar → Sign in → Create an account with email, handle and a 10+ character password; the account appears in Settings.
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
- [ ] **Reports & queue**: a report reaches the queue (operator or moderator) with its target; take down, approve and resolve all work.
- [ ] **Profiles**: `/api/profiles/<handle>` lists live recipes and bake counts, with no email.
- [ ] **Link previews**: pasting `/r/<slug>` into a chat shows the recipe's title, description and photo; Google's Rich Results Test reads the Recipe data.

## 14. Public launch — Phase 3: the global cookbook (app)
- [ ] **Publish state**: a new recipe reads "Only on this device"; after publishing, "Live in the shared cookbook"; after an edit, "Live, with edits not yet pushed" and the key says Push update; a held one reads "Waiting for review".
- [ ] **Publish sheet**: says what goes public and what stays private; counts device photos and the ones that stay behind; asks an imported recipe for its credit; shows the public page link afterwards.
- [ ] **Unpublish**: needs a second press; the page then 404s.
- [ ] **Rejected**: an operator rejection shows "Held back: <reason>" under the recipe's header.
- [ ] **LIVE tag**: published recipes, and only those, carry LIVE on the cookbook's tiles.
- [ ] **Discover**: searches by title and baker, filters by tag, sorts four ways; offline it says it needs a connection (layout: section 21).
- [ ] **Navigation**: Discover is one of the four destinations; the operator and moderators see Moderation in the avatar menu.
- [ ] **Profile**: `/@proof` shows the seeded library; `/@nobody` is the 404.
- [ ] **Ratings**: signed in, rating and "I baked this" update the counts; the author can't rate their own.
- [ ] **Notes on a shared recipe**: a held note shows "only you can see it"; a new account is told to wait a day; Delete and Report work.
- [ ] **Report**: reporting a recipe or comment says the operator will look at it, and it appears in the queue.
- [ ] **Moderation page**: hidden from everyone but the operator and moderators; approve, hold back with a reason, take down and leave up all work.

## 15. Public launch — Phase 2: account email
- [ ] **Confirm**: with Resend configured, signing up sends a link; opening it says the email is confirmed and Publish opens; opening it again says it expired or was used.
- [ ] **Resend**: Settings → Account → Send the link again sends a fresh one, and the old link stops working.
- [ ] **No email yet**: without `RESEND_API_KEY`, sign-up says the confirmation couldn't be sent; a moderator's Confirm, or `verify-account.js`, confirms the account.
- [ ] **Forgot password**: the sheet gives the same message for a real and an unknown address; the reset link sets a new password, signs every device out, and works once.

## 16. UI overhaul — Phase 1: the cookbook foundation
- [ ] **Paper by default**: with no theme stored (fresh browser), the app opens on warm paper, with no dark flash on load.
- [ ] **Dark is warm**: Settings → Dark shows warm charcoal, not black; muted text and sheets stay readable.
- [ ] **Theme control**: Settings → Appearance is a Light | Dark | System segmented control; Tab reaches it once and the arrow keys move the choice; "System" survives a reload and follows the device.
- [ ] **Faces**: titles in Fraunces, recipe prose in Source Serif 4, controls and figures in Inter Tight — with the network off after one visit (precached).
- [ ] **Sentence case**: no uppercase, letter-spaced labels anywhere (including the photo Before/After labels).
- [ ] **No gradient, blur or glow**: panels are flat paper; a sheet's backdrop is a plain dim.
- [ ] **The press**: buttons, icon buttons, tiles and segments sink slightly and tint while pressed; with reduced motion on, they tint without moving.
- [ ] **IconButton**: icon-only controls are 44px, read their name to a screen reader, and show it as a tooltip.
- [ ] **BackButton**: "‹ Name" goes back to the previous screen with its scroll kept; opened cold from a shared link, it goes to the parent screen instead of leaving the app.
- [ ] **Segmented**: one option checked; arrow keys move it; a tick on a phone with haptics on.
- [ ] **Readout**: figures are plain tabular numbers with a lower-case unit; a running timer past zero reads in paprika.
- [ ] **Phases line**: the bake's phases show as a thin line of segments — running one paprika, done ones ink; tapping a segment in Baking Mode jumps to its first step.
- [ ] **Drop cap**: a recipe with no photo (or a dead photo link) shows its initial on paper at the same size, never an empty box.
- [ ] **Tile line**: a recipe with a real time shows "Chapter · 1 h 15"; one with the placeholder 20/30 shows its ingredient count instead.
- [ ] **Publish state in words**: "Private · only on this device", "Waiting for review", "Public in the shared cookbook", "Public · edits not yet shared".
- [ ] **Meter**: a single rounded track; a tiny real value still shows a sliver; zero shows none.
- [ ] **Component lab**: `/lab` in development shows buttons, icon buttons, back, segmented, tiles and plates, phases, figures, panels, fields, sheets, menu, pantry chips, meters, publish states and tags.

## 7. UI/UX Foundation
- [ ] **The printed cookbook**: every screen is paper and ink, with paprika only on the one primary action and the stars; no gold, glass, lit keys or segment readouts anywhere.
- [ ] **Paper is flat**: `npm test` fails if a gradient, blur, glow, uppercase tracked label, stock palette colour or an old token name (`bg-panel`, `text-ground`, …) is added to any component.
- [ ] **Two themes**: Paper is the default on a fresh browser; Dark is warm charcoal, not black; reloading never flashes the other theme.
- [ ] **Self-hosted typography**: with the network off after one visit, titles, method and controls keep their faces.
- [ ] **Phase derivation**: a bread recipe shows Levain · Mix · Bulk · Shape · Bake; a soup never shows a levain.
- [ ] **Component lab** (`/lab`): present in development, absent from a production build.
- [ ] **Themed browser surfaces**: selection is butter, the caret paprika, the focus ring paprika with a gap.
- [ ] **Reduced motion**: with reduced motion on, presses don't scale, sheets and pages don't slide, and the stamp doesn't thump.
- [ ] **Landing**: first-time visitors see the landing page; there is no onboarding tour.
- [ ] **Skeletons and empty states**: Discover shows a skeleton while it loads; an empty Shop list and an empty cookbook each say so in one line.
- [ ] **Error Boundary**: Catches unhandled render errors gracefully.
- [ ] **Server Architecture**: Modular Express server architecture with separated routes and services.

## 17. UI overhaul — Phase 2: the shell and navigation
- [ ] **Four destinations**: the phone shows four tabs, Cookbook · Bakes · Shop · Discover, each icon over label and at least 44px tall; there is no More and no floating +.
- [ ] **Tab marks where you are**: on a recipe, an edit page, a new recipe or Loose notes, Cookbook is marked; on Settings no tab is marked.
- [ ] **Tab haptic**: on the Android build with haptics on, changing tab ticks; pressing the tab you are on does not.
- [ ] **Desktop top bar**: from 768px a slim bar shows Proof (back to the cookbook), the four destinations with a paper thumb that slides to the one chosen, New and the avatar. No sidebar.
- [ ] **New**: the Cookbook header (phone) and the top bar (desktop) have a labelled New button; it opens a sheet with "Write it" (blank editor) and "Paste a link or text" (editor with the import open).
- [ ] **Avatar**: the menu (desktop) or sheet (phone) holds Settings, Sign in or Account, My published recipes, Export or import, Help; the operator and moderators also see Moderation. Signed in, it shows your initials and @handle.
- [ ] **Export or import**: lands on Settings → Data on this device, scrolled to it.
- [ ] **Help**: opens a sheet explaining the cookbook, cooking, bakes, shop and that it stays on this device.
- [ ] **My published recipes** (`/published`): signed out, it asks you to sign in and says why; signed in, it lists each published recipe with where it stands, each opening the recipe.
- [ ] **Bakes** (`/bakes`): see section 19.
- [ ] **Shop** (`/shop`): To buy | In the cupboard switch in place; In the cupboard is `?view=cupboard`.
- [ ] **Old addresses still work**: `/gallery` and `/analytics` land on Bakes; `/grocery` and `/pantry` on Shop in the matching view.
- [ ] **Loose notes**: General Notes is now "Loose notes", reached from a row in the Cookbook's chapter list, with Back to Cookbook.
- [ ] **Timer pill**: start a timer in baking mode, leave to Bakes: a butter pill reads "Oven · 12:04" at the top (phone) or in the top bar (desktop), with "+1" for a second timer; pressing it returns to baking mode. It is not shown inside baking mode.
- [ ] **Timer pill without a bake**: with a timer running and no bake open, pressing the pill opens the timers sheet, where each timer can be paused, resumed and removed.
- [ ] **Shared pages are chrome-free**: `/r/:slug` and `/@handle` show no tab bar and no top bar, at every width.
- [ ] **Transitions**: switching tabs cross-fades; opening a recipe slides in from the right; Back slides in from the left; a reload or a deep link does not animate. With reduced motion on, nothing slides.
- [ ] **Scroll memory**: scroll the cookbook, open a recipe, press Back: you are where you were. Switch to Bakes and back to Cookbook: the cookbook keeps its scroll.
- [ ] **Sheet detents**: New, Help and the account sheet open at half height; the grabber cycles half and nearly full; dragging the grabber moves between them or, dragged low, closes the sheet; Done is always visible; Tab stays inside the sheet throughout.
- [ ] **Toast and Undo**: in `/lab`, "Show a toast with Undo" shows the report above the tab bar for six seconds, longer while hovered or focused; Undo works from the keyboard; a screen reader announces the report.
- [ ] **Undo restores a deleted record**: restoring a deleted recipe, bake, pantry item or note brings it back with its photographs (`repo.restore`).
- [ ] **Disclosure**: in `/lab`, "5 more chapters and loose notes" opens with a turning chevron and growing height; closed, its links cannot be reached by Tab.
- [ ] **Component lab**: `/lab` shows the page header, the disclosure, the toast and the sheet with detents.

## 18. UI overhaul — Phase 3: the recipe page and baking mode
- [ ] **Reading order (phone)**: a recipe opens on its photograph edge to edge, then title, headnote, one facts line, Last time, Start cooking and Log a bake, ingredients, method, Your bakes.
- [ ] **Desktop spread**: at 1280, photograph, facts and ingredients on the left, the method on the right, Your bakes under both.
- [ ] **Back by chapter**: a Dessert recipe's back reads "‹ Dessert" and returns to the cookbook filtered to Dessert; opened cold, it still goes there.
- [ ] **Placeholder times**: a seeded recipe (20 mins / 30 mins) shows no times and offers "Add times".
- [ ] **Headnote**: an imported "Be sure to check out my video…" sentence is not shown.
- [ ] **Source credit**: "Adapted from <site> ↗" opens the source in a new tab.
- [ ] **Publish chip**: reads Private · this device; pressing it opens the publish sheet; a held-back recipe's sheet gives the reason and the fix, not in red.
- [ ] **Last time card**: the newest bake's date, stars, first line and "Next time" note; pressing it opens Bakes for this recipe.
- [ ] **Docked Start cooking**: on a phone, scroll down into the ingredients — a bar with the title and Start cooking rises above the tab bar, and goes when the original is back in view.
- [ ] **Fractions and units**: "⅔ cup", "⅛ tsp", "1 tbsp" instead of 0.51 fl oz; no "0.13 tsp" anywhere.
- [ ] **Weights column**: "graham cracker crumbs (170g)" shows "170 g" on the right, not in the name.
- [ ] **Serves stepper**: + and – scale every row; "Back to 12" returns to the written amount.
- [ ] **Ticks**: tapping a row ticks it with a sage mark and strikes it through.
- [ ] **Pantry quiet**: with no pantry, no row says anything about one; add Eggs to the cupboard and the eggs row reads "✓ have".
- [ ] **Add missing to Shop**: one press adds the missing ingredients; the rows read "On list"; Undo in the toast takes them off; the shopping list keeps them after a reload.
- [ ] **Baker's %**: offered on a bread with weighed flour, not on a cheesecake; shows a % column with — for unweighed rows.
- [ ] **Method**: "--- Cheesecake ---" is a subhead, not a step; numbering skips it; no "Read more" anywhere.
- [ ] **Inline timers**: "50–60 minutes" is one butter chip starting a 50-minute timer.
- [ ] **Margin note**: after logging a bake with a note on step 9, step 9 shows it in pencil.
- [ ] **Your bakes**: oldest left; a photo-less bake is a note card; the best bake stamped; Log a bake at the end.
- [ ] **Then and now**: with two photographed bakes, the slider wipes between the first and latest, and moves with the arrow keys.
- [ ] **Log a bake from the page**: stars, photo, notes, what I changed, next time and best all save; the toast says "Bake logged".
- [ ] **One personal best**: marking a second bake as best unmarks the first.
- [ ] **Bake sheet**: shows everything logged; Edit opens the log sheet filled in; Set as cover changes the photograph; Delete removes it at once and Undo brings it back with its photographs.
- [ ] **Share**: on a phone, the system share sheet; on desktop, Proof's sheet — a private recipe says it has no link and offers Publish; Copy as text, Save as PDF and Print work.
- [ ] **Delete recipe**: from ⋯, at once, back to its chapter, with Undo.
- [ ] **Duplicate**: from ⋯, opens "<title> (copy)".
- [ ] **Shared recipe**: no favourite, edit or Start cooking; Save to my cookbook sits under the facts.
- [ ] **Baking mode head**: ×, title, "n of N", ⋯; the thin parts line is longer for longer parts; pressing a part jumps to it.
- [ ] **Step**: large serif text; its timer as a big butter "Start 10 minutes" that turns into the countdown once started.
- [ ] **You need**: the step's own ingredients with amounts.
- [ ] **Last time on this step**: a note filed on this step in the last bake shows under it.
- [ ] **Next time at the start**: the last bake's "Next time" shows on step 1.
- [ ] **Note mid-bake**: Note → type → Save files it; it shows under the step and arrives in "How did it go?".
- [ ] **Back on step 1**: not shown, and the Next button does not move.
- [ ] **How did it go?**: the last Next opens the log; saving it ends the bake (the pill goes) and opens the recipe with the new bake.
- [ ] **Stop without logging**: from ⋯, ends the bake without a log.
- [ ] **Desktop side panel**: at 1280, You need, Last time and a quick note sit beside the step.
- [ ] **Hands-free kept**: swipe, arrows, voice commands, wave to advance, the scale's auto-advance, wake lock.
- [ ] **Export includes the shopping list**: Settings → Export, then Import on a fresh device, brings the list back.
- [ ] **Component lab**: `/lab` shows stars, the star rating, the stamp (one pressed on) and margin notes.

## 19. UI overhaul — Phase 4: the cookbook and Bakes
- [ ] **Search first**: the cookbook opens with a full-width search and no unlabelled shuffle; while it loads the field does not say "0 recipes".
- [ ] **Resume card**: with a bake logged, the card shows the last bake's recipe, stars, bake count and its note to next time, with a ribbon; with a bake running, it reads "Resume baking" and opens baking mode.
- [ ] **Each recipe once**: the recipe on the resume card is not repeated in Recently baked.
- [ ] **Recently baked**: the header row and the "All bakes" tile open Bakes.
- [ ] **Contents**: chapters with dotted leaders and counts; pressing one opens `/?chapter=<name>` with Back to Cookbook; "N more chapters and loose notes" opens the rest and Loose notes.
- [ ] **Index A–Z**: A–Z swaps the contents for the index and puts `?view=az` in the address; the letter rail jumps on a press and while sliding a thumb, ticking at each letter on Android; empty letters are pale.
- [ ] **Tile line**: a baked recipe reads "Baked 3 days ago · ★4" (or "Baked on Sep 16"); an unbaked one shows its chapter; no tile shows an ingredient count.
- [ ] **Sort**: A–Z, Recently baked, Rating and Recently added reorder the list and survive a reload.
- [ ] **Filter**: the sheet's chapter, difficulty, baked, favourites, published (signed in) and Can make now (with a cupboard) narrow the list at once; the button counts them; Clear filters resets.
- [ ] **Grid and list**: List shows thumbnails with full titles; the choice survives a reload.
- [ ] **Paging**: scrolling down the 203 recipes loads more without a button press.
- [ ] **Search**: "butter" finds recipes with butter in them, and bakes whose notes mention it under "In your bake notes", each opening that bake.
- [ ] **Surprise me**: labelled, among search results and under All recipes.
- [ ] **⌘K**: on a desktop, ⌘K/Ctrl+K or the top bar's search opens the palette; typing finds recipes, chapters and places; arrows and Enter open one; it works offline.
- [ ] **Bakes summary**: "N bakes · N recipes", with "best: X" only between two or more recipes with no tie.
- [ ] **Journal**: bakes by month, newest first, each with photo or note card, recipe, date and bake number, stars and first line; the best stamped.
- [ ] **By recipe**: recipes baked more than once as oldest-to-newest strips, with a sparkline from three rated bakes; the rest under "Baked once".
- [ ] **One recipe's bakes**: a recipe's Last time card opens Bakes narrowed to it; "Every recipe" widens it again.
- [ ] **Compare**: Compare → tick two → Compare (2) shows them side by side, with a wipe when both have photographs.
- [ ] **Log bake from Bakes**: pick a recipe, and its log sheet opens.
- [ ] **Old addresses**: `/analytics` and `/gallery` open Bakes.
- [ ] **Component lab**: `/lab` shows the ribbon, the letter rail and the sparkline.

## 20. UI overhaul — Phase 5: first run and sharing
- [ ] **Landing**: a fresh browser opens on "Bake it. Write it down. Bake it better." over the rye loaf; the photo shows with the network off after one visit.
- [ ] **One action**: "Open my cookbook" is the filled button at the top and the foot; "No account. It stays on your phone." reads at body size.
- [ ] **Example recipe**: the landing shows a recipe page with last time's note and three bakes; "See an example recipe" scrolls to it.
- [ ] **No tour**: opening the cookbook for the first time shows the empty cookbook, with no modal.
- [ ] **Empty cookbook**: "Your cookbook is empty", the stored-on-device line, and three doors: Write it, Paste a link or text, Photograph a page.
- [ ] **Starter shelf**: large photographs with a small Add; Add saves the recipe and opens it.
- [ ] **Photograph a page**: on a phone the button opens the camera; a photographed cookbook page fills the title, ingredients and method (needs a confirmed account or the operator, and `GEMINI_API_KEY`); without access, the AI sheet explains instead.
- [ ] **Photo route limits**: `POST /api/ai-photo` refuses a non-image (400) and a photograph over 4 MB (413).
- [ ] **Shared page**: Save to my cookbook, Copy link and Print sit together under the facts.
- [ ] **What bakers noticed**: a recipe with ratings prints them in one line; one with none says "Be the first to bake this."; notes show pencilled under handles.
- [ ] **Rating a shared recipe**: signed in, the stars set a rating and pressing the chosen star again clears it; "I baked this" toggles.
- [ ] **Profile bookshelf**: `/@proof` shows initials, name, handle and counts, the bio, Share profile and "On the shelf"; Back goes to Discover.
- [ ] **Bake card**: from a bake's sheet, Share card shows the bake's own card first (photo, stars, note, next time); "All 4" adds the recipe page, ingredients and method; Download saves 1080×1350 JPEGs.
- [ ] **Card paper**: Paper and Night both read; a recipe without a photo gets its drop cap.
- [ ] **Print**: print a recipe — paper is white, no top bar, tab bar, buttons or bakes; ingredients sit beside the method; "My notes" lines and (for a published recipe) a QR code at the foot.

## 21. UI overhaul — Phase 6: the remaining screens
- [ ] **Editor form**: `/new` is an open paper form with no panels; the bar shows Back, the name with "N ingredients · N steps" as you type, "Tidy up with AI", Save and ⋯.
- [ ] **Delete with Undo**: ⋯ → Delete removes the recipe at once and leaves the editor; Undo in the toast brings it back with its photographs.
- [ ] **More details**: servings, difficulty and times sit behind "More details"; typing 75 into a time shows "1 h 15".
- [ ] **Chapter**: the folder field reads Chapter; a recipe saved into a new chapter appears under it in the cookbook's Contents.
- [ ] **Amounts**: typing "1½", "1 1/2" or "2/3" into an amount saves a number and reads back as a fraction; "a pinch" stays in the name.
- [ ] **Pasted list**: pasting three ingredient lines into one name makes three rows with amount, unit and name split.
- [ ] **Row menu**: each ingredient and step row's ⋯ moves it up or down, links a recipe to it, or removes it; a `--- Crust ---` line shows as a heading.
- [ ] **Start from a link, text or a photograph**: the disclosure imports a URL, tidies pasted text with the AI, and opens Photograph a page.
- [ ] **Two panes**: at 1280px and wider the editor shows "As it will read" beside the form, following each keystroke.
- [ ] **Edit here**: on your own recipe, ⋯ → Edit here makes the title, headnote, ingredients and steps editable in place; Save keeps the changes, Cancel drops them.
- [ ] **To buy by aisle**: add flour, milk and frozen peas; they appear under Flour, grains and bread, Dairy and eggs, and Frozen; "zzz" goes under Everything else.
- [ ] **To buy survives**: leave Shop and come back, and reload; the list is still there.
- [ ] **Add from a recipe**: pick a recipe; only what is missing from the cupboard and not already listed is added; Undo takes them off.
- [ ] **Basket**: ticking moves a thing to the basket; Clear ticked empties it; Undo brings it back.
- [ ] **Share list**: shown only when the list has something on it; shares the list as text (or copies it).
- [ ] **Cupboard**: In the cupboard shows chips; add one by typing or by barcode, remove one and Undo it.
- [ ] **Old addresses**: `/grocery` and `/pantry` still open the matching Shop view.
- [ ] **Discover layout**: one search and Sort; Tags opens a sheet; the chosen tag shows as a chip that removes itself; the first recipe spans the page with its headnote, the rest two to a row.
- [ ] **Bylines**: a shared recipe that has been baked reads "@handle · baked N times"; one never baked shows only the handle.
- [ ] **Settings order**: Appearance, While you bake, Your cookbook, Account, Help, then Operator (for the operator).
- [ ] **Switches**: every on/off is a switch; pressing the words toggles it; a screen reader announces "switch, on/off" with the label alone; each persists across a reload.
- [ ] **Handwritten notes**: switching it on sets margin notes, bake-sheet notes, baking mode's last-time note and community notes in a handwriting face, with no flash of the old face on reload; off returns them.
- [ ] **404**: `/nowhere` reads "That page isn't in this book."; searching "rye" opens the cookbook searching rye; "Back to the cookbook" goes home.
- [ ] **Timer notification copy**: with notifications allowed, a step timer that ends shows "Step N · 12 min is up" and "Tap to go back to step N."
- [ ] **Timer deep-link**: start a step's timer in baking mode, move to another step or another page, and press the notification when it rings; baking mode opens at the timer's step.
- [ ] **Deep-link from the recipe page**: a time in a step on your own recipe's page starts a timer whose notification opens baking mode at that step; a shared recipe's timer notification opens nothing.
- [ ] **Timer origin stays local**: signed in, the timer synced to another device carries no recipe id (check the socket frames); the timer still deep-links on the device that started it.
- [ ] **Shared photograph**: in Chrome, pressing a tile in your cookbook grows its photo into the recipe page's; Back has no morph; a Discover tile fades.
- [ ] **Shared photograph, reduced motion**: with reduced motion on, the same press opens the recipe with no morph.
- [ ] **Shared photograph on Android**: on a mid-range Android phone, the morph runs without visible stutter.
- [ ] **Same-millisecond records**: "Add missing to Shop" on a recipe with several missing things lists them in the recipe's order every time.
- [ ] **Component lab**: `/lab` shows the switch, on and off.

## 22. UI overhaul — Phase 7: documentation and clean-up
- [ ] **DESIGN.md**: describes the printed cookbook as built — tokens for both themes, the faces, the primitives including `Switch`, the motion table — and nothing of the Step Row.
- [ ] **Old token names gone**: searching `src/` for `bg-panel`, `bg-ground`, `text-ground`, `silkscreen` or `signal` classes finds nothing; `index.css` has no mapping for them.
- [ ] **Screens unchanged by the retirement**: the visual suite passes with no baseline regenerated for the token change.

## 23. Moderators
- [ ] **Moderator role**: a moderator's `/api/auth/me` says `moderator: true`; its `/@handle` page shows a Moderator tag.
- [ ] **Who may moderate**: a moderator account opens `/moderation` without the operator PIN; an ordinary account sees the 404 there and stays signed in.
- [ ] **First moderator script**: `make-moderator.js --handle=<handle>` confirms the account and makes it a moderator; `--remove` takes it away; both appear in the log.
- [ ] **Viewing accounts**: Moderation → Accounts lists accounts newest first with email and tags; search finds by handle, email and name; Show narrows to unconfirmed, moderators and suspended.
- [ ] **Account details**: opening an account shows its facts, devices signed in, published recipes with their state, recent comments, reports against it and its history.
- [ ] **Confirming**: Confirm on an unconfirmed row confirms the account; the account can then publish and comment.
- [ ] **Making moderators**: Make moderator on a confirmed account works and offers Undo; an unconfirmed account has no Make moderator; your own account shows no actions.
- [ ] **Removing moderators**: Remove moderator on another moderator works and offers Undo; they lose the Moderation page.
- [ ] **Suspending**: Suspend asks for a reason first; once suspended the account is signed out, its sign-in shows the reason, its recipes, comments and profile page are gone from view; Lift suspension (or Undo) puts them back.
- [ ] **No suspending moderators**: a moderator's sheet has no Suspend.
- [ ] **Sign out everywhere**: ends every session of the account; its devices are signed out on their next request.
- [ ] **Log**: Moderation → Log lists each decision as a sentence with who made it, the time and the reason.
