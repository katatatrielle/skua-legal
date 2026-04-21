from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _reload_app_modules() -> None:
    for name in list(sys.modules):
        if name == "app" or name.startswith("app."):
            sys.modules.pop(name, None)


def _patch_local_storage(
    *,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    storage,
    repository,
    object_storage,
) -> None:
    data_dir = tmp_path / "data"
    uploads_dir = tmp_path / "uploads"
    db_path = data_dir / "skua.db"

    monkeypatch.setattr(storage, "DATA_DIR", data_dir)
    monkeypatch.setattr(storage, "UPLOADS_DIR", uploads_dir)
    monkeypatch.setattr(storage, "DB_PATH", db_path)
    monkeypatch.setattr(repository, "UPLOADS_DIR", uploads_dir)
    monkeypatch.setattr(object_storage, "LOCAL_SOURCE_DIR", uploads_dir / "source")
    monkeypatch.setattr(object_storage, "LOCAL_ARTIFACT_DIR", uploads_dir / "artifacts")


@pytest.fixture()
def platform_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("SKUA_DATABASE_URL", f"sqlite+pysqlite:///{tmp_path / 'platform.db'}")
    monkeypatch.setenv("SKUA_QUEUE_BACKEND", "sqlite-only")
    monkeypatch.setenv("SKUA_DEV_USER_EMAIL", "founder@test.local")
    monkeypatch.setenv("SKUA_DEV_USER_PASSWORD", "changeme123")

    _reload_app_modules()
    main = importlib.import_module("app.main")
    repository = importlib.import_module("app.repository")
    storage = importlib.import_module("app.storage")
    object_storage = importlib.import_module("app.object_storage")

    _patch_local_storage(
        monkeypatch=monkeypatch,
        tmp_path=tmp_path,
        storage=storage,
        repository=repository,
        object_storage=object_storage,
    )

    with TestClient(main.app) as client:
        yield client


def _register_user(client: TestClient, *, email: str, full_name: str) -> dict[str, object]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "changeme123",
            "full_name": full_name,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_register_creates_default_workspace_and_supports_authenticated_workspace_views(
    platform_client: TestClient,
) -> None:
    payload = _register_user(
        platform_client,
        email="lawyer@example.com",
        full_name="Lawyer Example",
    )
    headers = {"Authorization": f"Bearer {payload['access_token']}"}

    workspace_ids = payload["user"]["workspace_ids"]
    assert len(workspace_ids) == 1

    me_response = platform_client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "lawyer@example.com"

    platform_workspaces = platform_client.get("/api/v1/platform/workspaces", headers=headers)
    assert platform_workspaces.status_code == 200
    assert [workspace["id"] for workspace in platform_workspaces.json()] == workspace_ids

    legacy_workspaces = platform_client.get("/api/v1/workspaces", headers=headers)
    assert legacy_workspaces.status_code == 200
    assert [workspace["id"] for workspace in legacy_workspaces.json()] == workspace_ids


def test_workspace_access_is_scoped_per_user_for_provider_configs(
    platform_client: TestClient,
) -> None:
    owner_payload = _register_user(
        platform_client,
        email="owner@example.com",
        full_name="Owner Example",
    )
    member_payload = _register_user(
        platform_client,
        email="member@example.com",
        full_name="Member Example",
    )
    owner_headers = {"Authorization": f"Bearer {owner_payload['access_token']}"}
    member_headers = {"Authorization": f"Bearer {member_payload['access_token']}"}
    owner_workspace_id = owner_payload["user"]["workspace_ids"][0]

    create_response = platform_client.post(
        "/api/v1/provider-configs",
        headers=owner_headers,
        json={
            "workspace_id": owner_workspace_id,
            "provider_name": "openai",
            "encrypted_secret": "enc-secret",
            "model_policy": {"review": "gpt-5.4"},
        },
    )
    assert create_response.status_code == 200, create_response.text
    config = create_response.json()

    owner_list = platform_client.get(
        f"/api/v1/provider-configs?workspace_id={owner_workspace_id}",
        headers=owner_headers,
    )
    assert owner_list.status_code == 200
    assert [row["id"] for row in owner_list.json()] == [config["id"]]

    member_list = platform_client.get(
        f"/api/v1/provider-configs?workspace_id={owner_workspace_id}",
        headers=member_headers,
    )
    assert member_list.status_code == 404

    member_delete = platform_client.delete(
        f"/api/v1/provider-configs/{config['id']}",
        headers=member_headers,
    )
    assert member_delete.status_code == 404


def test_project_delete_cleans_generated_artifacts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _reload_app_modules()
    repository = importlib.import_module("app.repository")
    storage = importlib.import_module("app.storage")
    object_storage = importlib.import_module("app.object_storage")

    _patch_local_storage(
        monkeypatch=monkeypatch,
        tmp_path=tmp_path,
        storage=storage,
        repository=repository,
        object_storage=object_storage,
    )

    workspace = repository.create_workspace("Artifact Cleanup Workspace")
    project = repository.get_project_by_workspace_id(workspace.id)
    assert project is not None

    artifact = object_storage.put_artifact_object(
        f"{project.id}/review-runs",
        "summary.md",
        b"review summary",
    )
    assert Path(artifact.location).exists()

    assert repository.delete_project_record(project.id) is True
    assert not Path(artifact.location).exists()
