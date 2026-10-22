# UI overhaul review — shared brief

## The product
**Proof** is a home baker's cookbook and bake log. A *recipe* is the pattern; a *bake* is one attempt
at it, logged with date, notes, rating and photos, so the baker improves across attempts. The bake log
is the product's main character. It is local-first: your cookbook lives on your device with no
account needed. You can optionally publish a recipe to a shared public cookbook ("Discover"), share
a recipe by link (`/r/:slug`), and have a public profile.

Screens: Cookbook (dashboard), Recipe page, Baking mode (step-by-step with timers), Recipe editor,
New recipe, Gallery (bake photos), Analytics, Pantry, Grocery list, General notes, Settings,
Discover, a public Profile, a Landing page for first-time visitors, and onboarding.

## Why we are reviewing
The owner finds the current UI **too crowded** and **not in the style they want for a cookbook**.
They want a **complete new look, reminiscent of a cookbook**: uncluttered, with information that is
easy to **find** and easy to **share**. This is a **major overhaul**, so don't hold back and don't
limit yourself to small tweaks. The current visual language (an 80s drum-machine look with
seven-segment digits, all-caps monospace labels, red "play" keys, true-black panels) is **not**
sacred. Do **not** read or rely on `DESIGN.md`, `REWORK_PLAN.md` or `src/designSystem.test.ts`.
They describe the look being replaced.

Hard constraints that survive the overhaul:
- The bake log/iteration notebook must stay central and not be demoted.
- Mobile-first: 375px wide with no horizontal scroll, 44px touch targets.
- It keeps working offline with no account.
- Light and dark themes must both exist.
- No ads.

## Data you will see
- The "regular" cookbook has 203 real recipes with one photo each. **Most recipes have identical
  placeholder timings (20 min prep / 30 min cook).** That comes from the data, not a UI bug, but how
  the UI presents it is fair game.
- The regular baker's bake history (≈17 bakes across 3–4 recipes) is a realistic fixture.
- The "stranger" has an empty device.

## Screenshots
Folder: `C:\Users\gusev\Documents\Github\Proof\audit-shots\overhaul\before\`

Filenames: `<persona>-<nn>-<screen>__<theme>__<width>__<kind>.png`
- persona: `stranger` (first visit, empty device) or `regular` (returning baker)
- width: `w375` (phone) or `w1280` (desktop)
- kind: `fold` = the first screen a person sees; `page` = scrolled page, capped at 3200px tall
- `...__text.txt` beside each holds the page's visible text, which helps with small print.

Screens captured (dark everywhere; light where noted):
```
stranger-01-landing (dark, light)      regular-01-dashboard (dark, light)
stranger-02-onboarding                 regular-02-recipe (dark, light)
stranger-03-empty-cookbook             regular-03-baking-mode (dark, light)
stranger-04-discover                   regular-04-editor
stranger-05-shared-recipe-link (d, l)  regular-05-new-recipe
stranger-06-profile                    regular-06-gallery
                                       regular-07-analytics
                                       regular-08-pantry
                                       regular-09-grocery
                                       regular-10-notes
                                       regular-11-settings
                                       regular-12-discover
                                       regular-13-not-found
                                       regular-14-mobile-menu (w375 only)
```
Use the Read tool on the PNGs to view them. Look at **both widths**.

## Output format
Write your report as Markdown to the file path given in your task. Use this structure:

```
# <Your role>
## Headline (3–5 sentences: your overall verdict)
## Findings
| # | Screen | Finding | Evidence (screenshot file) | Severity: blocker / major / minor | Suggested change |
## (role-specific sections as your task asks)
```
Be specific. Name the element, quote the on-screen text, and cite the screenshot file. Vague
statements like "improve hierarchy" are worthless; say exactly what should move, go, merge or change.
