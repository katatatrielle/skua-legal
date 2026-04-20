# Task Plan: Skua DD Platform Kickoff

## Goal
Turn the repo scaffold into a runnable due-diligence slice that supports real workspace creation, PDF/DOCX upload, parsing, persistence, and citation-backed issue generation in the review UI, then extend it with an implementation-ready spec package for the broader Word-first contracts product.

## Current Phase
Phase 30

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define technical approach
- [x] Create project structure for the first runnable slice
- [x] Document initial decisions with rationale
- **Status:** complete

### Phase 3: Implementation
- [x] Add shared schemas, prompts, and seeded playbook support
- [x] Build a FastAPI DD API with seed endpoints and typed responses
- [x] Build a thin review app scaffold backed by seeded API data
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Verify workspace installs and startup commands
- [x] Run API and UI checks
- [x] Document test results in progress.md
- **Status:** complete

### Phase 5: Delivery
- [x] Review repo outputs
- [x] Summarize what was built and what remains
- [x] Deliver next-step guidance to the user
- **Status:** complete

### Phase 6: Real Upload Vertical Slice
- [x] Add persistent workspace storage and document/page records
- [x] Implement PDF/DOCX upload and parsing
- [x] Generate first-pass issues and memo output from uploaded files
- [x] Expose create/upload endpoints and wire the review UI to them
- **Status:** complete

### Phase 7: Verification & Delivery
- [x] Verify real upload flow end to end
- [x] Update docs and planning files
- [x] Deliver outcomes and next tradeoffs to the user
- **Status:** complete

### Phase 8: Product Spec Package
- [x] Inspect the current repo contracts, storage schema, and review UX
- [x] Draft an engineering spec for the Word add-in plus deal workspace
- [x] Draft normalized database tables and endpoint contracts for the next product stage
- [x] Draft Word add-in screen wireframes and interaction notes
- [x] Verify the new docs fit the repo structure and update planning files
- **Status:** complete

### Phase 9: Word Add-in Scaffold
- [x] Inspect current monorepo package setup and app conventions
- [x] Add a minimal `apps/word-addin` scaffold with a task-pane-shaped UI
- [x] Expand shared schema contracts for anchors, citations, review runs, suggestions, and ask runs
- [x] Verify install, typecheck, and builds after wiring the new app into the workspace
- [x] Update repo docs and planning files for the new implementation baseline
- **Status:** complete

### Phase 10: Office Manifest & Adapter Layer
- [x] Add a thin Office.js adapter for host detection, selection reads, and basic document mutation
- [x] Load Office.js in the task pane and surface host state in the UI
- [x] Add a local Word add-in manifest, command assets, and icon resources
- [x] Validate the manifest and re-run workspace verification
- [x] Update repo docs and planning files for Office sideloading
- **Status:** complete

### Phase 11: Live Review Run Bridge
- [x] Add a minimal persisted `review_runs` API path to the DD service
- [x] Extend shared schemas and SDK for review-run creation and retrieval
- [x] Add same-origin proxy routes in the Word add-in app
- [x] Replace mock review suggestions in the Word add-in Review tab with API-backed runs
- [x] Verify API smoke tests, builds, and repo checks
- [x] Update repo docs and planning files for the live review baseline
- **Status:** complete

### Phase 12: Persisted Suggestion Actions
- [x] Add DD API models and endpoints for apply, dismiss, and mark-reviewed suggestion actions
- [x] Persist suggestion status changes and reviewer notes in local SQLite
- [x] Add same-origin proxy routes for suggestion actions in the Word add-in app
- [x] Post action receipts from the add-in after comment/redline application and refresh from server state
- [x] Verify smoke tests, builds, and repo checks
- [x] Update repo docs and planning files for the new review loop baseline
- **Status:** complete

### Phase 13: Suggestion Event History
- [x] Add a lightweight suggestion-event store for review actions
- [x] Extend apply receipts with post-apply anchor context from Word
- [x] Expose suggestion event history through review run responses
- [x] Surface action history in the add-in suggestion detail view
- [x] Verify smoke tests, builds, and repo checks
- [x] Update repo docs and planning files for the history-aware review loop
- **Status:** complete

### Phase 14: Anchor Drift Recovery
- [x] Add a Word-side helper that can search for and select a stored clause excerpt
- [x] Surface explicit drift guidance and clause-recovery actions in the Review tab
- [x] Verify the add-in builds and repo checks still pass
- [x] Update docs and planning files for the anchor-recovery baseline
- **Status:** complete

### Phase 15: Playbook Capture Loop
- [x] Persist save-to-playbook actions and saved-note records in the DD API
- [x] Add same-origin add-in routes for playbook data and save-to-playbook actions
- [x] Surface saved-note capture and recent note history in the Word add-in Playbooks tab
- [x] Verify Python compilation, add-in checks, and the new playbook save smoke test
- [x] Update docs and planning files for the playbook-capture baseline
- **Status:** complete

### Phase 16: Targeted Playbook Capture
- [x] Extend saved-note contracts to include target playbook-check IDs
- [x] Persist selected playbook/check targets on both saved notes and review suggestions
- [x] Add Review-pane controls for choosing the destination playbook and check before saving
- [x] Verify compile/build/test plus a smoke test for explicit check targeting
- [x] Update docs and planning files for the targeted-capture baseline
- **Status:** complete

### Phase 17: Docs Alignment Sweep
- [x] Identify the remaining implementation-sized gaps between the current add-in and the docs
- [x] Add Review setup, filters, progress state, jump actions, and review-summary export
- [x] Make Ask, Draft, and Playbooks flows more interactive and wireframe-aligned
- [x] Expand the ribbon manifest to expose the documented entry points
- [x] Verify compile, build, manifest validation, tests, and focused smoke tests
- [x] Update docs and planning files for the new alignment baseline
- **Status:** complete

### Phase 18: Pre-Broadening Foundation Bridge
- [x] Normalize the local DD API around canonical `projects`, `document_versions`, `document_anchors`, `job_records`, and `audit_events`
- [x] Backfill older local workspace data into the new canonical tables on startup
- [x] Expose canonical project, document, ingest, and audit endpoints alongside the existing workspace flow
- [x] Connect upload, review, export, and suggestion actions to job and audit records
- [x] Verify compile, builds, tests, and a focused canonical-route smoke test
- [x] Update docs and planning files for the new foundation baseline
- **Status:** complete

### Phase 19: Queue & Worker Baseline
- [x] Turn `job_records` into a real queued/running/succeeded/failed execution layer
- [x] Add job lookup and project-job endpoints for polling async work
- [x] Queue document re-ingest and review-summary export jobs instead of only simulating them
- [x] Add a local worker runner that claims and processes queued jobs
- [x] Verify queue transitions with focused smoke tests and update docs/planning files
- **Status:** complete

### Phase 20: Ask Run Integration
- [x] Extend the shared Ask contracts so Word selection context can be submitted and polled as a persisted run
- [x] Add `ask_runs` persistence and queue-backed Ask processing in the DD API and worker
- [x] Expose Ask create/read endpoints plus same-origin add-in proxy routes
- [x] Replace the Word add-in's local Ask mock with a real queued Ask flow and short polling loop
- [x] Verify compile/build plus a focused Ask smoke test and update docs/planning files
- **Status:** complete

### Phase 21: Draft Run Integration
- [x] Extend the shared Draft contracts so persisted draft runs can carry mode, generated text, citations, and library-style matches
- [x] Add `draft_runs` persistence and queue-backed Draft processing in the DD API and worker
- [x] Expose Draft create/read endpoints plus same-origin add-in proxy routes
- [x] Replace the Word add-in's local Draft mock loop with a real queued Draft flow and short polling loop
- [x] Verify compile/build/tests plus a focused Draft smoke test and update docs/planning files
- **Status:** complete

### Phase 22: Library Retrieval Foundation
- [x] Add persistent `library_items` records derived from uploaded document versions
- [x] Backfill missing library items for older local data during repository startup
- [x] Expose shared library search contracts and a DD API search endpoint
- [x] Switch Draft matching to prefer real library search results when available
- [x] Verify compile/build/tests plus focused library-search and Draft retrieval smoke tests, then update docs/planning files
- **Status:** complete

### Phase 23: Library Provenance Hardening
- [x] Finish clause-level anchor and library-item wiring for new uploads
- [x] Add page/source provenance fields and metadata-aware filters to library search results
- [x] Feed the richer provenance through Draft matches and stabilize app typecheck scripts
- [x] Verify compile/build/tests plus focused filtered-library and Draft provenance smoke tests
- [x] Update docs and planning files for the hardened retrieval baseline
- **Status:** complete

### Phase 24: Multi-Document Query Runs
- [x] Add shared query-run contracts plus DD API persistence, routes, and worker processing
- [x] Expose project document lists and query-run history for the review app
- [x] Build a review-app Queries panel with run, poll, result-table, and CSV export flows
- [x] Verify compile/build/tests plus a focused multi-document query smoke test
- [x] Update docs and planning files for the new web-side extraction baseline
- **Status:** complete

### Phase 25: Workflow Templates and DD Reports
- [x] Add file-backed workflow templates plus DD report contracts and persistence
- [x] Extend the worker/job backbone to process workflow runs and build DD report artifacts
- [x] Expose workflow templates, workflow runs, and DD reports in the API and review app
- [x] Build a workflow/report panel in the review app with run, poll, memo, and exceptions flows
- [x] Verify compile/build/tests plus a focused workflow-report smoke test
- [x] Update docs and planning files for the new report-generation baseline
- **Status:** complete

### Phase 26: Editable Reports and Artifact Export
- [x] Add DD report update contracts plus workflow correction/rerun contracts
- [x] Expose report update, report export, workflow update, and workflow rerun routes
- [x] Add review-app controls for corrected workflow cells, report editing, rerun, and artifact download
- [x] Verify compile/build/tests plus a focused editable-report smoke test
- [x] Update docs and planning files for the new reviewer-loop baseline
- **Status:** complete

### Phase 27: Binary Artifacts and Reviewer History
- [x] Install workbook export dependencies and finish binary-safe DD/workflow artifact routes
- [x] Expose review-app proxy routes for workflow `.xlsx` and memo `.docx` downloads
- [x] Persist report-regeneration history when workflow cell corrections rebuild DD reports
- [x] Surface workflow/report event history in the web workspace alongside the new export actions
- [x] Verify compile/build/tests plus a focused `.xlsx`/`.docx` and event-history smoke test
- [x] Update docs and planning files for the richer artifact baseline
- **Status:** complete

### Phase 28: Structured Exports and Diff Summaries
- [x] Add workflow/report event summary fields that describe what changed, not just the previous snapshot
- [x] Persist diff-aware workflow and DD report events for direct edits and report regeneration
- [x] Upgrade workflow `.xlsx` export to include reviewer-facing sheets for citations, report sections, and history
- [x] Upgrade memo `.docx` export to include metadata, structured exceptions/summaries, and history sections
- [x] Surface diff summaries in the review workspace history panels
- [x] Verify compile/build/tests plus a focused structured-export smoke test
- [x] Update docs and planning files for the structured-export baseline
- **Status:** complete

### Phase 29: Template-Driven Artifact Layouts
- [x] Expand workflow template contracts to declare workbook sheets and memo sections structurally
- [x] Move export composition to use workflow template metadata instead of a single hardcoded layout
- [x] Keep sane fallback template behavior so existing or partial workflows stay exportable
- [x] Verify compile/build/tests plus a focused template-driven export smoke test
- [x] Update docs and planning files for the template-driven export baseline
- **Status:** complete

### Phase 30: Artifact Variants and Standards Pivot
- [x] Add workflow artifact variants so one workflow can produce multiple deliverable layouts
- [x] Persist the chosen artifact variant on workflow runs and use it during export generation
- [x] Expose artifact variant selection in the review workspace before running a workflow
- [x] Add file-backed standards templates plus persisted standards-run endpoints in the DD API
- [x] Replace the Word add-in Standards mock with a live standards comparison flow
- [x] Verify compile/build/tests plus a focused artifact-variant and standards smoke test
- [x] Update docs and planning files for the new baseline
- **Status:** complete

## Key Questions
1. What is the smallest vertical slice that proves this product direction without overcommitting to later architecture?
2. Which contracts and issue shapes should be encoded now so later ingestion and LLM extraction can slot in cleanly?
3. What is the lightest persistence and parsing stack that proves uploads now without blocking a future Postgres/worker migration?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Start with shared schemas + seed DD API + thin review app | This gives the repo a runnable product backbone while deferring the riskiest parsing and model orchestration work. |
| Keep playbooks as editable YAML files from day one | Editable playbooks are core to the product moat and should shape the API contracts early. |
| Use seeded deal data for the first end-to-end slice | Seed data lets us validate review UX and API contracts before document ingestion exists. |
| Use local `file:` package references instead of `workspace:*` | This machine's npm build rejected the workspace protocol, so `file:` links kept the monorepo installable without changing the workspace layout. |
| Use local SQLite-backed persistence for the next slice | It is the fastest way to prove real uploads and reviewable outputs before standing up Postgres and background workers. |
| Keep the demo workspace read-only | Preserving a stable demo workspace makes the app usable even before the user uploads real documents. |
| Add the new PRD deliverables as repo docs rather than code stubs | The user asked for an engineering spec, database tables, endpoint contracts, and wireframes, so the next best artifact is a clean spec package the codebase can implement against. |
| Scaffold the Word add-in as a narrow Next app before adding Office.js | This gives the repo a realistic task-pane UI target and shared contracts without prematurely locking in manifest or runtime details. |
| Use an add-in-only shared-runtime manifest that routes buttons by tab query parameter | This is the lightest clean-room way to prove ribbon-to-pane navigation before wiring real review runs or command handlers. |
| Bridge the add-in to the DD API through same-origin Next routes | This avoids mixed-content issues when the task pane runs over HTTPS and the local FastAPI service is still HTTP. |
| Persist suggestion actions by returning the full updated review run | This keeps the add-in simple because every action can replace its local state from the server response. |
| Keep action history append-only in a separate table from current suggestion status | This preserves a clean current-state row for filtering while still giving the add-in durable action history for debugging and UX context. |
| Recover drifted anchors by searching document text instead of trying to persist live Word object handles | Quote search is resilient enough for this stage and keeps the add-in stateless across pane refreshes. |
| Persist saved playbook notes in a separate table instead of folding them into static YAML immediately | This keeps the capture loop fast and auditable now while leaving full playbook editing for a later slice. |
| Let reviewers target a specific playbook check when saving notes | Captured knowledge becomes much more reusable when it lands in an intended rule bucket instead of an undifferentiated note list. |
| Treat docs alignment as a series of implementation-sized slices instead of trying to deliver the full PRD at once | This keeps the repo honest: each documented behavior either exists in runnable form now or stays clearly outside the current slice. |
| Add the normalized contracts-platform tables as a bridge under the existing workspace flow instead of replacing it outright | This preserves the working review and upload slice while creating a stable expansion path for the broader spec. |
| Add queued worker processing alongside the current synchronous paths instead of swapping everything over at once | This gives the repo a durable async execution model without breaking the current add-in and review UX. |
| Extend Ask around selection text first, not only stored document IDs | The Word add-in’s first-class context is the live document/selection, so the run contract needs to support that directly even before library-backed retrieval is broader. |
| Keep the first Draft run model compact: one generated clause plus a short ranked match list | This preserves the precedent-lookup feel in the add-in without forcing the full retrieval system to exist yet. |
| Build the first retrieval layer on top of extracted anchor segments instead of waiting for embeddings | This gives the repo a real shared library source immediately while leaving room for pgvector-backed ranking later. |
| Reuse parsed clause units as both anchor inputs and library-item inputs whenever uploads provide them | This keeps provenance tighter because Draft and search now point back to the same clause-sized source units. |
| Use query runs as the first web-side multi-document workflow before adding full templates | This proves cross-document extraction, polling, table output, and export on the shared job model without committing to a larger workflow engine yet. |
| Layer workflow runs on top of query-style extraction instead of inventing a second report engine | This keeps multi-document analysis, polling, and report assembly on one durable execution path. |
| Separate workflow cell corrections from report-text edits | Reviewers need to fix extracted answers and narrative output independently, and keeping those save loops distinct avoids conflating structured extraction with authored memo text. |
| Record DD report regeneration as its own event whenever corrected workflow rows rebuild the memo | Report history should show both direct memo edits and upstream extraction corrections so reviewers can trust the audit trail. |
| Add binary export helpers to the shared SDK instead of keeping artifact downloads as raw ad hoc fetches | The review app now needs consistent handling for text and binary artifacts, and the same helper can support future export surfaces. |
| Add compact diff summaries to workflow/report events instead of forcing every consumer to reconstruct changes from full previous snapshots | The UI and exports need human-readable audit context, and computing it once at write time is cleaner than re-diffing everywhere. |
| Use the structured-export pass to add citations/history sheets and metadata sections rather than treating formatting as a totally separate project | That keeps the artifact improvements on the existing run/report backbone and avoids another parallel export path. |
| Put workbook-sheet and memo-section layout in the workflow template instead of the repository layer | Export structure is now part of workflow behavior, so firms can vary deliverables without forking the exporter for every new report style. |
| Keep artifact variants inside the workflow template instead of creating a separate export-preset system | Variants are still workflow behavior, and this keeps deliverable style tied to the same editable YAML surface. |
| Pivot to Standards after closing the artifact loop | Standards is a more strategically important product surface than continuing to deepen export formatting. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `npm install` rejected `workspace:*` dependency URLs | 1 | Replaced internal package links with local `file:` references. |
| FastAPI `TestClient` missing `httpx` | 1 | Added `httpx` as a `dev` extra in `services/dd-api/pyproject.toml`. |
| Playbook YAML versions parsed as floats | 1 | Quoted playbook version values to match the API schema. |
| Next.js app-page typing rejected a non-promise `searchParams` signature | 1 | Matched the page prop type expected by Next's generated app types and cast the resolved params. |
| New queued jobs initially appeared stale right after enqueue/complete | 1 | Read newly created and updated job rows from the same SQLite transaction instead of a second connection before commit. |
| DOCX library item provenance can be coarser than expected | 1 | Current DOCX parsing still buckets text by page-level heading context, so section labels are a known quality gap for a later extraction pass. |
| `next typegen && tsc --noEmit` still missed generated route-type files on a clean checkout | 1 | Switched workspace `typecheck` and `lint` scripts back to `next build >/dev/null && tsc --noEmit` so route types are materialized before TypeScript runs. |
| Next route handlers rejected raw `Uint8Array` export bodies during typecheck | 1 | Wrapped binary artifact content with `Buffer.from(...)` before returning it from the review app's server routes. |

## Notes
- Re-read this plan before major decisions.
- Update findings and progress as the implementation evolves.
