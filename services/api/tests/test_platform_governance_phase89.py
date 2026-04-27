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
    monkeypatch.setenv("SKUA_SUPPORT_TOKEN", "support-secret")

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


def _register_user(client: TestClient, email: str) -> tuple[dict[str, str], str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "changeme123",
            "full_name": "Phase Eight Nine",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    return {"Authorization": f"Bearer {payload['access_token']}"}, payload["user"]["workspace_ids"][0]


def _upload_selection(
    client: TestClient,
    *,
    headers: dict[str, str],
    workspace_id: str,
    document_name: str,
    selection_text: str,
) -> dict:
    response = client.post(
        "/api/v1/platform/documents/selection",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_name": document_name,
            "selection_text": selection_text,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_byok_provider_config_and_usage_billing_summary(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client, "phase89-a@example.com")
    provider_response = platform_client.post(
        "/api/v1/provider-configs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "provider_name": "openai",
            "encrypted_secret": "sk-test-secret-123456",
            "model_policy": {
                "review": "gpt-5.4-mini",
                "ask": "gpt-5.4-mini",
                "revise": "gpt-5.4-mini",
                "monthly_warning_usd": 1.0,
                "monthly_hard_cap_usd": 10.0,
                "per_run_max_estimate_usd": 2.0,
            },
        },
    )
    assert provider_response.status_code == 200, provider_response.text
    provider = provider_response.json()
    assert provider["plan_type"] == "byok"
    assert provider["has_secret"] is True
    assert provider["masked_secret"].startswith("sk-")
    assert provider["encrypted_secret"] is None

    upload = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="services.txt",
        selection_text="Termination for Convenience. Customer may terminate on thirty days' prior written notice. Notice contact: counsel@example.com.",
    )
    version_id = upload["document_version"]["id"]

    estimate_response = platform_client.post(
        "/api/v1/platform/spend-estimate",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "run_type": "ask",
            "document_version_id": version_id,
            "question": "Can the customer terminate for convenience?",
        },
    )
    assert estimate_response.status_code == 200, estimate_response.text
    estimate = estimate_response.json()
    assert estimate["provider"] == "openai"
    assert estimate["plan_type"] == "byok"
    assert estimate["data_boundary"]["scope_label"] == "the synced document"
    assert "email address" in estimate["data_boundary"]["sensitivity_flags"]
    assert estimate["estimated_input_tokens"] > len("Can the customer terminate for convenience?") // 4

    ask_response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": version_id,
            "question": "Can the customer terminate for convenience?",
        },
    )
    assert ask_response.status_code == 200, ask_response.text

    billing_response = platform_client.get(
        f"/api/v1/platform/workspaces/{workspace_id}/billing",
        headers=headers,
    )
    assert billing_response.status_code == 200, billing_response.text
    billing = billing_response.json()
    assert billing["plan_type"] == "byok"
    assert billing["run_count"] >= 1
    assert billing["actual_cost"] > 0
    assert billing["recent_runs"][0]["provider"] == "openai"


def test_anthropic_provider_config_uses_claude_defaults(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client, "phase89-anthropic@example.com")
    provider_response = platform_client.post(
        "/api/v1/provider-configs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "provider_name": "anthropic",
            "encrypted_secret": "sk-ant-test-secret-123456",
            "model_policy": {
                "plan": "byok",
                "monthly_warning_usd": 1.0,
                "monthly_hard_cap_usd": 10.0,
                "per_run_max_estimate_usd": 2.0,
            },
        },
    )
    assert provider_response.status_code == 200, provider_response.text
    provider = provider_response.json()
    assert provider["plan_type"] == "byok"
    assert provider["model_policy"]["ask"] == "claude-sonnet-4-20250514"
    assert provider["model_policy"]["review"] == "claude-sonnet-4-20250514"


def test_spend_controls_block_over_limit_runs(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client, "phase89-b@example.com")
    provider_response = platform_client.post(
        "/api/v1/provider-configs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "provider_name": "openai",
            "encrypted_secret": "sk-test-secret-abcdef",
            "model_policy": {
                "ask": "gpt-5.4",
                "monthly_warning_usd": 0.0001,
                "monthly_hard_cap_usd": 0.0002,
                "per_run_max_estimate_usd": 0.00001,
            },
        },
    )
    assert provider_response.status_code == 200, provider_response.text

    upload = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="long.txt",
        selection_text=" ".join(["termination"] * 600),
    )
    version_id = upload["document_version"]["id"]

    estimate_response = platform_client.post(
        "/api/v1/platform/spend-estimate",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "run_type": "ask",
            "document_version_id": version_id,
            "question": " ".join(["What"] * 400),
        },
    )
    assert estimate_response.status_code == 200, estimate_response.text
    assert estimate_response.json()["blocked"] is True

    ask_response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": version_id,
            "question": " ".join(["What"] * 400),
        },
    )
    assert ask_response.status_code == 400, ask_response.text
    assert "Blocked" in ask_response.json()["detail"]


def test_audit_apply_delete_trust_and_admin_endpoints(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client, "phase89-c@example.com")
    upload = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="nda.txt",
        selection_text="Confidentiality. Recipient will return Confidential Information on request.",
    )
    document_id = upload["document_version"]["document_id"]

    apply_response = platform_client.post(
        "/api/v1/platform/apply-events",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "event_type": "comment_applied",
            "target_anchor": {"quote": "Recipient will return Confidential Information"},
        },
    )
    assert apply_response.status_code == 200, apply_response.text

    audit_response = platform_client.get(
        f"/api/v1/platform/workspaces/{workspace_id}/audit-events?limit=20",
        headers=headers,
    )
    assert audit_response.status_code == 200, audit_response.text
    audit_rows = audit_response.json()
    assert any(row["action"] == "document.uploaded" for row in audit_rows)
    assert any(row["action"] == "apply.comment_applied" for row in audit_rows)
    assert any(row["actor_user_id"] for row in audit_rows)

    delete_response = platform_client.delete(
        f"/api/v1/platform/documents/{document_id}",
        headers=headers,
    )
    assert delete_response.status_code == 200, delete_response.text

    trust_response = platform_client.get("/api/v1/platform/trust")
    assert trust_response.status_code == 200, trust_response.text
    trust = trust_response.json()
    assert "Skua does not use customer document content to train its own models." == trust["training_policy"]

    admin_response = platform_client.get(
        "/api/v1/platform/admin/overview?user_email=phase89-c@example.com",
        headers={"x-skua-support-token": "support-secret"},
    )
    assert admin_response.status_code == 200, admin_response.text
    admin = admin_response.json()
    assert admin["support_lookup"]["email"] == "phase89-c@example.com"
    assert any(flag["key"] == "support_admin" for flag in admin["feature_flags"])
