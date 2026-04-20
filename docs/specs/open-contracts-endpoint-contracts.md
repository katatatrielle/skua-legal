# Open Contracts for Canada - Endpoint Contracts

Status: Draft
Updated: 2026-04-19
Related:
- `docs/specs/open-contracts-engineering-spec.md`
- `docs/specs/open-contracts-word-addin-wireframes.md`

## 1. API Conventions

### Base path

- `https://api.skua.local/v1` for hosted environments
- local development can keep the current FastAPI host, but the canonical paths below should be stable

### Authentication

- bearer token in `Authorization: Bearer <token>`
- token resolves to `user_id` and `organization_id`
- all requests are tenant-scoped; cross-tenant ids must return `404`

### Common headers

- `X-Request-Id`: optional client trace id
- `Idempotency-Key`: required for create-run and export endpoints

### Timestamps and ids

- timestamps are ISO 8601 UTC strings
- ids are opaque UUID strings

### Error shape

```json
{
  "error": {
    "code": "validation_error",
    "message": "Workspace name is required.",
    "details": {
      "field": "name"
    },
    "request_id": "req_123"
  }
}
```

### Async run shape

Create endpoints for ingest, review, ask, queries, workflows, benchmarks, and exports return immediately:

```json
{
  "id": "run_123",
  "status": "queued",
  "created_at": "2026-04-19T17:08:00Z"
}
```

Follow-up `GET` endpoints return the full run record when available.

## 2. Shared Payload Fragments

### Document anchor

```json
{
  "id": "anc_123",
  "type": "word_range",
  "document_version_id": "dv_123",
  "paragraph_id": "p_89",
  "char_start": 104,
  "char_end": 181,
  "page_number": null,
  "quote": "Neither party may assign this Agreement...",
  "quote_hash": "sha256:abc",
  "ooxml_path": "/w:document[1]/w:body[1]/w:p[89]"
}
```

### Citation

```json
{
  "document_id": "doc_123",
  "document_version_id": "dv_123",
  "anchor_id": "anc_123",
  "label": "Assignment clause",
  "quote": "Neither party may assign this Agreement...",
  "page_start": null,
  "page_end": null
}
```

### Review suggestion

```json
{
  "id": "sug_123",
  "review_run_id": "rr_123",
  "anchor_id": "anc_123",
  "title": "Consent may be required on change of control",
  "issue_type": "assignment",
  "severity": "high",
  "confidence": 0.84,
  "explanation": "The assignment clause appears to prohibit transfers without a carve-out.",
  "supporting_excerpt": "Neither party may assign this Agreement...",
  "proposed_comment": "Consider adding an affiliate or change-of-control carve-out.",
  "proposed_redline": {
    "op": "replace",
    "replacement_text": "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets."
  },
  "fallback_position_text": "If broad transfer rights are not acceptable, propose an affiliate-only carve-out.",
  "status": "open",
  "citations": [
    {
      "document_id": "doc_123",
      "document_version_id": "dv_123",
      "anchor_id": "anc_123",
      "label": "Assignment clause",
      "quote": "Neither party may assign this Agreement..."
    }
  ]
}
```

## 3. Project and Document Endpoints

### `POST /v1/projects`

Create a matter or deal workspace.

Request:

```json
{
  "workspace_id": "ws_123",
  "name": "Project Maple Acquisition",
  "represented_party": "Buyer",
  "jurisdiction": "Ontario",
  "metadata": {
    "deal_type": "share_purchase",
    "counterparty": "Maple Industrial Inc."
  }
}
```

Response:

```json
{
  "id": "prj_123",
  "workspace_id": "ws_123",
  "name": "Project Maple Acquisition",
  "represented_party": "Buyer",
  "jurisdiction": "Ontario",
  "stage": "intake",
  "created_at": "2026-04-19T17:08:00Z",
  "updated_at": "2026-04-19T17:08:00Z"
}
```

### `GET /v1/projects/{id}`

Return project summary, recent runs, document counts, and export counts.

### `POST /v1/documents/upload`

Upload one or more files to a project. This stores the original file and creates `document` plus `document_version` rows.

Request:

- `multipart/form-data`
- fields:
  - `project_id`
  - `files[]`
  - `source_type` optional, default `upload`

Response:

```json
{
  "project_id": "prj_123",
  "documents": [
    {
      "document_id": "doc_123",
      "document_version_id": "dv_123",
      "name": "Vendor MSA.docx",
      "ingest_status": "uploaded"
    }
  ],
  "notes": [
    "Stored 1 file and queued ingest."
  ]
}
```

### `POST /v1/documents/{id}/ingest`

Explicitly trigger normalization and indexing for a version. This is useful when uploads and ingest are decoupled.

Request:

```json
{
  "document_version_id": "dv_123",
  "force_reingest": false
}
```

Response:

```json
{
  "id": "ing_123",
  "status": "queued",
  "document_id": "doc_123",
  "document_version_id": "dv_123",
  "created_at": "2026-04-19T17:08:00Z"
}
```

### `GET /v1/documents/{id}`

Return document metadata, versions, ingest status, and extracted fields.

## 4. Review Endpoints

### `POST /v1/review/runs`

Create a review run from Word or the web app.

Request:

```json
{
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "scope": {
    "mode": "selection",
    "anchor": {
      "type": "word_range",
      "paragraph_id": "p_89",
      "char_start": 104,
      "char_end": 181,
      "quote": "Neither party may assign this Agreement..."
    }
  },
  "review_type": "general",
  "represented_party": "Buyer",
  "jurisdiction": "Ontario",
  "audience": "internal",
  "deal_context": {
    "transaction_type": "share_purchase",
    "counterparty": "Maple Industrial Inc."
  },
  "markup_settings": {
    "comments": true,
    "tracked_changes": true,
    "fallback_position": true,
    "severity_threshold": "medium"
  },
  "playbook_ids": [
    "pb_123"
  ]
}
```

Response:

```json
{
  "id": "rr_123",
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "status": "queued",
  "review_type": "general",
  "created_at": "2026-04-19T17:08:00Z"
}
```

### `GET /v1/review/runs/{id}`

Return run metadata and suggestions if available.

Response:

```json
{
  "id": "rr_123",
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "status": "succeeded",
  "review_type": "general",
  "represented_party": "Buyer",
  "jurisdiction": "Ontario",
  "audience": "internal",
  "summary": {
    "total": 6,
    "high": 2,
    "medium": 3,
    "low": 1
  },
  "suggestions": [
    {
      "id": "sug_123",
      "review_run_id": "rr_123",
      "anchor_id": "anc_123",
      "title": "Consent may be required on change of control",
      "issue_type": "assignment",
      "severity": "high",
      "confidence": 0.84,
      "explanation": "The assignment clause appears to prohibit transfers without a carve-out.",
      "supporting_excerpt": "Neither party may assign this Agreement...",
      "proposed_comment": "Consider adding an affiliate or change-of-control carve-out.",
      "proposed_redline": {
        "op": "replace",
        "replacement_text": "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets."
      },
      "status": "open",
      "citations": [
        {
          "document_id": "doc_123",
          "document_version_id": "dv_123",
          "anchor_id": "anc_123",
          "label": "Assignment clause",
          "quote": "Neither party may assign this Agreement..."
        }
      ]
    }
  ],
  "created_at": "2026-04-19T17:08:00Z",
  "completed_at": "2026-04-19T17:08:14Z"
}
```

### `POST /v1/review/suggestions/{id}/apply`

Record a suggestion application after the Word add-in modifies the document locally.

Request:

```json
{
  "mode": "comment",
  "client_application_result": {
    "word_comment_id": "comment-51",
    "applied_anchor": {
      "type": "word_range",
      "paragraph_id": "p_89",
      "char_start": 104,
      "char_end": 181,
      "quote": "Neither party may assign this Agreement..."
    }
  },
  "edited_comment_text": "Buyer counsel note: consider adding an affiliate transfer carve-out."
}
```

Response:

```json
{
  "id": "sug_123",
  "status": "applied_comment",
  "applied_at": "2026-04-19T17:09:01Z"
}
```

### `POST /v1/review/suggestions/{id}/dismiss`

Request:

```json
{
  "reason": "Business team already approved this point."
}
```

Response:

```json
{
  "id": "sug_123",
  "status": "dismissed",
  "dismissed_at": "2026-04-19T17:09:18Z"
}
```

### `POST /v1/review/suggestions/{id}/mark-reviewed`

Request:

```json
{
  "note": "Reviewed and will address in next draft."
}
```

### `POST /v1/review/suggestions/{id}/save-to-playbook`

Save a manually curated note or fix back into a playbook or library item.

Request:

```json
{
  "target_playbook_id": "pb_123",
  "label": "Assignment clause missing affiliate carve-out",
  "severity": "high"
}
```

## 5. Playbook and Library Endpoints

### `GET /v1/playbooks`

Query parameters:

- `workspace_id`
- `scope`
- `include_archived=false`

Response:

```json
[
  {
    "id": "pb_123",
    "name": "Commercial Review Canada",
    "scope": "organization",
    "version": 4,
    "updated_at": "2026-04-18T11:30:00Z"
  }
]
```

### `POST /v1/playbooks`

Create or import a playbook.

Request:

```json
{
  "workspace_id": "ws_123",
  "name": "Commercial Review Canada",
  "source_format": "yaml",
  "definition": {
    "applies_to": {
      "contract_types": [
        "msa",
        "saas"
      ]
    },
    "rules": [
      {
        "id": "coc_consent",
        "type": "issue",
        "severity": "high",
        "instruction": "Flag lack of an affiliate/change-of-control carve-out."
      }
    ]
  }
}
```

### `POST /v1/playbooks/{id}/run`

Run a playbook against a document version or a redline span.

Request:

```json
{
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "mode": "standard_review"
}
```

### `POST /v1/library/search`

Search clauses, templates, and precedent notes.

Request:

```json
{
  "workspace_id": "ws_123",
  "project_id": "prj_123",
  "query": "assignment clause with affiliate transfer carve-out",
  "filters": {
    "contract_type": "msa",
    "governing_law": "Ontario",
    "counterparty_role": "customer"
  },
  "limit": 10
}
```

Response:

```json
{
  "items": [
    {
      "id": "lib_123",
      "title": "Customer MSA assignment clause with affiliate carve-out",
      "item_type": "clause",
      "contract_type": "msa",
      "governing_law": "Ontario",
      "preview_text": "Neither party may assign this Agreement without prior written consent, except to an affiliate...",
      "provenance": {
        "document_name": "2025 Customer MSA",
        "document_version_id": "dv_456"
      },
      "score": 0.91
    }
  ]
}
```

### `POST /v1/draft/adjust`

Auto-adjust a library clause or instruction to current document context.

Request:

```json
{
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "source_library_item_id": "lib_123",
  "target_anchor_id": "anc_987",
  "mode": "library",
  "instruction_text": null,
  "adjustment_context": {
    "represented_party": "Buyer",
    "jurisdiction": "Ontario",
    "style": "neutral_internal",
    "counterparty_name": "Maple Industrial Inc."
  }
}
```

Response:

```json
{
  "id": "dr_123",
  "status": "succeeded",
  "generated_text": "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets.",
  "citations": [
    {
      "document_id": "doc_456",
      "document_version_id": "dv_456",
      "anchor_id": "anc_456",
      "label": "Precedent clause",
      "quote": "Neither party may assign this Agreement without prior written consent..."
    }
  ]
}
```

## 6. Ask and Standards Endpoints

### `POST /v1/ask`

Ask a question over one or more source sets.

Request:

```json
{
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "selection_anchor_id": "anc_123",
  "question": "Does this agreement allow assignment on a change of control?",
  "answer_type": "plain",
  "source_toggles": {
    "current_document": true,
    "current_selection": true,
    "uploaded_references": false,
    "org_library": true,
    "legal_sources": false,
    "web_search": false
  }
}
```

Response:

```json
{
  "id": "ask_123",
  "status": "succeeded",
  "answer_type": "plain",
  "answer_markdown": "The agreement appears to prohibit assignment without consent and does not include an express change-of-control carve-out.",
  "citations": [
    {
      "document_id": "doc_123",
      "document_version_id": "dv_123",
      "anchor_id": "anc_123",
      "label": "Assignment clause",
      "quote": "Neither party may assign this Agreement..."
    }
  ]
}
```

### `POST /v1/benchmarks/runs`

Run a standards comparison against a house standard or precedent corpus.

Request:

```json
{
  "project_id": "prj_123",
  "document_version_id": "dv_123",
  "benchmark_standard_id": "std_123"
}
```

Response:

```json
{
  "id": "bm_123",
  "status": "queued",
  "created_at": "2026-04-19T17:08:00Z"
}
```

### `GET /v1/benchmarks/runs/{id}`

Response:

```json
{
  "id": "bm_123",
  "status": "succeeded",
  "coverage_score": 73.5,
  "missing_clauses": [
    "Affiliate transfer carve-out"
  ],
  "weak_clauses": [
    {
      "anchor_id": "anc_123",
      "title": "Assignment clause lacks internal reorganization carve-out"
    }
  ],
  "suggested_fixes": [
    {
      "anchor_id": "anc_123",
      "text": "Add an affiliate or change-of-control carve-out."
    }
  ]
}
```

## 7. Query, Workflow, and Report Endpoints

### `POST /v1/queries/runs`

Run multiple questions across selected documents.

Request:

```json
{
  "project_id": "prj_123",
  "name": "Commercial contract extraction",
  "document_ids": [
    "doc_123",
    "doc_456"
  ],
  "questions": [
    {
      "key": "governing_law",
      "label": "Governing law",
      "prompt": "What is the governing law?"
    },
    {
      "key": "assignment_coc",
      "label": "Assignment / change of control",
      "prompt": "Is consent required on assignment or change of control?"
    }
  ]
}
```

Response:

```json
{
  "id": "qry_123",
  "status": "queued",
  "created_at": "2026-04-19T17:08:00Z"
}
```

### `GET /v1/queries/runs/{id}`

Response:

```json
{
  "id": "qry_123",
  "project_id": "prj_123",
  "status": "succeeded",
  "questions": [
    {
      "key": "governing_law",
      "label": "Governing law"
    },
    {
      "key": "assignment_coc",
      "label": "Assignment / change of control"
    }
  ],
  "rows": [
    {
      "document_id": "doc_123",
      "document_name": "Vendor MSA.docx",
      "cells": {
        "governing_law": {
          "answer_text": "Ontario",
          "confidence": 0.97,
          "citations": [
            {
              "document_id": "doc_123",
              "document_version_id": "dv_123",
              "anchor_id": "anc_501",
              "label": "Governing law",
              "quote": "This Agreement is governed by the laws of Ontario."
            }
          ]
        },
        "assignment_coc": {
          "answer_text": "Consent required; no express change-of-control carve-out found.",
          "confidence": 0.82,
          "citations": [
            {
              "document_id": "doc_123",
              "document_version_id": "dv_123",
              "anchor_id": "anc_123",
              "label": "Assignment clause",
              "quote": "Neither party may assign this Agreement..."
            }
          ]
        }
      }
    }
  ],
  "completed_at": "2026-04-19T17:08:40Z"
}
```

### `GET /v1/queries/runs/{id}/export?format=xlsx`

Response:

```json
{
  "id": "exp_123",
  "status": "queued",
  "export_format": "xlsx",
  "source_type": "query_run",
  "source_id": "qry_123",
  "created_at": "2026-04-19T17:09:10Z"
}
```

### `POST /v1/workflows`

Create or import a workflow template.

Request:

```json
{
  "workspace_id": "ws_123",
  "name": "DD Commercial Contracts",
  "required_file_roles": [
    {
      "role": "target_contracts",
      "min_count": 1
    }
  ],
  "questions": [
    "What is the counterparty name?",
    "What is the governing law?",
    "Is consent required on assignment or change of control?"
  ],
  "exports": [
    "xlsx",
    "memo",
    "exceptions_list"
  ]
}
```

### `POST /v1/workflows/{id}/run`

Request:

```json
{
  "project_id": "prj_123",
  "input_bindings": {
    "target_contracts": [
      "doc_123",
      "doc_456"
    ]
  }
}
```

Response:

```json
{
  "id": "wf_123",
  "status": "queued",
  "created_at": "2026-04-19T17:08:00Z"
}
```

### `GET /v1/workflows/runs/{id}`

Response includes status, linked `query_run` ids, and any generated `dd_report` ids.

### `POST /v1/dd/reports`

Create a due diligence report from a completed workflow or query run.

Request:

```json
{
  "project_id": "prj_123",
  "workflow_run_id": "wf_123",
  "title": "Project Maple DD Report",
  "report_template_id": null,
  "exceptions_template_id": null
}
```

Response:

```json
{
  "id": "ddr_123",
  "status": "draft",
  "title": "Project Maple DD Report",
  "created_at": "2026-04-19T17:09:30Z"
}
```

### `GET /v1/dd/reports/{id}`

Response returns extraction table, issues list, memo markdown, exceptions markdown, and linked export ids.

### `GET /v1/exports/{id}`

Response:

```json
{
  "id": "exp_123",
  "status": "succeeded",
  "export_format": "xlsx",
  "download_url": "https://storage.example.com/exports/exp_123.xlsx",
  "expires_at": "2026-04-19T18:09:10Z"
}
```

## 8. Provider and Audit Endpoints

### `POST /v1/provider-configs`

Create or update a hosted or BYOK provider configuration.

Request:

```json
{
  "scope_type": "organization",
  "scope_id": "org_123",
  "mode": "byok",
  "provider_name": "openai",
  "endpoint_url": "https://api.openai.com/v1",
  "credential": {
    "api_key": "sk-live-redacted"
  },
  "model_allowlist": [
    "gpt-5.4-mini",
    "gpt-5.4"
  ],
  "monthly_budget_cents": 50000
}
```

Response omits raw secrets and returns a `credential_ref`.

### `GET /v1/provider-configs`

Query parameters:

- `scope_type`
- `scope_id`

### `GET /v1/audit`

Query parameters:

- `project_id`
- `target_type`
- `target_id`
- `actor_user_id`
- `action_prefix`
- `cursor`
- `limit`

Response:

```json
{
  "items": [
    {
      "id": "ae_123",
      "source_surface": "word_addin",
      "action": "suggestion.applied",
      "target_type": "review_suggestion",
      "target_id": "sug_123",
      "actor_user_id": "usr_123",
      "metadata": {
        "mode": "comment"
      },
      "created_at": "2026-04-19T17:09:01Z"
    }
  ],
  "next_cursor": null
}
```

## 9. Notes for the Current Repo

- The current `services/dd-api` endpoints can remain as a bootstrap adapter while the canonical v1 endpoints are introduced.
- The current `workspace` resource in the repo maps most closely to `project` in these contracts.
- The Word add-in should never rely on the server to mutate DOCX content directly in v1; the API stores suggestions and action receipts, and Office.js performs the actual comment and redline application.
