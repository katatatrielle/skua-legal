import { NextRequest, NextResponse } from "next/server";
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
    const query_run = await dd_api_client.get_query_run(queryRunId);
    return NextResponse.json(query_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the query run.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
