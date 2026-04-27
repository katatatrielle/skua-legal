# API

FastAPI backend for the Skua secure legal AI workbench.

Current responsibilities:

- platform schema and Alembic migrations
- email/password auth with default workspace provisioning
- workspace memberships and provider configuration storage
- provider policy resolution, BYOK validation, and encrypted secret storage
- workspace, matter, document, and document-version persistence
- source-file upload and parsing
- local or S3-backed source/artifact storage
- document ingest, segment parsing, anchor relocation, and hybrid search
- assistant-facing review, ask, and revise runs with citation-aware outputs
- live provider bridge for OpenAI or Anthropic when `SKUA_PROVIDER_BRIDGE_MODE=live`
- Word apply-event logging, preference signals, and workspace memory
- usage ledger, spend estimates, billing summaries, trust-center data, support-admin endpoints, and readiness metrics
- Redis/RQ-backed jobs plus local worker fallback
- job and audit records

Run:

```bash
cd /path/to/skua/services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
.venv/bin/python -m uvicorn app.main:app --reload
```

Initialize the platform schema and seed data:

```bash
cd /path/to/skua
./scripts/platform-init.sh
```

Run API tests:

```bash
cd /path/to/skua
npm run test:api
```

Notes:

- The service still contains some older workflow-oriented internals, but the active app packages no longer expose those flows.
- `SKUA_ALLOWED_ORIGINS` controls local CORS policy.
- `SKUA_PROVIDER_BRIDGE_MODE=deterministic` keeps local/test runs on deterministic assistant output. Set `SKUA_PROVIDER_BRIDGE_MODE=live` with `SKUA_OPENAI_API_KEY` or `SKUA_ANTHROPIC_API_KEY`, or save a workspace BYOK provider config, to use model-backed Ask/Draft output.
- `services/api/.env.example` includes Postgres, Redis, queue, object-storage, support-token, and retention settings.
