export type CreateMatterInput = {
  title: string;
  courseOrContext?: string;
  mainIssue?: string;
  objective?: string;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function validateCreateMatterInput(input: CreateMatterInput): CreateMatterInput {
  assertNonEmptyString(input.title, "title");

  if (input.courseOrContext !== undefined && typeof input.courseOrContext !== "string") {
    throw new Error("courseOrContext must be a string");
  }
  if (input.mainIssue !== undefined && typeof input.mainIssue !== "string") {
    throw new Error("mainIssue must be a string");
  }
  if (input.objective !== undefined && typeof input.objective !== "string") {
    throw new Error("objective must be a string");
  }

  return {
    title: input.title.trim(),
    courseOrContext: input.courseOrContext?.trim(),
    mainIssue: input.mainIssue?.trim(),
    objective: input.objective?.trim(),
  };
}
