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
            "email": "phase4@example.com",
            "password": "changeme123",
            "full_name": "Phase Four",
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


def _run_review(
    client: TestClient,
    *,
    headers: dict[str, str],
    workspace_id: str,
    document_version_id: str,
    playbook_id: str,
) -> dict:
    response = client.post(
        "/api/v1/platform/review-runs",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "document_version_id": document_version_id,
            "playbook_id": playbook_id,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_platform_review_run_creates_findings_citations_and_apply_artifacts(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)

    playbook_response = platform_client.get(
        f"/api/v1/platform/playbooks?workspace_id={workspace_id}",
        headers=headers,
    )
    assert playbook_response.status_code == 200, playbook_response.text
    playbook_ids = {item["id"] for item in playbook_response.json()}
    assert {
        "pb-nda-recipient-v1",
        "pb-services-customer-v1",
        "pb-saas-customer-v1",
    }.issubset(playbook_ids)

    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="services-agreement.txt",
        selection_text=(
            "MASTER SERVICES AGREEMENT\n\n"
            "Term. This Agreement will renew automatically for successive renewal terms unless either party gives notice.\n\n"
            "Subcontracting. Vendor may subcontract or delegate performance to any third party service provider.\n\n"
            "Limitation of Liability. Vendor's maximum aggregate liability will not exceed fees paid under this Agreement."
        ),
    )

    review_run = _run_review(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_version_id=document_version_id,
        playbook_id="pb-services-customer-v1",
    )
    assert review_run["status"] == "completed"
    assert review_run["summary"]["total_findings"] >= 5
    assert all(finding["citations"] for finding in review_run["findings"])
    assert any(finding["redline_text"] for finding in review_run["findings"])
    assert any(finding["comment_text"] for finding in review_run["findings"])
    assert all(
        citation["quote"].strip()
        for finding in review_run["findings"]
        for citation in finding["citations"]
    )

    rule_ids = {finding["metadata"]["rule_id"] for finding in review_run["findings"]}
    assert {"acceptance_criteria", "termination_for_convenience", "auto_renewal"}.issubset(rule_ids)


def test_platform_review_results_are_ranked_filterable_and_listable(platform_client: TestClient) -> None:
    headers, workspace_id = _register_user(platform_client)
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
    review_run = _run_review(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_version_id=document_version_id,
        playbook_id="pb-saas-customer-v1",
    )

    rank_scores = [finding["rank_score"] for finding in review_run["findings"]]
    assert rank_scores == sorted(rank_scores, reverse=True)
    assert "data_use" in review_run["filters"]["issue_types"]
    assert "redline" in review_run["filters"]["finding_types"]
    assert review_run["summary"]["high_severity_count"] >= 2

    detail_response = platform_client.get(
        f"/api/v1/platform/review-runs/{review_run['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200, detail_response.text
    detail = detail_response.json()
    assert detail["id"] == review_run["id"]

    list_response = platform_client.get(
        f"/api/v1/platform/document-versions/{document_version_id}/review-runs",
        headers=headers,
    )
    assert list_response.status_code == 200, list_response.text
    listed_runs = list_response.json()
    assert listed_runs[0]["id"] == review_run["id"]


def test_platform_review_eval_harness_measures_precision_recall_and_citation_correctness(
    platform_client: TestClient,
) -> None:
    headers, workspace_id = _register_user(platform_client)
    document_version_id = _upload_selection(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_name="nda.txt",
        selection_text=(
            "CONFIDENTIALITY AGREEMENT\n\n"
            "Residuals. Recipient may use residual information retained in unaided memory.\n\n"
            "Required Disclosure. If required by law, Recipient may disclose Confidential Information."
        ),
    )
    review_run = _run_review(
        platform_client,
        headers=headers,
        workspace_id=workspace_id,
        document_version_id=document_version_id,
        playbook_id="pb-nda-recipient-v1",
    )

    platform_review = importlib.import_module("app.platform_review")
    expectations = [
        platform_review.ReviewExpectation("residuals", quote_contains="residual"),
        platform_review.ReviewExpectation("use_restriction"),
        platform_review.ReviewExpectation("compelled_disclosure", quote_contains="required by law"),
        platform_review.ReviewExpectation("return_destroy"),
        platform_review.ReviewExpectation("term_survival"),
    ]
    metrics = platform_review.evaluate_review_expectations(
        platform_review.PlatformReviewRunRecord.model_validate(review_run),
        expectations,
    )
    assert metrics.issue_precision >= 0.8
    assert metrics.issue_recall >= 0.8
    assert metrics.citation_correctness == 1.0
