import type {
  PlatformAdminOverviewRecord,
  PlatformReleaseCriteriaRecord,
  PlatformTrustRecord,
  PlatformUsageSummaryRecord,
  WorkspaceSummary
} from "@skua/schemas";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.SKUA_API_BASE_URL ?? "http://127.0.0.1:8000"
});

const api_base_url = process.env.SKUA_API_BASE_URL ?? "http://127.0.0.1:8000";
const support_token = process.env.SKUA_SUPPORT_TOKEN ?? "";

export async function load_control_room(selectedWorkspaceId?: string) {
  const workspaces = await dd_api_client.list_workspaces();
  const activeWorkspaceId = resolve_workspace_id(workspaces, selectedWorkspaceId);

  if (!activeWorkspaceId) {
    return {
      workspaces,
      billingSummary: null,
      trustProfile: null,
      adminOverview: null,
      releaseCriteria: null,
      workspace: null,
      output: null,
      selectedWorkspaceId: null
    };
  }

  const [workspace, output] = await Promise.all([
    dd_api_client.get_workspace(activeWorkspaceId),
    dd_api_client.get_first_pass_output(activeWorkspaceId)
  ]);

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
