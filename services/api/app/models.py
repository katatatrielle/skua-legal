from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


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


class AuthRegisterRequest(SkuaModel):
    email: str
    password: str
    full_name: str | None = None


class AuthLoginRequest(SkuaModel):
    email: str
    password: str


class AuthTokenResponse(SkuaModel):
    access_token: str
    token_type: str = "bearer"
    user: "PlatformUserRecord"


class PlatformUserRecord(SkuaModel):
    id: str
    email: str
    full_name: str | None = None
    is_active: bool
    workspace_ids: list[str]
    created_at: str


class ProviderConfigCreateRequest(SkuaModel):
    workspace_id: str
    provider_name: str
    encrypted_secret: str | None = None
    model_policy: dict[str, object] = Field(default_factory=dict)


class ProviderConfigRecord(SkuaModel):
    id: str
    workspace_id: str
    provider_name: str
    encrypted_secret: str | None = None
    model_policy: dict[str, object]
    is_active: bool
    plan_type: str = "hosted"
    validation_status: str = "valid"
    has_secret: bool = False
    masked_secret: str | None = None
    created_at: str


class PlatformWorkspaceRecord(SkuaModel):
    id: str
    name: str
    created_at: str
    updated_at: str


class PlatformMatterRecord(SkuaModel):
    id: str
    workspace_id: str
    name: str
    represented_party: str | None = None
    jurisdiction: str | None = None
    status: str
    created_at: str
    updated_at: str


class PlatformClauseBankEntryCreateRequest(SkuaModel):
    workspace_id: str
    contract_type: str
    issue_type: str | None = None
    represented_party: str | None = None
    title: str
    text: str
    source: str


class PlatformClauseBankEntryUpdateRequest(SkuaModel):
    contract_type: str | None = None
    issue_type: str | None = None
    represented_party: str | None = None
    title: str | None = None
    text: str | None = None


class PlatformClauseBankEntryRecord(SkuaModel):
    id: str
    workspace_id: str
    contract_type: str
    issue_type: str | None = None
    represented_party: str | None = None
    title: str
    text: str
    source: str
    created_at: str
    updated_at: str


class PlatformPreferenceSignalCreateRequest(SkuaModel):
    workspace_id: str
    entity_type: str
    entity_id: str
    signal_type: str
    signal_value: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class PlatformPreferenceSignalRecord(SkuaModel):
    id: str
    workspace_id: str
    entity_type: str
    entity_id: str
    signal_type: str
    signal_value: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)
    created_at: str


class PlatformSpendEstimateRequest(SkuaModel):
    workspace_id: str
    run_type: str
    document_version_id: str | None = None
    selection_text: str | None = None
    question: str | None = None
    instruction: str | None = None
    playbook_id: str | None = None


class PlatformSpendEstimateRecord(SkuaModel):
    workspace_id: str
    run_type: str
    provider: str
    model: str
    plan_type: str
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost: float
    monthly_actual_cost: float
    monthly_projected_cost: float
    warning_threshold: float
    hard_cap: float
    per_run_limit: float
    warning: bool
    blocked: bool
    message: str


class PlatformUsageLedgerRecord(SkuaModel):
    id: str
    workspace_id: str
    run_type: str
    run_id: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    estimated_cost: float | None = None
    actual_cost: float | None = None
    created_at: str


class PlatformUsageSummaryRecord(SkuaModel):
    workspace_id: str
    month: str
    plan_type: str
    provider: str
    model: str
    run_count: int
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    actual_cost: float
    warning_threshold: float
    hard_cap: float
    per_run_limit: float
    warning: bool
    over_cap: bool
    recent_runs: list[PlatformUsageLedgerRecord] = Field(default_factory=list)


class PlatformTrustRecord(SkuaModel):
    storage_summary: list[str] = Field(default_factory=list)
    provider_visibility: list[str] = Field(default_factory=list)
    training_policy: str
    delete_behavior: list[str] = Field(default_factory=list)
    byok_behavior: list[str] = Field(default_factory=list)
    retention_policy: list[str] = Field(default_factory=list)


class PlatformAuditEventRecord(SkuaModel):
    id: str
    workspace_id: str
    actor_user_id: str | None = None
    entity_type: str
    entity_id: str
    action: str
    request_id: str | None = None
    payload: dict[str, object] = Field(default_factory=dict)
    created_at: str


class PlatformApplyEventCreateRequest(SkuaModel):
    workspace_id: str
    event_type: str
    review_run_id: str | None = None
    finding_id: str | None = None
    revise_run_id: str | None = None
    target_anchor: dict[str, object] = Field(default_factory=dict)


class PlatformApplyEventRecord(SkuaModel):
    id: str
    workspace_id: str
    review_run_id: str | None = None
    finding_id: str | None = None
    revise_run_id: str | None = None
    event_type: str
    target_anchor: dict[str, object] = Field(default_factory=dict)
    created_at: str


class PlatformFeatureFlagRecord(SkuaModel):
    key: str
    enabled: bool


class PlatformSupportUserRecord(SkuaModel):
    user_id: str
    email: str
    workspace_ids: list[str] = Field(default_factory=list)
    provider_config_count: int = 0
    recent_audit_actions: list[str] = Field(default_factory=list)
    current_month_actual_cost: float = 0.0


class PlatformAdminOverviewRecord(SkuaModel):
    failed_job_count: int
    parse_failure_count: int
    usage_anomaly_count: int
    feature_flags: list[PlatformFeatureFlagRecord] = Field(default_factory=list)
    recent_failures: list[PlatformAuditEventRecord] = Field(default_factory=list)
    support_lookup: PlatformSupportUserRecord | None = None


class PlatformReleaseMetricRecord(SkuaModel):
    key: str
    label: str
    value: float
    unit: str
    threshold: float
    comparator: str
    sample_size: int
    minimum_sample_size: int = 1
    passing: bool
    detail: str


class PlatformReleaseCriteriaRecord(SkuaModel):
    workspace_id: str
    evaluated_at: str
    ready_for_pilot: bool
    gating_failures: list[str] = Field(default_factory=list)
    metrics: list[PlatformReleaseMetricRecord] = Field(default_factory=list)


class PlatformDocumentVersionRecord(SkuaModel):
    id: str
    workspace_id: str
    matter_id: str
    document_id: str
    name: str
    mime_type: str | None = None
    source_bucket: str | None = None
    source_key: str | None = None
    sha256: str
    version_number: int
    status: str
    parse_status: str
    index_status: str
    segment_count: int
    created_at: str


class PlatformDocumentSegmentRecord(SkuaModel):
    id: str
    segment_type: str
    ordinal: int
    title: str | None = None
    text: str
    page_number: int | None = None
    anchor: dict[str, object]
    embedding_status: str
    confidence: float


class PlatformDocumentVersionDetailRecord(SkuaModel):
    document_version: PlatformDocumentVersionRecord
    parse_status: str
    parser_name: str
    parse_confidence: float | None = None
    metadata: dict[str, object] = Field(default_factory=dict)
    segment_count: int
    segments: list[PlatformDocumentSegmentRecord]


class PlatformDocumentIngestRecord(SkuaModel):
    document_version: PlatformDocumentVersionRecord
    parse_status: str
    parser_name: str
    segment_count: int
    notes: list[str] = Field(default_factory=list)


class PlatformSelectionIngestRequest(SkuaModel):
    workspace_id: str
    matter_id: str | None = None
    document_name: str = "word-selection.txt"
    selection_text: str


class PlatformDocumentSearchRequest(SkuaModel):
    query: str
    limit: int = 5
    segment_types: list[str] = Field(default_factory=list)


class PlatformDocumentSearchResult(SkuaModel):
    segment_id: str | None = None
    ordinal: int
    segment_type: str
    title: str | None = None
    text: str
    page_number: int | None = None
    anchor: dict[str, object]
    score: float
    retrieval_mode: str


class PlatformAnchorRelocationRequest(SkuaModel):
    anchor: dict[str, object]
    document_version_id: str | None = None
    candidate_segments: list[str] = Field(default_factory=list)


class PlatformAnchorRelocationResult(SkuaModel):
    strategy: str
    matched_text: str
    score: float
    ordinal: int | None = None


class PlatformPlaybookTriggerRecord(SkuaModel):
    mode: str
    search_terms: list[str] = Field(default_factory=list)
    patterns: list[str] = Field(default_factory=list)


class PlatformPlaybookRuleRecord(SkuaModel):
    id: str
    title: str
    issue_type: str
    clause_type: str | None = None
    priority: int = 1
    action_type: str = "comment"
    trigger: PlatformPlaybookTriggerRecord
    severity: SeverityLevel
    explanation_template: str
    comment_template: str | None = None
    fallback_language: str | None = None


class PlatformPlaybookRecord(SkuaModel):
    id: str
    name: str
    version: str
    contract_type: str
    represented_party: str
    issue_rules: list[PlatformPlaybookRuleRecord]


class PlatformReviewCitationRecord(SkuaModel):
    id: str
    document_segment_id: str | None = None
    label: str | None = None
    quote: str
    ordinal: int | None = None
    page_number: int | None = None
    anchor: dict[str, object] = Field(default_factory=dict)


class PlatformReviewFindingRecord(SkuaModel):
    id: str
    review_run_id: str
    issue_type: str
    clause_type: str | None = None
    finding_type: str
    title: str
    severity: SeverityLevel
    confidence: float | None = None
    explanation: str
    proposed_action: str | None = None
    comment_text: str | None = None
    redline_text: str | None = None
    rank_score: float | None = None
    actionable: bool
    metadata: dict[str, object] = Field(default_factory=dict)
    citations: list[PlatformReviewCitationRecord] = Field(default_factory=list)


class PlatformReviewRunSummaryRecord(SkuaModel):
    total_findings: int
    actionable_count: int
    informational_count: int
    high_severity_count: int
    medium_severity_count: int
    low_severity_count: int


class PlatformReviewFilterMetadataRecord(SkuaModel):
    issue_types: list[str] = Field(default_factory=list)
    severities: list[str] = Field(default_factory=list)
    clause_types: list[str] = Field(default_factory=list)
    finding_types: list[str] = Field(default_factory=list)
    actionable_count: int = 0
    informational_count: int = 0


class PlatformReviewRunCreateRequest(SkuaModel):
    workspace_id: str
    document_version_id: str
    playbook_id: str


class PlatformReviewRunRecord(SkuaModel):
    id: str
    workspace_id: str
    matter_id: str | None = None
    document_version_id: str | None = None
    playbook: PlatformPlaybookRecord
    status: str
    model_provider: str | None = None
    model_name: str | None = None
    summary: PlatformReviewRunSummaryRecord
    filters: PlatformReviewFilterMetadataRecord
    findings: list[PlatformReviewFindingRecord] = Field(default_factory=list)
    created_at: str
    completed_at: str | None = None


class PlatformAskRunCreateRequest(SkuaModel):
    workspace_id: str
    document_version_id: str
    question: str
    selection_text: str | None = None


class PlatformAskAnswerRecord(SkuaModel):
    answer_text: str
    confidence: float | None = None
    supported: bool
    citations: list[PlatformReviewCitationRecord] = Field(default_factory=list)


class PlatformAskRunRecord(SkuaModel):
    id: str
    workspace_id: str
    matter_id: str | None = None
    document_version_id: str | None = None
    question: str
    selection_text: str | None = None
    status: str
    answer: PlatformAskAnswerRecord | None = None
    created_at: str
    completed_at: str | None = None


class PlatformReviseRunCreateRequest(SkuaModel):
    workspace_id: str
    document_version_id: str
    selected_text: str
    instruction: str
    playbook_id: str | None = None
    clause_bank_entry_ids: list[str] = Field(default_factory=list)


class PlatformReviseRunRecord(SkuaModel):
    id: str
    workspace_id: str
    matter_id: str | None = None
    document_version_id: str | None = None
    instruction: str
    selected_text: str | None = None
    status: str
    suggested_text: str | None = None
    rationale: str | None = None
    citations: list[PlatformReviewCitationRecord] = Field(default_factory=list)
    created_at: str
    completed_at: str | None = None


AuthTokenResponse.model_rebuild()
