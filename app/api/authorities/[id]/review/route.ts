import { ok, readJson, toErrorResponse } from "../../../../api/_utils";
import { runAuthorityProvenanceReview } from "../../../../../server/authority/authority.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await readJson<{ propositionUnderReview: string }>(request);
    const result = await runAuthorityProvenanceReview({
      authorityId: id,
      propositionUnderReview: body.propositionUnderReview,
    });
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
