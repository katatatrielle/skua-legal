import { z } from "zod";
import { matterStatusSchema } from "./shared";

export const CreateMatterInput = z.object({
  title: z.string().trim().min(1),
  courseOrContext: z.string().trim().min(1).optional(),
  assignmentType: z.string().trim().min(1).optional(),
  mainIssue: z.string().trim().min(1).optional(),
  objective: z.string().trim().min(1).optional(),
  status: matterStatusSchema.optional(),
});

export const UpdateMatterInput = CreateMatterInput.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "Update payload cannot be empty." }
);

export type CreateMatterInput = z.infer<typeof CreateMatterInput>;
export type UpdateMatterInput = z.infer<typeof UpdateMatterInput>;
