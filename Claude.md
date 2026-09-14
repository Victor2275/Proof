# Digital Cookbook Architecture Rules

- **Framework**: React + Vite (Single Page App). Do not suggest Next.js or SSR frameworks.
- **Backend**: Node.js + Express + MongoDB. Server is modular: `routes/`, `middleware/`, `services/`, `models/`.
- **Styling**: Tailwind CSS + shadcn/ui. Maintain a clean, minimal typography focus, resembling a physical high-end lab manual.
- **State Management**: TanStack Query for server state. Local React state for UI-only state.
- **Scope**: Single-user operation (private instance). Do not implement or suggest multi-tenant architecture, complex Row-Level Security (RLS) policies, or federated invitation flows.
- **Focus**: Performance, fast deployments, and clean iteration logic.
- **Testing**: Whenever a new feature is added, an automated unit test MUST be created for it. Tests should be executed to ensure the project always works after changes. E2E tests use Playwright.
- **Security**: Admin authentication uses crypto-random session tokens. Never hardcode tokens or secrets. The admin PIN gates write operations; read operations are public.

# Feature Tracking Rule
Whenever any changes are made to the codebase, you MUST:
1. Update CURRENT_FEATURES.md to accurately reflect the changes.
2. Update TESTED_FEATURES.md to ensure it remains a 1-to-1 mirror of CURRENT_FEATURES.md, using empty checkboxes [ ] for the new features so the user can track what they have tested.
3. Ensure that a unit test is written for every new feature added.

# Improvement Plan
For the active improvement roadmap, priorities, and phased plan, refer to [ImprovementPlan.md](ImprovementPlan.md).

# Project Vision & Scope
For a complete understanding of the project's long-term scope, design aesthetics (Black & Gold), and architecture, refer to the [VISION.md](.agents/VISION.md) file.

# UI/UX Principles
- **Dark mode is the default** for the demo and production deployment.
- **Black & Gold aesthetic**: Pitch black backgrounds, elegant gold accents, glassmorphic components.
- **Mobile-first**: All layouts must work at 375px width with proper touch targets (min 44px).
- **Micro-animations**: Use framer-motion for page transitions, hover effects, and loading states.
- **Loading skeletons** instead of "Loading…" text on all pages.
- **No orphan/debug code**: Remove all console.log statements, debug blocks, and orphan files before committing.

# Key Decisions
- **No recipe versioning**: Git-style version control has been removed. Recipes are simple CRUD.
- **Two themes only**: Light + Dark. OLED Black has been consolidated.
- **No sidebar auto-hide**: Sidebar is always visible on desktop.
- **Landing page**: First-time visitors see an onboarding/hero page before the dashboard.
