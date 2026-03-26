import { ok, toErrorResponse } from "../../../../api/_utils";
import { extractCandidateAuthoritiesFromResearchItem } from "../../../../../server/research/research.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const result = await extractCandidateAuthoritiesFromResearchItem(id);
    return ok(result.item);
  } catch (error) {
    return toErrorResponse(error);
  }
}
