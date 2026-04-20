import { NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reviewRunId: string }> }
) {
  try {
    const { reviewRunId } = await params;
    const export_record = await dd_api_client.export_review_run_summary(reviewRunId);
    return NextResponse.json(export_record);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export the review summary.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
