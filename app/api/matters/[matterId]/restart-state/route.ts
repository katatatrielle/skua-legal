import { ok, toErrorResponse } from "../../../../api/_utils";
import { getMatterRestartState } from "../../../../../server/restart/restart.service.ts";

type Context = {
  params: Promise<{ matterId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { matterId } = await context.params;
    return ok(await getMatterRestartState(matterId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
