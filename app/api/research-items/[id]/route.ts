import { ok, readJson, toErrorResponse } from "../../../api/_utils";
import { markResearchItemStatus, updateResearchItem } from "../../../../server/research/research.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await readJson<{
      rawText?: string;
      sourceType?: "case_citation" | "snippet" | "note" | "link" | "proposition";
      notes?: string;
      runExtractionOnTextChange?: boolean;
      status?: "new" | "processed" | "abandoned";
    }>(request);

    const updated = body.status
      ? await markResearchItemStatus({ researchItemId: id, status: body.status })
      : await updateResearchItem({ researchItemId: id, ...body });

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
