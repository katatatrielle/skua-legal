from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from redis import Redis
from rq import Connection, Worker

ROOT_DIR = Path(__file__).resolve().parents[2]
API_DIR = ROOT_DIR / "services" / "api"

if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from app.queueing import QUEUE_NAME  # noqa: E402
from app.repository import process_next_job  # noqa: E402
from app.settings import get_settings  # noqa: E402


SETTINGS = get_settings()


def run_worker(
    *,
    worker_name: str,
    once: bool,
    poll_seconds: float,
    max_jobs: int | None,
) -> int:
    if SETTINGS.redis_url and SETTINGS.use_rq:
        redis_connection = Redis.from_url(SETTINGS.redis_url)
        with Connection(redis_connection):
            worker = Worker([QUEUE_NAME], name=worker_name)
            worker.work(burst=once, max_jobs=max_jobs)
        return 0

    processed_jobs = 0
    while True:
        job = process_next_job(worker_name)
        if job is not None:
            print(f"[{worker_name}] processed {job.id} ({job.job_type}) -> {job.status}")
            processed_jobs += 1
            if once or (max_jobs is not None and processed_jobs >= max_jobs):
                return 0
            continue

        if once:
            print(f"[{worker_name}] no queued jobs")
            return 0

        time.sleep(poll_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Skua background worker for queued parse, review, ask, revise, and cleanup jobs."
    )
    parser.add_argument(
        "--worker-name",
        default="skua-worker",
        help="Worker identity recorded on claimed jobs.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Process at most one queued job, then exit.",
    )
    parser.add_argument(
        "--poll-seconds",
        type=float,
        default=2.0,
        help="Polling interval when running continuously.",
    )
    parser.add_argument(
        "--max-jobs",
        type=int,
        default=None,
        help="Process up to this many queued jobs before exiting.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    raise SystemExit(
        run_worker(
            worker_name=arguments.worker_name,
            once=arguments.once,
            poll_seconds=arguments.poll_seconds,
            max_jobs=arguments.max_jobs,
        )
    )
