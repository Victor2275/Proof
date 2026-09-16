---
version: 1
slug: "src-components-dashboard-tsx"
primary_target: "src/components/Dashboard.tsx"
related_targets: ["src/index.css","src/components/BakingMode.tsx","src/components/RecipeViewer.tsx","src/App.tsx"]
---

Scope: the Proof application shell and all twelve routes, hero surface the cookbook dashboard. Visitor mode: Operate (the `/welcome` landing is the single Persuade surface inside it).

Audience and job: one baker mid-bake, phone propped at arm's length, hands floured, hours into a ferment. Secondary and non-leading: recruiters who meet the deployed demo. Real content: 100+ recipes organised by type of bake, genuine bake photography with uneven coverage, real bake logs.

Constraints: dark leads and light must be first-class; accent precious, one per screen; numerals are a signature; motion structural only with full reduced-motion support; haptics grow into a vocabulary; nothing is off-limits in the codebase; copy may be rewritten wholesale; phased delivery, tests green each phase.

Unresolved: none blocking. Flagged — contrast held on body text and Baking Mode regardless of the "looks right over passes checks" preference, because arm's-length legibility is the product working.

## Direction contract

THESIS: A recipe is a pattern and a bake is a pattern running; the interface is the machine that runs it, with a chase light that always says where now is. It refuses the photo-card grid that every cookbook app ships, and refuses its opposite, the dark glassmorphic dashboard with a gold glow, which is the incumbent.

OWN-WORLD: Early-80s rhythm machine. True black ground, `#1A1A1A` matte panels, silkscreen `#BDBDBD` caps, lit step keys in red `#FF3B30` (now), orange `#FF9A00` (due), yellow `#FFE100` (queued), white `#F2F2F2` (complete), unlit `#2A2A2A` drawn as deliberately as lit. Seven-segment readouts with visible ghost segments carry every weight, temperature, percentage and timer. Self-hosted heavy squared grotesque for display, mono for UI and data, a humanist companion for instruction prose only. Absolute ban: no glow except a lit key or segment. Gradient and backdrop blur were banned with it and were re-permitted by the user on 2026-09-15, as materials with one defined use each rather than as decoration: `--faceplate`, the few-percent sheen of a moulded panel lit from above, which is the only gradient in the chrome; and `.scrim`, the blurred layer for a modal or sheet that sits over the interface. Neither touches a photograph.

STORY: The baker sees what is running, what is due, and what they can make, then commits to a bake and is carried through it without touching the screen with clean hands. They believe this was built by someone who actually bakes. They fire a recipe, follow the chase light, and log what happened.

FIRST VIEWPORT: Dashboard. A silkscreen bank rail of bake types down the left at small-caps scale; search sits top-right of the content column, full width on mobile. The content column is a list of patterns, not cards: each row is recipe name at display scale, total time as a segment readout, and its method rendered as a miniature step row. One row, and only one, carries a red lit key when a bake is running; that row's primary action, RUN, is the only solid red control on the screen. No photograph is required for any row to read.

FORM: The Step Row, catalog id `signals-instruments-drum-machine-step-row`, dealt as a challenger and pinned by the user over the roll's assigned grounded candidate 5 (The Shadow Board) after four rounds. Seed key `af32ccfc`, scope direction, mode operate, re-roll round 2, register plain. Code-led: no image generation available this session.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
