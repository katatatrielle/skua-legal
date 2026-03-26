import { ok, toErrorResponse } from "../../../../api/_utils";
import { listAuthoritiesForMatter } from "../../../../../server/authority/authority.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ matterId: string }> }
): Promise<Response> {
  try {
    const { matterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const verificationStatus = searchParams.get("verificationStatus");

    const authorities = await listAuthoritiesForMatter({
      matterId,
      filters: {
        status: status ? (status.split(",") as never) : undefined,
        verificationStatus: verificationStatus ? (verificationStatus.split(",") as never) : undefined,
      },
    });
    return ok(authorities);
  } catch (error) {
    return toErrorResponse(error);
  }
}
