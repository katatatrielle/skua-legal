import { created, readJson, toErrorResponse } from "../../../../api/_utils";
import { createAuthorityFromResearchItem } from "../../../../../server/research/research.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await readJson<{
      matterId: string;
      selectedCandidateAuthority: string;
    }>(request);
    const authority = await createAuthorityFromResearchItem({
      matterId: body.matterId,
      researchItemId: id,
      selectedCandidateAuthority: body.selectedCandidateAuthority,
    });
    return created(authority);
  } catch (error) {
    return toErrorResponse(error);
  }
}
