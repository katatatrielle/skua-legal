import { ok, toErrorResponse } from "../../../../api/_utils";
import { listAuthorityDefects } from "../../../../../server/authority/authority.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const defects = await listAuthorityDefects(id);
    return ok(defects);
  } catch (error) {
    return toErrorResponse(error);
  }
}
