import type {
  AskRunRecord,
  CitationRecord,
  DraftRunRecord,
  ReviewRunRecord,
  ReviewSuggestionRecord
} from "@skua/schemas";

export const pane_context = {
  project_name: "Maple Acquisition",
  document_name: "Vendor MSA",
  represented_party: "Buyer",
  jurisdiction: "Ontario",
  document_version: "v3",
  status_label: "Saved"
};

const assignment_citation: CitationRecord = {
  document_id: "doc_vendor_msa",
  document_version_id: "dv_vendor_msa_v3",
  anchor_id: "anc_assignment_clause",
  label: "Assignment clause",
  quote: "Neither party may assign this Agreement without prior written consent of the other party.",
  page_start: null,
  page_end: null
};

const term_citation: CitationRecord = {
  document_id: "doc_vendor_msa",
  document_version_id: "dv_vendor_msa_v3",
  anchor_id: "anc_term_clause",
  label: "Term and renewal",
  quote: "The initial term is one year and the Agreement renews automatically for successive one-year periods unless either party gives 60 days' notice.",
  page_start: null,
  page_end: null
};

export const review_run: ReviewRunRecord = {
  id: "rr_vendor_msa_general",
  project_id: "prj_maple_acquisition",
  document_version_id: "dv_vendor_msa_v3",
  status: "succeeded",
  review_type: "general",
  represented_party: "Buyer",
  jurisdiction: "Ontario",
  audience: "internal",
  summary: {
    total: 4,
    high: 1,
    medium: 2,
    low: 1
  },
  suggestions: [
    {
      id: "sug_assignment_carveout",
      review_run_id: "rr_vendor_msa_general",
      anchor_id: "anc_assignment_clause",
      title: "Consent may be required on change of control",
      issue_type: "assignment",
      severity: "high",
      confidence: 0.84,
      explanation:
        "The assignment clause appears to prohibit transfers without a carve-out for affiliate transfers or internal reorganizations.",
      supporting_excerpt:
        "Neither party may assign this Agreement without prior written consent of the other party.",
      proposed_comment:
        "Buyer counsel note: consider adding an affiliate or change-of-control carve-out.",
      proposed_redline: {
        op: "replace",
        replacement_text:
          "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets."
      },
      fallback_position_text:
        "If a broad transfer carve-out is not acceptable, propose an affiliate-only carve-out.",
      status: "open",
      citations: [assignment_citation]
    },
    {
      id: "sug_renewal_notice",
      review_run_id: "rr_vendor_msa_general",
      anchor_id: "anc_term_clause",
      title: "Auto-renewal should be tracked against notice calendar",
      issue_type: "renewal",
      severity: "medium",
      confidence: 0.79,
      explanation:
        "The agreement renews automatically unless 60 days' prior notice is given, which creates a live docketing risk.",
      supporting_excerpt:
        "The initial term is one year and the Agreement renews automatically for successive one-year periods unless either party gives 60 days' notice.",
      proposed_comment:
        "Track the 60-day notice deadline and confirm whether auto-renewal is commercially acceptable.",
      proposed_redline: null,
      fallback_position_text: null,
      status: "reviewed",
      citations: [term_citation]
    },
    {
      id: "sug_governing_law",
      review_run_id: "rr_vendor_msa_general",
      anchor_id: "anc_governing_law_clause",
      title: "Governing law should match transaction playbook default",
      issue_type: "governing_law",
      severity: "medium",
      confidence: 0.68,
      explanation:
        "The draft appears workable, but governing law should be confirmed against the project's standard form position.",
      supporting_excerpt: "This Agreement is governed by the laws of the Province of British Columbia.",
      proposed_comment:
        "Confirm whether British Columbia governing law is acceptable for this matter.",
      proposed_redline: null,
      fallback_position_text: null,
      status: "open",
      citations: [
        {
          document_id: "doc_vendor_msa",
          document_version_id: "dv_vendor_msa_v3",
          anchor_id: "anc_governing_law_clause",
          label: "Governing law",
          quote: "This Agreement is governed by the laws of the Province of British Columbia.",
          page_start: null,
          page_end: null
        }
      ]
    },
    {
      id: "sug_liability_floor",
      review_run_id: "rr_vendor_msa_general",
      anchor_id: "anc_liability_cap",
      title: "Liability cap looks below house preference",
      issue_type: "liability_cap",
      severity: "low",
      confidence: 0.61,
      explanation:
        "The cap may be commercially acceptable, but it appears tighter than the buyer-side fallback language used in recent precedent.",
      supporting_excerpt: "In no event shall either party's aggregate liability exceed the fees paid in the three months preceding the claim.",
      proposed_comment: "Compare the cap to house fallback language before accepting as-is.",
      proposed_redline: null,
      fallback_position_text:
        "Fallback is a 12-month fees cap with carve-outs for confidentiality, IP, and wilful misconduct.",
      status: "open",
      citations: [
        {
          document_id: "doc_vendor_msa",
          document_version_id: "dv_vendor_msa_v3",
          anchor_id: "anc_liability_cap",
          label: "Liability cap",
          quote: "In no event shall either party's aggregate liability exceed the fees paid in the three months preceding the claim.",
          page_start: null,
          page_end: null
        }
      ]
    }
  ],
  created_at: "2026-04-19T17:08:00Z",
  completed_at: "2026-04-19T17:08:14Z"
};

export const ask_run: AskRunRecord = {
  id: "ask_assignment_question",
  project_id: "project-maple-acquisition",
  document_version_id: "word-live-document",
  job_id: "job_ask_assignment_question",
  question: "Does this agreement allow assignment on a change of control?",
  source_toggles: {
    current_document: true,
    current_selection: true,
    uploaded_references: false,
    org_library: true,
    legal_sources: false,
    web_search: false
  },
  status: "succeeded",
  answer_type: "plain",
  answer_markdown:
    "The agreement appears to prohibit assignment without consent and does not include an express change-of-control carve-out. A buyer-side fallback would be an affiliate or internal reorganization exception.",
  citations: [
    assignment_citation,
    {
      document_id: "doc_library_msa",
      document_version_id: "dv_library_msa_2025",
      anchor_id: "anc_library_assignment",
      label: "Library precedent note",
      quote: "Recent Ontario customer MSAs typically permit affiliate transfers and internal reorganizations without consent.",
      page_start: null,
      page_end: null
    }
  ],
  created_at: "2026-04-19T17:09:00Z",
  completed_at: "2026-04-19T17:09:10Z"
};

export const draft_results = [
  {
    id: "lib_assignment_ontario_customer",
    title: "Customer MSA assignment clause with affiliate carve-out",
    subtitle: "Ontario | 2025 approved form",
    preview:
      "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets.",
    provenance: "Source: 2025 Customer MSA / Maple Software",
    adjusted_text:
      "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets, provided the assigning party remains liable for its obligations."
  },
  {
    id: "lib_assignment_affiliate_only",
    title: "Vendor paper fallback - affiliate only carve-out",
    subtitle: "Ontario | fallback position",
    preview:
      "Neither party may assign this Agreement without prior written consent, except to an affiliate as part of an internal reorganization.",
    provenance: "Source: fallback note / vendor paper playbook",
    adjusted_text:
      "Neither party may assign this Agreement without prior written consent, except to an affiliate as part of an internal reorganization, on prior written notice to the other party."
  }
];

export const draft_run: DraftRunRecord = {
  id: "drf_assignment_library",
  project_id: "project-maple-acquisition",
  document_version_id: "word-live-document",
  job_id: "job_drf_assignment_library",
  mode: "library",
  query: "assignment affiliate carve-out",
  instruction: null,
  status: "succeeded",
  generated_text:
    "Library-adjusted clause:\n\nNeither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets, provided the assigning party remains responsible for its obligations.",
  citations: [assignment_citation],
  library_matches: draft_results,
  created_at: "2026-04-19T17:10:00Z",
  completed_at: "2026-04-19T17:10:12Z"
};

export const playbooks = [
  {
    id: "pb_commercial_review_canada",
    name: "Commercial Review Canada",
    version: "v4",
    check_count: 38,
    summary: "General buyer-side commercial contract review for Ontario and Canada."
  },
  {
    id: "pb_vendor_paper_sweep",
    name: "Vendor Paper Sweep",
    version: "v2",
    check_count: 12,
    summary: "Fast risk screen for incoming vendor agreements."
  }
];

export const standards_result = {
  score: 73.5,
  missing_clauses: [
    {
      clause_id: "assignment-affiliate",
      title: "Affiliate transfer carve-out",
      severity: "high",
      explanation: "The selected clause does not include an affiliate or internal reorganization transfer right.",
      suggested_fix:
        "Add a carve-out permitting assignment to an affiliate or as part of an internal reorganization without consent.",
      fix_mode: "insert_after_selection"
    },
    {
      clause_id: "data-localization",
      title: "Data localization fallback",
      severity: "medium",
      explanation: "The current text does not include a Canada-based data residency fallback.",
      suggested_fix:
        "Add a fallback requiring customer data to remain in Canada or another approved Canadian-hosted environment.",
      fix_mode: "insert_after_selection"
    }
  ],
  weak_clauses: [
    {
      clause_id: "assignment-clause",
      title: "Assignment clause",
      action: "Replace selection",
      explanation: "The clause restricts assignment but does not clearly address change-of-control transfers.",
      suggested_fix:
        "Neither party may assign this Agreement without prior written consent, except to an affiliate or in connection with a merger, reorganization, or sale of substantially all assets.",
      severity: "high",
      fix_mode: "replace_selection",
      matched_excerpt:
        "Neither party may assign this Agreement without prior written consent of the other party."
    },
    {
      clause_id: "limitation-cap",
      title: "Limitation of liability",
      action: "Replace selection",
      explanation: "The clause uses liability language but does not define a clear cap structure.",
      suggested_fix:
        "Except for excluded claims, each party's aggregate liability under this Agreement will not exceed the fees paid or payable in the 12 months preceding the claim.",
      severity: "medium",
      fix_mode: "replace_selection",
      matched_excerpt: "The parties will be responsible for damages as provided under applicable law."
    }
  ]
};

export function list_review_suggestions(
  status: "all" | ReviewSuggestionRecord["status"],
  severity: "all" | ReviewSuggestionRecord["severity"]
) {
  return review_run.suggestions.filter((suggestion) => {
    if (status !== "all" && suggestion.status !== status) {
      return false;
    }

    if (severity !== "all" && suggestion.severity !== severity) {
      return false;
    }

    return true;
  });
}
