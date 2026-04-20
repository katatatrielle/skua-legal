from __future__ import annotations

from app.repository import process_job


def run_job_record(job_id: str) -> dict[str, str]:
    result = process_job(job_id, worker_name="rq-worker")
    return {
        "job_id": job_id,
        "status": result.status if result is not None else "missing",
    }
