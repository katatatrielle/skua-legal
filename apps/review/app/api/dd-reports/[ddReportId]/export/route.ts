import { NextRequest } from "next/server";
import { create_dd_api_client } from "@skua/sdk";

const dd_api_client = create_dd_api_client({
  base_url: process.env.DD_API_BASE_URL ?? "http://127.0.0.1:8000"
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ddReportId: string }> }
) {
  try {
    const { ddReportId } = await params;
    const requestedFormat = request.nextUrl.searchParams.get("format");
    const format =
      requestedFormat === "exceptions" || requestedFormat === "docx"
        ? requestedFormat
        : "memo";
    const artifact = await dd_api_client.export_dd_report(ddReportId, format);

    return new Response(Buffer.from(artifact.content), {
      status: 200,
      headers: {
        "Content-Type": artifact.content_type,
        "Content-Disposition": `attachment; filename="${artifact.filename ?? `${ddReportId}-${format}` }"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export the DD report.";

    return new Response(message, { status: 502 });
  }
}
