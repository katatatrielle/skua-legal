# Skua

Skua is a solo-first, Word-native contract copilot.

The v1 product is intentionally narrow:

- review a contract in Word
- ask a cited question about the current document
- revise a clause into suggested language
- save preferred clause language for later reuse

The web app is support-only. It is not the main workflow.

## Repo Shape

```text
apps/
  word-addin/  Primary product surface
  web/         Thin support web app
services/
  api/         FastAPI backend for review, ask, revise, citations, and memory
  worker/      Background job runner
packages/
  playbooks/   File-backed starter playbooks
  prompts/     Prompt assets
  schemas/     Shared contracts
  sdk/         Typed API client helpers
```

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

### 4. Start the support web app

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

## Current v1 Implementation Baseline

### Word add-in

- review the current selection or full document
- ask cited questions against current document context
- revise a selected clause into suggested language
- save review guidance into clause-memory scaffolding
- apply comments and tracked-change redlines in Word
- relocate anchors after document drift

### Web app

- create and choose workspaces
- upload support-side PDF and DOCX files
- inspect findings, citations, memo sections, and document state

### API and worker

- document upload and parsing
- Postgres-ready platform schema with Alembic migrations and seed data
- workspace auth, memberships, and provider-config storage
- local or S3-backed source/artifact object storage
- Redis/RQ-backed queueing with worker fallback to local polling
- platform-native document ingest for web uploads and Word selection uploads
- parsed segment storage for headings, clauses, paragraphs, and tables
- anchor relocation and hybrid segment retrieval for cited downstream flows
- file-backed platform playbooks synced into the database at startup
- deterministic review runs with stored findings, citations, ranking, and apply artifacts
- persisted review runs and suggestion actions
- queued ask and revise runs
- starter playbook loading
- canonical project, document-version, job, and audit records
- structured request logging plus request IDs

## Environment Variables

Preferred variables:

- `SKUA_API_BASE_URL`
- `SKUA_ALLOWED_ORIGINS`

Compatibility fallback:

- `DD_API_BASE_URL` still works for local clients during the transition

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

- [Solo-first v1 spec](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/solo-first-word-native-contract-copilot-v1.md)
- [Legacy engineering spec](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-engineering-spec.md)
- [Legacy endpoint contracts](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-endpoint-contracts.md)
- [Legacy add-in wireframes](/Users/katerinamcmullen/Documents/GitHub/skua/docs/specs/open-contracts-word-addin-wireframes.md)

## Notes

- The repo still contains older query, workflow, and standards code paths behind the scenes. They are no longer the primary product story.
- Phases 1 through 4 of the solo-first reset are now in place: repo boundaries, visible v1 scope, platform schema/migrations, auth, storage, queueing, ingest/parsing/anchors, and the first persisted review engine.
