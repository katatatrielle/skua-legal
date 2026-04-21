import { NextRequest, NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.SKUA_API_BASE_URL ?? process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ askRunId: string }> }
) {
  try {
    const { askRunId } = await params;
    const ask_run = await dd_api_client.get_ask_run(askRunId);

    return NextResponse.json(ask_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the ask run.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
