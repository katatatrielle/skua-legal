import { NextRequest } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ queryRunId: string }> }
) {
  try {
    const { queryRunId } = await params;
    const csv_content = await dd_api_client.export_query_run(queryRunId);

    return new Response(csv_content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${queryRunId}.csv"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export the query run.";

    return new Response(message, { status: 502 });
  }
}
