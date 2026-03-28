import { created, ok, readJson, toErrorResponse } from "../../../../api/_utils";
import { createOutlineNode, listOutlineNodesForMatter } from "../../../../../server/draft/draft.service.ts";

type Context = {
  params: Promise<{ matterId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { matterId } = await context.params;
    return ok(await listOutlineNodesForMatter(matterId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { matterId } = await context.params;
    const body = await readJson<{
      title: string;
      proposition?: string;
      nodeType?: "issue" | "rule" | "analysis" | "counterargument" | "conclusion";
    }>(request);
    return created(await createOutlineNode({ matterId, ...body }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
