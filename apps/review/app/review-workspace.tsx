"use client";

import type {
  DocumentVersionRecord,
  DdReportRecord,
  GeneratedOutput,
  IssueRecord,
  ProjectRecord,
  QueryRunRecord,
  WorkflowRunRecord,
  WorkflowTemplateRecord,
  WorkspaceDetail,
  WorkspaceSummary
} from "@skua/schemas";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceControls } from "./workspace-controls";

type FilterValue = "all" | string;

const format_label = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const unique_values = (values: string[]) => ["all", ...new Set(values)];

const default_query_questions = [
  "What is the counterparty name?",
  "What is the governing law?",
  "Is consent required on assignment or change of control?",
  "Does the contract auto-renew?"
].join("\n");

export function ReviewWorkspace({
  ddApiBaseUrl,
  workspace,
  output,
  workspaces,
  selectedWorkspaceId,
  project,
  documentVersions,
  queryRuns,
  workflowRuns,
  workflowTemplates,
  initialDdReports
}: {
  ddApiBaseUrl: string;
  workspace: WorkspaceDetail;
  output: GeneratedOutput;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string;
  project: ProjectRecord | null;
  documentVersions: DocumentVersionRecord[];
  queryRuns: QueryRunRecord[];
  workflowRuns: WorkflowRunRecord[];
  workflowTemplates: WorkflowTemplateRecord[];
  initialDdReports: DdReportRecord[];
}) {
  const [severity, setSeverity] = useState<FilterValue>("all");
  const [status, setStatus] = useState<FilterValue>("all");
  const [issueType, setIssueType] = useState<FilterValue>("all");
  const [docType, setDocType] = useState<FilterValue>("all");

  const severityOptions = unique_values(workspace.issues.map((issue) => issue.severity));
  const statusOptions = unique_values(workspace.issues.map((issue) => issue.status));
  const issueTypeOptions = unique_values(workspace.issues.map((issue) => issue.issue_type));
  const docTypeOptions = unique_values(workspace.documents.map((document) => document.doc_type));

  const documentMap = new Map(workspace.documents.map((document) => [document.id, document]));

  const filteredIssues = workspace.issues.filter((issue) => {
    const document = documentMap.get(issue.document_id);

    if (severity !== "all" && issue.severity !== severity) {
      return false;
    }
    if (status !== "all" && issue.status !== status) {
      return false;
    }
    if (issueType !== "all" && issue.issue_type !== issueType) {
      return false;
    }
    if (docType !== "all" && document?.doc_type !== docType) {
      return false;
    }

    return true;
  });

  const openIssueCount = workspace.issues.filter((issue) => issue.status === "open").length;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Skua Legal / Web Console</p>
          <h1>{workspace.workspace.name}</h1>
          <p className="hero-text">
            Manage uploaded contracts, inspect cited review output, and use the
            transitional console while the product narrows around the Word-first flow.
          </p>
          <p className="muted-text">{workspace.workspace.stage}</p>
        </div>
        <div className="hero-metrics">
          <MetricCard label="Documents" value={String(workspace.workspace.document_count)} />
          <MetricCard label="Issues" value={String(workspace.workspace.issue_count)} />
          <MetricCard
            label="High severity"
            value={String(workspace.workspace.high_severity_count)}
          />
          <MetricCard label="Open items" value={String(openIssueCount)} />
        </div>
      </section>

      <WorkspaceControls
        ddApiBaseUrl={ddApiBaseUrl}
        selectedWorkspaceId={selectedWorkspaceId}
        workspaces={workspaces}
      />

      <section className="playbook-strip">
        {workspace.workspace.playbook_names.map((playbookName) => (
          <span className="playbook-pill" key={playbookName}>
            {playbookName}
          </span>
        ))}
      </section>

      <section className="grid-layout">
        <div className="panel issue-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Review grid</p>
              <h2>Issues with source anchors</h2>
            </div>
            <p className="muted-text">
              Filter by severity, status, issue type, or document type.
            </p>
          </div>

          <div className="filter-row">
            <FilterSelect
              label="Severity"
              value={severity}
              options={severityOptions}
              onChange={setSeverity}
            />
            <FilterSelect
              label="Status"
              value={status}
              options={statusOptions}
              onChange={setStatus}
            />
            <FilterSelect
              label="Issue type"
              value={issueType}
              options={issueTypeOptions}
              onChange={setIssueType}
            />
            <FilterSelect
              label="Document type"
              value={docType}
              options={docTypeOptions}
              onChange={setDocType}
            />
          </div>

          <div className="table-scroll">
            <table className="issue-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Document</th>
                  <th>Counterparty</th>
                  <th>Key dates</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => (
                    <IssueRow
                      issue={issue}
                      documentName={documentMap.get(issue.document_id)?.name ?? issue.document_id}
                      key={issue.id}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No issues match the current filters yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel side-panel">
          <div className="stack">
            <div>
              <p className="section-label">Highlights</p>
              <h2>Top review points</h2>
            </div>
            <ul className="text-list">
              {workspace.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>

          <div className="stack">
            <div>
              <p className="section-label">Memo draft</p>
              <h2>{output.memo_title}</h2>
            </div>
            <div className="memo-sections">
              {output.memo_sections.map((section) => (
                <article className="memo-card" key={section.heading}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="stack">
            <div>
              <p className="section-label">Exceptions list</p>
              <h2>Reviewer-ready callouts</h2>
            </div>
            <ul className="text-list">
              {output.exceptions_list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <QueryPanel
        documentVersions={documentVersions}
        initialQueryRuns={queryRuns}
        project={project}
      />

      <WorkflowPanel
        documentVersions={documentVersions}
        initialDdReports={initialDdReports}
        initialWorkflowRuns={workflowRuns}
        project={project}
        workflowTemplates={workflowTemplates}
      />
    </main>
  );
}

function QueryPanel({
  project,
  documentVersions,
  initialQueryRuns
}: {
  project: ProjectRecord | null;
  documentVersions: DocumentVersionRecord[];
  initialQueryRuns: QueryRunRecord[];
}) {
  const [queryRuns, setQueryRuns] = useState<QueryRunRecord[]>(initialQueryRuns);
  const [activeQueryRunId, setActiveQueryRunId] = useState<string | null>(
    initialQueryRuns[0]?.id ?? null
  );
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(
    documentVersions.map((document) => document.id)
  );
  const [queryName, setQueryName] = useState<string>("Due diligence sweep");
  const [questionText, setQuestionText] = useState<string>(default_query_questions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeQueryRun = useMemo(
    () => queryRuns.find((run) => run.id === activeQueryRunId) ?? null,
    [activeQueryRunId, queryRuns]
  );

  const toggleDocument = (documentVersionId: string) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentVersionId)
        ? current.filter((id) => id !== documentVersionId)
        : [...current, documentVersionId]
    );
  };

  const runQuery = async () => {
    if (!project) {
      setErrorMessage("This workspace does not have a project bridge yet.");
      return;
    }

    const questions = questionText
      .split("\n")
      .map((question) => question.trim())
      .filter(Boolean);

    if (selectedDocumentIds.length === 0) {
      setErrorMessage("Select at least one document before running a query.");
      return;
    }
    if (questions.length === 0) {
      setErrorMessage("Add at least one question before running a query.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage("Queueing multi-document query run...");

    try {
      const response = await fetch("/api/query-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project_id: project.id,
          document_version_ids: selectedDocumentIds,
          questions,
          name: queryName.trim() || null
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail ?? "Unable to create the query run.");
      }

      const queryRun = (await response.json()) as QueryRunRecord;
      setQueryRuns((current) => [queryRun, ...current.filter((run) => run.id !== queryRun.id)]);
      setActiveQueryRunId(queryRun.id);
      setStatusMessage("Query run queued. Polling for results...");
      await pollQueryRun(queryRun.id, setQueryRuns, setActiveQueryRunId, setStatusMessage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create the query run.");
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel query-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Queries</p>
          <h2>Cross-document extraction</h2>
        </div>
        <p className="muted-text">
          Run saved-style questions across selected uploaded documents and export the
          resulting table as CSV.
        </p>
      </div>

      {project ? (
        <>
          <div className="query-grid">
            <div className="query-config">
              <label className="filter">
                <span>Run name</span>
                <input
                  className="text-input"
                  value={queryName}
                  onChange={(event) => setQueryName(event.target.value)}
                  placeholder="Due diligence sweep"
                />
              </label>

              <label className="filter">
                <span>Questions</span>
                <textarea
                  className="text-area"
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                  rows={6}
                />
              </label>

              <div className="document-picker">
                <div className="picker-header">
                  <span className="section-label">Documents</span>
                  <span className="muted-text">
                    {selectedDocumentIds.length} of {documentVersions.length} selected
                  </span>
                </div>
                <div className="document-chip-grid">
                  {documentVersions.map((documentVersion) => {
                    const selected = selectedDocumentIds.includes(documentVersion.id);
                    return (
                      <button
                        className={`document-chip ${selected ? "document-chip-active" : ""}`}
                        key={documentVersion.id}
                        onClick={() => toggleDocument(documentVersion.id)}
                        type="button"
                      >
                        <strong>{documentVersion.name}</strong>
                        <span>{format_label(documentVersion.status)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="query-actions">
                <button
                  className="primary-button"
                  disabled={isSubmitting || documentVersions.length === 0}
                  onClick={runQuery}
                  type="button"
                >
                  {isSubmitting ? "Running..." : "Run queries"}
                </button>
                {statusMessage ? <p className="muted-text">{statusMessage}</p> : null}
                {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
              </div>
            </div>

            <div className="query-history">
              <div className="picker-header">
                <span className="section-label">Recent runs</span>
                <span className="muted-text">{queryRuns.length} total</span>
              </div>
              <div className="history-list">
                {queryRuns.length > 0 ? (
                  queryRuns.map((queryRun) => (
                    <button
                      className={`history-card ${activeQueryRunId === queryRun.id ? "history-card-active" : ""}`}
                      key={queryRun.id}
                      onClick={() => setActiveQueryRunId(queryRun.id)}
                      type="button"
                    >
                      <strong>{queryRun.name ?? "Untitled query run"}</strong>
                      <span>{queryRun.questions.length} question(s)</span>
                      <span>{queryRun.rows.length} document row(s)</span>
                      <span className={`badge badge-${queryRun.status === "succeeded" ? "low" : "neutral"}`}>
                        {format_label(queryRun.status)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">No query runs yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="query-results">
            <div className="panel-header">
              <div>
                <p className="section-label">Results table</p>
                <h2>{activeQueryRun?.name ?? "Select a query run"}</h2>
              </div>
              {activeQueryRun ? (
                <a
                  className="secondary-link"
                  href={`/api/query-runs/${activeQueryRun.id}/export`}
                >
                  Export CSV
                </a>
              ) : null}
            </div>

            {activeQueryRun ? (
              <div className="table-scroll">
                <table className="issue-table query-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      {activeQueryRun.questions.map((question) => (
                        <th key={question}>{question}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueryRun.rows.map((row) => (
                      <tr key={row.document_version_id}>
                        <td>{row.document_name}</td>
                        {row.cells.map((cell) => (
                          <td key={`${row.document_version_id}-${cell.question}`}>
                            <div className="citation-cell">
                              <strong>{cell.answer}</strong>
                              {cell.citations[0] ? (
                                <>
                                  <span>{cell.citations[0].label}</span>
                                  <blockquote>{cell.citations[0].quote}</blockquote>
                                </>
                              ) : (
                                <span>No citation surfaced</span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                Run a query to generate a cross-document table with citations.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          Project-backed queries will appear here once the workspace has a project bridge.
        </div>
      )}
    </section>
  );
}

function WorkflowPanel({
  project,
  documentVersions,
  workflowTemplates,
  initialWorkflowRuns,
  initialDdReports
}: {
  project: ProjectRecord | null;
  documentVersions: DocumentVersionRecord[];
  workflowTemplates: WorkflowTemplateRecord[];
  initialWorkflowRuns: WorkflowRunRecord[];
  initialDdReports: DdReportRecord[];
}) {
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRunRecord[]>(initialWorkflowRuns);
  const [reportMap, setReportMap] = useState<Record<string, DdReportRecord>>(
    Object.fromEntries(initialDdReports.map((report) => [report.id, report]))
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    workflowTemplates[0]?.id ?? ""
  );
  const [selectedArtifactVariantId, setSelectedArtifactVariantId] = useState<string>("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(
    documentVersions.map((document) => document.id)
  );
  const [workflowName, setWorkflowName] = useState<string>("Commercial DD report");
  const [activeWorkflowRunId, setActiveWorkflowRunId] = useState<string | null>(
    initialWorkflowRuns[0]?.id ?? null
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingRows, setIsSavingRows] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [rowDrafts, setRowDrafts] = useState<Record<string, string>>({});
  const [memoDraft, setMemoDraft] = useState<string>("");
  const [exceptionsDraft, setExceptionsDraft] = useState<string>("");

  const activeWorkflowRun = useMemo(
    () => workflowRuns.find((run) => run.id === activeWorkflowRunId) ?? null,
    [activeWorkflowRunId, workflowRuns]
  );
  const selectedWorkflowTemplate = useMemo(
    () => workflowTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, workflowTemplates]
  );
  const activeReport = activeWorkflowRun?.dd_report_id
    ? reportMap[activeWorkflowRun.dd_report_id] ?? null
    : null;

  useEffect(() => {
    const loadReport = async () => {
      if (!activeWorkflowRun?.dd_report_id || reportMap[activeWorkflowRun.dd_report_id]) {
        return;
      }
      const response = await fetch(`/api/dd-reports/${activeWorkflowRun.dd_report_id}`, {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) {
        return;
      }
      const report = (await response.json()) as DdReportRecord;
      setReportMap((current) => ({ ...current, [report.id]: report }));
    };

    void loadReport();
  }, [activeWorkflowRun?.dd_report_id, reportMap]);

  useEffect(() => {
    if (!activeWorkflowRun) {
      setRowDrafts({});
      return;
    }
    const nextDrafts: Record<string, string> = {};
    for (const row of activeWorkflowRun.rows) {
      for (const cell of row.cells) {
        nextDrafts[buildCellKey(row.document_version_id, cell.question)] = cell.answer;
      }
    }
    setRowDrafts(nextDrafts);
  }, [activeWorkflowRun]);

  useEffect(() => {
    setMemoDraft(activeReport?.memo_markdown ?? "");
    setExceptionsDraft(activeReport?.exceptions_list.join("\n") ?? "");
  }, [activeReport?.id, activeReport?.memo_markdown, activeReport?.exceptions_list]);

  useEffect(() => {
    if (!selectedWorkflowTemplate) {
      setSelectedArtifactVariantId("");
      return;
    }
    const nextVariantId =
      selectedWorkflowTemplate.default_artifact_variant_id ??
      selectedWorkflowTemplate.artifact_variants[0]?.id ??
      "";
    setSelectedArtifactVariantId((current) =>
      current && selectedWorkflowTemplate.artifact_variants.some((variant) => variant.id === current)
        ? current
        : nextVariantId
    );
  }, [selectedWorkflowTemplate]);

  const toggleDocument = (documentVersionId: string) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentVersionId)
        ? current.filter((id) => id !== documentVersionId)
        : [...current, documentVersionId]
    );
  };

  const runWorkflow = async () => {
    if (!project) {
      setErrorMessage("This workspace does not have a project bridge yet.");
      return;
    }
    if (!selectedTemplateId) {
      setErrorMessage("Choose a workflow template before running.");
      return;
    }
    if (selectedDocumentIds.length === 0) {
      setErrorMessage("Select at least one document before running a workflow.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage("Queueing workflow run...");

    try {
      const response = await fetch("/api/workflow-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project_id: project.id,
          workflow_template_id: selectedTemplateId,
          artifact_variant_id: selectedArtifactVariantId || null,
          document_version_ids: selectedDocumentIds,
          name: workflowName.trim() || null
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail ?? "Unable to create the workflow run.");
      }
      const workflowRun = (await response.json()) as WorkflowRunRecord;
      setWorkflowRuns((current) => [
        workflowRun,
        ...current.filter((run) => run.id !== workflowRun.id)
      ]);
      setActiveWorkflowRunId(workflowRun.id);
      setStatusMessage("Workflow run queued. Polling for report...");
      await pollWorkflowRun(
        workflowRun.id,
        setWorkflowRuns,
        setReportMap,
        setActiveWorkflowRunId,
        setStatusMessage
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the workflow run."
      );
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveWorkflowCorrections = async () => {
    if (!activeWorkflowRun) {
      return;
    }
    setIsSavingRows(true);
    setErrorMessage(null);
    setStatusMessage("Saving corrected extraction cells...");
    try {
      const updatedRows = activeWorkflowRun.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          answer: rowDrafts[buildCellKey(row.document_version_id, cell.question)] ?? cell.answer
        }))
      }));
      const response = await fetch(`/api/workflow-runs/${activeWorkflowRun.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rows: updatedRows })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail ?? "Unable to save workflow corrections.");
      }
      const workflowRun = (await response.json()) as WorkflowRunRecord;
      setWorkflowRuns((current) => [
        workflowRun,
        ...current.filter((run) => run.id !== workflowRun.id)
      ]);
      setActiveWorkflowRunId(workflowRun.id);
      if (workflowRun.dd_report_id) {
        const reportResponse = await fetch(`/api/dd-reports/${workflowRun.dd_report_id}`, {
          method: "GET",
          cache: "no-store"
        });
        if (reportResponse.ok) {
          const report = (await reportResponse.json()) as DdReportRecord;
          setReportMap((current) => ({ ...current, [report.id]: report }));
        }
      }
      setStatusMessage("Workflow corrections saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save workflow corrections."
      );
      setStatusMessage(null);
    } finally {
      setIsSavingRows(false);
    }
  };

  const saveReportEdits = async () => {
    if (!activeReport) {
      return;
    }
    setIsSavingReport(true);
    setErrorMessage(null);
    setStatusMessage("Saving DD report edits...");
    try {
      const response = await fetch(`/api/dd-reports/${activeReport.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memo_markdown: memoDraft,
          exceptions_list: exceptionsDraft
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          document_summaries: activeReport.document_summaries
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail ?? "Unable to save DD report edits.");
      }
      const report = (await response.json()) as DdReportRecord;
      setReportMap((current) => ({ ...current, [report.id]: report }));
      setStatusMessage("DD report edits saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save DD report edits.");
      setStatusMessage(null);
    } finally {
      setIsSavingReport(false);
    }
  };

  const rerunWorkflow = async () => {
    if (!activeWorkflowRun) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage("Queueing rerun from current workflow...");
    try {
      const response = await fetch(`/api/workflow-runs/${activeWorkflowRun.id}/rerun`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `Rerun of ${activeWorkflowRun.name ?? activeWorkflowRun.workflow_template_id}`
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail ?? "Unable to rerun the workflow.");
      }
      const workflowRun = (await response.json()) as WorkflowRunRecord;
      setWorkflowRuns((current) => [
        workflowRun,
        ...current.filter((run) => run.id !== workflowRun.id)
      ]);
      setActiveWorkflowRunId(workflowRun.id);
      setStatusMessage("Workflow rerun queued. Polling for report...");
      await pollWorkflowRun(
        workflowRun.id,
        setWorkflowRuns,
        setReportMap,
        setActiveWorkflowRunId,
        setStatusMessage
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to rerun workflow.");
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel workflow-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Workflows</p>
          <h2>DD report generation</h2>
        </div>
        <p className="muted-text">
          Run a saved diligence template, then review the generated memo draft and
          exceptions list from the same project workspace.
        </p>
      </div>

      {project ? (
        <>
          <div className="query-grid">
            <div className="query-config">
              <label className="filter">
                <span>Template</span>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                >
                  {workflowTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter">
                <span>Run name</span>
                <input
                  className="text-input"
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  placeholder="Commercial DD report"
                />
              </label>

              <label className="filter">
                <span>Artifact variant</span>
                <select
                  value={selectedArtifactVariantId}
                  onChange={(event) => setSelectedArtifactVariantId(event.target.value)}
                  disabled={!selectedWorkflowTemplate || selectedWorkflowTemplate.artifact_variants.length === 0}
                >
                  {(selectedWorkflowTemplate?.artifact_variants ?? []).map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="document-picker">
                <div className="picker-header">
                  <span className="section-label">Documents</span>
                  <span className="muted-text">
                    {selectedDocumentIds.length} of {documentVersions.length} selected
                  </span>
                </div>
                <div className="document-chip-grid">
                  {documentVersions.map((documentVersion) => {
                    const selected = selectedDocumentIds.includes(documentVersion.id);
                    return (
                      <button
                        className={`document-chip ${selected ? "document-chip-active" : ""}`}
                        key={documentVersion.id}
                        onClick={() => toggleDocument(documentVersion.id)}
                        type="button"
                      >
                        <strong>{documentVersion.name}</strong>
                        <span>{format_label(documentVersion.status)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="query-actions">
                <button
                  className="primary-button"
                  disabled={isSubmitting || workflowTemplates.length === 0}
                  onClick={runWorkflow}
                  type="button"
                >
                  {isSubmitting ? "Running..." : "Run workflow"}
                </button>
                {statusMessage ? <p className="muted-text">{statusMessage}</p> : null}
                {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
              </div>
            </div>

            <div className="query-history">
              <div className="picker-header">
                <span className="section-label">Recent workflow runs</span>
                <span className="muted-text">{workflowRuns.length} total</span>
              </div>
              <div className="history-list">
                {workflowRuns.length > 0 ? (
                  workflowRuns.map((workflowRun) => (
                    <button
                      className={`history-card ${activeWorkflowRunId === workflowRun.id ? "history-card-active" : ""}`}
                      key={workflowRun.id}
                      onClick={() => setActiveWorkflowRunId(workflowRun.id)}
                      type="button"
                    >
                      <strong>{workflowRun.name ?? workflowRun.workflow_template_id}</strong>
                      <span>{workflowRun.rows.length} extracted row(s)</span>
                      <span className={`badge badge-${workflowRun.status === "succeeded" ? "low" : "neutral"}`}>
                        {format_label(workflowRun.status)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">No workflow runs yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="workflow-report-grid">
            <div className="panel report-panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Memo draft</p>
                  <h2>{activeWorkflowRun?.name ?? "Select a workflow run"}</h2>
                </div>
                {activeReport ? (
                  <div className="action-row">
                    <button
                      className="secondary-button"
                      disabled={isSavingReport}
                      onClick={saveReportEdits}
                      type="button"
                    >
                      {isSavingReport ? "Saving..." : "Save report edits"}
                    </button>
                    <a
                      className="secondary-link"
                      href={`/api/dd-reports/${activeReport.id}/export?format=memo`}
                    >
                      Export memo
                    </a>
                    <a
                      className="secondary-link"
                      href={`/api/dd-reports/${activeReport.id}/export?format=docx`}
                    >
                      Export memo (.docx)
                    </a>
                    <a
                      className="secondary-link"
                      href={`/api/dd-reports/${activeReport.id}/export?format=exceptions`}
                    >
                      Export exceptions
                    </a>
                  </div>
                ) : null}
              </div>
              {activeReport ? (
                <textarea
                  className="text-area report-editor"
                  rows={18}
                  value={memoDraft}
                  onChange={(event) => setMemoDraft(event.target.value)}
                />
              ) : (
                <div className="empty-state">
                  Run or select a workflow to load the generated DD memo draft.
                </div>
              )}
            </div>

            <div className="panel report-side-panel">
              <div className="stack">
                <div>
                  <p className="section-label">Exceptions</p>
                  <h2>Flagged items</h2>
                </div>
                {activeReport ? (
                  <textarea
                    className="text-area report-editor"
                    rows={8}
                    value={exceptionsDraft}
                    onChange={(event) => setExceptionsDraft(event.target.value)}
                  />
                ) : (
                  <ul className="text-list">
                    <li>No exceptions surfaced yet.</li>
                  </ul>
                )}
              </div>

              <div className="stack">
                <div>
                  <p className="section-label">Document summaries</p>
                  <h2>Per-document recap</h2>
                </div>
                <div className="memo-sections">
                  {activeReport?.document_summaries.length ? (
                    activeReport.document_summaries.map((summary) => (
                      <article className="memo-card" key={summary.document_version_id}>
                        <h3>{summary.document_name}</h3>
                        <p>{summary.summary}</p>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">No document summaries available yet.</div>
                  )}
                </div>
              </div>

              <div className="stack">
                <div>
                  <p className="section-label">Report history</p>
                  <h2>Saved report events</h2>
                </div>
                {activeReport?.events.length ? (
                  <div className="history-detail-list">
                    {activeReport.events.map((event) => (
                      <article className="history-detail-card" key={event.id}>
                        <div className="history-detail-header">
                          <strong>{formatWorkflowHistoryAction(event.action)}</strong>
                          <span className="muted-text">
                            {formatHistoryTimestamp(event.created_at)}
                          </span>
                        </div>
                        <p className="muted-text">
                          {event.actor_surface === "web_app"
                            ? "Saved from the review workspace."
                            : "Saved by the system."}
                        </p>
                        <p className="muted-text">
                          {formatDdReportEventSummary(event)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No report edits recorded yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="query-results">
            <div className="panel-header">
              <div>
                <p className="section-label">Correct extracted cells</p>
                <h2>{activeWorkflowRun?.name ?? "Select a workflow run"}</h2>
              </div>
              {activeWorkflowRun ? (
                <div className="action-row">
                  <button
                    className="secondary-button"
                    disabled={isSavingRows}
                    onClick={saveWorkflowCorrections}
                    type="button"
                  >
                    {isSavingRows ? "Saving..." : "Save cell corrections"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isSubmitting}
                    onClick={rerunWorkflow}
                    type="button"
                  >
                    {isSubmitting ? "Running..." : "Rerun workflow"}
                  </button>
                  <a
                    className="secondary-link"
                    href={`/api/workflow-runs/${activeWorkflowRun.id}/export?format=xlsx`}
                  >
                    Export table (.xlsx)
                  </a>
                </div>
              ) : null}
            </div>

            {activeWorkflowRun ? (
              <div className="table-scroll">
                <table className="issue-table query-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      {activeWorkflowRun.rows[0]?.cells.map((cell) => (
                        <th key={cell.question}>{cell.question}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeWorkflowRun.rows.map((row) => (
                      <tr key={row.document_version_id}>
                        <td>{row.document_name}</td>
                        {row.cells.map((cell) => (
                          <td key={`${row.document_version_id}-${cell.question}`}>
                            <div className="citation-cell">
                              <textarea
                                className="text-area cell-editor"
                                rows={4}
                                value={
                                  rowDrafts[buildCellKey(row.document_version_id, cell.question)] ??
                                  cell.answer
                                }
                                onChange={(event) =>
                                  setRowDrafts((current) => ({
                                    ...current,
                                    [buildCellKey(row.document_version_id, cell.question)]:
                                      event.target.value
                                  }))
                                }
                              />
                              {cell.citations[0] ? (
                                <>
                                  <span>{cell.citations[0].label}</span>
                                  <blockquote>{cell.citations[0].quote}</blockquote>
                                </>
                              ) : (
                                <span>No citation surfaced</span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                Select a workflow run to review and correct extracted cells.
              </div>
            )}

            {activeWorkflowRun ? (
              <div className="workflow-history-panel">
                <div className="stack">
                  <div>
                    <p className="section-label">Correction history</p>
                    <h2>Saved extraction events</h2>
                  </div>
                  {activeWorkflowRun.events.length ? (
                    <div className="history-detail-list">
                      {activeWorkflowRun.events.map((event) => (
                        <article className="history-detail-card" key={event.id}>
                          <div className="history-detail-header">
                            <strong>{formatWorkflowHistoryAction(event.action)}</strong>
                            <span className="muted-text">
                              {formatHistoryTimestamp(event.created_at)}
                            </span>
                          </div>
                          <p className="muted-text">
                            {event.actor_surface === "web_app"
                              ? "Saved from the review workspace."
                              : "Saved by the system."}
                          </p>
                          <p className="muted-text">
                            {formatWorkflowEventSummary(event)}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No correction history recorded yet.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="empty-state">
          Workflow-backed DD reports will appear here once the workspace has a project bridge.
        </div>
      )}
    </section>
  );
}

function buildCellKey(documentVersionId: string, question: string) {
  return `${documentVersionId}::${question}`;
}

function formatWorkflowHistoryAction(action: string) {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatWorkflowEventSummary(event: WorkflowRunRecord["events"][number]) {
  const summary = event.diff_summary;
  const documents =
    summary.changed_documents.length > 0
      ? summary.changed_documents.slice(0, 3).join(", ")
      : "none";
  const questions =
    summary.changed_questions.length > 0
      ? summary.changed_questions.slice(0, 2).join(", ")
      : "none";

  return `${summary.changed_cell_count} cell(s) across ${summary.changed_row_count} row(s) · Documents: ${documents} · Questions: ${questions}`;
}

function formatDdReportEventSummary(event: DdReportRecord["events"][number]) {
  const summary = event.diff_summary;
  const summaryDocs =
    summary.summary_changed_documents.length > 0
      ? summary.summary_changed_documents.slice(0, 3).join(", ")
      : "none";

  return `${summary.memo_changed ? "Memo changed" : "Memo unchanged"} · +${summary.exception_added_count} / -${summary.exception_removed_count} exception(s) · Summary docs: ${summaryDocs}`;
}

function formatHistoryTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function pollQueryRun(
  queryRunId: string,
  setQueryRuns: Dispatch<SetStateAction<QueryRunRecord[]>>,
  setActiveQueryRunId: Dispatch<SetStateAction<string | null>>,
  setStatusMessage: Dispatch<SetStateAction<string | null>>
) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    const response = await fetch(`/api/query-runs/${queryRunId}`, {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to refresh the query run.");
    }
    const queryRun = (await response.json()) as QueryRunRecord;
    setQueryRuns((current) => [queryRun, ...current.filter((run) => run.id !== queryRun.id)]);
    setActiveQueryRunId(queryRun.id);
    if (queryRun.status !== "queued" && queryRun.status !== "running") {
      setStatusMessage(`Query run ${format_label(queryRun.status)}.`);
      return;
    }
  }

  setStatusMessage("Query run is still queued. Start the worker to complete it.");
}

async function pollWorkflowRun(
  workflowRunId: string,
  setWorkflowRuns: Dispatch<SetStateAction<WorkflowRunRecord[]>>,
  setReportMap: Dispatch<SetStateAction<Record<string, DdReportRecord>>>,
  setActiveWorkflowRunId: Dispatch<SetStateAction<string | null>>,
  setStatusMessage: Dispatch<SetStateAction<string | null>>
) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    const response = await fetch(`/api/workflow-runs/${workflowRunId}`, {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to refresh the workflow run.");
    }
    const workflowRun = (await response.json()) as WorkflowRunRecord;
    setWorkflowRuns((current) => [
      workflowRun,
      ...current.filter((run) => run.id !== workflowRun.id)
    ]);
    setActiveWorkflowRunId(workflowRun.id);
    if (workflowRun.dd_report_id) {
      const reportResponse = await fetch(`/api/dd-reports/${workflowRun.dd_report_id}`, {
        method: "GET",
        cache: "no-store"
      });
      if (reportResponse.ok) {
        const report = (await reportResponse.json()) as DdReportRecord;
        setReportMap((current) => ({ ...current, [report.id]: report }));
      }
    }
    if (workflowRun.status !== "queued" && workflowRun.status !== "running") {
      setStatusMessage(`Workflow run ${format_label(workflowRun.status)}.`);
      return;
    }
  }

  setStatusMessage("Workflow run is still queued. Start the worker to complete it.");
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: FilterValue;
  options: string[];
  onChange: (value: FilterValue) => void;
}) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : format_label(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function IssueRow({
  issue,
  documentName
}: {
  issue: IssueRecord;
  documentName: string;
}) {
  const primaryCitation = issue.citations[0];
  const keyDates = issue.key_dates.map((entry) => `${format_label(entry.label)}: ${entry.value}`);

  return (
    <tr>
      <td>
        <div className="issue-cell">
          <strong>{issue.title}</strong>
          <p>{issue.summary}</p>
        </div>
      </td>
      <td>
        <span className={`badge badge-${issue.severity}`}>{format_label(issue.severity)}</span>
      </td>
      <td>
        <span className="badge badge-neutral">{format_label(issue.status)}</span>
      </td>
      <td>{documentName}</td>
      <td>{issue.counterparties.join(", ") || "Not extracted"}</td>
      <td>{keyDates.length > 0 ? keyDates.join(" / ") : "None flagged"}</td>
      <td>
        <div className="citation-cell">
          <span>
            p. {primaryCitation.page_start}
            {primaryCitation.page_start !== primaryCitation.page_end
              ? `-${primaryCitation.page_end}`
              : ""}
          </span>
          <span>{primaryCitation.section_heading}</span>
          <blockquote>{primaryCitation.quoted_snippet}</blockquote>
        </div>
      </td>
    </tr>
  );
}
