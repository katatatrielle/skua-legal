import { NextRequest, NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";
import type { WorkflowRunRerunRequest } from "@skua/schemas";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowRunId: string }> }
) {
  try {
    const { workflowRunId } = await params;
    const payload = (await request.json().catch(() => ({}))) as WorkflowRunRerunRequest;
    const workflow_run = await dd_api_client.rerun_workflow_run(workflowRunId, payload);
    return NextResponse.json(workflow_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to rerun the workflow.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
