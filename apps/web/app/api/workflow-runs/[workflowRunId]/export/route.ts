import { NextRequest } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.SKUA_API_BASE_URL ?? process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowRunId: string }> }
) {
  try {
    const { workflowRunId } = await params;
    const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "xlsx";
    const artifact = await dd_api_client.export_workflow_run(workflowRunId, format);

    return new Response(Buffer.from(artifact.content), {
      status: 200,
      headers: {
        "Content-Type": artifact.content_type,
        "Content-Disposition": `attachment; filename="${artifact.filename ?? `${workflowRunId}.${format}` }"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export the workflow run.";

    return new Response(message, { status: 502 });
  }
}
