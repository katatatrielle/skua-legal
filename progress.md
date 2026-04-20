# Progress Log

## Session: 2026-04-20

### Phase 34: Phase 3 Ingestion, Parsing, and Anchors
- **Status:** complete
- Actions taken:
  - Added a platform-native document pipeline in `services/api/app/platform_documents.py` instead of extending the legacy SQLite upload path again.
  - Added platform ingest routes for file upload and Word selection upload, plus platform document-version listing/detail, segment search, and anchor relocation endpoints.
  - Added richer DOCX parsing that preserves ordered paragraphs and tables, captures heading segments, records structural metadata, and emits segment-level anchors.
  - Added PDF parsing that keeps page/block order, emits paragraph-like segments, and tags low-confidence regions through segment metadata.
  - Added anchor payloads with `document_version_id`, `ordinal`, `quote`, `prefix`, `suffix`, `page`, confidence, and deterministic embedding tokens.
  - Added hybrid retrieval over parsed segments using lexical overlap plus stored embedding-token similarity, with lexical fallback always available.
  - Added parse QA fixtures and tests covering DOCX parsing, PDF parsing, platform upload/search, and anchor relocation.
  - Extended shared Python and TypeScript contracts plus the SDK for the new platform document APIs.
- Verification:
  - `python3 -m compileall services/api/app`
  - `npm run test:api`
  - `npm run typecheck:web`
  - `npm run typecheck:word-addin`
  - `npm test`
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_parsing.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_documents.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/object_storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/tests/test_platform_phase3.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/tests/fixtures/parse/docx_contract.expected.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/tests/fixtures/parse/pdf_contract.expected.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 33: Phase 2 Platform Foundation
- **Status:** complete
- Actions taken:
  - Added a Postgres-ready platform layer in `services/api` with centralized settings, SQLAlchemy models, Alembic migrations, seed data, and a one-command `scripts/platform-init.sh`.
  - Added auth endpoints for register, login, and current-user lookup, then made registration provision a default workspace so the support surface and API share the same initial workspace model.
  - Added workspace-scoped provider config endpoints plus membership-based access checks across workspace and project reads.
  - Added local or S3-backed source/artifact storage helpers, persisted generated export artifacts into the artifact namespace, and cleaned them up on project deletion.
  - Added Redis/RQ queue wiring to the API and worker, plus structured request logging with request IDs.
  - Added platform infra assets: `infra/docker-compose.platform.yml`, `infra/docker-compose.staging.yml`, `infra/staging.env.example`, and `.github/workflows/ci.yml`.
  - Added API tests for auth/default workspace provisioning, workspace scoping, artifact cleanup, and updated the existing upload cleanup test for the object-storage path.
  - Updated root scripts so `npm test` now runs web typecheck, add-in typecheck, API pytest, and API compilation.
- Verification:
  - `./scripts/platform-init.sh`
  - `npm run typecheck:web`
  - `npm run typecheck:word-addin`
  - `npm run test:api`
  - `npm test`
  - `python3 -m compileall services/api/app services/worker/runner.py`
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/settings.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_db.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_auth.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_seed.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/platform_service.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/object_storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/queueing.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/observability.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/rq_jobs.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/alembic.ini`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/alembic/env.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/alembic/versions/20260420_000001_platform_foundation.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/pyproject.toml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/.env.example`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/tests/test_platform_foundation.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/tests/test_repository_upload_cleanup.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/worker/runner.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/infra/docker-compose.platform.yml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/infra/docker-compose.staging.yml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/infra/staging.env.example`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/.github/workflows/ci.yml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/scripts/platform-init.sh`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/scripts/bootstrap-local.sh`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 32: Solo-First Repo Reset
- **Status:** complete
- Actions taken:
  - Renamed the web review surface from `apps/review` to `apps/web`.
  - Renamed the backend service from `services/dd-api` to `services/api`.
  - Removed the unused `apps/chat` surface from the active repo shape.
  - Reworked root scripts to prefer `dev:web` and `dev:api` while keeping compatibility aliases for the older names.
  - Rewrote the root README plus app and service READMEs around the Word-first contract copilot story.
  - Added `.env.example` files for the root, web app, Word add-in, and API service.
  - Added `scripts/bootstrap-local.sh` for clean local setup.
  - Narrowed the visible Word add-in tabs to Review, Ask, Revise, Saved Clauses, and Settings.
  - Hid the web app's query and workflow panels from the main support surface.
  - Switched client configuration to prefer `SKUA_API_BASE_URL` with `DD_API_BASE_URL` as a fallback.
  - Added an SDK alias `create_api_client` while preserving `create_dd_api_client`.
  - Verified `python3 -m compileall services/api/app`, `npm run typecheck:web`, `npm run typecheck:word-addin`, and `npm test`.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/.env.example`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/scripts/bootstrap-local.sh`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/worker/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

## Session: 2026-04-19

### Phase 26: Editable Reports and Artifact Export
- **Status:** complete
- Actions taken:
  - Added shared contracts for DD report updates plus workflow correction and rerun requests.
  - Added DD API support for updating workflow rows, regenerating DD report content from corrected rows, updating DD reports directly, rerunning workflow runs, and exporting memo/exceptions artifacts.
  - Added same-origin review-app routes for workflow rerun plus DD report export/update flows.
  - Extended the workflow panel with editable extracted cells, editable memo/exceptions text, save actions, rerun, and artifact download controls.
  - Verified compile/build/tests and a focused smoke test that corrected workflow cells, saved report edits, exported memo/exceptions content, and queued a rerun.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/workflow-runs/[workflowRunId]/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/workflow-runs/[workflowRunId]/rerun/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/dd-reports/[ddReportId]/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/dd-reports/[ddReportId]/export/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 25: Workflow Templates and DD Reports
- **Status:** complete
- Actions taken:
  - Added file-backed workflow templates under `packages/workflows`.
  - Added shared contracts for workflow templates, workflow runs, and DD reports.
  - Added `workflow_runs` and `dd_reports` persistence plus queue-backed workflow processing in the DD API.
  - Reused query-style extraction helpers to assemble report rows, memo markdown, exceptions lists, and per-document summaries.
  - Added DD API routes for template listing, project workflow-run history, workflow-run creation/polling, and DD report retrieval.
  - Added same-origin review-app routes for workflow-run create/read and DD report reads.
  - Extended the review app with a workflow panel that runs saved diligence sweeps and renders memo/exceptions output in the workspace.
  - Verified compile/build/tests and a focused workflow smoke test that generated a DD report end to end.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/workflows/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/workflows/commercial-dd-report.yaml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/lib/api.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/page.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/workflow-runs/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/workflow-runs/[workflowRunId]/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/dd-reports/[ddReportId]/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 24: Multi-Document Query Runs
- **Status:** complete
- Actions taken:
  - Added shared query-run contracts across the schema and SDK packages.
  - Added `query_runs` persistence, project-document listing, query-run listing, query-run export, and queue-backed query processing in the DD API.
  - Reused the existing worker/job backbone so multi-document queries complete through the same queue model as Ask and Draft.
  - Added same-origin review-app proxy routes for query-run create, read, and export.
  - Expanded the review app to load canonical project documents and query history, then added a Queries panel with document selection, multi-question input, polling, result-table rendering, and CSV export.
  - Verified compile/build/tests and a focused smoke test that uploaded generated DOCX files, completed a query run, and checked exported CSV content.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/lib/api.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/page.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/query-runs/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/query-runs/[queryRunId]/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/query-runs/[queryRunId]/export/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 23: Library Provenance Hardening
- **Status:** complete
- Actions taken:
  - Finished the in-progress library provenance refactor so new uploads create clause-level anchors when parsed clause units are available.
  - Routed library-item creation through those clause-sized units, storing page-number and source-kind metadata for retrieval and downstream Draft provenance.
  - Extended library search to return the richer metadata and honor basic filters for document type, governing law, counterparty, and document name.
  - Updated Draft match provenance to surface page context from retrieved library items.
  - Hardened both Next app workspaces so `typecheck` and `lint` materialize `.next/types` via `next build` before running `tsc`.
  - Re-ran compile/build/tests and a focused smoke test that uploaded generated DOCX files, exercised filtered library search, and verified Draft used clause-backed provenance.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 1: Requirements & Discovery
- **Status:** complete
- **Started:** 2026-04-19
- Actions taken:
  - Inspected the repository structure and confirmed it was a lightweight scaffold.
  - Read the top-level README, workspace placeholders, and the first commercial DD playbook.
  - Chose a first implementation slice focused on shared contracts, a seed DD API, and a thin review UI.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md` (created)

### Phase 2: Planning & Structure
- **Status:** complete
- Actions taken:
  - Established the initial implementation plan and project phases.
  - Documented rationale for starting with typed contracts and seeded review flows.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md` (created)

### Phase 3: Implementation
- **Status:** complete
- Actions taken:
  - Added workspace package metadata, TypeScript base config, editable playbook assets, prompt assets, and shared schema/SDK packages.
  - Built a FastAPI DD API with typed models, seeded workspace data, playbook loading, issue filters, and first-pass output endpoints.
  - Built a Next.js review app with an issue grid, local filters, highlight cards, memo sections, and exceptions list rendering.
  - Updated the root and workspace READMEs to document the runnable setup.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/tsconfig.base.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/playbooks/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/prompts/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/*`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`

### Phase 4: Testing & Verification
- **Status:** complete
- Actions taken:
  - Compiled the Python API package with `python3 -m compileall services/api/app`.
  - Installed JavaScript dependencies with `npm install`.
  - Ran `npm run typecheck:review`, `npm run build:review`, and `npm test`.
  - Created a local API virtualenv, installed `services/api` with dev extras, and verified the main endpoints with FastAPI `TestClient`.
  - Fixed npm workspace protocol incompatibility, missing `httpx` for tests, and YAML version-type validation.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/package-lock.json` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/pyproject.toml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/playbooks/*.yaml`

### Phase 6: Real Upload Vertical Slice
- **Status:** complete
- Actions taken:
  - Added local SQLite-backed persistence for workspaces, documents, pages, and issues.
  - Added PDF and DOCX parsing for uploaded files and lightweight metadata extraction.
  - Added deterministic first-pass issue generation with source citations and memo output from uploaded documents.
  - Added create-workspace and upload endpoints in the DD API.
  - Added review-app controls for workspace selection, creation, and multi-file upload.
  - Updated the root and workspace documentation to describe the real upload flow.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/parsing.py` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/analyzer.py` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/pyproject.toml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/page.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/workspace-controls.tsx` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/lib/api.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`

### Phase 7: Verification & Delivery
- **Status:** in_progress
- Actions taken:
  - Reinstalled the DD API package with parser and multipart dependencies.
  - Smoke-tested the API by creating a workspace and uploading a generated DOCX through FastAPI `TestClient`.
  - Confirmed the upload flow created a workspace document, issues, and first-pass memo output.
  - Re-ran review-app typecheck, production build, and root test script.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 8: Product Spec Package
- **Status:** complete
- Actions taken:
  - Read the current planning files and repo docs to recover context.
  - Inspected the shared TypeScript schemas, FastAPI models, repository layer, SQLite schema, and review UI structure.
  - Identified the gap between the current DD slice and the PRD's Word-first contracts platform.
  - Chose to add a dedicated markdown spec bundle under `docs/` for the engineering spec, data contracts, and Word add-in wireframes.
  - Drafted a clean-room engineering spec that maps the current repo to the future Word-first product and defines the canonical Postgres table set.
  - Drafted canonical endpoint contracts for projects, documents, review runs, suggestion actions, playbooks, library search, ask, standards, queries, workflows, exports, provider configs, and audit.
  - Drafted low-fidelity Word add-in wireframes for the ribbon, shared shell, review flow, ask, draft, playbooks, standards, and error states.
  - Verified the new docs exist under `docs/specs` and updated planning files to reflect completion.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-engineering-spec.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-endpoint-contracts.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-word-addin-wireframes.md` (created)

### Phase 9: Word Add-in Scaffold
- **Status:** complete
- Actions taken:
  - Inspected root package scripts, the existing review app setup, and shared schema patterns to match current monorepo conventions.
  - Added a new `apps/word-addin` Next.js workspace with a task-pane-sized UI shell, task tabs, and typed mock data for Review, Ask, Draft, Playbooks, and Standards.
  - Expanded `packages/schemas/src/index.ts` with review-oriented contracts for anchors, citations, review runs, suggestion records, markup settings, and ask runs.
  - Wired the new app into root npm scripts and updated the root README with run instructions.
  - Ran `npm install`, both workspace typechecks, both Next.js builds, and the root `npm test` script to verify the new baseline.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/package-lock.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/package.json` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/tsconfig.json` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/next-env.d.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/next.config.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/layout.tsx` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/page.tsx` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/mock-data.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 10: Office Manifest & Adapter Layer
- **Status:** complete
- Actions taken:
  - Added a thin Office.js adapter for reading the current Word selection, reading OOXML, checking change-tracking mode, inserting comments, and applying replacement text.
  - Loaded `office.js` into the task-pane app and surfaced host status, requirement support, and live selection state in the add-in UI.
  - Added a local shared-runtime Word manifest with Home-tab buttons for Open Pane, Review, Ask, and Draft.
  - Added local icon assets and command assets under the add-in's `public/` folder.
  - Switched the Word add-in dev server to Next's experimental HTTPS mode so the local manifest can target `https://localhost:3001`.
  - Validated the manifest with `npx office-addin-manifest validate apps/word-addin/public/manifest.word.xml`.
  - Re-ran workspace verification after the Office integration changes.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/layout.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/page.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/lib/office.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/types/office.d.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/manifest.word.xml` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/commands.html` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/commands.js` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/icons/skua-16.png` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/icons/skua-32.png` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/icons/skua-80.png` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 11: Live Review Run Bridge
- **Status:** complete
- Actions taken:
  - Added persisted review-run and review-suggestion tables to the DD API's local SQLite schema.
  - Added Python models, repository functions, and API endpoints for creating and retrieving review runs.
  - Added a lightweight heuristic review-suggestion generator that operates on submitted Word selection text.
  - Extended the shared schema and SDK packages for review-run creation and retrieval.
  - Added same-origin proxy routes inside the Word add-in app so the HTTPS task pane can call the local HTTP DD API.
  - Reworked the Word add-in Review tab to create live review runs and render API-backed suggestions instead of mock review cards.
  - Updated repo documentation to describe the new live review bridge.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/analyzer.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-runs/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-runs/[reviewRunId]/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 12: Persisted Suggestion Actions
- **Status:** complete
- Actions taken:
  - Added shared schema and SDK support for suggestion apply, dismiss, and mark-reviewed requests.
  - Added DD API request models and endpoints for persisted suggestion actions.
  - Extended the local SQLite review-suggestion table with reviewer note and action timestamp columns, including a lightweight migration helper for existing dev databases.
  - Updated repository helpers to persist suggestion action state and return the full updated review run.
  - Added same-origin proxy routes for suggestion actions in the Word add-in app.
  - Updated the Word add-in Review tab so comment/redline actions post receipts after Word mutation succeeds, and mark-reviewed/dismiss actions now persist to the backend.
  - Updated repo documentation to reflect the full persisted review loop.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`

### Phase 13: Suggestion Event History
- **Status:** complete
- Actions taken:
  - Added append-only review suggestion events and exposed them through review run payloads.
  - Extended apply receipts with post-apply anchor snapshots from the Word add-in.
  - Surfaced event history, latest anchor snapshots, and reconciliation state in the Review detail view.
  - Verified Python compilation, add-in typecheck/build, review build, root tests, and a FastAPI smoke test for reconciliation state.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/lib/office.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 14: Anchor Drift Recovery
- **Status:** complete
- Actions taken:
  - Added a Word-side quote-search helper that can locate and select the closest matching clause in the open document.
  - Updated the Review suggestion detail view with explicit drift guidance, current-selection checks, and an anchor-recovery control.
  - Fixed selection refresh messaging so apply and locate actions keep their own success feedback visible.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/types/office.d.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/lib/office.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 18: Pre-Broadening Foundation Bridge
- **Status:** complete
- Actions taken:
  - Added canonical SQLite tables for `projects`, `document_versions`, `document_anchors`, `job_records`, and `audit_events`.
  - Added repository backfill logic so older local `workspaces` and `documents` automatically gain matching canonical records on startup.
  - Extended upload flows so every new file now creates both the existing workspace/document rows and the canonical project/document-version/anchor/job/audit rows.
  - Added canonical DD API endpoints for projects, project-scoped uploads, document detail, ingest replay, and audit-log reads.
  - Extended shared schema and SDK packages for the new canonical records and routes.
  - Verified Python compilation, both Next.js builds, root tests, and a FastAPI smoke test covering project creation, canonical upload, document fetch, ingest, and audit log retrieval.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 19: Queue & Worker Baseline
- **Status:** complete
- Actions taken:
  - Extended `job_records` with worker/error fields and formal queued/running/succeeded/failed semantics.
  - Added canonical job polling endpoints plus project-scoped job listing.
  - Changed document re-ingest into a real queued job and added a queue-backed review-summary export path beside the existing synchronous export endpoint.
  - Added a local worker runner in `services/worker/runner.py` that claims queued jobs from SQLite and processes supported job types.
  - Verified queue transitions end to end with a FastAPI smoke test that queued ingest and review-export jobs, ran the worker, and observed both jobs complete successfully.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/worker/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/worker/runner.py` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 20: Ask Run Integration
- **Status:** complete
- Actions taken:
  - Extended the shared Ask contracts so they can persist project context, selection text, selection anchors, queue status, citations, and completion timestamps.
  - Added `ask_runs` persistence in the DD API plus `POST /api/v1/ask` and `GET /api/v1/ask/{id}` endpoints.
  - Added worker-side Ask processing so queued Ask jobs now resolve into citation-backed answers with persisted run records.
  - Added same-origin Next routes for Ask in the Word add-in and replaced the local Ask mock flow with a real queued run plus short polling loop.
  - Verified Python compilation, Word add-in typecheck/build, review build, root tests, and a focused Ask smoke test that queued an Ask run and observed worker completion.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/worker/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/ask/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/ask/[askRunId]/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/mock-data.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 21: Draft Run Integration
- **Status:** complete
- Actions taken:
  - Extended the shared Draft contracts so persisted runs can carry mode, generated clause text, citations, and a short ranked set of library-style matches.
  - Added `draft_runs` persistence plus `POST /api/v1/draft` and `GET /api/v1/draft/{id}` endpoints in the DD API.
  - Added worker-side Draft processing so queued Draft jobs now resolve into generated clause text, citations, and precedent-style matches.
  - Added same-origin Next routes for Draft in the Word add-in and replaced the local Draft-only flow with a real queued run plus short polling loop.
  - Verified Python compilation, Word add-in typecheck/build, a focused Draft smoke test, and then re-ran the normal repo checks.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/worker/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/draft/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/draft/[draftRunId]/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/mock-data.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 22: Library Retrieval Foundation
- **Status:** complete
- Actions taken:
  - Added persistent `library_items` storage derived from uploaded document-version anchor segments.
  - Added startup backfill so older local document versions gain library items automatically when missing.
  - Added shared library-search contracts plus `POST /api/v1/library/search` in the DD API and a same-origin add-in proxy route.
  - Updated Draft generation so it prefers real library search results when available instead of only falling back to static heuristic matches.
  - Verified Python compilation, Word add-in typecheck/build, a focused library-search smoke test, a Draft retrieval smoke test, and then re-ran the normal repo checks.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/library/search/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/package.json`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 15: Playbook Capture Loop
- **Status:** complete
- Actions taken:
  - Added persisted `playbook_saved_notes` storage plus review-suggestion save-to-playbook state in the DD API.
  - Added DD API endpoints for saving review suggestions to playbook memory and listing saved notes.
  - Added same-origin add-in routes for playbook loading, saved-note loading, and save-to-playbook actions.
  - Updated the Word add-in so suggestion detail can save to playbook memory and the Playbooks tab now shows recent captured notes from the backend.
  - Re-ran Python compilation, add-in typecheck/build, root tests, and a FastAPI smoke test covering save-to-playbook persistence.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/playbooks/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/playbooks/saved-notes/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-suggestions/[suggestionId]/save-to-playbook/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 16: Targeted Playbook Capture
- **Status:** complete
- Actions taken:
  - Extended review-suggestion and saved-note contracts with optional target playbook-check IDs.
  - Persisted selected playbook/check targets in SQLite on both the saved note row and the parent review suggestion.
  - Updated the Word add-in Review detail view to let reviewers choose a destination playbook and check before saving.
  - Surfaced the chosen check on recent saved notes in the Playbooks tab.
  - Re-ran Python compilation, add-in typecheck/build, root tests, and a FastAPI smoke test verifying explicit `assignment` check targeting.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 17: Docs Alignment Sweep
- **Status:** complete
- Actions taken:
  - Compared the current repo against the engineering spec, endpoint contracts, wireframes, and README, then grouped the remaining alignment work into implementation-sized tasks.
  - Added richer Review setup controls, scope handling, running progress state, issue-type filters, jump-to-source actions, and review-summary export.
  - Made Ask and Draft more interactive with editable inputs, mode switching, and action buttons that behave more like the documented product flows.
  - Expanded Playbooks behavior with better run/export actions and recent note targeting visibility.
  - Expanded the Word manifest to include Review Selection, Review Document, Draft from Library, Refresh Anchors, and Export to Project entry points.
  - Verified Python compilation, add-in typecheck/build, root tests, manifest validation, and smoke tests for review-summary export.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/page.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-runs/[reviewRunId]/export-summary/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/lib/office.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/types/office.d.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/public/manifest.word.xml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 27: Binary Artifacts and Reviewer History
- **Status:** complete
- Actions taken:
  - Installed `openpyxl` into the DD API environment and finished the product-level binary export path for workflow `.xlsx` and memo `.docx` artifacts.
  - Extended the shared SDK with binary export helpers so review-app proxy routes can safely handle both text and binary downloads.
  - Added a same-origin workflow export route in the review app and upgraded the DD report export route to proxy binary artifact responses.
  - Persisted DD report regeneration events when workflow cell corrections rebuild the memo, so report history captures both direct edits and row-driven changes.
  - Expanded the review workspace UI with workflow `.xlsx` export, memo `.docx` export, and visible workflow/report event history panels.
  - Re-ran compile, typecheck, build, root tests, and a focused artifact-history smoke test.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/pyproject.toml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/dd-reports/[ddReportId]/export/route.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/api/workflow-runs/[workflowRunId]/export/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 28: Structured Exports and Diff Summaries
- **Status:** complete
- Actions taken:
  - Added compact diff-summary payloads to workflow and DD report events in the shared contracts and Python models.
  - Persisted diff-aware event summaries for workflow cell corrections, direct report edits, and report regenerations triggered from corrected rows.
  - Upgraded workflow workbook export to create dedicated `Workflow Results`, `Citations`, `Exceptions`, `Document Summaries`, and `History` sheets.
  - Upgraded memo DOCX export to include report metadata, structured exceptions/document-summary tables, and a report-history section.
  - Updated the review workspace history panels to display change-summary text instead of only raw previous-state counts.
  - Re-ran compile, typecheck, root tests, standalone builds, and a focused structured-export smoke test.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 29: Template-Driven Artifact Layouts
- **Status:** complete
- Actions taken:
  - Expanded workflow template contracts so templates now declare `workbook_sheets` and structured `memo_sections`.
  - Updated the commercial DD workflow YAML to define workbook tabs and memo-section behavior directly.
  - Refactored export composition in the DD API so workbook/docx builders consume workflow template metadata instead of a single hardcoded artifact layout.
  - Added fallback template normalization so partially configured or older templates still export safely.
  - Re-ran compile, typecheck, root tests, standalone builds, and a focused template-driven export smoke test.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/workflows/commercial-dd-report.yaml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 30: Artifact Variants and Standards Pivot
- **Status:** complete
- Actions taken:
  - Expanded workflow template contracts to support `artifact_variants` and persisted the chosen variant on workflow runs.
  - Updated the commercial DD workflow YAML with `buyer_full` and `exec_brief` artifact variants.
  - Added review-workspace controls for selecting an artifact variant before queueing a workflow run.
  - Added file-backed standards templates plus persisted `standards_runs` routes in the DD API.
  - Added same-origin Word add-in proxy routes for standards templates and standards runs.
  - Replaced the Standards tab's mock-only score card with a live standards comparison flow against the current Word selection.
  - Re-ran compile, typecheck, root tests, standalone builds, and a focused artifact-variant plus standards smoke test.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/sdk/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/main.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/workflows/commercial-dd-report.yaml`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/standards/commercial-house-standard.yaml` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/app/review-workspace.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/standards/templates/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/standards/runs/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/standards/runs/[standardsRunId]/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/web/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 31: Standards Remediation
- **Status:** in progress
- Actions taken:
  - Established the live Standards comparison path in the Word add-in and set the next implementation target to remediation rather than more export work.
- Next actions:
  - Add clause-level fix insertion from standards findings.
  - Add richer standards packs and tighter excerpt matching.
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-suggestions/[suggestionId]/apply/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-suggestions/[suggestionId]/dismiss/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/api/review-suggestions/[suggestionId]/mark-reviewed/route.ts` (created)
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

### Phase 13: Suggestion Event History
- **Status:** complete
- Actions taken:
  - Added shared schema support for suggestion events and richer apply receipts with post-apply anchor context.
  - Added DD API models and a new append-only `review_suggestion_events` table for durable action history.
  - Updated repository reads so each suggestion now returns its action history alongside current status.
  - Extended the Office adapter to include a post-apply anchor snapshot in comment and redline receipts.
  - Updated the Word add-in suggestion detail view to show action history entries.
  - Updated repo documentation to describe the history-aware review loop.
- Files created/modified:
  - `/Users/katerinamcmullen/Documents/GitHub/skua/packages/schemas/src/index.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/models.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/storage.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/app/repository.py`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/lib/office.ts`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/word-task-pane.tsx`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/app/globals.css`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/apps/word-addin/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/services/api/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/task_plan.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/findings.md`
  - `/Users/katerinamcmullen/Documents/GitHub/skua/progress.md`

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Repository discovery | Read repo files | Identify current scaffold and first slice | Confirmed placeholder-only monorepo | pass |
| Python compile | `python3 -m compileall services/api/app` | API modules compile cleanly | All modules compiled | pass |
| Review typecheck | `npm run typecheck:review` | Review app types resolve | Passed | pass |
| Review build | `npm run build:review` | Next.js review app builds | Production build succeeded | pass |
| Root test script | `npm test` | Typecheck + API compile succeed | Passed | pass |
| API smoke test | `TestClient` calls for health, playbooks, workspaces, issues, outputs | Seed endpoints return valid payloads | Returned expected values for `project-redwood` | pass |
| Real upload smoke test | Create workspace + upload generated DOCX through `TestClient` | Persist document and create cited issues | Upload returned `doc_count=1`, `issue_count=4`, and memo output | pass |
| Word add-in typecheck | `npm run typecheck:word-addin` | New app compiles against shared schemas | Passed | pass |
| Review app typecheck after schema expansion | `npm run typecheck:review` | Existing app still compiles | Passed | pass |
| Word add-in build | `npm run build:word-addin` | New app builds cleanly | Passed after CSS compatibility cleanup | pass |
| Review app build after schema expansion | `npm run build:review` | Existing app still builds | Passed | pass |
| Root test script after add-in scaffold | `npm test` | Workspace checks plus API compile succeed | Passed | pass |
| Word add-in build after Office adapter wiring | `npm run build:word-addin` | Add-in still builds after Office.js and manifest integration | Passed | pass |
| Manifest validation | `npx office-addin-manifest validate apps/word-addin/public/manifest.word.xml` | Manifest conforms to Office add-in XML schema | Passed after moving `<Runtimes>` under `<Host>` | pass |
| Root test script after Office layer | `npm test` | Workspace checks plus API compile still succeed | Passed | pass |
| Python compile after review-run backend | `python3 -m compileall services/api/app` | DD API modules compile after review-run additions | Passed | pass |
| Word add-in build after live review wiring | `npm run build:word-addin` | Add-in builds after live review proxy/routes/UI changes | Passed | pass |
| Review app build after SDK expansion | `npm run build:review` | Existing review app still builds after SDK changes | Passed | pass |
| Review-run API smoke test | `TestClient` post/get review run in `services/api/.venv` | Persist a run and return suggestion records | Passed with one assignment suggestion | pass |
| Root test script after live review bridge | `npm test` | Workspace checks plus API compile still succeed | Passed | pass |
| Python compile after suggestion actions | `python3 -m compileall services/api/app` | DD API modules compile after action endpoints and migrations | Passed | pass |
| Word add-in build after action receipts | `npm run build:word-addin` | Add-in builds after persisted suggestion-action wiring | Passed | pass |
| Suggestion action API smoke test | `TestClient` create/apply/mark-reviewed in `services/api/.venv` | Persist suggestion status and reviewer note changes | Passed with final status `reviewed` | pass |
| Review app build after action SDK expansion | `npm run build:review` | Existing review app still builds after SDK method additions | Passed | pass |
| Root test script after persisted suggestion actions | `npm test` | Workspace checks plus API compile still succeed | Passed | pass |
| Python compile after suggestion events | `python3 -m compileall services/api/app` | DD API modules compile after event-history additions | Passed | pass |
| Word add-in build after anchor-aware receipts | `npm run build:word-addin` | Add-in builds after Office receipt enrichment and event UI changes | Passed | pass |
| Suggestion event smoke test | `TestClient` create/apply with `applied_anchor` in `services/api/.venv` | Persist event row and return post-apply anchor context | Passed with `applied_comment` event and anchor quote | pass |
| Review app build after event schema expansion | `npm run build:review` | Existing review app still builds after new schema fields | Passed | pass |
| Root test script after suggestion event history | `npm test` | Workspace checks plus API compile still succeed | Passed | pass |
| Python compile after binary artifact changes | `python3 -m compileall services/api/app services/worker` | DD API and worker compile after export/history additions | Passed | pass |
| Review app typecheck after binary export routes | `npm run typecheck:review` | Review app still typechecks after buffer-backed artifact routes and history UI | Passed after switching proxy responses to `Buffer.from(...)` | pass |
| Word add-in typecheck after shared SDK export helpers | `npm run typecheck:word-addin` | Add-in still typechecks after SDK expansion | Passed | pass |
| Root test script after binary artifact/history work | `npm test` | Workspace checks plus API compile still succeed | Passed | pass |
| Review app build after workflow/DD artifact export work | `npm run build:review` | Review app builds with the new export routes and history panels | Passed | pass |
| Word add-in build after SDK binary helper additions | `npm run build:word-addin` | Word add-in build remains green after SDK changes | Passed | pass |
| Artifact/history smoke test | Direct repository smoke using generated DOCX uploads, workflow run, row corrections, report edits, and artifact exports | Workflow completes, `.xlsx` and `.docx` exports are valid binaries, and workflow/report events are returned on reload | Passed with `workflow_event_actions=['rows_updated']`, `report_event_actions=['updated', 'regenerated_from_rows']`, workbook headers present, and DOCX heading `Due Diligence Report` | pass |
| Python compile after structured-export changes | `python3 -m compileall services/api/app services/worker` | DD API and worker compile after diff-summary and export-structure changes | Passed | pass |
| Review app typecheck after diff-summary UI wiring | `npm run typecheck:review` | Review app still typechecks after diff-summary rendering changes | Passed | pass |
| Word add-in typecheck after shared schema expansion | `npm run typecheck:word-addin` | Word add-in still typechecks after workflow/report event schema changes | Passed | pass |
| Root test script after structured-export changes | `npm test` | Workspace checks plus API compile still succeed | Passed on clean serial rerun | pass |
| Structured export smoke test | Direct repository smoke using generated DOCX uploads, workflow correction, report edit, and export inspection | Workbook contains reviewer-facing sheets, history summaries are populated, diff summaries are returned, and DOCX includes history section | Passed with sheet names `['Workflow Results', 'Citations', 'Exceptions', 'Document Summaries', 'History']`, history summary text populated, and `docx_history_present=True` | pass |
| Python compile after template-driven export changes | `python3 -m compileall services/api/app services/worker` | DD API and worker compile after workflow-template contract expansion | Passed | pass |
| Review app typecheck after workflow-template schema changes | `npm run typecheck:review` | Review app still typechecks after template contract changes | Passed | pass |
| Word add-in typecheck after workflow-template schema changes | `npm run typecheck:word-addin` | Word add-in still typechecks after schema changes | Passed | pass |
| Root test script after template-driven export changes | `npm test` | Workspace checks plus API compile still succeed | Passed on clean serial rerun | pass |
| Template-driven export smoke test | Direct repository smoke loading workflow YAML, running a workflow, and inspecting exported workbook/docx headings | Structured workbook sheets and memo headings match the workflow template | Passed with sheet names `['Workflow Results', 'Citations', 'Exceptions', 'Document Summaries', 'History']` and DOCX headings `['Template Export Smoke', 'Executive summary', 'Assignment and change-of-control risks', 'Renewal and termination observations', 'Document summaries', 'Exceptions list']` | pass |
| Python compile after artifact-variant and standards changes | `python3 -m compileall services/api/app services/worker` | DD API and worker compile after standards/template expansion | Passed | pass |
| Review app typecheck after artifact-variant support | `npm run typecheck:review` | Review app still typechecks after workflow variant selector and schema changes | Passed | pass |
| Word add-in typecheck after live Standards wiring | `npm run typecheck:word-addin` | Word add-in still typechecks after live Standards routes and UI | Passed after tightening the standards clause view type | pass |
| Root test script after standards pivot | `npm test` | Workspace checks plus API compile still succeed | Passed on clean serial rerun | pass |
| Artifact-variant and standards smoke test | Direct repository smoke using `exec_brief` artifact variant plus a standards comparison run | Workbook/docx follow the chosen variant and Standards returns real score/missing/weak output | Passed with workbook sheets `['Key Findings', 'Exceptions', 'History']`, DOCX headings `['Variant Standards Smoke', 'Executive summary', 'Critical findings', 'Exceptions list']`, standards score `12.5`, and missing/weak clause results | pass |
| Python compile after standards remediation changes | `python3 -m compileall services/api/app` | DD API compiles after richer standards finding metadata and backward-compatible hydration changes | Passed | pass |
| Word add-in build after standards remediation wiring | `npm run build:word-addin` | Word add-in builds after adding live locate/apply actions and insert-after Office support | Passed | pass |
| Review app build after shared standards schema widening | `npm run build:review` | Review app still builds after shared schema widening | Passed | pass |
| Review app TypeScript check after shared standards schema widening | `npm --workspace @skua/web exec -- tsc --noEmit` | Review app TypeScript remains clean after standards schema widening | Passed | pass |
| Standards remediation smoke test | Direct repository smoke using a temporary project/document version and a standards run | Multiple standards packs load, missing clauses carry explicit fix modes, and weak clauses carry matched excerpts | Passed with `template_ids=['commercial-house-standard', 'vendor-paper-tightened']`, missing fix modes `['insert_after_selection', 'replace_selection']`, and weak excerpt `Neither party may assign this Agreement without prior written consent of the other party.` | pass |
| Python compile after Phase 4 review engine | `python3 -m compileall services/api/app` | API modules compile after platform review-playbook and review-run additions | Passed | pass |
| Platform init after Phase 4 migration | `./scripts/platform-init.sh` | Alembic upgrade and seed path handle richer finding metadata and starter review playbooks | Passed | pass |
| API suite after Phase 4 review engine | `npm run test:api` | Platform ingest, parsing, auth, and new review-run flows all pass together | Passed with `10 passed` | pass |
| Review app typecheck after Phase 4 schema expansion | `npm run typecheck:web` | Support web app still typechecks after platform review contracts were added to shared schemas/SDK | Passed | pass |
| Word add-in typecheck after Phase 4 schema expansion | `npm run typecheck:word-addin` | Word add-in still typechecks after platform review contracts were added to shared schemas/SDK | Passed | pass |
| Root test script after Phase 4 review engine | `npm test` | Repo-wide checks remain green with the new platform review engine | Passed | pass |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-19 | `npm install` rejected `workspace:*` | 1 | Replaced internal workspace dependency versions with local `file:` links. |
| 2026-04-19 | `TestClient` missing `httpx` | 1 | Added `httpx` as a dev extra and reinstalled the API package. |
| 2026-04-19 | Playbook version validation failed | 1 | Quoted YAML version values as strings. |
| 2026-04-19 | Next page prop typing mismatch for `searchParams` | 1 | Changed the page signature to the promise shape Next expected and cast the resolved params. |
| 2026-04-19 | Review app export routes failed typecheck with raw `Uint8Array` bodies | 1 | Returned `Buffer.from(artifact.content)` from the Next route handlers instead. |
| 2026-04-19 | Parallel `npm test` plus standalone Next builds hit the known `.next` file race again | 1 | Treated it as a verification race, kept the successful standalone builds, and reran `npm test` cleanly in isolation. |
| 2026-04-19 | Parallel `npm test` plus standalone review build hit the known `.next` file race again during template-driven export verification | 1 | Kept the successful standalone builds and reran `npm test` serially in isolation. |
| 2026-04-19 | Standards UI initially failed typecheck because inline clause rendering widened to `unknown` | 1 | Added an explicit `StandardsClauseView` type and rendered optional fields directly. |
| 2026-04-20 | New Office insert-after helper initially used unsupported typings for `InsertLocation.after` and assumed `insertText` returned a `Range` | 1 | Switched to the literal `"After"` API value and returned an anchor snapshot built from the inserted text. |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 31: Standards Remediation |
| Where am I going? | Deeper standards coverage and higher-fidelity remediation before shifting to provider/admin or retrieval-quality expansion |
| What's the goal? | Make Standards a real remediation tool, not just a scoring surface |
| What have I learned? | Standards needs explicit remediation metadata and tolerant JSON hydration to stay stable as the contract evolves |
| What have I done? | Added a second standards pack, widened standards findings with fix modes and matched excerpts, and wired live locate/apply behavior into the Word add-in |
