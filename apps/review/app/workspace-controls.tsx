"use client";

import type { UploadDocumentsResponse, WorkspaceSummary } from "@skua/schemas";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function WorkspaceControls({
  workspaces,
  selectedWorkspaceId,
  ddApiBaseUrl
}: {
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string;
  ddApiBaseUrl: string;
}) {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isDemoWorkspace = selectedWorkspaceId === "project-redwood";

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = workspaceName.trim();
    if (!name) {
      setErrorMessage("Enter a workspace name before creating the deal.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`${ddApiBaseUrl}/api/v1/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const workspace = (await response.json()) as WorkspaceSummary;
      setWorkspaceName("");
      setStatusMessage(`Created workspace ${workspace.name}.`);

      startTransition(() => {
        router.push(`/?workspace=${workspace.id}`);
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create workspace.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUploadDocuments(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDemoWorkspace) {
      setErrorMessage("Create a new workspace before uploading real documents.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const files = formData.getAll("files").filter((value) => value instanceof File && value.size > 0);

    if (files.length === 0) {
      setErrorMessage("Choose at least one PDF or DOCX file to upload.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `${ddApiBaseUrl}/api/v1/workspaces/${selectedWorkspaceId}/documents/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const payload = (await response.json()) as UploadDocumentsResponse;
      setStatusMessage(payload.notes.join(" "));
      event.currentTarget.reset();

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload files.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="control-bar">
      <div className="action-card">
        <p className="section-label">Workspace</p>
        <h2>Choose the deal</h2>
        <label className="filter workspace-select">
          <span>Current workspace</span>
          <select
            value={selectedWorkspaceId}
            onChange={(event) => {
              const nextWorkspaceId = event.target.value;
              startTransition(() => {
                router.push(`/?workspace=${nextWorkspaceId}`);
                router.refresh();
              });
            }}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="action-card">
        <p className="section-label">Create workspace</p>
        <h2>Open a new matter</h2>
        <form className="inline-form" onSubmit={handleCreateWorkspace}>
          <input
            name="workspaceName"
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Project Maple Acquisition"
            value={workspaceName}
          />
          <button disabled={isCreating} type="submit">
            {isCreating ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      <div className="action-card">
        <p className="section-label">Upload documents</p>
        <h2>Real files in</h2>
        <form className="upload-form" onSubmit={handleUploadDocuments}>
          <input accept=".pdf,.docx" multiple name="files" type="file" />
          <button disabled={isUploading || isDemoWorkspace} type="submit">
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        <p className="muted-text small-text">
          {isDemoWorkspace
            ? "The demo workspace is read-only. Create a new workspace for live uploads."
            : "Upload PDF and DOCX files. Exact duplicate files are skipped by hash."}
        </p>
      </div>

      {(statusMessage || errorMessage) && (
        <div className={`status-banner ${errorMessage ? "status-error" : "status-success"}`}>
          {errorMessage ?? statusMessage}
        </div>
      )}
    </section>
  );
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
