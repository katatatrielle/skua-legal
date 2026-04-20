# Skua Legal

Skua Legal is an open-source due diligence workspace for share and asset purchase transactions.

The first product target is simple and useful:

- deal room in
- DD grid out
- memo draft out

Skua is being shaped around a practical legal workflow for Canadian and Ontario-focused teams:

- upload PDF and DOCX agreements
- classify and deduplicate documents
- run editable diligence playbooks
- extract structured contract terms with source citations
- review issues in a grid
- answer deal questions with cited source text
- export a first-pass DD memo, exceptions list, and spreadsheet

## Current Kickoff Slice

This repo now includes a runnable first slice:

- a FastAPI `dd-api` service with seeded demo data plus real workspace creation, upload, parsing, issue filters, and first-pass memo output
- a Next.js `review` app that renders the review grid, highlights, memo draft, exceptions list, upload controls, multi-document queries, and DD workflow reports
- a Next.js `review` app that now also lets reviewers correct extracted workflow cells, edit DD reports, rerun workflows, export multi-sheet workflow workbooks as `.xlsx`, export richer memos as `.docx`, and review workflow/report edit history with change summaries
- editable YAML playbooks for the first commercial DD sweeps
- shared TypeScript contracts plus a tiny SDK for the review UI

The current slice now supports a lightweight real workflow:

- create a workspace
- upload PDF and DOCX agreements
- parse them synchronously in the DD API
- persist workspace, document, page, and issue records in local SQLite
- render first-pass cited issues and memo output in the review UI
- mirror uploaded matters into canonical `project`, `document_version`, `document_anchor`, `job`, and `audit_event` records for the next product stage
- queue asynchronous re-ingest and review-export jobs that a local worker can process outside the request path
- extract clause-backed library items from uploaded documents and search them through a shared retrieval layer with provenance and basic metadata filters
- run queue-backed multi-document query sweeps across selected project documents and export the resulting table as CSV
- run file-backed DD workflow templates that generate memo drafts, exceptions lists, per-document summaries, template-driven workbook/docx exports, and selectable artifact variants through the same job system
- correct extracted workflow cells, persist report edits, rerun workflows, download multi-sheet workflow `.xlsx` and richer memo `.docx` artifacts, and inspect reviewer/system edit history with diff summaries from the web workspace

The repo now also includes a first Word add-in scaffold:

- a narrow Next.js task-pane app at `apps/word-addin`
- typed Review, Ask, Draft, Playbooks, and Standards surfaces driven by shared schema contracts
- a concrete UI target for Office.js integration plus a local Word add-in manifest
- a live Review tab that posts persisted review runs to the DD API from the current Word selection
- a live Ask tab that queues citation-backed ask runs from the current Word selection and can complete through the local worker
- a live Draft tab that queues persisted draft runs, returns adjusted clause text plus precedent-style matches, and can complete through the local worker
- persisted suggestion actions so comment/redline receipts and review states survive pane refreshes
- lightweight action history on review suggestions, including post-apply anchor context from Word
- anchor recovery controls that can re-select the closest matching clause in Word after drift
- a persisted save-to-playbook loop so reviewers can capture suggestion notes into the Playbooks tab
- explicit playbook/check targeting in the Review pane so captured notes land in a chosen rule bucket
- a richer Review flow with setup controls, running-state progress, issue-type filtering, jump-to-source actions, and review-summary export
- more interactive Ask, Draft, and Playbooks tabs that align more closely with the add-in wireframes
- a live Standards tab that compares the current Word selection to a file-backed house-standard template and returns a real coverage score plus missing and weak clause output

This is still intentionally lightweight. It uses heuristic extraction and local storage to prove the workflow before Postgres, queues, and model-driven extraction land, but the report/export loop now has a real binary-artifact path, multi-sheet exports, and lightweight diff-aware event history.

Workflow templates now also define export structure directly. The current commercial DD template declares workbook sheets, memo sections, and artifact variants in [packages/workflows/commercial-dd-report.yaml](/Users/katerinamcmullen/Documents/GitHub/skua/packages/workflows/commercial-dd-report.yaml:1), and the export builders use that metadata instead of a single hardcoded report layout.

## Quick Start

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Start the DD API

```bash
cd services/dd-api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### 3. Start the review app

```bash
cd /Users/katerinamcmullen/Documents/GitHub/skua
DD_API_BASE_URL=http://127.0.0.1:8000 npm run dev:review
```

The review surface will be available at `http://127.0.0.1:3000`.

### 4. Start the Word add-in scaffold

```bash
cd /Users/katerinamcmullen/Documents/GitHub/skua
npm run dev:word-addin
```

The Word add-in scaffold will be available at:

- `http://127.0.0.1:3001` for normal browser preview
- `https://localhost:3001` for Word sideloading via the local manifest

Local manifest path:

- `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/manifest.word.xml`

### 5. Create a workspace and upload contracts

Open the review app and:

1. create a new workspace
2. upload one or more `.pdf` or `.docx` agreements
3. review the generated issues, citations, highlights, and memo draft

The demo workspace `project-redwood` remains available as a read-only sample.

### 6. Run the local worker

```bash
cd /Users/katerinamcmullen/Documents/GitHub/skua
services/dd-api/.venv/bin/python services/worker/runner.py
```

Useful local modes:

- `--once` to process a single queued job and exit
- `--max-jobs 5` to drain a bounded slice of the queue and stop

## Current API Surface

- `GET /healthz`
- `GET /api/v1/playbooks`
- `GET /api/v1/workflows/templates`
- `GET /api/v1/playbooks/saved-notes`
- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspace_id}`
- `GET /api/v1/workspaces/{workspace_id}/issues`
- `POST /api/v1/workspaces/{workspace_id}/documents/upload`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{project_id}`
- `GET /api/v1/projects/{project_id}/documents`
- `GET /api/v1/projects/{project_id}/jobs`
- `GET /api/v1/projects/{project_id}/queries/runs`
- `GET /api/v1/projects/{project_id}/workflows/runs`
- `POST /api/v1/documents/upload`
- `GET /api/v1/documents/{document_id}`
- `POST /api/v1/documents/{document_id}/ingest`
- `GET /api/v1/jobs/{job_id}`
- `GET /api/v1/workspaces/{workspace_id}/outputs/first-pass`
- `POST /api/v1/ask`
- `GET /api/v1/ask/{ask_run_id}`
- `POST /api/v1/draft`
- `GET /api/v1/draft/{draft_run_id}`
- `POST /api/v1/library/search`
- `POST /api/v1/queries/runs`
- `GET /api/v1/queries/runs/{query_run_id}`
- `GET /api/v1/queries/runs/{query_run_id}/export`
- `POST /api/v1/workflows/runs`
- `GET /api/v1/workflows/runs/{workflow_run_id}`
- `PUT /api/v1/workflows/runs/{workflow_run_id}`
- `POST /api/v1/workflows/runs/{workflow_run_id}/rerun`
- `GET /api/v1/dd/reports/{dd_report_id}`
- `PUT /api/v1/dd/reports/{dd_report_id}`
- `GET /api/v1/dd/reports/{dd_report_id}/export`
- `POST /api/v1/review/runs`
- `GET /api/v1/review/runs/{review_run_id}`
- `POST /api/v1/review/runs/{review_run_id}/export-summary`
- `POST /api/v1/review/runs/{review_run_id}/queue-export-summary`
- `POST /api/v1/review/suggestions/{suggestion_id}/apply`
- `POST /api/v1/review/suggestions/{suggestion_id}/dismiss`
- `POST /api/v1/review/suggestions/{suggestion_id}/mark-reviewed`
- `POST /api/v1/review/suggestions/{suggestion_id}/save-to-playbook`
- `GET /api/v1/audit`

## Monorepo Layout

```text
apps/
  chat/        LibreChat fork/theme and product shell
  review/      Thin review UI for issues, exports, and playbooks
  word-addin/  Word-first task-pane scaffold for contract workflows
services/
  dd-api/      FastAPI orchestration for extraction, issues, and memo generation
  worker/      Parsing, chunking, ingestion, and export jobs
  gateway/     LiteLLM configuration and gateway helpers
packages/
  playbooks/   Editable YAML diligence playbooks
  prompts/     Versioned prompts and prompt fragments
  schemas/     Shared JSON Schema / Pydantic contracts
  sdk/         Internal client helpers
infra/
  Local infrastructure notes and compose assets
```

## Product Principles

- Source anchoring is mandatory for every extracted issue.
- Playbooks are editable files, not hardcoded product logic.
- Reviewers stay in control; the system proposes and cites.
- BYOK generation should be compatible with self-hosted embeddings.

## Seed Workspace

The seeded DD API currently exposes one demo matter:

- `project-redwood`

That workspace includes:

- customer, vendor, and lease agreements
- assignment and change-of-control issues
- auto-renewal, exclusivity, privacy, IP, and liability callouts
- memo-ready highlights and an exceptions list

Uploaded workspaces are stored locally in:

- `data/skua.db`
- `uploads/<workspace-id>/...`

## First Playbooks

- basic commercial DD
- customer contract sweep
- vendor contract sweep
- privacy / data-processing sweep

## Next Build Steps

1. Improve parsing quality and source anchors, especially for DOCX pagination and table-heavy PDFs.
2. Replace heuristic spotting with playbook-driven extraction jobs and confidence scoring.
3. Improve library extraction quality and provenance further, especially for DOCX heading/section boundaries, table-heavy source text, and richer retrieval ranking.
4. Expand workflow templating with richer file roles, reusable output schemas, and more per-firm artifact variants.
5. Broaden the new Standards slice into fuller house-standard packs, fix insertion, and reusable benchmark workflows.
6. Expand the canonical project/document/job/audit layer into the full contracts API shape from the spec.
7. Stand up local infra for Postgres, Redis, object storage, and Langfuse.
