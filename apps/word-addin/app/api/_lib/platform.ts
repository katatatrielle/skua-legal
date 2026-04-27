import { NextRequest, NextResponse } from "next/server";

const api_base_url = process.env.SKUA_API_BASE_URL ?? "http://127.0.0.1:8000";

const session_cookie_name = "skua_word_session";

export async function parse_backend_error(response: Response): Promise<string> {
  const content_type = response.headers.get("content-type") ?? "";
  if (content_type.includes("application/json")) {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? "Upstream request failed.";
  }

  const text = await response.text();
  return text || "Upstream request failed.";
}

export function get_session_token(request: NextRequest): string | null {
  return request.cookies.get(session_cookie_name)?.value ?? null;
}

export function set_session_cookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: session_cookie_name,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clear_session_cookie(response: NextResponse) {
  response.cookies.set({
    name: session_cookie_name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function unauthorized_response() {
  return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
}

export async function fetch_backend_json<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${api_base_url}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parse_backend_error(response));
  }

  return (await response.json()) as T;
}

export async function proxy_platform_request(
  request: NextRequest,
  path_segments: string[]
): Promise<NextResponse> {
  const token = get_session_token(request);
  if (!token) {
    return unauthorized_response();
  }

  const path = `/api/v1/platform/${path_segments.join("/")}${request.nextUrl.search}`;
  const method = request.method.toUpperCase();
  const inbound_content_type = request.headers.get("content-type") ?? "";
  const headers = new Headers();
  headers.set("Accept", request.headers.get("accept") ?? "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (inbound_content_type.includes("multipart/form-data")) {
      body = await request.formData();
    } else if (inbound_content_type.includes("application/json")) {
      body = await request.text();
      headers.set("Content-Type", "application/json");
    } else if (inbound_content_type) {
      body = await request.text();
      headers.set("Content-Type", inbound_content_type);
    }
  }

  const response = await fetch(`${api_base_url}${path}`, {
    method,
    headers,
    body,
    cache: "no-store"
  });

  const response_content_type = response.headers.get("content-type") ?? "";
  if (response_content_type.includes("application/json")) {
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  }

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: response_content_type
      ? {
          "Content-Type": response_content_type
        }
      : undefined
  });
}

export async function proxy_provider_config_request(
  request: NextRequest,
  config_id?: string
): Promise<NextResponse> {
  const token = get_session_token(request);
  if (!token) {
    return unauthorized_response();
  }

  const suffix = config_id ? `/${config_id}` : "";
  const path = `/api/v1/provider-configs${suffix}${request.nextUrl.search}`;
  const method = request.method.toUpperCase();
  const headers = new Headers();
  headers.set("Accept", request.headers.get("accept") ?? "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    body = await request.text();
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${api_base_url}${path}`, {
    method,
    headers,
    body,
    cache: "no-store"
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
