export type AuthorityStatus = "candidate" | "eligible" | "blocked" | "invalidated";
export type VerificationStatus =
  | "not_started"
  | "intake_passed"
  | "provenance_reviewed"
  | "fit_reviewed"
  | "verified"
  | "verified_with_warning"
  | "blocked"
  | "invalidated";

export type RiskLevel = "low" | "medium" | "high";
export type PinpointType = "paragraphs" | "pages" | "none";
export type RetrievalStatus = "pass" | "fail_no_text";
export type ExistenceStatus = "pass" | "ambiguous" | "fail_not_found";
export type SpeakerClassification =
  | "court_holding"
  | "dicta"
  | "quoted_authority"
  | "party_submission"
  | "procedural_history"
  | "background_fact"
  | "unknown";
export type FitStatus =
  | "supports"
  | "supports_narrower_only"
  | "partial_support"
  | "does_not_support"
  | "misleading_if_isolated";
export type DefectSeverity = "critical" | "major" | "minor";
export type DefectStatus = "open" | "pending_human" | "resolved" | "waived" | "reopened";

export interface AuthorityQueueItem {
  id: string;
  citedName: string;
  normalizedName: string | null;
  status: AuthorityStatus;
  verificationStatus: VerificationStatus;
  riskLevel: RiskLevel | null;
  updatedAt: string;
  defectCount: number;
  latestOpenDefectSeverity: DefectSeverity | null;
  linkedResearchItemCount: number;
}

export interface LinkedResearchItem {
  id: string;
  researchItemId: string;
  createdAt: string;
  researchItem: {
    id: string;
    rawText: string;
    sourceType: string;
    sourceUrl: string | null;
    notes: string | null;
    status: string;
    candidateAuthorityNames: string[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface DefectRecord {
  id: string;
  defectType: string;
  severity: DefectSeverity;
  description: string;
  status: DefectStatus;
  stageDetected: string;
  restartScopeRecommended: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorityReviewRecord {
  id: string;
  matterId: string;
  citedName: string;
  normalizedName: string | null;
  jurisdiction: string | null;
  court: string | null;
  date: string | null;
  sourceDatabase: string | null;
  preferredSourceResearchItemId: string | null;
  existenceStatus: ExistenceStatus;
  retrievalStatus: RetrievalStatus;
  pinpointType: PinpointType;
  excerptText: string | null;
  excerptLocation: string | null;
  speakerClassification: SpeakerClassification;
  propositionUnderReview: string | null;
  fitStatus: FitStatus | null;
  riskLevel: RiskLevel | null;
  verificationStatus: VerificationStatus;
  status: AuthorityStatus;
  createdAt: string;
  updatedAt: string;
  researchItemLinks: LinkedResearchItem[];
  preferredSourceResearchItem: LinkedResearchItem["researchItem"] | null;
  defects: DefectRecord[];
}
