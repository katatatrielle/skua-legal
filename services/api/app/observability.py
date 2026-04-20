from __future__ import annotations

import logging
import sys
from uuid import uuid4

import structlog
from fastapi import Request, Response


def configure_logging() -> None:
    processors = [
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


LOGGER = structlog.get_logger("skua.api")


async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id", "").strip() or f"req-{uuid4().hex[:12]}"
    request.state.request_id = request_id
    LOGGER.info(
        "request.started",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )
    response: Response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    LOGGER.info(
        "request.completed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
    )
    return response
