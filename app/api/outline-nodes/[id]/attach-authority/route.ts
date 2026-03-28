import { ok, readJson, toErrorResponse } from "../../../../api/_utils";
import { attachAuthorityToOutlineNode } from "../../../../../server/draft/draft.service.ts";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await readJson<{ authorityId: string }>(request);
    return ok(await attachAuthorityToOutlineNode({ outlineNodeId: id, authorityId: body.authorityId }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
