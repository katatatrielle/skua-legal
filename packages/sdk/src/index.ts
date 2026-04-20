import type {
  AskRunCreateRequest,
  AskRunRecord,
  AuditEventRecord,
  CanonicalUploadDocumentsResponse,
  DocumentVersionRecord,
  DocumentVersionDetail,
  DraftRunCreateRequest,
  DraftRunRecord,
  DdReportRecord,
  DdReportUpdateRequest,
  JobRecord,
  LibraryItemRecord,
  LibrarySearchRequest,
  QueuedJobRequest,
  PlaybookSavedNoteRecord,
  ProjectCreateRequest,
  ProjectRecord,
  QueryRunCreateRequest,
  QueryRunRecord,
  ReviewRunExportRecord,
  ReviewSuggestionApplyRequest,
  ReviewSuggestionDismissRequest,
  ReviewSuggestionMarkReviewedRequest,
  ReviewSuggestionSaveToPlaybookRequest,
  ReviewRunCreateRequest,
  ReviewRunRecord,
  GeneratedOutput,
  PlaybookRecord,
  StandardsRunCreateRequest,
  StandardsRunRecord,
  StandardsTemplateRecord,
  WorkflowRunCreateRequest,
  WorkflowRunRerunRequest,
  WorkflowRunRecord,
  WorkflowRunUpdateRequest,
  WorkflowTemplateRecord,
  WorkspaceCreateRequest,
  WorkspaceDetail,
  WorkspaceSummary
} from "@skua/schemas";

export interface DdApiClientOptions {
  base_url?: string;
}

export interface ExportArtifact {
  content: Uint8Array;
  content_type: string;
  filename?: string | null;
}

const default_base_url = "http://127.0.0.1:8000";

export class DdApiClient {
  private readonly base_url: string;

  constructor(options: DdApiClientOptions = {}) {
    this.base_url = options.base_url ?? default_base_url;
  }

  async get_playbooks(): Promise<PlaybookRecord[]> {
    return this.fetch_json<PlaybookRecord[]>("/api/v1/playbooks");
  }

  async get_workflow_templates(): Promise<WorkflowTemplateRecord[]> {
    return this.fetch_json<WorkflowTemplateRecord[]>("/api/v1/workflows/templates");
  }

  async get_standards_templates(): Promise<StandardsTemplateRecord[]> {
    return this.fetch_json<StandardsTemplateRecord[]>("/api/v1/standards/templates");
  }

  async get_saved_playbook_notes(): Promise<PlaybookSavedNoteRecord[]> {
    return this.fetch_json<PlaybookSavedNoteRecord[]>("/api/v1/playbooks/saved-notes");
  }

  async list_workspaces(): Promise<WorkspaceSummary[]> {
    return this.fetch_json<WorkspaceSummary[]>("/api/v1/workspaces");
  }

  async create_workspace(payload: WorkspaceCreateRequest): Promise<WorkspaceSummary> {
    return this.fetch_json<WorkspaceSummary>("/api/v1/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_workspace(workspace_id: string): Promise<WorkspaceDetail> {
    return this.fetch_json<WorkspaceDetail>(`/api/v1/workspaces/${workspace_id}`);
  }

  async list_projects(): Promise<ProjectRecord[]> {
    return this.fetch_json<ProjectRecord[]>("/api/v1/projects");
  }

  async create_project(payload: ProjectCreateRequest): Promise<ProjectRecord> {
    return this.fetch_json<ProjectRecord>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_project(project_id: string): Promise<ProjectRecord> {
    return this.fetch_json<ProjectRecord>(`/api/v1/projects/${project_id}`);
  }

  async list_project_documents(project_id: string): Promise<DocumentVersionRecord[]> {
    return this.fetch_json<DocumentVersionRecord[]>(
      `/api/v1/projects/${project_id}/documents`
    );
  }

  async get_document(document_id: string): Promise<DocumentVersionDetail> {
    return this.fetch_json<DocumentVersionDetail>(`/api/v1/documents/${document_id}`);
  }

  async ingest_document(document_id: string): Promise<JobRecord> {
    return this.fetch_json<JobRecord>(`/api/v1/documents/${document_id}/ingest`, {
      method: "POST"
    });
  }

  async get_job(job_id: string): Promise<JobRecord> {
    return this.fetch_json<JobRecord>(`/api/v1/jobs/${job_id}`);
  }

  async list_project_jobs(project_id: string): Promise<JobRecord[]> {
    return this.fetch_json<JobRecord[]>(`/api/v1/projects/${project_id}/jobs`);
  }

  async queue_document_ingest(
    document_id: string,
    payload: QueuedJobRequest = {}
  ): Promise<JobRecord> {
    return this.fetch_json<JobRecord>(`/api/v1/documents/${document_id}/ingest`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async queue_review_run_export(
    review_run_id: string,
    payload: QueuedJobRequest = {}
  ): Promise<JobRecord> {
    return this.fetch_json<JobRecord>(
      `/api/v1/review/runs/${review_run_id}/queue-export-summary`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  async get_audit_events(project_id?: string): Promise<AuditEventRecord[]> {
    const suffix = project_id ? `?project_id=${encodeURIComponent(project_id)}` : "";
    return this.fetch_json<AuditEventRecord[]>(`/api/v1/audit${suffix}`);
  }

  async create_ask_run(payload: AskRunCreateRequest): Promise<AskRunRecord> {
    return this.fetch_json<AskRunRecord>("/api/v1/ask", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_ask_run(ask_run_id: string): Promise<AskRunRecord> {
    return this.fetch_json<AskRunRecord>(`/api/v1/ask/${ask_run_id}`);
  }

  async create_draft_run(payload: DraftRunCreateRequest): Promise<DraftRunRecord> {
    return this.fetch_json<DraftRunRecord>("/api/v1/draft", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_draft_run(draft_run_id: string): Promise<DraftRunRecord> {
    return this.fetch_json<DraftRunRecord>(`/api/v1/draft/${draft_run_id}`);
  }

  async search_library(payload: LibrarySearchRequest): Promise<LibraryItemRecord[]> {
    return this.fetch_json<LibraryItemRecord[]>("/api/v1/library/search", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async list_project_query_runs(project_id: string): Promise<QueryRunRecord[]> {
    return this.fetch_json<QueryRunRecord[]>(`/api/v1/projects/${project_id}/queries/runs`);
  }

  async create_query_run(payload: QueryRunCreateRequest): Promise<QueryRunRecord> {
    return this.fetch_json<QueryRunRecord>("/api/v1/queries/runs", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_query_run(query_run_id: string): Promise<QueryRunRecord> {
    return this.fetch_json<QueryRunRecord>(`/api/v1/queries/runs/${query_run_id}`);
  }

  async export_query_run(query_run_id: string): Promise<string> {
    const response = await fetch(`${this.base_url}/api/v1/queries/runs/${query_run_id}/export`, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.text();
  }

  async list_project_workflow_runs(project_id: string): Promise<WorkflowRunRecord[]> {
    return this.fetch_json<WorkflowRunRecord[]>(`/api/v1/projects/${project_id}/workflows/runs`);
  }

  async create_workflow_run(payload: WorkflowRunCreateRequest): Promise<WorkflowRunRecord> {
    return this.fetch_json<WorkflowRunRecord>("/api/v1/workflows/runs", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_workflow_run(workflow_run_id: string): Promise<WorkflowRunRecord> {
    return this.fetch_json<WorkflowRunRecord>(`/api/v1/workflows/runs/${workflow_run_id}`);
  }

  async get_dd_report(dd_report_id: string): Promise<DdReportRecord> {
    return this.fetch_json<DdReportRecord>(`/api/v1/dd/reports/${dd_report_id}`);
  }

  async create_standards_run(payload: StandardsRunCreateRequest): Promise<StandardsRunRecord> {
    return this.fetch_json<StandardsRunRecord>("/api/v1/standards/runs", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_standards_run(standards_run_id: string): Promise<StandardsRunRecord> {
    return this.fetch_json<StandardsRunRecord>(`/api/v1/standards/runs/${standards_run_id}`);
  }

  async update_dd_report(
    dd_report_id: string,
    payload: DdReportUpdateRequest
  ): Promise<DdReportRecord> {
    return this.fetch_json<DdReportRecord>(`/api/v1/dd/reports/${dd_report_id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async export_dd_report(
    dd_report_id: string,
    format: "memo" | "exceptions" | "docx"
  ): Promise<ExportArtifact> {
    return this.fetch_binary(
      `/api/v1/dd/reports/${dd_report_id}/export?format=${encodeURIComponent(format)}`
    );
  }

  async update_workflow_run(
    workflow_run_id: string,
    payload: WorkflowRunUpdateRequest
  ): Promise<WorkflowRunRecord> {
    return this.fetch_json<WorkflowRunRecord>(`/api/v1/workflows/runs/${workflow_run_id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async rerun_workflow_run(
    workflow_run_id: string,
    payload: WorkflowRunRerunRequest = {}
  ): Promise<WorkflowRunRecord> {
    return this.fetch_json<WorkflowRunRecord>(`/api/v1/workflows/runs/${workflow_run_id}/rerun`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_first_pass_output(workspace_id: string): Promise<GeneratedOutput> {
    return this.fetch_json<GeneratedOutput>(`/api/v1/workspaces/${workspace_id}/outputs/first-pass`);
  }

  async upload_documents_to_project(
    project_id: string,
    files: File[]
  ): Promise<CanonicalUploadDocumentsResponse> {
    const form = new FormData();
    form.set("project_id", project_id);
    files.forEach((file) => {
      form.append("files", file, file.name);
    });

    return this.fetch_json<CanonicalUploadDocumentsResponse>("/api/v1/documents/upload", {
      method: "POST",
      body: form
    });
  }

  async create_review_run(payload: ReviewRunCreateRequest): Promise<ReviewRunRecord> {
    return this.fetch_json<ReviewRunRecord>("/api/v1/review/runs", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async get_review_run(review_run_id: string): Promise<ReviewRunRecord> {
    return this.fetch_json<ReviewRunRecord>(`/api/v1/review/runs/${review_run_id}`);
  }

  async export_review_run_summary(review_run_id: string): Promise<ReviewRunExportRecord> {
    return this.fetch_json<ReviewRunExportRecord>(
      `/api/v1/review/runs/${review_run_id}/export-summary`,
      {
        method: "POST"
      }
    );
  }

  async export_workflow_run(
    workflow_run_id: string,
    format: "xlsx" = "xlsx"
  ): Promise<ExportArtifact> {
    return this.fetch_binary(
      `/api/v1/workflows/runs/${workflow_run_id}/export?format=${encodeURIComponent(format)}`
    );
  }

  async apply_review_suggestion(
    suggestion_id: string,
    payload: ReviewSuggestionApplyRequest
  ): Promise<ReviewRunRecord> {
    return this.fetch_json<ReviewRunRecord>(`/api/v1/review/suggestions/${suggestion_id}/apply`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async dismiss_review_suggestion(
    suggestion_id: string,
    payload: ReviewSuggestionDismissRequest
  ): Promise<ReviewRunRecord> {
    return this.fetch_json<ReviewRunRecord>(`/api/v1/review/suggestions/${suggestion_id}/dismiss`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async mark_review_suggestion_reviewed(
    suggestion_id: string,
    payload: ReviewSuggestionMarkReviewedRequest
  ): Promise<ReviewRunRecord> {
    return this.fetch_json<ReviewRunRecord>(
      `/api/v1/review/suggestions/${suggestion_id}/mark-reviewed`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  async save_review_suggestion_to_playbook(
    suggestion_id: string,
    payload: ReviewSuggestionSaveToPlaybookRequest
  ): Promise<ReviewRunRecord> {
    return this.fetch_json<ReviewRunRecord>(
      `/api/v1/review/suggestions/${suggestion_id}/save-to-playbook`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  private async fetch_json<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.base_url}${path}`, {
      ...init,
      headers: {
        Accept: "application/json"
        ,
        ...(init.headers ?? {})
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} for ${path}`);
    }

    return (await response.json()) as T;
  }

  private async fetch_binary(path: string, init: RequestInit = {}): Promise<ExportArtifact> {
    const response = await fetch(`${this.base_url}${path}`, {
      ...init,
      headers: {
        Accept: "*/*",
        ...(init.headers ?? {})
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} for ${path}`);
    }

    const filename_header = response.headers.get("Content-Disposition");
    const filename_match = filename_header?.match(/filename="?([^"]+)"?/i);

    return {
      content: new Uint8Array(await response.arrayBuffer()),
      content_type: response.headers.get("Content-Type") ?? "application/octet-stream",
      filename: filename_match?.[1] ?? null
    };
  }
}

export function create_dd_api_client(options?: DdApiClientOptions): DdApiClient {
  return new DdApiClient(options);
}
