# Digital Cookbook Architecture Rules

- **Framework**: React + Vite (Single Page App). Do not suggest Next.js or SSR frameworks.
- **Backend**: Node.js + Express + MongoDB.
- **Styling**: Tailwind CSS + shadcn/ui. Maintain a clean, minimal typography focus, resembling a physical high-end lab manual.
- **Scope**: Single-user operation (private instance). Do not implement or suggest multi-tenant architecture, complex Row-Level Security (RLS) policies, or federated invitation flows.
- **Focus**: Performance, fast deployments, and clean iteration logic.
- **Testing**: Whenever a new feature is added, an automated unit test MUST be created for it. Tests should be executed to ensure the project always works after changes.
