# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the baker mid-bake.** Victor, a sourdough and culinary enthusiast, working in a kitchen with flour- or dough-covered hands. Phone or tablet propped at arm's length, or the Capacitor Android build on a phone. The job is running a real bake end to end — measuring, timing multi-hour ferments, checking the next step without touching the screen cleanly — and then recording what actually happened so the next attempt is better.

**Secondary, confirmed and non-leading — recruiters and hiring managers.** The Render deployment is evaluated by people assessing full-stack depth. They are a real audience, but they do not drive design decisions. The confirmed position is that a tool visibly built for someone who genuinely bakes *is* the portfolio argument; a demo built to look like a portfolio is not. Depth should be legible in the working product, never asserted in copy.

**Future — other bakers.** Victor is user zero. The eventual audience is the broader sourdough and baking enthusiast who would sign up (see Capabilities and Constraints).

## Product Purpose

Proof is a digital cookbook and sourdough lab manual. A recipe is a template; the bake log is where the learning lives. Success is: the baker completes a multi-hour bake without needing clean hands, and can later look back across iterations — notes, photos, timings, personal bests — and see why one loaf beat another.

## Positioning

Recipe apps store recipes. Proof runs the bake and records what happened. The combination a neighboring cookbook app could not truthfully claim:

- baker's-percentage math and hydration computed from the ingredient table, with live scaling;
- a reverse scheduler that takes a target eating time and back-calculates every prep, ferment, and bake timestamp;
- timers parsed out of the instruction prose itself ("bulk ferment for 4 hours"), then synced live across devices over WebSockets;
- genuine hands-free operation — voice commands, wave-to-advance via the front camera, and Bluetooth scale auto-advance when the target weight is hit;
- bake logs as the primary artifact, with iteration comparison, before/after sliders, and Personal Best tagging.

## Operating Context

- **Kitchen conditions are the default.** Wet or floury hands, device out of reach, screen read at a distance, ambient noise.
- **Bakes span hours.** Bulk ferment and cold proof cross device sleep, app backgrounding, and sessions. Timers must survive all three (wake lock, native local notifications, speech announcements).
- **Connectivity is unreliable.** The kitchen may be offline; the PWA service worker caches recipes and images for offline reading, and guest writes fall back to IndexedDB.
- **Multiple devices, one bake.** A timer started on the kitchen tablet is expected to appear on the phone elsewhere in the house.
- **Two delivery surfaces.** Browser PWA and a Capacitor Android APK sharing one web design language. The wrapper adds hardware access (haptics, camera, local notifications), not a separate native look.
- **Output leaves the app.** Printable PDFs, 1080x1080 Instagram cards and carousels, grocery lists to clipboard or external list apps, and QR deep links for moving a recipe to a phone.

## Capabilities and Constraints

**Confirmed functionality** (authoritative detail lives in CURRENT_FEATURES.md): recipe CRUD with structured ingredients and folders; fuzzy search; sub-recipe drawers linked from instruction steps; Baking Mode with voice, gesture, and scale control; parsed multi-timer manager with live sync; reverse bake scheduler; bake logs with photos, notes, tags, and Personal Best; smart pantry with barcode scanning; grocery list generation; baking analytics; AI recipe extraction, restructuring, substitutions, photo tagging, and natural-language search; PDF/image/QR export; offline PWA.

**Technical and product constraints:**

- Read operations are public; every write and delete is PIN-gated. Sessions are crypto-random tokens with a 24-hour server-side TTL. No hardcoded secrets.
- AI endpoints are admin-only and rate-limited, deliberately, to prevent paid-quota abuse.
- Two operating modes: guest/local (IndexedDB, zero setup, fully offline) and admin cloud (MongoDB + Gemini + Cloudinary).
- Image storage runs on a free Cloudinary tier; an orphan-cleanup job and nightly JSON DB backup exist because that ceiling is real.
- Every new feature requires a unit test; E2E is Playwright.

**Terminology to preserve:** Proof - The Kitchen Lab (Baking Mode) - Bake Log - Iteration - Personal Best - Levain - Bulk ferment - Cold proof - Baker's % - Hydration - Pantry - Reverse Bake Schedule.

**Open and conflicting facts — do not resolve silently:**

- **Multi-user is the confirmed destination.** Future work should move toward accounts, per-user data, and onboarding for strangers. This directly conflicts with the standing rule in CLAUDE.md ("Do not implement or suggest multi-tenant architecture... federated invitation flows") and with the single-user framing in that file's Scope section. CLAUDE.md has not been updated to match. Until it is, treat multi-user as the direction of travel, not a licence to add tenancy inside an unrelated task.
- **No recipe versioning.** CLAUDE.md's Key Decisions removed Git-style iteration/branch/commit version control. VISION.md still describes "Living Recipes" with version control as a key principle. The removal is the newer decision and stands; VISION.md is stale on this point.
- **Theme count is drifted.** CLAUDE.md states two themes (Light + Dark, OLED consolidated). README.md still documents a third "OLED Black" theme, and an `.oled` token block still exists in `src/index.css`. Unresolved — the code and the docs disagree.

## Brand Commitments

- **Name:** Proof. Longer form in project docs: Victor's Culinary Lab.
- **Committed identity:** "Black & Gold" — a pitch-black and paper-white base with gold as the single accent, standing commitment across CLAUDE.md and VISION.md. Generic primaries (plain red, blue, green) are explicitly ruled out.
- **Committed reference:** the feel of a high-end physical lab manual crossed with a culinary magazine. Precision and restraint over decoration.
- **Dark mode is the default** for the demo and production deployment.
- **Mobile-first is a commitment, not a breakpoint:** layouts must work at 375px with real touch targets.
- Token values, type scale, and component conventions are not product truth; the shipped CSS and components are the current visual authority until a DESIGN.md records them.

## Evidence on Hand

- **Real recipes and real bake photography.** Confirmed: the seeded MongoDB recipes and the Cloudinary-hosted bake log images are Victor's own bakes. Future work may present them as genuine and may design around the assumption that real content exists.
- Real bake logs carry real notes, dates, image tags, and Personal Best marks.
- A live Render deployment exists, dark mode default, pre-seeded from MongoDB.
- **Absences that must never be fabricated:** there are no users besides Victor, no testimonials, no case studies, no press, no pricing or licensing, no customer count, no uptime or scale figures, and no benchmark results. Do not invent any of these, in copy or in placeholder content.

## Product Principles

1. **The bake leads, the recipe follows.** A recipe is a template; the logged bake is the artifact worth keeping. Surfaces that bury past bakes behind the recipe have the hierarchy backwards.
2. **Hands-free or it doesn't count.** Anything required *during* a bake must be operable with dirty hands — voice, gesture, scale, haptics, audio — and readable from across the counter.
3. **Kitchen conditions are the default, not the edge case.** Offline, backgrounded, screen asleep, second device, four hours in. Design for that state first and the clean-desk state follows.
4. **Real content only.** Nothing is shown as a bake, photo, result, or endorsement unless it is one.
5. **Depth must be legible, never announced.** The engineering has an audience; it earns credit by being visible in the working product, not explained in marketing language.

## Accessibility & Inclusion

No formal conformance standard has been established for this project. Product-specific requirements that are confirmed:

- Usable at 375px width with a minimum 44px touch target.
- Instruction text must be legible at arm's length on a propped device during Baking Mode.
- Hands-free paths (voice commands, spoken step and timer announcements, haptic feedback) are accessibility-relevant, not novelty.
- The black-and-gold palette must hold legible contrast for body and muted text; gold-on-black is the highest-risk pairing in the system.
