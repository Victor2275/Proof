# Proof — Improvement Plan

> **Goal**: Make Proof resume-ready for full-stack roles by Friday.
> **Target Audience**: Recruiters evaluating full-stack depth beyond robotics.
> **Live Demo**: Render deployment (dark mode default, pre-seeded recipes from MongoDB).

---

## UI Sweep Findings

Visual inspection of every page revealed the following issues:

### Dashboard
- **Light mode default** looks washed out — the "premium lab manual" feel is lost. Dark mode should be the default.
- **Recipe card layout**: Cards show raw ingredient lists, making them cluttered. Cards should show image + title + tags + time only.
- **"MY COOKBOOK" heading** is generic — should reflect the "Proof" brand identity.
- **Tag filter dropdown** ("ALL TAGS") is visually disconnected from the search bar.
- **No hero section / landing page** — jumps straight to dashboard with no wow factor.
- **"Inspire Me" button** is understated — should be more prominent.

### Recipe Viewer
- **Square brackets around metadata** — `[50 mins]`, `[4]`, `[Medium]` display literal brackets.
- **Ingredient unit wrapping** — "3 tablespoons" wraps awkwardly, placing "tablespoons" on a new line under "3".
- **Timer badge spacing** — Step 3 shows `for 15- ⏲ 18 minutes , depending on...` with extra spaces and broken hyphen.
- **"Sub" button** on ingredients (AI substitution) only shows on hover — discoverability is poor.
- **No skeleton loading** — shows plain "Loading…" text.

### Recipe Editor
- **Input field contrast** is too subtle — backgrounds blend with card panels.
- **File upload** uses native browser `Choose Files` button — inconsistent with the app's rounded design system.
- **Top action bar** ("Cancel & Back", "Restructure with AI", "Create Recipe") needs stronger visual hierarchy.

### Gallery (Bake History)
- **Empty placeholder cards** show with no images and no empty-state message ("No bakes recorded yet").
- **Three blank grey rectangles** look broken, not intentional.

### Analytics
- **"Loading analytics..." text** is unstyled raw text during load.
- **Monthly bake chart** has empty plot space with no grid lines or zero-baseline.
- **Only shows data for 2 bakes** — with seeded demo data this should look richer.

### Settings
- **Cleanest page** — layout and card structure work well.
- **"Auto-Hide Sidebar" toggle** should be removed per user decision.
- **OLED Black theme** should be consolidated — reduce to Light + Dark.

### General Issues (All Pages)
- **No page transitions / micro-animations** — navigation feels flat and instant.
- **No loading skeletons** — all pages show "Loading…" text.
- **No 404 page** — invalid routes render blank.
- **No onboarding flow** for first-time visitors.
- **Sidebar active state** is subtle yellow text — could be more prominent.

---

## Phase 1: Critical Security & Correctness (Day 1 — Monday)

### 1.1 Replace Hardcoded Admin Token
- **File**: `server/index.js` line 42
- **Issue**: `const ADMIN_TOKEN = 'admin-secret-token-123'` — public repo, anyone can auth.
- **Fix**: Generate crypto-random session tokens using `crypto.randomUUID()`. Store in a server-side Map with TTL.

### 1.2 Remove Debug Logging
- **File**: `server/index.js` lines 900-910
- **Issue**: 7 lines of `console.log('--- DEBUG:...')` print on every startup.
- **Fix**: Delete the debug block entirely.

### 1.3 Remove console.log from RecipeEditor
- **File**: `src/components/RecipeEditor.tsx`
- **Issue**: `INITIALIZING RECIPE STATE`, `CURRENT RECIPE:`, `USE PARAMS ID:` logged in production.
- **Fix**: Delete all development console.log statements.

### 1.4 Fix README Clone URL
- **File**: `README.md` line 89
- **Issue**: Points to `Victor-recipes.git` instead of `Proof.git`.
- **Fix**: Update to `https://github.com/Victor2275/Proof.git`.

### 1.5 Fix deleteRecipe Missing Auth Header
- **File**: `src/lib/api.ts` lines 230-236
- **Issue**: `deleteRecipe` doesn't send `Authorization` header — fails with 401 when PIN is set.
- **Fix**: Use `getHeaders()` like every other mutating method.

### 1.6 Fix Stale Documentation
- **AI_SETUP.md**: Says endpoint is "mocked" — it's not anymore. Update or delete.
- **AGENTS.md line 17**: VISION.md link points to dead OneDrive path. Fix to `.agents/VISION.md`.
- **projDescription.md**: Redundant with README. Delete.

### 1.7 Resolve PWA Manifest Conflict
- **Issue**: `public/manifest.json` says "Digital Cookbook" with wrong MIME types; `vite.config.ts` VitePWA generates "Proof".
- **Fix**: Delete `public/manifest.json`, let VitePWA be the single source. Update VitePWA config with all icon sizes.

### 1.8 Fix Recipe Viewer Square Brackets
- **File**: `src/components/RecipeViewer.tsx`
- **Issue**: Metadata displays `[50 mins]`, `[4]`, `[Medium]` with literal brackets.
- **Fix**: Remove bracket formatting from the JSX template.

### 1.9 Remove Recipe Versioning System
- Per user decision: "I don't use it, remove it."
- **Remove**: `parentRecipeId`, `versionNumber`, `isLatestVersion`, `commitMessage` from Recipe model.
- **Remove**: `POST /api/recipes/:id/version`, `GET /api/recipes/:id/versions` routes.
- **Remove**: `SideBySideCompare.tsx`, version history UI from RecipeViewer, version-related API client methods.
- **Remove**: `isLatestVersion` filter from `GET /api/recipes` query.

---

## Phase 2: Architecture & Code Quality (Day 2 — Tuesday)

### 2.1 Split Server into Modular Routes
Decompose `server/index.js` (934 lines) into:
```
server/
├── index.ts                    # App bootstrap only
├── config.ts                   # Environment validation (throws on missing required vars)
├── middleware/
│   ├── auth.ts                 # requireAdmin, PIN verification
│   └── validation.ts           # Zod request schemas
├── routes/
│   ├── recipes.ts              # CRUD + search
│   ├── bakeLogs.ts             # BakeLog CRUD
│   ├── pantry.ts               # Pantry CRUD
│   ├── notes.ts                # Notes CRUD
│   ├── timers.ts               # Timer REST + Socket.io
│   ├── ai.ts                   # Gemini endpoints (extract, restructure, substitutions, analyze-image)
│   └── maintenance.ts          # Backup, rehost-images, cron
├── services/
│   ├── cloudinary.ts           # Upload, rehost logic
│   └── gemini.ts               # AI client wrapper
└── models/                     # (existing, convert to .ts)
```

### 2.2 Convert Server to TypeScript
- Add `tsconfig.json` to server with strict mode.
- Convert all `.js` files to `.ts` with proper types.
- Add Zod schemas for request validation on all routes.

### 2.3 Decompose Monster React Components
**RecipeViewer.tsx (859 lines)** → extract:
- `RecipeHeader` (image, title, metadata, tags)
- `IngredientList` (checkboxes, scaling, pantry matching, AI sub button)
- `InstructionList` (expandable steps, timer badges, sub-recipe links)
- `RecipeActions` (share, favorite, edit, export buttons)
- `useRecipe` hook (data fetching, scaling, bake log loading)

**RecipeEditor.tsx (916 lines)** → extract:
- `EditorHeader` (cancel, AI restructure, save)
- `BasicInfoForm` (title, description, images, times)
- `IngredientsEditor` (dynamic array management)
- `InstructionsEditor` (dynamic array, sub-recipe linking)
- `URLImporter` (extraction flow)
- `useRecipeEditor` hook (form state, save/create logic)

**BakingMode.tsx (842 lines)** → extract:
- `FocusModeStep` (current step display)
- `AllStepsView` (scrollable list)
- `VoiceCommandsOverlay` (help overlay)
- `FinishBakeModal` (bake log submission)
- `ScaleStatus` (Bluetooth weight display)
- `useBakingMode` hook (step navigation, voice, camera, wake lock)

### 2.4 Add State Management (TanStack Query)
- Install `@tanstack/react-query`
- Replace raw `useState` + `useEffect` fetch patterns with query hooks:
  - `useRecipes()`, `useRecipe(id)`, `useBakeLogs()`, `usePantry()`, `useNotes()`
- Automatic cache invalidation, background refetching, loading/error states.

### 2.5 Standardize API Client
- Refactor all methods to use `handleResponse()` + `getHeaders()` consistently.
- Remove duplicate `getBakeLogs` / `getAllBakeLogs`.
- Fix `deleteRecipe`, `getNotes`, `createNote`, `updateNote`, `deleteNote` to use proper error handling.

### 2.6 Fix Mongoose Deprecation
- Replace `{ new: true }` with `{ returnDocument: 'after' }` in `findByIdAndUpdate` calls.

### 2.7 Fix act() Warnings in Tests
- Wrap async state updates in `act()` in RecipeEditor tests.

### 2.8 Add Rate Limiting
- Install `express-rate-limit`.
- Apply to AI endpoints (10 req/min) and auth endpoint (5 req/min).

### 2.9 Clean Up Orphan Files
- Delete `remove_bg.js`, `server/prevSession.md`, `server/test.cjs`.
- Move `server/sampleData.js` to `server/fixtures/`.

---

## Phase 3: UI/UX Overhaul (Days 3-4 — Wednesday/Thursday)

### 3.1 Landing Page
- Create a new `/welcome` route with a hero section showcasing Proof's features.
- Auto-redirect first-time visitors (localStorage flag).
- Feature highlights: Hands-free baking, AI recipe import, timer sync, bake logging.
- CTA: "Explore the Cookbook →" linking to dashboard.

### 3.2 Dark Mode as Default
- Set dark theme in `index.html` script when no preference is stored.
- Ensure all components look premium in dark mode.

### 3.3 Dashboard Redesign
- **Simplified recipe cards**: Image + title + tags + time badge only (no ingredient list on cards).
- **Prominent "Inspire Me"** button with animation.
- **Visible category/folder chips** in a horizontal scroll bar (not overpowering).
- **Search + filter** unified into a single toolbar.
- **Remove "MY COOKBOOK" heading** — replace with contextual content based on filter state.

### 3.4 Loading Skeletons
- Replace all "Loading…" text with animated pulse skeletons.
- Dashboard: skeleton recipe cards.
- RecipeViewer: skeleton header + ingredient/instruction placeholders.
- Analytics: skeleton stat cards + chart area.

### 3.5 Page Transitions & Micro-Animations
- Add `framer-motion` `AnimatePresence` for route transitions.
- Card hover effects on dashboard (subtle lift + shadow).
- Button press animations.
- Toggle switch animations on Settings.
- Staggered list animations for ingredients/instructions.

### 3.6 404 Page
- Create a styled 404 page with "Recipe not found" messaging and a link back to dashboard.

### 3.7 Onboarding Flow
- First-visit modal or overlay introducing key features.
- Quick 3-step walkthrough: Browse → Cook → Log.
- Dismissible, stores completion in localStorage.

### 3.8 Gallery Empty State
- Replace blank grey cards with an illustrated empty state: "No bakes logged yet. Start cooking!"

### 3.9 Fix Ingredient Unit Wrapping
- Fix the quantity/unit/name grid layout so units don't wrap to a new line.

### 3.10 Fix Timer Badge Spacing
- Clean up the regex/rendering that produces `15- ⏲ 18 minutes ,` with broken spacing.

### 3.11 Consolidate Themes to Two
- Remove OLED Black option from Settings.
- Keep Light + Dark only.

### 3.12 Remove Auto-Hide Sidebar
- Remove the toggle from Settings.
- Remove the hover-reveal logic from `App.tsx`.
- Sidebar is always visible on desktop.

### 3.13 Mobile Layout Pass
- Audit all pages at 375px width.
- Ensure proper touch targets (min 44px).
- Fix any overflow/wrapping issues.
- Bottom nav spacing and alignment.

---

## Phase 4: Testing & CI (Day 4 — Thursday)

### 4.1 Add Missing Component Tests
- `RecipeViewer.test.tsx` — rendering, scaling, pantry matching, bake log display.
- `Settings.test.tsx` — theme switching, toggle persistence.
- `Analytics.test.tsx` — stat card rendering, chart data.
- `GeneralNotes.test.tsx` — CRUD operations.
- `TimerManager.test.tsx` — timer add/remove/sync.

### 4.2 Add E2E Tests (Playwright)
- Full user journey: Dashboard → View Recipe → Start Baking → Log Bake.
- Recipe creation flow: New Recipe → Fill form → Save → Verify on dashboard.
- Settings: Theme toggle verification.

### 4.3 GitHub Actions CI Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: cd server && npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test:all
```

### 4.4 Test Coverage Reporting
- Configure Vitest coverage with `@vitest/coverage-v8`.
- Add coverage badge to README.

### 4.5 Set Proper Semver Version
- Update `package.json` version to `1.0.0`.

---

## Phase 5: Demo Readiness & README (Day 5 — Friday)

### 5.1 Portfolio README
- Architecture diagram (Mermaid).
- Feature showcase with screenshots.
- Tech stack badges.
- "Quick Start" that actually works.
- Test count badge + coverage badge.
- Link to live Render demo.

### 5.2 Pre-seeded Demo Data
- Ensure the Render deployment connects to MongoDB with existing recipe data.
- Verify all recipe images load from Cloudinary.

### 5.3 Add LICENSE
- MIT License.

### 5.4 Final Manual Testing Pass
- Test every page on desktop + mobile.
- Test dark mode default.
- Test recipe CRUD flow.
- Test baking mode flow.
- Verify Render deployment works end-to-end.

---

## Deferred (Post-Friday)

These items are important but won't block the resume deadline:

- [ ] Proper login system (public page + authenticated users caching own recipes)
- [ ] HTTPS enforcement and production CORS
- [ ] Cloud backup to S3
- [ ] Auto-link to Instagram posting
- [ ] Android APK improvements
- [ ] Full offline CRUD expansion (IndexedDB)
- [ ] Accessibility audit (aria-labels, skip-to-content)
- [ ] CONTRIBUTING.md
