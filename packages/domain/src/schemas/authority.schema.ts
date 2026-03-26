import { z } from "zod";
import {
  authorityStatusSchema,
  authorityTypeSchema,
  existenceStatusSchema,
  fitStatusSchema,
  pinpointTypeSchema,
  retrievalStatusSchema,
  riskLevelSchema,
  speakerClassificationSchema,
  verificationStatusSchema,
} from "./shared";

export const CreateAuthorityInput = z.object({
  matterId: z.string().trim().min(1),
  authorityType: authorityTypeSchema.optional(),
  citedName: z.string().trim().min(1),
  normalizedName: z.string().trim().min(1).optional(),
  jurisdiction: z.string().trim().min(1).optional(),
  court: z.string().trim().min(1).optional(),
  date: z.coerce.date().optional(),
  sourceDatabase: z.string().trim().min(1).optional(),
  existenceStatus: existenceStatusSchema.optional(),
  retrievalStatus: retrievalStatusSchema.optional(),
  pinpointType: pinpointTypeSchema.optional(),
  excerptText: z.string().trim().min(1).optional(),
  excerptLocation: z.string().trim().min(1).optional(),
  speakerClassification: speakerClassificationSchema.optional(),
  propositionUnderReview: z.string().trim().min(1).optional(),
  fitStatus: fitStatusSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  verificationStatus: verificationStatusSchema.optional(),
  status: authorityStatusSchema.optional(),
});

export const UpdateAuthorityInput = CreateAuthorityInput.omit({ matterId: true }).partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "Update payload cannot be empty." }
);

export const AuthorityPromotionCheck = z
  .object({
    currentStatus: authorityStatusSchema,
    targetStatus: authorityStatusSchema,
    existenceStatus: existenceStatusSchema,
    retrievalStatus: retrievalStatusSchema,
    verificationStatus: verificationStatusSchema,
  })
  .superRefine((value, ctx) => {
    const isCandidateToEligible = value.currentStatus === "candidate" && value.targetStatus === "eligible";

    if (!isCandidateToEligible) {
      return;
    }

    if (value.existenceStatus !== "pass") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Authority cannot become eligible unless existence_status is pass.",
        path: ["existenceStatus"],
      });
    }

    if (value.retrievalStatus !== "pass") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Authority cannot become eligible unless retrieval_status is pass.",
        path: ["retrievalStatus"],
      });
    }

    const allowedVerification = new Set(["verified", "verified_with_warning"]);
    if (!allowedVerification.has(value.verificationStatus)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Authority cannot become eligible unless verification_status is verified or verified_with_warning.",
        path: ["verificationStatus"],
      });
    }
  });

export type CreateAuthorityInput = z.infer<typeof CreateAuthorityInput>;
export type UpdateAuthorityInput = z.infer<typeof UpdateAuthorityInput>;
export type AuthorityPromotionCheck = z.infer<typeof AuthorityPromotionCheck>;
