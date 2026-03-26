import { ok, readJson, toErrorResponse } from "../../../../api/_utils";
import { runAuthorityIntakeChecks } from "../../../../../server/authority/authority.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await readJson<{
      providedSourceText?: string;
      providedLocator?: string;
    }>(request);
    const result = await runAuthorityIntakeChecks({
      authorityId: id,
      providedSourceText: body.providedSourceText,
      providedLocator: body.providedLocator,
    });
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
