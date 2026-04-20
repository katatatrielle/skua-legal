import { NextRequest, NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewRunId: string }> }
) {
  try {
    const { reviewRunId } = await params;
    const review_run = await dd_api_client.get_review_run(reviewRunId);

    return NextResponse.json(review_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the review run.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
