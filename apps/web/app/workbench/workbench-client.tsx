"use client";

import { useMemo, useState } from "react";

type Mode = "ask" | "revise" | "review";
type TaskStatus = "todo" | "in_progress" | "done" | "deferred";
type TaskKind = "finding" | "draft" | "manual" | "approval";
type RouteStatus = "allowed" | "warning" | "approval_required" | "blocked";
type ChecklistStatus = "done" | "pending" | "attention";

type SourceSegment = {
  id: string;
  ordinal: number;
  segment_type: string;
  text: string;
};

type DocumentVersion = {
  id: string;
  name: string;
  version_number: number;
  created_at: string;
  segments: SourceSegment[];
};

type Citation = {
  id: string;
  label: string;
  quote: string;
  document_segment_id?: string | null;
};

type Finding = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  issue_type: string;
  explanation: string;
  redline_text?: string | null;
  citations: Citation[];
};

type Task = {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  title: string;
  description?: string | null;
  source_anchor?: string | null;
  created_at: string;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  detail: string;
  created_at: string;
};

type Receipt = {
  id: string;
  run_type: Mode;
  provider: string;
  model: string;
  route_posture: RouteStatus;
  reason: string;
  created_at: string;
};

type Estimate = {
  run_type: Mode;
  provider: string;
  model: string;
  route_posture: RouteStatus;
  receipt_required: boolean;
  reason: string;
  scope_label: string;
  sensitivity_flags: string[];
  retention_policy: string;
};

type Scenario = {
  id: string;
  label: string;
  documentName: string;
  selectionText: string;
  question: string;
  instruction: string;
  initialTask?: Pick<Task, "kind" | "title" | "description" | "source_anchor">;
};

const demoSelection =
  "Suspension. Vendor may suspend or disable access to the Services immediately and at its sole discretion.";

const defaultSegments: SourceSegment[] = [
  {
    id: "seg-1",
    ordinal: 1,
    segment_type: "clause",
    text: demoSelection
  },
  {
    id: "seg-2",
    ordinal: 2,
    segment_type: "clause",
    text: "Fees. Vendor may increase fees on renewal with thirty days' notice."
  }
];

const scenarios: Scenario[] = [
  {
    id: "saas-suspension",
    label: "SaaS suspension clause",
    documentName: "vendor-saas-preview.txt",
    selectionText: demoSelection,
    question: "Can the vendor suspend service without notice?",
    instruction: "Make this clause customer-friendly with notice and cure rights.",
    initialTask: {
      kind: "manual",
      title: "Confirm fallback position",
      description: "Decide whether notice and cure should be required before suspension.",
      source_anchor: demoSelection
    }
  },
  {
    id: "health-data",
    label: "Health data addendum",
    documentName: "health-data-addendum.txt",
    selectionText:
      "Health Data. Vendor may process personal health information, patient records, and PHIPA-regulated data using approved subcontractors outside Canada.",
    question: "Can the vendor route PHIPA-regulated health data to a model provider?",
    instruction: "Limit health-data processing and require explicit provider-route approval.",
    initialTask: {
      kind: "approval",
      title: "Confirm PHIPA route approval",
      description: "Restricted health markers should require an explicit provider-route receipt before model work.",
      source_anchor: "personal health information, patient records, and PHIPA-regulated data"
    }
  },
  {
    id: "cross-border",
    label: "Cross-border support",
    documentName: "support-addendum.txt",
    selectionText:
      "Support. Customer data may be accessed by client-restricted offshore support personnel for troubleshooting after approval required escalation.",
    question: "Can offshore support access client-restricted customer data?",
    instruction: "Make offshore support access approval-gated, logged, and time-limited.",
    initialTask: {
      kind: "approval",
      title: "Review restricted support route",
      description: "Cross-border and client-restricted support should remain visible before provider routing.",
      source_anchor: "client-restricted offshore support personnel"
    }
  }
];

const initialDocument: DocumentVersion = {
  id: "doc-1",
  name: scenarios[0].documentName,
  version_number: 1,
  created_at: "2026-04-30T13:00:00.000Z",
  segments: defaultSegments
};

const initialTasks: Task[] = [
  {
    id: "task-1",
    kind: "manual",
    status: "todo",
    title: "Confirm fallback position",
    description: "Decide whether notice and cure should be required before suspension.",
    source_anchor: demoSelection,
    created_at: "2026-04-30T13:01:00.000Z"
  }
];

const initialTimeline: TimelineEvent[] = [
  {
    id: "event-1",
    event_type: "document_version",
    title: "Version 1 synced",
    detail: "Prototype selection loaded as a document version.",
    created_at: "2026-04-30T13:00:00.000Z"
  }
];

export function WorkbenchClient() {
  const [workspaceName] = useState("Prototype Workspace");
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [documents, setDocuments] = useState<DocumentVersion[]>([initialDocument]);
  const [documentId, setDocumentId] = useState(initialDocument.id);
  const [selectionText, setSelectionText] = useState(demoSelection);
  const [mode, setMode] = useState<Mode>("ask");
  const [question, setQuestion] = useState("Can the vendor suspend service without notice?");
  const [instruction, setInstruction] = useState("Make this clause customer-friendly with notice and cure rights.");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [draftRationale, setDraftRationale] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState("");
  const [selectedSource, setSelectedSource] = useState<Citation | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(initialTimeline);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [message, setMessage] = useState<string | null>("Frontend-only prototype: all state is local to this browser tab.");

  const selectedDocument = documents.find((document) => document.id === documentId) ?? null;
  const currentSegments = selectedDocument?.segments ?? defaultSegments;
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) ?? findings[0] ?? null;
  const checklist = useMemo(
    () => buildChecklist({
      hasDocument: documents.length > 0,
      hasReview: findings.length > 0,
      hasTasks: tasks.length > 0,
      tasksCleared: tasks.length > 0 && tasks.every((task) => task.status === "done" || task.status === "deferred"),
      hasReceipts: receipts.length > 0,
      hasHistory: timeline.length > 0
    }),
    [documents.length, findings.length, receipts.length, tasks, timeline.length]
  );

  function syncSelection() {
    const now = new Date().toISOString();
    const nextDocument: DocumentVersion = {
      id: `doc-${documents.length + 1}`,
      name: "browser-preview-selection.txt",
      version_number: documents.length + 1,
      created_at: now,
      segments: buildSegments(selectionText)
    };
    setDocuments((current) => [nextDocument, ...current]);
    setDocumentId(nextDocument.id);
    addTimeline("document_version", `Version ${nextDocument.version_number} synced`, "Selection text was captured as a prototype document version.");
    setMessage("Selection synced into the prototype workbench.");
  }

  function loadScenario(nextScenarioId: string) {
    const scenario = scenarios.find((item) => item.id === nextScenarioId) ?? scenarios[0];
    const now = new Date().toISOString();
    const document: DocumentVersion = {
      id: `doc-${scenario.id}`,
      name: scenario.documentName,
      version_number: 1,
      created_at: now,
      segments: buildSegments(scenario.selectionText)
    };
    setScenarioId(scenario.id);
    setDocuments([document]);
    setDocumentId(document.id);
    setSelectionText(scenario.selectionText);
    setQuestion(scenario.question);
    setInstruction(scenario.instruction);
    setEstimate(null);
    setAskAnswer(null);
    setDraftText(null);
    setDraftRationale(null);
    setFindings([]);
    setSelectedFindingId("");
    setSelectedSource(null);
    setReceipts([]);
    setTasks(scenario.initialTask ? [createTask(scenario.initialTask, "todo", "task-1")] : []);
    setTimeline([
      {
        id: "event-1",
        event_type: "document_version",
        title: "Scenario loaded",
        detail: `${scenario.label} loaded as a local prototype document.`,
        created_at: now
      }
    ]);
    setMessage(`Loaded ${scenario.label}. No server calls involved.`);
  }

  function selectDocumentVersion(nextDocumentId: string) {
    setDocumentId(nextDocumentId);
    const document = documents.find((item) => item.id === nextDocumentId);
    if (document?.segments[0]) {
      setSelectionText(document.segments[0].text);
      setEstimate(null);
      setSelectedSource(null);
    }
  }

  function updateSelectionText(value: string) {
    setSelectionText(value);
    setEstimate(null);
  }

  function prepareBoundary(nextMode: Mode) {
    const nextEstimate = buildEstimate(nextMode, selectionText);
    setEstimate(nextEstimate);
    setMessage(nextEstimate.reason);
    return nextEstimate;
  }

  function runAssistant() {
    if (estimate?.run_type !== mode) {
      prepareBoundary(mode);
      return;
    }
    const nextEstimate = estimate?.run_type === mode ? estimate : prepareBoundary(mode);
    const receipt = maybeCreateReceipt(nextEstimate);
    if (!selectedDocument) {
      syncSelection();
    }

    if (mode === "ask") {
      const citation = buildCitation("seg-1", selectionText);
      setAskAnswer(buildAskAnswer(selectionText, question));
      setSelectedSource(citation);
      addTimeline("ask_run", "Ask completed", question);
      setMessage(receipt ? `Ask completed with provider receipt ${receipt.id}.` : "Ask completed with cited support.");
      return;
    }

    if (mode === "revise") {
      const citation = buildCitation("seg-1", selectionText);
      setDraftText(buildDraftSuggestion(selectionText));
      setDraftRationale(buildDraftRationale(selectionText));
      setSelectedSource(citation);
      addTimeline("revise_run", "Draft completed", instruction);
      setMessage(receipt ? `Draft completed with provider receipt ${receipt.id}.` : "Draft completed with suggested language.");
      return;
    }

    const reviewFindings = buildFindings(selectionText);
    setFindings(reviewFindings);
    setSelectedFindingId(reviewFindings[0]?.id ?? "");
    setSelectedSource(reviewFindings[0]?.citations[0] ?? null);
    addTimeline("review_run", "Review completed", `${reviewFindings.length} finding(s) generated from the prototype document.`);
    setMessage(receipt ? `Review completed with provider receipt ${receipt.id}.` : "Review completed with citation-linked findings.");
  }

  function maybeCreateReceipt(nextEstimate: Estimate) {
    if (!nextEstimate.receipt_required) {
      return null;
    }
    const receipt: Receipt = {
      id: `receipt-${receipts.length + 1}`,
      run_type: nextEstimate.run_type,
      provider: nextEstimate.provider,
      model: nextEstimate.model,
      route_posture: nextEstimate.route_posture,
      reason: nextEstimate.reason,
      created_at: new Date().toISOString()
    };
    setReceipts((current) => [receipt, ...current]);
    addTimeline("provider_receipt", "Provider route approved", `${receipt.provider} / ${receipt.model}: ${receipt.reason}`);
    return receipt;
  }

  function createTaskFromFinding(finding: Finding) {
    const task = createTask({
      kind: "finding",
      title: finding.title,
      description: finding.explanation,
      source_anchor: finding.citations[0]?.quote
    });
    setTasks((current) => [task, ...current]);
    addTimeline("task", `Task created: ${task.title}`, task.description ?? task.kind);
    setMessage("Created a document task from the finding.");
  }

  function createTaskFromDraft() {
    const task = createTask({
      kind: "draft",
      title: "Review suggested language",
      description: draftText ?? instruction,
      source_anchor: selectionText
    });
    setTasks((current) => [task, ...current]);
    addTimeline("task", `Task created: ${task.title}`, task.description ?? task.kind);
    setMessage("Created a follow-up task from the draft.");
  }

  function updateTaskStatus(task: Task, status: TaskStatus) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    addTimeline("task", `Task ${status.replace("_", " ")}`, task.title);
  }

  function addTimeline(eventType: string, title: string, detail: string) {
    const now = new Date().toISOString();
    setTimeline((current) => [
      {
        id: `event-${current.length + 1}`,
        event_type: eventType,
        title,
        detail,
        created_at: now
      },
      ...current
    ]);
  }

  return (
    <main className="page-shell workbench-shell">
      <section className="workbench-topbar">
        <div>
          <p className="eyebrow">Skua / Lawyer Workbench Preview</p>
          <h1>Word-native workflow state</h1>
          <p className="muted-text">Tasks, timeline, checklist, and provider receipts stay beside the assistant loop.</p>
        </div>
        <div className="topbar-actions">
          <label className="field compact-field">
            <span>Scenario</span>
            <select value={scenarioId} onChange={(event) => loadScenario(event.target.value)}>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
              ))}
            </select>
          </label>
          <label className="field compact-field">
            <span>Matter</span>
            <select value={workspaceName} onChange={() => undefined}>
              <option>{workspaceName}</option>
            </select>
          </label>
        </div>
      </section>

      {message ? <div className="inline-alert success">{message}</div> : null}

      <section className="prototype-strip" aria-label="Prototype boundaries">
        <div>
          <span>Mode</span>
          <strong>Frontend only</strong>
        </div>
        <div>
          <span>Identity</span>
          <strong>None</strong>
        </div>
        <div>
          <span>Network</span>
          <strong>No API calls</strong>
        </div>
        <div>
          <span>Storage</span>
          <strong>React state</strong>
        </div>
      </section>

      <section className="workbench-grid">
        <aside className="document-rail">
          <PanelTitle label="Matter" title={selectedDocument?.name ?? "Preview selection"} />
          <label className="field">
            <span>Document version</span>
            <select value={documentId} onChange={(event) => selectDocumentVersion(event.target.value)}>
              <option value="">Preview selection only</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  v{document.version_number} / {document.name}
                </option>
              ))}
            </select>
          </label>

          <div className="source-box">
            <div className="section-head-inline">
              <span className="section-label">Selection simulator</span>
              <button className="ghost-button compact" onClick={syncSelection} type="button">
                Sync
              </button>
            </div>
            <textarea value={selectionText} onChange={(event) => updateSelectionText(event.target.value)} />
          </div>

          <div className="source-list">
            <PanelTitle label="Source" title="Parsed snippets" />
            {currentSegments.slice(0, 8).map((segment) => (
              <SourceSnippet
                key={segment.id}
                segment={segment}
                active={selectedSource?.document_segment_id === segment.id}
              />
            ))}
          </div>
        </aside>

        <section className="assistant-workbench">
          <div className="workbench-card">
            <div className="section-head-inline">
              <PanelTitle label="Assistant" title="Ask, Draft, Review" />
              <span className="status-pill">{mode === "revise" ? "draft" : mode}</span>
            </div>
            <div className="mode-row">
              {(["ask", "revise", "review"] as const).map((item) => (
                <button className={mode === item ? "mode-button active" : "mode-button"} key={item} onClick={() => {
                  setMode(item);
                  setEstimate(null);
                }} type="button">
                  {item === "revise" ? "Draft" : item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>

            <BoundaryStrip estimate={estimate} />

            {mode === "ask" ? (
              <label className="field">
                <span>Question</span>
                <textarea value={question} onChange={(event) => {
                  setQuestion(event.target.value);
                  setEstimate(null);
                }} />
              </label>
            ) : null}
            {mode === "revise" ? (
              <label className="field">
                <span>Draft instruction</span>
                <textarea value={instruction} onChange={(event) => {
                  setInstruction(event.target.value);
                  setEstimate(null);
                }} />
              </label>
            ) : null}
            {mode === "review" ? (
              <div className="source-box">
                <span className="section-label">Playbook</span>
                <p>Customer SaaS review</p>
              </div>
            ) : null}

            <button onClick={runAssistant} type="button">
              {estimate?.run_type === mode ? `Run ${mode === "revise" ? "Draft" : mode}` : "Review boundary"}
            </button>
          </div>

          <RunResults
            askAnswer={askAnswer}
            draftText={draftText}
            draftRationale={draftRationale}
            findings={findings}
            selectedFinding={selectedFinding}
            selectedFindingId={selectedFindingId}
            setSelectedFindingId={setSelectedFindingId}
            setSelectedSource={setSelectedSource}
            createTaskFromFinding={createTaskFromFinding}
            createTaskFromDraft={createTaskFromDraft}
            activeCitation={buildCitation("seg-1", selectionText)}
          />
        </section>

        <aside className="workflow-rail">
          <ChecklistPanel checklist={checklist} />
          <ReceiptsPanel receipts={receipts} />
          <TasksPanel tasks={tasks} updateTaskStatus={updateTaskStatus} />
          <TimelinePanel timeline={timeline} />
        </aside>
      </section>
    </main>
  );
}

function PanelTitle({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <h2>{title}</h2>
    </div>
  );
}

function BoundaryStrip({ estimate }: { estimate: Estimate | null }) {
  return (
    <div className="boundary-strip">
      <div>
        <span>Provider</span>
        <strong>{estimate ? `${estimate.provider} / ${estimate.model}` : "Prototype route"}</strong>
      </div>
      <div>
        <span>Route</span>
        <strong>{estimate?.route_posture.replace("_", " ") ?? "pending"}</strong>
      </div>
      <div>
        <span>Scope</span>
        <strong>{estimate?.scope_label ?? "preview selection"}</strong>
      </div>
      <div>
        <span>Retention</span>
        <strong>{estimate?.retention_policy ?? "Prototype session only"}</strong>
      </div>
    </div>
  );
}

function SourceSnippet({ segment, active }: { segment: SourceSegment; active: boolean }) {
  return (
    <article className={active ? "source-snippet active" : "source-snippet"}>
      <span>{segment.segment_type} {segment.ordinal}</span>
      <p>{segment.text}</p>
    </article>
  );
}

function RunResults({
  askAnswer,
  draftText,
  draftRationale,
  findings,
  selectedFinding,
  selectedFindingId,
  setSelectedFindingId,
  setSelectedSource,
  createTaskFromFinding,
  createTaskFromDraft,
  activeCitation
}: {
  askAnswer: string | null;
  draftText: string | null;
  draftRationale: string | null;
  findings: Finding[];
  selectedFinding: Finding | null;
  selectedFindingId: string;
  setSelectedFindingId: (id: string) => void;
  setSelectedSource: (citation: Citation | null) => void;
  createTaskFromFinding: (finding: Finding) => void;
  createTaskFromDraft: () => void;
  activeCitation: Citation;
}) {
  return (
    <div className="workbench-card result-card">
      <PanelTitle label="Results" title="Run output" />
      {askAnswer ? (
        <article className="result-block">
          <span className="status-pill">completed</span>
          <p>{askAnswer}</p>
          <CitationButtons citations={[activeCitation]} setSelectedSource={setSelectedSource} />
        </article>
      ) : null}
      {draftText ? (
        <article className="result-block">
          <div className="section-head-inline">
            <span className="status-pill">completed</span>
            <button className="ghost-button compact" onClick={createTaskFromDraft} type="button">Task</button>
          </div>
          <p>{draftText}</p>
          {draftRationale ? <p className="muted-text">{draftRationale}</p> : null}
          <CitationButtons citations={[activeCitation]} setSelectedSource={setSelectedSource} />
        </article>
      ) : null}
      {findings.length > 0 ? (
        <div className="review-result-grid">
          <div className="finding-list">
            {findings.map((finding) => (
              <button className={finding.id === selectedFindingId ? "finding-button active" : "finding-button"} key={finding.id} onClick={() => {
                setSelectedFindingId(finding.id);
                setSelectedSource(finding.citations[0] ?? null);
              }} type="button">
                <span>{finding.severity}</span>
                <strong>{finding.title}</strong>
              </button>
            ))}
          </div>
          {selectedFinding ? (
            <article className="result-block">
              <div className="section-head-inline">
                <span className={`status-pill severity-${selectedFinding.severity}`}>{selectedFinding.severity}</span>
                <button className="ghost-button compact" onClick={() => createTaskFromFinding(selectedFinding)} type="button">Task</button>
              </div>
              <h3>{selectedFinding.title}</h3>
              <p>{selectedFinding.explanation}</p>
              {selectedFinding.redline_text ? <blockquote>{selectedFinding.redline_text}</blockquote> : null}
              <CitationButtons citations={selectedFinding.citations} setSelectedSource={setSelectedSource} />
            </article>
          ) : null}
        </div>
      ) : null}
      {!askAnswer && !draftText && findings.length === 0 ? (
        <div className="empty-state">Run Ask, Draft, or Review to populate output here.</div>
      ) : null}
    </div>
  );
}

function CitationButtons({
  citations,
  setSelectedSource
}: {
  citations: Citation[];
  setSelectedSource: (citation: Citation | null) => void;
}) {
  return (
    <div className="citation-list">
      {citations.map((citation) => (
        <button className="citation-button" key={citation.id} onClick={() => setSelectedSource(citation)} type="button">
          <strong>{citation.label}</strong>
          <span>{citation.quote}</span>
        </button>
      ))}
    </div>
  );
}

function ChecklistPanel({ checklist }: { checklist: Array<{ key: string; label: string; status: ChecklistStatus; detail: string }> }) {
  const doneCount = checklist.filter((item) => item.status === "done").length;
  return (
    <div className="workbench-card">
      <PanelTitle label="Checklist" title={`${doneCount}/${checklist.length} done`} />
      <div className="checklist-list">
        {checklist.map((item) => (
          <div className={`checklist-item ${item.status}`} key={item.key}>
            <span>{item.status}</span>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksPanel({
  tasks,
  updateTaskStatus
}: {
  tasks: Task[];
  updateTaskStatus: (task: Task, status: TaskStatus) => void;
}) {
  return (
    <div className="workbench-card">
      <PanelTitle label="Tasks" title={`${tasks.length} document task(s)`} />
      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-item" key={task.id}>
            <span>{task.kind} / {task.status}</span>
            <strong>{task.title}</strong>
            {task.description ? <p>{task.description}</p> : null}
            <div className="task-actions">
              {(["todo", "in_progress", "done", "deferred"] as const).map((status) => (
                <button className={task.status === status ? "mini-button active" : "mini-button"} key={status} onClick={() => updateTaskStatus(task, status)} type="button">
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </article>
        ))}
        {!tasks.length ? <div className="empty-state">Create tasks from findings or draft output.</div> : null}
      </div>
    </div>
  );
}

function ReceiptsPanel({ receipts }: { receipts: Receipt[] }) {
  return (
    <div className="workbench-card">
      <PanelTitle label="Receipts" title={`${receipts.length} provider receipt(s)`} />
      <div className="timeline-list">
        {receipts.map((receipt) => (
          <article className="timeline-item" key={receipt.id}>
            <span>{receipt.route_posture.replace("_", " ")}</span>
            <strong>{receipt.provider} / {receipt.model}</strong>
            <p>{receipt.reason}</p>
          </article>
        ))}
        {!receipts.length ? (
          <div className="empty-state">Approval receipts appear when a prototype route requires explicit review.</div>
        ) : null}
      </div>
    </div>
  );
}

function TimelinePanel({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="workbench-card">
      <PanelTitle label="History" title={`${timeline.length} timeline event(s)`} />
      <div className="timeline-list">
        {timeline.slice(0, 10).map((event) => (
          <article className="timeline-item" key={event.id}>
            <span>{formatDate(event.created_at)}</span>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </article>
        ))}
        {!timeline.length ? <div className="empty-state">Run assistant actions to populate history.</div> : null}
      </div>
    </div>
  );
}

function buildEstimate(runType: Mode, text: string): Estimate {
  const sensitivityFlags = detectSensitivity(text);
  const restricted = sensitivityFlags.some((flag) => flag.includes("health") || flag.includes("restricted"));
  const warning = sensitivityFlags.length > 0;
  return {
    run_type: runType,
    provider: "prototype-provider",
    model: "local-preview",
    route_posture: restricted ? "approval_required" : warning ? "warning" : "allowed",
    receipt_required: restricted,
    reason: restricted
      ? "This scope includes restricted markers and needs an approval receipt in the workflow."
      : warning
        ? "This scope includes sensitivity markers that should stay visible in the workflow."
        : "This provider route is allowed for the current prototype scope.",
    scope_label: "preview selection",
    sensitivity_flags: sensitivityFlags.length ? sensitivityFlags : ["no obvious PII markers detected"],
    retention_policy: "Prototype session only"
  };
}

function buildSegments(text: string): SourceSegment[] {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return (parts.length ? parts : [text]).map((part, index) => ({
    id: `seg-${index + 1}`,
    ordinal: index + 1,
    segment_type: "clause",
    text: part
  }));
}

function buildAskAnswer(text: string, question: string) {
  if (isHealthScenario(text)) {
    return "The clause permits processing personal health information and patient records, including PHIPA-regulated data. That should trigger explicit provider-route approval and a narrower processing purpose before any model work.";
  }
  if (isRestrictedRouteScenario(text)) {
    return "The clause allows client-restricted offshore support access after an approval escalation. The route should stay flagged until the approved support scope, location, and access limits are explicit.";
  }
  if (/suspend|disable/i.test(question + " " + text)) {
    return "The draft lets the vendor suspend immediately and at its sole discretion. A customer-friendly position would add notice, a cure period, and narrow emergency exceptions.";
  }
  return "The answer should stay grounded in the selected clause. This prototype would return a short cited answer or refuse unsupported factual claims.";
}

function buildDraftSuggestion(text: string) {
  if (isHealthScenario(text)) {
    return "Vendor may process personal health information only for the documented support purpose, only with approved safeguards, and only after Customer approves any provider route involving PHIPA-regulated data or processing outside Canada.";
  }
  if (isRestrictedRouteScenario(text)) {
    return "Offshore support access may occur only after Customer's written approval for a named escalation, with least-privilege access, logging, time limits, and no access to client-restricted materials outside the approved scope.";
  }
  return "Vendor may suspend the Services only after written notice and a reasonable cure period, except where immediate suspension is necessary to prevent a verified security threat or comply with law.";
}

function buildDraftRationale(text: string) {
  if (isHealthScenario(text)) {
    return "Narrows health-data processing, makes provider routing explicit, and preserves a visible PHIPA approval checkpoint.";
  }
  if (isRestrictedRouteScenario(text)) {
    return "Turns a broad support access permission into an approval-gated, logged, least-privilege escalation path.";
  }
  return "Adds notice, cure, and narrow emergency exceptions while preserving a security carve-out.";
}

function buildFindings(text: string): Finding[] {
  if (isHealthScenario(text)) {
    return [
      {
        id: "finding-1",
        title: "PHIPA route needs explicit approval",
        severity: "high",
        issue_type: "privacy_route",
        explanation: "The selected clause includes personal health information and patient records. Provider routing should require explicit approval and visible receipt state.",
        redline_text: buildDraftSuggestion(text),
        citations: [buildCitation("seg-1", text)]
      },
      {
        id: "finding-2",
        title: "Purpose and location limits are underspecified",
        severity: "medium",
        issue_type: "data_processing",
        explanation: "The clause should spell out processing purpose, safeguards, subcontractor controls, and any outside-Canada handling.",
        redline_text: "Vendor must process health data only for documented support purposes under approved safeguards, with no outside-Canada processing unless Customer gives prior written approval.",
        citations: [buildCitation("seg-1", text)]
      }
    ];
  }
  if (isRestrictedRouteScenario(text)) {
    return [
      {
        id: "finding-1",
        title: "Restricted support route is too broad",
        severity: "high",
        issue_type: "support_access",
        explanation: "The clause allows offshore support access to customer data without enough limits on personnel, purpose, duration, or logging.",
        redline_text: buildDraftSuggestion(text),
        citations: [buildCitation("seg-1", text)]
      },
      {
        id: "finding-2",
        title: "Approval standard is vague",
        severity: "medium",
        issue_type: "approval",
        explanation: "The escalation should define who approves access, what evidence is needed, and when approval expires.",
        redline_text: "Approval must identify the escalation, support personnel, permitted data, access window, and audit log requirements.",
        citations: [buildCitation("seg-1", text)]
      }
    ];
  }
  return [
    {
      id: "finding-1",
      title: "Suspension right is too broad",
      severity: "high",
      issue_type: "suspension",
      explanation: "The clause allows immediate suspension at the vendor's sole discretion without notice, cure, or emergency limits.",
      redline_text: "Vendor may suspend the Services only after written notice and a reasonable cure period, except for verified security emergencies or legal compliance.",
      citations: [buildCitation("seg-1", text)]
    },
    {
      id: "finding-2",
      title: "Customer remedy path is missing",
      severity: "medium",
      issue_type: "remedies",
      explanation: "The clause does not give the customer escalation, service-credit, or termination rights if suspension is wrongful.",
      redline_text: "Customer may escalate disputed suspensions and receive appropriate service credits for wrongful suspension.",
      citations: [buildCitation("seg-1", text)]
    }
  ];
}

function isHealthScenario(text: string) {
  return /\b(PHIPA|patient|medical|health information)\b/i.test(text);
}

function isRestrictedRouteScenario(text: string) {
  return /\b(client restricted|client-restricted|cross-border|offshore|approval required)\b/i.test(text);
}

function buildCitation(segmentId: string, quote: string): Citation {
  return {
    id: `cite-${segmentId}`,
    label: "Current clause",
    quote,
    document_segment_id: segmentId
  };
}

function createTask(
  payload: Omit<Task, "id" | "status" | "created_at">,
  status: TaskStatus = "todo",
  id = `task-${Date.now()}`
): Task {
  return {
    ...payload,
    id,
    status,
    created_at: new Date().toISOString()
  };
}

function buildChecklist(input: {
  hasDocument: boolean;
  hasReview: boolean;
  hasTasks: boolean;
  tasksCleared: boolean;
  hasReceipts: boolean;
  hasHistory: boolean;
}) {
  return [
    {
      key: "document_synced",
      label: "Document synced",
      status: (input.hasDocument ? "done" : "pending") as ChecklistStatus,
      detail: input.hasDocument ? "A prototype document version is available." : "Sync the current selection."
    },
    {
      key: "review_complete",
      label: "Review run complete",
      status: (input.hasReview ? "done" : "pending") as ChecklistStatus,
      detail: input.hasReview ? "Review findings are available." : "Run Review to populate findings."
    },
    {
      key: "tasks_created",
      label: "Tasks created",
      status: (input.hasTasks ? "done" : "pending") as ChecklistStatus,
      detail: input.hasTasks ? "Document tasks exist for follow-up." : "Create tasks from findings or draft output."
    },
    {
      key: "tasks_cleared",
      label: "Tasks cleared",
      status: (input.tasksCleared ? "done" : input.hasTasks ? "attention" : "pending") as ChecklistStatus,
      detail: input.tasksCleared ? "All tasks are done or deferred." : "Clear or defer open tasks."
    },
    {
      key: "provider_receipts",
      label: "Provider receipts reviewed",
      status: (input.hasReceipts ? "done" : "pending") as ChecklistStatus,
      detail: input.hasReceipts ? "A provider-route receipt was recorded." : "Receipts appear when a route needs approval."
    },
    {
      key: "history_visible",
      label: "History visible",
      status: (input.hasHistory ? "done" : "pending") as ChecklistStatus,
      detail: input.hasHistory ? "Timeline events are visible." : "Assistant actions will add timeline events."
    }
  ];
}

function detectSensitivity(text: string) {
  const flags: string[] = [];
  if (/\b(email|@|phone|ssn|passport)\b/i.test(text)) {
    flags.push("personal data marker");
  }
  if (/\b(PHIPA|patient|medical|health information)\b/i.test(text)) {
    flags.push("restricted health marker");
  }
  if (/\b(client restricted|client-restricted|cross-border|approval required)\b/i.test(text)) {
    flags.push("client restricted route marker");
  }
  return flags;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
