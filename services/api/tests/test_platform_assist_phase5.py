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


def _register_user(client: TestClient) -> tuple[dict[str, str], str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "phase5@example.com",
            "password": "changeme123",
            "full_name": "Phase Five",
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
) -> str:
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
    return response.json()["document_version"]["id"]


def test_platform_ask_run_returns_cited_answer(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="services.txt",
        selection_text=(
            "TERM AND TERMINATION\n\n"
            "Termination for Convenience. Customer may terminate this Agreement for convenience on thirty days' prior written notice.\n\n"
            "Transition Assistance. Vendor will provide reasonable transition assistance for sixty days after termination."
        ),
    )
    response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "question": "Can the customer terminate for convenience?",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["answer"]["supported"] is True
    assert 1 <= len(payload["answer"]["citations"]) <= 3
    assert len(payload["answer"]["answer_text"]) <= 320
    assert "terminate" in payload["answer"]["answer_text"].lower()

    list_response = platform_client.get(
        f"/api/v1/platform/document-versions/{document_version_id}/ask-runs",
        headers=headers,
    )
    assert list_response.status_code == 200, list_response.text
    assert list_response.json()[0]["id"] == payload["id"]


def test_platform_ask_uses_provider_bridge_when_available(
    platform_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers, workspace_id = _register_user(platform_client)
    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="provider.txt",
        selection_text="Termination. Customer may terminate for convenience on thirty days' prior written notice.",
    )
    platform_assist = importlib.import_module("app.platform_assist")
    provider_bridge = importlib.import_module("app.platform_provider_bridge")
    calls: list[dict[str, object]] = []

    def fake_generate_provider_text(*args, **kwargs):
        calls.append(kwargs)
        return provider_bridge.ProviderGeneration(
            text="Based on the cited clause, the customer may terminate for convenience on thirty days' prior written notice.",
            provider="openai",
            model="gpt-5.4-mini",
            input_tokens=100,
            output_tokens=24,
        )

    monkeypatch.setattr(platform_assist, "generate_provider_text", fake_generate_provider_text)
    response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "question": "Can the customer terminate for convenience?",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert calls
    assert payload["answer"]["answer_text"].startswith("Based on the cited clause")


def test_platform_ask_selection_scope_prefers_local_context(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
    selected_clause = "Notice. Customer must give ten days' prior written notice before termination."
    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="notice.txt",
        selection_text=(
            "General Notice. Either party may give thirty days' prior written notice for ordinary updates.\n\n"
            f"{selected_clause}\n\n"
            "Pricing Notice. Vendor may increase fees on sixty days' prior written notice."
        ),
    )
    response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "question": "What notice period applies before termination?",
            "selection_text": selected_clause,
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    citations = payload["answer"]["citations"]
    assert citations
    assert any("ten days" in citation["quote"].lower() for citation in citations)


def test_platform_ask_refuses_unsupported_factual_claims(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="nda.txt",
        selection_text=(
            "CONFIDENTIALITY\n\n"
            "Recipient will protect Confidential Information using reasonable safeguards and return it on request."
        ),
    )
    response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "question": "Does the agreement require arbitration in New York?",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["answer"]["supported"] is False
    assert payload["answer"]["citations"] == []
    assert "can't support" in payload["answer"]["answer_text"].lower()


def test_platform_revise_uses_clause_bank_before_playbook_defaults(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="saas.txt",
        selection_text=(
            "Suspension. Vendor may suspend or disable access to the Services immediately and at its sole discretion.\n\n"
            "Security. Vendor will maintain reasonable security measures."
        ),
    )

    platform_db = importlib.import_module("app.platform_db")
    platform_models = importlib.import_module("app.platform_models")
    with platform_db.platform_session() as session:
        entry = platform_models.ClauseBankEntry(
            id="cbe-suspension-test",
            workspace_id=workspace_id,
            contract_type="saas_agreement",
            issue_type="suspension",
            represented_party="customer",
            title="Preferred suspension clause",
            text="Vendor may suspend the Services only after prior written notice and a reasonable cure period, except where immediate suspension is necessary to prevent a verified security threat.",
            source="manual_entry",
        )
        session.add(entry)

    response = platform_client.post(
        "/api/v1/platform/revise-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "selected_text": "Suspension. Vendor may suspend or disable access to the Services immediately and at its sole discretion.",
            "instruction": "Make this suspension clause customer friendly with notice and cure rights.",
            "playbook_id": "pb-saas-customer-v1",
            "clause_bank_entry_ids": ["cbe-suspension-test"],
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["suggested_text"].startswith("Suggested language:")
    assert "reasonable cure period" in payload["suggested_text"].lower()
    assert payload["citations"]
    assert payload["rationale"].startswith("Suggested language:")

    detail_response = platform_client.get(
        f"/api/v1/platform/revise-runs/{payload['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200, detail_response.text
    assert detail_response.json()["id"] == payload["id"]
