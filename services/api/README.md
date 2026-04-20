# API

FastAPI backend for the Skua contract copilot.

Current responsibilities:

- platform schema and Alembic migrations
- email/password auth with default workspace provisioning
- workspace memberships and provider configuration storage
- workspace and document persistence
- source-file upload and parsing
- local or S3-backed source/artifact storage
- platform-native document ingest, segment parsing, anchor relocation, and hybrid search
- platform review playbooks, deterministic review runs, ranked findings, and exact citations
- platform ask and revise runs with scope-aware retrieval and output guardrails
- canonical project and document-version records
- review runs and suggestion actions
- ask runs
- revise runs
- playbook and citation loading
- Redis/RQ-backed jobs plus local worker fallback
- job and audit records

Run:

```bash
cd /path/to/skua/services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
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

- The service still contains older workflow-oriented routes, but they are no longer the primary v1 product surface.
- `SKUA_ALLOWED_ORIGINS` controls local CORS policy.
- `services/api/.env.example` includes Postgres, Redis, queue, and object-storage settings.
