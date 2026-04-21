"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthTokenResponse,
  PlatformAskRunRecord,
  PlatformClauseBankEntryCreateRequest,
  PlatformClauseBankEntryRecord,
  PlatformClauseBankEntryUpdateRequest,
  PlatformDocumentIngestRecord,
  PlatformDocumentVersionRecord,
  PlatformMatterRecord,
  PlatformPlaybookRecord,
  PlatformApplyEventCreateRequest,
  PlatformPreferenceSignalCreateRequest,
  PlatformReviewCitationRecord,
  PlatformReviewFindingRecord,
  PlatformReviewRunRecord,
  PlatformReviseRunRecord,
  PlatformSpendEstimateRecord,
  PlatformTrustRecord,
  PlatformUsageSummaryRecord,
  PlatformUserRecord,
  PlatformWorkspaceRecord,
  ProviderConfigCreateRequest,
  ProviderConfigRecord
} from "@skua/schemas";
import {
  apply_comment_to_selection,
  apply_redline_to_selection,
  get_word_selection_state,
  insert_text_after_selection,
  locate_quote_in_document,
  type WordSelectionState,
  undo_last_word_action
} from "../lib/office";

type TabId = "review" | "ask" | "revise" | "saved" | "settings";
type SyncScope = "full_document" | "selection";
type SessionMode = "login" | "register";
type LocalFindingStatus =
  | "open"
  | "applied_comment"
  | "applied_redline"
  | "saved_clause"
  | "dismissed";

type ClauseBankFormState = {
  contract_type: string;
  issue_type: string;
  represented_party: string;
  title: string;
  text: string;
};

type StoredDocumentSession = {
  identity: string;
  full_document_hash?: string | null;
  full_document_version?: PlatformDocumentVersionRecord | null;
  selection_hash?: string | null;
  selection_version?: PlatformDocumentVersionRecord | null;
  last_sync_scope?: SyncScope | null;
  last_synced_at?: string | null;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "review", label: "Review" },
  { id: "ask", label: "Ask" },
  { id: "revise", label: "Revise" },
  { id: "saved", label: "Saved Clauses" },
  { id: "settings", label: "Settings" }
];

const workspace_storage_key = "skua-word-active-workspace";
const default_provider_policy = '{\n  "review": "gpt-5.4-mini",\n  "ask": "gpt-5.4-mini",\n  "revise": "gpt-5.4-mini",\n  "monthly_warning_usd": 25,\n  "monthly_hard_cap_usd": 100,\n  "per_run_max_estimate_usd": 5\n}';
const supported_contract_types = [
  { value: "saas_agreement", label: "SaaS agreement" },
  { value: "services_agreement", label: "Services agreement" },
  { value: "nda", label: "NDA" }
];

export function WordTaskPane({
  initialTab = "review",
  initialScope = "selection"
}: {
  initialTab?: TabId;
  initialScope?: "selection" | "full_document";
}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [selectionState, setSelectionState] = useState<WordSelectionState | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRefreshingSelection, setIsRefreshingSelection] = useState(false);

  const [sessionMode, setSessionMode] = useState<SessionMode>("login");
  const [authForm, setAuthForm] = useState<AuthRegisterRequest>({
    email: "",
    password: "",
    full_name: ""
  });
  const [sessionUser, setSessionUser] = useState<PlatformUserRecord | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [workspaces, setWorkspaces] = useState<PlatformWorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [isLoadingWorkspaceData, setIsLoadingWorkspaceData] = useState(false);
  const [playbooks, setPlaybooks] = useState<PlatformPlaybookRecord[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("");
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigRecord[]>([]);
  const [providerForm, setProviderForm] = useState<ProviderConfigCreateRequest>({
    workspace_id: "",
    provider_name: "openai",
    encrypted_secret: "",
    model_policy: {
      review: "gpt-5.4-mini",
      ask: "gpt-5.4-mini",
      revise: "gpt-5.4-mini"
    }
  });
  const [providerPolicyInput, setProviderPolicyInput] = useState(default_provider_policy);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [billingSummary, setBillingSummary] = useState<PlatformUsageSummaryRecord | null>(null);
  const [trustProfile, setTrustProfile] = useState<PlatformTrustRecord | null>(null);

  const [documentVersions, setDocumentVersions] = useState<PlatformDocumentVersionRecord[]>([]);
  const [matters, setMatters] = useState<PlatformMatterRecord[]>([]);
  const [documentSession, setDocumentSession] = useState<StoredDocumentSession | null>(null);
  const [isSyncingDocument, setIsSyncingDocument] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [reviewScope, setReviewScope] = useState<SyncScope>(initialScope);
  const [reviewRun, setReviewRun] = useState<PlatformReviewRunRecord | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isRunningReview, setIsRunningReview] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState("");
  const [findingStatuses, setFindingStatuses] = useState<Record<string, LocalFindingStatus>>({});
  const [reviewStatusFilter, setReviewStatusFilter] = useState<LocalFindingStatus | "all">("all");
  const [reviewSeverityFilter, setReviewSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const [askScope, setAskScope] = useState<SyncScope>("selection");
  const [askQuestion, setAskQuestion] = useState("Can the customer terminate for convenience?");
  const [askRun, setAskRun] = useState<PlatformAskRunRecord | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [isRunningAsk, setIsRunningAsk] = useState(false);

  const [reviseInstruction, setReviseInstruction] = useState(
    "Make this clause more customer-friendly and add notice and cure limits."
  );
  const [reviseRun, setReviseRun] = useState<PlatformReviseRunRecord | null>(null);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [isRunningRevise, setIsRunningRevise] = useState(false);
  const [selectedClauseBankEntryIds, setSelectedClauseBankEntryIds] = useState<string[]>([]);

  const [savedClauses, setSavedClauses] = useState<PlatformClauseBankEntryRecord[]>([]);
  const [clauseForm, setClauseForm] = useState<ClauseBankFormState>({
    contract_type: "saas_agreement",
    issue_type: "",
    represented_party: "customer",
    title: "",
    text: ""
  });
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [savedClauseError, setSavedClauseError] = useState<string | null>(null);
  const [isSavingClause, setIsSavingClause] = useState(false);

  const documentIdentity = useMemo(() => build_document_identity(selectionState), [selectionState]);

  useEffect(() => {
    void refreshSelection();
  }, []);

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (activeWorkspaceId) {
      window.localStorage.setItem(workspace_storage_key, activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!documentIdentity) {
      setDocumentSession(null);
      return;
    }
    setDocumentSession(read_document_session(documentIdentity));
  }, [documentIdentity]);

  useEffect(() => {
    if (!sessionUser) {
      setWorkspaces([]);
      setPlaybooks([]);
      setProviderConfigs([]);
      setDocumentVersions([]);
      setMatters([]);
      setActiveWorkspaceId("");
      return;
    }

    void loadWorkspaceData();
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser || !activeWorkspaceId) {
      return;
    }

    void Promise.all([
      loadPlaybooks(activeWorkspaceId),
      loadProviderConfigs(activeWorkspaceId),
      loadDocumentVersions(activeWorkspaceId),
      loadMatters(activeWorkspaceId),
      loadClauseBankEntries(activeWorkspaceId),
      loadBillingSummary(activeWorkspaceId),
      loadTrustProfile()
    ]);
  }, [sessionUser, activeWorkspaceId]);

  useEffect(() => {
    if (!selectedPlaybookId && playbooks.length > 0) {
      setSelectedPlaybookId(playbooks[0].id);
    }
  }, [selectedPlaybookId, playbooks]);

  useEffect(() => {
    setProviderForm((current) => ({
      ...current,
      workspace_id: activeWorkspaceId
    }));
    setSelectedClauseBankEntryIds([]);
    setEditingClauseId(null);
  }, [activeWorkspaceId]);

  useEffect(() => {
    const playbook = playbooks.find((candidate) => candidate.id === selectedPlaybookId) ?? playbooks[0] ?? null;
    if (!playbook || editingClauseId) {
      return;
    }
    setClauseForm((current) => ({
      ...current,
      contract_type: playbook.contract_type,
      represented_party: playbook.represented_party
    }));
  }, [editingClauseId, playbooks, selectedPlaybookId]);

  useEffect(() => {
    if (!selectedFindingId && reviewRun?.findings?.[0]) {
      setSelectedFindingId(reviewRun.findings[0].id);
    }
  }, [reviewRun, selectedFindingId]);

  const visibleFindings = (reviewRun?.findings ?? []).filter((finding) => {
    const localStatus = findingStatuses[finding.id] ?? "open";
    if (reviewStatusFilter !== "all" && localStatus !== reviewStatusFilter) {
      return false;
    }
    if (reviewSeverityFilter !== "all" && finding.severity !== reviewSeverityFilter) {
      return false;
    }
    return true;
  });

  const selectedFinding =
    visibleFindings.find((finding) => finding.id === selectedFindingId) ??
    visibleFindings[0] ??
    null;

  async function refreshSelection(successMessage?: string | null) {
    setIsRefreshingSelection(true);
    try {
      const nextSelection = await get_word_selection_state();
      setSelectionState(nextSelection);
      setSelectionError(null);
      if (successMessage) {
        setActionMessage(successMessage);
      }
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error.message : "Unable to read the current Word state."
      );
    } finally {
      setIsRefreshingSelection(false);
    }
  }

  async function loadSession() {
    setIsLoadingSession(true);
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (response.status === 401) {
        setSessionUser(null);
        setIsLoadingSession(false);
        return;
      }
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setSessionUser((await response.json()) as PlatformUserRecord);
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to load the current session.");
      setSessionUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function loadWorkspaceData() {
    setIsLoadingWorkspaceData(true);
    try {
      const response = await fetch("/api/platform/workspaces", {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      const nextWorkspaces = (await response.json()) as PlatformWorkspaceRecord[];
      setWorkspaces(nextWorkspaces);
      const storedWorkspaceId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(workspace_storage_key)
          : null;
      const preferredWorkspaceId =
        nextWorkspaces.find((workspace) => workspace.id === storedWorkspaceId)?.id ??
        nextWorkspaces[0]?.id ??
        "";
      setActiveWorkspaceId(preferredWorkspaceId);
      setSettingsError(null);
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to load workspaces."
      );
    } finally {
      setIsLoadingWorkspaceData(false);
    }
  }

  async function loadPlaybooks(workspaceId: string) {
    try {
      const response = await fetch(
        `/api/platform/playbooks?workspace_id=${encodeURIComponent(workspaceId)}`,
        {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setPlaybooks((await response.json()) as PlatformPlaybookRecord[]);
      setReviewError(null);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to load playbooks."
      );
    }
  }

  async function loadProviderConfigs(workspaceId: string) {
    try {
      const response = await fetch(
        `/api/provider-configs?workspace_id=${encodeURIComponent(workspaceId)}`,
        {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setProviderConfigs((await response.json()) as ProviderConfigRecord[]);
      setSettingsError(null);
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to load provider settings."
      );
    }
  }

  async function loadDocumentVersions(workspaceId: string) {
    try {
      const response = await fetch(
        `/api/platform/workspaces/${workspaceId}/document-versions`,
        {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setDocumentVersions((await response.json()) as PlatformDocumentVersionRecord[]);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "Unable to load document versions."
      );
    }
  }

  async function loadMatters(workspaceId: string) {
    try {
      const response = await fetch(`/api/platform/workspaces/${workspaceId}/matters`, {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setMatters((await response.json()) as PlatformMatterRecord[]);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Unable to load matters.");
    }
  }

  async function loadClauseBankEntries(workspaceId: string, searchQuery?: string) {
    try {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (searchQuery?.trim()) {
        params.set("search_query", searchQuery.trim());
      }
      const response = await fetch(`/api/platform/clause-bank?${params.toString()}`, {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setSavedClauses((await response.json()) as PlatformClauseBankEntryRecord[]);
      setSavedClauseError(null);
    } catch (error) {
      setSavedClauseError(
        error instanceof Error ? error.message : "Unable to load saved clauses."
      );
    }
  }

  async function loadBillingSummary(workspaceId: string) {
    try {
      const response = await fetch(`/api/platform/workspaces/${workspaceId}/billing`, {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setBillingSummary((await response.json()) as PlatformUsageSummaryRecord);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Unable to load billing summary.");
    }
  }

  async function loadTrustProfile() {
    try {
      const response = await fetch("/api/platform/trust", {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setTrustProfile((await response.json()) as PlatformTrustRecord);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Unable to load trust details.");
    }
  }

  async function recordPreferenceSignal(payload: PlatformPreferenceSignalCreateRequest) {
    const response = await fetch("/api/platform/preference-signals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(await extract_error_message(response));
    }
  }

  async function recordApplyEvent(payload: PlatformApplyEventCreateRequest) {
    const response = await fetch("/api/platform/apply-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(await extract_error_message(response));
    }
  }

  async function estimateRunCost(
    runType: "review" | "ask" | "revise",
    payload: {
      document_version_id?: string | null;
      selection_text?: string | null;
      question?: string | null;
      instruction?: string | null;
      playbook_id?: string | null;
    }
  ) {
    if (!activeWorkspaceId) {
      return null;
    }
    const response = await fetch("/api/platform/spend-estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        workspace_id: activeWorkspaceId,
        run_type: runType,
        ...payload
      })
    });
    if (!response.ok) {
      throw new Error(await extract_error_message(response));
    }
    return (await response.json()) as PlatformSpendEstimateRecord;
  }

  async function handleAuthSubmit() {
    setIsSubmittingAuth(true);
    try {
      const path = sessionMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        sessionMode === "register"
          ? authForm
          : ({
              email: authForm.email,
              password: authForm.password
            } satisfies AuthLoginRequest);
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      const auth = (await response.json()) as AuthTokenResponse;
      setSessionUser(auth.user);
      setAuthError(null);
      setActionMessage(`Signed in as ${auth.user.email}.`);
      setAuthForm({
        email: authForm.email,
        password: "",
        full_name: authForm.full_name ?? ""
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to complete authentication.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    setSessionUser(null);
    setReviewRun(null);
    setAskRun(null);
    setReviseRun(null);
    setActionMessage("Signed out of the Word add-in session.");
  }

  async function handleSaveProviderConfig() {
    if (!activeWorkspaceId) {
      setSettingsError("Choose a workspace before saving provider settings.");
      return;
    }

    setIsSavingProvider(true);
    try {
      const modelPolicy = JSON.parse(providerPolicyInput) as Record<string, object>;
      const payload: ProviderConfigCreateRequest = {
        workspace_id: activeWorkspaceId,
        provider_name: providerForm.provider_name.trim(),
        encrypted_secret: providerForm.encrypted_secret?.trim() || null,
        model_policy: modelPolicy
      };
      const response = await fetch("/api/provider-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      await loadProviderConfigs(activeWorkspaceId);
      await loadBillingSummary(activeWorkspaceId);
      setActionMessage(`Saved ${payload.provider_name} settings for the active workspace.`);
      setSettingsError(null);
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to save provider settings."
      );
    } finally {
      setIsSavingProvider(false);
    }
  }

  async function handleDeleteProviderConfig(configId: string) {
    try {
      const response = await fetch(`/api/provider-configs/${configId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      if (activeWorkspaceId) {
        await loadProviderConfigs(activeWorkspaceId);
        await loadBillingSummary(activeWorkspaceId);
      }
      setActionMessage("Removed the provider configuration.");
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to delete the provider configuration."
      );
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!activeWorkspaceId) {
      return;
    }
    try {
      const response = await fetch(`/api/platform/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      await Promise.all([loadDocumentVersions(activeWorkspaceId), loadBillingSummary(activeWorkspaceId)]);
      setActionMessage("Deleted the synced document and its stored artifacts.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Unable to delete the document.");
    }
  }

  async function handleDeleteMatter(matterId: string) {
    if (!activeWorkspaceId) {
      return;
    }
    try {
      const response = await fetch(`/api/platform/matters/${matterId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      await Promise.all([
        loadMatters(activeWorkspaceId),
        loadDocumentVersions(activeWorkspaceId),
        loadBillingSummary(activeWorkspaceId)
      ]);
      setActionMessage("Deleted the matter and all linked synced documents.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Unable to delete the matter.");
    }
  }

  async function syncCurrentSelection(scope: SyncScope, force = false) {
    if (!selectionState) {
      throw new Error("Word selection state is not available yet.");
    }
    if (!sessionUser || !activeWorkspaceId) {
      throw new Error("Sign in and choose a workspace before syncing Word content.");
    }

    const existingSession = documentSession ?? {
      identity: documentIdentity
    };

    if (scope === "full_document") {
      const documentText = selectionState.document_text.trim();
      if (!documentText) {
        throw new Error("Word did not return any document text to sync.");
      }

      const documentHash = await hash_text(documentText);
      if (
        !force &&
        existingSession.full_document_hash === documentHash &&
        existingSession.full_document_version
      ) {
        setActionMessage("Using the existing synced full-document snapshot.");
        return existingSession.full_document_version;
      }

      setIsSyncingDocument(true);
      try {
        const form = new FormData();
        form.set("workspace_id", activeWorkspaceId);
        form.set("source_kind", "word_document");
        form.append(
          "files",
          new Blob([documentText], { type: "text/plain" }),
          normalize_document_filename(selectionState.document_name)
        );

        const response = await fetch("/api/platform/documents/upload", {
          method: "POST",
          body: form
        });
        if (!response.ok) {
          throw new Error(await extract_error_message(response));
        }
        const ingest = ((await response.json()) as PlatformDocumentIngestRecord[])[0];
        const nextSession: StoredDocumentSession = {
          ...existingSession,
          full_document_hash: documentHash,
          full_document_version: ingest.document_version,
          last_sync_scope: "full_document",
          last_synced_at: new Date().toISOString()
        };
        persist_document_session(documentIdentity, nextSession);
        setDocumentSession(nextSession);
        setActionMessage(`Synced the current Word document as ${ingest.document_version.id}.`);
        await loadDocumentVersions(activeWorkspaceId);
        return ingest.document_version;
      } finally {
        setIsSyncingDocument(false);
      }
    }

    const selectionText = selectionState.selection_text.trim();
    if (!selectionText) {
      throw new Error("Select clause text in Word before syncing the current selection.");
    }
    const selectionHash = await hash_text(selectionText);
    if (
      !force &&
      existingSession.selection_hash === selectionHash &&
      existingSession.selection_version
    ) {
      setActionMessage("Using the existing synced selection snapshot.");
      return existingSession.selection_version;
    }

    setIsSyncingDocument(true);
    try {
      const response = await fetch("/api/platform/documents/selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          document_name: build_selection_document_name(selectionState.document_name),
          selection_text: selectionText
        })
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      const ingest = (await response.json()) as PlatformDocumentIngestRecord;
      const nextSession: StoredDocumentSession = {
        ...existingSession,
        selection_hash: selectionHash,
        selection_version: ingest.document_version,
        last_sync_scope: "selection",
        last_synced_at: new Date().toISOString()
      };
      persist_document_session(documentIdentity, nextSession);
      setDocumentSession(nextSession);
      setActionMessage(`Synced the current Word selection as ${ingest.document_version.id}.`);
      await loadDocumentVersions(activeWorkspaceId);
      return ingest.document_version;
    } finally {
      setIsSyncingDocument(false);
    }
  }

  async function ensureReviewDocumentVersion() {
    return syncCurrentSelection(reviewScope);
  }

  async function ensureContextDocumentVersion(scope: SyncScope) {
    if (scope === "full_document") {
      return syncCurrentSelection("full_document");
    }
    try {
      return await syncCurrentSelection("full_document");
    } catch {
      return syncCurrentSelection("selection");
    }
  }

  async function runReview() {
    if (!sessionUser || !activeWorkspaceId) {
      setReviewError("Sign in and choose a workspace before running Review.");
      return;
    }
    if (!selectedPlaybookId) {
      setReviewError("Choose a playbook before running Review.");
      return;
    }

    setIsRunningReview(true);
    setReviewError(null);
    try {
      const documentVersion = await ensureReviewDocumentVersion();
      const estimate = await estimateRunCost("review", {
        document_version_id: documentVersion.id,
        playbook_id: selectedPlaybookId
      });
      if (estimate) {
        setActionMessage(estimate.message);
      }
      const response = await fetch("/api/platform/review-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          document_version_id: documentVersion.id,
          playbook_id: selectedPlaybookId
        })
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      const initialRun = (await response.json()) as PlatformReviewRunRecord;
      const completedRun = await poll_platform_run<PlatformReviewRunRecord>(
        `/api/platform/review-runs/${initialRun.id}`,
        initialRun.status
      );
      setReviewRun(completedRun);
      setSelectedFindingId(completedRun.findings[0]?.id ?? "");
      setFindingStatuses({});
      setActionMessage(
        completedRun.findings.length > 0
          ? `Review completed with ${completedRun.findings.length} finding(s).`
          : "Review completed with no findings for the current scope."
      );
      await loadBillingSummary(activeWorkspaceId);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to run Review.");
    } finally {
      setIsRunningReview(false);
    }
  }

  async function runAsk() {
    if (!sessionUser || !activeWorkspaceId) {
      setAskError("Sign in and choose a workspace before running Ask.");
      return;
    }
    if (!askQuestion.trim()) {
      setAskError("Enter a question before running Ask.");
      return;
    }
    if (askScope === "selection" && !selectionState?.selection_text.trim()) {
      setAskError("Select clause text in Word before using selection-scoped Ask.");
      return;
    }

    setIsRunningAsk(true);
    setAskError(null);
    try {
      const documentVersion = await ensureContextDocumentVersion(askScope);
      const estimate = await estimateRunCost("ask", {
        document_version_id: documentVersion.id,
        selection_text: askScope === "selection" ? selectionState?.selection_text.trim() : null,
        question: askQuestion.trim()
      });
      if (estimate) {
        setActionMessage(estimate.message);
      }
      const response = await fetch("/api/platform/ask-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          document_version_id: documentVersion.id,
          question: askQuestion.trim(),
          selection_text: askScope === "selection" ? selectionState?.selection_text.trim() : null
        })
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      const initialRun = (await response.json()) as PlatformAskRunRecord;
      const completedRun = await poll_platform_run<PlatformAskRunRecord>(
        `/api/platform/ask-runs/${initialRun.id}`,
        initialRun.status
      );
      setAskRun(completedRun);
      setActionMessage(
        completedRun.answer?.supported
          ? "Ask completed with cited support from the current document."
          : "Ask could not support a factual answer from the current document."
      );
      await loadBillingSummary(activeWorkspaceId);
    } catch (error) {
      setAskError(error instanceof Error ? error.message : "Unable to run Ask.");
    } finally {
      setIsRunningAsk(false);
    }
  }

  async function runRevise() {
    if (!sessionUser || !activeWorkspaceId) {
      setReviseError("Sign in and choose a workspace before running Revise.");
      return;
    }
    if (!selectionState?.selection_text.trim()) {
      setReviseError("Select clause text in Word before running Revise.");
      return;
    }
    if (!reviseInstruction.trim()) {
      setReviseError("Enter revision instructions before running Revise.");
      return;
    }

    setIsRunningRevise(true);
    setReviseError(null);
    try {
      const documentVersion = await ensureContextDocumentVersion("selection");
      const estimate = await estimateRunCost("revise", {
        document_version_id: documentVersion.id,
        selection_text: selectionState.selection_text.trim(),
        instruction: reviseInstruction.trim(),
        playbook_id: selectedPlaybookId || null
      });
      if (estimate) {
        setActionMessage(estimate.message);
      }
      const response = await fetch("/api/platform/revise-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          document_version_id: documentVersion.id,
          selected_text: selectionState.selection_text.trim(),
          instruction: reviseInstruction.trim(),
          playbook_id: selectedPlaybookId || null,
          clause_bank_entry_ids: selectedClauseBankEntryIds
        })
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      const initialRun = (await response.json()) as PlatformReviseRunRecord;
      const completedRun = await poll_platform_run<PlatformReviseRunRecord>(
        `/api/platform/revise-runs/${initialRun.id}`,
        initialRun.status
      );
      setReviseRun(completedRun);
      setActionMessage("Revise returned suggested language grounded in the current clause context.");
      await loadBillingSummary(activeWorkspaceId);
    } catch (error) {
      setReviseError(error instanceof Error ? error.message : "Unable to run Revise.");
    } finally {
      setIsRunningRevise(false);
    }
  }

  async function handleJumpToCitation(citation: PlatformReviewCitationRecord) {
    try {
      const anchor = citation.anchor ?? {};
      let targetQuote =
        (typeof anchor.quote === "string" ? anchor.quote : null) ?? citation.quote;
      let warning: string | null = null;
      const candidate_segments = split_candidate_segments(selectionState?.document_text ?? "");

      if (candidate_segments.length > 0) {
        const response = await fetch("/api/platform/anchors/relocate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            anchor,
            candidate_segments
          })
        });
        if (response.ok) {
          const relocation = (await response.json()) as {
            strategy: string;
            matched_text: string;
          };
          if (relocation.matched_text) {
            targetQuote = relocation.matched_text;
          }
          if (relocation.strategy === "fuzzy_neighborhood_match") {
            warning =
              "Best match warning: the exact anchor was not found, so Skua selected the closest clause match.";
          }
        }
      }

      const locate = await locate_quote_in_document(targetQuote);
      if (locate.ok) {
        await refreshSelection(warning ? `${warning} ${locate.message}` : locate.message);
      } else {
        setActionMessage(warning ? `${warning} ${locate.message}` : locate.message);
      }
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Unable to relocate this citation in Word."
      );
    }
  }

  async function applyFindingAction(
    finding: PlatformReviewFindingRecord,
    mode: "comment" | "redline" | "insert_fallback"
  ) {
    if (!activeWorkspaceId) {
      setReviewError("Choose a workspace before applying review output.");
      return;
    }
    const firstCitation = finding.citations[0];
    if (firstCitation) {
      await handleJumpToCitation(firstCitation);
    }

    const result =
      mode === "comment"
        ? await apply_comment_to_selection(finding.comment_text ?? finding.explanation)
        : mode === "redline"
          ? await apply_redline_to_selection(strip_suggested_prefix(finding.redline_text ?? ""))
          : await insert_text_after_selection(strip_suggested_prefix(finding.redline_text ?? ""));

    setActionMessage(result.message);
    if (!result.ok) {
      return;
    }

    setFindingStatuses((current) => ({
      ...current,
      [finding.id]:
        mode === "comment" ? "applied_comment" : "applied_redline"
    }));
    await recordPreferenceSignal({
      workspace_id: activeWorkspaceId,
      entity_type: "finding",
      entity_id: finding.id,
      signal_type: "accepted_suggestion",
      signal_value: finding.issue_type,
      metadata: {
        issue_type: finding.issue_type,
        contract_type: selectedPlaybook?.contract_type ?? null,
        represented_party: selectedPlaybook?.represented_party ?? null,
        action_mode: mode
      }
    });
    await recordApplyEvent({
      workspace_id: activeWorkspaceId,
      event_type: mode === "comment" ? "comment_applied" : mode === "redline" ? "redline_applied" : "fallback_inserted",
      review_run_id: finding.review_run_id,
      finding_id: finding.id,
      target_anchor: firstCitation?.anchor ?? {}
    });
    await refreshSelection(result.message);
  }

  async function applySavedClause(
    clause: Pick<PlatformClauseBankEntryRecord, "id" | "issue_type" | "contract_type" | "represented_party" | "text">,
    mode: "replace" | "insert_after"
  ) {
    const result =
      mode === "replace"
        ? await apply_redline_to_selection(strip_suggested_prefix(clause.text))
        : await insert_text_after_selection(strip_suggested_prefix(clause.text));
    setActionMessage(result.message);
    if (result.ok) {
      if (activeWorkspaceId) {
        await recordPreferenceSignal({
          workspace_id: activeWorkspaceId,
          entity_type: "clause_bank_entry",
          entity_id: clause.id,
          signal_type: "used_clause",
          signal_value: clause.issue_type ?? null,
          metadata: {
            issue_type: clause.issue_type,
            contract_type: clause.contract_type,
            represented_party: clause.represented_party,
            action_mode: mode
          }
        });
        await recordApplyEvent({
          workspace_id: activeWorkspaceId,
          event_type: mode === "replace" ? "clause_replaced" : "clause_inserted",
          target_anchor: {}
        });
      }
      await refreshSelection(result.message);
    }
  }

  async function applyReviseSuggestion(mode: "replace" | "insert_after") {
    if (!reviseRun?.suggested_text) {
      return;
    }
    const result =
      mode === "replace"
        ? await apply_redline_to_selection(strip_suggested_prefix(reviseRun.suggested_text))
        : await insert_text_after_selection(strip_suggested_prefix(reviseRun.suggested_text));
    setActionMessage(result.message);
    if (result.ok) {
      if (activeWorkspaceId) {
        await recordPreferenceSignal({
          workspace_id: activeWorkspaceId,
          entity_type: "revise_run",
          entity_id: reviseRun.id,
          signal_type: "accepted_suggestion",
          signal_value: clauseForm.issue_type || null,
          metadata: {
            contract_type: selectedPlaybook?.contract_type ?? clauseForm.contract_type,
            represented_party: selectedPlaybook?.represented_party ?? clauseForm.represented_party,
            issue_type: clauseForm.issue_type || null,
            action_mode: mode
          }
        });
        await recordApplyEvent({
          workspace_id: activeWorkspaceId,
          event_type: mode === "replace" ? "revise_replaced" : "revise_inserted",
          revise_run_id: reviseRun.id,
          target_anchor: {}
        });
      }
      await refreshSelection(result.message);
    }
  }

  async function handleUndoLastEdit() {
    const result = await undo_last_word_action();
    setActionMessage(result.message);
    if (result.ok) {
      await refreshSelection(result.message);
    }
  }

  async function handleDismissFinding(finding: PlatformReviewFindingRecord) {
    setFindingStatuses((current) => ({
      ...current,
      [finding.id]: "dismissed"
    }));
    if (activeWorkspaceId) {
      await recordPreferenceSignal({
        workspace_id: activeWorkspaceId,
        entity_type: "finding",
        entity_id: finding.id,
        signal_type: "dismissed_finding",
        signal_value: finding.issue_type,
        metadata: {
          issue_type: finding.issue_type,
          contract_type: selectedPlaybook?.contract_type ?? null,
          represented_party: selectedPlaybook?.represented_party ?? null
        }
      });
    }
    setActionMessage("Dismissed this finding for the active workspace.");
  }

  async function saveClause(entry: {
    title: string;
    text: string;
    issue_type?: string | null;
    contract_type?: string | null;
    represented_party?: string | null;
    source: string;
  }) {
    if (!activeWorkspaceId) {
      setSavedClauseError("Choose a workspace before saving clause language.");
      return;
    }
    setIsSavingClause(true);
    try {
      const payload: PlatformClauseBankEntryCreateRequest = {
        workspace_id: activeWorkspaceId,
        contract_type: entry.contract_type || selectedPlaybook?.contract_type || clauseForm.contract_type,
        issue_type: entry.issue_type ?? clauseForm.issue_type ?? null,
        represented_party:
          entry.represented_party ?? selectedPlaybook?.represented_party ?? clauseForm.represented_party ?? null,
        title: entry.title.trim(),
        text: strip_suggested_prefix(entry.text),
        source: entry.source
      };
      const response = await fetch("/api/platform/clause-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      await loadClauseBankEntries(activeWorkspaceId);
      setActionMessage("Saved clause language in the workspace clause bank.");
      setSavedClauseError(null);
    } catch (error) {
      setSavedClauseError(
        error instanceof Error ? error.message : "Unable to save clause language."
      );
    } finally {
      setIsSavingClause(false);
    }
  }

  async function submitClauseForm() {
    if (!activeWorkspaceId) {
      setSavedClauseError("Choose a workspace before saving a clause.");
      return;
    }
    if (!clauseForm.title.trim() || !clauseForm.text.trim()) {
      setSavedClauseError("Clause title and text are required.");
      return;
    }
    setIsSavingClause(true);
    try {
      const path = editingClauseId
        ? `/api/platform/clause-bank/${editingClauseId}`
        : "/api/platform/clause-bank";
      const method = editingClauseId ? "PATCH" : "POST";
      const payload = editingClauseId
        ? ({
            contract_type: clauseForm.contract_type,
            issue_type: clauseForm.issue_type || null,
            represented_party: clauseForm.represented_party || null,
            title: clauseForm.title.trim(),
            text: clauseForm.text.trim()
          } satisfies PlatformClauseBankEntryUpdateRequest)
        : ({
            workspace_id: activeWorkspaceId,
            contract_type: clauseForm.contract_type,
            issue_type: clauseForm.issue_type || null,
            represented_party: clauseForm.represented_party || null,
            title: clauseForm.title.trim(),
            text: clauseForm.text.trim(),
            source: "manual_entry"
          } satisfies PlatformClauseBankEntryCreateRequest);
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      await loadClauseBankEntries(activeWorkspaceId);
      setEditingClauseId(null);
      resetClauseForm();
      setActionMessage(editingClauseId ? "Updated the clause bank entry." : "Saved a new clause bank entry.");
      setSavedClauseError(null);
    } catch (error) {
      setSavedClauseError(
        error instanceof Error ? error.message : "Unable to save the clause bank entry."
      );
    } finally {
      setIsSavingClause(false);
    }
  }

  function startEditingClause(clause: PlatformClauseBankEntryRecord) {
    setEditingClauseId(clause.id);
    setClauseForm({
      contract_type: clause.contract_type,
      issue_type: clause.issue_type ?? "",
      represented_party: clause.represented_party ?? "",
      title: clause.title,
      text: clause.text
    });
  }

  function resetClauseForm() {
    setClauseForm({
      contract_type: selectedPlaybook?.contract_type ?? "saas_agreement",
      issue_type: "",
      represented_party: selectedPlaybook?.represented_party ?? "customer",
      title: "",
      text: ""
    });
  }

  async function removeSavedClause(clauseId: string) {
    if (!activeWorkspaceId) {
      return;
    }
    try {
      const response = await fetch(`/api/platform/clause-bank/${clauseId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(await extract_error_message(response));
      }
      setSelectedClauseBankEntryIds((current) => current.filter((id) => id !== clauseId));
      await loadClauseBankEntries(activeWorkspaceId);
      setActionMessage("Removed the clause from the workspace clause bank.");
    } catch (error) {
      setSavedClauseError(
        error instanceof Error ? error.message : "Unable to delete the clause bank entry."
      );
    }
  }

  const currentWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;
  const selectedPlaybook =
    playbooks.find((playbook) => playbook.id === selectedPlaybookId) ?? playbooks[0] ?? null;
  const syncSummary = build_sync_summary(documentSession);

  return (
    <main className="page-shell">
      <section className="context-strip">
        <div>
          <p className="eyebrow">Skua / Word Add-in</p>
          <h1>Word-native contract copilot</h1>
          <p className="context-copy">
            Review, ask, revise, citations, saved fallback language, and provider settings now run through the platform APIs from inside Word.
          </p>
        </div>
        <div className="ribbon-preview">
          <span>{sessionUser ? sessionUser.email : "Signed out"}</span>
          <span>{currentWorkspace?.name ?? "No workspace"}</span>
          <span>{selectionState?.document_name ?? "Loading document"}</span>
        </div>
      </section>

      <section className="host-bar">
        <div className="host-card">
          <p className="section-label">Host status</p>
          <strong>{selectionState?.host_available ? "Connected to Word" : "Browser preview"}</strong>
          <p>
            {selectionState
              ? `${selectionState.host_name} / ${selectionState.platform_name}`
              : "Loading Office host details..."}
          </p>
        </div>
        <div className="host-card">
          <p className="section-label">Document session</p>
          <strong>{syncSummary.title}</strong>
          <p>{syncSummary.body}</p>
        </div>
        <div className="host-card">
          <p className="section-label">Actions</p>
          <div className="action-row">
            <button disabled={isRefreshingSelection} onClick={() => void refreshSelection()} type="button">
              {isRefreshingSelection ? "Refreshing..." : "Refresh Word state"}
            </button>
            <button disabled={!sessionUser || isSyncingDocument} onClick={() => void syncCurrentSelection("full_document", true)} type="button">
              {isSyncingDocument ? "Syncing..." : "Sync document"}
            </button>
            <button className="ghost" disabled={!sessionUser || isSyncingDocument} onClick={() => void syncCurrentSelection("selection", true)} type="button">
              Sync selection
            </button>
            <button className="ghost" onClick={() => void handleUndoLastEdit()} type="button">
              Undo last apply
            </button>
          </div>
        </div>
      </section>

      <section className="preview-stage">
        <div className="word-canvas">
          <div className="word-ruler" />
          <div className="word-page">
            <p className="doc-kicker">{selectionState?.document_name ?? "Current Word document"}</p>
            <h2>Selection snapshot</h2>
            <p>{selectionState?.selection_text || "Select clause text in Word to scope review, ask, and revise."}</p>
            <p className="selection-chip">
              {selectionState?.change_tracking_mode
                ? `Track changes: ${selectionState.change_tracking_mode}`
                : "Track changes: unavailable in preview"}
            </p>
            <div className="selection-details">
              <span>Document URL</span>
              <strong>{selectionState?.document_url ? "Available" : "Not exposed by host"}</strong>
            </div>
            <div className="selection-details">
              <span>Current workspace</span>
              <strong>{currentWorkspace?.name ?? "Sign in to select a workspace"}</strong>
            </div>
            <div className="selection-details">
              <span>Last synced</span>
              <strong>{format_date(documentSession?.last_synced_at)}</strong>
            </div>
          </div>
        </div>

        <section className="pane-shell">
          <header className="pane-header">
            <div className="pane-title">
              <span className="app-badge">Skua</span>
              <div>
                <strong>{currentWorkspace?.name ?? "Word workspace"}</strong>
                <p>{selectionState?.document_name ?? "Current Word document"}</p>
              </div>
            </div>
            <p className="meta-line">
              {sessionUser ? `${sessionUser.email} / ${sessionUser.workspace_ids.length} workspace(s)` : "Sign in from Settings to sync this document and run platform-backed tools."}
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
              ? "Review findings stay citation-anchored and can be applied directly in Word."
              : activeTab === "ask"
                ? "Ask returns short cited answers or refuses unsupported factual claims."
                : activeTab === "revise"
                  ? "Revise labels every output as suggested language and keeps support separate from draft text."
                  : activeTab === "saved"
                    ? "Saved clauses are now workspace-scoped fallback language that can drive review and revise."
                    : "Settings controls sign-in, workspace selection, and provider configuration."}
          </div>

          {selectionError ? <div className="inline-alert error">{selectionError}</div> : null}
          {syncError ? <div className="inline-alert error">{syncError}</div> : null}
          {authError ? <div className="inline-alert error">{authError}</div> : null}
          {settingsError ? <div className="inline-alert error">{settingsError}</div> : null}
          {actionMessage ? <div className="inline-alert success">{actionMessage}</div> : null}

          <div className="pane-body">
            {activeTab === "review" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Review</p>
                    <h3>{reviewRun ? `${reviewRun.summary.total_findings} findings` : "Run a Word review"}</h3>
                  </div>
                  <span className="status-pill success">{reviewRun?.status ?? "ready"}</span>
                </div>

                {!sessionUser ? (
                  <div className="empty-state">Sign in from Settings before running Review.</div>
                ) : (
                  <>
                    <div className="run-panel">
                      <p>Choose a scope and playbook, then sync the relevant Word content and run a stored review.</p>
                      <div className="toggle-list">
                        <Toggle checked={reviewScope === "selection"} label="Current selection" onChange={() => setReviewScope("selection")} />
                        <Toggle checked={reviewScope === "full_document"} label="Full document" onChange={() => setReviewScope("full_document")} />
                      </div>
                      <label className="field">
                        <span>Playbook</span>
                        <select onChange={(event) => setSelectedPlaybookId(event.target.value)} value={selectedPlaybookId}>
                          {playbooks.map((playbook) => (
                            <option key={playbook.id} value={playbook.id}>
                              {playbook.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="action-row">
                        <button disabled={isRunningReview || isSyncingDocument} onClick={() => void runReview()} type="button">
                          {isRunningReview ? "Running review..." : "Run review"}
                        </button>
                        <button className="ghost" disabled={isSyncingDocument} onClick={() => void syncCurrentSelection(reviewScope, true)} type="button">
                          Sync current scope
                        </button>
                      </div>
                    </div>

                    {reviewError ? <div className="inline-alert error">{reviewError}</div> : null}

                    {reviewRun ? (
                      <>
                        <div className="filter-grid">
                          <label className="field">
                            <span>Status</span>
                            <select onChange={(event) => setReviewStatusFilter(event.target.value as LocalFindingStatus | "all")} value={reviewStatusFilter}>
                              <option value="all">All</option>
                              <option value="open">Open</option>
                              <option value="applied_comment">Applied comment</option>
                              <option value="applied_redline">Applied redline</option>
                              <option value="saved_clause">Saved clause</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Severity</span>
                            <select onChange={(event) => setReviewSeverityFilter(event.target.value as "all" | "high" | "medium" | "low")} value={reviewSeverityFilter}>
                              <option value="all">All</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </label>
                        </div>

                        <div className="suggestion-list">
                          {visibleFindings.map((finding) => (
                            <article className={finding.id === selectedFinding?.id ? "suggestion-card selected" : "suggestion-card"} key={finding.id}>
                              <button className="card-button" onClick={() => setSelectedFindingId(finding.id)} type="button">
                                <span className={`severity-chip ${finding.severity}`}>{finding.severity}</span>
                                <strong>{finding.title}</strong>
                                <p>{finding.explanation}</p>
                                <div className="card-meta">
                                  <span>{finding.issue_type.replaceAll("_", " ")}</span>
                                  <span>{Math.round((finding.confidence ?? 0) * 100)}% confidence</span>
                                </div>
                              </button>
                            </article>
                          ))}
                        </div>

                        {selectedFinding ? (
                          <div className="detail-card">
                            <div className="section-head">
                              <div>
                                <p className="section-label">Finding detail</p>
                                <strong>{selectedFinding.title}</strong>
                              </div>
                              <span className="status-pill">{findingStatuses[selectedFinding.id] ?? "open"}</span>
                            </div>
                            <div className="detail-section">
                              <span>Explanation</span>
                              <p>{selectedFinding.explanation}</p>
                            </div>
                            {selectedFinding.proposed_action ? (
                              <div className="detail-section">
                                <span>Proposed action</span>
                                <p>{selectedFinding.proposed_action}</p>
                              </div>
                            ) : null}
                            {selectedFinding.comment_text ? (
                              <blockquote>{selectedFinding.comment_text}</blockquote>
                            ) : null}
                            {selectedFinding.redline_text ? (
                              <div className="draft-box">
                                <span>Suggested language</span>
                                <p>{selectedFinding.redline_text}</p>
                              </div>
                            ) : null}
                            <div className="citation-block">
                              <p className="section-label">Citations</p>
                              {selectedFinding.citations.map((citation) => (
                                <button className="citation-row" key={citation.id} onClick={() => void handleJumpToCitation(citation)} type="button">
                                  <strong>{citation.label ?? "Source"}</strong>
                                  <p>{citation.quote}</p>
                                </button>
                              ))}
                            </div>
                            <div className="action-row">
                              <button className="ghost" onClick={() => void handleJumpToCitation(selectedFinding.citations[0])} type="button">
                                Jump to source
                              </button>
                              <button disabled={!selectedFinding.comment_text} onClick={() => void applyFindingAction(selectedFinding, "comment")} type="button">
                                Apply comment
                              </button>
                              <button disabled={!selectedFinding.redline_text} onClick={() => void applyFindingAction(selectedFinding, "redline")} type="button">
                                Apply redline
                              </button>
                              <button className="ghost" disabled={!selectedFinding.redline_text} onClick={() => void applyFindingAction(selectedFinding, "insert_fallback")} type="button">
                                Insert fallback
                              </button>
                              <button className="ghost" disabled={!selectedFinding.redline_text} onClick={() => {
                                void saveClause({
                                  title: selectedFinding.title,
                                  text: selectedFinding.redline_text ?? "",
                                  issue_type: selectedFinding.issue_type,
                                  contract_type: selectedPlaybook?.contract_type,
                                  represented_party: selectedPlaybook?.represented_party,
                                  source: "accepted_suggestion"
                                });
                                setFindingStatuses((current) => ({ ...current, [selectedFinding.id]: "saved_clause" }));
                              }} type="button">
                                Save clause
                              </button>
                              <button className="ghost" onClick={() => void handleDismissFinding(selectedFinding)} type="button">
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-state">No findings match the current filters.</div>
                        )}
                      </>
                    ) : (
                      <div className="empty-state">Run Review to populate findings for the current document.</div>
                    )}
                  </>
                )}
              </section>
            ) : null}

            {activeTab === "ask" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Ask</p>
                    <h3>Short cited answers</h3>
                  </div>
                  <span className="status-pill">{askRun?.status ?? "ready"}</span>
                </div>

                {!sessionUser ? (
                  <div className="empty-state">Sign in from Settings before running Ask.</div>
                ) : (
                  <>
                    <div className="toggle-list">
                      <Toggle checked={askScope === "selection"} label="Prefer current selection" onChange={() => setAskScope("selection")} />
                      <Toggle checked={askScope === "full_document"} label="Use full document" onChange={() => setAskScope("full_document")} />
                    </div>

                    <label className="field">
                      <span>Question</span>
                      <textarea onChange={(event) => setAskQuestion(event.target.value)} value={askQuestion} />
                    </label>

                    {askError ? <div className="inline-alert error">{askError}</div> : null}

                    <div className="action-row">
                      <button disabled={isRunningAsk} onClick={() => void runAsk()} type="button">
                        {isRunningAsk ? "Running Ask..." : "Ask"}
                      </button>
                    </div>

                    {askRun?.answer ? (
                      <>
                        <div className="answer-card">
                          <p className="section-label">Answer</p>
                          <p>{askRun.answer.answer_text}</p>
                        </div>
                        <div className="citation-block">
                          <p className="section-label">Citations</p>
                          {askRun.answer.citations.length > 0 ? (
                            askRun.answer.citations.map((citation) => (
                              <button className="citation-row" key={citation.id} onClick={() => void handleJumpToCitation(citation)} type="button">
                                <strong>{citation.label ?? "Source"}</strong>
                                <p>{citation.quote}</p>
                              </button>
                            ))
                          ) : (
                            <div className="empty-state">No cited support was found for this question.</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="empty-state">Ask will return 1–3 citations or refuse unsupported factual claims.</div>
                    )}
                  </>
                )}
              </section>
            ) : null}

            {activeTab === "revise" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Revise</p>
                    <h3>Suggested language with grounded support</h3>
                  </div>
                  <span className="status-pill">{reviseRun?.status ?? "ready"}</span>
                </div>

                {!sessionUser ? (
                  <div className="empty-state">Sign in from Settings before running Revise.</div>
                ) : (
                  <>
                    <label className="field">
                      <span>Instruction</span>
                      <textarea onChange={(event) => setReviseInstruction(event.target.value)} value={reviseInstruction} />
                    </label>
                    <div className="saved-notes-panel">
                      <p className="section-label">Preferred saved clauses</p>
                      <div className="saved-note-list">
                        {savedClauses.length > 0 ? (
                          savedClauses.slice(0, 6).map((clause) => (
                            <button
                              className={selectedClauseBankEntryIds.includes(clause.id) ? "citation-row selected" : "citation-row"}
                              key={clause.id}
                              onClick={() =>
                                setSelectedClauseBankEntryIds((current) =>
                                  current.includes(clause.id)
                                    ? current.filter((id) => id !== clause.id)
                                    : [...current, clause.id]
                                )
                              }
                              type="button"
                            >
                              <strong>{clause.title}</strong>
                              <p>{clause.issue_type?.replaceAll("_", " ") ?? clause.contract_type}</p>
                            </button>
                          ))
                        ) : (
                          <div className="empty-state">No saved clauses yet. Revise will still search the workspace clause bank automatically once you start saving language.</div>
                        )}
                      </div>
                    </div>
                    <div className="answer-card">
                      <p className="section-label">Current selection</p>
                      <p>{selectionState?.selection_text || "Select clause text in Word before revising."}</p>
                    </div>

                    {reviseError ? <div className="inline-alert error">{reviseError}</div> : null}

                    <div className="action-row">
                      <button disabled={isRunningRevise} onClick={() => void runRevise()} type="button">
                        {isRunningRevise ? "Running Revise..." : "Generate suggested language"}
                      </button>
                    </div>

                    {reviseRun ? (
                      <>
                        <div className="answer-card">
                          <p className="section-label">Suggested language</p>
                          <p>{reviseRun.suggested_text}</p>
                        </div>
                        {reviseRun.rationale ? (
                          <div className="detail-card">
                            <div className="detail-section">
                              <span>Rationale</span>
                              <p>{reviseRun.rationale}</p>
                            </div>
                          </div>
                        ) : null}
                        <div className="citation-block">
                          <p className="section-label">Citations</p>
                          {reviseRun.citations.map((citation) => (
                            <button className="citation-row" key={citation.id} onClick={() => void handleJumpToCitation(citation)} type="button">
                              <strong>{citation.label ?? "Source"}</strong>
                              <p>{citation.quote}</p>
                            </button>
                          ))}
                        </div>
                        <div className="action-row">
                          <button onClick={() => void applyReviseSuggestion("replace")} type="button">
                            Replace selection
                          </button>
                          <button className="ghost" onClick={() => void applyReviseSuggestion("insert_after")} type="button">
                            Insert after
                          </button>
                          <button className="ghost" onClick={() => {
                            void navigator.clipboard.writeText(strip_suggested_prefix(reviseRun.suggested_text ?? ""));
                            setActionMessage("Copied the suggested language to the clipboard.");
                          }} type="button">
                            Copy
                          </button>
                          <button className="ghost" onClick={() => void saveClause({
                            title: selectionState?.document_name ? `Saved from ${selectionState.document_name}` : "Saved revised clause",
                            text: reviseRun.suggested_text ?? "",
                            contract_type: selectedPlaybook?.contract_type ?? clauseForm.contract_type,
                            represented_party: selectedPlaybook?.represented_party ?? clauseForm.represented_party,
                            source: "selected_document_text"
                          })} type="button">
                            Save clause
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-state">Revise uses the current clause, current document, and selected playbook when available.</div>
                    )}
                  </>
                )}
              </section>
            ) : null}

            {activeTab === "saved" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Saved clauses</p>
                    <h3>{savedClauses.length} workspace clause{savedClauses.length === 1 ? "" : "s"}</h3>
                  </div>
                  <span className="status-pill">workspace memory</span>
                </div>

                <div className="saved-notes-panel">
                  <p>Save preferred fallback language here so review and revise can prioritize your language over generic defaults.</p>
                  {savedClauseError ? <div className="inline-alert error">{savedClauseError}</div> : null}
                  <div className="run-panel">
                    <label className="field">
                      <span>Title</span>
                      <input
                        onChange={(event) => setClauseForm((current) => ({ ...current, title: event.target.value }))}
                        value={clauseForm.title}
                      />
                    </label>
                    <div className="filter-grid">
                      <label className="field">
                        <span>Contract type</span>
                        <select
                          onChange={(event) => setClauseForm((current) => ({ ...current, contract_type: event.target.value }))}
                          value={clauseForm.contract_type}
                        >
                          {supported_contract_types.map((contractType) => (
                            <option key={contractType.value} value={contractType.value}>
                              {contractType.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Issue type</span>
                        <input
                          onChange={(event) => setClauseForm((current) => ({ ...current, issue_type: event.target.value }))}
                          placeholder="suspension"
                          value={clauseForm.issue_type}
                        />
                      </label>
                    </div>
                    <div className="filter-grid">
                      <label className="field">
                        <span>Represented party</span>
                        <input
                          onChange={(event) => setClauseForm((current) => ({ ...current, represented_party: event.target.value }))}
                          placeholder="customer"
                          value={clauseForm.represented_party}
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>Clause text</span>
                      <textarea
                        onChange={(event) => setClauseForm((current) => ({ ...current, text: event.target.value }))}
                        value={clauseForm.text}
                      />
                    </label>
                    <div className="action-row">
                      <button disabled={isSavingClause} onClick={() => void submitClauseForm()} type="button">
                        {isSavingClause ? "Saving..." : editingClauseId ? "Update clause" : "Save clause"}
                      </button>
                      <button className="ghost" onClick={() => resetClauseForm()} type="button">
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="saved-note-list">
                    {savedClauses.length > 0 ? (
                      savedClauses.map((clause) => (
                        <article className="saved-note-card" key={clause.id}>
                          <div className="section-head compact">
                            <div>
                              <strong>{clause.title}</strong>
                              <p className="muted-copy">
                                {[clause.contract_type, clause.issue_type, clause.represented_party, clause.source]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </p>
                            </div>
                            <span className="status-pill">{format_date(clause.updated_at)}</span>
                          </div>
                          <p>{clause.text}</p>
                          <div className="action-row">
                            <button onClick={() => void applySavedClause(clause, "replace")} type="button">
                              Replace selection
                            </button>
                            <button className="ghost" onClick={() => void applySavedClause(clause, "insert_after")} type="button">
                              Insert after
                            </button>
                            <button className="ghost" onClick={() => {
                              void navigator.clipboard.writeText(strip_suggested_prefix(clause.text));
                              setActionMessage("Copied the saved clause to the clipboard.");
                            }} type="button">
                              Copy
                            </button>
                            <button className="ghost" onClick={() => startEditingClause(clause)} type="button">
                              Edit
                            </button>
                            <button className="ghost" onClick={() => removeSavedClause(clause.id)} type="button">
                              Delete
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">Save clause language from Review or Revise to reuse it here.</div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "settings" ? (
              <section className="stack-section">
                <div className="section-head">
                  <div>
                    <p className="section-label">Settings</p>
                    <h3>{sessionUser ? "Workspace and provider settings" : "Sign in to the add-in"}</h3>
                  </div>
                  <span className="status-pill">{sessionUser ? "connected" : "signed out"}</span>
                </div>

                {!sessionUser ? (
                  <div className="run-panel">
                    <div className="toggle-list">
                      <Toggle checked={sessionMode === "login"} label="Sign in" onChange={() => setSessionMode("login")} />
                      <Toggle checked={sessionMode === "register"} label="Register" onChange={() => setSessionMode("register")} />
                    </div>
                    {sessionMode === "register" ? (
                      <label className="field">
                        <span>Full name</span>
                        <input onChange={(event) => setAuthForm((current) => ({ ...current, full_name: event.target.value }))} value={authForm.full_name ?? ""} />
                      </label>
                    ) : null}
                    <label className="field">
                      <span>Email</span>
                      <input onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} type="email" value={authForm.email} />
                    </label>
                    <label className="field">
                      <span>Password</span>
                      <input onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} type="password" value={authForm.password} />
                    </label>
                    <div className="action-row">
                      <button disabled={isSubmittingAuth || isLoadingSession} onClick={() => void handleAuthSubmit()} type="button">
                        {isSubmittingAuth ? "Submitting..." : sessionMode === "register" ? "Register" : "Sign in"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="detail-card">
                      <div className="section-head compact">
                        <div>
                          <p className="section-label">Session</p>
                          <strong>{sessionUser.email}</strong>
                        </div>
                        <button className="ghost" onClick={() => void handleLogout()} type="button">
                          Sign out
                        </button>
                      </div>
                      <label className="field">
                        <span>Workspace</span>
                        <select onChange={(event) => setActiveWorkspaceId(event.target.value)} value={activeWorkspaceId}>
                          {workspaces.map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="muted-copy">
                        {isLoadingWorkspaceData
                          ? "Loading workspace data..."
                          : `${documentVersions.length} synced document version(s) in this workspace.`}
                      </p>
                    </div>

                    <div className="run-panel">
                      <p className="section-label">Provider configuration</p>
                      <label className="field">
                        <span>Provider name</span>
                        <input onChange={(event) => setProviderForm((current) => ({ ...current, provider_name: event.target.value }))} value={providerForm.provider_name} />
                      </label>
                      <label className="field">
                        <span>Encrypted secret / API key</span>
                        <input onChange={(event) => setProviderForm((current) => ({ ...current, encrypted_secret: event.target.value }))} value={providerForm.encrypted_secret ?? ""} />
                      </label>
                      <label className="field">
                        <span>Model policy JSON</span>
                        <textarea onChange={(event) => setProviderPolicyInput(event.target.value)} value={providerPolicyInput} />
                      </label>
                      <div className="action-row">
                        <button disabled={isSavingProvider} onClick={() => void handleSaveProviderConfig()} type="button">
                          {isSavingProvider ? "Saving..." : "Save provider settings"}
                        </button>
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="section-head compact">
                        <div>
                          <p className="section-label">Billing</p>
                          <strong>{billingSummary ? `${billingSummary.plan_type} plan` : "Loading usage"}</strong>
                        </div>
                        <span className={billingSummary?.over_cap ? "status-pill high" : billingSummary?.warning ? "status-pill medium" : "status-pill success"}>
                          {billingSummary?.over_cap ? "over cap" : billingSummary?.warning ? "warning" : "within policy"}
                        </span>
                      </div>
                      {billingSummary ? (
                        <>
                          <p className="muted-copy">
                            Current month spend ${billingSummary.actual_cost.toFixed(2)} across {billingSummary.run_count} run(s). Warning at ${billingSummary.warning_threshold.toFixed(2)}, hard cap at ${billingSummary.hard_cap.toFixed(2)}, per-run limit ${billingSummary.per_run_limit.toFixed(2)}.
                          </p>
                          <div className="saved-note-list">
                            {billingSummary.recent_runs.slice(0, 5).map((run) => (
                              <article className="saved-note-card" key={run.id}>
                                <div className="section-head compact">
                                  <div>
                                    <strong>{run.run_type}</strong>
                                    <p className="muted-copy">{run.provider} / {run.model}</p>
                                  </div>
                                  <span className="status-pill">${(run.actual_cost ?? 0).toFixed(3)}</span>
                                </div>
                                <p>{format_date(run.created_at)}</p>
                              </article>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="empty-state">Billing summary will appear after the first run in this workspace.</div>
                      )}
                    </div>

                    <div className="saved-notes-panel">
                      <p className="section-label">Provider configs</p>
                      <div className="saved-note-list">
                        {providerConfigs.length > 0 ? (
                          providerConfigs.map((config) => (
                            <article className="saved-note-card" key={config.id}>
                              <div className="section-head compact">
                                <div>
                                  <strong>{config.provider_name}</strong>
                                  <p className="muted-copy">{config.plan_type} / {config.masked_secret ?? "hosted credentials"}</p>
                                </div>
                                <button className="ghost" onClick={() => void handleDeleteProviderConfig(config.id)} type="button">
                                  Delete
                                </button>
                              </div>
                              <p>{JSON.stringify(config.model_policy)}</p>
                            </article>
                          ))
                        ) : (
                          <div className="empty-state">No provider settings saved for this workspace yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="saved-notes-panel">
                      <p className="section-label">Data deletion</p>
                      <div className="saved-note-list">
                        {documentVersions.length > 0 ? (
                          documentVersions.slice(0, 8).map((documentVersion) => (
                            <article className="saved-note-card" key={documentVersion.id}>
                              <div className="section-head compact">
                                <div>
                                  <strong>{documentVersion.name}</strong>
                                  <p className="muted-copy">{documentVersion.document_id}</p>
                                </div>
                                <button className="ghost" onClick={() => void handleDeleteDocument(documentVersion.document_id)} type="button">
                                  Delete document
                                </button>
                              </div>
                              <p>{documentVersion.status} / {documentVersion.parse_status} / {format_date(documentVersion.created_at)}</p>
                            </article>
                          ))
                        ) : (
                          <div className="empty-state">No synced documents in this workspace yet.</div>
                        )}
                        {matters.length > 0 ? (
                          matters.map((matter) => (
                            <article className="saved-note-card" key={matter.id}>
                              <div className="section-head compact">
                                <div>
                                  <strong>{matter.name}</strong>
                                  <p className="muted-copy">{matter.represented_party ?? "represented party not set"}</p>
                                </div>
                                <button className="ghost" onClick={() => void handleDeleteMatter(matter.id)} type="button">
                                  Delete matter
                                </button>
                              </div>
                              <p>{matter.status} / {format_date(matter.created_at)}</p>
                            </article>
                          ))
                        ) : null}
                      </div>
                    </div>

                    <div className="detail-card">
                      <div className="section-head compact">
                        <div>
                          <p className="section-label">Trust</p>
                          <strong>Storage and provider posture</strong>
                        </div>
                        <span className="status-pill success">word-ready</span>
                      </div>
                      {trustProfile ? (
                        <div className="memo-sections">
                          <article className="memo-card">
                            <h3>Stored data</h3>
                            <p>{trustProfile.storage_summary.join(" ")}</p>
                          </article>
                          <article className="memo-card">
                            <h3>Providers and training</h3>
                            <p>{trustProfile.provider_visibility.join(" ")} {trustProfile.training_policy}</p>
                          </article>
                          <article className="memo-card">
                            <h3>Deletion and retention</h3>
                            <p>{trustProfile.delete_behavior.join(" ")} {trustProfile.retention_policy.join(" ")}</p>
                          </article>
                          <article className="memo-card">
                            <h3>BYOK</h3>
                            <p>{trustProfile.byok_behavior.join(" ")}</p>
                          </article>
                        </div>
                      ) : (
                        <div className="empty-state">Loading trust details.</div>
                      )}
                    </div>
                  </>
                )}
              </section>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button className="toggle-row" onClick={onChange} type="button">
      <span>{label}</span>
      <strong>{checked ? "On" : "Off"}</strong>
    </button>
  );
}

function build_sync_summary(session: StoredDocumentSession | null) {
  if (!session?.last_synced_at) {
    return {
      title: "Not synced yet",
      body: "Upload the current Word document or selection before running platform-backed tools."
    };
  }
  const versionId =
    session.last_sync_scope === "full_document"
      ? session.full_document_version?.id
      : session.selection_version?.id;
  return {
    title: `${session.last_sync_scope === "full_document" ? "Full document" : "Selection"} synced`,
    body: `${versionId ?? "snapshot"} at ${format_date(session.last_synced_at)}`
  };
}

function build_document_identity(selectionState: WordSelectionState | null) {
  if (!selectionState) {
    return "";
  }
  return `${selectionState.document_url ?? "local"}::${selectionState.document_name}`;
}

function read_document_session(identity: string): StoredDocumentSession | null {
  if (!identity || typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(document_session_storage_key(identity));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredDocumentSession;
  } catch {
    return null;
  }
}

function persist_document_session(identity: string, session: StoredDocumentSession) {
  if (!identity || typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(document_session_storage_key(identity), JSON.stringify(session));
}

function document_session_storage_key(identity: string) {
  return `skua-word-document-session:${encodeURIComponent(identity)}`;
}

async function extract_error_message(response: Response) {
  const content_type = response.headers.get("content-type") ?? "";
  if (content_type.includes("application/json")) {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? "Request failed.";
  }
  return (await response.text()) || "Request failed.";
}

async function poll_platform_run<T extends { status: string; id: string }>(
  path: string,
  initial_status: string
) {
  if (!["queued", "running"].includes(initial_status)) {
    const response = await fetch(path, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    return (await response.json()) as T;
  }

  let latest: T | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sleep(500);
    const response = await fetch(path, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(await extract_error_message(response));
    }
    latest = (await response.json()) as T;
    if (!["queued", "running"].includes(latest.status)) {
      return latest;
    }
  }
  return latest as T;
}

function split_candidate_segments(text: string) {
  return text
    .split(/\n{2,}/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 200);
}

function normalize_document_filename(name: string) {
  const normalized = name.trim() || "current-word-document.txt";
  return normalized.endsWith(".txt") ? normalized : `${normalized}.txt`;
}

function build_selection_document_name(document_name: string) {
  const normalized = normalize_document_filename(document_name).replace(/\.txt$/i, "");
  return `${normalized}-selection.txt`;
}

function strip_suggested_prefix(text: string) {
  return text.replace(/^Suggested language:\s*/i, "").trim();
}

async function hash_text(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function format_date(value?: string | null) {
  if (!value) {
    return "Not yet synced";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
