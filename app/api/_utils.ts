import { DomainError } from "../../server/shared/errors";

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function ok(data: unknown, init?: ResponseInit): Response {
  return json(data, { status: 200, ...init });
}

export function created(data: unknown): Response {
  return json(data, { status: 201 });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    const status =
      error.code === "MATTER_NOT_FOUND" || error.code === "AUTHORITY_NOT_FOUND"
        ? 404
        : error.code === "INVALID_AUTHORITY_STATE" ||
            error.code === "INTAKE_NOT_ALLOWED" ||
            error.code === "PROVENANCE_REVIEW_NOT_ALLOWED" ||
            error.code === "AUTHORITY_DECISION_NOT_ALLOWED"
          ? 409
          : 400;

    return json({ error: error.message, code: error.code }, { status });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
}
