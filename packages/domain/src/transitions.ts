import type {
  AuthorityStatus,
  CheckpointStatus,
  DefectStatus,
  DraftSectionStatus,
  MatterStatus,
  OutlineNodeStatus,
  ResearchItemStatus,
  VerificationStatus,
} from "./enums";

type TransitionMap<T extends string> = Record<T, readonly T[]>;

export const MATTER_STATUS_TRANSITIONS: TransitionMap<MatterStatus> = {
  setup: ["researching"],
  researching: ["verifying_authorities", "setup"],
  verifying_authorities: ["outlining", "researching"],
  outlining: ["drafting", "verifying_authorities"],
  drafting: ["reviewing", "outlining"],
  reviewing: ["completed", "drafting"],
  completed: ["reviewing"],
};

export const RESEARCH_ITEM_STATUS_TRANSITIONS: TransitionMap<ResearchItemStatus> = {
  new: ["processed", "abandoned"],
  processed: ["abandoned"],
  abandoned: ["new"],
};

export const AUTHORITY_STATUS_TRANSITIONS: TransitionMap<AuthorityStatus> = {
  candidate: ["eligible", "blocked", "invalidated"],
  eligible: ["blocked", "invalidated"],
  blocked: ["candidate", "invalidated"],
  invalidated: [],
};

export const VERIFICATION_STATUS_TRANSITIONS: TransitionMap<VerificationStatus> = {
  not_started: ["intake_passed", "blocked", "invalidated"],
  intake_passed: ["provenance_reviewed", "blocked", "invalidated"],
  provenance_reviewed: ["fit_reviewed", "blocked", "invalidated"],
  fit_reviewed: ["verified", "verified_with_warning", "blocked", "invalidated"],
  verified: ["blocked", "invalidated"],
  verified_with_warning: ["verified", "blocked", "invalidated"],
  blocked: ["intake_passed", "provenance_reviewed", "fit_reviewed", "verified", "verified_with_warning", "invalidated"],
  invalidated: [],
};

export const OUTLINE_NODE_STATUS_TRANSITIONS: TransitionMap<OutlineNodeStatus> = {
  draft: ["ready", "blocked"],
  ready: ["blocked", "draft"],
  blocked: ["draft"],
};

export const DRAFT_SECTION_STATUS_TRANSITIONS: TransitionMap<DraftSectionStatus> = {
  draft: ["verified", "invalidated"],
  verified: ["invalidated", "draft"],
  invalidated: ["draft"],
};

export const DEFECT_STATUS_TRANSITIONS: TransitionMap<DefectStatus> = {
  open: ["pending_human", "resolved", "waived", "reopened"],
  pending_human: ["resolved", "waived", "reopened"],
  resolved: ["reopened"],
  waived: ["reopened"],
  reopened: ["pending_human", "resolved", "waived"],
};

export const CHECKPOINT_STATUS_TRANSITIONS: TransitionMap<CheckpointStatus> = {
  clean: ["superseded"],
  superseded: [],
};

export function canTransition<T extends string>(
  map: Record<T, readonly T[]>,
  from: T,
  to: T
): boolean {
  return map[from].includes(to);
}
