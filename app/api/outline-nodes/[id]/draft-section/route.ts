import { ok, toErrorResponse } from "../../../../api/_utils";
import { draftSectionFromOutlineNode } from "../../../../../server/draft/draft.service.ts";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return ok(await draftSectionFromOutlineNode({ outlineNodeId: id }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
