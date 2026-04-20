# Worker

Background worker for ingestion and export tasks.

Current local responsibilities:

- claim queued jobs from the shared SQLite `job_records` table
- process queued Ask runs from the Word add-in
- process queued Draft runs from the Word add-in
- process queued document re-ingest jobs
- process queued review-summary export jobs

Run locally:

```bash
cd /Users/katerinamcmullen/Documents/GitHub/skua
services/dd-api/.venv/bin/python services/worker/runner.py
```

Useful flags:

- `--once` to process one queued job and exit
- `--max-jobs 5` to drain a bounded number of queued jobs
- `--worker-name local-dev-worker` to stamp claimed jobs with a custom worker name

Planned future responsibilities:

- PDF and DOCX parsing
- normalized text and markdown generation
- page/snippet source mapping
- chunking and embedding jobs
- deduplication
- CSV/XLSX and memo export jobs
