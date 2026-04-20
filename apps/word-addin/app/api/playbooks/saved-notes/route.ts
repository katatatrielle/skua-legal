import { NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET() {
  try {
    const notes = await dd_api_client.get_saved_playbook_notes();
    return NextResponse.json(notes);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load saved playbook notes.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
