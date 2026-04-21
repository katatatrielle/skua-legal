from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from rq import Retry
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    PlatformPlaybookRecord,
    PlatformReviewCitationRecord,
    PlatformReviewFilterMetadataRecord,
    PlatformReviewFindingRecord,
    PlatformReviewRunCreateRequest,
    PlatformReviewRunRecord,
    PlatformReviewRunSummaryRecord,
)
from app.platform_db import platform_session
from app.platform_memory import find_matching_clause_bank_entries, summarize_preference_signals
from app.platform_models import (
    AuditEventPlatform,
    Citation,
    DocumentSegment,
    DocumentVersion,
    Finding,
    Playbook,
    ReviewRunPlatform,
)
from app.platform_provider import enforce_spend_controls, estimate_tokens, estimate_usage, record_usage_ledger, resolve_provider_runtime
from app.queueing import get_queue
from app.settings import ROOT_DIR


PLAYBOOK_DIR = ROOT_DIR / "packages" / "playbooks" / "platform-review"
SEVERITY_WEIGHTS = {
    "high": 300.0,
    "medium": 200.0,
    "low": 100.0,
    "unclear": 50.0,
}


@dataclass(frozen=True)
class ReviewSegmentContext:
    id: str
    ordinal: int
    segment_type: str
    title: str | None
    text: str
    page_number: int | None
    anchor: dict[str, object]

    @property
    def lowered_text(self) -> str:
        return self.text.lower()


@dataclass(frozen=True)
class ReviewExpectation:
    rule_id: str
    quote_contains: str | None = None


@dataclass(frozen=True)
class ReviewEvaluationMetrics:
    issue_precision: float
    issue_recall: float
    citation_correctness: float


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def load_platform_playbook_definitions() -> list[PlatformPlaybookRecord]:
    definitions: list[PlatformPlaybookRecord] = []
    for path in sorted(PLAYBOOK_DIR.glob("*.json")):
        payload = json.loads(path.read_text("utf-8"))
        definitions.append(PlatformPlaybookRecord.model_validate(payload))
    return definitions


def sync_platform_playbooks(session: Session) -> list[Playbook]:
    synced_rows: list[Playbook] = []
    for definition in load_platform_playbook_definitions():
        row = session.execute(select(Playbook).where(Playbook.id == definition.id)).scalar_one_or_none()
        if row is None:
            row = Playbook(
                id=definition.id,
                workspace_id=None,
                contract_type=definition.contract_type,
                represented_party=definition.represented_party,
                name=definition.name,
                version=definition.version,
                content_json=definition.model_dump(mode="json"),
            )
            session.add(row)
        else:
            row.workspace_id = None
            row.contract_type = definition.contract_type
            row.represented_party = definition.represented_party
            row.name = definition.name
            row.version = definition.version
            row.content_json = definition.model_dump(mode="json")
            row.updated_at = utcnow()
        synced_rows.append(row)
    session.flush()
    return synced_rows


def list_platform_playbooks(session: Session, *, workspace_id: str) -> list[PlatformPlaybookRecord]:
    sync_platform_playbooks(session)
    rows = session.execute(
        select(Playbook)
        .where((Playbook.workspace_id.is_(None)) | (Playbook.workspace_id == workspace_id))
        .order_by(Playbook.contract_type.asc(), Playbook.name.asc())
    ).scalars()
    return [hydrate_playbook_record(row) for row in rows]


def create_platform_review_run(
    session: Session,
    *,
    payload: PlatformReviewRunCreateRequest,
    request_id: str | None,
    actor_user_id: str | None = None,
) -> PlatformReviewRunRecord:
    sync_platform_playbooks(session)
    version = session.execute(
        select(DocumentVersion).where(DocumentVersion.id == payload.document_version_id)
    ).scalar_one_or_none()
    if version is None:
        raise ValueError("Document version not found.")
    if version.workspace_id != payload.workspace_id:
        raise ValueError("Document version does not belong to the workspace.")

    playbook = session.execute(
        select(Playbook).where(Playbook.id == payload.playbook_id)
    ).scalar_one_or_none()
    if playbook is None:
        raise ValueError("Playbook not found.")

    runtime = resolve_provider_runtime(session, workspace_id=payload.workspace_id, capability="review")
    segment_rows = list(
        session.execute(
            select(DocumentSegment)
            .where(DocumentSegment.document_version_id == version.id)
            .order_by(DocumentSegment.ordinal.asc())
        ).scalars()
    )
    estimate = estimate_usage(
        session,
        workspace_id=payload.workspace_id,
        run_type="review",
        runtime=runtime,
        input_texts=[row.text for row in segment_rows] + [json.dumps(playbook.content_json or {})],
        output_texts=["review findings summary"],
    )
    enforce_spend_controls(estimate)

    review_run = ReviewRunPlatform(
        id=f"prun-{uuid4().hex[:12]}",
        workspace_id=payload.workspace_id,
        matter_id=version.matter_id,
        document_version_id=version.id,
        playbook_id=playbook.id,
        status="queued",
        model_provider=runtime.provider,
        model_name=runtime.model,
        request_id=request_id,
    )
    session.add(review_run)
    _insert_audit_event(
        session,
        workspace_id=payload.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="review_run",
        entity_id=review_run.id,
        action="review.created",
        request_id=request_id,
        payload={
            "document_version_id": version.id,
            "playbook_id": playbook.id,
            "estimated_cost": estimate.estimated_cost,
            "provider": runtime.provider,
            "model": runtime.model,
        },
    )
    session.flush()

    queue = get_queue()
    if queue is not None:
        queue.enqueue(
            "app.platform_review.run_platform_review_job",
            review_run.id,
            request_id=request_id,
            retry=Retry(max=2, interval=[10, 30]),
            failure_ttl=24 * 60 * 60,
            result_ttl=60 * 60,
            job_id=f"platform-review:{review_run.id}",
        )
    else:
        run_platform_review(session, review_run_id=review_run.id, request_id=request_id)
    return build_platform_review_run_record(session, review_run.id)


def run_platform_review_job(review_run_id: str, *, request_id: str | None = None) -> None:
    with platform_session() as session:
        run_platform_review(session, review_run_id=review_run_id, request_id=request_id)


def run_platform_review(session: Session, *, review_run_id: str, request_id: str | None = None) -> None:
    review_run = session.execute(
        select(ReviewRunPlatform).where(ReviewRunPlatform.id == review_run_id)
    ).scalar_one_or_none()
    if review_run is None:
        return

    playbook_row = session.execute(
        select(Playbook).where(Playbook.id == review_run.playbook_id)
    ).scalar_one_or_none()
    if playbook_row is None:
        _mark_review_run_failed(
            session,
            review_run=review_run,
            request_id=request_id,
            error="Playbook not found.",
        )
        return

    try:
        playbook = hydrate_playbook_record(playbook_row)
    except Exception as error:
        _mark_review_run_failed(
            session,
            review_run=review_run,
            request_id=request_id,
            error=f"Invalid playbook payload: {error}",
        )
        return

    segment_rows = session.execute(
        select(DocumentSegment)
        .where(DocumentSegment.document_version_id == review_run.document_version_id)
        .order_by(DocumentSegment.ordinal.asc())
    ).scalars()
    segments = [
        ReviewSegmentContext(
            id=row.id,
            ordinal=row.ordinal,
            segment_type=row.segment_type,
            title=row.title,
            text=row.text,
            page_number=row.page_number,
            anchor=row.anchor_json or {},
        )
        for row in segment_rows
    ]
    if not segments:
        _mark_review_run_failed(
            session,
            review_run=review_run,
            request_id=request_id,
            error="Document version has no parsed segments.",
        )
        return

    review_run.status = "running"
    session.flush()
    _insert_audit_event(
        session,
        workspace_id=review_run.workspace_id,
        actor_user_id=None,
        entity_type="review_run",
        entity_id=review_run.id,
        action="review.started",
        request_id=request_id,
        payload={"playbook_id": playbook.id},
    )

    session.execute(
        delete(Citation).where(
            Citation.finding_id.in_(
                select(Finding.id).where(Finding.review_run_id == review_run.id)
            )
        )
    )
    session.execute(delete(Finding).where(Finding.review_run_id == review_run.id))

    for rule in playbook.issue_rules:
        matched_segment = find_rule_match(segments=segments, rule=rule)
        if rule.trigger.mode == "pattern" and matched_segment is None:
            continue
        if rule.trigger.mode == "missing" and matched_segment is not None:
            continue

        source_segment = matched_segment or select_support_segment(segments=segments, rule=rule)
        if source_segment is None:
            continue

        finding_type = determine_finding_type(rule.action_type, rule.fallback_language)
        actionable = finding_type != "informational"
        confidence = (
            0.93
            if matched_segment is not None
            else 0.76
        )
        quote = build_support_quote(
            segment=source_segment,
            terms=(rule.trigger.patterns or rule.trigger.search_terms),
        )
        explanation = rule.explanation_template.strip()
        comment_text = (rule.comment_template or "").strip() or None
        redline_text = (rule.fallback_language or "").strip() or None
        proposed_action = build_proposed_action(
            finding_type=finding_type,
            comment_text=comment_text,
            redline_text=redline_text,
        )
        clause_matches = find_matching_clause_bank_entries(
            session,
            workspace_id=review_run.workspace_id,
            contract_type=playbook.contract_type,
            issue_type=rule.issue_type,
            represented_party=playbook.represented_party,
            query=f"{rule.title} {rule.explanation_template} {source_segment.text}",
            limit=3,
        )
        if clause_matches and actionable:
            redline_text = clause_matches[0].text
            proposed_action = build_proposed_action(
                finding_type=finding_type,
                comment_text=comment_text,
                redline_text=redline_text,
            )
        preference_summary = summarize_preference_signals(
            session,
            workspace_id=review_run.workspace_id,
            issue_type=rule.issue_type,
            contract_type=playbook.contract_type,
            represented_party=playbook.represented_party,
        )
        rank_score = compute_rank_score(
            severity=rule.severity,
            priority=rule.priority,
            confidence=confidence,
            clause_match_count=len(clause_matches),
            preference_score=float(preference_summary["score"]),
        )
        metadata = {
            "rule_id": rule.id,
            "action_type": rule.action_type,
            "priority": rule.priority,
            "source_segment_ids": [source_segment.id],
            "contract_type": playbook.contract_type,
            "represented_party": playbook.represented_party,
            "preferred_clause_ids": [entry.id for entry in clause_matches],
            "preferred_clause_titles": [entry.title for entry in clause_matches],
            "preference_signal_counts": preference_summary["counts"],
            "preference_signal_score": preference_summary["score"],
            "draft_source": "clause_bank" if clause_matches and actionable else "playbook",
        }

        validate_review_payload(
            explanation=explanation,
            rule_explanation=rule.explanation_template,
            segment=source_segment,
            quote=quote,
        )

        finding = Finding(
            id=f"finding-{uuid4().hex[:12]}",
            review_run_id=review_run.id,
            issue_type=rule.issue_type,
            clause_type=rule.clause_type,
            finding_type=finding_type,
            title=rule.title,
            severity=rule.severity,
            confidence=confidence,
            explanation=explanation,
            proposed_action=proposed_action,
            comment_text=comment_text,
            redline_text=redline_text if actionable and redline_text else None,
            rank_score=rank_score,
            metadata_json=metadata,
        )
        session.add(finding)
        session.flush()
        session.add(
            Citation(
                id=f"cit-{uuid4().hex[:12]}",
                finding_id=finding.id,
                document_segment_id=source_segment.id,
                label=build_citation_label(source_segment),
                quote=quote,
            )
        )

    review_run.status = "completed"
    review_run.completed_at = utcnow()
    _insert_audit_event(
        session,
        workspace_id=review_run.workspace_id,
        actor_user_id=None,
        entity_type="review_run",
        entity_id=review_run.id,
        action="review.completed",
        request_id=request_id,
        payload={"finding_count": _count_review_run_findings(session, review_run.id)},
    )
    usage_estimate = estimate_usage(
        session,
        workspace_id=review_run.workspace_id,
        run_type="review",
        runtime=resolve_provider_runtime(session, workspace_id=review_run.workspace_id, capability="review"),
        input_texts=[segment.text for segment in segments],
        output_texts=[finding.title for finding in session.execute(select(Finding).where(Finding.review_run_id == review_run.id)).scalars()],
    )
    record_usage_ledger(
        session,
        workspace_id=review_run.workspace_id,
        run_type="review",
        run_id=review_run.id,
        provider=review_run.model_provider or "deterministic",
        model=review_run.model_name or "playbook-rules-v1",
        input_tokens=usage_estimate.estimated_input_tokens,
        output_tokens=usage_estimate.estimated_output_tokens,
        estimated_cost=usage_estimate.estimated_cost,
        actual_cost=usage_estimate.estimated_cost,
    )
    session.flush()


def list_platform_review_runs_for_document(
    session: Session,
    *,
    document_version_id: str,
) -> list[PlatformReviewRunRecord]:
    rows = session.execute(
        select(ReviewRunPlatform)
        .where(ReviewRunPlatform.document_version_id == document_version_id)
        .order_by(ReviewRunPlatform.created_at.desc())
    ).scalars()
    return [build_platform_review_run_record(session, row.id) for row in rows]


def get_platform_review_run(
    session: Session,
    *,
    review_run_id: str,
) -> PlatformReviewRunRecord | None:
    row = session.execute(
        select(ReviewRunPlatform).where(ReviewRunPlatform.id == review_run_id)
    ).scalar_one_or_none()
    if row is None:
        return None
    return build_platform_review_run_record(session, row.id)


def build_platform_review_run_record(session: Session, review_run_id: str) -> PlatformReviewRunRecord:
    review_run = session.execute(
        select(ReviewRunPlatform).where(ReviewRunPlatform.id == review_run_id)
    ).scalar_one()
    playbook_row = session.execute(
        select(Playbook).where(Playbook.id == review_run.playbook_id)
    ).scalar_one()
    playbook = hydrate_playbook_record(playbook_row)

    finding_rows = session.execute(
        select(Finding)
        .where(Finding.review_run_id == review_run.id)
        .order_by(Finding.rank_score.desc(), Finding.created_at.asc())
    ).scalars()
    findings: list[PlatformReviewFindingRecord] = []
    for finding in finding_rows:
        citation_rows = session.execute(
            select(Citation).where(Citation.finding_id == finding.id).order_by(Citation.created_at.asc())
        ).scalars()
        citations = [build_platform_review_citation_record(session, row) for row in citation_rows]
        findings.append(
            PlatformReviewFindingRecord(
                id=finding.id,
                review_run_id=finding.review_run_id,
                issue_type=finding.issue_type or "general",
                clause_type=finding.clause_type,
                finding_type=finding.finding_type,
                title=finding.title,
                severity=finding.severity,
                confidence=finding.confidence,
                explanation=finding.explanation,
                proposed_action=finding.proposed_action,
                comment_text=finding.comment_text,
                redline_text=finding.redline_text,
                rank_score=finding.rank_score,
                actionable=finding.finding_type != "informational",
                metadata=finding.metadata_json or {},
                citations=citations,
            )
        )

    summary = PlatformReviewRunSummaryRecord(
        total_findings=len(findings),
        actionable_count=sum(1 for finding in findings if finding.actionable),
        informational_count=sum(1 for finding in findings if not finding.actionable),
        high_severity_count=sum(1 for finding in findings if finding.severity == "high"),
        medium_severity_count=sum(1 for finding in findings if finding.severity == "medium"),
        low_severity_count=sum(1 for finding in findings if finding.severity == "low"),
    )
    filters = PlatformReviewFilterMetadataRecord(
        issue_types=sorted({finding.issue_type for finding in findings}),
        severities=sorted({finding.severity for finding in findings}),
        clause_types=sorted({finding.clause_type for finding in findings if finding.clause_type}),
        finding_types=sorted({finding.finding_type for finding in findings}),
        actionable_count=summary.actionable_count,
        informational_count=summary.informational_count,
    )
    return PlatformReviewRunRecord(
        id=review_run.id,
        workspace_id=review_run.workspace_id,
        matter_id=review_run.matter_id,
        document_version_id=review_run.document_version_id,
        playbook=playbook,
        status=review_run.status,
        model_provider=review_run.model_provider,
        model_name=review_run.model_name,
        summary=summary,
        filters=filters,
        findings=findings,
        created_at=review_run.created_at.isoformat(),
        completed_at=review_run.completed_at.isoformat() if review_run.completed_at else None,
    )


def evaluate_review_expectations(
    run_record: PlatformReviewRunRecord,
    expectations: list[ReviewExpectation],
) -> ReviewEvaluationMetrics:
    predicted = {str(finding.metadata.get("rule_id")) for finding in run_record.findings}
    expected = {expectation.rule_id for expectation in expectations}
    matched = predicted & expected

    precision = len(matched) / len(predicted) if predicted else 1.0
    recall = len(matched) / len(expected) if expected else 1.0

    correct_citations = 0
    total_checked = 0
    for expectation in expectations:
        if expectation.quote_contains is None:
            continue
        total_checked += 1
        finding = next(
            (
                candidate
                for candidate in run_record.findings
                if candidate.metadata.get("rule_id") == expectation.rule_id
            ),
            None,
        )
        if finding and any(expectation.quote_contains.lower() in citation.quote.lower() for citation in finding.citations):
            correct_citations += 1
    citation_correctness = correct_citations / total_checked if total_checked else 1.0
    return ReviewEvaluationMetrics(
        issue_precision=precision,
        issue_recall=recall,
        citation_correctness=citation_correctness,
    )


def hydrate_playbook_record(row: Playbook) -> PlatformPlaybookRecord:
    payload = {
        "id": row.id,
        "name": row.name,
        "version": row.version,
        "contract_type": row.contract_type,
        "represented_party": row.represented_party,
        **(row.content_json or {}),
    }
    return PlatformPlaybookRecord.model_validate(payload)


def find_rule_match(
    *,
    segments: list[ReviewSegmentContext],
    rule,
) -> ReviewSegmentContext | None:
    patterns = [pattern.lower() for pattern in (rule.trigger.patterns or []) if pattern.strip()]
    threshold = match_threshold(rule.trigger.search_terms)
    for segment in iter_reviewable_segments(segments):
        if patterns and any(pattern in segment.lowered_text for pattern in patterns):
            return segment
        if rule.trigger.mode == "missing":
            hits = sum(1 for term in rule.trigger.search_terms if term.lower() in segment.lowered_text)
            if hits >= threshold:
                return segment
    return None


def select_support_segment(
    *,
    segments: list[ReviewSegmentContext],
    rule,
) -> ReviewSegmentContext | None:
    terms = [term.lower() for term in (rule.trigger.search_terms or rule.trigger.patterns or []) if term.strip()]
    reviewable = list(iter_reviewable_segments(segments))
    if not reviewable:
        return None
    scored = sorted(
        reviewable,
        key=lambda segment: (
            sum(1 for term in terms if term in segment.lowered_text),
            -abs(segment.ordinal - reviewable[0].ordinal),
        ),
        reverse=True,
    )
    return scored[0]


def iter_reviewable_segments(segments: list[ReviewSegmentContext]):
    for segment in segments:
        if segment.segment_type in {"heading", "clause", "paragraph"} and segment.text.strip():
            yield segment


def match_threshold(terms: list[str]) -> int:
    if not terms:
        return 1
    return max(1, min(2, len(terms)))


def determine_finding_type(action_type: str, fallback_language: str | None) -> str:
    if action_type == "redline" and fallback_language:
        return "redline"
    if action_type == "comment":
        return "comment"
    return "informational"


def build_support_quote(*, segment: ReviewSegmentContext, terms: list[str]) -> str:
    lowered_text = segment.lowered_text
    for term in terms:
        index = lowered_text.find(term.lower())
        if index >= 0:
            start = max(0, index - 40)
            end = min(len(segment.text), index + len(term) + 120)
            return segment.text[start:end].strip()
    return segment.text[:180].strip()


def build_proposed_action(
    *,
    finding_type: str,
    comment_text: str | None,
    redline_text: str | None,
) -> str | None:
    if finding_type == "redline" and redline_text:
        return "Insert the suggested fallback language or adapt it to the clause context."
    if finding_type == "comment" and comment_text:
        return comment_text
    return None


def compute_rank_score(
    *,
    severity: str,
    priority: int,
    confidence: float,
    clause_match_count: int = 0,
    preference_score: float = 0.0,
) -> float:
    return (
        SEVERITY_WEIGHTS.get(severity, 0.0)
        + float(priority * 10)
        + round(confidence * 10, 2)
        + float(clause_match_count * 15)
        + round(preference_score, 2)
    )


def validate_review_payload(
    *,
    explanation: str,
    rule_explanation: str,
    segment: ReviewSegmentContext,
    quote: str,
) -> None:
    if explanation.strip() != rule_explanation.strip():
        raise ValueError("Unsupported explanation text.")
    if not quote.strip():
        raise ValueError("Citation quote is required.")
    if quote not in segment.text:
        raise ValueError("Citation quote does not match the source segment.")


def build_citation_label(segment: ReviewSegmentContext) -> str:
    if segment.page_number is not None:
        return f"Page {segment.page_number}, clause {segment.ordinal}"
    return f"Clause {segment.ordinal}"


def build_platform_review_citation_record(session: Session, row: Citation) -> PlatformReviewCitationRecord:
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


def _count_review_run_findings(session: Session, review_run_id: str) -> int:
    return len(
        session.execute(select(Finding.id).where(Finding.review_run_id == review_run_id)).all()
    )


def _mark_review_run_failed(
    session: Session,
    *,
    review_run: ReviewRunPlatform,
    request_id: str | None,
    error: str,
) -> None:
    review_run.status = "failed"
    review_run.completed_at = utcnow()
    _insert_audit_event(
        session,
        workspace_id=review_run.workspace_id,
        actor_user_id=None,
        entity_type="review_run",
        entity_id=review_run.id,
        action="review.failed",
        request_id=request_id,
        payload={"error": error},
    )
    session.flush()


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
