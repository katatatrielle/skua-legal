import { NextRequest, NextResponse } from "next/server";
import type { PlatformUserRecord } from "@skua/schemas";
import {
  fetch_backend_json,
  get_session_token,
  unauthorized_response
} from "../../_lib/platform";

export async function GET(request: NextRequest) {
  const token = get_session_token(request);
  if (!token) {
    return unauthorized_response();
  }

  try {
    const user = await fetch_backend_json<PlatformUserRecord>(
      "/api/v1/auth/me",
      {},
      token
    );
    return NextResponse.json(user);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the current user.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
