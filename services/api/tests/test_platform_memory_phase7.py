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
            "email": "phase7@example.com",
            "password": "changeme123",
            "full_name": "Phase Seven",
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


def test_clause_bank_crud_and_saved_clause_signal(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)

    create_response = platform_client.post(
        "/api/v1/platform/clause-bank",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "contract_type": "saas_agreement",
            "issue_type": "suspension",
            "represented_party": "customer",
            "title": "Preferred suspension fallback",
            "text": "Vendor may suspend the Services only after prior written notice and a reasonable cure period.",
            "source": "manual_entry",
        },
    )
    assert create_response.status_code == 200, create_response.text
    created = create_response.json()

    list_response = platform_client.get(
        f"/api/v1/platform/clause-bank?workspace_id={workspace_id}",
        headers=headers,
    )
    assert list_response.status_code == 200, list_response.text
    assert list_response.json()[0]["id"] == created["id"]

    update_response = platform_client.patch(
        f"/api/v1/platform/clause-bank/{created['id']}",
        headers=headers,
        json={
            "title": "Updated suspension fallback",
        },
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["title"] == "Updated suspension fallback"

    platform_db = importlib.import_module("app.platform_db")
    platform_models = importlib.import_module("app.platform_models")
    with platform_db.platform_session() as session:
        signals = list(
            session.execute(
                importlib.import_module("sqlalchemy").select(platform_models.PreferenceSignal).where(
                    platform_models.PreferenceSignal.workspace_id == workspace_id
                )
            ).scalars()
        )
        assert any(signal.signal_type == "saved_clause" for signal in signals)

    delete_response = platform_client.delete(
        f"/api/v1/platform/clause-bank/{created['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 200, delete_response.text

    after_delete = platform_client.get(
        f"/api/v1/platform/clause-bank?workspace_id={workspace_id}",
        headers=headers,
    )
    assert after_delete.status_code == 200, after_delete.text
    assert after_delete.json() == []


def test_revise_auto_uses_matching_clause_bank_entries(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
    create_response = platform_client.post(
        "/api/v1/platform/clause-bank",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "contract_type": "saas_agreement",
            "issue_type": "suspension",
            "represented_party": "customer",
            "title": "Customer suspension fallback",
            "text": "Vendor may suspend the Services only for a verified security threat or continued nonpayment after prior written notice and a reasonable cure period.",
            "source": "manual_entry",
        },
    )
    assert create_response.status_code == 200, create_response.text

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

    revise_response = platform_client.post(
        "/api/v1/platform/revise-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "selected_text": "Suspension. Vendor may suspend or disable access to the Services immediately and at its sole discretion.",
            "instruction": "Make this suspension clause customer friendly with notice and cure rights.",
            "playbook_id": "pb-saas-customer-v1",
            "clause_bank_entry_ids": [],
        },
    )
    assert revise_response.status_code == 200, revise_response.text
    revise_run = revise_response.json()
    assert "reasonable cure period" in revise_run["suggested_text"].lower()


def test_review_prefers_saved_clause_language_and_signal_ranking(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
    clause_response = platform_client.post(
        "/api/v1/platform/clause-bank",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "contract_type": "saas_agreement",
            "issue_type": "suspension",
            "represented_party": "customer",
            "title": "Preferred suspension language",
            "text": "Vendor may suspend the Services only for a verified security threat, illegal use, or material nonpayment after prior written notice and a reasonable cure period.",
            "source": "manual_entry",
        },
    )
    assert clause_response.status_code == 200, clause_response.text

    signal_response = platform_client.post(
        "/api/v1/platform/preference-signals",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "entity_type": "finding",
            "entity_id": "finding-test",
            "signal_type": "accepted_suggestion",
            "signal_value": "suspension",
            "metadata": {
                "issue_type": "suspension",
                "contract_type": "saas_agreement",
                "represented_party": "customer",
            },
        },
    )
    assert signal_response.status_code == 200, signal_response.text

    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="saas-agreement.txt",
        selection_text=(
            "SAAS AGREEMENT\n\n"
            "Analytics. Vendor may use Customer Data, usage data, and service telemetry to train machine learning systems.\n\n"
            "Suspension. Vendor may immediately suspend or disable access to the Services at its sole discretion.\n\n"
            "Fees. Vendor may increase fees on renewal terms with thirty days' notice."
        ),
    )

    review_response = platform_client.post(
        "/api/v1/platform/review-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "playbook_id": "pb-saas-customer-v1",
        },
    )
    assert review_response.status_code == 200, review_response.text
    review_run = review_response.json()

    suspension_finding = next(
        finding for finding in review_run["findings"] if finding["issue_type"] == "suspension"
    )
    assert "reasonable cure period" in (suspension_finding["redline_text"] or "").lower()
    assert suspension_finding["metadata"]["draft_source"] == "clause_bank"
    assert suspension_finding["metadata"]["preferred_clause_ids"]
    assert suspension_finding["metadata"]["preference_signal_score"] > 0
