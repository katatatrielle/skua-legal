from __future__ import annotations

from redis import Redis
from rq import Queue, Retry

from app.settings import get_settings


SETTINGS = get_settings()
QUEUE_NAME = "skua-default"


def get_redis_connection() -> Redis | None:
    if not SETTINGS.redis_url or not SETTINGS.use_rq:
        return None
    return Redis.from_url(SETTINGS.redis_url)


def get_queue() -> Queue | None:
    connection = get_redis_connection()
    if connection is None:
        return None
    return Queue(name=QUEUE_NAME, connection=connection, default_timeout=900)


def enqueue_job_record(job_id: str, job_type: str) -> str | None:
    queue = get_queue()
    if queue is None:
        return None
    rq_job = queue.enqueue(
        "app.rq_jobs.run_job_record",
        job_id,
        retry=Retry(max=3, interval=[10, 30, 60]),
        failure_ttl=7 * 24 * 60 * 60,
        result_ttl=24 * 60 * 60,
        job_id=f"{job_type}:{job_id}",
    )
    return rq_job.id
