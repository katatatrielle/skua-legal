#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[bootstrap] installing root npm dependencies"
npm install

echo "[bootstrap] creating api virtualenv"
python3 -m venv services/api/.venv

echo "[bootstrap] installing api dependencies"
source services/api/.venv/bin/activate
pip install -e "services/api[dev]"

echo "[bootstrap] initializing platform schema"
./scripts/platform-init.sh

echo "[bootstrap] done"
echo "Start the API with: npm run dev:api"
echo "Start the web app with: SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:web"
echo "Start the add-in with: SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:word-addin"
