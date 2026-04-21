import { NextRequest, NextResponse } from "next/server";
import type { AuthLoginRequest, AuthTokenResponse } from "@skua/schemas";
import {
  fetch_backend_json,
  set_session_cookie
} from "../../_lib/platform";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AuthLoginRequest;
    const auth = await fetch_backend_json<AuthTokenResponse>(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
    const response = NextResponse.json(auth);
    set_session_cookie(response, auth.access_token);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
