import { load_review_workspace } from "../lib/api";
import { ReviewWorkspace } from "./review-workspace";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ workspace?: string | string[] }>;
}) {
  try {
    const resolvedSearchParams = (await Promise.resolve(searchParams ?? {})) as {
      workspace?: string | string[];
    };
    const workspaceParam = Array.isArray(resolvedSearchParams.workspace)
      ? resolvedSearchParams.workspace[0]
      : resolvedSearchParams.workspace;
    const ddApiBaseUrl = process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000";
    const {
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
    } = await load_review_workspace(
      workspaceParam
    );

    if (!workspace || !output || !selectedWorkspaceId) {
      return (
        <main className="page-shell">
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">Skua Legal / Web Console</p>
              <h1>No workspace data yet</h1>
              <p className="hero-text">
                Start the backend API and create a workspace to begin uploading contracts.
              </p>
            </div>
          </section>
        </main>
      );
    }

    return (
        <ReviewWorkspace
          ddApiBaseUrl={ddApiBaseUrl}
          documentVersions={documentVersions}
          initialDdReports={initialDdReports}
          output={output}
          project={project}
          queryRuns={queryRuns}
          workflowRuns={workflowRuns}
          workflowTemplates={workflowTemplates}
          selectedWorkspaceId={selectedWorkspaceId}
          workspace={workspace}
          workspaces={workspaces}
        />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading review data.";

    return (
      <main className="page-shell">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Skua Legal / Web Console</p>
            <h1>Web console is ready for the backend API</h1>
            <p className="hero-text">
              Start the FastAPI service at <code>http://127.0.0.1:8000</code> or set
              <code> DD_API_BASE_URL</code> for this app.
            </p>
          </div>
          <div className="panel offline-panel">
            <p className="section-label">Current status</p>
            <h2>Unable to load workspace data</h2>
            <p className="muted-text">{message}</p>
            <pre className="code-block">
{`cd /Users/katerinamcmullen/Documents/GitHub/skua/services/dd-api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload`}
            </pre>
          </div>
        </section>
      </main>
    );
  }
}
