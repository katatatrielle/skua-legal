import { NextRequest, NextResponse } from "next/server";
import { create_dd_api_client } from "@skua/sdk";
import type { DdReportUpdateRequest } from "@skua/schemas";

const dd_api_client = create_dd_api_client({
  base_url: process.env.SKUA_API_BASE_URL ?? process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ddReportId: string }> }
) {
  try {
    const { ddReportId } = await params;
    const dd_report = await dd_api_client.get_dd_report(ddReportId);
    return NextResponse.json(dd_report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the DD report.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ddReportId: string }> }
) {
  try {
    const { ddReportId } = await params;
    const payload = (await request.json()) as DdReportUpdateRequest;
    const dd_report = await dd_api_client.update_dd_report(ddReportId, payload);
    return NextResponse.json(dd_report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the DD report.";

    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
