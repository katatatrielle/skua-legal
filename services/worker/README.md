# Worker

Background worker for queued Skua jobs.

Current local responsibilities:

- queued document re-ingest
- queued review-summary export
- queued Ask runs
- queued Revise runs

Run locally:

```bash
cd /Users/katerinamcmullen/Documents/GitHub/skua
services/api/.venv/bin/python services/worker/runner.py
```

Useful flags:

- `--once`
- `--max-jobs 5`
- `--worker-name local-dev-worker`
