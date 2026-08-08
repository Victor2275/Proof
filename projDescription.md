# Culinary Workspace: Project Guideline & Architecture

A structured roadmap and architectural blueprint for building a personalized digital cookbook designed for recipe management, rapid iteration, and culinary experimentation.

---

## 1. Project Overview & Scope

The core objective is to construct a private, highly efficient digital laboratory for food formulation. This tool bridges the gap between structured, dynamic recipe documentation and loose, scratchpad-style experimentation.

* **Target Audience:** Single-user operation (private instance). This intentional scope bypasses the need for multi-tenant isolation, complex Row-Level Security (RLS) policies, or federated invitation flows, prioritizing fast deployments and uncompromising performance.
* **Key Pillars:**
    * **Precision Organization:** Clean schemas separating raw culinary concepts from production-ready recipes.
    * **Granular Tracking:** A system focused on technical iteration, baker's percentages, or specific micro-adjustments.
    * **Fluid Modification:** Zero-friction conversions from random thoughts to formal step-by-step guides.

---

## 2. Feature Roadmap

```
┌────────────────────────────────────────────────────────┐
│                      PHASE 1: MVP                      │
│   ┌──────────────────┐ ┌───────────────────────────┐   │
│   │ Recipe Dashboard │ │  Detailed View (Read)     │   │
│   └──────────────────┘ └───────────────────────────┘   │
│   ┌────────────────────────────────────────────────┐   │
│   │           Creator & Unified Editor             │   │
│   └────────────────────────────────────────────────┘   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               PHASE 2: THE KITCHEN LAB                 │
│   ┌──────────────────┐ ┌───────────────────────────┐   │
│   │ Ideas Scratchpad │ │ Idea-to-Recipe Promotion   │   │
│   └──────────────────┘ └───────────────────────────┘   │
│   ┌────────────────────────────────────────────────┐   │
│   │      Markdown Iteration Logs & Diagnostics     │   │
│   └────────────────────────────────────────────────┘   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            PHASE 3: QUALITY OF LIFE ENGINE             │
│        ┌──────────────────┐ ┌──────────────────┐       │
│        │ Scalability (1x) │ │ Unit Converter   │       │
│        └──────────────────┘ └──────────────────┘       │
└────────────────────────────────────────────────────────┘
```

### Phase 1: The Core (MVP)
* **Unified Recipe Dashboard:** A clean, instantly searchable grid/list system utilizing client-side debounce filtering. Supports multi-tag logic (`[Baking]`, `[Dinner]`, `[Experimental]`).
* **Granular Recipe Viewer:** A pristine read-only node presenting structured components cleanly:
    * Primary metadata: Title, description blocks, preparation intervals, and active cook times.
    * Decoupled ingredient arrays: Rigid columns breaking down quantities, metric/imperial units, and substance names.
    * Sequential action protocols: Explicit, ordered instructions isolated from notes.
* **Bi-Directional Form Editor:** A robust interface equipped with dynamic array field management to handle real-time row addition, subtraction, and sorting for components and steps.

### Phase 2: The "Kitchen Lab" (Iterative Ecosystem)
* **"Potential Ideas" Scratchpad:** A completely isolated collection or board optimized for unstructured ideation (e.g., flavor vectors, texture modifications, visual references) keeping the core database clean.
* **One-Click Promotion Pipeline:** A transform function mapping flat scratchpad objects into valid structural documents, auto-filling the master recipe builder for instant configuration.
* **Lab Notes & Iteration Journal:** A markdown canvas linked to each recipe profile. Facilitates linear logging of experimental adjustments (e.g., *"Reduced hydration by 2%—much easier to shape"*).

### Phase 3: Scaling & Unit Isolation (Stretch Goals)
* **Dynamic Scalability Engine:** An arithmetic parsing layer designed to multiply or divide absolute ingredient numbers by arbitrary targets ($0.5	imes$, $1.5	imes$, $2	imes$) without breaking the base database layout.
* **Dimensional Unit Transpiler:** Toggle layers converting between standard metric elements (`g`, `ml`) and imperial units (`oz`, `cups`).

---

## 3. Recommended Architectural Tech Stack

A modular web application architecture is ideal for processing highly structured arrays and nested JSON schemas.

### Frontend
* **Core View Engine:** React (Vite-backed or Next.js SPA wrapper) ensuring rapid DOM updates during layout manipulation or dynamic calculation adjustments.
* **UI/Style Framework:** Tailwind CSS combined with `shadcn/ui` primitive components to ensure an ultra-clean, minimal typography focus, matching a physical high-end lab manual.

### Backend & Database Stratification

* **Application Runtime:** Node.js with Express or Fastify. Allows custom middleware integration and handles server-side scraper proxies seamlessly.
* **Data Store:** MongoDB (via Mongoose ODM). Provides flexible schema evolution, validation layers, and deep query expressions for highly detailed collections.