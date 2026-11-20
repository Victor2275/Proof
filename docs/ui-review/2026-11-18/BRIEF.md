# UI review: shared brief

*Run 2026-11-18 · 2026-11-18 · branch `feat/drafts-owner-sync` @ `08728e0`*

## The product
**Proof** is a home baker's cookbook and bake log. A *recipe* is the pattern. A *bake* is one attempt at it, logged
with a date, notes, a rating and photos, so the baker improves from one attempt to the next. The bake log is the
product's main character.

It is local-first: your cookbook lives on your device and needs no account. You can optionally publish a recipe to a
shared public cookbook (Discover), share a recipe by link (`/r/<slug>`), and have a public profile.

## Why this review is happening
This is the first full review since the redesign shipped. Since then the app has gained recipe drafts, a way to
leave a bake part-way, a trimmed account menu, an owner account and two-way sync for paying accounts. The owner wants
to know, screen by screen, where a stranger gets lost, where a regular baker is slowed down, and what already works
and must be protected. The result is a ranked plan to decide on. No changes are made during the review.

## The two devices
- **Stranger**: an empty device. Nothing saved, never visited.
- **Regular**: the live library (203 recipes, real photographs, real titles) plus a believable history of 17 bakes
  (14 written for the review, 3 real) across 6 recipes. Most of the history sits on 3 recipes, with "The BEST
  Cheesecake Recipe" on its fifth bake. The live library holds only 3 real bakes, too few to judge the iteration
  screens by. The regular baker is a **free user who is not signed in**: everything they own lives on the device.
  That's why "My published recipes" asks them to sign in.

## What in the data is not the app's fault
- **199 of 203 recipes carry identical placeholder timings (20 min prep / 30 min cook).** The data is a placeholder,
  but how the UI presents it is fair game.
- **Bake photographs are stand-ins** borrowed from other recipes in the same folder, and only every other bake has
  one. Judge how photos and missing photos are laid out, not whether the photo matches the bake.
- **The bake notes are about bread** ("Bulk ran warm…", "Cut hydration to 72%") even when the recipe is a
  cheesecake or a stir-fry. They're written for the review; judge how notes are shown, not what they say.
- **The server is a stand-in.** Discover, shared links, profiles, sign-up, sign-in and URL import all work. These
  answer with a deliberate refusal: `POST /published` (publishing), `POST /published/:id/comments` (commenting),
  `POST /reports` (reporting), `POST /ai-substitutions`. Judge how the UI presents the action and its error, not
  the fact that it errored.
- **Console noise to ignore:** none was recorded in this capture.

## Screenshots
Folder: `C:\Users\gusev\Documents\Github\Proof\audit-shots\review\2026-11-18\`

Filename: `<owner>__<screen>__<theme>__<width>__<kind>`
- **owner**: the reviewer who owns the screen (`first-timer`, `link-follower`, `mid-bake`, `librarian`).
- **width**: `w375` (phone) or `w1280` (desktop).
- **kind**:
  - `fold.png`: the first screen a person sees;
  - `page.png`: the whole page, capped at 3200 px;
  - `text.txt`: the visible text;
  - `facts.json`: unmocked endpoints, console errors, broken images, sideways overflow.

How to read the shots:
- **The fold shot is the truth about chrome.** In page shots, anything pinned to the window (a top bar, a tab bar,
  a docked button) stops short or lands mid-page, because the page was let out to its full height. Wide horizontal
  rows can run past the right edge in a page shot. Check the fold shot before you file either.
- **Light is the default theme.** Dark is shot only where a screen is used at night or in a kitchen.
- Shots marked `[steps]` were taken after an action: the first open follows "Open my cookbook" from the landing
  page; sign-up is the "Create an account" sheet opened from the account menu on Discover; the account menu is open.

Screens captured (56 shots, every `facts.json` clean: no unmocked endpoints, console errors, broken images or
sideways overflow):
```
owner         — screen                     — path                                   — themes
first-timer   — stranger-landing           — /welcome                               — light+dark
first-timer   — stranger-first-open        — /                                      — light [steps]
first-timer   — stranger-empty-cookbook    — /                                      — light
first-timer   — stranger-new-recipe        — /new                                   — light
link-follower — stranger-shared-link       — /r/the-best-cheesecake-recipe          — light+dark
link-follower — stranger-discover          — /discover                              — light
link-follower — stranger-profile           — /@proof                                — light
link-follower — stranger-sign-up           — /discover                              — light [steps]
mid-bake      — regular-recipe             — /recipe/6a76c3e9977cedde950a165f       — light+dark
mid-bake      — regular-baking-mode        — /recipe/6a76c3e9977cedde950a165f/bake  — light+dark
mid-bake      — regular-bakes-journal      — /bakes                                 — light+dark
mid-bake      — regular-bakes-by-recipe    — /bakes?view=recipe                     — light
librarian     — regular-cookbook           — /                                      — light+dark
librarian     — regular-editor             — /edit/6a76c3e9977cedde950a165f         — light
librarian     — regular-shop               — /shop                                  — light
librarian     — regular-cupboard           — /shop?view=cupboard                    — light
link-follower — regular-published          — /published                             — light
librarian     — regular-notes              — /notes                                 — light
librarian     — regular-settings           — /settings                              — light
link-follower — regular-discover           — /discover                              — light
librarian     — regular-not-found          — /no-such-page                          — light
librarian     — regular-account-menu       — /                                      — light [steps]
```

## Capture check
- The screen list was out of date. `/gallery`, `/analytics`, `/grocery` and `/pantry` now redirect, so they were
  replaced with Bakes (Journal, By recipe), Shop (To buy, In the cupboard) and My published recipes. The phone "More"
  menu no longer exists and was replaced by the account menu. Sign-up was added.
- The first-open step looked for a landing button that has since been renamed ("Open my cookbook"). Fixed.
- In the first capture, six fold shots caught the page's loading placeholder before the screen arrived (the shared
  link at desktop width, baking mode, the new recipe and Shop on the phone). The capture now waits for the page
  itself, and everything was recaptured. If a fold still shows plain sand-coloured blocks, that's the loading state,
  not the screen.

## Live walking (First-Timer and Link Follower)
The app runs at `http://localhost:5173` against the stand-in server. Your browser has been reset to an empty device
at 375×812. Your start URL is in your task.

## Formats
`C:\Users\gusev\Documents\Github\Proof\.claude\skills\ui-review\references\formats.md`
