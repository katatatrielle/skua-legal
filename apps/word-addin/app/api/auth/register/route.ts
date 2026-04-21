import { NextRequest, NextResponse } from "next/server";
import type { AuthRegisterRequest, AuthTokenResponse } from "@skua/schemas";
import {
  fetch_backend_json,
  set_session_cookie
} from "../../_lib/platform";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AuthRegisterRequest;
    const auth = await fetch_backend_json<AuthTokenResponse>(
      "/api/v1/auth/register",
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
      error instanceof Error ? error.message : "Unable to register.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
