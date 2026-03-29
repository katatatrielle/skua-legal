import { ok, readJson, toErrorResponse } from "../../../../../app/api/_utils";
import { restartFromDefect } from "../../../../../server/restart/restart.service.ts";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await readJson<{
      chosenScope?: "none" | "authority_only" | "proposition" | "outline_node" | "section";
    }>(request);
    return ok(
      await restartFromDefect({
        defectId: id,
        chosenScope: body.chosenScope,
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
