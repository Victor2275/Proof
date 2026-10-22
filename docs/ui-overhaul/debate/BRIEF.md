# Debate brief: from "website" to "polished app"

## The owner's request
> "I want the app to feel more like an app and less like a website, so there are too many links in the
> website page. These should be replaced with something else."

You are one of four debaters. Each of you argues a different philosophy for how Proof should replace its
web-style links with app-style interaction so the product feels like a **polished native app**. You
are competing: argue for your approach, concretely and persuasively, and anticipate the others' attacks.

## The product (short)
Proof is a home baker's cookbook and bake log. A recipe is the template; a *bake* is one logged attempt
(date, stars, notes, photos). The bake log is the main character. It is local-first (IndexedDB, works
offline, no account needed) and ships as a PWA plus a Capacitor Android APK. Typical use: a phone propped
on a kitchen counter, sometimes with floury hands.

## The decided redesign (don't relitigate)
A "printed cookbook" look: warm paper `#FBF7F0`, ink `#1F1A17`, paprika accent `#B5391F`; Fraunces
titles, Source Serif 4 prose, Inter Tight UI. **Light is the default**; a warm dark `#16120F` exists.
Four destinations: **Cookbook, Bakes, Shop, Discover**, as a bottom tab bar on phone and a **slim top bar
on desktop**. Settings and account live behind an avatar. No floating action button.

The mock-up of that redesign is five artboards. Read their HTML source; the layout and copy are all there:
`C:\Users\gusev\AppData\Local\Temp\claude\c--Users-gusev-Documents-Github-Proof\fc26e006-a3fe-4d37-9009-fa4313f3aabf\scratchpad\canvas\project\`
- `Main.dc.html`: recipe page, phone
- `Cookbook.dc.html`: cookbook home, phone
- `Bakes.dc.html`: bake log journal, phone
- `Baking.dc.html`: baking mode, phone (dark)
- `Desktop.dc.html`: recipe two-page spread, desktop

Background, if useful: `C:\Users\gusev\Documents\Github\Proof\docs\ui-overhaul\AUDIT_REPORT.md` (the audit
that produced the redesign) and `C:\Users\gusev\Documents\Github\Proof\CURRENT_FEATURES.md` (every feature).

## The "web-isms" to replace: the inventory
The links, and the accent-coloured text buttons that read as links, in the mock-up:

| # | Screen | Element today | Goes to / does |
|---|---|---|---|
| L1 | Recipe (phone) | "‹ Dessert" text back-link in the header | Back to the chapter / cookbook |
| L2 | Recipe (both) | "Adapted from **sugarspunrun.com**" inline link | The original source page (external) |
| L3 | Recipe (phone) | "All 5 bakes →" text link in the Last-time card | This recipe's bake history |
| L4 | Recipe (both) | "Private — only on this phone. **Publish to get a link**" footer link | Publish flow |
| L5 | Recipe (both) | "+ Add 9 missing to the shopping list" accent text button | Adds to Shop list |
| L6 | Cookbook | "All bakes →" link beside "Recently baked" | Bakes tab |
| L7 | Cookbook | "Index A–Z →" link beside "Contents" | A–Z index |
| L8 | Cookbook | Contents rows (chapter name ….. count) as links | Open a chapter |
| L9 | Cookbook | "5 more chapters, and loose notes →" link | The rest of the contents |
| L10 | Cookbook / Bakes | "+ New recipe", "+ Log a bake" accent text buttons in the header | Create flows |
| L11 | Desktop | Top-bar nav as underlined text links (Cookbook / Bakes / Shop / Discover), "Proof" wordmark as a home link | Destinations |
| L12 | Desktop | Breadcrumb "Cookbook / Dessert" | Up the hierarchy |
| L13 | Desktop | "Compare two" link; action row of plain text buttons (Favourite, Share, Print, Edit, ⋯) | Compare bakes; recipe actions |

Global: `a { color: paprika }` with underlines; a "Last time" card and recipe tiles that are only
partly tappable; no pressed states, transitions, haptics or gestures are specified anywhere.

## Hard constraints every proposal must respect
- **Routing still works.** Every screen keeps a real URL. `/r/:slug` share links, browser back, Android
  hardware back and refresh must all behave. "App feel" can't break deep links.
- **Accessibility.** 44px touch targets; visible focus; correct semantics (a control that navigates is a
  link to a screen reader even if it doesn't *look* like one; an action is a button); everything keyboard
  operable. Every overlay is the existing `Sheet` primitive (focus trap, Escape, focus return, scroll lock).
- **`prefers-reduced-motion`** is respected. A JS-driven animation must check it itself.
- **The stack:** React 19 + Vite SPA, React Router 7, Tailwind CSS v4, framer-motion (already a
  dependency), Capacitor (`@capacitor/haptics` already installed). Phone at 375px with no horizontal
  scroll; desktop at 1280px.
- **Offline-first.** Nothing may depend on the network to navigate.
- **Kitchen use.** It must work one-handed with messy hands, and nothing hides behind a gesture with no
  visible alternative.

## What your proposal must contain
Write Markdown to the file path your task gives. Keep it to about 1500–2500 words. Sections:
1. **Thesis.** One paragraph: what makes an app feel polished, and your philosophy.
2. **Replacement table.** For **every** item L1–L13 plus the global items: the replacement component,
   exactly how it looks and behaves (states: rest, pressed, focus, disabled), and its semantics.
3. **The interaction system.** Your shared vocabulary: pressed feedback, transitions between screens
   (push or pop, tab switch, sheet), timings and easing, haptics (when and which), gestures (with their
   visible alternatives), loading and empty states.
4. **Phone vs desktop.** How the same ideas translate to a 1280px pointer and keyboard user with the top bar.
5. **Two wireframes** (ASCII): the phone recipe page header-to-ingredients, and the cookbook home, in your system.
6. **Build cost and risk.** Which new primitives in `src/components/ui`, rough effort, and what could go wrong.
7. **Why the others are wrong.** Pre-empt the three rival philosophies (named in your task): their likely
   failure modes for *this* product and *this* user.

Be specific: name components, pixel sizes, durations, easing curves and haptic types. Vague advice loses the debate.
