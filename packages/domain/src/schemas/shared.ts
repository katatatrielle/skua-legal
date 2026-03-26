import { z } from "zod";
import {
  ARTIFACT_TYPES,
  AUTHORITY_STATUSES,
  AUTHORITY_TYPES,
  CLAIM_SUPPORT_LINK_STATUSES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  DRAFT_SECTION_STATUSES,
  EXISTENCE_STATUSES,
  FIT_STATUSES,
  MATTER_STATUSES,
  OUTLINE_NODE_STATUSES,
  OUTLINE_NODE_TYPES,
  PINPOINT_TYPES,
  RESEARCH_ITEM_STATUSES,
  RESEARCH_SOURCE_TYPES,
  RESTART_SCOPES,
  RETRIEVAL_STATUSES,
  RISK_LEVELS,
  SPEAKER_CLASSIFICATIONS,
  STAGE_DETECTED_VALUES,
  TAINT_STATUSES,
  VERIFICATION_STATUSES,
} from "../enums";

export const matterStatusSchema = z.enum(MATTER_STATUSES);
export const researchSourceTypeSchema = z.enum(RESEARCH_SOURCE_TYPES);
export const researchItemStatusSchema = z.enum(RESEARCH_ITEM_STATUSES);
export const authorityTypeSchema = z.enum(AUTHORITY_TYPES);
export const existenceStatusSchema = z.enum(EXISTENCE_STATUSES);
export const retrievalStatusSchema = z.enum(RETRIEVAL_STATUSES);
export const pinpointTypeSchema = z.enum(PINPOINT_TYPES);
export const speakerClassificationSchema = z.enum(SPEAKER_CLASSIFICATIONS);
export const fitStatusSchema = z.enum(FIT_STATUSES);
export const riskLevelSchema = z.enum(RISK_LEVELS);
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export const authorityStatusSchema = z.enum(AUTHORITY_STATUSES);
export const outlineNodeTypeSchema = z.enum(OUTLINE_NODE_TYPES);
export const outlineNodeStatusSchema = z.enum(OUTLINE_NODE_STATUSES);
export const taintStatusSchema = z.enum(TAINT_STATUSES);
export const draftSectionStatusSchema = z.enum(DRAFT_SECTION_STATUSES);
export const claimSupportLinkStatusSchema = z.enum(CLAIM_SUPPORT_LINK_STATUSES);
export const defectSeveritySchema = z.enum(DEFECT_SEVERITIES);
export const artifactTypeSchema = z.enum(ARTIFACT_TYPES);
export const stageDetectedSchema = z.enum(STAGE_DETECTED_VALUES);
export const restartScopeSchema = z.enum(RESTART_SCOPES);
export const defectStatusSchema = z.enum(DEFECT_STATUSES);
