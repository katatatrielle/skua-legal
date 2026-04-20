# DD API

FastAPI service for due diligence orchestration.

Current responsibilities:

- playbook execution
- standards template loading and house-standard comparison runs
- seeded workspace and issue payloads
- local SQLite-backed workspaces, documents, pages, and issues
- canonical project, document-version, anchor, job, and audit records layered over the local workspace flow
- clause-level library extraction and metadata-aware search over uploaded document versions
- queue-backed query runs for multi-document extraction tables and CSV export
- file-backed workflow templates plus queue-backed DD report generation
- persisted DD report updates, workflow/report event history with change summaries, multi-sheet workflow/xlsx and richer memo/docx exports, and workflow rerun support
- persisted review runs and review suggestions for Word-selection review
- queue-backed ingest replay, Ask runs, Draft runs, and review-export jobs for work that should run outside the request path
- synchronous PDF/DOCX parsing for uploaded files
- issue filtering by severity, status, type, and document type
- first-pass memo and exceptions-list output

## Run

```bash
cd /Users/katerinamcmullen/Documents/GitHub/skua/services/dd-api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Endpoints

- `GET /healthz`
- `GET /api/v1/playbooks`
- `GET /api/v1/workflows/templates`
- `GET /api/v1/standards/templates`
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
- `GET /api/v1/workflows/runs/{workflow_run_id}/export`
- `GET /api/v1/dd/reports/{dd_report_id}`
- `PUT /api/v1/dd/reports/{dd_report_id}`
- `GET /api/v1/dd/reports/{dd_report_id}/export`
- `POST /api/v1/standards/runs`
- `GET /api/v1/standards/runs/{standards_run_id}`
- `POST /api/v1/review/runs`
- `GET /api/v1/review/runs/{review_run_id}`
- `POST /api/v1/review/runs/{review_run_id}/export-summary`
- `POST /api/v1/review/runs/{review_run_id}/queue-export-summary`
- `POST /api/v1/review/suggestions/{suggestion_id}/apply`
- `POST /api/v1/review/suggestions/{suggestion_id}/dismiss`
- `POST /api/v1/review/suggestions/{suggestion_id}/mark-reviewed`
- `POST /api/v1/review/suggestions/{suggestion_id}/save-to-playbook`
- `GET /api/v1/audit`

## Notes

- Playbooks are loaded directly from `/Users/katerinamcmullen/Documents/GitHub/skua/packages/playbooks`.
- Uploaded workspaces are stored in local SQLite at `/Users/katerinamcmullen/Documents/GitHub/skua/data/skua.db`.
- Uploaded files are stored under `/Users/katerinamcmullen/Documents/GitHub/skua/uploads`.
- The demo workspace `project-redwood` is read-only; create a new workspace for live uploads.
- Current issue spotting is heuristic and deterministic. It is a bridge to later prompt-driven extraction jobs.
- The review-run endpoints currently operate on submitted selection text from the Word add-in. Suggestion actions now also persist back into the same review run record, and the API keeps a lightweight suggestion event log with client messages and post-apply anchor context.
- Saved playbook notes are stored locally in SQLite so the add-in can build a lightweight knowledge-capture loop before full playbook editing lands.
- Saved playbook notes now keep optional target check IDs as well, so review-time captures can point at a specific playbook bucket instead of only a whole playbook.
- Review summary exports are stored locally in SQLite as markdown snapshots so the Word add-in can push completed reviews back into the project workspace.
- Ask runs are persisted and queue-backed as well, so the Word add-in can submit a question, poll the result, and let the worker complete the cited answer.
- Draft runs are persisted and queue-backed too, so the Word add-in can submit a drafting request, poll the result, and receive adjusted text plus precedent-style matches.
- Library items are now extracted from clause-like upload units, keep page/source provenance, and support basic document-type, governing-law, counterparty, and document-name filtering.
- Query runs are persisted and queue-backed as well, so the web app can submit a multi-document question list, poll for completion, render a table, and export it as CSV.
- Workflow templates are loaded from `/Users/katerinamcmullen/Documents/GitHub/skua/packages/workflows`, and workflow runs now generate DD reports with memo markdown, exceptions, and document summaries.
- Workflow templates now also define workbook sheets, memo sections, and artifact variants, so export composition is template-driven instead of fixed in code.
- Standards templates are loaded from `/Users/katerinamcmullen/Documents/GitHub/skua/packages/standards`, and standards runs now compare submitted clause text against a file-backed house standard with coverage, missing-clause, and weak-clause output.
- Workflow runs can now export their current results as multi-sheet `.xlsx` artifacts with results, citations, report sections, and history.
- DD reports can export richer memo `.docx` artifacts with metadata, exceptions, document summaries, and report history sections.
- DD reports can now be edited after generation, workflow row corrections can regenerate report content from reviewer-adjusted cells, and both layers keep lightweight append-only event history with change summaries for reviewer/system changes.
- Existing local databases are backfilled on startup so older `workspaces` and `documents` gain matching canonical `projects` and `document_versions` automatically.
- Queued jobs are stored in the same SQLite database for now, and `services/worker/runner.py` claims and processes them one at a time for local development.
