import { NextRequest, NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";
import type { WorkflowRunUpdateRequest } from "@skua/schemas";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workflowRunId: string }> }
) {
  try {
    const { workflowRunId } = await params;
    const workflow_run = await dd_api_client.get_workflow_run(workflowRunId);
    return NextResponse.json(workflow_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the workflow run.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workflowRunId: string }> }
) {
  try {
    const { workflowRunId } = await params;
    const payload = (await request.json()) as WorkflowRunUpdateRequest;
    const workflow_run = await dd_api_client.update_workflow_run(workflowRunId, payload);
    return NextResponse.json(workflow_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the workflow run.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
