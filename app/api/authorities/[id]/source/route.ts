import { setAuthorityPreferredSource } from "../../../../../server/authority/authority.service.ts";
import { ok, readJson, toErrorResponse } from "../../../_utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJson<{ researchItemId?: string | null }>(request);
    return ok(await setAuthorityPreferredSource({ authorityId: id, researchItemId: body.researchItemId }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
