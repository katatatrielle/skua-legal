#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [ -f "services/api/.venv/bin/activate" ]; then
  source services/api/.venv/bin/activate
fi

if [ -z "${SKUA_DATABASE_URL:-}" ]; then
  export SKUA_DATABASE_URL="sqlite+pysqlite:///$ROOT_DIR/data/platform.db"
fi

cd services/api
alembic upgrade head
python - <<'PY'
from app.platform_db import platform_session
from app.platform_seed import seed_platform_dev_data

with platform_session() as session:
    seed_platform_dev_data(session)
PY
