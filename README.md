# Skua Legal

Skua Legal is being repositioned as a Word-native contract review copilot for solo lawyers and very small firms.

The intended v1 product is narrow on purpose:

- open a contract in Word
- run a playbook-based review
- ask cited questions about a clause or agreement
- apply comments or tracked-change suggestions
- save preferred fallback language
- reuse that language later

The web app is a support surface for auth, billing, settings, playbooks, clause memory, matter history, and spend controls. Optional BYOK remains part of the product direction.

This repo still contains earlier due-diligence and workflow-heavy prototype slices. Those pieces are transitional infrastructure and legacy product experiments, not the governing product thesis going forward.

## Product Boundary

### In scope for the solo-first path

- Word-first contract review and revision
- playbook-based findings with citations
- cited Ask and clause-level Revise actions
- saved fallback language and clause-bank retrieval
- lightweight matter and run history
- transparent hosted pricing plus BYOK support

### Out of scope for v1

- a full diligence workspace
- a multi-reviewer deal room
- a broad legal research engine
- a benchmark or compare-to-market platform
- a heavy enterprise admin suite

## Current State vs Target State

### Target product direction

- `apps/word-addin` is the primary product surface.
- `apps/review` is evolving into a thin web console for settings, history, playbooks, clause memory, and billing-style controls.
- `services/dd-api` is a transitional path name for the backend API that will continue to power ingest, review, ask, revise, retrieval, usage, and audit flows.
- `services/worker` remains the async execution layer for parsing, indexing, review runs, ask runs, revise runs, and maintenance jobs.

### Reusable foundations already in the repo

- a Word add-in shell with Review, Ask, Draft, Playbooks, and Standards tabs
- persisted review runs, review suggestions, and suggestion actions
- parsing and upload plumbing for DOCX and PDF files
- source anchoring, citations, and async job handling
- file-backed playbooks and early retrieval/library plumbing

### Legacy or transitional prototype slices

- multi-document diligence queries and workflow runs
- DD report, memo, and exceptions-list generation
- legacy review-grid positioning in `apps/review`
- `dd-api` naming and DD-heavy route groupings

Those legacy slices stay in the repo for now because they still provide useful scaffolding and compatibility, but they should be read as transitional rather than target-product architecture.

## Core Docs

- [Engineering spec](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-engineering-spec.md)
- [Endpoint contracts](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-endpoint-contracts.md)
- [Word add-in wireframes](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-word-addin-wireframes.md)

The filenames remain unchanged for compatibility, but those docs now describe the solo-first contract review direction.

## Current Repo Slice

The repo currently contains:

- a FastAPI backend at `services/dd-api` with persisted uploads, parsing, review, ask, draft, standards, audit, and legacy workflow routes
- a Next.js Word add-in at `apps/word-addin` that is the closest thing to the target product surface
- a Next.js web app at `apps/review` that currently mixes thin-console behavior with older review-grid and workflow panels
- file-backed playbooks, standards, prompts, and legacy workflow templates under `packages/`

## Quick Start

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Start the transitional backend API

The service path is still `services/dd-api` for now.

```bash
cd services/dd-api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### 3. Start the web console

The workspace path is still `apps/review` for now.

```bash
cd /path/to/skua
DD_API_BASE_URL=http://127.0.0.1:8000 npm run dev:review
```

The console will be available at `http://127.0.0.1:3000`.

### 4. Start the Word add-in

```bash
cd /path/to/skua
npm run dev:word-addin
```

The add-in will be available at:

- `http://127.0.0.1:3001` for browser preview
- `https://localhost:3001` for Word sideloading via the local manifest

Local manifest path:

- `apps/word-addin/public/manifest.word.xml`

### 5. Run the local worker

```bash
cd /path/to/skua
services/dd-api/.venv/bin/python services/worker/runner.py
```

Useful local modes:

- `--once` to process a single queued job and exit
- `--max-jobs 5` to drain a bounded slice of the queue and stop

## Transitional API Surface

The current API still includes legacy DD-oriented endpoints alongside the newer Word-review routes.

Core solo-first routes already present:

- `GET /healthz`
- `GET /api/v1/playbooks`
- `GET /api/v1/standards/templates`
- `GET /api/v1/playbooks/saved-notes`
- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `POST /api/v1/documents/upload`
- `GET /api/v1/documents/{document_id}`
- `POST /api/v1/documents/{document_id}/ingest`
- `POST /api/v1/review/runs`
- `GET /api/v1/review/runs/{review_run_id}`
- `POST /api/v1/review/runs/{review_run_id}/export-summary`
- `POST /api/v1/review/suggestions/{suggestion_id}/apply`
- `POST /api/v1/review/suggestions/{suggestion_id}/dismiss`
- `POST /api/v1/review/suggestions/{suggestion_id}/mark-reviewed`
- `POST /api/v1/review/suggestions/{suggestion_id}/save-to-playbook`
- `POST /api/v1/ask`
- `GET /api/v1/ask/{ask_run_id}`
- `POST /api/v1/draft`
- `GET /api/v1/draft/{draft_run_id}`
- `POST /api/v1/library/search`
- `GET /api/v1/audit`

Legacy or transitional routes still present:

- workflow templates and workflow runs
- DD report reads, updates, and exports
- multi-document query runs and exports
- first-pass workspace outputs

## Monorepo Layout

```text
apps/
  chat/        Optional shell for account/admin-style flows
  review/      Transitional web console path; evolving away from DD-heavy review workspace behavior
  word-addin/  Primary Word-first task pane for review, ask, revise, and clause memory loops
services/
  dd-api/      Transitional backend path name for the contract-review API
  worker/      Async jobs for ingest, parsing, review, ask, revise, and exports
  gateway/     Provider routing, hosted/BYOK policy, and future spend controls
packages/
  playbooks/   Editable contract review playbooks
  prompts/     Prompt assets and prompt fragments
  schemas/     Shared TypeScript and API contracts
  sdk/         Internal client helpers
  standards/   House-standard comparison packs
  workflows/   Legacy workflow templates retained during the transition
infra/
  Local infrastructure notes and environment assets
```

## Product Principles

- Word is the primary working surface.
- Findings and answers must be document-grounded and cited.
- Playbooks and fallback language are product memory, not hardcoded logic.
- Users stay in control of apply actions.
- Cost visibility and BYOK support are part of the product, not an enterprise afterthought.

## Seed Data

The seeded local database still exposes the demo matter `project-redwood`.

That demo data remains useful for exercising uploads, review grids, legacy workflow panels, and export plumbing, but it should be treated as prototype scaffolding rather than the target solo-first experience.

Uploaded local data is stored in:

- `data/skua.db`
- `uploads/<workspace-id>/...`

## Roadmap

### Alpha

- tighten the Word review loop
- improve anchors and citation validation
- keep one or two strong review playbooks working end to end
- keep the web console thin and supportive

### Private pilot

- add better tracked-change application
- add clause-bank save and retrieval loops
- add spend estimates and BYOK provider settings
- improve matter and run history

### Paid beta

- add preference ranking over accepted and saved language
- support re-review of changed sections
- improve cost dashboards and trust controls
- stabilize onboarding and small-firm workspace behavior
