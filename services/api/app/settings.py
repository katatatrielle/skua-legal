from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data"


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    jwt_issuer: str
    encryption_secret: str
    redis_url: str | None
    storage_backend: str
    s3_endpoint_url: str | None
    s3_access_key_id: str | None
    s3_secret_access_key: str | None
    s3_region: str
    source_bucket: str
    artifact_bucket: str
    use_rq: bool
    dev_user_email: str
    dev_user_password: str
    support_token: str | None
    retention_days: int
    feature_flags_json: str


def get_settings() -> Settings:
    default_sqlite_path = DATA_DIR / "platform.db"
    return Settings(
        database_url=os.getenv(
            "SKUA_DATABASE_URL",
            f"sqlite+pysqlite:///{default_sqlite_path}",
        ),
        jwt_secret=os.getenv("SKUA_JWT_SECRET", "skua-dev-secret-please-change-me-32"),
        jwt_issuer=os.getenv("SKUA_JWT_ISSUER", "skua-local"),
        encryption_secret=os.getenv("SKUA_ENCRYPTION_SECRET", "skua-local-encryption-secret"),
        redis_url=os.getenv("SKUA_REDIS_URL"),
        storage_backend=os.getenv("SKUA_STORAGE_BACKEND", "local").strip().lower(),
        s3_endpoint_url=os.getenv("SKUA_S3_ENDPOINT_URL"),
        s3_access_key_id=os.getenv("SKUA_S3_ACCESS_KEY_ID"),
        s3_secret_access_key=os.getenv("SKUA_S3_SECRET_ACCESS_KEY"),
        s3_region=os.getenv("SKUA_S3_REGION", "us-east-1"),
        source_bucket=os.getenv("SKUA_SOURCE_BUCKET", "skua-source"),
        artifact_bucket=os.getenv("SKUA_ARTIFACT_BUCKET", "skua-artifacts"),
        use_rq=os.getenv("SKUA_QUEUE_BACKEND", "auto").strip().lower() != "sqlite-only",
        dev_user_email=os.getenv("SKUA_DEV_USER_EMAIL", "founder@skua.local"),
        dev_user_password=os.getenv("SKUA_DEV_USER_PASSWORD", "changeme123"),
        support_token=os.getenv("SKUA_SUPPORT_TOKEN"),
        retention_days=int(os.getenv("SKUA_RETENTION_DAYS", "90")),
        feature_flags_json=os.getenv(
            "SKUA_FEATURE_FLAGS_JSON",
            '{"word_addin": true, "billing_controls": true, "trust_center": true, "support_admin": true}',
        ),
    )
