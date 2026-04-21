from __future__ import annotations

import tempfile
import shutil
from dataclasses import dataclass
from pathlib import Path

import boto3

from app.settings import ROOT_DIR, get_settings


SETTINGS = get_settings()
LOCAL_SOURCE_DIR = ROOT_DIR / "uploads" / "source"
LOCAL_ARTIFACT_DIR = ROOT_DIR / "uploads" / "artifacts"


@dataclass
class StoredObject:
    backend: str
    bucket: str
    key: str
    location: str


def ensure_object_storage() -> None:
    LOCAL_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    LOCAL_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def _build_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=SETTINGS.s3_endpoint_url,
        aws_access_key_id=SETTINGS.s3_access_key_id,
        aws_secret_access_key=SETTINGS.s3_secret_access_key,
        region_name=SETTINGS.s3_region,
    )


def put_source_object(namespace: str, filename: str, content: bytes) -> StoredObject:
    ensure_object_storage()
    key = f"{namespace}/{filename}"
    if SETTINGS.storage_backend == "s3":
        client = _build_s3_client()
        client.put_object(Bucket=SETTINGS.source_bucket, Key=key, Body=content)
        return StoredObject(
            backend="s3",
            bucket=SETTINGS.source_bucket,
            key=key,
            location=f"s3://{SETTINGS.source_bucket}/{key}",
        )

    local_path = LOCAL_SOURCE_DIR / key
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(content)
    return StoredObject(
        backend="local",
        bucket="local-source",
        key=key,
        location=str(local_path),
    )


def put_artifact_object(namespace: str, filename: str, content: bytes) -> StoredObject:
    ensure_object_storage()
    key = f"{namespace}/{filename}"
    if SETTINGS.storage_backend == "s3":
        client = _build_s3_client()
        client.put_object(Bucket=SETTINGS.artifact_bucket, Key=key, Body=content)
        return StoredObject(
            backend="s3",
            bucket=SETTINGS.artifact_bucket,
            key=key,
            location=f"s3://{SETTINGS.artifact_bucket}/{key}",
        )

    local_path = LOCAL_ARTIFACT_DIR / key
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(content)
    return StoredObject(
        backend="local",
        bucket="local-artifacts",
        key=key,
        location=str(local_path),
    )


def delete_object(location: str) -> None:
    if location.startswith("s3://"):
        _, remainder = location.split("s3://", 1)
        bucket, key = remainder.split("/", 1)
        client = _build_s3_client()
        client.delete_object(Bucket=bucket, Key=key)
        return

    Path(location).unlink(missing_ok=True)


def get_object_bytes(location: str) -> bytes:
    if location.startswith("s3://"):
        _, remainder = location.split("s3://", 1)
        bucket, key = remainder.split("/", 1)
        client = _build_s3_client()
        response = client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()

    return Path(location).read_bytes()


def delete_artifact_prefix(namespace: str) -> None:
    prefix = namespace.strip().strip("/")
    if not prefix:
        return

    if SETTINGS.storage_backend == "s3":
        client = _build_s3_client()
        response = client.list_objects_v2(Bucket=SETTINGS.artifact_bucket, Prefix=f"{prefix}/")
        contents = response.get("Contents", [])
        if not contents:
            return
        client.delete_objects(
            Bucket=SETTINGS.artifact_bucket,
            Delete={"Objects": [{"Key": entry["Key"]} for entry in contents]},
        )
        return

    local_path = LOCAL_ARTIFACT_DIR / prefix
    if local_path.exists():
        shutil.rmtree(local_path)


def temporary_source_file(filename: str, content: bytes) -> Path:
    suffix = Path(filename).suffix or ".bin"
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    handle.write(content)
    handle.flush()
    handle.close()
    return Path(handle.name)
