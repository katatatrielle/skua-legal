export const MATTER_STATUSES = [
  "setup",
  "researching",
  "verifying_authorities",
  "outlining",
  "drafting",
  "reviewing",
  "completed",
] as const;

export const RESEARCH_SOURCE_TYPES = [
  "case_citation",
  "snippet",
  "note",
  "link",
  "proposition",
] as const;

export const RESEARCH_ITEM_STATUSES = ["new", "processed", "abandoned"] as const;

export const AUTHORITY_TYPES = [
  "case_law",
  "statute",
  "regulation",
  "rule",
  "secondary_source",
  "other",
] as const;

export const EXISTENCE_STATUSES = ["pass", "ambiguous", "fail_not_found"] as const;
export const RETRIEVAL_STATUSES = ["pass", "fail_no_text"] as const;
export const PINPOINT_TYPES = ["paragraphs", "pages", "none"] as const;

export const SPEAKER_CLASSIFICATIONS = [
  "court_holding",
  "dicta",
  "quoted_authority",
  "party_submission",
  "procedural_history",
  "background_fact",
  "unknown",
] as const;

export const FIT_STATUSES = [
  "supports",
  "supports_narrower_only",
  "partial_support",
  "does_not_support",
  "misleading_if_isolated",
] as const;

export const RISK_LEVELS = ["low", "medium", "high"] as const;

export const VERIFICATION_STATUSES = [
  "not_started",
  "intake_passed",
  "provenance_reviewed",
  "fit_reviewed",
  "verified",
  "verified_with_warning",
  "blocked",
  "invalidated",
] as const;

export const AUTHORITY_STATUSES = ["candidate", "eligible", "blocked", "invalidated"] as const;

export const OUTLINE_NODE_TYPES = ["issue", "rule", "analysis", "counterargument", "conclusion"] as const;
export const OUTLINE_NODE_STATUSES = ["draft", "ready", "blocked"] as const;

export const TAINT_STATUSES = ["clean", "suspect", "tainted"] as const;
export const DRAFT_SECTION_STATUSES = ["draft", "verified", "invalidated"] as const;
export const CLAIM_SUPPORT_LINK_STATUSES = ["verified", "warning", "blocked"] as const;

export const DEFECT_SEVERITIES = ["critical", "major", "minor"] as const;
export const ARTIFACT_TYPES = ["proposition", "outline_node", "paragraph", "section", "memo", "authority"] as const;
export const STAGE_DETECTED_VALUES = [
  "intake",
  "provenance_fit_review",
  "outlining",
  "drafting",
  "claim_verification",
  "final_sweep",
] as const;

export const RESTART_SCOPES = ["none", "authority_only", "proposition", "outline_node", "section"] as const;
export const DEFECT_STATUSES = ["open", "pending_human", "resolved", "waived", "reopened"] as const;

export const CHECKPOINT_STAGES = ["research", "authority_clean", "outline_clean", "section_clean"] as const;
export const CHECKPOINT_STATUSES = ["clean", "superseded"] as const;

export type MatterStatus = (typeof MATTER_STATUSES)[number];
export type ResearchSourceType = (typeof RESEARCH_SOURCE_TYPES)[number];
export type ResearchItemStatus = (typeof RESEARCH_ITEM_STATUSES)[number];
export type AuthorityType = (typeof AUTHORITY_TYPES)[number];
export type ExistenceStatus = (typeof EXISTENCE_STATUSES)[number];
export type RetrievalStatus = (typeof RETRIEVAL_STATUSES)[number];
export type PinpointType = (typeof PINPOINT_TYPES)[number];
export type SpeakerClassification = (typeof SPEAKER_CLASSIFICATIONS)[number];
export type FitStatus = (typeof FIT_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type AuthorityStatus = (typeof AUTHORITY_STATUSES)[number];
export type OutlineNodeType = (typeof OUTLINE_NODE_TYPES)[number];
export type OutlineNodeStatus = (typeof OUTLINE_NODE_STATUSES)[number];
export type TaintStatus = (typeof TAINT_STATUSES)[number];
export type DraftSectionStatus = (typeof DRAFT_SECTION_STATUSES)[number];
export type ClaimSupportLinkStatus = (typeof CLAIM_SUPPORT_LINK_STATUSES)[number];
export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type StageDetected = (typeof STAGE_DETECTED_VALUES)[number];
export type RestartScope = (typeof RESTART_SCOPES)[number];
export type DefectStatus = (typeof DEFECT_STATUSES)[number];
export type CheckpointStage = (typeof CHECKPOINT_STAGES)[number];
export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[number];
