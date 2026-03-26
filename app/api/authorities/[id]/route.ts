import { ok, toErrorResponse } from "../../../api/_utils";
import { getAuthorityForReview } from "../../../../server/authority/authority.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const authority = await getAuthorityForReview(id);
    return ok(authority);
  } catch (error) {
    return toErrorResponse(error);
  }
}
