import { z } from "zod";
import { researchItemStatusSchema, researchSourceTypeSchema } from "./shared";

export const CreateResearchItemInput = z.object({
  matterId: z.string().trim().min(1),
  rawText: z.string().trim().min(1),
  sourceType: researchSourceTypeSchema,
  candidateAuthorityNames: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().min(1).optional(),
  status: researchItemStatusSchema.optional(),
});

export const UpdateResearchItemInput = z
  .object({
    rawText: z.string().trim().min(1).optional(),
    sourceType: researchSourceTypeSchema.optional(),
    candidateAuthorityNames: z.array(z.string().trim().min(1)).optional(),
    notes: z.string().trim().min(1).optional(),
    status: researchItemStatusSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Update payload cannot be empty.",
  });

export type CreateResearchItemInput = z.infer<typeof CreateResearchItemInput>;
export type UpdateResearchItemInput = z.infer<typeof UpdateResearchItemInput>;
