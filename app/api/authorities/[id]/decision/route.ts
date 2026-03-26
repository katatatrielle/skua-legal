import { ok, readJson, toErrorResponse } from "../../../../api/_utils";
import { setAuthorityDecision } from "../../../../../server/authority/authority.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await readJson<{
      decision: "verified" | "verified_with_warning" | "blocked" | "invalidated";
      userNote?: string;
    }>(request);
    const result = await setAuthorityDecision({
      authorityId: id,
      decision: body.decision,
      userNote: body.userNote,
    });
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
