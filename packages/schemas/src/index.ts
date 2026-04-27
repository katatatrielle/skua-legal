export const severity_levels = ["high", "medium", "low", "unclear"] as const;
export const issue_statuses = ["open", "reviewed", "accepted", "overridden"] as const;
export const anchor_types = ["word_range", "paragraph_span", "pdf_bbox", "chunk"] as const;
export const review_types = ["general", "negotiate", "custom"] as const;
export const review_audiences = ["internal", "counterparty"] as const;
export const draft_modes = ["library", "instruction", "improve"] as const;
export const suggestion_statuses = [
  "open",
  "reviewed",
  "applied_comment",
  "applied_redline",
  "dismissed",
  "saved_to_playbook"
] as const;
export const anchor_reconciliation_statuses = [
  "unknown",
  "stable",
  "updated",
  "drifted"
] as const;
export const answer_types = [
  "plain",
  "clause",
  "checklist",
  "issue_list",
  "comparison_table",
  "memo"
] as const;
export const job_statuses = ["queued", "running", "succeeded", "failed", "canceled"] as const;
export const standards_fix_modes = [
  "replace_selection",
  "insert_after_selection"
] as const;
export const document_types = [
  "customer_agreement",
  "vendor_agreement",
  "nda",
  "saas",
  "employment",
  "lease",
  "amendment",
  "other"
] as const;

export type SeverityLevel = (typeof severity_levels)[number];
export type IssueStatus = (typeof issue_statuses)[number];
export type AnchorType = (typeof anchor_types)[number];
export type ReviewType = (typeof review_types)[number];
export type ReviewAudience = (typeof review_audiences)[number];
export type DraftMode = (typeof draft_modes)[number];
export type SuggestionStatus = (typeof suggestion_statuses)[number];
export type AnchorReconciliationStatus =
  (typeof anchor_reconciliation_statuses)[number];
export type AnswerType = (typeof answer_types)[number];
export type JobStatus = (typeof job_statuses)[number];
export type StandardsFixMode = (typeof standards_fix_modes)[number];
export type DocumentType = (typeof document_types)[number];

export interface SourceCitation {
  document_id: string;
  page_start: number;
  page_end: number;
  section_heading: string;
  quoted_snippet: string;
  playbook_check_id: string;
}

export interface KeyDate {
  label: string;
  value: string;
}

export interface DocumentAnchor {
  id: string;
  type: AnchorType;
  document_version_id: string;
  paragraph_id?: string | null;
  char_start?: number | null;
  char_end?: number | null;
  page_number?: number | null;
  quote: string;
  quote_hash?: string | null;
  ooxml_path?: string | null;
}

export interface CitationRecord {
  document_id: string;
  document_version_id: string;
  anchor_id: string;
  label: string;
  quote: string;
  page_start?: number | null;
  page_end?: number | null;
}

export interface DocumentRecord {
  id: string;
  name: string;
  doc_type: DocumentType;
  counterparty?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  renewal_notice_days?: number | null;
  auto_renews: boolean;
  governing_law?: string | null;
}

export interface IssueRecord {
  id: string;
  workspace_id: string;
  document_id: string;
  title: string;
  issue_type: string;
  severity: SeverityLevel;
  status: IssueStatus;
  summary: string;
  reviewer_note?: string | null;
  counterparties: string[];
  key_dates: KeyDate[];
  citations: SourceCitation[];
}

export interface PlaybookCheck {
  id: string;
  label: string;
  question: string;
  output: string;
  severity_if_yes: SeverityLevel;
}

export interface PlaybookRecord {
  name: string;
  version: string;
  description: string;
  checks: PlaybookCheck[];
  required_citations: string[];
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  stage: string;
  playbook_names: string[];
  document_count: number;
  issue_count: number;
  high_severity_count: number;
  last_updated: string;
}

export interface WorkspaceDetail {
  workspace: WorkspaceSummary;
  documents: DocumentRecord[];
  issues: IssueRecord[];
  highlights: string[];
}

export interface GeneratedOutput {
  workspace_id: string;
  memo_title: string;
  memo_sections: Array<{
    heading: string;
    body: string;
  }>;
  exceptions_list: string[];
}

export interface WorkspaceCreateRequest {
  name: string;
}

export interface ProjectCreateRequest {
  name: string;
}

export interface ProjectRecord {
  id: string;
  workspace_id: string;
  name: string;
  stage: string;
  document_count: number;
  latest_job_status?: string | null;
  created_at: string;
  last_updated: string;
}

export interface DocumentVersionRecord {
  id: string;
  project_id: string;
  source_document_id?: string | null;
  name: string;
  source_type: string;
  status: string;
  file_hash: string;
  anchor_count: number;
  created_at: string;
}

export interface DocumentVersionDetail {
  document_version: DocumentVersionRecord;
  anchors: DocumentAnchor[];
}

export interface LibraryItemRecord {
  id: string;
  project_id: string;
  document_version_id: string;
  anchor_id: string;
  document_name: string;
  title: string;
  section_heading: string;
  text: string;
  doc_type: DocumentType;
  governing_law?: string | null;
  counterparty?: string | null;
  page_number?: number | null;
  source_kind?: string | null;
  score?: number | null;
  created_at: string;
}

export interface LibrarySearchRequest {
  project_id: string;
  query: string;
  limit?: number | null;
  document_version_id?: string | null;
  doc_type?: DocumentType | null;
  governing_law?: string | null;
  counterparty?: string | null;
  document_name?: string | null;
}

export interface JobRecord {
  id: string;
  job_type: string;
  status: JobStatus;
  project_id?: string | null;
  document_version_id?: string | null;
  export_id?: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  worker_name?: string | null;
  error_message?: string | null;
}

export interface QueuedJobRequest {
  worker_name?: string | null;
}

export interface AuditEventRecord {
  id: string;
  event_type: string;
  actor_surface: string;
  project_id?: string | null;
  document_version_id?: string | null;
  review_run_id?: string | null;
  suggestion_id?: string | null;
  payload: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface UploadDocumentsResponse {
  workspace: WorkspaceDetail;
  notes: string[];
}

export interface CanonicalUploadDocumentsResponse {
  project: ProjectRecord;
  document_versions: DocumentVersionRecord[];
  jobs: JobRecord[];
  notes: string[];
}

export interface ReviewMarkupSettings {
  comments: boolean;
  tracked_changes: boolean;
  fallback_position: boolean;
  severity_threshold: SeverityLevel;
}

export interface ReviewScope {
  mode: "full_document" | "selection";
  anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
}

export interface ReviewRunSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReviewSuggestionRecord {
  id: string;
  review_run_id: string;
  anchor_id: string;
  title: string;
  issue_type: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  supporting_excerpt: string;
  proposed_comment?: string | null;
  proposed_redline?: {
    op: "replace" | "insert_after" | "insert_before";
    replacement_text: string;
  } | null;
  fallback_position_text?: string | null;
  status: SuggestionStatus;
  reviewer_note?: string | null;
  applied_at?: string | null;
  dismissed_at?: string | null;
  saved_to_playbook_at?: string | null;
  saved_playbook_note_id?: string | null;
  saved_playbook_id?: string | null;
  saved_playbook_check_id?: string | null;
  latest_anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
  anchor_reconciliation_status?: AnchorReconciliationStatus | null;
  anchor_reconciliation_note?: string | null;
  citations: CitationRecord[];
  events?: ReviewSuggestionEvent[];
}

export interface ReviewRunCreateRequest {
  project_id: string;
  document_version_id: string;
  scope: ReviewScope;
  selection_text: string;
  selection_ooxml?: string | null;
  review_type: ReviewType;
  represented_party: string;
  jurisdiction: string;
  audience: ReviewAudience;
  deal_context: Record<string, string>;
  markup_settings: ReviewMarkupSettings;
  playbook_ids: string[];
}

export interface ReviewRunRecord {
  id: string;
  project_id: string;
  document_version_id: string;
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | "canceled";
  review_type: ReviewType;
  represented_party: string;
  jurisdiction: string;
  audience: ReviewAudience;
  summary?: ReviewRunSummary | null;
  suggestions: ReviewSuggestionRecord[];
  created_at: string;
  completed_at?: string | null;
}

export interface ReviewRunExportRecord {
  id: string;
  review_run_id: string;
  project_id: string;
  document_version_id: string;
  summary_markdown: string;
  exported_at: string;
}

export interface ReviewSuggestionApplyRequest {
  mode: "comment" | "redline";
  reviewer_note?: string | null;
  client_application_result: {
    ok: boolean;
    message: string;
    applied_anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
  };
}

export interface ReviewSuggestionDismissRequest {
  reason?: string | null;
}

export interface ReviewSuggestionMarkReviewedRequest {
  note?: string | null;
}

export interface ReviewSuggestionSaveToPlaybookRequest {
  playbook_id?: string | null;
  playbook_check_id?: string | null;
  note?: string | null;
}

export interface ReviewSuggestionEvent {
  id: string;
  suggestion_id: string;
  action:
    | "applied_comment"
    | "applied_redline"
    | "dismissed"
    | "reviewed"
    | "saved_to_playbook";
  actor_surface: "word_addin" | "web_app" | "system";
  status_after: SuggestionStatus;
  note?: string | null;
  created_at: string;
  client_message?: string | null;
  applied_anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
}

export interface PlaybookSavedNoteRecord {
  id: string;
  playbook_id: string;
  playbook_check_id?: string | null;
  suggestion_id: string;
  review_run_id: string;
  title: string;
  issue_type: string;
  severity: SeverityLevel;
  note: string;
  supporting_excerpt: string;
  fallback_position_text?: string | null;
  created_at: string;
}

export interface AskSourceToggles {
  current_document: boolean;
  current_selection: boolean;
  uploaded_references: boolean;
  org_library: boolean;
  legal_sources: boolean;
  web_search: boolean;
}

export interface AskRunCreateRequest {
  project_id: string;
  document_version_id?: string | null;
  selection_anchor_id?: string | null;
  selection_text?: string | null;
  selection_anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
  question: string;
  answer_type: AnswerType;
  source_toggles: AskSourceToggles;
}

export interface AskRunRecord {
  id: string;
  project_id: string;
  document_version_id?: string | null;
  job_id?: string | null;
  question: string;
  source_toggles: AskSourceToggles;
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | "canceled";
  answer_type: AnswerType;
  answer_markdown: string;
  citations: CitationRecord[];
  created_at?: string;
  completed_at?: string | null;
}

export interface DraftLibraryMatch {
  id: string;
  title: string;
  subtitle: string;
  preview: string;
  provenance: string;
  adjusted_text: string;
}

export interface DraftRunCreateRequest {
  project_id: string;
  document_version_id?: string | null;
  selection_text?: string | null;
  selection_anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
  mode: DraftMode;
  query?: string | null;
  instruction?: string | null;
}

export interface DraftRunRecord {
  id: string;
  project_id: string;
  document_version_id?: string | null;
  job_id?: string | null;
  mode: DraftMode;
  query?: string | null;
  instruction?: string | null;
  status: JobStatus;
  generated_text: string;
  citations: CitationRecord[];
  library_matches: DraftLibraryMatch[];
  created_at?: string;
  completed_at?: string | null;
}

export interface QueryRunCell {
  question: string;
  answer: string;
  citations: CitationRecord[];
}

export interface QueryRunRow {
  document_version_id: string;
  document_name: string;
  cells: QueryRunCell[];
}

export interface QueryRunCreateRequest {
  project_id: string;
  document_version_ids: string[];
  questions: string[];
  name?: string | null;
}

export interface QueryRunRecord {
  id: string;
  project_id: string;
  job_id?: string | null;
  name?: string | null;
  document_version_ids: string[];
  questions: string[];
  status: JobStatus;
  rows: QueryRunRow[];
  created_at?: string;
  completed_at?: string | null;
}

export interface WorkflowTemplateRecord {
  id: string;
  name: string;
  version: string;
  description: string;
  questions: string[];
  exports: string[];
  default_artifact_variant_id?: string | null;
  artifact_variants: WorkflowArtifactVariantTemplate[];
  workbook_sheets: WorkflowWorkbookSheetTemplate[];
  memo_sections: WorkflowMemoSectionTemplate[];
}

export interface WorkflowArtifactVariantTemplate {
  id: string;
  name: string;
  description?: string | null;
  workbook_sheets?: WorkflowWorkbookSheetTemplate[];
  memo_sections?: WorkflowMemoSectionTemplate[];
}

export interface WorkflowWorkbookSheetTemplate {
  id: string;
  title: string;
  kind:
    | "results"
    | "citations"
    | "exceptions"
    | "document_summaries"
    | "history";
  question_terms?: string[];
}

export interface WorkflowMemoSectionTemplate {
  heading: string;
  kind: "overview" | "question_rollup" | "document_summaries" | "exceptions" | "history";
  question_terms?: string[];
  empty_text?: string | null;
}

export interface DdReportRecord {
  id: string;
  workflow_run_id: string;
  project_id: string;
  query_run_id?: string | null;
  memo_markdown: string;
  exceptions_list: string[];
  document_summaries: Array<{
    document_version_id: string;
    document_name: string;
    summary: string;
  }>;
  events: DdReportEventRecord[];
  created_at: string;
}

export interface DdReportUpdateRequest {
  memo_markdown: string;
  exceptions_list: string[];
  document_summaries: Array<{
    document_version_id: string;
    document_name: string;
    summary: string;
  }>;
}

export interface WorkflowRunCreateRequest {
  project_id: string;
  workflow_template_id: string;
  document_version_ids: string[];
  artifact_variant_id?: string | null;
  name?: string | null;
}

export interface WorkflowRunRecord {
  id: string;
  project_id: string;
  workflow_template_id: string;
  artifact_variant_id?: string | null;
  job_id?: string | null;
  name?: string | null;
  document_version_ids: string[];
  status: JobStatus;
  query_run_id?: string | null;
  dd_report_id?: string | null;
  rows: QueryRunRow[];
  events: WorkflowRunEventRecord[];
  created_at?: string;
  completed_at?: string | null;
}

export interface WorkflowRunUpdateRequest {
  rows: QueryRunRow[];
}

export interface WorkflowRunRerunRequest {
  artifact_variant_id?: string | null;
  name?: string | null;
}

export interface StandardsTemplateRecord {
  id: string;
  name: string;
  version: string;
  description: string;
  comparison_mode: "house_standard" | "precedent_corpus";
  required_clauses: StandardsClauseTemplate[];
}

export interface StandardsClauseTemplate {
  id: string;
  label: string;
  severity: SeverityLevel;
  required_terms: string[];
  recommended_fix: string;
  preferred_fix_mode?: StandardsFixMode | null;
  guidance?: string | null;
  contract_types?: DocumentType[] | null;
}

export interface StandardsRunCreateRequest {
  project_id: string;
  document_version_id: string;
  standards_template_id: string;
  selection_text: string;
  selection_anchor?: Omit<DocumentAnchor, "id" | "document_version_id"> | null;
}

export interface StandardsMissingClause {
  clause_id: string;
  title: string;
  severity: SeverityLevel;
  explanation: string;
  suggested_fix: string;
  fix_mode: StandardsFixMode;
}

export interface StandardsWeakClause {
  clause_id: string;
  title: string;
  severity: SeverityLevel;
  explanation: string;
  suggested_fix: string;
  fix_mode: StandardsFixMode;
  matched_excerpt?: string | null;
}

export interface StandardsRunRecord {
  id: string;
  project_id: string;
  document_version_id: string;
  standards_template_id: string;
  comparison_mode: "house_standard" | "precedent_corpus";
  status: JobStatus | "succeeded";
  coverage_score: number;
  missing_clauses: StandardsMissingClause[];
  weak_clauses: StandardsWeakClause[];
  created_at: string;
  completed_at?: string | null;
}

export interface WorkflowRunEventSummary {
  changed_row_count: number;
  changed_cell_count: number;
  changed_documents: string[];
  changed_questions: string[];
}

export interface WorkflowRunEventRecord {
  id: string;
  workflow_run_id: string;
  action: string;
  actor_surface: string;
  previous_rows: QueryRunRow[];
  diff_summary: WorkflowRunEventSummary;
  created_at: string;
}

export interface DdReportEventSummary {
  memo_changed: boolean;
  exception_added_count: number;
  exception_removed_count: number;
  summary_changed_documents: string[];
}

export interface DdReportEventRecord {
  id: string;
  dd_report_id: string;
  action: string;
  actor_surface: string;
  previous_memo_markdown: string;
  previous_exceptions_list: string[];
  previous_document_summaries: Array<{
    document_version_id: string;
    document_name: string;
    summary: string;
  }>;
  diff_summary: DdReportEventSummary;
  created_at: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  full_name?: string | null;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: PlatformUserRecord;
}

export interface PlatformUserRecord {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  workspace_ids: string[];
  created_at: string;
}

export interface ProviderConfigCreateRequest {
  workspace_id: string;
  provider_name: string;
  encrypted_secret?: string | null;
  model_policy: Record<string, unknown>;
}

export interface ProviderConfigRecord {
  id: string;
  workspace_id: string;
  provider_name: string;
  encrypted_secret?: string | null;
  model_policy: Record<string, unknown>;
  is_active: boolean;
  plan_type: string;
  validation_status: string;
  has_secret: boolean;
  masked_secret?: string | null;
  created_at: string;
}

export interface PlatformWorkspaceRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformMatterRecord {
  id: string;
  workspace_id: string;
  name: string;
  represented_party?: string | null;
  jurisdiction?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformClauseBankEntryCreateRequest {
  workspace_id: string;
  contract_type: string;
  issue_type?: string | null;
  represented_party?: string | null;
  title: string;
  text: string;
  source: string;
}

export interface PlatformClauseBankEntryUpdateRequest {
  contract_type?: string | null;
  issue_type?: string | null;
  represented_party?: string | null;
  title?: string | null;
  text?: string | null;
}

export interface PlatformClauseBankEntryRecord {
  id: string;
  workspace_id: string;
  contract_type: string;
  issue_type?: string | null;
  represented_party?: string | null;
  title: string;
  text: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformPreferenceSignalCreateRequest {
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  signal_type: string;
  signal_value?: string | null;
  metadata: Record<string, unknown>;
}

export interface PlatformPreferenceSignalRecord {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  signal_type: string;
  signal_value?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlatformSpendEstimateRequest {
  workspace_id: string;
  run_type: string;
  document_version_id?: string | null;
  selection_text?: string | null;
  question?: string | null;
  instruction?: string | null;
  playbook_id?: string | null;
}

export interface PlatformDataBoundaryRecord {
  scope_label: string;
  input_summary: string[];
  provider_policy: string[];
  storage_policy: string[];
  sensitivity_flags: string[];
  training_policy: string;
  retention_policy: string;
}

export interface PlatformSpendEstimateRecord {
  workspace_id: string;
  run_type: string;
  provider: string;
  model: string;
  plan_type: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost: number;
  monthly_actual_cost: number;
  monthly_projected_cost: number;
  warning_threshold: number;
  hard_cap: number;
  per_run_limit: number;
  warning: boolean;
  blocked: boolean;
  message: string;
  data_boundary?: PlatformDataBoundaryRecord | null;
}

export interface PlatformUsageLedgerRecord {
  id: string;
  workspace_id: string;
  run_type: string;
  run_id: string;
  provider: string;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  created_at: string;
}

export interface PlatformUsageSummaryRecord {
  workspace_id: string;
  month: string;
  plan_type: string;
  provider: string;
  model: string;
  run_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  actual_cost: number;
  warning_threshold: number;
  hard_cap: number;
  per_run_limit: number;
  warning: boolean;
  over_cap: boolean;
  recent_runs: PlatformUsageLedgerRecord[];
}

export interface PlatformTrustRecord {
  storage_summary: string[];
  provider_visibility: string[];
  training_policy: string;
  delete_behavior: string[];
  byok_behavior: string[];
  retention_policy: string[];
}

export interface PlatformAuditEventRecord {
  id: string;
  workspace_id: string;
  actor_user_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  request_id?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface PlatformApplyEventCreateRequest {
  workspace_id: string;
  event_type: string;
  review_run_id?: string | null;
  finding_id?: string | null;
  revise_run_id?: string | null;
  target_anchor: Record<string, unknown>;
}

export interface PlatformApplyEventRecord {
  id: string;
  workspace_id: string;
  review_run_id?: string | null;
  finding_id?: string | null;
  revise_run_id?: string | null;
  event_type: string;
  target_anchor: Record<string, unknown>;
  created_at: string;
}

export interface PlatformFeatureFlagRecord {
  key: string;
  enabled: boolean;
}

export interface PlatformSupportUserRecord {
  user_id: string;
  email: string;
  workspace_ids: string[];
  provider_config_count: number;
  recent_audit_actions: string[];
  current_month_actual_cost: number;
}

export interface PlatformAdminOverviewRecord {
  failed_job_count: number;
  parse_failure_count: number;
  usage_anomaly_count: number;
  feature_flags: PlatformFeatureFlagRecord[];
  recent_failures: PlatformAuditEventRecord[];
  support_lookup?: PlatformSupportUserRecord | null;
}

export interface PlatformReleaseMetricRecord {
  key: string;
  label: string;
  value: number;
  unit: string;
  threshold: number;
  comparator: string;
  sample_size: number;
  minimum_sample_size: number;
  passing: boolean;
  detail: string;
}

export interface PlatformReleaseCriteriaRecord {
  workspace_id: string;
  evaluated_at: string;
  ready_for_pilot: boolean;
  gating_failures: string[];
  metrics: PlatformReleaseMetricRecord[];
}

export interface PlatformDocumentVersionRecord {
  id: string;
  workspace_id: string;
  matter_id: string;
  document_id: string;
  name: string;
  mime_type?: string | null;
  source_bucket?: string | null;
  source_key?: string | null;
  sha256: string;
  version_number: number;
  status: string;
  parse_status: string;
  index_status: string;
  segment_count: number;
  created_at: string;
}

export interface PlatformDocumentSegmentRecord {
  id: string;
  segment_type: string;
  ordinal: number;
  title?: string | null;
  text: string;
  page_number?: number | null;
  anchor: Record<string, unknown>;
  embedding_status: string;
  confidence: number;
}

export interface PlatformDocumentVersionDetailRecord {
  document_version: PlatformDocumentVersionRecord;
  parse_status: string;
  parser_name: string;
  parse_confidence?: number | null;
  metadata: Record<string, unknown>;
  segment_count: number;
  segments: PlatformDocumentSegmentRecord[];
}

export interface PlatformDocumentIngestRecord {
  document_version: PlatformDocumentVersionRecord;
  parse_status: string;
  parser_name: string;
  segment_count: number;
  notes: string[];
}

export interface PlatformSelectionIngestRequest {
  workspace_id: string;
  matter_id?: string | null;
  document_name: string;
  selection_text: string;
}

export interface PlatformDocumentSearchRequest {
  query: string;
  limit?: number | null;
  segment_types?: string[] | null;
}

export interface PlatformDocumentSearchResult {
  segment_id?: string | null;
  ordinal: number;
  segment_type: string;
  title?: string | null;
  text: string;
  page_number?: number | null;
  anchor: Record<string, unknown>;
  score: number;
  retrieval_mode: string;
}

export interface PlatformAnchorRelocationRequest {
  anchor: Record<string, unknown>;
  document_version_id?: string | null;
  candidate_segments?: string[] | null;
}

export interface PlatformAnchorRelocationResult {
  strategy: string;
  matched_text: string;
  score: number;
  ordinal?: number | null;
}

export interface PlatformPlaybookTriggerRecord {
  mode: string;
  search_terms?: string[];
  patterns?: string[];
}

export interface PlatformPlaybookRuleRecord {
  id: string;
  title: string;
  issue_type: string;
  clause_type?: string | null;
  priority: number;
  action_type: string;
  trigger: PlatformPlaybookTriggerRecord;
  severity: SeverityLevel;
  explanation_template: string;
  comment_template?: string | null;
  fallback_language?: string | null;
}

export interface PlatformPlaybookRecord {
  id: string;
  name: string;
  version: string;
  contract_type: string;
  represented_party: string;
  issue_rules: PlatformPlaybookRuleRecord[];
}

export interface PlatformReviewCitationRecord {
  id: string;
  document_segment_id?: string | null;
  label?: string | null;
  quote: string;
  ordinal?: number | null;
  page_number?: number | null;
  anchor: Record<string, unknown>;
}

export interface PlatformReviewFindingRecord {
  id: string;
  review_run_id: string;
  issue_type: string;
  clause_type?: string | null;
  finding_type: string;
  title: string;
  severity: SeverityLevel;
  confidence?: number | null;
  explanation: string;
  proposed_action?: string | null;
  comment_text?: string | null;
  redline_text?: string | null;
  rank_score?: number | null;
  actionable: boolean;
  metadata: Record<string, unknown>;
  citations: PlatformReviewCitationRecord[];
}

export interface PlatformReviewRunSummaryRecord {
  total_findings: number;
  actionable_count: number;
  informational_count: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
}

export interface PlatformReviewFilterMetadataRecord {
  issue_types: string[];
  severities: string[];
  clause_types: string[];
  finding_types: string[];
  actionable_count: number;
  informational_count: number;
}

export interface PlatformReviewRunCreateRequest {
  workspace_id: string;
  document_version_id: string;
  playbook_id: string;
}

export interface PlatformReviewRunRecord {
  id: string;
  workspace_id: string;
  matter_id?: string | null;
  document_version_id?: string | null;
  playbook: PlatformPlaybookRecord;
  status: string;
  model_provider?: string | null;
  model_name?: string | null;
  summary: PlatformReviewRunSummaryRecord;
  filters: PlatformReviewFilterMetadataRecord;
  findings: PlatformReviewFindingRecord[];
  created_at: string;
  completed_at?: string | null;
}

export interface PlatformAskRunCreateRequest {
  workspace_id: string;
  document_version_id: string;
  question: string;
  selection_text?: string | null;
}

export interface PlatformAskAnswerRecord {
  answer_text: string;
  confidence?: number | null;
  supported: boolean;
  citations: PlatformReviewCitationRecord[];
}

export interface PlatformAskRunRecord {
  id: string;
  workspace_id: string;
  matter_id?: string | null;
  document_version_id?: string | null;
  question: string;
  selection_text?: string | null;
  status: string;
  answer?: PlatformAskAnswerRecord | null;
  created_at: string;
  completed_at?: string | null;
}

export interface PlatformReviseRunCreateRequest {
  workspace_id: string;
  document_version_id: string;
  selected_text: string;
  instruction: string;
  playbook_id?: string | null;
  clause_bank_entry_ids?: string[];
}

export interface PlatformReviseRunRecord {
  id: string;
  workspace_id: string;
  matter_id?: string | null;
  document_version_id?: string | null;
  instruction: string;
  selected_text?: string | null;
  status: string;
  suggested_text?: string | null;
  rationale?: string | null;
  citations: PlatformReviewCitationRecord[];
  created_at: string;
  completed_at?: string | null;
}
