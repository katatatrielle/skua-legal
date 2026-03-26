import { z } from "zod";
import { outlineNodeStatusSchema, outlineNodeTypeSchema, taintStatusSchema } from "./shared";

export const CreateOutlineNodeInput = z.object({
  matterId: z.string().trim().min(1),
  parentId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  nodeType: outlineNodeTypeSchema,
  proposition: z.string().trim().min(1).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  linkedAuthorityIds: z.array(z.string().trim().min(1)).default([]),
  status: outlineNodeStatusSchema.optional(),
  taintStatus: taintStatusSchema.optional(),
});

export const UpdateOutlineNodeInput = CreateOutlineNodeInput.omit({ matterId: true }).partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "Update payload cannot be empty." }
);

export const OutlineNodePromotionCheck = z
  .object({
    currentStatus: outlineNodeStatusSchema,
    targetStatus: outlineNodeStatusSchema,
    linkedAuthorityStatuses: z.array(z.enum(["eligible", "candidate", "blocked", "invalidated"])),
    hasOpenCriticalDefects: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const isDraftToReady = value.currentStatus === "draft" && value.targetStatus === "ready";
    if (!isDraftToReady) {
      return;
    }

    if (value.linkedAuthorityStatuses.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Outline node cannot become ready without linked authorities.",
        path: ["linkedAuthorityStatuses"],
      });
      return;
    }

    const hasNonEligible = value.linkedAuthorityStatuses.some((status) => status !== "eligible");
    if (hasNonEligible) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Outline node cannot become ready unless all linked authorities are eligible.",
        path: ["linkedAuthorityStatuses"],
      });
    }

    if (value.hasOpenCriticalDefects) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Outline node cannot become ready while open critical defects exist.",
        path: ["hasOpenCriticalDefects"],
      });
    }
  });

export type CreateOutlineNodeInput = z.infer<typeof CreateOutlineNodeInput>;
export type UpdateOutlineNodeInput = z.infer<typeof UpdateOutlineNodeInput>;
export type OutlineNodePromotionCheck = z.infer<typeof OutlineNodePromotionCheck>;
