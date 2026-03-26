import { z } from "zod";
import {
  artifactTypeSchema,
  defectSeveritySchema,
  defectStatusSchema,
  restartScopeSchema,
  stageDetectedSchema,
} from "./shared";

export const CreateDefectInput = z.object({
  matterId: z.string().trim().min(1),
  authorityId: z.string().trim().min(1).optional(),
  artifactType: artifactTypeSchema,
  artifactId: z.string().trim().min(1),
  defectType: z.string().trim().min(1),
  severity: defectSeveritySchema,
  stageDetected: stageDetectedSchema,
  description: z.string().trim().min(1),
  requiredAction: z.string().trim().min(1).optional(),
  restartScopeRecommended: restartScopeSchema,
  restartScopeChosen: restartScopeSchema.optional(),
  status: defectStatusSchema.optional(),
  resolutionNote: z.string().trim().min(1).optional(),
  discoveredBy: z.string().trim().min(1).optional(),
  resolvedBy: z.string().trim().min(1).optional(),
  reopenCount: z.number().int().nonnegative().optional(),
});

export const UpdateDefectInput = CreateDefectInput.omit({ matterId: true }).partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: "Update payload cannot be empty." }
);

export type CreateDefectInput = z.infer<typeof CreateDefectInput>;
export type UpdateDefectInput = z.infer<typeof UpdateDefectInput>;
