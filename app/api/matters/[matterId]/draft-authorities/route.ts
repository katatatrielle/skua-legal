import { ok, toErrorResponse } from "../../../../api/_utils";
import { listEligibleAuthoritiesForMatter } from "../../../../../server/draft/draft.service.ts";

type Context = {
  params: Promise<{ matterId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { matterId } = await context.params;
    return ok(await listEligibleAuthoritiesForMatter(matterId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
