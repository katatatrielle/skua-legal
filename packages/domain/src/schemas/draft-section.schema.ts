import { z } from "zod";
import { draftSectionStatusSchema, taintStatusSchema } from "./shared";

export const CreateDraftSectionInput = z.object({
  matterId: z.string().trim().min(1),
  outlineNodeId: z.string().trim().min(1),
  text: z.string().trim().min(1),
  status: draftSectionStatusSchema.optional(),
  taintStatus: taintStatusSchema.optional(),
  checkpointParent: z.string().trim().min(1).optional(),
});

export const UpdateDraftSectionInput = z
  .object({
    text: z.string().trim().min(1).optional(),
    status: draftSectionStatusSchema.optional(),
    taintStatus: taintStatusSchema.optional(),
    checkpointParent: z.string().trim().min(1).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Update payload cannot be empty.",
  });

export const DraftSectionPromotionCheck = z
  .object({
    currentStatus: draftSectionStatusSchema,
    targetStatus: draftSectionStatusSchema,
    taintStatus: taintStatusSchema,
    materialClaimCount: z.number().int().nonnegative(),
    claimSupportLinkCount: z.number().int().nonnegative(),
    hasUnresolvedCriticalOrMajorDefects: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const isDraftToVerified = value.currentStatus === "draft" && value.targetStatus === "verified";
    if (!isDraftToVerified) {
      return;
    }

    if (value.taintStatus !== "clean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Draft section cannot become verified unless taint_status is clean.",
        path: ["taintStatus"],
      });
    }

    if (value.claimSupportLinkCount < value.materialClaimCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Draft section cannot become verified unless every material claim has a claim support link.",
        path: ["claimSupportLinkCount"],
      });
    }

    if (value.hasUnresolvedCriticalOrMajorDefects) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Draft section cannot become verified while unresolved critical or major defects exist.",
        path: ["hasUnresolvedCriticalOrMajorDefects"],
      });
    }
  });

export type CreateDraftSectionInput = z.infer<typeof CreateDraftSectionInput>;
export type UpdateDraftSectionInput = z.infer<typeof UpdateDraftSectionInput>;
export type DraftSectionPromotionCheck = z.infer<typeof DraftSectionPromotionCheck>;
