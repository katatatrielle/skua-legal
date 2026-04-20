from __future__ import annotations

from pathlib import Path

import pytest

from app import repository, storage


@pytest.fixture()
def isolated_repository(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    data_dir = tmp_path / "data"
    uploads_dir = tmp_path / "uploads"
    db_path = data_dir / "skua.db"

    monkeypatch.setattr(storage, "DATA_DIR", data_dir)
    monkeypatch.setattr(storage, "UPLOADS_DIR", uploads_dir)
    monkeypatch.setattr(storage, "DB_PATH", db_path)
    monkeypatch.setattr(repository, "UPLOADS_DIR", uploads_dir)
    monkeypatch.setattr(repository, "load_playbooks", lambda: [])


def test_upload_documents_removes_written_files_when_parse_fails(
    isolated_repository: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = repository.create_workspace("Cleanup Test Workspace")

    def _raise_parse_error(*args, **kwargs):
        raise ValueError("parse failed")

    monkeypatch.setattr(repository, "parse_document", _raise_parse_error)

    with pytest.raises(ValueError, match="parse failed"):
        repository.upload_documents(
            workspace.id,
            [("broken-upload.docx", b"not-a-real-docx")],
        )

    workspace_upload_dir = storage.UPLOADS_DIR / workspace.id
    assert workspace_upload_dir.exists()
    assert list(workspace_upload_dir.iterdir()) == []
