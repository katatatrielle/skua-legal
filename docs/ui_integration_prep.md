# UI Integration Prep

Prepared on March 26, 2026 after pulling `research-assistant` `main` to commit `92401eb`.

## Goal

Move the current `research-assistant` UI into `agentdraft` and adapt it to the `agentdraft` app and server layers without overwriting in-flight backend changes.

## Current state

`research-assistant` is a Vite + React + React Router app with:

- research inbox UI already wired at `/matters/:matterId/research`
- newly added authority review UI wired at `/matters/:matterId/authorities`
- shared UI primitives under `src/components/ui`
- styling and theme tokens in `src/index.css`
- routing and app shell in `src/App.tsx`

`agentdraft` already contains:

- ported research and authority service modules under `services/`
- domain and server logic under `packages/` and `server/`
- API routes under `app/api/`
- partial research UI under `components/research/`
- placeholder authority UI under `components/authority/`
- placeholder page at `app/matters/[matterId]/authorities/page.tsx`

`agentdraft` also currently has unrelated local edits:

- `server/authority/authority.service.ts`
- `server/authority/intake.service.ts`
- `server/defects/defect.service.ts`
- `server/research/research.service.ts`
- `server/shared/guards.ts`
- untracked `app/api/`

Those files should be treated as user-owned/in-progress and not reverted during the UI move.

## Main integration gaps

1. Framework shell mismatch

`research-assistant` uses React Router. `agentdraft` is being shaped like a Next App Router app. Route-level UI must be mounted from `app/matters/[matterId]/.../page.tsx` instead of copying `src/App.tsx`.

2. Styling/runtime mismatch

The source UI depends on Tailwind styling, shadcn-style primitives, and app-level CSS tokens. `agentdraft` does not yet have visible Tailwind/config/layout files checked in.

3. UI primitive gap

The source authority flow depends on reusable UI components that do not yet exist in `agentdraft`, especially the cards, buttons, badges, skeletons, and resizable layout pieces.

4. Authority UI incompleteness in `agentdraft`

The current files below are still placeholders and need real implementations or replacement:

- `components/authority/authority-review-panel.tsx`
- `components/authority/authority-review-queue.tsx`
- `components/authority/authority-status-badge.tsx`
- `components/authority/intake-checks-card.tsx`
- `components/authority/verification-actions.tsx`

## Source files to port first

These are the highest-value source files from `research-assistant` to adapt into `agentdraft`:

- `src/components/authority/authority-review-page.tsx`
- `src/components/authority/authority-review-panel.tsx`
- `src/components/authority/authority-review-queue.tsx`
- `src/components/authority/authority-status-badge.tsx`
- `src/components/authority/authority-metadata-card.tsx`
- `src/components/authority/linked-research-items-card.tsx`
- `src/components/authority/intake-checks-card.tsx`
- `src/components/authority/source-excerpt-card.tsx`
- `src/components/authority/provenance-review-card.tsx`
- `src/components/authority/authority-decision-bar.tsx`
- `src/components/authority/authority-defects-card.tsx`
- `src/lib/authority-types.ts`
- `src/services/authority.service.ts`

## Suggested target mapping in `agentdraft`

Use the existing `agentdraft` structure instead of mirroring `src/` exactly:

- `src/components/authority/*.tsx` -> `components/authority/*.tsx`
- `src/lib/authority-types.ts` -> either:
  - merge into `components/authority/types.ts`, or
  - create `lib/authority-types.ts` and update imports
- `src/services/authority.service.ts` -> adapt into existing `services/authority.service.ts`
- `src/pages/Authorities.tsx` -> replace `app/matters/[matterId]/authorities/page.tsx`

## Adaptation notes

### Routing

Do not port:

- `src/App.tsx`
- `react-router-dom` route declarations
- `Link` components that assume client-side router paths from the Vite app

Replace them with:

- Next page entry points in `app/matters/[matterId]/.../page.tsx`
- either `next/link` or button handlers appropriate to the final app shell

### Imports

The source app uses alias-based imports like `@/components/...`.

`agentdraft` currently does not declare path aliases in `tsconfig.json`, so there are two safe options:

1. keep relative imports during the move
2. add a `baseUrl`/`paths` alias setup before porting more UI

### Data layer

`agentdraft/services/authority.service.ts` already matches much of the source authority API shape and should stay the canonical client service.

The safest approach is:

1. preserve the fetch endpoints already used by `agentdraft`
2. port source UI components to the `AuthorityQueueItem` and `AuthorityReviewRecord` types already defined in `components/authority/types.ts`
3. only add missing service helpers if a source UI component truly needs them

### Styling and primitives

Before a full visual port, confirm or add:

- app-level CSS entrypoint such as `app/globals.css`
- Tailwind config
- PostCSS config
- shared UI primitives equivalent to the source `src/components/ui/*`

If the goal is speed, start by porting the authority flow with lightweight local primitives instead of copying the entire shadcn layer on day one.

## Recommended move order

1. Add or confirm `agentdraft` app shell and styling foundation.
2. Replace `app/matters/[matterId]/authorities/page.tsx` with a real page component.
3. Port the authority review queue and review panel.
4. Port the supporting authority cards and decision controls.
5. Reconcile any missing type fields between source DTOs and `agentdraft` service responses.
6. Verify the research page still links cleanly into the new authority page.

## Proposed first implementation slice

If we want the smallest useful next step, implement this first:

- real `app/matters/[matterId]/authorities/page.tsx`
- real `components/authority/authority-review-queue.tsx`
- real `components/authority/authority-review-panel.tsx`
- real `components/authority/authority-status-badge.tsx`
- keep visuals simple at first
- reuse `services/authority.service.ts` and `components/authority/types.ts`

That would turn the current placeholder authority screen into a working integrated review flow before we spend time polishing the full design system port.
