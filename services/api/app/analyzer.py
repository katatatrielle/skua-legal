from __future__ import annotations

import re
from dataclasses import dataclass

from app.models import (
    CitationRecord,
    DocumentAnchor,
    DocumentRecord,
    GeneratedOutput,
    IssueRecord,
    IssueStatus,
    KeyDate,
    MemoSection,
    PlaybookRecord,
    ProposedRedline,
    ReviewMarkupSettings,
    ReviewRunSummary,
    ReviewSuggestionRecord,
    SuggestionStatus,
    SeverityLevel,
    SourceCitation,
    WorkspaceDetail,
)
from app.parsing import ParsedPage, normalize_whitespace

SEVERITY_RANK = {
    SeverityLevel.HIGH: 3,
    SeverityLevel.MEDIUM: 2,
    SeverityLevel.LOW: 1,
    SeverityLevel.UNCLEAR: 0,
}

CANADIAN_GOVERNING_LAW_HINTS = [
    "ontario",
    "canada",
    "alberta",
    "british columbia",
    "quebec",
    "nova scotia",
    "manitoba",
    "saskatchewan",
]


@dataclass(frozen=True, slots=True)
class DetectionRule:
    issue_type: str
    check_id: str
    title: str
    summary: str
    pattern: re.Pattern[str]


DETECTION_RULES = [
    DetectionRule(
        issue_type="assignment",
        check_id="assignment",
        title="Assignment appears to require counterparty consent",
        summary="The agreement appears to restrict assignment or transfer without prior consent.",
        pattern=re.compile(
            r"(?:may not|shall not|will not).{0,120}\bassign|prior written consent.{0,80}\bassign",
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    DetectionRule(
        issue_type="change_of_control",
        check_id="change_of_control",
        title="Change-of-control language appears in the transfer provisions",
        summary="The agreement appears to mention change of control, merger, or sale-of-assets transfer restrictions.",
        pattern=re.compile(
            r"change of control|merger|sale of assets",
            re.IGNORECASE,
        ),
    ),
    DetectionRule(
        issue_type="auto_renewal",
        check_id="auto_renewal",
        title="Automatic renewal language was detected",
        summary="The agreement appears to renew automatically absent advance notice.",
        pattern=re.compile(
            r"automatic(?:ally)? renew|renew automatically|additional one[- ]year term|successive renewal term",
            re.IGNORECASE,
        ),
    ),
    DetectionRule(
        issue_type="exclusivity",
        check_id="exclusivity",
        title="Exclusivity, MFN, or non-compete language was detected",
        summary="The agreement appears to include exclusivity, MFN-style pricing, or non-compete restrictions.",
        pattern=re.compile(
            r"\bexclusive\b|most favou?red|most favou?red nation|\bmfn\b|non[- ]compete",
            re.IGNORECASE,
        ),
    ),
    DetectionRule(
        issue_type="termination",
        check_id="termination",
        title="Unusual termination language may be present",
        summary="The agreement appears to contain termination-for-convenience or short-notice termination rights.",
        pattern=re.compile(
            r"terminate for convenience|without cause|for any reason upon .{0,50} notice|upon .{0,50} days?.{0,50} notice",
            re.IGNORECASE | re.DOTALL,
        ),
    ),
    DetectionRule(
        issue_type="privacy",
        check_id="privacy",
        title="Privacy or data-processing obligations were detected",
        summary="The agreement appears to include privacy, security incident, or cross-border transfer language.",
        pattern=re.compile(
            r"personal information|personal data|security incident|subprocessor|cross-border|international transfer",
            re.IGNORECASE,
        ),
    ),
    DetectionRule(
        issue_type="liability",
        check_id="liability",
        title="Liability carve-out or indemnity language may be non-standard",
        summary="The agreement appears to discuss carve-outs from the liability cap or broad indemnity obligations.",
        pattern=re.compile(
            r"liability cap.{0,80}does not apply|does not apply to.{0,80}liability|uncapped liability|indemnif(?:y|ication)",
            re.IGNORECASE | re.DOTALL,
        ),
    ),
]


def generate_issues(
    workspace_id: str,
    document: DocumentRecord,
    pages: list[ParsedPage],
    playbooks: list[PlaybookRecord],
) -> list[IssueRecord]:
    issues: list[IssueRecord] = []
    severity_map = build_severity_map(playbooks)

    for rule in DETECTION_RULES:
        citation = find_first_citation(document.id, pages, rule.check_id, rule.pattern)
        if citation is None:
            continue

        issues.append(
            IssueRecord(
                id=f"issue-{document.id}-{rule.issue_type}",
                workspace_id=workspace_id,
                document_id=document.id,
                title=rule.title,
                issue_type=rule.issue_type,
                severity=severity_map.get(rule.check_id, SeverityLevel.MEDIUM),
                status=IssueStatus.OPEN,
                summary=rule.summary,
                reviewer_note=None,
                counterparties=[document.counterparty] if document.counterparty else [],
                key_dates=build_key_dates(document, rule.issue_type),
                citations=[citation],
            )
        )

    governing_law_issue = maybe_build_governing_law_issue(
        workspace_id=workspace_id,
        document=document,
        pages=pages,
        severity=severity_map.get("governing_law", SeverityLevel.LOW),
    )
    if governing_law_issue is not None:
        issues.append(governing_law_issue)

    return issues


def generate_output(workspace: WorkspaceDetail) -> GeneratedOutput:
    top_issues = sorted(
        workspace.issues,
        key=lambda issue: SEVERITY_RANK.get(issue.severity, 0),
        reverse=True,
    )

    grouped_sections = [
        (
            "Assignment and change-of-control",
            {"assignment", "change_of_control"},
        ),
        (
            "Commercial restrictions and renewals",
            {"auto_renewal", "exclusivity", "termination"},
        ),
        (
            "Privacy, liability, and governing law",
            {"privacy", "liability", "governing_law"},
        ),
    ]

    memo_sections: list[MemoSection] = []
    for heading, issue_types in grouped_sections:
        relevant = [issue for issue in top_issues if issue.issue_type in issue_types]
        if not relevant:
            continue

        body = " ".join(
            issue.summary for issue in relevant[:3]
        )
        memo_sections.append(MemoSection(heading=heading, body=body))

    if not memo_sections:
        memo_sections.append(
            MemoSection(
                heading="Initial review result",
                body="No playbook-triggering issues were detected from the uploaded documents in this first-pass heuristic review.",
            )
        )

    exceptions_list = [
        f"{resolve_document_name(workspace, issue.document_id)}: {issue.title}"
        for issue in top_issues[:10]
    ]

    return GeneratedOutput(
        workspace_id=workspace.workspace.id,
        memo_title=f"{workspace.workspace.name} - First-Pass Commercial DD Memo",
        memo_sections=memo_sections,
        exceptions_list=exceptions_list,
    )


def build_highlights(workspace: WorkspaceDetail) -> list[str]:
    ordered = sorted(
        workspace.issues,
        key=lambda issue: SEVERITY_RANK.get(issue.severity, 0),
        reverse=True,
    )

    if not ordered:
        return ["No first-pass issues have been flagged yet for this workspace."]

    return [issue.summary for issue in ordered[:3]]


def build_severity_map(playbooks: list[PlaybookRecord]) -> dict[str, SeverityLevel]:
    severity_map: dict[str, SeverityLevel] = {}

    for playbook in playbooks:
        for check in playbook.checks:
            current = severity_map.get(check.id, SeverityLevel.UNCLEAR)
            if SEVERITY_RANK[check.severity_if_yes] > SEVERITY_RANK[current]:
                severity_map[check.id] = check.severity_if_yes

    return severity_map


def maybe_build_governing_law_issue(
    workspace_id: str,
    document: DocumentRecord,
    pages: list[ParsedPage],
    severity: SeverityLevel,
) -> IssueRecord | None:
    if not document.governing_law:
        return None

    law_lower = document.governing_law.lower()
    if any(hint in law_lower for hint in CANADIAN_GOVERNING_LAW_HINTS):
        return None

    citation = find_first_citation(
        document.id,
        pages,
        "governing_law",
        re.compile(r"governed by the laws of|laws of the Province of", re.IGNORECASE),
    )
    if citation is None:
        return None

    return IssueRecord(
        id=f"issue-{document.id}-governing-law",
        workspace_id=workspace_id,
        document_id=document.id,
        title="Non-Canadian governing law was detected",
        issue_type="governing_law",
        severity=severity,
        status=IssueStatus.OPEN,
        summary=f"The agreement appears to use {document.governing_law} governing law, which may be non-standard for this diligence scope.",
        reviewer_note=None,
        counterparties=[document.counterparty] if document.counterparty else [],
        key_dates=[],
        citations=[citation],
    )


def find_first_citation(
    document_id: str,
    pages: list[ParsedPage],
    check_id: str,
    pattern: re.Pattern[str],
) -> SourceCitation | None:
    for page in pages:
        match = pattern.search(page.text)
        if match is None:
            continue

        return SourceCitation(
            document_id=document_id,
            page_start=page.page_number,
            page_end=page.page_number,
            section_heading=page.section_heading or "Matched clause",
            quoted_snippet=extract_snippet(page.text, match.start(), match.end()),
            playbook_check_id=check_id,
        )

    return None


def extract_snippet(text: str, start: int, end: int) -> str:
    window_start = max(0, start - 180)
    window_end = min(len(text), end + 180)
    return normalize_whitespace(text[window_start:window_end])


def build_key_dates(document: DocumentRecord, issue_type: str) -> list[KeyDate]:
    dates: list[KeyDate] = []

    if issue_type == "auto_renewal" and document.renewal_notice_days is not None:
        dates.append(
            KeyDate(
                label="renewal_notice_days",
                value=str(document.renewal_notice_days),
            )
        )
    if document.expiry_date and issue_type in {"auto_renewal", "termination"}:
        dates.append(KeyDate(label="expiry_date", value=document.expiry_date))

    return dates


def resolve_document_name(workspace: WorkspaceDetail, document_id: str) -> str:
    for document in workspace.documents:
        if document.id == document_id:
            return document.name
    return document_id


def generate_review_suggestions(
    review_run_id: str,
    project_id: str,
    document_version_id: str,
    selection_text: str,
    markup_settings: ReviewMarkupSettings,
    represented_party: str,
    jurisdiction: str,
) -> tuple[list[ReviewSuggestionRecord], ReviewRunSummary]:
    excerpt = normalize_whitespace(selection_text)
    excerpt_lower = excerpt.lower()
    anchor_id = f"anchor-{review_run_id}"
    anchor = DocumentAnchor(
        type="word_range",
        quote=excerpt,
        paragraph_id="selection",
        char_start=0,
        char_end=len(excerpt),
        quote_hash=f"sha256:{abs(hash(excerpt))}",
        ooxml_path="/selection",
    )

    suggestions: list[ReviewSuggestionRecord] = []

    def build_citation(label: str, quote: str) -> CitationRecord:
        return CitationRecord(
            document_id=project_id,
            document_version_id=document_version_id,
            anchor_id=anchor_id,
            label=label,
            quote=quote,
            page_start=None,
            page_end=None,
        )

    if "assign" in excerpt_lower:
        missing_carveout = not any(
            phrase in excerpt_lower
            for phrase in ["affiliate", "change of control", "merger", "reorganization"]
        )
        if missing_carveout:
            suggestions.append(
                ReviewSuggestionRecord(
                    id=f"suggestion-{review_run_id}-assignment",
                    review_run_id=review_run_id,
                    anchor_id=anchor_id,
                    title="Consent may be required on change of control",
                    issue_type="assignment",
                    severity=SeverityLevel.HIGH,
                    confidence=0.84,
                    explanation=(
                        f"The selected clause appears to prohibit assignment without a carve-out. "
                        f"For a {represented_party.lower()}-side review in {jurisdiction}, "
                        "an affiliate or internal reorganization exception is often worth proposing."
                    ),
                    supporting_excerpt=excerpt,
                    proposed_comment=(
                        f"{represented_party} counsel note: consider adding an affiliate or "
                        "change-of-control carve-out."
                        if markup_settings.comments
                        else None
                    ),
                    proposed_redline=(
                        ProposedRedline(
                            op="replace",
                            replacement_text=(
                                "Neither party may assign this Agreement without prior written consent, "
                                "except to an affiliate or in connection with a merger, reorganization, "
                                "or sale of substantially all assets."
                            ),
                        )
                        if markup_settings.tracked_changes
                        else None
                    ),
                    fallback_position_text=(
                        "Fallback position: permit affiliate transfers on notice, even if broader "
                        "change-of-control language is not accepted."
                        if markup_settings.fallback_position
                        else None
                    ),
                    status=SuggestionStatus.OPEN,
                    citations=[build_citation("Assignment clause", anchor.quote)],
                )
            )

    if "renew" in excerpt_lower or "successive" in excerpt_lower:
        suggestions.append(
            ReviewSuggestionRecord(
                id=f"suggestion-{review_run_id}-renewal",
                review_run_id=review_run_id,
                anchor_id=anchor_id,
                title="Automatic renewal language was detected",
                issue_type="auto_renewal",
                severity=SeverityLevel.MEDIUM,
                confidence=0.73,
                explanation=(
                    "The selected clause appears to renew automatically. Confirm whether the "
                    "notice period and renewal mechanics match the current playbook."
                ),
                supporting_excerpt=excerpt,
                proposed_comment=(
                    "Confirm whether the renewal cadence and notice deadline are acceptable."
                    if markup_settings.comments
                    else None
                ),
                proposed_redline=None,
                fallback_position_text=None,
                status=SuggestionStatus.OPEN,
                citations=[build_citation("Renewal clause", anchor.quote)],
            )
        )

    if "british columbia" in excerpt_lower or "delaware" in excerpt_lower:
        suggestions.append(
            ReviewSuggestionRecord(
                id=f"suggestion-{review_run_id}-governing-law",
                review_run_id=review_run_id,
                anchor_id=anchor_id,
                title="Governing law should be confirmed against the matter default",
                issue_type="governing_law",
                severity=SeverityLevel.MEDIUM,
                confidence=0.67,
                explanation=(
                    "The clause appears to select a governing law that may differ from the "
                    "deal's default position. Confirm whether this is acceptable for the current matter."
                ),
                supporting_excerpt=excerpt,
                proposed_comment=(
                    "Confirm whether this governing law position is acceptable for this matter."
                    if markup_settings.comments
                    else None
                ),
                proposed_redline=None,
                fallback_position_text=None,
                status=SuggestionStatus.OPEN,
                citations=[build_citation("Governing law clause", anchor.quote)],
            )
        )

    if "liability" in excerpt_lower and "three months" in excerpt_lower:
        suggestions.append(
            ReviewSuggestionRecord(
                id=f"suggestion-{review_run_id}-liability",
                review_run_id=review_run_id,
                anchor_id=anchor_id,
                title="Liability cap looks tighter than recent fallback language",
                issue_type="liability_cap",
                severity=SeverityLevel.LOW,
                confidence=0.61,
                explanation=(
                    "The selected liability wording appears relatively restrictive. Compare it "
                    "to the house fallback before accepting it as-is."
                ),
                supporting_excerpt=excerpt,
                proposed_comment=(
                    "Compare this cap to the house fallback before accepting."
                    if markup_settings.comments
                    else None
                ),
                proposed_redline=None,
                fallback_position_text=(
                    "Fallback position: use a 12-month fees cap with standard carve-outs."
                    if markup_settings.fallback_position
                    else None
                ),
                status=SuggestionStatus.OPEN,
                citations=[build_citation("Liability clause", anchor.quote)],
            )
        )

    summary = ReviewRunSummary(
        total=len(suggestions),
        high=sum(1 for item in suggestions if item.severity == SeverityLevel.HIGH),
        medium=sum(1 for item in suggestions if item.severity == SeverityLevel.MEDIUM),
        low=sum(1 for item in suggestions if item.severity == SeverityLevel.LOW),
    )

    return suggestions, summary
