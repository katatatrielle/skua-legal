"use client";

import type {
  GeneratedOutput,
  IssueRecord,
  PlatformAdminOverviewRecord,
  PlatformReleaseCriteriaRecord,
  PlatformTrustRecord,
  PlatformUsageSummaryRecord,
  WorkspaceDetail,
  WorkspaceSummary
} from "@skua/schemas";
import { useState } from "react";
import { WorkspaceControls } from "./workspace-controls";

type FilterValue = "all" | string;

const format_label = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const unique_values = (values: string[]) => ["all", ...new Set(values)];

export function ControlRoom({
  ddApiBaseUrl,
  workspace,
  output,
  workspaces,
  selectedWorkspaceId,
  billingSummary,
  trustProfile,
  adminOverview,
  releaseCriteria
}: {
  ddApiBaseUrl: string;
  workspace: WorkspaceDetail;
  output: GeneratedOutput;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string;
  billingSummary: PlatformUsageSummaryRecord | null;
  trustProfile: PlatformTrustRecord | null;
  adminOverview: PlatformAdminOverviewRecord | null;
  releaseCriteria: PlatformReleaseCriteriaRecord | null;
}) {
  const [severity, setSeverity] = useState<FilterValue>("all");
  const [status, setStatus] = useState<FilterValue>("all");
  const [issueType, setIssueType] = useState<FilterValue>("all");
  const [docType, setDocType] = useState<FilterValue>("all");

  const severityOptions = unique_values(workspace.issues.map((issue) => issue.severity));
  const statusOptions = unique_values(workspace.issues.map((issue) => issue.status));
  const issueTypeOptions = unique_values(workspace.issues.map((issue) => issue.issue_type));
  const docTypeOptions = unique_values(workspace.documents.map((document) => document.doc_type));

  const documentMap = new Map(workspace.documents.map((document) => [document.id, document]));

  const filteredIssues = workspace.issues.filter((issue) => {
    const document = documentMap.get(issue.document_id);

    if (severity !== "all" && issue.severity !== severity) {
      return false;
    }
    if (status !== "all" && issue.status !== status) {
      return false;
    }
    if (issueType !== "all" && issue.issue_type !== issueType) {
      return false;
    }
    if (docType !== "all" && document?.doc_type !== docType) {
      return false;
    }

    return true;
  });

  const openIssueCount = workspace.issues.filter((issue) => issue.status === "open").length;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Skua / Control Room</p>
          <h1>{workspace.workspace.name}</h1>
          <p className="hero-text">
            Manage matter data, inspect citations, watch usage, and verify the security posture behind the Word assistant.
          </p>
          <p className="muted-text">{workspace.workspace.stage}</p>
        </div>
        <div className="hero-metrics">
          <MetricCard label="Documents" value={String(workspace.workspace.document_count)} />
          <MetricCard label="Findings" value={String(workspace.workspace.issue_count)} />
          <MetricCard
            label="High severity"
            value={String(workspace.workspace.high_severity_count)}
          />
          <MetricCard label="Open findings" value={String(openIssueCount)} />
        </div>
      </section>

      <WorkspaceControls
        ddApiBaseUrl={ddApiBaseUrl}
        selectedWorkspaceId={selectedWorkspaceId}
        workspaces={workspaces}
      />

      <section className="playbook-strip">
        {workspace.workspace.playbook_names.map((playbookName) => (
          <span className="playbook-pill" key={playbookName}>
            {playbookName}
          </span>
        ))}
      </section>

      <section className="grid-layout">
        <div className="panel issue-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Document QA</p>
              <h2>Cited findings and source anchors</h2>
            </div>
            <p className="muted-text">
              Filter support-side findings without moving the main workflow out of Word.
            </p>
          </div>

          <div className="filter-row">
            <FilterSelect
              label="Severity"
              value={severity}
              options={severityOptions}
              onChange={setSeverity}
            />
            <FilterSelect
              label="Status"
              value={status}
              options={statusOptions}
              onChange={setStatus}
            />
            <FilterSelect
              label="Issue type"
              value={issueType}
              options={issueTypeOptions}
              onChange={setIssueType}
            />
            <FilterSelect
              label="Document type"
              value={docType}
              options={docTypeOptions}
              onChange={setDocType}
            />
          </div>

          <div className="table-scroll">
            <table className="issue-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Document</th>
                  <th>Counterparty</th>
                  <th>Key dates</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => (
                    <IssueRow
                      issue={issue}
                      documentName={documentMap.get(issue.document_id)?.name ?? issue.document_id}
                      key={issue.id}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No issues match the current filters yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel side-panel">
          <div className="stack">
            <div>
              <p className="section-label">Matter Signal</p>
              <h2>Top document points</h2>
            </div>
            <ul className="text-list">
              {workspace.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>

          <div className="stack">
            <div>
              <p className="section-label">Document Brief</p>
              <h2>{output.memo_title}</h2>
            </div>
            <div className="memo-sections">
              {output.memo_sections.map((section) => (
                <article className="memo-card" key={section.heading}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="stack">
            <div>
              <p className="section-label">Action callouts</p>
              <h2>Assistant-ready issues</h2>
            </div>
            <ul className="text-list">
              {output.exceptions_list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="stack">
            <div>
              <p className="section-label">Billing</p>
              <h2>Usage and caps</h2>
            </div>
            {billingSummary ? (
              <div className="memo-sections">
                <article className="memo-card">
                  <h3>{billingSummary.plan_type} plan</h3>
                  <p>
                    Current month spend ${billingSummary.actual_cost.toFixed(2)} across {billingSummary.run_count} run(s).
                    Warning at ${billingSummary.warning_threshold.toFixed(2)} and hard cap at ${billingSummary.hard_cap.toFixed(2)}.
                  </p>
                </article>
              </div>
            ) : (
              <p className="muted-text">Billing data is available when the support surface is running with a support token.</p>
            )}
          </div>

          <div className="stack">
            <div>
              <p className="section-label">Trust</p>
              <h2>Data posture</h2>
            </div>
            {trustProfile ? (
              <div className="memo-sections">
                <article className="memo-card">
                  <h3>Stored data</h3>
                  <p>{trustProfile.storage_summary.join(" ")}</p>
                </article>
                <article className="memo-card">
                  <h3>Deletion and BYOK</h3>
                  <p>{trustProfile.delete_behavior.join(" ")} {trustProfile.byok_behavior.join(" ")}</p>
                </article>
              </div>
            ) : (
              <p className="muted-text">Trust details are unavailable.</p>
            )}
          </div>

          {adminOverview ? (
            <div className="stack">
              <div>
                <p className="section-label">Admin</p>
                <h2>Support view</h2>
              </div>
              <div className="memo-sections">
                <article className="memo-card">
                  <h3>Failures</h3>
                  <p>
                    {adminOverview.failed_job_count} failed run(s), {adminOverview.parse_failure_count} parse failure(s), and {adminOverview.usage_anomaly_count} usage anomaly/anomalies.
                  </p>
                </article>
                {adminOverview.support_lookup ? (
                  <article className="memo-card">
                    <h3>User lookup</h3>
                    <p>
                      {adminOverview.support_lookup.email} has {adminOverview.support_lookup.workspace_ids.length} workspace(s), {adminOverview.support_lookup.provider_config_count} provider config(s), and ${adminOverview.support_lookup.current_month_actual_cost.toFixed(2)} in current-month spend.
                    </p>
                  </article>
                ) : null}
              </div>
            </div>
          ) : null}

          {releaseCriteria ? (
            <div className="stack">
              <div>
                <p className="section-label">Readiness</p>
                <h2>{releaseCriteria.ready_for_pilot ? "Ready for controlled use" : "Readiness gates open"}</h2>
              </div>
              <div className="memo-sections">
                <article className="memo-card">
                  <h3>Status</h3>
                  <p>
                    Evaluated at {new Date(releaseCriteria.evaluated_at).toLocaleString()} with {releaseCriteria.metrics.length} tracked release metric(s).
                  </p>
                  <p>
                    {releaseCriteria.ready_for_pilot
                      ? "All tracked thresholds are currently passing."
                      : `${releaseCriteria.gating_failures.length} gating issue(s) still need attention before controlled use.`}
                  </p>
                </article>
                {releaseCriteria.metrics.map((metric) => (
                  <article className="memo-card" key={metric.key}>
                    <h3>{metric.label}</h3>
                    <p>
                      {format_release_metric(metric)} against a {format_release_threshold(metric)} threshold.
                    </p>
                    <p>
                      Sample size {metric.sample_size}/{metric.minimum_sample_size}. {metric.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="stack">
            <div>
              <p className="section-label">Operator Kit</p>
              <h2>Controlled-use bundle</h2>
            </div>
            <div className="memo-sections">
              <article className="memo-card">
                <h3>Starter docs</h3>
                <p>
                  Sample matters and baseline contract text live under <code>docs/pilot/samples</code> for fast workspace setup and smoke testing.
                </p>
              </article>
              <article className="memo-card">
                <h3>Onboarding</h3>
                <p>
                  The controlled-use runbook, sample matters, and issue reporting flow are documented in <code>docs/pilot/pilot-kit.md</code> and <code>docs/pilot/issue-reporting.md</code>.
                </p>
              </article>
              <article className="memo-card">
                <h3>Computer-control tests</h3>
                <p>
                  The Word-host validation pass is scripted in <code>docs/testing/phase10-computer-control-test-plan.md</code>.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function format_release_metric(metric: PlatformReleaseCriteriaRecord["metrics"][number]) {
  if (metric.unit === "percent") {
    return `${(metric.value * 100).toFixed(1)}%`;
  }
  if (metric.unit === "usd") {
    return `$${metric.value.toFixed(4)}`;
  }
  return String(metric.value);
}

function format_release_threshold(metric: PlatformReleaseCriteriaRecord["metrics"][number]) {
  const value = metric.unit === "percent"
    ? `${(metric.threshold * 100).toFixed(1)}%`
    : metric.unit === "usd"
      ? `$${metric.threshold.toFixed(2)}`
      : String(metric.threshold);
  return `${metric.comparator === "gte" ? "minimum" : "maximum"} ${value}`;
}
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: FilterValue;
  options: string[];
  onChange: (value: FilterValue) => void;
}) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : format_label(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function IssueRow({
  issue,
  documentName
}: {
  issue: IssueRecord;
  documentName: string;
}) {
  const primaryCitation = issue.citations[0];
  const keyDates = issue.key_dates.map((entry) => `${format_label(entry.label)}: ${entry.value}`);

  return (
    <tr>
      <td>
        <div className="issue-cell">
          <strong>{issue.title}</strong>
          <p>{issue.summary}</p>
        </div>
      </td>
      <td>
        <span className={`badge badge-${issue.severity}`}>{format_label(issue.severity)}</span>
      </td>
      <td>
        <span className="badge badge-neutral">{format_label(issue.status)}</span>
      </td>
      <td>{documentName}</td>
      <td>{issue.counterparties.join(", ") || "Not extracted"}</td>
      <td>{keyDates.length > 0 ? keyDates.join(" / ") : "None flagged"}</td>
      <td>
        <div className="citation-cell">
          <span>
            p. {primaryCitation.page_start}
            {primaryCitation.page_start !== primaryCitation.page_end
              ? `-${primaryCitation.page_end}`
              : ""}
          </span>
          <span>{primaryCitation.section_heading}</span>
          <blockquote>{primaryCitation.quoted_snippet}</blockquote>
        </div>
      </td>
    </tr>
  );
}
