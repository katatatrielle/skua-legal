import type {
  AuthorityStatus,
  DefectSeverity,
  DefectStatus,
  FitStatus,
  RestartScope,
  RetrievalStatus,
  RiskLevel,
  SpeakerClassification,
  VerificationStatus,
} from "@prisma/client";

export type AuthorityListFilters = {
  status?: AuthorityStatus[];
  verificationStatus?: VerificationStatus[];
};

export type IntakeInput = {
  authorityId: string;
  providedSourceText?: string;
  providedLocator?: string;
};

export type UpdateAuthorityPreferredSourceInput = {
  authorityId: string;
  researchItemId?: string | null;
};

export type IntakeResult = {
  existenceStatus: "pass" | "ambiguous" | "fail_not_found";
  retrievalStatus: "pass" | "fail_no_text";
  pinpointType: "paragraphs" | "pages" | "none" | "unknown";
  excerptText?: string;
  excerptLocation?: string;
  defect?: {
    defectType: string;
    severity: DefectSeverity;
    description: string;
  };
};

export type ProvenanceReviewInput = {
  authorityId: string;
  propositionUnderReview: string;
};

export type ProvenanceReviewResult = {
  speakerClassification: SpeakerClassification;
  fitStatus: FitStatus;
  riskLevel: RiskLevel;
  verificationSummary: string;
};

export type AuthorityDecision = "verified" | "verified_with_warning" | "blocked" | "invalidated";

export type CreateAuthorityDefectInput = {
  authorityId: string;
  defectType: string;
  severity: DefectSeverity;
  description: string;
  restartScopeRecommended: RestartScope;
};

export type OpenDefectSummary = {
  severity: DefectSeverity;
  defectType: string;
  status: DefectStatus;
};

export type AuthorityQueueItem = {
  id: string;
  citedName: string;
  normalizedName: string | null;
  status: AuthorityStatus;
  verificationStatus: VerificationStatus;
  riskLevel: RiskLevel | null;
  updatedAt: Date;
  defectCount: number;
  latestOpenDefectSeverity: DefectSeverity | null;
  linkedResearchItemCount: number;
};
