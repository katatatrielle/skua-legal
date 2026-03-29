import { ok, toErrorResponse } from "../../../../api/_utils";
import { listMatterDiagnostics } from "../../../../../server/usage/usage.service.ts";

type Context = {
  params: Promise<{ matterId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { matterId } = await context.params;
    return ok(await listMatterDiagnostics(matterId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
