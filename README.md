# Skua

Skua is a secure legal AI workbench for lawyers who want Claude/Codex-style help on real client documents without losing control of confidential data.

The v1 wedge is intentionally narrow:

- work inside Microsoft Word
- ask cited questions about the current matter or selected clause
- draft suggested language and apply it as a Word-native edit
- run a bounded review when the lawyer asks for one
- keep reusable legal language in workspace memory
- make provider, PII, retention, deletion, cost, and audit posture visible before and after runs

The web app is a control room. It is not the main drafting or review workflow.

## Product Contract

Skua should feel closer to a legal version of Cursor than a legal-ops platform. A lawyer opens a matter, syncs the active Word document or selection, and works through one assistant surface with modes for ask, draft, and review.

Every active feature must improve one of these things:

- safe use of frontier models on client material
- Word-native document work
- source-grounded answers and edits
- workspace memory
- provider and data-boundary control

Everything else is out of the active product path until the wedge is proven.

## Repo Shape

```text
apps/
  word-addin/  Primary product surface: assistant, memory, controls
  web/         Support/control room for matters, uploads, trust, billing, release checks
services/
  api/         FastAPI backend for auth, documents, citations, assistant runs, memory, trust, usage
  worker/      Background job runner
packages/
  prompts/     Prompt assets
  schemas/     Shared contracts
  sdk/         Typed API client helpers
```

Useful retained code:

- Word document and selection sync
- parsing, segments, citations, and anchor relocation
- review, ask, and revise run contracts
- Word comments, redlines, insertion, copy, and undo helpers
- workspace auth and memberships
- provider config, BYOK validation, usage ledger, spend caps, trust profile, deletion, and audit events
- workspace clause memory

Removed from the active tree or left only as backend implementation inventory:

- DD workflows and report generation
- standards governance
- broad web-workspace analysis flows
- old pilot materials that assume the product is a contract review platform

Do not reintroduce those paths unless they directly support the secure legal AI workbench wedge.

## Local Setup

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Bootstrap the local API environment

```bash
./scripts/bootstrap-local.sh
```

For a platform-only reset without reinstalling dependencies:

```bash
./scripts/platform-init.sh
```

### 3. Start the API

```bash
npm run dev:api
```

The API runs at `http://127.0.0.1:8000`.

### 4. Start the control room

```bash
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:web
```

The web app runs at `http://127.0.0.1:3000`.

### 5. Start the Word add-in

```bash
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:word-addin
```

The add-in runs at:

- `http://127.0.0.1:3001`
- `https://localhost:3001` for Word sideloading

Local manifest path:

- `apps/word-addin/public/manifest.word.xml`

### 6. Start the worker

```bash
services/api/.venv/bin/python services/worker/runner.py
```

Useful worker modes:

- `--once`
- `--max-jobs 5`
- `--worker-name local-dev-worker`

## Current v1 Baseline

### Word add-in

- sign in and restore a session inside Word
- choose the active workspace/matter
- sync the current Word document or selection
- use one assistant surface with ask, draft, and review modes
- apply comments, tracked-change redlines, fallback inserts, and host undo
- jump from citations to the best current Word location
- save and reuse workspace legal memory
- view provider policy, spend, deletion controls, and trust posture

### Control room

- choose workspaces and upload support-side documents
- inspect cited findings and document status
- view billing, trust, support-admin, and readiness status
- keep operational controls out of the primary Word workflow

### API and worker

- document upload and parsing
- source/artifact object storage
- workspace auth and memberships
- provider policy resolution, BYOK validation, provider-secret storage, usage ledgering, and spend-cap enforcement
- parsed segment storage, anchor relocation, and retrieval
- review, ask, and revise runs with citation-aware outputs
- clause memory CRUD and preference signals
- trust-center data, audit trails, apply-event logging, support-admin overview routes, and readiness metrics
- Redis/RQ-backed queueing with local worker fallback

## Environment Variables

Preferred variables:

- `SKUA_API_BASE_URL`
- `SKUA_ALLOWED_ORIGINS`
- `SKUA_SUPPORT_TOKEN`
- `SKUA_ENCRYPTION_SECRET`

See:

- `.env.example`
- `apps/web/.env.example`
- `apps/word-addin/.env.example`
- `services/api/.env.example`

Infrastructure helpers:

- `infra/docker-compose.platform.yml`
- `infra/docker-compose.staging.yml`
- `infra/staging.env.example`

## Documentation

- [Secure legal AI workbench spec](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/secure-legal-ai-workbench-v1.md)
- [Legacy solo-first contract copilot spec](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/solo-first-word-native-contract-copilot-v1.md)
- [Word add-in QA matrix](/Users/katerinamcmullen/Documents/GitHub/skua/docs/testing/word-addin-phase6-qa-matrix.md)
- [Computer-control test plan](/Users/katerinamcmullen/Documents/GitHub/skua/docs/testing/phase10-computer-control-test-plan.md)

## Reset Rule

When in doubt, ask whether the change helps a lawyer safely use a powerful AI model on a confidential Word document. If not, it belongs outside the active v1 path.
