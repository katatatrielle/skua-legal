import { NextRequest, NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";
import type { ReviewSuggestionSaveToPlaybookRequest } from "@skua/schemas";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const payload = (await request.json()) as ReviewSuggestionSaveToPlaybookRequest;
    const { suggestionId } = await params;
    const review_run = await dd_api_client.save_review_suggestion_to_playbook(
      suggestionId,
      payload
    );

    return NextResponse.json(review_run);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the review suggestion.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
