import { createMatter, listMatters } from "../../../server/matters/matter.service.ts";
import { created, ok, readJson, toErrorResponse } from "../_utils";

export async function GET() {
  try {
    return ok(await listMatters());
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createMatter(await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
