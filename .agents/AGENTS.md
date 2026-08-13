# Digital Cookbook Architecture Rules

- **Framework**: React + Vite (Single Page App). Do not suggest Next.js or SSR frameworks.
- **Backend**: Node.js + Express + MongoDB.
- **Styling**: Tailwind CSS + shadcn/ui. Maintain a clean, minimal typography focus, resembling a physical high-end lab manual.
- **Scope**: Single-user operation (private instance). Do not implement or suggest multi-tenant architecture, complex Row-Level Security (RLS) policies, or federated invitation flows.
- **Focus**: Performance, fast deployments, and clean iteration logic.
- **Testing**: Whenever a new feature is added, an automated unit test MUST be created for it. Tests should be executed to ensure the project always works after changes.

# Feature Tracking Rule
Whenever any changes are made to the codebase, you MUST:
1. Update CURRENT_FEATURES.md to accurately reflect the changes.
2. Update TESTED_FEATURES.md to ensure it remains a 1-to-1 mirror of CURRENT_FEATURES.md, using empty checkboxes [ ] for the new features so the user can track what they have tested.
3. Ensure that a unit test is written for every new feature added.

# Project Vision & Scope
For a complete understanding of the project's long-term scope, design aesthetics (Black & Gold), and architecture, refer to the [VISION.md](file:///C:/Users/gusev/OneDrive/Documents/GitHub/Victor-recipes/.agents/VISION.md) file.
