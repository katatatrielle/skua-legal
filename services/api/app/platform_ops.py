from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import object_storage
from app.models import (
    PlatformAdminOverviewRecord,
    PlatformApplyEventCreateRequest,
    PlatformApplyEventRecord,
    PlatformAuditEventRecord,
    PlatformFeatureFlagRecord,
    PlatformMatterRecord,
    PlatformReleaseCriteriaRecord,
    PlatformReleaseMetricRecord,
    PlatformSupportUserRecord,
    PlatformTrustRecord,
)
from app.object_storage import delete_object
from app.platform_auth import get_workspace_ids_for_user
from app.platform_models import (
    ApplyEvent,
    AskAnswer,
    AskRunPlatform,
    AuditEventPlatform,
    Citation,
    ClauseBankEntry,
    Document,
    DocumentSegment,
    DocumentVersion,
    Finding,
    Matter,
    ParsedDocument,
    PreferenceSignal,
    ProviderConfig,
    ReviewRunPlatform,
    ReviseRun,
    User,
)
from app.platform_provider import list_usage_anomalies, summarize_usage_for_workspace
from app.settings import get_settings


SETTINGS = get_settings()
WHITESPACE_PATTERN = re.compile(r"\s+")

RELEASE_THRESHOLDS = {
    "parse_success_rate": {"threshold": 0.95, "comparator": "gte", "minimum_sample_size": 1},
    "review_failure_rate": {"threshold": 0.10, "comparator": "lte", "minimum_sample_size": 1},
    "citation_validation_failure_rate": {"threshold": 0.02, "comparator": "lte", "minimum_sample_size": 1},
    "add_in_apply_failure_rate": {"threshold": 0.05, "comparator": "lte", "minimum_sample_size": 1},
    "accepted_suggestion_rate": {"threshold": 0.30, "comparator": "gte", "minimum_sample_size": 1},
    "average_run_cost": {"threshold": 0.50, "comparator": "lte", "minimum_sample_size": 1},
}


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def list_audit_events(
    session: Session,
    *,
    workspace_id: str,
    limit: int = 50,
) -> list[PlatformAuditEventRecord]:
    rows = list(
        session.execute(
            select(AuditEventPlatform)
            .where(AuditEventPlatform.workspace_id == workspace_id)
            .order_by(AuditEventPlatform.created_at.desc())
        ).scalars()
    )
    return [build_audit_event_record(row) for row in rows[:limit]]


def list_matters(session: Session, *, workspace_id: str) -> list[PlatformMatterRecord]:
    rows = list(
        session.execute(
            select(Matter).where(Matter.workspace_id == workspace_id).order_by(Matter.created_at.asc())
        ).scalars()
    )
    return [
        PlatformMatterRecord(
            id=row.id,
            workspace_id=row.workspace_id,
            name=row.name,
            represented_party=row.represented_party,
            jurisdiction=row.jurisdiction,
            status=row.status,
            created_at=row.created_at.isoformat(),
            updated_at=row.updated_at.isoformat(),
        )
        for row in rows
    ]


def create_apply_event(
    session: Session,
    *,
    payload: PlatformApplyEventCreateRequest,
    actor_user_id: str | None,
    request_id: str | None,
) -> PlatformApplyEventRecord:
    row = ApplyEvent(
        id=f"apply-{uuid4().hex[:12]}",
        workspace_id=payload.workspace_id,
        review_run_id=payload.review_run_id,
        finding_id=payload.finding_id,
        revise_run_id=payload.revise_run_id,
        event_type=payload.event_type,
        target_anchor_json=payload.target_anchor,
    )
    session.add(row)
    session.flush()
    insert_audit_event(
        session,
        workspace_id=payload.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="apply_event",
        entity_id=row.id,
        action=f"apply.{payload.event_type}",
        request_id=request_id,
        payload={
            "review_run_id": payload.review_run_id,
            "finding_id": payload.finding_id,
            "revise_run_id": payload.revise_run_id,
        },
    )
    return PlatformApplyEventRecord(
        id=row.id,
        workspace_id=row.workspace_id,
        review_run_id=row.review_run_id,
        finding_id=row.finding_id,
        revise_run_id=row.revise_run_id,
        event_type=row.event_type,
        target_anchor=row.target_anchor_json or {},
        created_at=row.created_at.isoformat(),
    )


def delete_platform_document(
    session: Session,
    *,
    document_id: str,
    actor_user_id: str | None,
    request_id: str | None,
) -> bool:
    document = session.execute(select(Document).where(Document.id == document_id)).scalar_one_or_none()
    if document is None:
        return False
    versions = list(session.execute(select(DocumentVersion).where(DocumentVersion.document_id == document.id)).scalars())
    for version in versions:
        location = resolve_source_location(version)
        if location:
            delete_object(location)
        parsed_rows = list(session.execute(select(ParsedDocument).where(ParsedDocument.document_version_id == version.id)).scalars())
        for parsed in parsed_rows:
            session.delete(parsed)
        session.delete(version)
    insert_audit_event(
        session,
        workspace_id=document.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="document",
        entity_id=document.id,
        action="document.deleted",
        request_id=request_id,
        payload={"name": document.name, "matter_id": document.matter_id},
    )
    session.delete(document)
    return True


def delete_platform_matter(
    session: Session,
    *,
    matter_id: str,
    actor_user_id: str | None,
    request_id: str | None,
) -> bool:
    matter = session.execute(select(Matter).where(Matter.id == matter_id)).scalar_one_or_none()
    if matter is None:
        return False
    documents = list(session.execute(select(Document).where(Document.matter_id == matter.id)).scalars())
    for document in documents:
        delete_platform_document(
            session,
            document_id=document.id,
            actor_user_id=actor_user_id,
            request_id=request_id,
        )
    insert_audit_event(
        session,
        workspace_id=matter.workspace_id,
        actor_user_id=actor_user_id,
        entity_type="matter",
        entity_id=matter.id,
        action="matter.deleted",
        request_id=request_id,
        payload={"name": matter.name},
    )
    session.delete(matter)
    return True


def build_trust_record() -> PlatformTrustRecord:
    return PlatformTrustRecord(
        storage_summary=[
            "Skua stores uploaded source files, parsed segments, review/ask/revise runs, saved clauses, provider configuration metadata, usage records, and audit logs.",
            "Generated artifacts are stored separately from source files so deletes can remove user documents without leaving derived files behind.",
        ],
        provider_visibility=[
            "Hosted mode sends only the scoped contract text needed for the requested review, ask, revise, or embedding job.",
            "BYOK mode uses the workspace's own provider credentials and keeps the same scoping rules.",
        ],
        training_policy="Skua does not use customer document content to train its own models.",
        delete_behavior=[
            "Deleting a document removes stored source objects, parsed versions, and related platform records.",
            "Deleting a matter removes its linked documents and derived platform records.",
            "Removing a provider configuration stops future runs from using that credential immediately.",
        ],
        byok_behavior=[
            "BYOK stores an encrypted provider secret and marks runs as workspace-owned usage.",
            "Hosted mode uses Skua-managed provider credentials and the workspace billing policy.",
        ],
        retention_policy=[
            f"Usage and audit records are retained for {SETTINGS.retention_days} days unless deleted earlier for support reasons.",
            "Source files remain until the user deletes the related document or matter.",
        ],
    )


def build_admin_overview(
    session: Session,
    *,
    support_email: str | None = None,
) -> PlatformAdminOverviewRecord:
    recent_failures = list(
        session.execute(
            select(AuditEventPlatform)
            .where(
                AuditEventPlatform.action.in_(
                    ["document.parse_failed", "review.failed", "ask.unsupported"]
                )
            )
            .order_by(AuditEventPlatform.created_at.desc())
        ).scalars()
    )
    parse_failures = list(
        session.execute(select(ParsedDocument).where(ParsedDocument.parse_status == "failed")).scalars()
    )
    support_lookup = lookup_support_user(session, email=support_email) if support_email else None
    return PlatformAdminOverviewRecord(
        failed_job_count=sum(
            len(
                list(
                    session.execute(select(model).where(model.status == "failed")).scalars()
                )
            )
            for model in (ReviewRunPlatform, AskRunPlatform, ReviseRun)
        ),
        parse_failure_count=len(parse_failures),
        usage_anomaly_count=len(list_usage_anomalies(session)),
        feature_flags=[
            PlatformFeatureFlagRecord(key=key, enabled=bool(value))
            for key, value in load_feature_flags().items()
        ],
        recent_failures=[build_audit_event_record(row) for row in recent_failures[:10]],
        support_lookup=support_lookup,
    )


def build_release_criteria(
    session: Session,
    *,
    workspace_id: str,
) -> PlatformReleaseCriteriaRecord:
    document_version_rows = list(
        session.execute(
            select(DocumentVersion).where(DocumentVersion.workspace_id == workspace_id)
        ).scalars()
    )
    version_ids = [row.id for row in document_version_rows]
    parsed_rows = list(
        session.execute(
            select(ParsedDocument).where(ParsedDocument.document_version_id.in_(version_ids or [""]))
        ).scalars()
    )
    parse_success_count = sum(1 for row in parsed_rows if row.parse_status == "completed")
    parse_success_rate = (
        parse_success_count / len(parsed_rows)
        if parsed_rows
        else 0.0
    )

    review_rows = list(
        session.execute(
            select(ReviewRunPlatform).where(ReviewRunPlatform.workspace_id == workspace_id)
        ).scalars()
    )
    review_failure_rate = (
        sum(1 for row in review_rows if row.status == "failed") / len(review_rows)
        if review_rows
        else 0.0
    )

    ask_rows = list(
        session.execute(
            select(AskRunPlatform).where(AskRunPlatform.workspace_id == workspace_id)
        ).scalars()
    )
    revise_rows = list(
        session.execute(
            select(ReviseRun).where(ReviseRun.workspace_id == workspace_id)
        ).scalars()
    )
    finding_rows = list(
        session.execute(
            select(Finding).where(Finding.review_run_id.in_([row.id for row in review_rows] or [""]))
        ).scalars()
    )
    ask_answer_rows = list(
        session.execute(
            select(AskAnswer).where(AskAnswer.ask_run_id.in_([row.id for row in ask_rows] or [""]))
        ).scalars()
    )
    citation_rows = list(
        session.execute(select(Citation)).scalars()
    )
    finding_ids = {row.id for row in finding_rows}
    ask_answer_ids = {row.id for row in ask_answer_rows}
    revise_ids = {row.id for row in revise_rows}
    workspace_citations = [
        row
        for row in citation_rows
        if row.finding_id in finding_ids
        or row.ask_answer_id in ask_answer_ids
        or row.revise_run_id in revise_ids
    ]
    segment_ids = [row.document_segment_id for row in workspace_citations if row.document_segment_id]
    segment_map = {
        row.id: row
        for row in session.execute(
            select(DocumentSegment).where(DocumentSegment.id.in_(segment_ids or [""]))
        ).scalars()
    }
    citation_validation_failures = sum(
        1 for row in workspace_citations if not _citation_is_valid(row, segment_map.get(row.document_segment_id or ""))
    )
    citation_validation_failure_rate = (
        citation_validation_failures / len(workspace_citations)
        if workspace_citations
        else 0.0
    )

    apply_rows = list(
        session.execute(
            select(ApplyEvent).where(ApplyEvent.workspace_id == workspace_id)
        ).scalars()
    )
    apply_failure_count = sum(1 for row in apply_rows if "fail" in row.event_type.lower())
    add_in_apply_failure_rate = (
        apply_failure_count / len(apply_rows)
        if apply_rows
        else 0.0
    )

    preference_rows = list(
        session.execute(
            select(PreferenceSignal).where(PreferenceSignal.workspace_id == workspace_id)
        ).scalars()
    )
    accepted_suggestion_count = sum(1 for row in preference_rows if row.signal_type == "accepted_suggestion")
    dismissed_finding_count = sum(1 for row in preference_rows if row.signal_type == "dismissed_finding")
    suggestion_decision_count = accepted_suggestion_count + dismissed_finding_count
    accepted_suggestion_rate = (
        accepted_suggestion_count / suggestion_decision_count
        if suggestion_decision_count
        else 0.0
    )

    usage_summary = summarize_usage_for_workspace(session, workspace_id=workspace_id)
    average_run_cost = (
        usage_summary.actual_cost / usage_summary.run_count
        if usage_summary.run_count
        else 0.0
    )

    metrics = [
        _build_release_metric(
            key="parse_success_rate",
            label="Parse success rate",
            value=parse_success_rate,
            unit="percent",
            sample_size=len(parsed_rows),
            detail=(
                f"{parse_success_count} of {len(parsed_rows)} parsed document version(s) completed successfully."
                if parsed_rows
                else "No parsed document versions yet."
            ),
        ),
        _build_release_metric(
            key="review_failure_rate",
            label="Review failure rate",
            value=review_failure_rate,
            unit="percent",
            sample_size=len(review_rows),
            detail=(
                f"{sum(1 for row in review_rows if row.status == 'failed')} of {len(review_rows)} review run(s) failed."
                if review_rows
                else "No review runs yet."
            ),
        ),
        _build_release_metric(
            key="citation_validation_failure_rate",
            label="Citation validation failure rate",
            value=citation_validation_failure_rate,
            unit="percent",
            sample_size=len(workspace_citations),
            detail=(
                f"{citation_validation_failures} of {len(workspace_citations)} citation(s) failed quote validation."
                if workspace_citations
                else "No citations yet."
            ),
        ),
        _build_release_metric(
            key="add_in_apply_failure_rate",
            label="Add-in apply failure rate",
            value=add_in_apply_failure_rate,
            unit="percent",
            sample_size=len(apply_rows),
            detail=(
                f"{apply_failure_count} of {len(apply_rows)} apply event(s) were logged as failures."
                if apply_rows
                else "No add-in apply events yet."
            ),
        ),
        _build_release_metric(
            key="accepted_suggestion_rate",
            label="Accepted suggestion rate",
            value=accepted_suggestion_rate,
            unit="percent",
            sample_size=suggestion_decision_count,
            detail=(
                f"{accepted_suggestion_count} accepted suggestion signal(s) and {dismissed_finding_count} dismissal signal(s)."
                if suggestion_decision_count
                else "No suggestion decisions yet."
            ),
        ),
        _build_release_metric(
            key="average_run_cost",
            label="Average run cost",
            value=average_run_cost,
            unit="usd",
            sample_size=usage_summary.run_count,
            detail=(
                f"${usage_summary.actual_cost:.4f} across {usage_summary.run_count} billable run(s) this month."
                if usage_summary.run_count
                else "No billable runs yet."
            ),
        ),
    ]
    gating_failures = [metric.detail for metric in metrics if not metric.passing]
    return PlatformReleaseCriteriaRecord(
        workspace_id=workspace_id,
        evaluated_at=utcnow().isoformat(),
        ready_for_pilot=not gating_failures,
        gating_failures=gating_failures,
        metrics=metrics,
    )


def lookup_support_user(session: Session, *, email: str) -> PlatformSupportUserRecord | None:
    user = session.execute(select(User).where(User.email == email.strip().lower())).scalar_one_or_none()
    if user is None:
        return None
    workspace_ids = get_workspace_ids_for_user(session, user.id)
    recent_audits = list(
        session.execute(
            select(AuditEventPlatform)
            .where(AuditEventPlatform.workspace_id.in_(workspace_ids))
            .order_by(AuditEventPlatform.created_at.desc())
        ).scalars()
    )
    provider_count = session.execute(
        select(ProviderConfig).where(ProviderConfig.workspace_id.in_(workspace_ids))
    ).scalars().all()
    total_actual = 0.0
    for workspace_id in workspace_ids:
        total_actual += summarize_usage_for_workspace(session, workspace_id=workspace_id).actual_cost
    return PlatformSupportUserRecord(
        user_id=user.id,
        email=user.email,
        workspace_ids=workspace_ids,
        provider_config_count=len(provider_count),
        recent_audit_actions=[row.action for row in recent_audits[:10]],
        current_month_actual_cost=round(total_actual, 6),
    )


def insert_audit_event(
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


def build_audit_event_record(row: AuditEventPlatform) -> PlatformAuditEventRecord:
    return PlatformAuditEventRecord(
        id=row.id,
        workspace_id=row.workspace_id,
        actor_user_id=row.actor_user_id,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        action=row.action,
        request_id=row.request_id,
        payload=row.payload_json or {},
        created_at=row.created_at.isoformat(),
    )


def resolve_source_location(version: DocumentVersion) -> str | None:
    if version.source_object_bucket and version.source_object_key:
        if version.source_object_bucket.startswith("local"):
            return str(object_storage.LOCAL_SOURCE_DIR / version.source_object_key)
        return f"s3://{version.source_object_bucket}/{version.source_object_key}"
    return None


def load_feature_flags() -> dict[str, bool]:
    try:
        payload = json.loads(SETTINGS.feature_flags_json)
    except json.JSONDecodeError:
        return {}
    return {str(key): bool(value) for key, value in payload.items()}


def _build_release_metric(
    *,
    key: str,
    label: str,
    value: float,
    unit: str,
    sample_size: int,
    detail: str,
) -> PlatformReleaseMetricRecord:
    threshold_config = RELEASE_THRESHOLDS[key]
    minimum_sample_size = int(threshold_config["minimum_sample_size"])
    comparator = str(threshold_config["comparator"])
    threshold = float(threshold_config["threshold"])
    passing = sample_size >= minimum_sample_size and _compare_metric_value(
        value=value,
        threshold=threshold,
        comparator=comparator,
    )
    return PlatformReleaseMetricRecord(
        key=key,
        label=label,
        value=round(value, 6),
        unit=unit,
        threshold=threshold,
        comparator=comparator,
        sample_size=sample_size,
        minimum_sample_size=minimum_sample_size,
        passing=passing,
        detail=detail,
    )


def _compare_metric_value(*, value: float, threshold: float, comparator: str) -> bool:
    if comparator == "gte":
        return value >= threshold
    return value <= threshold


def _citation_is_valid(citation: Citation, segment: DocumentSegment | None) -> bool:
    quote = (citation.quote or "").strip()
    if not quote or segment is None:
        return False
    normalized_quote = _normalize_for_match(quote)
    normalized_text = _normalize_for_match(segment.text or "")
    return bool(normalized_quote) and normalized_quote in normalized_text


def _normalize_for_match(value: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", value.strip().lower())
