# Open Contracts for Canada - Endpoint Contracts

Status: Draft  
Updated: 2026-04-20  
Scope: Canonical API contracts for the solo-first contract review architecture  
Related:
- `docs/specs/open-contracts-engineering-spec.md`
- `docs/specs/open-contracts-word-addin-wireframes.md`

## 1. API Conventions

### Base path

- hosted: `https://api.skua.local/v1`
- local development may still proxy through the existing FastAPI service under `services/dd-api`

Legacy DD-oriented routes may remain available during migration, but the paths below are the canonical product direction.

### Authentication

- bearer token in `Authorization: Bearer <token>`
- token resolves to `user_id` and `workspace_id`
- cross-workspace ids return `404`

### Common headers

- `X-Request-Id`: optional client trace id
- `Idempotency-Key`: required for create-run endpoints

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

### Async response shape

Create endpoints for ingest and long-running runs return immediately:

```json
{
  "id": "run_123",
  "status": "queued",
  "created_at": "2026-04-20T14:00:00Z"
}
```

## 2. Shared Resource Shapes

### Workspace

```json
{
  "id": "ws_123",
  "name": "KMC Law",
  "owner_user_id": "usr_123",
  "plan_type": "solo",
  "hosted_or_byok": "hosted",
  "created_at": "2026-04-20T14:00:00Z"
}
```

### Matter

```json
{
  "id": "mat_123",
  "workspace_id": "ws_123",
  "title": "Northshore Vendor MSA",
  "client_name": "Northshore",
  "matter_type": "commercial_contract_review",
  "status": "active",
  "created_at": "2026-04-20T14:00:00Z"
}
```

### Document

```json
{
  "id": "doc_123",
  "matter_id": "mat_123",
  "filename": "Vendor MSA.docx",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "source_type": "word_addin",
  "current_version_id": "dv_123",
  "created_at": "2026-04-20T14:00:00Z"
}
```

### Document version

```json
{
  "id": "dv_123",
  "document_id": "doc_123",
  "version_number": 3,
  "storage_key": "documents/doc_123/v3.docx",
  "sha256": "abc123",
  "parsed_status": "parsed",
  "indexing_status": "indexed",
  "uploaded_at": "2026-04-20T14:00:00Z"
}
```

### Parsed document

```json
{
  "id": "pd_123",
  "document_version_id": "dv_123",
  "title": "Vendor Master Services Agreement",
  "parse_schema_version": "2026-04-20",
  "raw_text": "Full extracted text omitted here",
  "structure_json": {}
}
```

### Document segment

```json
{
  "id": "seg_123",
  "document_version_id": "dv_123",
  "segment_type": "clause",
  "ordinal": 42,
  "text": "Neither party may assign this Agreement without prior written consent...",
  "anchor_json": {
    "paragraph_ordinal": 89,
    "quote": "Neither party may assign this Agreement...",
    "prefix": "Assignment.",
    "suffix": "This Agreement binds successors.",
    "ooxml_path": "/w:document[1]/w:body[1]/w:p[89]"
  },
  "parent_segment_id": "seg_120"
}
```

### Citation

```json
{
  "id": "cit_123",
  "document_version_id": "dv_123",
  "segment_id": "seg_123",
  "quote_text": "Neither party may assign this Agreement...",
  "anchor_json": {
    "paragraph_ordinal": 89
  },
  "citation_kind": "support"
}
```

## 3. Workspace, Provider, and Matter Endpoints

### `POST /v1/workspaces`

Create a workspace.

Request:

```json
{
  "name": "KMC Law"
}
```

### `GET /v1/workspaces/{id}`

Return workspace summary, current plan, provider mode, monthly usage summary, and recent matters.

### `POST /v1/workspaces/{id}/provider-configs`

Create or update hosted/BYOK provider settings.

Request:

```json
{
  "provider_name": "openai",
  "mode": "byok",
  "api_key": "sk-live-redacted",
  "model_policy": {
    "allowed_models": ["gpt-5.4-mini", "gpt-5.4"],
    "default_model": "gpt-5.4-mini"
  }
}
```

### `POST /v1/matters`

Create a matter.

Request:

```json
{
  "workspace_id": "ws_123",
  "title": "Northshore Vendor MSA",
  "client_name": "Northshore",
  "matter_type": "commercial_contract_review"
}
```

### `GET /v1/matters/{id}`

Return matter summary, documents, recent runs, and clause-bank activity.

## 4. Document Endpoints

### `POST /v1/documents/upload`

Upload one or more files and create document plus document-version rows.

Request:

- `multipart/form-data`
- fields:
  - `matter_id`
  - `files[]`
  - `source_type` optional, default `uploaded`

Response:

```json
{
  "matter_id": "mat_123",
  "documents": [
    {
      "document_id": "doc_123",
      "document_version_id": "dv_123",
      "filename": "Vendor MSA.docx",
      "ingest_status": "queued"
    }
  ]
}
```

### `POST /v1/document-versions/{id}/ingest`

Queue parsing and indexing.

Request:

```json
{
  "force_reingest": false
}
```

### `GET /v1/document-versions/{id}`

Return document-version status plus parsed-document metadata.

### `GET /v1/document-versions/{id}/segments`

Return paginated segments and anchors for citation or debugging surfaces.

Query params:

- `segment_type`
- `page`
- `page_size`

## 5. Playbook Endpoints

### `GET /v1/playbooks`

List workspace playbooks.

### `POST /v1/playbooks`

Create a playbook.

Request:

```json
{
  "workspace_id": "ws_123",
  "name": "Vendor MSA - Buyer Side",
  "contract_type": "msa",
  "represented_party": "buyer",
  "is_default": true,
  "config_json": {
    "issue_rules": [],
    "must_have_clauses": [],
    "preferred_fallbacks": []
  }
}
```

### `PUT /v1/playbooks/{id}`

Update playbook structure, preferences, and severity mapping.

## 6. Review Endpoints

### Review run

```json
{
  "id": "rr_123",
  "workspace_id": "ws_123",
  "matter_id": "mat_123",
  "document_version_id": "dv_123",
  "playbook_id": "pb_123",
  "run_type": "review",
  "status": "running",
  "provider_name": "openai",
  "model_name": "gpt-5.4-mini",
  "estimated_cost": 0.42,
  "actual_cost": null,
  "created_at": "2026-04-20T14:00:00Z",
  "completed_at": null
}
```

### Finding

```json
{
  "id": "find_123",
  "review_run_id": "rr_123",
  "finding_type": "assignment",
  "title": "Consent may be required on change of control",
  "explanation": "The clause prohibits assignment without a carve-out for internal reorganizations or affiliate transfers.",
  "severity": "high",
  "confidence": 0.84,
  "disposition": "open",
  "proposed_action_type": "redline",
  "source_segment_id": "seg_123",
  "citations": [
    {
      "id": "cit_123",
      "document_version_id": "dv_123",
      "segment_id": "seg_123",
      "quote_text": "Neither party may assign this Agreement..."
    }
  ]
}
```

### `POST /v1/review/runs`

Create a review run.

Request:

```json
{
  "workspace_id": "ws_123",
  "matter_id": "mat_123",
  "document_version_id": "dv_123",
  "playbook_id": "pb_123",
  "scope": {
    "mode": "selection",
    "anchor_json": {
      "paragraph_ordinal": 89,
      "quote": "Neither party may assign this Agreement..."
    }
  },
  "represented_party": "buyer",
  "contract_type": "msa",
  "provider_policy": {
    "provider_name": "openai",
    "model_name": "gpt-5.4-mini"
  },
  "cost_budget": {
    "warn_at_usd": 1.0,
    "block_at_usd": 3.0
  }
}
```

### `GET /v1/review/runs/{id}`

Return run status plus findings and citations when available.

### `POST /v1/findings/{id}/actions`

Record an explicit user action from the add-in.

Request:

```json
{
  "action": "apply_redline",
  "actor_surface": "word_addin",
  "post_apply_anchor_json": {
    "paragraph_ordinal": 91,
    "quote": "Neither party may assign..."
  },
  "edited_text": null
}
```

Allowed actions:

- `accept`
- `dismiss`
- `mark_reviewed`
- `apply_comment`
- `apply_redline`
- `save_clause`

## 7. Ask Endpoints

### Ask run

```json
{
  "id": "ask_123",
  "workspace_id": "ws_123",
  "matter_id": "mat_123",
  "document_version_id": "dv_123",
  "question_text": "Does this agreement allow assignment on a change of control?",
  "selected_scope_json": {
    "mode": "full_document"
  },
  "status": "succeeded",
  "provider_name": "openai",
  "model_name": "gpt-5.4-mini",
  "estimated_cost": 0.11,
  "actual_cost": 0.09
}
```

### Ask answer

```json
{
  "id": "ans_123",
  "ask_run_id": "ask_123",
  "answer_text": "The agreement appears to prohibit assignment without consent, including on a change of control, because no carve-out is stated.",
  "confidence": 0.82,
  "citations": [
    {
      "id": "cit_123",
      "segment_id": "seg_123",
      "quote_text": "Neither party may assign this Agreement..."
    }
  ],
  "created_at": "2026-04-20T14:00:00Z"
}
```

### `POST /v1/ask/runs`

Create an ask run.

Request:

```json
{
  "workspace_id": "ws_123",
  "matter_id": "mat_123",
  "document_version_id": "dv_123",
  "question_text": "Does this agreement allow assignment on a change of control?",
  "selected_scope_json": {
    "mode": "selection"
  }
}
```

### `GET /v1/ask/runs/{id}`

Return run status plus answer and citations.

## 8. Revise Endpoints

### `POST /v1/revise/runs`

Create a clause-revision run.

Request:

```json
{
  "workspace_id": "ws_123",
  "matter_id": "mat_123",
  "document_version_id": "dv_123",
  "instruction_text": "Rewrite this in supplier-friendly language.",
  "selected_scope_json": {
    "mode": "selection",
    "anchor_json": {
      "paragraph_ordinal": 89
    }
  },
  "playbook_id": "pb_123"
}
```

### `GET /v1/revise/runs/{id}`

Return run status and revised clause options.

Example result:

```json
{
  "id": "rev_123",
  "status": "succeeded",
  "revised_text": "Neither party may assign this Agreement without consent, except to an affiliate or in connection with a reorganization or sale of substantially all assets.",
  "explanation": "This revision preserves a consent baseline while adding standard internal-transfer flexibility.",
  "citations": [
    {
      "id": "cit_123",
      "segment_id": "seg_123",
      "quote_text": "Neither party may assign this Agreement..."
    }
  ],
  "clause_bank_entries_used": ["cbe_123"]
}
```

## 9. Clause Bank and Preference Endpoints

### Clause bank entry

```json
{
  "id": "cbe_123",
  "workspace_id": "ws_123",
  "title": "Affiliate carve-out fallback",
  "contract_type": "msa",
  "issue_type": "assignment",
  "clause_text": "Neither party may assign...",
  "source": "accepted_suggestion",
  "tags_json": ["buyer_side", "fallback"],
  "usage_count": 7
}
```

### `GET /v1/clause-bank`

List clause-bank entries with filters for contract type, issue type, and tag.

### `POST /v1/clause-bank`

Create a saved clause manually or from an accepted suggestion.

### `PUT /v1/clause-bank/{id}`

Update title, tags, or clause text.

### `GET /v1/preference-signals`

Optional internal-facing endpoint to inspect saved user preference signals for debugging and ranking analysis.

## 10. Usage and Audit Endpoints

### `GET /v1/usage/summary`

Return workspace-level usage totals, monthly cost, and threshold state.

Example:

```json
{
  "workspace_id": "ws_123",
  "current_month": "2026-04",
  "estimated_cost_usd": 18.2,
  "actual_cost_usd": 16.7,
  "warnings": []
}
```

### `GET /v1/usage/ledger`

Return run-level token and cost records.

### `GET /v1/audit-events`

Return recent workspace audit events.

Example:

```json
{
  "id": "aud_123",
  "workspace_id": "ws_123",
  "actor_user_id": "usr_123",
  "event_type": "finding.apply_redline",
  "entity_type": "finding",
  "entity_id": "find_123",
  "payload_json": {
    "surface": "word_addin"
  },
  "created_at": "2026-04-20T14:00:00Z"
}
```
