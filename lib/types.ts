import type { Prisma } from "@prisma/client";

export type CandidateAuthorityNames = string[];

export type IntakeResult = {
  existenceStatus: "pass" | "ambiguous" | "fail_not_found";
  retrievalStatus: "pass" | "fail_no_text";
  pinpointType: "paragraphs" | "pages" | "none" | "unknown";
  excerptText?: string;
  excerptLocation?: string;
  defect?: {
    defectType: string;
    severity: "critical" | "major" | "minor";
    description: string;
  };
};

export type ProvenanceReviewResult = {
  speakerClassification:
    | "court_holding"
    | "dicta"
    | "quoted_authority"
    | "party_submission"
    | "procedural_history"
    | "background_fact"
    | "unknown";
  fitStatus:
    | "supports"
    | "supports_narrower_only"
    | "partial_support"
    | "does_not_support"
    | "misleading_if_isolated";
  riskLevel: "low" | "medium" | "high";
  verificationSummary: string;
  defectType?: string;
};

export type AuthorityWithReviewContext = Prisma.AuthorityGetPayload<{
  include: {
    preferredSourceResearchItem: true;
    researchItemLinks: {
      include: {
        researchItem: true;
      };
    };
    defects: true;
  };
}>;
