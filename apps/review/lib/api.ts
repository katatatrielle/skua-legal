import type {
  DocumentVersionRecord,
  DdReportRecord,
  GeneratedOutput,
  ProjectRecord,
  QueryRunRecord,
  WorkflowRunRecord,
  WorkflowTemplateRecord,
  WorkspaceDetail,
  WorkspaceSummary
} from "@skua/schemas";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function load_review_workspace(selectedWorkspaceId?: string) {
  const workspaces = await dd_api_client.list_workspaces();
  const projects = await dd_api_client.list_projects();
  const activeWorkspaceId = resolve_workspace_id(workspaces, selectedWorkspaceId);
  const activeProject =
    projects.find((project) => project.workspace_id === activeWorkspaceId) ?? null;

  if (!activeWorkspaceId) {
    return {
      workspaces,
      project: null,
      documentVersions: [] as DocumentVersionRecord[],
      queryRuns: [] as QueryRunRecord[],
      workflowRuns: [] as WorkflowRunRecord[],
      workflowTemplates: [] as WorkflowTemplateRecord[],
      initialDdReports: [] as DdReportRecord[],
      workspace: null,
      output: null,
      selectedWorkspaceId: null
    };
  }

  const [workspace, output, documentVersions, queryRuns, workflowRuns, workflowTemplates] = await Promise.all([
    dd_api_client.get_workspace(activeWorkspaceId),
    dd_api_client.get_first_pass_output(activeWorkspaceId),
    activeProject ? dd_api_client.list_project_documents(activeProject.id) : Promise.resolve([]),
    activeProject ? dd_api_client.list_project_query_runs(activeProject.id) : Promise.resolve([]),
    activeProject ? dd_api_client.list_project_workflow_runs(activeProject.id) : Promise.resolve([]),
    dd_api_client.get_workflow_templates()
  ]);
  const reportIds = workflowRuns
    .map((run) => run.dd_report_id)
    .filter((value): value is string => Boolean(value));
  const uniqueReportIds = [...new Set(reportIds)].slice(0, 5);
  const initialDdReports = uniqueReportIds.length
    ? await Promise.all(uniqueReportIds.map((reportId) => dd_api_client.get_dd_report(reportId)))
    : [];

  return {
    workspaces,
    project: activeProject as ProjectRecord | null,
    documentVersions,
    queryRuns,
    workflowRuns,
    workflowTemplates,
    initialDdReports,
    workspace,
    output,
    selectedWorkspaceId: activeWorkspaceId
  };
}

function resolve_workspace_id(
  workspaces: WorkspaceSummary[],
  selectedWorkspaceId?: string
): string | null {
  if (selectedWorkspaceId && workspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
    return selectedWorkspaceId;
  }

  const firstUploadedWorkspace = workspaces.find(
    (workspace) => workspace.id !== "project-redwood"
  );

  return firstUploadedWorkspace?.id ?? workspaces[0]?.id ?? null;
}
