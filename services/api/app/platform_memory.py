from __future__ import annotations

import json
from collections import Counter
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import (
    PlatformClauseBankEntryCreateRequest,
    PlatformClauseBankEntryRecord,
    PlatformClauseBankEntryUpdateRequest,
    PlatformPreferenceSignalCreateRequest,
    PlatformPreferenceSignalRecord,
)
from app.platform_models import AuditEventPlatform, ClauseBankEntry, PreferenceSignal
from app.platform_parsing import build_embedding_tokens


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def list_clause_bank_entries(
    session: Session,
    *,
    workspace_id: str,
    contract_type: str | None = None,
    issue_type: str | None = None,
    represented_party: str | None = None,
    search_query: str | None = None,
) -> list[PlatformClauseBankEntryRecord]:
    statement: Select[tuple[ClauseBankEntry]] = select(ClauseBankEntry).where(
        ClauseBankEntry.workspace_id == workspace_id,
        ClauseBankEntry.deleted_at.is_(None),
    )
    if contract_type:
        statement = statement.where(ClauseBankEntry.contract_type == contract_type)
    if issue_type:
        statement = statement.where(ClauseBankEntry.issue_type == issue_type)
    if represented_party:
        statement = statement.where(
            (ClauseBankEntry.represented_party == represented_party)
            | (ClauseBankEntry.represented_party.is_(None))
        )

    rows = list(
        session.execute(
            statement.order_by(ClauseBankEntry.updated_at.desc(), ClauseBankEntry.created_at.desc())
        ).scalars()
    )
    if search_query and search_query.strip():
        query_tokens = set(build_embedding_tokens(search_query))
        lowered_query = search_query.lower()
        rows.sort(
            key=lambda row: _clause_match_score(
                row,
                query_tokens=query_tokens,
                lowered_query=lowered_query,
            ),
            reverse=True,
        )
    return [build_clause_bank_entry_record(row) for row in rows]


def get_clause_bank_entry(session: Session, entry_id: str) -> ClauseBankEntry | None:
    return session.execute(
        select(ClauseBankEntry).where(
            ClauseBankEntry.id == entry_id,
            ClauseBankEntry.deleted_at.is_(None),
        )
    ).scalar_one_or_none()


def create_clause_bank_entry(
    session: Session,
    *,
    payload: PlatformClauseBankEntryCreateRequest,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformClauseBankEntryRecord:
    row = ClauseBankEntry(
        id=f"cbe-{uuid4().hex[:12]}",
        workspace_id=payload.workspace_id,
        contract_type=payload.contract_type.strip(),
        issue_type=_normalize_optional(payload.issue_type),
        represented_party=_normalize_optional(payload.represented_party),
        title=payload.title.strip(),
        text=payload.text.strip(),
        source=payload.source.strip(),
    )
    session.add(row)
    session.flush()
    _insert_audit_event(
        session,
        workspace_id=row.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="clause_bank_entry",
        entity_id=row.id,
        action="clause_bank.created",
        request_id=request_id,
        payload={
            "contract_type": row.contract_type,
            "issue_type": row.issue_type,
            "represented_party": row.represented_party,
            "source": row.source,
        },
    )
    create_preference_signal(
        session,
        payload=PlatformPreferenceSignalCreateRequest(
            workspace_id=row.workspace_id,
            entity_type="clause_bank_entry",
            entity_id=row.id,
            signal_type="saved_clause",
            signal_value=row.issue_type,
            metadata={
                "contract_type": row.contract_type,
                "represented_party": row.represented_party,
                "source": row.source,
            },
        ),
        request_id=request_id,
        actor_user_id=actor_user_id,
    )
    session.flush()
    return build_clause_bank_entry_record(row)


def update_clause_bank_entry(
    session: Session,
    *,
    entry_id: str,
    payload: PlatformClauseBankEntryUpdateRequest,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformClauseBankEntryRecord | None:
    row = get_clause_bank_entry(session, entry_id)
    if row is None:
        return None
    if payload.contract_type is not None:
        row.contract_type = payload.contract_type.strip()
    if payload.issue_type is not None:
        row.issue_type = _normalize_optional(payload.issue_type)
    if payload.represented_party is not None:
        row.represented_party = _normalize_optional(payload.represented_party)
    if payload.title is not None:
        row.title = payload.title.strip()
    if payload.text is not None:
        row.text = payload.text.strip()
    row.updated_at = utcnow()
    _insert_audit_event(
        session,
        workspace_id=row.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="clause_bank_entry",
        entity_id=row.id,
        action="clause_bank.updated",
        request_id=request_id,
        payload={
            "contract_type": row.contract_type,
            "issue_type": row.issue_type,
            "represented_party": row.represented_party,
        },
    )
    session.flush()
    return build_clause_bank_entry_record(row)


def delete_clause_bank_entry(
    session: Session,
    *,
    entry_id: str,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformClauseBankEntryRecord | None:
    row = get_clause_bank_entry(session, entry_id)
    if row is None:
        return None
    row.deleted_at = utcnow()
    row.updated_at = row.deleted_at
    _insert_audit_event(
        session,
        workspace_id=row.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="clause_bank_entry",
        entity_id=row.id,
        action="clause_bank.deleted",
        request_id=request_id,
        payload={"contract_type": row.contract_type, "issue_type": row.issue_type},
    )
    session.flush()
    return build_clause_bank_entry_record(row)


def create_preference_signal(
    session: Session,
    *,
    payload: PlatformPreferenceSignalCreateRequest,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformPreferenceSignalRecord:
    row = PreferenceSignal(
        id=f"psig-{uuid4().hex[:12]}",
        workspace_id=payload.workspace_id,
        entity_type=payload.entity_type.strip(),
        entity_id=payload.entity_id.strip(),
        signal_type=payload.signal_type.strip(),
        signal_value=_normalize_optional(payload.signal_value),
        metadata_json=json.loads(json.dumps(payload.metadata)),
    )
    session.add(row)
    session.flush()
    _insert_audit_event(
        session,
        workspace_id=row.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="preference_signal",
        entity_id=row.id,
        action="preference_signal.created",
        request_id=request_id,
        payload={
            "signal_type": row.signal_type,
            "signal_value": row.signal_value,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
        },
    )
    return build_preference_signal_record(row)


def find_matching_clause_bank_entries(
    session: Session,
    *,
    workspace_id: str,
    contract_type: str | None,
    issue_type: str | None,
    represented_party: str | None,
    query: str,
    limit: int = 5,
    preferred_entry_ids: list[str] | None = None,
) -> list[PlatformClauseBankEntryRecord]:
    preferred = preferred_entry_ids or []
    rows = list(
        session.execute(
            select(ClauseBankEntry).where(
                ClauseBankEntry.workspace_id == workspace_id,
                ClauseBankEntry.deleted_at.is_(None),
            )
        ).scalars()
    )
    query_tokens = set(build_embedding_tokens(query))
    lowered_query = query.lower()
    scored = sorted(
        rows,
        key=lambda row: _rank_clause_entry(
            row,
            contract_type=contract_type,
            issue_type=issue_type,
            represented_party=represented_party,
            preferred_entry_ids=preferred,
            query_tokens=query_tokens,
            lowered_query=lowered_query,
        ),
        reverse=True,
    )
    filtered = [
        row
        for row in scored
        if _rank_clause_entry(
            row,
            contract_type=contract_type,
            issue_type=issue_type,
            represented_party=represented_party,
            preferred_entry_ids=preferred,
            query_tokens=query_tokens,
            lowered_query=lowered_query,
        )
        > 0
    ]
    return [build_clause_bank_entry_record(row) for row in filtered[:limit]]


def summarize_preference_signals(
    session: Session,
    *,
    workspace_id: str,
    issue_type: str | None = None,
    contract_type: str | None = None,
    represented_party: str | None = None,
) -> dict[str, object]:
    rows = list(
        session.execute(
            select(PreferenceSignal).where(PreferenceSignal.workspace_id == workspace_id)
        ).scalars()
    )
    filtered: list[PreferenceSignal] = []
    for row in rows:
        metadata = row.metadata_json or {}
        if issue_type and row.signal_value not in {issue_type, None, ""} and metadata.get("issue_type") != issue_type:
            continue
        if contract_type and metadata.get("contract_type") not in {None, contract_type}:
            continue
        if represented_party and metadata.get("represented_party") not in {None, represented_party}:
            continue
        filtered.append(row)

    counts = Counter(row.signal_type for row in filtered)
    score = (
        counts.get("saved_clause", 0) * 18
        + counts.get("accepted_suggestion", 0) * 12
        + counts.get("used_clause", 0) * 8
        - counts.get("dismissed_finding", 0) * 6
    )
    return {
        "signal_count": len(filtered),
        "counts": dict(counts),
        "score": float(score),
    }


def build_clause_bank_entry_record(row: ClauseBankEntry) -> PlatformClauseBankEntryRecord:
    return PlatformClauseBankEntryRecord(
        id=row.id,
        workspace_id=row.workspace_id,
        contract_type=row.contract_type,
        issue_type=row.issue_type,
        represented_party=row.represented_party,
        title=row.title,
        text=row.text,
        source=row.source,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


def build_preference_signal_record(row: PreferenceSignal) -> PlatformPreferenceSignalRecord:
    return PlatformPreferenceSignalRecord(
        id=row.id,
        workspace_id=row.workspace_id,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        signal_type=row.signal_type,
        signal_value=row.signal_value,
        metadata=row.metadata_json or {},
        created_at=row.created_at.isoformat(),
    )


def _rank_clause_entry(
    row: ClauseBankEntry,
    *,
    contract_type: str | None,
    issue_type: str | None,
    represented_party: str | None,
    preferred_entry_ids: list[str],
    query_tokens: set[str],
    lowered_query: str,
) -> float:
    score = _clause_match_score(row, query_tokens=query_tokens, lowered_query=lowered_query)
    if row.id in preferred_entry_ids:
        score += 40.0
    if contract_type and row.contract_type == contract_type:
        score += 35.0
    if issue_type and row.issue_type == issue_type:
        score += 45.0
    if represented_party and row.represented_party == represented_party:
        score += 20.0
    elif represented_party and row.represented_party is None:
        score += 5.0
    return score


def _clause_match_score(
    row: ClauseBankEntry,
    *,
    query_tokens: set[str],
    lowered_query: str,
) -> float:
    text_tokens = set(build_embedding_tokens(f"{row.title} {row.text} {row.issue_type or ''}"))
    overlap = len(query_tokens.intersection(text_tokens))
    score = float(overlap * 3)
    if row.issue_type and row.issue_type.replace("_", " ") in lowered_query:
        score += 4.0
    if row.title.lower() in lowered_query:
        score += 2.0
    return score


def _normalize_optional(value: str | None) -> str | None:
    normalized = (value or "").strip()
    return normalized or None


def _insert_audit_event(
    session: Session,
    *,
    workspace_id: str,
    actor_user_id: str | None,
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
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            request_id=request_id,
            payload_json=json.loads(json.dumps(payload)),
        )
    )
