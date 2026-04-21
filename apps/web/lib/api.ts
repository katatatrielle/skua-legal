import type {
  DocumentVersionRecord,
  DdReportRecord,
  GeneratedOutput,
  PlatformAdminOverviewRecord,
  PlatformReleaseCriteriaRecord,
  PlatformTrustRecord,
  PlatformUsageSummaryRecord,
  ProjectRecord,
  QueryRunRecord,
  WorkflowRunRecord,
  WorkflowTemplateRecord,
  WorkspaceDetail,
  WorkspaceSummary
} from "@skua/schemas";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url:
    process.env.SKUA_API_BASE_URL ??
    process.env.DD_API_BASE_URL ??
    "http://127.0.0.1:8000"
});

const api_base_url =
  process.env.SKUA_API_BASE_URL ??
  process.env.DD_API_BASE_URL ??
  "http://127.0.0.1:8000";
const support_token = process.env.SKUA_SUPPORT_TOKEN ?? "";

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
      billingSummary: null,
      trustProfile: null,
      adminOverview: null,
      releaseCriteria: null,
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

  const [billingSummary, trustProfile, adminOverview, releaseCriteria] = await Promise.all([
    activeWorkspaceId && support_token
      ? fetch_json<PlatformUsageSummaryRecord>(`/api/v1/platform/workspaces/${activeWorkspaceId}/billing`, {
          headers: {
            "x-skua-support-token": support_token
          }
        })
      : Promise.resolve(null),
    fetch_json<PlatformTrustRecord>("/api/v1/platform/trust"),
    support_token
      ? fetch_json<PlatformAdminOverviewRecord>("/api/v1/platform/admin/overview", {
          headers: {
            "x-skua-support-token": support_token
          }
        }).catch(() => null)
      : Promise.resolve(null),
    activeWorkspaceId && support_token
      ? fetch_json<PlatformReleaseCriteriaRecord>(`/api/v1/platform/workspaces/${activeWorkspaceId}/release-criteria`, {
          headers: {
            "x-skua-support-token": support_token
          }
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    workspaces,
    project: activeProject as ProjectRecord | null,
    documentVersions,
    queryRuns,
    workflowRuns,
    workflowTemplates,
    initialDdReports,
    billingSummary,
    trustProfile,
    adminOverview,
    releaseCriteria,
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

async function fetch_json<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const response = await fetch(`${api_base_url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}
