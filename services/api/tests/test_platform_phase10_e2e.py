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
            "full_name": "Phase Ten",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    return {"Authorization": f"Bearer {payload['access_token']}"}, payload["user"]["workspace_ids"][0]


def _upload_text_document(
    client: TestClient,
    *,
    headers: dict[str, str],
    workspace_id: str,
    filename: str,
    content: str,
) -> dict[str, object]:
    response = client.post(
        "/api/v1/platform/documents/upload",
        headers=headers,
        data={
            "workspace_id": workspace_id,
            "source_kind": "web_upload",
        },
        files=[("files", (filename, content.encode("utf-8"), "text/plain"))],
    )
    assert response.status_code == 200, response.text
    return response.json()[0]


def test_platform_phase10_end_to_end_flow_and_release_dashboard(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client, "phase10-happy@example.com")
    upload = _upload_text_document(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        filename="pilot-services.txt",
        content=(
            "MASTER SERVICES AGREEMENT\n\n"
            "Acceptance. Fees are due on receipt and the Agreement does not include any acceptance testing or rejection rights.\n\n"
            "Termination for Convenience. Vendor may terminate this Agreement for convenience on ten days' notice.\n\n"
            "Subcontracting. Vendor may subcontract any obligation without notice.\n\n"
            "Limitation of Liability. Vendor's total liability will never exceed fees paid under this Agreement.\n\n"
            "Auto Renewal. This Agreement renews automatically for successive one-year terms unless Customer gives notice at least sixty days before renewal.\n"
        ),
    )
    document_version_id = upload["document_version"]["id"]

    review_response = platform_client.post(
        "/api/v1/platform/review-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "playbook_id": "pb-services-customer-v1",
        },
    )
    assert review_response.status_code == 200, review_response.text
    review_run = review_response.json()
    assert review_run["status"] == "completed"
    assert review_run["findings"]

    first_finding = review_run["findings"][0]
    apply_response = platform_client.post(
        "/api/v1/platform/apply-events",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "review_run_id": review_run["id"],
            "finding_id": first_finding["id"],
            "event_type": "comment_applied",
            "target_anchor": first_finding["citations"][0]["anchor"],
        },
    )
    assert apply_response.status_code == 200, apply_response.text

    accepted_signal = platform_client.post(
        "/api/v1/platform/preference-signals",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "entity_type": "finding",
            "entity_id": first_finding["id"],
            "signal_type": "accepted_suggestion",
            "signal_value": first_finding["issue_type"],
            "metadata": {
                "contract_type": "services_agreement",
                "issue_type": first_finding["issue_type"],
                "represented_party": "customer",
            },
        },
    )
    assert accepted_signal.status_code == 200, accepted_signal.text

    ask_response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "question": "Does the agreement renew automatically?",
        },
    )
    assert ask_response.status_code == 200, ask_response.text
    ask_run = ask_response.json()
    assert ask_run["answer"]["supported"] is True
    assert ask_run["answer"]["citations"]

    revise_response = platform_client.post(
        "/api/v1/platform/revise-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "selected_text": "Subcontracting. Vendor may subcontract any obligation without notice.",
            "instruction": "Rewrite this so the customer gets notice and vendor stays responsible.",
            "playbook_id": "pb-services-customer-v1",
        },
    )
    assert revise_response.status_code == 200, revise_response.text
    revise_run = revise_response.json()
    assert revise_run["status"] == "completed"
    assert revise_run["citations"]

    clause_response = platform_client.post(
        "/api/v1/platform/clause-bank",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "contract_type": "services_agreement",
            "issue_type": "subcontracting",
            "represented_party": "customer",
            "title": "Pilot subcontracting fallback",
            "text": revise_run["suggested_text"],
            "source": "accepted_suggestion",
        },
    )
    assert clause_response.status_code == 200, clause_response.text

    rerun_response = platform_client.post(
        "/api/v1/platform/review-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "playbook_id": "pb-services-customer-v1",
        },
    )
    assert rerun_response.status_code == 200, rerun_response.text
    rerun = rerun_response.json()
    assert rerun["status"] == "completed"

    billing_response = platform_client.get(
        f"/api/v1/platform/workspaces/{workspace_id}/billing",
        headers={"x-skua-support-token": "support-secret"},
    )
    assert billing_response.status_code == 200, billing_response.text
    billing = billing_response.json()
    assert billing["run_count"] >= 4
    assert billing["actual_cost"] > 0

    release_response = platform_client.get(
        f"/api/v1/platform/workspaces/{workspace_id}/release-criteria",
        headers={"x-skua-support-token": "support-secret"},
    )
    assert release_response.status_code == 200, release_response.text
    release = release_response.json()
    assert release["ready_for_pilot"] is True
    assert all(metric["passing"] for metric in release["metrics"])
    metric_map = {metric["key"]: metric for metric in release["metrics"]}
    assert metric_map["parse_success_rate"]["sample_size"] >= 1
    assert metric_map["review_failure_rate"]["sample_size"] >= 2
    assert metric_map["accepted_suggestion_rate"]["value"] == 1.0


def test_platform_phase10_failure_paths_trip_release_gates(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client, "phase10-failure@example.com")
    upload_response = platform_client.post(
        "/api/v1/platform/documents/selection",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_name": "failure-path.txt",
            "selection_text": (
                "TERM. Vendor may terminate for convenience immediately.\n\n"
                "NOTICE. Vendor may change pricing on ten days' notice."
            ),
        },
    )
    assert upload_response.status_code == 200, upload_response.text
    version_id = upload_response.json()["document_version"]["id"]

    review_response = platform_client.post(
        "/api/v1/platform/review-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": version_id,
            "playbook_id": "pb-services-customer-v1",
        },
    )
    assert review_response.status_code == 200, review_response.text
    review_run = review_response.json()

    failed_apply = platform_client.post(
        "/api/v1/platform/apply-events",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "review_run_id": review_run["id"],
            "finding_id": review_run["findings"][0]["id"],
            "event_type": "comment_failed",
            "target_anchor": review_run["findings"][0]["citations"][0]["anchor"],
        },
    )
    assert failed_apply.status_code == 200, failed_apply.text

    dismissed_signal = platform_client.post(
        "/api/v1/platform/preference-signals",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "entity_type": "finding",
            "entity_id": review_run["findings"][0]["id"],
            "signal_type": "dismissed_finding",
            "signal_value": review_run["findings"][0]["issue_type"],
            "metadata": {
                "contract_type": "services_agreement",
                "issue_type": review_run["findings"][0]["issue_type"],
                "represented_party": "customer",
            },
        },
    )
    assert dismissed_signal.status_code == 200, dismissed_signal.text

    provider_response = platform_client.post(
        "/api/v1/provider-configs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "provider_name": "openai",
            "encrypted_secret": "sk-test-secret-phase10",
            "model_policy": {
                "ask": "gpt-5.4",
                "monthly_warning_usd": 0.0001,
                "monthly_hard_cap_usd": 0.0002,
                "per_run_max_estimate_usd": 0.00001,
            },
        },
    )
    assert provider_response.status_code == 200, provider_response.text

    blocked_response = platform_client.post(
        "/api/v1/platform/ask-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": version_id,
            "question": " ".join(["What"] * 400),
        },
    )
    assert blocked_response.status_code == 400, blocked_response.text
    assert "Blocked" in blocked_response.json()["detail"]

    release_response = platform_client.get(
        f"/api/v1/platform/workspaces/{workspace_id}/release-criteria",
        headers={"x-skua-support-token": "support-secret"},
    )
    assert release_response.status_code == 200, release_response.text
    release = release_response.json()
    assert release["ready_for_pilot"] is False
    metric_map = {metric["key"]: metric for metric in release["metrics"]}
    assert metric_map["add_in_apply_failure_rate"]["passing"] is False
    assert metric_map["accepted_suggestion_rate"]["passing"] is False
    assert metric_map["average_run_cost"]["sample_size"] >= 1
