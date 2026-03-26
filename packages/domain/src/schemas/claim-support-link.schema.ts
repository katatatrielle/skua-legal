import { z } from "zod";
import { claimSupportLinkStatusSchema, fitStatusSchema, speakerClassificationSchema } from "./shared";

export const CreateClaimSupportLinkInput = z.object({
  draftSectionId: z.string().trim().min(1),
  claimText: z.string().trim().min(1),
  claimLocation: z.string().trim().min(1).optional(),
  authorityId: z.string().trim().min(1),
  excerptText: z.string().trim().min(1),
  excerptLocation: z.string().trim().min(1).optional(),
  speakerClassification: speakerClassificationSchema,
  fitStatus: fitStatusSchema,
  verificationSummary: z.string().trim().min(1).optional(),
  status: claimSupportLinkStatusSchema,
});

export const UpdateClaimSupportLinkInput = z
  .object({
    claimText: z.string().trim().min(1).optional(),
    claimLocation: z.string().trim().min(1).optional(),
    authorityId: z.string().trim().min(1).optional(),
    excerptText: z.string().trim().min(1).optional(),
    excerptLocation: z.string().trim().min(1).optional(),
    speakerClassification: speakerClassificationSchema.optional(),
    fitStatus: fitStatusSchema.optional(),
    verificationSummary: z.string().trim().min(1).optional(),
    status: claimSupportLinkStatusSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Update payload cannot be empty.",
  });

export type CreateClaimSupportLinkInput = z.infer<typeof CreateClaimSupportLinkInput>;
export type UpdateClaimSupportLinkInput = z.infer<typeof UpdateClaimSupportLinkInput>;
