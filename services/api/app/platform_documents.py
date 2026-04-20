from __future__ import annotations

import hashlib
import json
from pathlib import Path
from uuid import uuid4

from rq import Retry
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import (
    PlatformAnchorRelocationRequest,
    PlatformAnchorRelocationResult,
    PlatformDocumentIngestRecord,
    PlatformDocumentSearchRequest,
    PlatformDocumentSearchResult,
    PlatformDocumentSegmentRecord,
    PlatformDocumentVersionDetailRecord,
    PlatformDocumentVersionRecord,
    PlatformSelectionIngestRequest,
)
from app import object_storage
from app.object_storage import get_object_bytes, put_source_object, temporary_source_file
from app.platform_auth import ensure_platform_workspace
from app.platform_db import platform_session
from app.platform_models import (
    AuditEventPlatform,
    Document,
    DocumentSegment,
    DocumentVersion,
    Matter,
    ParsedDocument,
    Workspace,
)
from app.platform_parsing import PlatformSegment, parse_platform_document, relocate_anchor, search_segments
from app.queueing import get_queue


def get_or_create_default_matter(session: Session, *, workspace_id: str) -> Matter:
    matter = session.execute(
        select(Matter).where(Matter.workspace_id == workspace_id).order_by(Matter.created_at.asc())
    ).scalars().first()
    if matter is not None:
        return matter

    matter = Matter(
        id=f"matter-{uuid4().hex[:12]}",
        workspace_id=workspace_id,
        name="General Matter",
        represented_party="Buyer",
        jurisdiction="Ontario",
    )
    session.add(matter)
    session.flush()
    return matter


def create_platform_document_upload(
    session: Session,
    *,
    workspace_id: str,
    matter_id: str | None,
    filename: str,
    content: bytes,
    source_kind: str,
    request_id: str | None,
    selection_text: str | None = None,
) -> PlatformDocumentIngestRecord:
    workspace = session.execute(select(Workspace).where(Workspace.id == workspace_id)).scalar_one_or_none()
    if workspace is None:
        workspace = ensure_platform_workspace(session, workspace_id=workspace_id, name=workspace_id.replace("-", " ").title())
        session.flush()

    matter = (
        session.execute(select(Matter).where(Matter.id == matter_id)).scalar_one_or_none()
        if matter_id
        else get_or_create_default_matter(session, workspace_id=workspace_id)
    )
    if matter is None:
        raise ValueError("Matter not found.")

    sha256 = hashlib.sha256(content).hexdigest()
    duplicate = session.execute(
        select(DocumentVersion).where(
            DocumentVersion.workspace_id == workspace_id,
            DocumentVersion.sha256 == sha256,
        )
    ).scalar_one_or_none()
    if duplicate is not None:
        return build_document_ingest_record(session, duplicate.id)

    document_id = f"pdoc-{uuid4().hex[:12]}"
    version_id = f"pdv-{uuid4().hex[:12]}"
    stored_name = f"{document_id}-{sanitize_filename(filename)}"
    stored_object = put_source_object(workspace_id, stored_name, content)

    document = Document(
        id=document_id,
        workspace_id=workspace_id,
        matter_id=matter.id,
        name=filename,
        source_object_bucket=stored_object.bucket,
        source_object_key=stored_object.key,
        sha256=sha256,
        mime_type=guess_mime_type(filename, source_kind),
    )
    session.add(document)
    session.flush()

    version = DocumentVersion(
        id=version_id,
        workspace_id=workspace_id,
        matter_id=matter.id,
        document_id=document.id,
        version_number=1,
        source_object_bucket=stored_object.bucket,
        source_object_key=stored_object.key,
        sha256=sha256,
        status="queued",
    )
    session.add(version)
    session.add(
        ParsedDocument(
            id=f"parse-{uuid4().hex[:12]}",
            document_version_id=version_id,
            parser_name="pending",
            parse_status="queued",
            metadata_json={
                "filename": filename,
                "source_kind": source_kind,
                "selection_text_length": len(selection_text or ""),
            },
        )
    )
    insert_platform_audit_event(
        session,
        workspace_id=workspace_id,
        entity_type="document_version",
        entity_id=version_id,
        action="document.uploaded",
        request_id=request_id,
        payload={"filename": filename, "source_kind": source_kind},
    )
    session.flush()
    queue = get_queue()
    if queue is not None:
        enqueue_platform_document_pipeline(version.id, request_id=request_id)
    else:
        run_document_pipeline(session, document_version_id=version.id, request_id=request_id)
    return build_document_ingest_record(session, version.id)


def create_selection_upload(
    session: Session,
    *,
    payload: PlatformSelectionIngestRequest,
    request_id: str | None,
) -> PlatformDocumentIngestRecord:
    content = payload.selection_text.encode("utf-8")
    return create_platform_document_upload(
        session,
        workspace_id=payload.workspace_id,
        matter_id=payload.matter_id,
        filename=payload.document_name or "word-selection.txt",
        content=content,
        source_kind="word_selection",
        request_id=request_id,
        selection_text=payload.selection_text,
    )


def enqueue_platform_document_pipeline(document_version_id: str, *, request_id: str | None) -> None:
    queue = get_queue()
    if queue is not None:
        queue.enqueue(
            "app.platform_documents.run_document_pipeline_job",
            document_version_id,
            request_id=request_id,
            retry=Retry(max=2, interval=[10, 30]),
            failure_ttl=24 * 60 * 60,
            result_ttl=60 * 60,
            job_id=f"platform-parse:{document_version_id}",
        )
        return


def run_document_pipeline_job(document_version_id: str, *, request_id: str | None = None) -> None:
    with platform_session() as session:
        run_document_pipeline(session, document_version_id=document_version_id, request_id=request_id)


def run_document_pipeline(session: Session, *, document_version_id: str, request_id: str | None = None) -> None:
    version = session.execute(
        select(DocumentVersion).where(DocumentVersion.id == document_version_id)
    ).scalar_one_or_none()
    if version is None:
        raise ValueError("Document version not found.")

    parsed_row = session.execute(
        select(ParsedDocument).where(ParsedDocument.document_version_id == document_version_id)
    ).scalar_one()
    document = session.execute(
        select(Document).where(Document.id == version.document_id)
    ).scalar_one()

    version.status = "parsing"
    parsed_row.parse_status = "running"
    session.flush()

    source_location = resolve_source_location(version=version, document=document)
    temp_file = temporary_source_file(document.name, get_object_bytes(source_location))
    try:
        source_kind = str(parsed_row.metadata_json.get("source_kind", "web_upload"))
        parse_result = parse_platform_document(
            document_version_id=document_version_id,
            filename=document.name,
            file_path=temp_file,
            source_kind=source_kind,
        )
    except Exception as error:
        version.status = "failed"
        parsed_row.parse_status = "failed"
        parsed_row.metadata_json = {**parsed_row.metadata_json, "error": str(error)}
        insert_platform_audit_event(
            session,
            workspace_id=version.workspace_id,
            entity_type="document_version",
            entity_id=version.id,
            action="document.parse_failed",
            request_id=request_id,
            payload={"error": str(error)},
        )
        raise
    finally:
        temp_file.unlink(missing_ok=True)

    session.execute(delete(DocumentSegment).where(DocumentSegment.document_version_id == document_version_id))

    for segment in parse_result.segments:
        session.add(build_segment_row(document_version_id=document_version_id, segment=segment))

    version.status = "indexed"
    parsed_row.parser_name = parse_result.parser_name
    parsed_row.parse_status = parse_result.parse_status
    parsed_row.confidence = parse_result.confidence
    parsed_row.metadata_json = parse_result.metadata
    insert_platform_audit_event(
        session,
        workspace_id=version.workspace_id,
        entity_type="document_version",
        entity_id=version.id,
        action="document.parsed",
        request_id=request_id,
        payload={
            "parser_name": parse_result.parser_name,
            "segment_count": len(parse_result.segments),
            "confidence": parse_result.confidence,
        },
    )


def build_segment_row(*, document_version_id: str, segment: PlatformSegment) -> DocumentSegment:
    anchor_json = {
        **segment.anchor_json,
        "confidence": segment.confidence,
        "embedding_tokens": segment.embedding_tokens,
    }
    return DocumentSegment(
        id=f"seg-{uuid4().hex[:12]}",
        document_version_id=document_version_id,
        segment_type=segment.segment_type,
        ordinal=segment.ordinal,
        title=segment.title,
        text=segment.text,
        page_number=segment.page_number,
        anchor_json=anchor_json,
        embedding_status="indexed" if segment.embedding_tokens else "lexical_only",
    )


def build_document_ingest_record(session: Session, document_version_id: str) -> PlatformDocumentIngestRecord:
    detail = get_platform_document_version_detail(session, document_version_id=document_version_id)
    if detail is None:
        raise ValueError("Document version not found.")
    return PlatformDocumentIngestRecord(
        document_version=detail.document_version,
        parse_status=detail.parse_status,
        parser_name=detail.parser_name,
        segment_count=detail.segment_count,
        notes=[],
    )


def list_platform_document_versions(
    session: Session,
    *,
    workspace_id: str,
) -> list[PlatformDocumentVersionRecord]:
    rows = session.execute(
        select(DocumentVersion).where(DocumentVersion.workspace_id == workspace_id).order_by(DocumentVersion.created_at.desc())
    ).scalars()
    return [build_document_version_record(session, row) for row in rows]


def get_platform_document_version_detail(
    session: Session,
    *,
    document_version_id: str,
) -> PlatformDocumentVersionDetailRecord | None:
    version = session.execute(select(DocumentVersion).where(DocumentVersion.id == document_version_id)).scalar_one_or_none()
    if version is None:
        return None
    parsed_row = session.execute(
        select(ParsedDocument).where(ParsedDocument.document_version_id == document_version_id)
    ).scalar_one_or_none()
    segment_rows = session.execute(
        select(DocumentSegment)
        .where(DocumentSegment.document_version_id == document_version_id)
        .order_by(DocumentSegment.ordinal.asc())
    ).scalars()
    segments = [build_segment_record(row) for row in segment_rows]
    return PlatformDocumentVersionDetailRecord(
        document_version=build_document_version_record(session, version),
        parse_status=parsed_row.parse_status if parsed_row else "queued",
        parser_name=parsed_row.parser_name if parsed_row else "pending",
        parse_confidence=parsed_row.confidence if parsed_row else None,
        metadata=parsed_row.metadata_json if parsed_row else {},
        segment_count=len(segments),
        segments=segments,
    )


def build_document_version_record(session: Session, version: DocumentVersion) -> PlatformDocumentVersionRecord:
    document = session.execute(select(Document).where(Document.id == version.document_id)).scalar_one()
    parsed_row = session.execute(
        select(ParsedDocument).where(ParsedDocument.document_version_id == version.id)
    ).scalar_one_or_none()
    segment_count = session.execute(
        select(func.count(DocumentSegment.id)).where(DocumentSegment.document_version_id == version.id)
    ).scalar_one()
    return PlatformDocumentVersionRecord(
        id=version.id,
        workspace_id=version.workspace_id,
        matter_id=version.matter_id,
        document_id=version.document_id,
        name=document.name,
        mime_type=document.mime_type,
        source_bucket=version.source_object_bucket,
        source_key=version.source_object_key,
        sha256=version.sha256,
        version_number=version.version_number,
        status=version.status,
        parse_status=parsed_row.parse_status if parsed_row else "queued",
        index_status="indexed" if version.status == "indexed" else ("failed" if version.status == "failed" else "pending"),
        segment_count=int(segment_count),
        created_at=version.created_at.isoformat(),
    )


def build_segment_record(row: DocumentSegment) -> PlatformDocumentSegmentRecord:
    return PlatformDocumentSegmentRecord(
        id=row.id,
        segment_type=row.segment_type,
        ordinal=row.ordinal,
        title=row.title,
        text=row.text,
        page_number=row.page_number,
        anchor=row.anchor_json,
        embedding_status=row.embedding_status,
        confidence=float(row.anchor_json.get("confidence", 1.0)),
    )


def search_platform_document(
    session: Session,
    *,
    document_version_id: str,
    payload: PlatformDocumentSearchRequest,
) -> list[PlatformDocumentSearchResult]:
    segment_rows = session.execute(
        select(DocumentSegment)
        .where(DocumentSegment.document_version_id == document_version_id)
        .order_by(DocumentSegment.ordinal.asc())
    ).scalars()
    segments = [
        PlatformSegment(
            segment_type=row.segment_type,
            ordinal=row.ordinal,
            title=row.title,
            text=row.text,
            page_number=row.page_number,
            anchor_json=row.anchor_json,
            confidence=float(row.anchor_json.get("confidence", 1.0)),
            embedding_tokens={
                str(key): float(value)
                for key, value in row.anchor_json.get("embedding_tokens", {}).items()
            },
        )
        for row in segment_rows
    ]
    results = search_segments(
        query=payload.query,
        segments=segments,
        limit=payload.limit,
        segment_types=set(payload.segment_types) if payload.segment_types else None,
    )
    return [PlatformDocumentSearchResult.model_validate(result) for result in results]


def relocate_platform_anchor(
    session: Session,
    *,
    payload: PlatformAnchorRelocationRequest,
) -> PlatformAnchorRelocationResult:
    if payload.document_version_id:
        segment_rows = session.execute(
            select(DocumentSegment)
            .where(DocumentSegment.document_version_id == payload.document_version_id)
            .order_by(DocumentSegment.ordinal.asc())
        ).scalars()
        candidate_segments = [row.text for row in segment_rows]
    else:
        candidate_segments = payload.candidate_segments
    result = relocate_anchor(anchor=payload.anchor, candidate_segments=candidate_segments)
    return PlatformAnchorRelocationResult.model_validate(result)


def resolve_source_location(*, version: DocumentVersion, document: Document) -> str:
    bucket = version.source_object_bucket or document.source_object_bucket
    key = version.source_object_key or document.source_object_key
    if bucket and key and bucket.startswith("local"):
        return str(object_storage.LOCAL_SOURCE_DIR / key)
    if bucket and key:
        return f"s3://{bucket}/{key}"
    raise ValueError("Document source location is missing.")


def insert_platform_audit_event(
    session: Session,
    *,
    workspace_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    request_id: str | None,
    payload: dict[str, object],
) -> None:
    session.add(
        AuditEventPlatform(
            id=f"paudit-{uuid4().hex[:12]}",
            workspace_id=workspace_id,
            actor_user_id=None,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            request_id=request_id,
            payload_json=json.loads(json.dumps(payload)),
        )
    )


def sanitize_filename(value: str) -> str:
    return "".join(char if char.isalnum() or char in {"-", "_", "."} else "-" for char in value)


def guess_mime_type(filename: str, source_kind: str) -> str:
    suffix = Path(filename).suffix.lower()
    if source_kind == "word_selection" or suffix == ".txt":
        return "text/plain"
    if suffix == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if suffix == ".pdf":
        return "application/pdf"
    return "application/octet-stream"
