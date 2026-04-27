from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from rq import Retry
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    PlatformAskAnswerRecord,
    PlatformAskRunCreateRequest,
    PlatformAskRunRecord,
    PlatformReviewCitationRecord,
    PlatformReviseRunCreateRequest,
    PlatformReviseRunRecord,
)
from app.platform_db import platform_session
from app.platform_memory import find_matching_clause_bank_entries, summarize_preference_signals
from app.platform_models import (
    AskAnswer,
    AskRunPlatform,
    AuditEventPlatform,
    Citation,
    DocumentSegment,
    DocumentVersion,
    Playbook,
    ReviseRun,
)
from app.platform_parsing import PlatformSegment, build_embedding_tokens, search_segments
from app.platform_provider import enforce_spend_controls, estimate_usage, record_usage_ledger, resolve_provider_runtime
from app.platform_provider_bridge import generate_provider_text
from app.platform_review import hydrate_playbook_record, sync_platform_playbooks
from app.queueing import get_queue


SENTENCE_PATTERN = re.compile(r"(?<=[.!?])\s+")

ISSUE_TYPE_FALLBACKS = {
    "assignment": "Neither party may assign this Agreement without the other party's prior written consent, except to an affiliate or in connection with a merger or sale of substantially all assets, provided the assignee assumes this Agreement in writing.",
    "auto_renewal": "This Agreement will renew only with the Customer's written approval or, if it renews automatically, either party may opt out on at least thirty days' prior written notice before the renewal date.",
    "data_use": "Vendor may use Customer Data solely to provide, secure, support, and improve the Services for Customer and may not use Customer Data to train generalized models without Customer's prior written consent.",
    "liability": "The limitation of liability will not apply to confidentiality breaches, data security obligations, indemnification obligations, gross negligence, or willful misconduct.",
    "pricing": "Vendor may not increase fees during the current term and may increase renewal fees only once per renewal term on at least sixty days' prior written notice, capped at five percent.",
    "residuals": "Recipient may not rely on any residuals or unaided-memory carve-out to use or disclose Confidential Information.",
    "security": "Vendor will notify Customer without undue delay after confirming a Security Incident and will provide reasonably detailed updates and remediation information.",
    "subcontracting": "Vendor may not subcontract material obligations without Customer's prior written notice and remains fully responsible for all subcontractor acts and omissions.",
    "suspension": "Vendor may suspend the Services only for a verified security threat, illegal use, or material nonpayment that continues after prior written notice and a reasonable cure period, except where immediate suspension is necessary to prevent material harm.",
    "term_survival": "The confidentiality obligations in this Agreement will survive for three years after disclosure, and trade secret obligations will survive for so long as the information remains protected as a trade secret under applicable law.",
}


@dataclass(frozen=True)
class AssistSegment:
    id: str
    ordinal: int
    segment_type: str
    title: str | None
    text: str
    page_number: int | None
    anchor: dict[str, object]
    embedding_tokens: dict[str, float]

    def to_platform_segment(self) -> PlatformSegment:
        return PlatformSegment(
            segment_type=self.segment_type,
            ordinal=self.ordinal,
            title=self.title,
            text=self.text,
            page_number=self.page_number,
            anchor_json=self.anchor,
            confidence=float(self.anchor.get("confidence", 1.0)),
            embedding_tokens=self.embedding_tokens,
        )


@dataclass(frozen=True)
class ClauseBankMatch:
    id: str
    issue_type: str | None
    title: str
    text: str
    source: str | None = None


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def create_platform_ask_run(
    session: Session,
    *,
    payload: PlatformAskRunCreateRequest,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformAskRunRecord:
    version = _get_document_version(session, payload.document_version_id)
    if version.workspace_id != payload.workspace_id:
        raise ValueError("Document version does not belong to the workspace.")

    runtime = resolve_provider_runtime(session, workspace_id=payload.workspace_id, capability="ask")
    estimate = estimate_usage(
        session,
        workspace_id=payload.workspace_id,
        run_type="ask",
        runtime=runtime,
        input_texts=[payload.question, payload.selection_text or ""],
        output_texts=["short cited answer"],
    )
    enforce_spend_controls(estimate)

    ask_run = AskRunPlatform(
        id=f"pask-{uuid4().hex[:12]}",
        workspace_id=payload.workspace_id,
        matter_id=version.matter_id,
        document_version_id=version.id,
        question=payload.question.strip(),
        selection_text=(payload.selection_text or "").strip() or None,
        status="queued",
        request_id=request_id,
    )
    session.add(ask_run)
    _insert_audit_event(
        session,
        workspace_id=payload.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="ask_run",
        entity_id=ask_run.id,
        action="ask.created",
        request_id=request_id,
        payload={
            "document_version_id": version.id,
            "estimated_cost": estimate.estimated_cost,
            "provider": runtime.provider,
            "model": runtime.model,
        },
    )
    session.flush()

    queue = get_queue()
    if queue is not None:
        queue.enqueue(
            "app.platform_assist.run_platform_ask_job",
            ask_run.id,
            request_id=request_id,
            retry=Retry(max=2, interval=[10, 30]),
            failure_ttl=24 * 60 * 60,
            result_ttl=60 * 60,
            job_id=f"platform-ask:{ask_run.id}",
        )
    else:
        run_platform_ask(session, ask_run_id=ask_run.id, request_id=request_id)
    return build_platform_ask_run_record(session, ask_run.id)


def create_platform_revise_run(
    session: Session,
    *,
    payload: PlatformReviseRunCreateRequest,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformReviseRunRecord:
    version = _get_document_version(session, payload.document_version_id)
    if version.workspace_id != payload.workspace_id:
        raise ValueError("Document version does not belong to the workspace.")

    runtime = resolve_provider_runtime(session, workspace_id=payload.workspace_id, capability="revise")
    estimate = estimate_usage(
        session,
        workspace_id=payload.workspace_id,
        run_type="revise",
        runtime=runtime,
        input_texts=[payload.instruction, payload.selected_text],
        output_texts=["suggested language revision"],
    )
    enforce_spend_controls(estimate)

    revise_run = ReviseRun(
        id=f"prev-{uuid4().hex[:12]}",
        workspace_id=payload.workspace_id,
        matter_id=version.matter_id,
        document_version_id=version.id,
        instruction=payload.instruction.strip(),
        selected_text=payload.selected_text.strip(),
        status="queued",
        suggested_text=None,
        rationale=None,
        request_id=request_id,
    )
    session.add(revise_run)
    _insert_audit_event(
        session,
        workspace_id=payload.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="revise_run",
        entity_id=revise_run.id,
        action="revise.created",
        request_id=request_id,
        payload={
            "document_version_id": version.id,
            "playbook_id": payload.playbook_id,
            "clause_bank_entry_ids": payload.clause_bank_entry_ids,
            "estimated_cost": estimate.estimated_cost,
            "provider": runtime.provider,
            "model": runtime.model,
        },
    )
    session.flush()

    queue = get_queue()
    if queue is not None:
        queue.enqueue(
            "app.platform_assist.run_platform_revise_job",
            revise_run.id,
            payload.model_dump(mode="json"),
            request_id=request_id,
            retry=Retry(max=2, interval=[10, 30]),
            failure_ttl=24 * 60 * 60,
            result_ttl=60 * 60,
            job_id=f"platform-revise:{revise_run.id}",
        )
    else:
        run_platform_revise(
            session,
            revise_run_id=revise_run.id,
            payload=payload,
            request_id=request_id,
        )
    return build_platform_revise_run_record(session, revise_run.id)


def run_platform_ask_job(ask_run_id: str, *, request_id: str | None = None) -> None:
    with platform_session() as session:
        run_platform_ask(session, ask_run_id=ask_run_id, request_id=request_id)


def run_platform_revise_job(
    revise_run_id: str,
    payload: dict[str, object],
    *,
    request_id: str | None = None,
) -> None:
    with platform_session() as session:
        run_platform_revise(
            session,
            revise_run_id=revise_run_id,
            payload=PlatformReviseRunCreateRequest.model_validate(payload),
            request_id=request_id,
        )


def run_platform_ask(session: Session, *, ask_run_id: str, request_id: str | None = None) -> None:
    ask_run = session.execute(select(AskRunPlatform).where(AskRunPlatform.id == ask_run_id)).scalar_one_or_none()
    if ask_run is None:
        return

    segments = load_assist_segments(session, document_version_id=ask_run.document_version_id or "")
    ask_run.status = "running"
    session.flush()

    citations = retrieve_context_segments(
        segments=segments,
        query=ask_run.question,
        selection_text=ask_run.selection_text,
        limit=3,
    )
    supported = bool(citations and citations[0][1] >= 0.12)
    if supported:
        selected_segments = [segment for segment, _ in citations[:3]]
        runtime = resolve_provider_runtime(session, workspace_id=ask_run.workspace_id, capability="ask")
        generation = generate_provider_text(
            session,
            workspace_id=ask_run.workspace_id,
            runtime=runtime,
            instructions=(
                "You are a legal AI assistant embedded in Microsoft Word. Answer only from the provided cited excerpts. "
                "Do not add facts that are not supported by those excerpts. Keep the answer concise and practical."
            ),
            prompt=build_ask_provider_prompt(question=ask_run.question, segments=selected_segments),
            max_output_tokens=260,
        )
        answer_text = sanitize_ask_answer(generation.text) if generation else build_ask_answer(question=ask_run.question, segments=selected_segments)
        confidence = round(sum(score for _, score in citations[: min(len(citations), 3)]) / min(len(citations), 3), 4)
    else:
        selected_segments = []
        answer_text = "I can't support a factual answer to that question from the current document."
        confidence = 0.0
        _insert_audit_event(
            session,
            workspace_id=ask_run.workspace_id,
            actor_user_id=None,
            entity_type="ask_run",
            entity_id=ask_run.id,
            action="ask.unsupported",
            request_id=request_id,
            payload={"question": ask_run.question},
        )

    existing_answer = session.execute(select(AskAnswer).where(AskAnswer.ask_run_id == ask_run.id)).scalar_one_or_none()
    if existing_answer is None:
        existing_answer = AskAnswer(
            id=f"pans-{uuid4().hex[:12]}",
            ask_run_id=ask_run.id,
            answer_text=answer_text,
            confidence=confidence,
        )
        session.add(existing_answer)
        session.flush()
    else:
        existing_answer.answer_text = answer_text
        existing_answer.confidence = confidence

    existing_citations = session.execute(select(Citation).where(Citation.ask_answer_id == existing_answer.id)).scalars()
    for citation in existing_citations:
        session.delete(citation)

    for segment in selected_segments:
        session.add(
            Citation(
                id=f"cit-{uuid4().hex[:12]}",
                ask_answer_id=existing_answer.id,
                document_segment_id=segment.id,
                label=build_citation_label(segment),
                quote=extract_support_quote(segment.text, ask_run.question),
            )
        )

    ask_run.status = "completed"
    ask_run.completed_at = utcnow()
    _insert_audit_event(
        session,
        workspace_id=ask_run.workspace_id,
        actor_user_id=None,
        entity_type="ask_run",
        entity_id=ask_run.id,
        action="ask.completed",
        request_id=request_id,
        payload={"supported": supported, "citation_count": len(selected_segments)},
    )
    runtime = resolve_provider_runtime(session, workspace_id=ask_run.workspace_id, capability="ask")
    usage_estimate = estimate_usage(
        session,
        workspace_id=ask_run.workspace_id,
        run_type="ask",
        runtime=runtime,
        input_texts=[ask_run.question, ask_run.selection_text or ""],
        output_texts=[answer_text],
    )
    record_usage_ledger(
        session,
        workspace_id=ask_run.workspace_id,
        run_type="ask",
        run_id=ask_run.id,
        provider=runtime.provider,
        model=runtime.model,
        input_tokens=usage_estimate.estimated_input_tokens,
        output_tokens=usage_estimate.estimated_output_tokens,
        estimated_cost=usage_estimate.estimated_cost,
        actual_cost=usage_estimate.estimated_cost,
    )
    session.flush()


def run_platform_revise(
    session: Session,
    *,
    revise_run_id: str,
    payload: PlatformReviseRunCreateRequest,
    request_id: str | None = None,
) -> None:
    revise_run = session.execute(select(ReviseRun).where(ReviseRun.id == revise_run_id)).scalar_one_or_none()
    if revise_run is None:
        return

    segments = load_assist_segments(session, document_version_id=revise_run.document_version_id or "")
    revise_run.status = "running"
    session.flush()

    playbook_match = resolve_playbook_match(
        session,
        playbook_id=payload.playbook_id,
        instruction=payload.instruction,
        selected_text=payload.selected_text,
    )
    clause_matches = load_clause_bank_matches(
        session,
        workspace_id=revise_run.workspace_id,
        entry_ids=payload.clause_bank_entry_ids,
        playbook_match=playbook_match,
        instruction=payload.instruction,
        selected_text=payload.selected_text,
    )
    citations = retrieve_context_segments(
        segments=segments,
        query=f"{payload.instruction} {payload.selected_text}",
        selection_text=payload.selected_text,
        limit=3,
    )
    selected_segments = [segment for segment, _ in citations[:3]]

    if clause_matches:
        best_clause = rank_clause_bank_matches(clause_matches, query=f"{payload.instruction} {payload.selected_text}")[0]
        suggested_text = best_clause.text
        rationale = "Suggested language from your clause bank, prioritized over generic defaults because it matches the instruction and selected clause."
    elif playbook_match and playbook_match.get("suggested_text"):
        suggested_text = str(playbook_match["suggested_text"])
        rationale = f"Suggested language based on the {playbook_match['source_label']} guidance for this clause topic."
    else:
        suggested_text = build_fallback_revision(payload.selected_text, payload.instruction)
        rationale = "Suggested language based on the selected clause and the closest grounded document context."

    runtime = resolve_provider_runtime(session, workspace_id=revise_run.workspace_id, capability="revise")
    generation = generate_provider_text(
        session,
        workspace_id=revise_run.workspace_id,
        runtime=runtime,
        instructions=(
            "You are a legal drafting assistant. Return JSON only with keys suggested_text and rationale. "
            "Draft suggested language, not legal advice. Use only the selected clause, cited context, playbook guidance, and clause-bank language provided."
        ),
        prompt=build_revise_provider_prompt(
            instruction=payload.instruction,
            selected_text=payload.selected_text,
            baseline_suggestion=suggested_text,
            baseline_rationale=rationale,
            segments=selected_segments,
            clause_matches=clause_matches,
        ),
        max_output_tokens=700,
    )
    if generation:
        provider_revision = parse_provider_revision(generation.text)
        if provider_revision:
            suggested_text = provider_revision["suggested_text"]
            rationale = provider_revision["rationale"]

    if clause_matches:
        preference = summarize_preference_signals(
            session,
            workspace_id=revise_run.workspace_id,
            issue_type=clause_matches[0].issue_type,
            contract_type=_optional_str(playbook_match, "contract_type"),
            represented_party=_optional_str(playbook_match, "represented_party"),
        )
        if preference["signal_count"]:
            rationale = (
                f"{rationale} Ranking also reflects {preference['signal_count']} prior workspace preference signal(s)."
            )

    revise_run.suggested_text = suggested_text.strip()
    revise_run.rationale = enforce_revise_guardrails(rationale)
    revise_run.status = "completed"
    revise_run.completed_at = utcnow()

    existing_citations = session.execute(select(Citation).where(Citation.revise_run_id == revise_run.id)).scalars()
    for citation in existing_citations:
        session.delete(citation)
    for segment in selected_segments:
        session.add(
            Citation(
                id=f"cit-{uuid4().hex[:12]}",
                revise_run_id=revise_run.id,
                document_segment_id=segment.id,
                label=build_citation_label(segment),
                quote=extract_support_quote(segment.text, payload.instruction),
            )
        )

    _insert_audit_event(
        session,
        workspace_id=revise_run.workspace_id,
        actor_user_id=None,
        entity_type="revise_run",
        entity_id=revise_run.id,
        action="revise.completed",
        request_id=request_id,
        payload={
            "playbook_id": payload.playbook_id,
            "clause_bank_entry_ids": payload.clause_bank_entry_ids,
            "citation_count": len(selected_segments),
        },
    )
    usage_estimate = estimate_usage(
        session,
        workspace_id=revise_run.workspace_id,
        run_type="revise",
        runtime=resolve_provider_runtime(session, workspace_id=revise_run.workspace_id, capability="revise"),
        input_texts=[payload.instruction, payload.selected_text],
        output_texts=[revise_run.suggested_text or "", revise_run.rationale or ""],
    )
    record_usage_ledger(
        session,
        workspace_id=revise_run.workspace_id,
        run_type="revise",
        run_id=revise_run.id,
        provider=runtime.provider,
        model=runtime.model,
        input_tokens=usage_estimate.estimated_input_tokens,
        output_tokens=usage_estimate.estimated_output_tokens,
        estimated_cost=usage_estimate.estimated_cost,
        actual_cost=usage_estimate.estimated_cost,
    )
    session.flush()


def get_platform_ask_run(session: Session, *, ask_run_id: str) -> PlatformAskRunRecord | None:
    row = session.execute(select(AskRunPlatform).where(AskRunPlatform.id == ask_run_id)).scalar_one_or_none()
    if row is None:
        return None
    return build_platform_ask_run_record(session, ask_run_id)


def list_platform_ask_runs_for_document(
    session: Session,
    *,
    document_version_id: str,
) -> list[PlatformAskRunRecord]:
    rows = session.execute(
        select(AskRunPlatform)
        .where(AskRunPlatform.document_version_id == document_version_id)
        .order_by(AskRunPlatform.created_at.desc())
    ).scalars()
    return [build_platform_ask_run_record(session, row.id) for row in rows]


def get_platform_revise_run(
    session: Session,
    *,
    revise_run_id: str,
) -> PlatformReviseRunRecord | None:
    row = session.execute(select(ReviseRun).where(ReviseRun.id == revise_run_id)).scalar_one_or_none()
    if row is None:
        return None
    return build_platform_revise_run_record(session, revise_run_id)


def list_platform_revise_runs_for_document(
    session: Session,
    *,
    document_version_id: str,
) -> list[PlatformReviseRunRecord]:
    rows = session.execute(
        select(ReviseRun)
        .where(ReviseRun.document_version_id == document_version_id)
        .order_by(ReviseRun.created_at.desc())
    ).scalars()
    return [build_platform_revise_run_record(session, row.id) for row in rows]


def build_platform_ask_run_record(session: Session, ask_run_id: str) -> PlatformAskRunRecord:
    ask_run = session.execute(select(AskRunPlatform).where(AskRunPlatform.id == ask_run_id)).scalar_one()
    answer_row = session.execute(select(AskAnswer).where(AskAnswer.ask_run_id == ask_run.id)).scalar_one_or_none()
    citations = []
    if answer_row is not None:
        citation_rows = session.execute(
            select(Citation).where(Citation.ask_answer_id == answer_row.id).order_by(Citation.created_at.asc())
        ).scalars()
        citations = [build_platform_citation_record(session, row) for row in citation_rows]

    answer = (
        PlatformAskAnswerRecord(
            answer_text=answer_row.answer_text,
            confidence=answer_row.confidence,
            supported=bool(citations) and not answer_row.answer_text.startswith("I can't support"),
            citations=citations,
        )
        if answer_row is not None
        else None
    )
    return PlatformAskRunRecord(
        id=ask_run.id,
        workspace_id=ask_run.workspace_id,
        matter_id=ask_run.matter_id,
        document_version_id=ask_run.document_version_id,
        question=ask_run.question,
        selection_text=ask_run.selection_text,
        status=ask_run.status,
        answer=answer,
        created_at=ask_run.created_at.isoformat(),
        completed_at=ask_run.completed_at.isoformat() if ask_run.completed_at else None,
    )


def build_platform_revise_run_record(
    session: Session,
    revise_run_id: str,
) -> PlatformReviseRunRecord:
    revise_run = session.execute(select(ReviseRun).where(ReviseRun.id == revise_run_id)).scalar_one()
    citation_rows = session.execute(
        select(Citation).where(Citation.revise_run_id == revise_run.id).order_by(Citation.created_at.asc())
    ).scalars()
    citations = [build_platform_citation_record(session, row) for row in citation_rows]
    return PlatformReviseRunRecord(
        id=revise_run.id,
        workspace_id=revise_run.workspace_id,
        matter_id=revise_run.matter_id,
        document_version_id=revise_run.document_version_id,
        instruction=revise_run.instruction,
        selected_text=revise_run.selected_text,
        status=revise_run.status,
        suggested_text=label_suggested_language(revise_run.suggested_text),
        rationale=revise_run.rationale,
        citations=citations,
        created_at=revise_run.created_at.isoformat(),
        completed_at=revise_run.completed_at.isoformat() if revise_run.completed_at else None,
    )


def load_assist_segments(session: Session, *, document_version_id: str) -> list[AssistSegment]:
    rows = session.execute(
        select(DocumentSegment)
        .where(DocumentSegment.document_version_id == document_version_id)
        .order_by(DocumentSegment.ordinal.asc())
    ).scalars()
    return [
        AssistSegment(
            id=row.id,
            ordinal=row.ordinal,
            segment_type=row.segment_type,
            title=row.title,
            text=row.text,
            page_number=row.page_number,
            anchor=row.anchor_json or {},
            embedding_tokens={
                str(key): float(value)
                for key, value in (row.anchor_json or {}).get("embedding_tokens", {}).items()
            },
        )
        for row in rows
    ]


def retrieve_context_segments(
    *,
    segments: list[AssistSegment],
    query: str,
    selection_text: str | None,
    limit: int,
) -> list[tuple[AssistSegment, float]]:
    platform_segments = [segment.to_platform_segment() for segment in segments]
    scoped_segments = segments
    if selection_text:
        selection_tokens = set(build_embedding_tokens(selection_text))
        narrowed = [
            segment
            for segment in segments
            if selection_tokens.intersection(segment.embedding_tokens)
            or selection_text.lower() in segment.text.lower()
        ]
        if narrowed:
            scoped_segments = narrowed
            platform_segments = [segment.to_platform_segment() for segment in narrowed]

    results = search_segments(
        query=query,
        segments=platform_segments,
        limit=limit,
        segment_types={"clause", "paragraph", "table"},
    )
    scored: list[tuple[AssistSegment, float]] = []
    for result in results:
        match = next((segment for segment in scoped_segments if segment.ordinal == result["ordinal"]), None)
        if match is not None:
            scored.append((match, float(result["score"])))
    return scored


def load_clause_bank_matches(
    session: Session,
    *,
    workspace_id: str,
    entry_ids: list[str],
    playbook_match: dict[str, object] | None,
    instruction: str,
    selected_text: str,
) -> list[ClauseBankMatch]:
    rows = []
    if entry_ids:
        rows = find_matching_clause_bank_entries(
            session,
            workspace_id=workspace_id,
            contract_type=_optional_str(playbook_match, "contract_type"),
            issue_type=_optional_str(playbook_match, "issue_type"),
            represented_party=_optional_str(playbook_match, "represented_party"),
            query=f"{instruction} {selected_text}",
            preferred_entry_ids=entry_ids,
            limit=max(len(entry_ids), 5),
        )
    else:
        rows = find_matching_clause_bank_entries(
            session,
            workspace_id=workspace_id,
            contract_type=_optional_str(playbook_match, "contract_type"),
            issue_type=_optional_str(playbook_match, "issue_type"),
            represented_party=_optional_str(playbook_match, "represented_party"),
            query=f"{instruction} {selected_text}",
            limit=5,
        )
    return [
        ClauseBankMatch(
            id=row.id,
            issue_type=row.issue_type,
            title=row.title,
            text=row.text,
            source=row.source,
        )
        for row in rows
    ]


def rank_clause_bank_matches(matches: list[ClauseBankMatch], *, query: str) -> list[ClauseBankMatch]:
    query_tokens = set(build_embedding_tokens(query))
    return sorted(
        matches,
        key=lambda match: len(query_tokens.intersection(build_embedding_tokens(match.text))),
        reverse=True,
    )


def resolve_playbook_match(
    session: Session,
    *,
    playbook_id: str | None,
    instruction: str,
    selected_text: str,
) -> dict[str, object] | None:
    sync_platform_playbooks(session)
    rows = []
    if playbook_id:
        playbook = session.execute(select(Playbook).where(Playbook.id == playbook_id)).scalar_one_or_none()
        if playbook is not None:
            rows = [playbook]
    else:
        rows = list(session.execute(select(Playbook).where(Playbook.workspace_id.is_(None))).scalars())

    query = f"{instruction} {selected_text}".lower()
    best: dict[str, object] | None = None
    best_score = -1
    for row in rows:
        playbook = hydrate_playbook_record(row)
        for rule in playbook.issue_rules:
            terms = [
                rule.title.lower(),
                rule.issue_type.lower(),
                (rule.clause_type or "").lower(),
                *(term.lower() for term in rule.trigger.search_terms),
                *(pattern.lower() for pattern in rule.trigger.patterns),
            ]
            score = sum(1 for term in terms if term and term in query)
            if score > best_score:
                suggested_text = (
                    rule.fallback_language
                    or ISSUE_TYPE_FALLBACKS.get(rule.issue_type)
                )
                best = {
                    "rule_id": rule.id,
                    "issue_type": rule.issue_type,
                    "suggested_text": suggested_text,
                    "source_label": playbook.name,
                    "contract_type": playbook.contract_type,
                    "represented_party": playbook.represented_party,
                }
                best_score = score
    return best if best_score > 0 else None


def build_ask_answer(*, question: str, segments: list[AssistSegment]) -> str:
    answer_segments = [segment for segment in segments if segment.segment_type != "heading"] or segments
    if not answer_segments:
        return "I can't support a factual answer to that question from the current document."
    lead = summary_sentence(answer_segments[0].text)
    if len(answer_segments) == 1:
        answer = f"Based on the cited clause, {normalize_clause_sentence(lead)}"
    else:
        follow_up = summary_sentence(answer_segments[1].text)
        answer = f"Based on the cited clauses, {normalize_clause_sentence(lead)} {normalize_clause_sentence(follow_up)}"
    answer = answer.strip()
    return answer[:320].rstrip()


def build_ask_provider_prompt(*, question: str, segments: list[AssistSegment]) -> str:
    excerpts = "\n\n".join(
        f"[{build_citation_label(segment)}]\n{segment.text[:1400]}"
        for segment in segments[:3]
    )
    return (
        f"Question:\n{question.strip()}\n\n"
        f"Cited excerpts:\n{excerpts}\n\n"
        "Write a short answer supported only by the cited excerpts. If the excerpts do not support the answer, say so."
    )


def sanitize_ask_answer(text: str) -> str:
    normalized = " ".join(text.split())
    if not normalized:
        return "I can't support a factual answer to that question from the current document."
    return normalized[:420].rstrip()


def build_fallback_revision(selected_text: str, instruction: str) -> str:
    instruction_lower = instruction.lower()
    for issue_type, text in ISSUE_TYPE_FALLBACKS.items():
        if issue_type.replace("_", " ") in instruction_lower or issue_type in instruction_lower:
            return text
    if "notice" in instruction_lower:
        return "The affected party will provide prompt written notice and a reasonable opportunity to cure before any suspension, termination, or other adverse action takes effect, except where immediate action is required to prevent material harm."
    if "customer" in instruction_lower or "narrow" in instruction_lower:
        return "This clause is revised as suggested draft language: the vendor right is limited to what is reasonably necessary, subject to prior written notice, a reasonable cure period, and continuing responsibility for third parties and data protection obligations."
    return f"This clause is revised as suggested draft language: {selected_text.strip()}"


def build_revise_provider_prompt(
    *,
    instruction: str,
    selected_text: str,
    baseline_suggestion: str,
    baseline_rationale: str,
    segments: list[AssistSegment],
    clause_matches: list[ClauseBankMatch],
) -> str:
    cited_context = "\n\n".join(
        f"[{build_citation_label(segment)}]\n{segment.text[:1200]}"
        for segment in segments[:3]
    ) or "No cited context was retrieved."
    clause_bank = "\n\n".join(
        f"[{match.title}]\n{match.text[:1200]}"
        for match in clause_matches[:3]
    ) or "No clause-bank language was provided."
    return (
        f"Instruction:\n{instruction.strip()}\n\n"
        f"Selected clause:\n{selected_text.strip()}\n\n"
        f"Baseline suggested language:\n{baseline_suggestion.strip()}\n\n"
        f"Baseline rationale:\n{baseline_rationale.strip()}\n\n"
        f"Clause-bank language:\n{clause_bank}\n\n"
        f"Cited document context:\n{cited_context}\n\n"
        "Return compact JSON only. The suggested_text must be a complete replacement clause or sentence."
    )


def parse_provider_revision(text: str) -> dict[str, str] | None:
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    suggested_text = payload.get("suggested_text")
    rationale = payload.get("rationale")
    if not isinstance(suggested_text, str) or not suggested_text.strip():
        return None
    if not isinstance(rationale, str) or not rationale.strip():
        rationale = "Provider-generated suggested language based on the selected clause and cited context."
    return {
        "suggested_text": suggested_text.strip(),
        "rationale": rationale.strip(),
    }


def enforce_revise_guardrails(rationale: str) -> str:
    normalized = " ".join(rationale.split())
    if not normalized.startswith("Suggested language:"):
        normalized = f"Suggested language: {normalized[0].lower() + normalized[1:] if normalized else 'document-grounded revision.'}"
    return normalized[:260]


def label_suggested_language(text: str | None) -> str | None:
    if not text:
        return None
    normalized = text.strip()
    if normalized.lower().startswith("suggested language:"):
        return normalized
    return f"Suggested language: {normalized}"


def build_citation_label(segment: AssistSegment) -> str:
    if segment.page_number is not None:
        return f"Page {segment.page_number}, clause {segment.ordinal}"
    return f"Clause {segment.ordinal}"


def build_platform_citation_record(session: Session, row: Citation) -> PlatformReviewCitationRecord:
    segment = None
    if row.document_segment_id:
        segment = session.execute(
            select(DocumentSegment).where(DocumentSegment.id == row.document_segment_id)
        ).scalar_one_or_none()
    return PlatformReviewCitationRecord(
        id=row.id,
        document_segment_id=row.document_segment_id,
        label=row.label,
        quote=row.quote,
        ordinal=segment.ordinal if segment else None,
        page_number=segment.page_number if segment else None,
        anchor=(segment.anchor_json or {}) if segment else {},
    )


def extract_support_quote(text: str, query: str) -> str:
    lowered_text = text.lower()
    for token in build_embedding_tokens(query):
        index = lowered_text.find(token.lower())
        if index >= 0:
            start = max(0, index - 40)
            end = min(len(text), index + len(token) + 120)
            return text[start:end].strip()
    return first_sentence(text)[:180]


def first_sentence(text: str) -> str:
    parts = SENTENCE_PATTERN.split(text.strip())
    return parts[0].strip() if parts else text.strip()


def summary_sentence(text: str) -> str:
    parts = [part.strip() for part in SENTENCE_PATTERN.split(text.strip()) if part.strip()]
    if not parts:
        return text.strip()
    if len(parts) > 1 and len(parts[0].split()) <= 4:
        return parts[1]
    return parts[0]


def normalize_clause_sentence(text: str) -> str:
    if not text:
        return ""
    normalized = text.strip()
    if normalized[0].isalpha():
        normalized = normalized[0].lower() + normalized[1:]
    return normalized


def _optional_str(payload: dict[str, object] | None, key: str) -> str | None:
    if not payload:
        return None
    value = payload.get(key)
    return value if isinstance(value, str) and value else None


def _get_document_version(session: Session, document_version_id: str) -> DocumentVersion:
    row = session.execute(
        select(DocumentVersion).where(DocumentVersion.id == document_version_id)
    ).scalar_one_or_none()
    if row is None:
        raise ValueError("Document version not found.")
    return row


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
