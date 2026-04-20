"use client";

import { useEffect, useDeferredValue, useState } from "react";
import type {
  AskRunCreateRequest,
  AskRunRecord,
  DraftRunCreateRequest,
  DraftRunRecord,
  PlaybookRecord,
  PlaybookSavedNoteRecord,
  SeverityLevel,
  ReviewRunCreateRequest,
  ReviewRunRecord,
  ReviewSuggestionRecord,
  ReviewSuggestionSaveToPlaybookRequest,
  StandardsFixMode,
  StandardsMissingClause,
  StandardsRunCreateRequest,
  StandardsRunRecord,
  StandardsTemplateRecord,
  StandardsWeakClause
} from "@skua/schemas";
import {
  ask_run,
  draft_run,
  draft_results,
  pane_context,
  playbooks,
  standards_result
} from "./mock-data";
import {
  apply_comment_to_selection,
  apply_redline_to_selection,
  get_word_selection_state,
  insert_text_after_selection,
  locate_quote_in_document,
  type WordSelectionState
} from "../lib/office";

type TabId = "review" | "ask" | "revise" | "saved" | "settings";
type SeverityFilter = "all" | ReviewSuggestionRecord["severity"];
type StatusFilter = "all" | ReviewSuggestionRecord["status"];
type TypeFilter = "all" | string;
type PlaybookSaveOptions = {
  playbook_id?: string | null;
  playbook_check_id?: string | null;
};
type StandardsClauseView = {
  clause_id: string;
  title: string;
  action: string;
  explanation: string;
  suggested_fix: string;
  severity: string;
  fix_mode: StandardsFixMode;
  matched_excerpt?: string | null;
};
type StandardsResultView = {
  score: number;
  missing_clauses: StandardsMissingClause[];
  weak_clauses: StandardsClauseView[];
};
type ReviewScopeMode = "selection" | "full_document";
type DraftMode = "library" | "instruction" | "improve";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "review", label: "Review" },
  { id: "ask", label: "Ask" },
  { id: "revise", label: "Revise" },
  { id: "saved", label: "Saved Clauses" },
  { id: "settings", label: "Settings" }
];

export function WordTaskPane({
  initialTab = "review",
  initialScope = "selection",
  initialAction = null,
  initialDraftMode = "library"
}: {
  initialTab?: TabId;
  initialScope?: ReviewScopeMode;
  initialAction?: "refresh_anchors" | "export_summary" | null;
  initialDraftMode?: DraftMode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
  const [draftQuery, setDraftQuery] = useState("assignment");
  const [draftMode, setDraftMode] = useState<DraftMode>(initialDraftMode);
  const [selectionState, setSelectionState] = useState<WordSelectionState | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewRun, setReviewRun] = useState<ReviewRunRecord | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [isRunningReview, setIsRunningReview] = useState(false);
  const [isRefreshingSelection, setIsRefreshingSelection] = useState(false);
  const [isRefreshingPlaybooks, setIsRefreshingPlaybooks] = useState(false);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [isLocatingAnchor, setIsLocatingAnchor] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const [livePlaybooks, setLivePlaybooks] = useState<PlaybookRecord[]>([]);
  const [savedPlaybookNotes, setSavedPlaybookNotes] = useState<PlaybookSavedNoteRecord[]>(
    []
  );
  const [reviewScope, setReviewScope] = useState<ReviewScopeMode>(initialScope);
  const [reviewType, setReviewType] =
    useState<ReviewRunCreateRequest["review_type"]>("general");
  const [reviewAudience, setReviewAudience] =
    useState<ReviewRunCreateRequest["audience"]>("internal");
  const [representedParty, setRepresentedParty] = useState(pane_context.represented_party);
  const [jurisdiction, setJurisdiction] = useState(pane_context.jurisdiction);
  const [dealContextInput, setDealContextInput] = useState(
    `${pane_context.project_name}, vendor paper`
  );
  const [selectedPlaybookIds, setSelectedPlaybookIds] = useState<string[]>([]);
  const [insertComments, setInsertComments] = useState(true);
  const [insertTrackedChanges, setInsertTrackedChanges] = useState(true);
  const [includeFallbackPosition, setIncludeFallbackPosition] = useState(true);
  const [severityThreshold, setSeverityThreshold] =
    useState<ReviewRunCreateRequest["markup_settings"]["severity_threshold"]>("medium");
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewStep, setReviewStep] = useState("Preparing review request");
  const [askQuestion, setAskQuestion] = useState(
    "Does this agreement allow assignment on a change of control?"
  );
  const [askAnswerType, setAskAnswerType] = useState<AskRunRecord["answer_type"]>("plain");
  const [askToggles, setAskToggles] = useState({
    current_document: true,
    current_selection: true,
    uploaded_references: false,
    org_library: true,
    legal_sources: false,
    web_search: false
  });
  const [askResult, setAskResult] = useState<AskRunRecord>(ask_run);
  const [askError, setAskError] = useState<string | null>(null);
  const [isRunningAsk, setIsRunningAsk] = useState(false);
  const [draftInstruction, setDraftInstruction] = useState(
    "Draft a buyer-side affiliate transfer carve-out for this assignment clause."
  );
  const [draftResult, setDraftResult] = useState<DraftRunRecord>(draft_run);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isRunningDraft, setIsRunningDraft] = useState(false);
  const [standardsTemplates, setStandardsTemplates] = useState<StandardsTemplateRecord[]>([]);
  const [selectedStandardsTemplateId, setSelectedStandardsTemplateId] = useState("");
  const [standardsRun, setStandardsRun] = useState<StandardsRunRecord | null>(null);
  const [standardsError, setStandardsError] = useState<string | null>(null);
  const [isRunningStandards, setIsRunningStandards] = useState(false);
  const deferredDraftQuery = useDeferredValue(draftQuery);

  useEffect(() => {
    async function loadSelection() {
      setIsRefreshingSelection(true);
      try {
        const next_state = await get_word_selection_state();
        setSelectionState(next_state);
        setSelectionError(null);
      } catch (error) {
        setSelectionError(
          error instanceof Error ? error.message : "Unable to connect to the Word host."
        );
      } finally {
        setIsRefreshingSelection(false);
      }
    }

    void loadSelection();
  }, []);

  useEffect(() => {
    void loadPlaybookData();
  }, []);

  useEffect(() => {
    void loadStandardsTemplates();
  }, []);

  useEffect(() => {
    if (selectedPlaybookIds.length === 0 && livePlaybooks.length > 0) {
      setSelectedPlaybookIds([livePlaybooks[0].name]);
    }
  }, [livePlaybooks, selectedPlaybookIds.length]);

  useEffect(() => {
    if (!selectedStandardsTemplateId && standardsTemplates.length > 0) {
      setSelectedStandardsTemplateId(standardsTemplates[0].id);
    }
  }, [selectedStandardsTemplateId, standardsTemplates]);

  useEffect(() => {
    if (initialAction === "refresh_anchors") {
      void refreshSelection("Selection refreshed from the ribbon.");
    }
  }, [initialAction]);

  useEffect(() => {
    if (initialAction === "export_summary" && reviewRun) {
      void handleExportSummary();
    }
  }, [initialAction, reviewRun]);

  const visibleSuggestions = (reviewRun?.suggestions ?? []).filter((suggestion) => {
    if (statusFilter !== "all" && suggestion.status !== statusFilter) {
      return false;
    }

    if (severityFilter !== "all" && suggestion.severity !== severityFilter) {
      return false;
    }

    if (typeFilter !== "all" && suggestion.issue_type !== typeFilter) {
      return false;
    }

    return true;
  });

  const selectedSuggestion =
    visibleSuggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ??
    visibleSuggestions[0] ??
    null;

  const query = deferredDraftQuery.trim().toLowerCase();
  const visibleDraftResults = !query
    ? (draftResult.library_matches.length > 0 ? draftResult.library_matches : draft_results)
    : (draftResult.library_matches.length > 0 ? draftResult.library_matches : draft_results).filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.preview.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query)
        );
      });

  const activeStandardsResult: StandardsResultView = standardsRun
    ? {
        score: standardsRun.coverage_score,
        missing_clauses: standardsRun.missing_clauses,
        weak_clauses: standardsRun.weak_clauses.map(mapStandardsWeakClauseToView)
      }
    : {
        score: standards_result.score,
        missing_clauses: standards_result.missing_clauses.map((clause) => ({
          clause_id: clause.clause_id,
          title: clause.title,
          severity: clause.severity as SeverityLevel,
          explanation: clause.explanation,
          suggested_fix: clause.suggested_fix,
          fix_mode: clause.fix_mode as StandardsFixMode
        })),
        weak_clauses: standards_result.weak_clauses as StandardsClauseView[]
      };

  useEffect(() => {
    if (!selectedSuggestionId && visibleSuggestions[0]) {
      setSelectedSuggestionId(visibleSuggestions[0].id);
    }

    if (
      selectedSuggestionId &&
      visibleSuggestions.length > 0 &&
      !visibleSuggestions.some((suggestion) => suggestion.id === selectedSuggestionId)
    ) {
      setSelectedSuggestionId(visibleSuggestions[0].id);
    }
  }, [selectedSuggestionId, visibleSuggestions]);

  async function refreshSelection(successMessage?: string | null) {
    setIsRefreshingSelection(true);
    try {
      const next_state = await get_word_selection_state();
      setSelectionState(next_state);
      setSelectionError(null);
      setActionMessage(successMessage ?? next_state.status_message);
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error.message : "Unable to refresh the Word selection."
      );
    } finally {
      setIsRefreshingSelection(false);
    }
  }

  async function loadPlaybookData() {
    setIsRefreshingPlaybooks(true);
    try {
      const [playbookResponse, noteResponse] = await Promise.all([
        fetch("/api/playbooks", {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }),
        fetch("/api/playbooks/saved-notes", {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        })
      ]);

      if (!playbookResponse.ok) {
        throw new Error(await extractErrorMessage(playbookResponse));
      }

      if (!noteResponse.ok) {
        throw new Error(await extractErrorMessage(noteResponse));
      }

      setLivePlaybooks((await playbookResponse.json()) as PlaybookRecord[]);
      setSavedPlaybookNotes((await noteResponse.json()) as PlaybookSavedNoteRecord[]);
      setPlaybookError(null);
    } catch (error) {
      setPlaybookError(
        error instanceof Error ? error.message : "Unable to load playbook data."
      );
    } finally {
      setIsRefreshingPlaybooks(false);
    }
  }

  async function loadStandardsTemplates() {
    try {
      const response = await fetch("/api/standards/templates", {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      setStandardsTemplates((await response.json()) as StandardsTemplateRecord[]);
      setStandardsError(null);
    } catch (error) {
      setStandardsError(
        error instanceof Error ? error.message : "Unable to load standards templates."
      );
    }
  }

  function togglePlaybookSelection(playbookId: string) {
    setSelectedPlaybookIds((current) => toggleValue(current, playbookId));
  }

  function handleRunPlaybook(playbookName: string) {
    setSelectedPlaybookIds([playbookName]);
    setActiveTab("review");
    setActionMessage(`Prepared Review with ${playbookName} selected.`);
  }

  async function handleExportPlaybook(playbook: {
    name: string;
    version: string;
    summary: string;
  }) {
    await navigator.clipboard.writeText(JSON.stringify(playbook, null, 2));
    setActionMessage(`Copied ${playbook.name} to the clipboard as JSON.`);
  }

  async function handleRunReview() {
    const reviewSourceText =
      reviewScope === "full_document"
        ? selectionState?.document_text.trim() ?? ""
        : selectionState?.selection_text.trim() ?? "";

    if (!reviewSourceText) {
      setReviewError(
        reviewScope === "full_document"
          ? "Unable to read the Word document body for a full-document review."
          : "Select clause text in Word before starting a live review run."
      );
      return;
    }

    setIsRunningReview(true);
    setReviewProgress(8);
    setReviewStep(
      reviewScope === "full_document"
        ? "Collecting the current Word document"
        : "Collecting the current Word selection"
    );
    setReviewError(null);

    try {
      await sleep(120);
      setReviewProgress(34);
      setReviewStep("Checking selected playbooks");

      const payload: ReviewRunCreateRequest = {
        project_id: "project-maple-acquisition",
        document_version_id: "word-live-document",
        scope: {
          mode: reviewScope,
          anchor: {
            type: "word_range",
            paragraph_id: "selection",
            char_start: 0,
            char_end: reviewSourceText.length,
            quote: reviewSourceText,
            quote_hash: null,
            ooxml_path: "/selection",
            page_number: null
          }
        },
        selection_text: reviewSourceText,
        selection_ooxml: selectionState?.selection_ooxml ?? null,
        review_type: reviewType,
        represented_party: representedParty,
        jurisdiction,
        audience: reviewAudience,
        deal_context: {
          project_name: pane_context.project_name,
          document_name: pane_context.document_name,
          matter_context: dealContextInput
        },
        markup_settings: {
          comments: insertComments,
          tracked_changes: insertTrackedChanges,
          fallback_position: includeFallbackPosition,
          severity_threshold: severityThreshold
        },
        playbook_ids: selectedPlaybookIds
      };

      const response = await fetch("/api/review-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      setReviewProgress(72);
      setReviewStep("Assembling suggestion cards");
      const nextRun = (await response.json()) as ReviewRunRecord;
      await sleep(120);
      setReviewProgress(100);
      setReviewStep("Review ready");
      syncReviewRunState(nextRun);
      setActionMessage(
        nextRun.suggestions.length > 0
          ? `Live review finished with ${nextRun.suggestions.length} suggestion(s).`
          : "Live review finished with no suggestions for the current selection."
      );
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to run the live review."
      );
    } finally {
      setIsRunningReview(false);
    }
  }

  async function handleExportSummary() {
    if (!reviewRun) {
      setReviewError("Run a review before exporting a summary to the project.");
      return;
    }

    setIsExportingSummary(true);
    try {
      const response = await fetch(
        `/api/review-runs/${reviewRun.id}/export-summary`,
        {
          method: "POST",
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const exportRecord = (await response.json()) as {
        id: string;
        exported_at: string;
        summary_markdown: string;
      };
      setActionMessage(
        `Exported review summary to the project at ${exportRecord.exported_at}.`
      );
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to export the review summary."
      );
    } finally {
      setIsExportingSummary(false);
    }
  }

  async function handleAsk() {
    const normalizedQuestion = askQuestion.trim();
    const askSourceText =
      askToggles.current_selection
        ? selectionState?.selection_text.trim() ?? ""
        : askToggles.current_document
          ? selectionState?.document_text.trim() ?? ""
          : "";

    if (!normalizedQuestion) {
      setAskError("Enter a question before running Ask.");
      return;
    }

    if (!askSourceText) {
      setAskError("Ask currently needs the active Word selection or document text.");
      return;
    }

    setIsRunningAsk(true);
    setAskError(null);
    try {
      const payload: AskRunCreateRequest = {
        project_id: "project-maple-acquisition",
        document_version_id: "word-live-document",
        selection_anchor_id: null,
        selection_text: askSourceText,
        selection_anchor: {
          type: "word_range",
          paragraph_id: "selection",
          char_start: 0,
          char_end: askSourceText.length,
          quote: askSourceText,
          quote_hash: null,
          ooxml_path: "/selection",
          page_number: null
        },
        question: normalizedQuestion,
        answer_type: askAnswerType,
        source_toggles: askToggles
      };

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      let nextAskRun = (await response.json()) as AskRunRecord;
      setAskResult(nextAskRun);

      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (nextAskRun.status !== "queued" && nextAskRun.status !== "running") {
          break;
        }

        await sleep(500);
        const pollResponse = await fetch(`/api/ask/${nextAskRun.id}`, {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        });

        if (!pollResponse.ok) {
          throw new Error(await extractErrorMessage(pollResponse));
        }

        nextAskRun = (await pollResponse.json()) as AskRunRecord;
        setAskResult(nextAskRun);
      }

      if (nextAskRun.status === "succeeded") {
        setActionMessage("Ask response completed with citations from the current source context.");
      } else {
        setActionMessage("Ask run queued. Start the local worker to complete it.");
      }
    } catch (error) {
      setAskError(
        error instanceof Error ? error.message : "Unable to run Ask."
      );
    } finally {
      setIsRunningAsk(false);
    }
  }

  function toggleAskSource(key: keyof typeof askToggles) {
    setAskToggles((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  async function handleDraftRun() {
    const draftSourceText = selectionState?.selection_text.trim() ?? "";
    const normalizedInstruction = draftInstruction.trim();
    const normalizedQuery = draftQuery.trim();

    if (draftMode === "instruction" && !normalizedInstruction) {
      setDraftError("Enter revision instructions before running Revise.");
      return;
    }

    if (draftMode !== "instruction" && !normalizedQuery && !draftSourceText) {
      setDraftError("Revise currently needs a saved-clause query or current clause text.");
      return;
    }

    setIsRunningDraft(true);
    setDraftError(null);
    try {
      const payload: DraftRunCreateRequest = {
        project_id: "project-maple-acquisition",
        document_version_id: "word-live-document",
        selection_text: draftSourceText || null,
        selection_anchor: draftSourceText
          ? {
              type: "word_range",
              paragraph_id: "selection",
              char_start: 0,
              char_end: draftSourceText.length,
              quote: draftSourceText,
              quote_hash: null,
              ooxml_path: "/selection",
              page_number: null
            }
          : null,
        mode: draftMode,
        query: normalizedQuery || null,
        instruction: normalizedInstruction || null
      };

      const response = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      let nextDraftRun = (await response.json()) as DraftRunRecord;
      setDraftResult(nextDraftRun);

      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (nextDraftRun.status !== "queued" && nextDraftRun.status !== "running") {
          break;
        }

        await sleep(500);
        const pollResponse = await fetch(`/api/draft/${nextDraftRun.id}`, {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        });

        if (!pollResponse.ok) {
          throw new Error(await extractErrorMessage(pollResponse));
        }

        nextDraftRun = (await pollResponse.json()) as DraftRunRecord;
        setDraftResult(nextDraftRun);
      }

      if (nextDraftRun.status === "succeeded") {
        setActionMessage("Revise completed with suggested language and citations.");
      } else {
        setActionMessage("Revise run queued. Start the local worker to complete it.");
      }
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Unable to run Revise."
      );
    } finally {
      setIsRunningDraft(false);
    }
  }

  async function handleStandardsRun() {
    const standardsSourceText = selectionState?.selection_text.trim() ?? "";

    if (!selectedStandardsTemplateId) {
      setStandardsError("Choose a standards template before running Compare to House Standard.");
      return;
    }

    if (!standardsSourceText) {
      setStandardsError("Select clause text in Word before running Standards.");
      return;
    }

    setIsRunningStandards(true);
    setStandardsError(null);
    try {
      const payload: StandardsRunCreateRequest = {
        project_id: reviewRun?.project_id ?? "project-maple-acquisition",
        document_version_id: reviewRun?.document_version_id ?? "word-live-document",
        standards_template_id: selectedStandardsTemplateId,
        selection_text: standardsSourceText,
        selection_anchor: {
          type: "word_range",
          paragraph_id: "selection",
          char_start: 0,
          char_end: standardsSourceText.length,
          quote: standardsSourceText,
          quote_hash: null,
          ooxml_path: "/selection",
          page_number: null
        }
      };

      const response = await fetch("/api/standards/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const nextStandardsRun = (await response.json()) as StandardsRunRecord;
      setStandardsRun(nextStandardsRun);
      setActionMessage("Standards comparison completed against the selected house standard.");
    } catch (error) {
      setStandardsError(
        error instanceof Error ? error.message : "Unable to run Standards."
      );
    } finally {
      setIsRunningStandards(false);
    }
  }

  async function handleLocateStandardsClause(
    clause: StandardsClauseView | StandardsMissingClause
  ) {
    const targetQuote =
      "matched_excerpt" in clause ? clause.matched_excerpt?.trim() : undefined;
    if (!targetQuote) {
      setActionMessage(
        "This finding does not have a matched excerpt yet. Run Standards on the specific clause you want to remediate."
      );
      return;
    }

    setIsLocatingAnchor(true);
    try {
      const result = await locate_quote_in_document(targetQuote);
      if (result.ok) {
        await refreshSelection(result.message);
        return;
      }

      setActionMessage(result.message);
    } catch (error) {
      setStandardsError(
        error instanceof Error ? error.message : "Unable to locate the standards clause in Word."
      );
    } finally {
      setIsLocatingAnchor(false);
    }
  }

  async function handleApplyStandardsFix(
    clause: StandardsClauseView | StandardsMissingClause
  ) {
    setIsApplyingAction(true);
    try {
      const result =
        clause.fix_mode === "insert_after_selection"
          ? await insert_text_after_selection(clause.suggested_fix)
          : await apply_redline_to_selection(clause.suggested_fix);

      setActionMessage(result.message);
      if (result.ok) {
        await refreshSelection(result.message);
      }
    } catch (error) {
      setStandardsError(
        error instanceof Error ? error.message : "Unable to apply the standards fix."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  async function handleInsertDraftText(text: string) {
    const result = await apply_redline_to_selection(text);
    setActionMessage(result.message);
  }

  async function handleCopyDraftText(text: string) {
    await navigator.clipboard.writeText(text);
    setActionMessage("Suggested language copied to the clipboard.");
  }

  function syncReviewRunState(nextRun: ReviewRunRecord) {
    setReviewRun(nextRun);
    setSelectedSuggestionId(nextRun.suggestions[0]?.id ?? "");
    setReviewError(null);
  }

  async function handleApplyComment(suggestion: ReviewSuggestionRecord) {
    setIsApplyingAction(true);
    try {
      const result = await apply_comment_to_selection(
        suggestion.proposed_comment ?? "Skua note"
      );
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }

      const response = await fetch(`/api/review-suggestions/${suggestion.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          mode: "comment",
          reviewer_note: suggestion.proposed_comment ?? null,
          client_application_result: result
        })
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const nextRun = (await response.json()) as ReviewRunRecord;
      syncReviewRunState(nextRun);
      await refreshSelection(result.message);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to persist the comment application."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  async function handleApplyRedline(suggestion: ReviewSuggestionRecord) {
    if (!suggestion.proposed_redline) {
      setActionMessage("This suggestion does not include a redline yet.");
      return;
    }

    setIsApplyingAction(true);
    try {
      const result = await apply_redline_to_selection(
        suggestion.proposed_redline.replacement_text
      );
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }

      const response = await fetch(`/api/review-suggestions/${suggestion.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          mode: "redline",
          reviewer_note: suggestion.proposed_redline.replacement_text,
          client_application_result: result
        })
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const nextRun = (await response.json()) as ReviewRunRecord;
      syncReviewRunState(nextRun);
      await refreshSelection(result.message);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to persist the redline application."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  async function handleLocateAnchor(suggestion: ReviewSuggestionRecord) {
    const targetQuote = resolveAnchorTargetQuote(suggestion);
    if (!targetQuote) {
      setActionMessage("No anchor text is available yet for this suggestion.");
      return;
    }

    setIsLocatingAnchor(true);
    try {
      const result = await locate_quote_in_document(targetQuote);
      if (result.ok) {
        await refreshSelection(result.message);
        return;
      }

      setActionMessage(result.message);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to locate the suggestion anchor."
      );
    } finally {
      setIsLocatingAnchor(false);
    }
  }

  async function handleSaveToPlaybook(
    suggestion: ReviewSuggestionRecord,
    options: PlaybookSaveOptions
  ) {
    setIsApplyingAction(true);
    try {
      const payload: ReviewSuggestionSaveToPlaybookRequest = {
        playbook_id: options.playbook_id ?? undefined,
        playbook_check_id: options.playbook_check_id ?? undefined,
        note:
          suggestion.fallback_position_text ??
          suggestion.proposed_comment ??
          suggestion.explanation
      };
      const response = await fetch(
        `/api/review-suggestions/${suggestion.id}/save-to-playbook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const nextRun = (await response.json()) as ReviewRunRecord;
      syncReviewRunState(nextRun);
      await loadPlaybookData();
      setActionMessage("Saved the suggestion note to clause memory.");
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to save the suggestion to a playbook."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  const visiblePlaybooks =
    livePlaybooks.length > 0 ? livePlaybooks.map(mapLivePlaybookToCard) : playbooks;

  async function handleDismissSuggestion(suggestion: ReviewSuggestionRecord) {
    setIsApplyingAction(true);
    try {
      const response = await fetch(`/api/review-suggestions/${suggestion.id}/dismiss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          reason: "Dismissed from the Word add-in task pane."
        })
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const nextRun = (await response.json()) as ReviewRunRecord;
      syncReviewRunState(nextRun);
      setActionMessage("Suggestion dismissed and persisted to the review run.");
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to dismiss the suggestion."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  async function handleMarkReviewed(suggestion: ReviewSuggestionRecord) {
    setIsApplyingAction(true);
    try {
      const response = await fetch(`/api/review-suggestions/${suggestion.id}/mark-reviewed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          note: "Reviewed in the Word add-in task pane."
        })
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const nextRun = (await response.json()) as ReviewRunRecord;
      syncReviewRunState(nextRun);
      setActionMessage("Suggestion marked reviewed and persisted to the review run.");
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to mark the suggestion reviewed."
      );
    } finally {
      setIsApplyingAction(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="context-strip">
        <div>
          <p className="eyebrow">Skua Contracts / Word Add-in</p>
          <h1>Shared-runtime scaffold</h1>
          <p className="context-copy">
            The pane is now aligned to the v1 product contract: review, ask, revise,
            saved clauses, and settings inside a Word-native workflow.
          </p>
        </div>
        <div className="ribbon-preview">
          <span>Open Pane</span>
          <span>Review</span>
          <span>Ask</span>
          <span>Revise</span>
        </div>
      </section>

      <section className="host-bar">
        <div className="host-card">
          <p className="section-label">Host status</p>
          <strong>
            {selectionState?.host_available ? "Connected to Word" : "Browser preview"}
          </strong>
          <p>
            {selectionState
              ? `${selectionState.host_name} / ${selectionState.platform_name}`
              : "Loading Office host details..."}
          </p>
        </div>
        <div className="host-card">
          <p className="section-label">Requirements</p>
          <strong>
            WordApi 1.4: {selectionState?.requirement_support.word_api_14 ? "yes" : "no"}
          </strong>
          <p>
            SharedRuntime 1.1:{" "}
            {selectionState?.requirement_support.shared_runtime_11 ? "yes" : "no"}
          </p>
        </div>
        <div className="host-card">
          <p className="section-label">Actions</p>
          <div className="action-row">
            <button disabled={isRefreshingSelection} onClick={() => void refreshSelection()} type="button">
              {isRefreshingSelection ? "Refreshing..." : "Refresh selection"}
            </button>
          </div>
        </div>
      </section>

      <section className="preview-stage">
        <div className="word-canvas">
          <div className="word-ruler" />
          <div className="word-page">
            <p className="doc-kicker">Vendor MSA / current Word selection</p>
            <h2>Selection snapshot</h2>
            <p>{selectionState?.selection_text ?? "Loading selection..."}</p>
            <p className="selection-chip">
              {selectionState?.change_tracking_mode
                ? `Track changes: ${selectionState.change_tracking_mode}`
                : "Track changes: unavailable in preview"}
            </p>
            <div className="selection-details">
              <span>OOXML captured</span>
              <strong>{selectionState?.selection_ooxml ? "Yes" : "No"}</strong>
            </div>
          </div>
        </div>

        <section className="pane-shell">
          <header className="pane-header">
            <div className="pane-title">
              <span className="app-badge">Skua</span>
              <div>
                <strong>{pane_context.project_name}</strong>
                <p>{pane_context.document_name}</p>
              </div>
            </div>
            <p className="meta-line">
              {pane_context.represented_party} | {pane_context.jurisdiction} |{" "}
              {pane_context.document_version} | {pane_context.status_label}
            </p>
          </header>

          <nav className="tab-row" aria-label="Word add-in tabs">
            {tabs.map((tab) => (
              <button
                className={tab.id === activeTab ? "tab-button active" : "tab-button"}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="banner">
            {activeTab === "review"
              ? "Using selection scope for a general review run."
              : activeTab === "ask"
                ? "Ask answers are citation-first and source-separated."
                : activeTab === "revise"
                  ? "Revise returns suggested language that stays separate from sourced facts."
                  : activeTab === "saved"
                    ? "Saved clauses are reusable fallback language and review memory."
                    : "Settings controls provider, billing, and support-side behavior."}
          </div>

          {selectionError ? <div className="inline-alert error">{selectionError}</div> : null}
          {selectionState?.status_message ? (
            <div className="inline-alert">{selectionState.status_message}</div>
          ) : null}
          {actionMessage ? <div className="inline-alert success">{actionMessage}</div> : null}

          <div className="pane-body">
            {activeTab === "review" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Review setup</p>
                    <h3>
                      {reviewRun?.summary?.total ?? 0} suggestions,{" "}
                      {reviewRun?.summary?.high ?? 0} high
                    </h3>
                  </div>
                  <span className="status-pill success">
                    {reviewRun?.status ?? "ready"}
                  </span>
                </div>

                <div className="run-panel">
                  <p>
                    Choose how to analyze this document, then inspect and apply the
                    returned suggestions.
                  </p>
                  <div className="filter-grid">
                    <label className="field">
                      <span>Review type</span>
                      <select
                        onChange={(event) =>
                          setReviewType(
                            event.target.value as ReviewRunCreateRequest["review_type"]
                          )
                        }
                        value={reviewType}
                      >
                        <option value="general">General</option>
                        <option value="negotiate">Negotiate</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Audience</span>
                      <select
                        onChange={(event) =>
                          setReviewAudience(
                            event.target.value as ReviewRunCreateRequest["audience"]
                          )
                        }
                        value={reviewAudience}
                      >
                        <option value="internal">Internal</option>
                        <option value="counterparty">Counterparty</option>
                      </select>
                    </label>
                  </div>
                  <div className="toggle-list">
                    <Toggle
                      checked={reviewScope === "full_document"}
                      label="Full document"
                      onChange={() => setReviewScope("full_document")}
                    />
                    <Toggle
                      checked={reviewScope === "selection"}
                      label="Current selection"
                      onChange={() => setReviewScope("selection")}
                    />
                  </div>
                  <div className="filter-grid">
                    <label className="field">
                      <span>Represented party</span>
                      <input
                        onChange={(event) => setRepresentedParty(event.target.value)}
                        value={representedParty}
                      />
                    </label>
                    <label className="field">
                      <span>Jurisdiction</span>
                      <input
                        onChange={(event) => setJurisdiction(event.target.value)}
                        value={jurisdiction}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Deal context</span>
                    <input
                      onChange={(event) => setDealContextInput(event.target.value)}
                      value={dealContextInput}
                    />
                  </label>
                  <div className="toggle-list">
                    <Toggle
                      checked={insertComments}
                      label="Insert comments"
                      onChange={() => setInsertComments((value) => !value)}
                    />
                    <Toggle
                      checked={insertTrackedChanges}
                      label="Suggest tracked changes"
                      onChange={() => setInsertTrackedChanges((value) => !value)}
                    />
                    <Toggle
                      checked={includeFallbackPosition}
                      label="Include fallback position"
                      onChange={() => setIncludeFallbackPosition((value) => !value)}
                    />
                  </div>
                  <div className="filter-grid">
                    <label className="field">
                      <span>Severity threshold</span>
                      <select
                        onChange={(event) =>
                          setSeverityThreshold(
                            event.target.value as ReviewRunCreateRequest["markup_settings"]["severity_threshold"]
                          )
                        }
                        value={severityThreshold}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </label>
                  </div>
                  <div className="playbook-picker">
                    <span className="section-label">Playbooks</span>
                    {livePlaybooks.map((playbook) => (
                      <label className="checkbox-row" key={playbook.name}>
                        <input
                          checked={selectedPlaybookIds.includes(playbook.name)}
                          onChange={() => togglePlaybookSelection(playbook.name)}
                          type="checkbox"
                        />
                        <span>{playbook.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="action-row">
                    <button
                      disabled={isRunningReview || isRefreshingSelection}
                      onClick={() => void handleRunReview()}
                      type="button"
                    >
                      {isRunningReview
                        ? "Running review..."
                        : reviewScope === "full_document"
                          ? "Run review on document"
                          : "Run review on selection"}
                    </button>
                    <button
                      className="ghost"
                      disabled={isExportingSummary || !reviewRun}
                      onClick={() => void handleExportSummary()}
                      type="button"
                    >
                      {isExportingSummary ? "Exporting..." : "Export to project"}
                    </button>
                    <button className="ghost" onClick={() => setReviewRun(null)} type="button">
                      Clear results
                    </button>
                  </div>
                </div>

                {reviewError ? <div className="inline-alert error">{reviewError}</div> : null}

                {isRunningReview ? (
                  <div className="progress-panel">
                    <div className="section-head compact">
                      <div>
                        <p className="section-label">Review running</p>
                        <strong>
                          {reviewType} review over{" "}
                          {reviewScope === "full_document" ? "document" : "selection"}
                        </strong>
                      </div>
                      <span>{reviewProgress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${reviewProgress}%` }} />
                    </div>
                    <p>{reviewStep}</p>
                    <p className="muted-copy">
                      High: {reviewRun?.summary?.high ?? 0} Medium:{" "}
                      {reviewRun?.summary?.medium ?? 0} Low: {reviewRun?.summary?.low ?? 0}
                    </p>
                  </div>
                ) : null}

                <div className="filter-grid">
                  <label className="field">
                    <span>Status</span>
                    <select
                      onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                      value={statusFilter}
                    >
                      <option value="all">All</option>
                      <option value="open">Open</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="applied_comment">Applied comment</option>
                      <option value="applied_redline">Applied redline</option>
                      <option value="saved_to_playbook">Saved to playbook</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Severity</span>
                    <select
                      onChange={(event) =>
                        setSeverityFilter(event.target.value as SeverityFilter)
                      }
                      value={severityFilter}
                    >
                      <option value="all">All</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Type</span>
                    <select
                      onChange={(event) => setTypeFilter(event.target.value)}
                      value={typeFilter}
                    >
                      <option value="all">All</option>
                      {Array.from(
                        new Set((reviewRun?.suggestions ?? []).map((suggestion) => suggestion.issue_type))
                      ).map((issueType) => (
                        <option key={issueType} value={issueType}>
                          {issueType.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="suggestion-list">
                  {visibleSuggestions.length > 0 ? (
                    visibleSuggestions.map((suggestion) => (
                      <article
                        className={
                          suggestion.id === selectedSuggestion?.id
                            ? "suggestion-card selected"
                            : "suggestion-card"
                        }
                        key={suggestion.id}
                      >
                        <button
                          className="card-button"
                          onClick={() => setSelectedSuggestionId(suggestion.id)}
                          type="button"
                        >
                        <span className={`severity-chip ${suggestion.severity}`}>
                          {suggestion.severity}
                        </span>
                        <strong>{suggestion.title}</strong>
                        <p>{suggestion.supporting_excerpt}</p>
                        <div className="card-meta">
                          <span>{suggestion.issue_type.replaceAll("_", " ")}</span>
                          <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
                        </div>
                        </button>
                        <div className="mini-actions">
                          <button
                            className="ghost"
                            onClick={() => void handleLocateAnchor(suggestion)}
                            type="button"
                          >
                            Jump
                          </button>
                          <button
                            className="ghost"
                            onClick={() => setSelectedSuggestionId(suggestion.id)}
                            type="button"
                          >
                            Review
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      Run a live review to populate suggestion cards from the API.
                    </div>
                  )}
                </div>

                {selectedSuggestion ? (
                  <SuggestionDetail
                    availablePlaybooks={livePlaybooks}
                    isApplyingAction={isApplyingAction}
                    isLocatingAnchor={isLocatingAnchor}
                    onLocateAnchor={handleLocateAnchor}
                    onApplyComment={handleApplyComment}
                    onDismiss={handleDismissSuggestion}
                    onMarkReviewed={handleMarkReviewed}
                    onApplyRedline={handleApplyRedline}
                    onSaveToPlaybook={handleSaveToPlaybook}
                    selectionText={selectionState?.selection_text ?? ""}
                    suggestion={selectedSuggestion}
                  />
                ) : (
                  <div className="empty-state">No suggestions match the current filters.</div>
                )}
              </section>
            ) : null}

            {activeTab === "ask" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Ask</p>
                    <h3>Current document + current selection + library</h3>
                  </div>
                  <span className="status-pill">{askResult.status}</span>
                </div>

                <div className="toggle-list">
                  <Toggle
                    checked={askToggles.current_document}
                    label="Current document"
                    onChange={() => toggleAskSource("current_document")}
                  />
                  <Toggle
                    checked={askToggles.current_selection}
                    label="Current selection"
                    onChange={() => toggleAskSource("current_selection")}
                  />
                  <Toggle
                    checked={askToggles.uploaded_references}
                    label="Uploaded references"
                    onChange={() => toggleAskSource("uploaded_references")}
                  />
                  <Toggle
                    checked={askToggles.org_library}
                    label="Org library"
                    onChange={() => toggleAskSource("org_library")}
                  />
                  <Toggle
                    checked={askToggles.legal_sources}
                    label="Legal sources"
                    onChange={() => toggleAskSource("legal_sources")}
                  />
                  <Toggle
                    checked={askToggles.web_search}
                    label="Web search"
                    onChange={() => toggleAskSource("web_search")}
                  />
                </div>

                <label className="field">
                  <span>Question</span>
                  <textarea onChange={(event) => setAskQuestion(event.target.value)} value={askQuestion} />
                </label>

                <label className="field">
                  <span>Answer format</span>
                  <select
                    onChange={(event) =>
                      setAskAnswerType(event.target.value as AskRunRecord["answer_type"])
                    }
                    value={askAnswerType}
                  >
                    <option value="plain">Plain answer</option>
                    <option value="clause">Clause draft</option>
                    <option value="checklist">Checklist</option>
                    <option value="issue_list">Issue list</option>
                    <option value="comparison_table">Comparison table</option>
                    <option value="memo">Memo</option>
                  </select>
                </label>

                {askError ? <div className="inline-alert error">{askError}</div> : null}

                <div className="action-row">
                  <button disabled={isRunningAsk} onClick={() => void handleAsk()} type="button">
                    {isRunningAsk ? "Running Ask..." : "Ask"}
                  </button>
                </div>

                <div className="answer-card">
                  <p className="section-label">Answer</p>
                  <p>{askResult.answer_markdown}</p>
                </div>

                <div className="citation-block">
                  <p className="section-label">Citations</p>
                  {askResult.citations.map((citation) => (
                    <div className="citation-row" key={citation.anchor_id}>
                      <strong>{citation.label}</strong>
                      <p>{citation.quote}</p>
                    </div>
                  ))}
                </div>

                <div className="action-row">
                  <button type="button">Turn into clause</button>
                  <button className="ghost" type="button">
                    Copy to memo
                  </button>
                </div>
              </section>
            ) : null}

            {activeTab === "revise" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Revise clause</p>
                    <h3>Suggested language with clause context</h3>
                  </div>
                  <span className="status-pill">{draftResult.status}</span>
                </div>

                <div className="toggle-list">
                  <Toggle
                    checked={draftMode === "library"}
                    label="Use saved language"
                    onChange={() => setDraftMode("library")}
                  />
                  <Toggle
                    checked={draftMode === "instruction"}
                    label="Follow instruction"
                    onChange={() => setDraftMode("instruction")}
                  />
                  <Toggle
                    checked={draftMode === "improve"}
                    label="Improve clause"
                    onChange={() => setDraftMode("improve")}
                  />
                </div>

                {draftMode === "instruction" ? (
                  <label className="field">
                    <span>Instruction</span>
                    <textarea
                      onChange={(event) => setDraftInstruction(event.target.value)}
                      value={draftInstruction}
                    />
                  </label>
                ) : null}

                <label className="field">
                  <span>Saved clause search</span>
                  <input
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="assignment clause affiliate carve-out"
                    value={draftQuery}
                  />
                </label>

                {draftError ? <div className="inline-alert error">{draftError}</div> : null}

                <div className="action-row">
                  <button disabled={isRunningDraft} onClick={() => void handleDraftRun()} type="button">
                    {isRunningDraft ? "Running revise..." : "Generate suggested language"}
                  </button>
                </div>

                <div className="answer-card">
                  <p className="section-label">Suggested language</p>
                  <p>{draftResult.generated_text || "Run Revise to generate suggested language."}</p>
                </div>

                {draftResult.citations.length > 0 ? (
                  <div className="citation-block">
                    <p className="section-label">Citations</p>
                    {draftResult.citations.map((citation) => (
                      <div className="citation-row" key={citation.anchor_id}>
                        <strong>{citation.label}</strong>
                        <p>{citation.quote}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="result-list">
                  {visibleDraftResults.map((item, index) => (
                    <article className="result-card" key={item.id}>
                      <div className="section-head compact">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.subtitle}</p>
                        </div>
                        <span className="rank-pill">#{index + 1}</span>
                      </div>
                      <p>{item.preview}</p>
                      <p className="muted-copy">{item.provenance}</p>
                      <div className="draft-box">
                        <span>Adjusted draft</span>
                        <p>{item.adjusted_text}</p>
                      </div>
                      <div className="action-row">
                        <button
                          onClick={() =>
                            void handleInsertDraftText(
                              draftResult.status === "succeeded"
                                ? draftResult.generated_text
                                : draftMode === "instruction"
                                  ? draftInstruction
                                  : item.adjusted_text
                            )
                          }
                          type="button"
                        >
                          Replace selection
                        </button>
                        <button
                          className="ghost"
                          onClick={() =>
                            void handleCopyDraftText(
                              draftResult.status === "succeeded"
                                ? draftResult.generated_text
                                : draftMode === "instruction"
                                  ? draftInstruction
                                  : item.adjusted_text
                            )
                          }
                          type="button"
                        >
                          Copy language
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab === "saved" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Saved clauses</p>
                    <h3>Reusable fallback language</h3>
                  </div>
                  <div className="action-row">
                    <button
                      className="ghost"
                      disabled={isRefreshingPlaybooks}
                      onClick={() => void loadPlaybookData()}
                      type="button"
                    >
                      {isRefreshingPlaybooks ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                </div>

                {playbookError ? <div className="inline-alert error">{playbookError}</div> : null}

                {savedPlaybookNotes.length > 0 ? (
                  <div className="saved-notes-panel">
                    <div className="section-head compact">
                      <div>
                        <p className="section-label">Recent saved clauses</p>
                        <strong>{savedPlaybookNotes.length} saved note(s)</strong>
                      </div>
                    </div>
                    <div className="saved-note-list">
                      {savedPlaybookNotes.slice(0, 5).map((note) => (
                        <article className="saved-note-card" key={note.id}>
                          <div className="section-head compact">
                            <div>
                              <strong>{note.title}</strong>
                              <p>
                                {note.playbook_id}
                                {note.playbook_check_id
                                  ? ` / ${note.playbook_check_id}`
                                  : " / general note"}{" "}
                                | {note.created_at}
                              </p>
                            </div>
                            <span className={`severity-chip ${note.severity}`}>
                              {note.severity}
                            </span>
                          </div>
                          <p>{note.note}</p>
                          <blockquote>{note.supporting_excerpt}</blockquote>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    Saved clause notes will appear here after you capture them from a
                    review finding.
                  </div>
                )}

                {visiblePlaybooks.map((playbook) => (
                  <article className="playbook-card" key={playbook.id}>
                    <div className="section-head compact">
                      <div>
                        <strong>{playbook.name}</strong>
                        <p>
                          {playbook.version} | {playbook.check_count} starter checks
                        </p>
                      </div>
                      <span className="status-pill">Ready</span>
                    </div>
                    <p>{playbook.summary}</p>
                    {"checks" in playbook && Array.isArray(playbook.checks) ? (
                      <div className="playbook-check-list">
                        {playbook.checks.slice(0, 3).map((check) => (
                          <div className="citation-row" key={check.id}>
                            <strong>{check.label}</strong>
                            <p>{check.question}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="action-row">
                      <button onClick={() => handleRunPlaybook(playbook.name)} type="button">
                        Use in review
                      </button>
                      <button
                        className="ghost"
                        onClick={() => void handleExportPlaybook(playbook)}
                        type="button"
                      >
                        Copy JSON
                      </button>
                    </div>
                  </article>
                ))}

                <div className="import-panel">
                  <strong>Clause bank direction</strong>
                  <p>
                    The saved-clause surface is backed by captured review notes today and will
                    evolve into first-class clause-bank CRUD in the next slice.
                  </p>
                </div>
              </section>
            ) : null}

            {activeTab === "settings" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Settings</p>
                    <h3>Providers, billing, and support controls</h3>
                  </div>
                </div>
                <div className="bullet-panel">
                  <p className="section-label">Workspace</p>
                  <div className="clause-row">
                    <div className="stack-inline">
                      <span>Current workspace</span>
                      <small>{pane_context.project_name}</small>
                    </div>
                  </div>
                  <div className="clause-row">
                    <div className="stack-inline">
                      <span>Document</span>
                      <small>{pane_context.document_name}</small>
                    </div>
                  </div>
                </div>

                <div className="bullet-panel">
                  <p className="section-label">Provider mode</p>
                  <div className="clause-row">
                    <div className="stack-inline">
                      <span>Default mode</span>
                      <small>Hosted provider mode is assumed until BYOK lands.</small>
                    </div>
                  </div>
                  <div className="clause-row">
                    <div className="stack-inline">
                      <span>API base URL</span>
                      <small>
                        {process.env.NEXT_PUBLIC_SKUA_API_BASE_URL ??
                          process.env.SKUA_API_BASE_URL ??
                          "http://127.0.0.1:8000"}
                      </small>
                    </div>
                  </div>
                </div>

                <div className="bullet-panel">
                  <p className="section-label">Cost control</p>
                  <div className="clause-row">
                    <div className="stack-inline">
                      <span>Current state</span>
                      <small>
                        Usage ledger, spend caps, billing warnings, and deletion controls are
                        part of the next execution slice.
                      </small>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function SuggestionDetail({
  availablePlaybooks,
  suggestion,
  onApplyComment,
  onApplyRedline,
  onDismiss,
  onMarkReviewed,
  onLocateAnchor,
  onSaveToPlaybook,
  isApplyingAction,
  isLocatingAnchor,
  selectionText
}: {
  availablePlaybooks: PlaybookRecord[];
  suggestion: ReviewSuggestionRecord;
  onApplyComment: (suggestion: ReviewSuggestionRecord) => Promise<void>;
  onApplyRedline: (suggestion: ReviewSuggestionRecord) => Promise<void>;
  onDismiss: (suggestion: ReviewSuggestionRecord) => Promise<void>;
  onMarkReviewed: (suggestion: ReviewSuggestionRecord) => Promise<void>;
  onLocateAnchor: (suggestion: ReviewSuggestionRecord) => Promise<void>;
  onSaveToPlaybook: (
    suggestion: ReviewSuggestionRecord,
    options: PlaybookSaveOptions
  ) => Promise<void>;
  isApplyingAction: boolean;
  isLocatingAnchor: boolean;
  selectionText: string;
}) {
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("");
  const [selectedCheckId, setSelectedCheckId] = useState("");
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);

  const anchorTargetQuote = resolveAnchorTargetQuote(suggestion);
  const selectionAssessment = buildSelectionAssessment(selectionText, suggestion);
  const anchorActionLabel = buildAnchorActionLabel(suggestion);
  const reconciliationGuidance = buildReconciliationGuidance(
    suggestion.anchor_reconciliation_status
  );
  const selectedPlaybook =
    availablePlaybooks.find((playbook) => playbook.name === selectedPlaybookId) ?? null;
  const availableChecks = selectedPlaybook?.checks ?? [];

  useEffect(() => {
    const nextPlaybookId = resolveSuggestedPlaybookId(availablePlaybooks, suggestion);
    setSelectedPlaybookId(nextPlaybookId);
  }, [availablePlaybooks, suggestion]);

  useEffect(() => {
    const nextCheckId = resolveSuggestedCheckId(availableChecks, suggestion);
    setSelectedCheckId(nextCheckId);
  }, [availableChecks, suggestion]);

  return (
    <article className="detail-card">
      <div className="section-head">
        <div>
          <p className="section-label">Suggestion detail</p>
          <h3>{suggestion.title}</h3>
        </div>
        <span className={`severity-chip ${suggestion.severity}`}>{suggestion.severity}</span>
      </div>

      <div className="detail-section">
        <span>Why this matters</span>
        <p>{suggestion.explanation}</p>
      </div>

      <div className="detail-section">
        <span>Source excerpt</span>
        <blockquote>{suggestion.supporting_excerpt}</blockquote>
        <div className="action-row">
          <button
            className="ghost"
            disabled={isLocatingAnchor}
            onClick={() => void onLocateAnchor(suggestion)}
            type="button"
          >
            Jump to source
          </button>
        </div>
      </div>

      {suggestion.proposed_comment ? (
        <div className="detail-section">
          <span>Proposed comment</span>
          <p>{suggestion.proposed_comment}</p>
        </div>
      ) : null}

      {suggestion.proposed_redline ? (
        <div className="detail-section">
          <span>Proposed redline</span>
          <p>{suggestion.proposed_redline.replacement_text}</p>
        </div>
      ) : null}

      {suggestion.fallback_position_text ? (
        <div className="detail-section">
          <span>Fallback position</span>
          <p>{suggestion.fallback_position_text}</p>
        </div>
      ) : null}

      <div className="citation-block">
        <p className="section-label">Citations</p>
        {suggestion.citations.map((citation) => (
          <div className="citation-row" key={citation.anchor_id}>
            <strong>{citation.label}</strong>
            <p>{citation.quote}</p>
          </div>
        ))}
      </div>

      {suggestion.reviewer_note ? (
        <div className="detail-section">
          <span>Reviewer note</span>
          <p>{suggestion.reviewer_note}</p>
        </div>
      ) : null}

      {suggestion.anchor_reconciliation_status ? (
        <div className="detail-section">
          <span>Anchor reconciliation</span>
          <div
            className={`reconciliation-card reconciliation-${suggestion.anchor_reconciliation_status}`}
          >
            <strong>{suggestion.anchor_reconciliation_status}</strong>
            <p>
              {suggestion.anchor_reconciliation_note ??
                "No reconciliation note was recorded."}
            </p>
            {reconciliationGuidance ? <p>{reconciliationGuidance}</p> : null}
          </div>
        </div>
      ) : null}

      {selectionAssessment ? (
        <div className="detail-section">
          <span>Current selection check</span>
          <div
            className={`reconciliation-card reconciliation-${selectionAssessment.status}`}
          >
            <strong>{selectionAssessment.label}</strong>
            <p>{selectionAssessment.detail}</p>
          </div>
        </div>
      ) : null}

      {suggestion.latest_anchor?.quote ? (
        <div className="detail-section">
          <span>Latest anchor snapshot</span>
          <blockquote>{suggestion.latest_anchor.quote}</blockquote>
        </div>
      ) : null}

      {suggestion.events && suggestion.events.length > 0 ? (
        <div className="detail-section">
          <span>Action history</span>
          <div className="event-list">
            {suggestion.events.map((event) => (
              <div className="event-card" key={event.id}>
                <strong>{event.action.replaceAll("_", " ")}</strong>
                <p>{event.note ?? event.client_message ?? "No extra note recorded."}</p>
                {event.applied_anchor?.quote ? (
                  <blockquote>{event.applied_anchor.quote}</blockquote>
                ) : null}
                <p className="muted-copy">{event.created_at}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {anchorTargetQuote ? (
        <div className="detail-section">
          <span>Anchor recovery</span>
          <div className="recovery-panel">
            <p>
              Jump Word to the closest matching clause when the current selection no
              longer lines up with this suggestion.
            </p>
            <div className="action-row">
              <button
                className={
                  suggestion.anchor_reconciliation_status === "drifted" ? "" : "ghost"
                }
                disabled={isApplyingAction || isLocatingAnchor}
                onClick={() => void onLocateAnchor(suggestion)}
                type="button"
              >
                {isLocatingAnchor ? "Locating..." : anchorActionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {availablePlaybooks.length > 0 && (isSaveFormOpen || Boolean(suggestion.saved_playbook_id)) ? (
        <div className="detail-section">
          <span>Playbook capture</span>
          <div className="capture-panel">
            <label className="field">
              <span>Target playbook</span>
              <select
                onChange={(event) => setSelectedPlaybookId(event.target.value)}
                value={selectedPlaybookId}
              >
                {availablePlaybooks.map((playbook) => (
                  <option key={playbook.name} value={playbook.name}>
                    {playbook.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Target check</span>
              <select
                onChange={(event) => setSelectedCheckId(event.target.value)}
                value={selectedCheckId}
              >
                <option value="">General note</option>
                {availableChecks.map((check) => (
                  <option key={check.id} value={check.id}>
                    {check.label}
                  </option>
                ))}
              </select>
            </label>

            {suggestion.saved_playbook_id ? (
              <p className="muted-copy">
                Saved target: {suggestion.saved_playbook_id}
                {suggestion.saved_playbook_check_id
                  ? ` / ${suggestion.saved_playbook_check_id}`
                  : " / general note"}
              </p>
            ) : null}
            <div className="action-row">
              <button
                onClick={() =>
                  void onSaveToPlaybook(suggestion, {
                    playbook_id: selectedPlaybookId || null,
                    playbook_check_id: selectedCheckId || null
                  })
                }
                type="button"
              >
                Save capture
              </button>
              <button
                className="ghost"
                onClick={() => setIsSaveFormOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="action-row">
        <button
          disabled={isApplyingAction || !suggestion.proposed_comment}
          onClick={() => void onApplyComment(suggestion)}
          type="button"
        >
          {isApplyingAction ? "Applying..." : "Apply comment"}
        </button>
        <button
          disabled={isApplyingAction || !suggestion.proposed_redline}
          onClick={() => void onApplyRedline(suggestion)}
          type="button"
        >
          {isApplyingAction ? "Applying..." : "Apply redline"}
        </button>
      </div>
      <div className="action-row">
        <button
          className="ghost"
          disabled={isApplyingAction}
          onClick={() => void onMarkReviewed(suggestion)}
          type="button"
        >
          Mark reviewed
        </button>
        <button
          className="ghost"
          disabled={isApplyingAction}
          onClick={() => setIsSaveFormOpen((current) => !current)}
          type="button"
        >
          {isSaveFormOpen ? "Hide playbook form" : "Save to playbook"}
        </button>
        <button
          className="ghost"
          disabled={isApplyingAction}
          onClick={() => void onDismiss(suggestion)}
          type="button"
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange?: () => void;
}) {
  return (
    <button className="toggle-row" onClick={onChange} type="button">
      <span>{label}</span>
      <span className={checked ? "toggle on" : "toggle"}>{checked ? "On" : "Off"}</span>
    </button>
  );
}

async function extractErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

function resolveAnchorTargetQuote(suggestion: ReviewSuggestionRecord) {
  return (
    suggestion.latest_anchor?.quote?.trim() ||
    suggestion.supporting_excerpt.trim() ||
    suggestion.citations[0]?.quote?.trim() ||
    ""
  );
}

function buildAnchorActionLabel(suggestion: ReviewSuggestionRecord) {
  if (suggestion.anchor_reconciliation_status === "updated") {
    return "Locate revised clause";
  }

  if (suggestion.anchor_reconciliation_status === "drifted") {
    return "Locate likely clause";
  }

  return "Locate anchor";
}

function buildReconciliationGuidance(status?: ReviewSuggestionRecord["anchor_reconciliation_status"]) {
  if (status === "drifted") {
    return "The stored anchor no longer looks close to the original clause. Locate the likely clause in Word before you rerun review or apply another edit.";
  }

  if (status === "updated") {
    return "The clause text changed after application. Locate the revised clause if you want to inspect the latest language in Word.";
  }

  if (status === "unknown") {
    return "Word did not return enough post-apply context to verify the anchor. Refresh the selection or locate the clause if you need to confirm the exact range.";
  }

  return null;
}

function buildSelectionAssessment(
  selectionText: string,
  suggestion: ReviewSuggestionRecord
) {
  const normalizedSelection = normalizeComparisonText(selectionText);
  const normalizedTarget = normalizeComparisonText(resolveAnchorTargetQuote(suggestion));

  if (!normalizedSelection || !normalizedTarget) {
    return null;
  }

  if (normalizedSelection === normalizedTarget) {
    return {
      status: "stable" as const,
      label: "Current selection is aligned",
      detail: "The text currently selected in Word matches the stored clause closely."
    };
  }

  const overlap = calculateTokenOverlap(normalizedSelection, normalizedTarget);
  if (overlap >= 0.8) {
    return {
      status: "stable" as const,
      label: "Current selection is aligned",
      detail: "The text currently selected in Word is still a close match for this suggestion."
    };
  }

  if (overlap >= 0.4) {
    return {
      status: "updated" as const,
      label: "Current selection is near the clause",
      detail:
        "The live selection overlaps with the stored anchor, but the wording has shifted. A rerun would use the updated text."
    };
  }

  return {
    status: "drifted" as const,
    label: "Current selection has drifted",
    detail:
      "The live Word selection no longer looks like this suggestion's clause. Use Locate likely clause to jump back to the closest match."
  };
}

function calculateTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function normalizeComparisonText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapLivePlaybookToCard(playbook: PlaybookRecord) {
  return {
    id: playbook.name,
    name: playbook.name,
    version: playbook.version,
    check_count: playbook.checks.length,
    summary: playbook.description
  };
}

function mapStandardsWeakClauseToView(clause: StandardsWeakClause): StandardsClauseView {
  return {
    clause_id: clause.clause_id,
    title: clause.title,
    action: describeStandardsFixAction(clause.fix_mode),
    explanation: clause.explanation,
    suggested_fix: clause.suggested_fix,
    severity: clause.severity,
    fix_mode: clause.fix_mode,
    matched_excerpt: clause.matched_excerpt ?? null
  };
}

function describeStandardsFixAction(fix_mode: StandardsFixMode) {
  return fix_mode === "insert_after_selection" ? "Insert fallback" : "Replace selection";
}

function toggleValue(list: string[], nextValue: string) {
  return list.includes(nextValue)
    ? list.filter((value) => value !== nextValue)
    : [...list, nextValue];
}

function sleep(duration_ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration_ms);
  });
}

function resolveSuggestedPlaybookId(
  playbooks: PlaybookRecord[],
  suggestion: ReviewSuggestionRecord
) {
  if (suggestion.saved_playbook_id) {
    return suggestion.saved_playbook_id;
  }

  return playbooks[0]?.name ?? "";
}

function resolveSuggestedCheckId(
  checks: PlaybookRecord["checks"],
  suggestion: ReviewSuggestionRecord
) {
  if (suggestion.saved_playbook_check_id) {
    return suggestion.saved_playbook_check_id;
  }

  const issueType = suggestion.issue_type.toLowerCase();
  const matchingCheck = checks.find((check) => check.id.toLowerCase() === issueType);
  return matchingCheck?.id ?? "";
}
