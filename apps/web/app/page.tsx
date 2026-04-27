import { load_control_room } from "../lib/api";
import { ControlRoom } from "./review-workspace";

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
    const apiBaseUrl = process.env.SKUA_API_BASE_URL ?? "http://127.0.0.1:8000";
    const {
      workspace,
      output,
      workspaces,
      selectedWorkspaceId,
      billingSummary,
      trustProfile,
      adminOverview,
      releaseCriteria
    } = await load_control_room(
      workspaceParam
    );

    if (!workspace || !output || !selectedWorkspaceId) {
      return (
        <main className="page-shell">
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">Skua / Control Room</p>
              <h1>No matter data yet</h1>
              <p className="hero-text">
                Start the API and create a workspace to begin syncing legal documents from Word or the support console.
              </p>
            </div>
          </section>
        </main>
      );
    }

    return (
        <ControlRoom
          ddApiBaseUrl={apiBaseUrl}
          billingSummary={billingSummary}
          trustProfile={trustProfile}
          adminOverview={adminOverview}
          releaseCriteria={releaseCriteria}
          output={output}
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
            <p className="eyebrow">Skua / Control Room</p>
            <h1>Control room is ready for the API</h1>
            <p className="hero-text">
              Start the FastAPI service at <code>http://127.0.0.1:8000</code> or set
              <code> SKUA_API_BASE_URL</code> for this app.
            </p>
          </div>
          <div className="panel offline-panel">
            <p className="section-label">Current status</p>
            <h2>Unable to load workspace data</h2>
            <p className="muted-text">{message}</p>
            <pre className="code-block">
{`cd /Users/katerinamcmullen/Documents/GitHub/skua/services/api
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
