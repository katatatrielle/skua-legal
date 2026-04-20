from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class SkuaModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True)


class SeverityLevel(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNCLEAR = "unclear"


class IssueStatus(StrEnum):
    OPEN = "open"
    REVIEWED = "reviewed"
    ACCEPTED = "accepted"
    OVERRIDDEN = "overridden"


class DocumentType(StrEnum):
    CUSTOMER_AGREEMENT = "customer_agreement"
    VENDOR_AGREEMENT = "vendor_agreement"
    NDA = "nda"
    SAAS = "saas"
    EMPLOYMENT = "employment"
    LEASE = "lease"
    AMENDMENT = "amendment"
    OTHER = "other"


class ReviewType(StrEnum):
    GENERAL = "general"
    NEGOTIATE = "negotiate"
    CUSTOM = "custom"


class ReviewAudience(StrEnum):
    INTERNAL = "internal"
    COUNTERPARTY = "counterparty"


class AnswerType(StrEnum):
    PLAIN = "plain"
    CLAUSE = "clause"
    CHECKLIST = "checklist"
    ISSUE_LIST = "issue_list"
    COMPARISON_TABLE = "comparison_table"
    MEMO = "memo"


class DraftMode(StrEnum):
    LIBRARY = "library"
    INSTRUCTION = "instruction"
    IMPROVE = "improve"


class StandardsFixMode(StrEnum):
    REPLACE_SELECTION = "replace_selection"
    INSERT_AFTER_SELECTION = "insert_after_selection"


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class SuggestionStatus(StrEnum):
    OPEN = "open"
    REVIEWED = "reviewed"
    APPLIED_COMMENT = "applied_comment"
    APPLIED_REDLINE = "applied_redline"
    DISMISSED = "dismissed"
    SAVED_TO_PLAYBOOK = "saved_to_playbook"


class AnchorReconciliationStatus(StrEnum):
    UNKNOWN = "unknown"
    STABLE = "stable"
    UPDATED = "updated"
    DRIFTED = "drifted"


class SourceCitation(SkuaModel):
    document_id: str
    page_start: int
    page_end: int
    section_heading: str
    quoted_snippet: str
    playbook_check_id: str


class KeyDate(SkuaModel):
    label: str
    value: str


class DocumentAnchor(SkuaModel):
    id: str | None = None
    type: str
    document_version_id: str | None = None
    paragraph_id: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    page_number: int | None = None
    quote: str
    quote_hash: str | None = None
    ooxml_path: str | None = None


class CitationRecord(SkuaModel):
    document_id: str
    document_version_id: str
    anchor_id: str
    label: str
    quote: str
    page_start: int | None = None
    page_end: int | None = None


class DocumentRecord(SkuaModel):
    id: str
    name: str
    doc_type: DocumentType
    counterparty: str | None = None
    effective_date: str | None = None
    expiry_date: str | None = None
    renewal_notice_days: int | None = None
    auto_renews: bool
    governing_law: str | None = None


class IssueRecord(SkuaModel):
    id: str
    workspace_id: str
    document_id: str
    title: str
    issue_type: str
    severity: SeverityLevel
    status: IssueStatus
    summary: str
    reviewer_note: str | None = None
    counterparties: list[str]
    key_dates: list[KeyDate]
    citations: list[SourceCitation]


class PlaybookCheck(SkuaModel):
    id: str
    label: str
    question: str
    output: str
    severity_if_yes: SeverityLevel


class PlaybookRecord(SkuaModel):
    name: str
    version: str
    description: str
    checks: list[PlaybookCheck]
    required_citations: list[str]


class WorkspaceSummary(SkuaModel):
    id: str
    name: str
    stage: str
    playbook_names: list[str]
    document_count: int
    issue_count: int
    high_severity_count: int
    last_updated: str


class WorkspaceDetail(SkuaModel):
    workspace: WorkspaceSummary
    documents: list[DocumentRecord]
    issues: list[IssueRecord]
    highlights: list[str]


class MemoSection(SkuaModel):
    heading: str
    body: str


class GeneratedOutput(SkuaModel):
    workspace_id: str
    memo_title: str
    memo_sections: list[MemoSection]
    exceptions_list: list[str]


class HealthResponse(SkuaModel):
    status: str


class WorkspaceCreateRequest(SkuaModel):
    name: str


class ProjectCreateRequest(SkuaModel):
    name: str


class ProjectRecord(SkuaModel):
    id: str
    workspace_id: str
    name: str
    stage: str
    document_count: int
    latest_job_status: str | None = None
    created_at: str
    last_updated: str


class DocumentVersionRecord(SkuaModel):
    id: str
    project_id: str
    source_document_id: str | None = None
    name: str
    source_type: str
    status: str
    file_hash: str
    anchor_count: int
    created_at: str


class DocumentVersionDetail(SkuaModel):
    document_version: DocumentVersionRecord
    anchors: list[DocumentAnchor]


class LibraryItemRecord(SkuaModel):
    id: str
    project_id: str
    document_version_id: str
    anchor_id: str
    document_name: str
    title: str
    section_heading: str
    text: str
    doc_type: DocumentType
    governing_law: str | None = None
    counterparty: str | None = None
    page_number: int | None = None
    source_kind: str | None = None
    score: float | None = None
    created_at: str


class LibrarySearchRequest(SkuaModel):
    project_id: str
    query: str
    limit: int | None = None
    document_version_id: str | None = None
    doc_type: DocumentType | None = None
    governing_law: str | None = None
    counterparty: str | None = None
    document_name: str | None = None


class JobRecord(SkuaModel):
    id: str
    job_type: str
    status: JobStatus
    project_id: str | None = None
    document_version_id: str | None = None
    export_id: str | None = None
    metadata: dict[str, str | int | float | bool | None]
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    worker_name: str | None = None
    error_message: str | None = None


class QueuedJobRequest(SkuaModel):
    worker_name: str | None = None


class AskSourceToggles(SkuaModel):
    current_document: bool
    current_selection: bool
    uploaded_references: bool
    org_library: bool
    legal_sources: bool
    web_search: bool


class AuditEventRecord(SkuaModel):
    id: str
    event_type: str
    actor_surface: str
    project_id: str | None = None
    document_version_id: str | None = None
    review_run_id: str | None = None
    suggestion_id: str | None = None
    payload: dict[str, str | int | float | bool | None]
    created_at: str


class UploadDocumentsResponse(SkuaModel):
    workspace: WorkspaceDetail
    notes: list[str]


class CanonicalUploadDocumentsResponse(SkuaModel):
    project: ProjectRecord
    document_versions: list[DocumentVersionRecord]
    jobs: list[JobRecord]
    notes: list[str]


class ReviewMarkupSettings(SkuaModel):
    comments: bool
    tracked_changes: bool
    fallback_position: bool
    severity_threshold: SeverityLevel


class ReviewScope(SkuaModel):
    mode: str
    anchor: DocumentAnchor | None = None


class ReviewRunSummary(SkuaModel):
    total: int
    high: int
    medium: int
    low: int


class ProposedRedline(SkuaModel):
    op: str
    replacement_text: str


class ReviewSuggestionRecord(SkuaModel):
    id: str
    review_run_id: str
    anchor_id: str
    title: str
    issue_type: str
    severity: SeverityLevel
    confidence: float
    explanation: str
    supporting_excerpt: str
    proposed_comment: str | None = None
    proposed_redline: ProposedRedline | None = None
    fallback_position_text: str | None = None
    status: SuggestionStatus
    reviewer_note: str | None = None
    applied_at: str | None = None
    dismissed_at: str | None = None
    saved_to_playbook_at: str | None = None
    saved_playbook_note_id: str | None = None
    saved_playbook_id: str | None = None
    saved_playbook_check_id: str | None = None
    latest_anchor: DocumentAnchor | None = None
    anchor_reconciliation_status: AnchorReconciliationStatus | None = None
    anchor_reconciliation_note: str | None = None
    citations: list[CitationRecord]
    events: list["ReviewSuggestionEvent"] = []


class ReviewRunCreateRequest(SkuaModel):
    project_id: str
    document_version_id: str
    scope: ReviewScope
    selection_text: str
    selection_ooxml: str | None = None
    review_type: ReviewType
    represented_party: str
    jurisdiction: str
    audience: ReviewAudience
    deal_context: dict[str, str]
    markup_settings: ReviewMarkupSettings
    playbook_ids: list[str]


class ReviewRunRecord(SkuaModel):
    id: str
    project_id: str
    document_version_id: str
    status: str
    review_type: ReviewType
    represented_party: str
    jurisdiction: str
    audience: ReviewAudience
    summary: ReviewRunSummary | None = None
    suggestions: list[ReviewSuggestionRecord]
    created_at: str
    completed_at: str | None = None


class ReviewRunExportRecord(SkuaModel):
    id: str
    review_run_id: str
    project_id: str
    document_version_id: str
    summary_markdown: str
    exported_at: str


class ReviewSuggestionApplyClientResult(SkuaModel):
    ok: bool
    message: str
    applied_anchor: DocumentAnchor | None = None


class ReviewSuggestionApplyRequest(SkuaModel):
    mode: str
    reviewer_note: str | None = None
    client_application_result: ReviewSuggestionApplyClientResult


class ReviewSuggestionDismissRequest(SkuaModel):
    reason: str | None = None


class ReviewSuggestionMarkReviewedRequest(SkuaModel):
    note: str | None = None


class ReviewSuggestionSaveToPlaybookRequest(SkuaModel):
    playbook_id: str | None = None
    playbook_check_id: str | None = None
    note: str | None = None


class ReviewSuggestionEvent(SkuaModel):
    id: str
    suggestion_id: str
    action: str
    actor_surface: str
    status_after: SuggestionStatus
    note: str | None = None
    created_at: str
    client_message: str | None = None
    applied_anchor: DocumentAnchor | None = None


class PlaybookSavedNoteRecord(SkuaModel):
    id: str
    playbook_id: str
    playbook_check_id: str | None = None
    suggestion_id: str
    review_run_id: str
    title: str
    issue_type: str
    severity: SeverityLevel
    note: str
    supporting_excerpt: str
    fallback_position_text: str | None = None
    created_at: str


class AskRunCreateRequest(SkuaModel):
    project_id: str
    document_version_id: str | None = None
    selection_anchor_id: str | None = None
    selection_text: str | None = None
    selection_anchor: DocumentAnchor | None = None
    question: str
    answer_type: AnswerType
    source_toggles: AskSourceToggles


class AskRunRecord(SkuaModel):
    id: str
    project_id: str
    document_version_id: str | None = None
    job_id: str | None = None
    question: str
    source_toggles: AskSourceToggles
    status: JobStatus | str
    answer_type: AnswerType
    answer_markdown: str
    citations: list[CitationRecord]
    created_at: str | None = None
    completed_at: str | None = None


class DraftLibraryMatch(SkuaModel):
    id: str
    title: str
    subtitle: str
    preview: str
    provenance: str
    adjusted_text: str


class DraftRunCreateRequest(SkuaModel):
    project_id: str
    document_version_id: str | None = None
    selection_text: str | None = None
    selection_anchor: DocumentAnchor | None = None
    mode: DraftMode
    query: str | None = None
    instruction: str | None = None


class DraftRunRecord(SkuaModel):
    id: str
    project_id: str
    document_version_id: str | None = None
    job_id: str | None = None
    mode: DraftMode
    query: str | None = None
    instruction: str | None = None
    status: JobStatus | str
    generated_text: str
    citations: list[CitationRecord]
    library_matches: list[DraftLibraryMatch]
    created_at: str | None = None
    completed_at: str | None = None


class QueryRunCell(SkuaModel):
    question: str
    answer: str
    citations: list[CitationRecord]


class QueryRunRow(SkuaModel):
    document_version_id: str
    document_name: str
    cells: list[QueryRunCell]


class QueryRunCreateRequest(SkuaModel):
    project_id: str
    document_version_ids: list[str]
    questions: list[str]
    name: str | None = None


class QueryRunRecord(SkuaModel):
    id: str
    project_id: str
    job_id: str | None = None
    name: str | None = None
    document_version_ids: list[str]
    questions: list[str]
    status: JobStatus | str
    rows: list[QueryRunRow]
    created_at: str | None = None
    completed_at: str | None = None


class WorkflowTemplateRecord(SkuaModel):
    id: str
    name: str
    version: str
    description: str
    questions: list[str]
    exports: list[str]
    default_artifact_variant_id: str | None = None
    artifact_variants: list["WorkflowArtifactVariantTemplate"] = []
    workbook_sheets: list["WorkflowWorkbookSheetTemplate"] = []
    memo_sections: list["WorkflowMemoSectionTemplate"] = []


class WorkflowArtifactVariantTemplate(SkuaModel):
    id: str
    name: str
    description: str | None = None
    workbook_sheets: list["WorkflowWorkbookSheetTemplate"] = []
    memo_sections: list["WorkflowMemoSectionTemplate"] = []


class WorkflowWorkbookSheetTemplate(SkuaModel):
    id: str
    title: str
    kind: str
    question_terms: list[str] = []


class WorkflowMemoSectionTemplate(SkuaModel):
    heading: str
    kind: str
    question_terms: list[str] = []
    empty_text: str | None = None


class DdReportDocumentSummary(SkuaModel):
    document_version_id: str
    document_name: str
    summary: str


class DdReportRecord(SkuaModel):
    id: str
    workflow_run_id: str
    project_id: str
    query_run_id: str | None = None
    memo_markdown: str
    exceptions_list: list[str]
    document_summaries: list[DdReportDocumentSummary]
    events: list["DdReportEventRecord"] = []
    created_at: str


class DdReportUpdateRequest(SkuaModel):
    memo_markdown: str
    exceptions_list: list[str]
    document_summaries: list[DdReportDocumentSummary]


class WorkflowRunCreateRequest(SkuaModel):
    project_id: str
    workflow_template_id: str
    document_version_ids: list[str]
    artifact_variant_id: str | None = None
    name: str | None = None


class WorkflowRunRecord(SkuaModel):
    id: str
    project_id: str
    workflow_template_id: str
    artifact_variant_id: str | None = None
    job_id: str | None = None
    name: str | None = None
    document_version_ids: list[str]
    status: JobStatus | str
    query_run_id: str | None = None
    dd_report_id: str | None = None
    rows: list[QueryRunRow]
    events: list["WorkflowRunEventRecord"] = []
    created_at: str | None = None
    completed_at: str | None = None


class WorkflowRunUpdateRequest(SkuaModel):
    rows: list[QueryRunRow]


class WorkflowRunRerunRequest(SkuaModel):
    artifact_variant_id: str | None = None
    name: str | None = None


class StandardsClauseTemplate(SkuaModel):
    id: str
    label: str
    severity: SeverityLevel
    required_terms: list[str]
    recommended_fix: str
    preferred_fix_mode: StandardsFixMode | None = None
    guidance: str | None = None
    contract_types: list[DocumentType] | None = None


class StandardsTemplateRecord(SkuaModel):
    id: str
    name: str
    version: str
    description: str
    comparison_mode: str
    required_clauses: list[StandardsClauseTemplate]


class StandardsRunCreateRequest(SkuaModel):
    project_id: str
    document_version_id: str
    standards_template_id: str
    selection_text: str
    selection_anchor: DocumentAnchor | None = None


class StandardsMissingClause(SkuaModel):
    clause_id: str
    title: str
    severity: SeverityLevel
    explanation: str
    suggested_fix: str
    fix_mode: StandardsFixMode


class StandardsWeakClause(SkuaModel):
    clause_id: str
    title: str
    severity: SeverityLevel
    explanation: str
    suggested_fix: str
    fix_mode: StandardsFixMode
    matched_excerpt: str | None = None


class StandardsRunRecord(SkuaModel):
    id: str
    project_id: str
    document_version_id: str
    standards_template_id: str
    comparison_mode: str
    status: JobStatus | str
    coverage_score: float
    missing_clauses: list[StandardsMissingClause]
    weak_clauses: list[StandardsWeakClause]
    created_at: str
    completed_at: str | None = None


class WorkflowRunEventSummary(SkuaModel):
    changed_row_count: int
    changed_cell_count: int
    changed_documents: list[str]
    changed_questions: list[str]


class WorkflowRunEventRecord(SkuaModel):
    id: str
    workflow_run_id: str
    action: str
    actor_surface: str
    previous_rows: list[QueryRunRow]
    diff_summary: WorkflowRunEventSummary
    created_at: str


class DdReportEventSummary(SkuaModel):
    memo_changed: bool
    exception_added_count: int
    exception_removed_count: int
    summary_changed_documents: list[str]


class DdReportEventRecord(SkuaModel):
    id: str
    dd_report_id: str
    action: str
    actor_surface: str
    previous_memo_markdown: str
    previous_exceptions_list: list[str]
    previous_document_summaries: list[DdReportDocumentSummary]
    diff_summary: DdReportEventSummary
    created_at: str
