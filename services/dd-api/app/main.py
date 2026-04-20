from __future__ import annotations

import os

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response

from app.models import (
    AskRunCreateRequest,
    AskRunRecord,
    AuditEventRecord,
    CanonicalUploadDocumentsResponse,
    DocumentType,
    DocumentVersionRecord,
    DocumentVersionDetail,
    DraftRunCreateRequest,
    DraftRunRecord,
    DdReportRecord,
    DdReportUpdateRequest,
    GeneratedOutput,
    HealthResponse,
    IssueRecord,
    IssueStatus,
    JobRecord,
    LibraryItemRecord,
    LibrarySearchRequest,
    QueuedJobRequest,
    PlaybookSavedNoteRecord,
    PlaybookRecord,
    ProjectCreateRequest,
    ProjectRecord,
    QueryRunCreateRequest,
    QueryRunRecord,
    ReviewSuggestionApplyRequest,
    ReviewSuggestionDismissRequest,
    ReviewSuggestionMarkReviewedRequest,
    ReviewSuggestionSaveToPlaybookRequest,
    ReviewRunCreateRequest,
    ReviewRunExportRecord,
    ReviewRunRecord,
    SeverityLevel,
    StandardsRunCreateRequest,
    StandardsRunRecord,
    StandardsTemplateRecord,
    UploadDocumentsResponse,
    WorkflowRunCreateRequest,
    WorkflowRunRecord,
    WorkflowRunRerunRequest,
    WorkflowRunUpdateRequest,
    WorkflowTemplateRecord,
    WorkspaceCreateRequest,
    WorkspaceDetail,
    WorkspaceSummary,
)
from app.repository import (
    apply_review_suggestion,
    create_ask_run,
    create_draft_run,
    create_project,
    create_query_run,
    create_workflow_run,
    create_workspace,
    create_review_run,
    dismiss_review_suggestion,
    export_dd_report_artifact,
    export_query_run_csv,
    export_review_run_summary,
    export_workflow_run_xlsx,
    get_first_pass_output,
    get_ask_run,
    get_document_version,
    get_draft_run,
    get_dd_report,
    get_job,
    get_project,
    get_query_run,
    get_review_run,
    get_standards_run,
    get_workspace,
    get_workflow_run,
    ingest_document_version,
    init_repository,
    list_issues,
    list_audit_events,
    list_projects,
    list_project_document_versions,
    list_project_jobs,
    list_project_query_runs,
    list_project_workflow_runs,
    search_library_items,
    list_saved_playbook_notes,
    list_workspaces,
    load_playbooks,
    load_standards_templates,
    load_workflow_templates,
    mark_review_suggestion_reviewed,
    queue_review_run_export,
    save_review_suggestion_to_playbook,
    create_standards_run,
    rerun_workflow_run,
    update_dd_report,
    update_workflow_run,
    upload_documents,
    upload_documents_to_project,
)

app = FastAPI(
    title="Skua DD API",
    version="0.1.0",
    description="Seed due-diligence service for workspace review, playbook loading, and first-pass outputs.",
)

allowed_origins = os.getenv(
    "SKUA_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://localhost:3001,https://127.0.0.1:3001",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_repository()


@app.get("/healthz", response_model=HealthResponse)
def healthz() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/v1/playbooks", response_model=list[PlaybookRecord])
def get_playbooks() -> list[PlaybookRecord]:
    return load_playbooks()


@app.get("/api/v1/workflows/templates", response_model=list[WorkflowTemplateRecord])
def get_workflow_templates() -> list[WorkflowTemplateRecord]:
    return load_workflow_templates()


@app.get("/api/v1/standards/templates", response_model=list[StandardsTemplateRecord])
def get_standards_templates() -> list[StandardsTemplateRecord]:
    return load_standards_templates()


@app.get("/api/v1/playbooks/saved-notes", response_model=list[PlaybookSavedNoteRecord])
def get_saved_playbook_notes() -> list[PlaybookSavedNoteRecord]:
    return list_saved_playbook_notes()


@app.get("/api/v1/workspaces", response_model=list[WorkspaceSummary])
def get_workspaces() -> list[WorkspaceSummary]:
    return list_workspaces()


@app.get("/api/v1/projects", response_model=list[ProjectRecord])
def get_projects() -> list[ProjectRecord]:
    return list_projects()


@app.post("/api/v1/workspaces", response_model=WorkspaceSummary)
def post_workspace(payload: WorkspaceCreateRequest) -> WorkspaceSummary:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Workspace name is required")
    return create_workspace(name)


@app.post("/api/v1/projects", response_model=ProjectRecord)
def post_project(payload: ProjectCreateRequest) -> ProjectRecord:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    return create_project(payload)


@app.get("/api/v1/workspaces/{workspace_id}", response_model=WorkspaceDetail)
def get_workspace_detail(workspace_id: str) -> WorkspaceDetail:
    workspace = get_workspace(workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@app.get("/api/v1/projects/{project_id}", response_model=ProjectRecord)
def get_project_detail(project_id: str) -> ProjectRecord:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.get("/api/v1/projects/{project_id}/documents", response_model=list[DocumentVersionRecord])
def get_project_document_list(project_id: str) -> list[DocumentVersionRecord]:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return list_project_document_versions(project_id)


@app.get("/api/v1/projects/{project_id}/jobs", response_model=list[JobRecord])
def get_project_job_list(project_id: str) -> list[JobRecord]:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return list_project_jobs(project_id)


@app.get("/api/v1/workspaces/{workspace_id}/issues", response_model=list[IssueRecord])
def get_workspace_issues(
    workspace_id: str,
    severity: SeverityLevel | None = Query(default=None),
    status: IssueStatus | None = Query(default=None),
    doc_type: DocumentType | None = Query(default=None),
    issue_type: str | None = Query(default=None),
) -> list[IssueRecord]:
    workspace = get_workspace(workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return list_issues(
        workspace_id=workspace_id,
        severity=severity,
        status=status,
        doc_type=doc_type,
        issue_type=issue_type,
    )


@app.post(
    "/api/v1/workspaces/{workspace_id}/documents/upload",
    response_model=UploadDocumentsResponse,
)
async def post_workspace_documents(
    workspace_id: str,
    files: list[UploadFile] = File(...),
) -> UploadDocumentsResponse:
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")

    try:
        uploaded = [
            (upload.filename or "uploaded-file", await upload.read()) for upload in files
        ]
        return upload_documents(workspace_id=workspace_id, files=uploaded)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/v1/documents/upload", response_model=CanonicalUploadDocumentsResponse)
async def post_project_documents(
    project_id: str = Form(...),
    files: list[UploadFile] = File(...),
) -> CanonicalUploadDocumentsResponse:
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")

    try:
        uploaded = [
            (upload.filename or "uploaded-file", await upload.read()) for upload in files
        ]
        return upload_documents_to_project(project_id=project_id, files=uploaded)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/v1/documents/{document_id}", response_model=DocumentVersionDetail)
def get_document_detail(document_id: str) -> DocumentVersionDetail:
    document = get_document_version(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@app.post("/api/v1/documents/{document_id}/ingest", response_model=JobRecord)
def post_document_ingest(
    document_id: str,
    payload: QueuedJobRequest | None = None,
) -> JobRecord:
    job = ingest_document_version(
        document_id,
        worker_name=(payload.worker_name if payload else None),
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return job


@app.get("/api/v1/jobs/{job_id}", response_model=JobRecord)
def get_job_detail(job_id: str) -> JobRecord:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get(
    "/api/v1/workspaces/{workspace_id}/outputs/first-pass",
    response_model=GeneratedOutput,
)
def get_workspace_first_pass_output(workspace_id: str) -> GeneratedOutput:
    output = get_first_pass_output(workspace_id)
    if output is None:
        raise HTTPException(status_code=404, detail="Generated output not found")
    return output


@app.post("/api/v1/ask", response_model=AskRunRecord)
def post_ask_run(payload: AskRunCreateRequest) -> AskRunRecord:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")
    if not (payload.selection_text and payload.selection_text.strip()) and not payload.document_version_id:
        raise HTTPException(
            status_code=400,
            detail="Ask requires selection text or a document version",
        )
    return create_ask_run(payload)


@app.get("/api/v1/ask/{ask_run_id}", response_model=AskRunRecord)
def get_ask_run_detail(ask_run_id: str) -> AskRunRecord:
    ask_run = get_ask_run(ask_run_id)
    if ask_run is None:
        raise HTTPException(status_code=404, detail="Ask run not found")
    return ask_run


@app.post("/api/v1/library/search", response_model=list[LibraryItemRecord])
def post_library_search(payload: LibrarySearchRequest) -> list[LibraryItemRecord]:
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Library search query is required")
    return search_library_items(payload)


@app.get("/api/v1/projects/{project_id}/queries/runs", response_model=list[QueryRunRecord])
def get_project_query_run_list(project_id: str) -> list[QueryRunRecord]:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return list_project_query_runs(project_id)


@app.get("/api/v1/projects/{project_id}/workflows/runs", response_model=list[WorkflowRunRecord])
def get_project_workflow_run_list(project_id: str) -> list[WorkflowRunRecord]:
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return list_project_workflow_runs(project_id)


@app.post("/api/v1/queries/runs", response_model=QueryRunRecord)
def post_query_run(payload: QueryRunCreateRequest) -> QueryRunRecord:
    if not payload.document_version_ids:
        raise HTTPException(status_code=400, detail="At least one document is required")
    if not [question for question in payload.questions if question.strip()]:
        raise HTTPException(status_code=400, detail="At least one question is required")
    try:
        return create_query_run(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/v1/queries/runs/{query_run_id}", response_model=QueryRunRecord)
def get_query_run_detail(query_run_id: str) -> QueryRunRecord:
    query_run = get_query_run(query_run_id)
    if query_run is None:
        raise HTTPException(status_code=404, detail="Query run not found")
    return query_run


@app.get(
    "/api/v1/queries/runs/{query_run_id}/export",
    response_class=PlainTextResponse,
)
def get_query_run_export(query_run_id: str) -> PlainTextResponse:
    csv_content = export_query_run_csv(query_run_id)
    if csv_content is None:
        raise HTTPException(status_code=404, detail="Query run not found")
    response = PlainTextResponse(csv_content, media_type="text/csv")
    response.headers["Content-Disposition"] = f'attachment; filename="{query_run_id}.csv"'
    return response


@app.post("/api/v1/workflows/runs", response_model=WorkflowRunRecord)
def post_workflow_run(payload: WorkflowRunCreateRequest) -> WorkflowRunRecord:
    if not payload.document_version_ids:
        raise HTTPException(status_code=400, detail="At least one document is required")
    try:
        return create_workflow_run(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/v1/workflows/runs/{workflow_run_id}", response_model=WorkflowRunRecord)
def get_workflow_run_detail(workflow_run_id: str) -> WorkflowRunRecord:
    workflow_run = get_workflow_run(workflow_run_id)
    if workflow_run is None:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    return workflow_run


@app.put("/api/v1/workflows/runs/{workflow_run_id}", response_model=WorkflowRunRecord)
def put_workflow_run_detail(
    workflow_run_id: str,
    payload: WorkflowRunUpdateRequest,
) -> WorkflowRunRecord:
    workflow_run = update_workflow_run(workflow_run_id, payload)
    if workflow_run is None:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    return workflow_run


@app.post("/api/v1/workflows/runs/{workflow_run_id}/rerun", response_model=WorkflowRunRecord)
def post_workflow_run_rerun(
    workflow_run_id: str,
    payload: WorkflowRunRerunRequest | None = None,
) -> WorkflowRunRecord:
    workflow_run = rerun_workflow_run(workflow_run_id, payload or WorkflowRunRerunRequest())
    if workflow_run is None:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    return workflow_run


@app.get("/api/v1/workflows/runs/{workflow_run_id}/export")
def get_workflow_run_export(workflow_run_id: str, format: str = Query(default="xlsx")) -> Response:
    if format != "xlsx":
        raise HTTPException(status_code=400, detail="Unsupported workflow export format")
    export_record = export_workflow_run_xlsx(workflow_run_id)
    if export_record is None:
        raise HTTPException(status_code=404, detail="Workflow run export not found")
    content, media_type, filename = export_record
    response = Response(content=content, media_type=media_type)
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@app.get("/api/v1/dd/reports/{dd_report_id}", response_model=DdReportRecord)
def get_dd_report_detail(dd_report_id: str) -> DdReportRecord:
    dd_report = get_dd_report(dd_report_id)
    if dd_report is None:
        raise HTTPException(status_code=404, detail="DD report not found")
    return dd_report


@app.put("/api/v1/dd/reports/{dd_report_id}", response_model=DdReportRecord)
def put_dd_report_detail(
    dd_report_id: str,
    payload: DdReportUpdateRequest,
) -> DdReportRecord:
    dd_report = update_dd_report(dd_report_id, payload)
    if dd_report is None:
        raise HTTPException(status_code=404, detail="DD report not found")
    return dd_report


@app.get(
    "/api/v1/dd/reports/{dd_report_id}/export",
)
def get_dd_report_export(
    dd_report_id: str,
    format: str = Query(default="memo"),
) -> Response:
    export_record = export_dd_report_artifact(dd_report_id, format)
    if export_record is None:
        raise HTTPException(status_code=404, detail="DD report export not found")
    content, media_type, filename = export_record
    response = Response(content=content, media_type=media_type)
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@app.post("/api/v1/standards/runs", response_model=StandardsRunRecord)
def post_standards_run(payload: StandardsRunCreateRequest) -> StandardsRunRecord:
    if not payload.selection_text.strip() and (
        payload.selection_anchor is None or not payload.selection_anchor.quote.strip()
    ):
        raise HTTPException(status_code=400, detail="Selection text is required for standards review.")
    try:
        return create_standards_run(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/v1/standards/runs/{standards_run_id}", response_model=StandardsRunRecord)
def get_standards_run_detail(standards_run_id: str) -> StandardsRunRecord:
    standards_run = get_standards_run(standards_run_id)
    if standards_run is None:
        raise HTTPException(status_code=404, detail="Standards run not found")
    return standards_run


@app.post("/api/v1/draft", response_model=DraftRunRecord)
def post_draft_run(payload: DraftRunCreateRequest) -> DraftRunRecord:
    if payload.mode == "instruction" and not (payload.instruction and payload.instruction.strip()):
        raise HTTPException(status_code=400, detail="Instruction text is required for instruction mode")
    if payload.mode != "instruction" and not (
        (payload.query and payload.query.strip()) or (payload.selection_text and payload.selection_text.strip())
    ):
        raise HTTPException(
            status_code=400,
            detail="Draft requires a query or selection text",
        )
    return create_draft_run(payload)


@app.get("/api/v1/draft/{draft_run_id}", response_model=DraftRunRecord)
def get_draft_run_detail(draft_run_id: str) -> DraftRunRecord:
    draft_run = get_draft_run(draft_run_id)
    if draft_run is None:
        raise HTTPException(status_code=404, detail="Draft run not found")
    return draft_run


@app.post("/api/v1/review/runs", response_model=ReviewRunRecord)
def post_review_run(payload: ReviewRunCreateRequest) -> ReviewRunRecord:
    if not payload.selection_text.strip() and (
        payload.scope.anchor is None or not payload.scope.anchor.quote.strip()
    ):
        raise HTTPException(status_code=400, detail="Selection text is required for review.")

    return create_review_run(payload)


@app.get("/api/v1/review/runs/{review_run_id}", response_model=ReviewRunRecord)
def get_review_run_detail(review_run_id: str) -> ReviewRunRecord:
    review_run = get_review_run(review_run_id)
    if review_run is None:
        raise HTTPException(status_code=404, detail="Review run not found")
    return review_run


@app.post(
    "/api/v1/review/runs/{review_run_id}/export-summary",
    response_model=ReviewRunExportRecord,
)
def post_review_run_export_summary(review_run_id: str) -> ReviewRunExportRecord:
    export_record = export_review_run_summary(review_run_id)
    if export_record is None:
        raise HTTPException(status_code=404, detail="Review run not found")
    return export_record


@app.post(
    "/api/v1/review/runs/{review_run_id}/queue-export-summary",
    response_model=JobRecord,
)
def post_review_run_export_summary_job(
    review_run_id: str,
    payload: QueuedJobRequest | None = None,
) -> JobRecord:
    job = queue_review_run_export(
        review_run_id,
        worker_name=(payload.worker_name if payload else None),
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Review run not found")
    return job


@app.post("/api/v1/review/suggestions/{suggestion_id}/apply", response_model=ReviewRunRecord)
def post_review_suggestion_apply(
    suggestion_id: str,
    payload: ReviewSuggestionApplyRequest,
) -> ReviewRunRecord:
    if payload.mode not in {"comment", "redline"}:
        raise HTTPException(status_code=400, detail="Suggestion apply mode must be comment or redline.")

    review_run = apply_review_suggestion(suggestion_id, payload)
    if review_run is None:
        raise HTTPException(status_code=404, detail="Review suggestion not found")
    return review_run


@app.post("/api/v1/review/suggestions/{suggestion_id}/dismiss", response_model=ReviewRunRecord)
def post_review_suggestion_dismiss(
    suggestion_id: str,
    payload: ReviewSuggestionDismissRequest,
) -> ReviewRunRecord:
    review_run = dismiss_review_suggestion(suggestion_id, payload)
    if review_run is None:
        raise HTTPException(status_code=404, detail="Review suggestion not found")
    return review_run


@app.post(
    "/api/v1/review/suggestions/{suggestion_id}/mark-reviewed",
    response_model=ReviewRunRecord,
)
def post_review_suggestion_mark_reviewed(
    suggestion_id: str,
    payload: ReviewSuggestionMarkReviewedRequest,
) -> ReviewRunRecord:
    review_run = mark_review_suggestion_reviewed(suggestion_id, payload)
    if review_run is None:
        raise HTTPException(status_code=404, detail="Review suggestion not found")
    return review_run


@app.post(
    "/api/v1/review/suggestions/{suggestion_id}/save-to-playbook",
    response_model=ReviewRunRecord,
)
def post_review_suggestion_save_to_playbook(
    suggestion_id: str,
    payload: ReviewSuggestionSaveToPlaybookRequest,
) -> ReviewRunRecord:
    review_run = save_review_suggestion_to_playbook(suggestion_id, payload)
    if review_run is None:
        raise HTTPException(status_code=404, detail="Review suggestion not found")
    return review_run


@app.get("/api/v1/audit", response_model=list[AuditEventRecord])
def get_audit_log(project_id: str | None = Query(default=None)) -> list[AuditEventRecord]:
    return list_audit_events(project_id=project_id)
