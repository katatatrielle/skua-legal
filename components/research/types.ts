export type SourceType = "case_citation" | "snippet" | "note" | "link" | "proposition";
export type ResearchItemStatus = "new" | "processed" | "abandoned";

export interface ResearchItem {
  id: string;
  matterId: string;
  rawText: string;
  sourceType: SourceType;
  sourceUrl?: string | null;
  notes?: string | null;
  status: ResearchItemStatus;
  candidateAuthorityNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Authority {
  id: string;
  matterId: string;
  citedName: string;
  preferredSourceResearchItemId?: string | null;
  status: "candidate" | "eligible" | "blocked" | "invalidated";
  verificationStatus:
    | "not_started"
    | "intake_passed"
    | "provenance_reviewed"
    | "fit_reviewed"
    | "verified"
    | "verified_with_warning"
    | "blocked"
    | "invalidated";
}
