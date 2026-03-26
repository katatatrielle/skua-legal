import { created, ok, readJson, toErrorResponse } from "../../../../api/_utils";
import { createResearchItem, listResearchItemsForMatter } from "../../../../../server/research/research.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ matterId: string }> }
): Promise<Response> {
  try {
    const { matterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const items = await listResearchItemsForMatter(matterId, status as never);
    return ok(items);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matterId: string }> }
): Promise<Response> {
  try {
    const { matterId } = await context.params;
    const body = await readJson<{
      rawText: string;
      sourceType: "case_citation" | "snippet" | "note" | "link" | "proposition";
      notes?: string;
      runExtraction?: boolean;
    }>(request);
    const item = await createResearchItem({ matterId, ...body });
    return created(item);
  } catch (error) {
    return toErrorResponse(error);
  }
}
