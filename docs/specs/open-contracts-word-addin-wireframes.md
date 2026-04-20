# Open Contracts for Canada - Word Add-in Wireframes

Status: Draft
Updated: 2026-04-19
Related:
- `docs/specs/open-contracts-engineering-spec.md`
- `docs/specs/open-contracts-endpoint-contracts.md`

## 1. Design Constraints

- Target a task pane width of 360 to 420 px.
- Assume the user keeps the pane open while reading and editing the Word document.
- Word remains the primary canvas; the add-in should feel like a sidecar, not a replacement editor.
- All suggestion application happens locally through Office.js.
- The default interaction model is single-column, stacked, scrollable cards.

## 2. Ribbon Entry Points

The task pane is the main UI, but the Word ribbon should provide fast entry points.

```text
+----------------------------------------------------------------------------------+
| Skua Contracts                                                                   |
|----------------------------------------------------------------------------------|
| [Open Pane] [Review Selection] [Review Document] [Ask] [Draft from Library]      |
| [Refresh Anchors] [Export to Project]                                            |
+----------------------------------------------------------------------------------+
```

Behavior notes:

- `Open Pane` restores the last active tab.
- `Review Selection` opens the Review tab with `Scope=Selection`.
- `Review Document` opens the Review tab with `Scope=Full document`.
- `Draft from Library` opens the Draft tab and preloads the current cursor context.

## 3. Shared Shell

Every tab uses the same shell.

```text
+--------------------------------------+
| Skua                                 |
| Maple Acquisition / Vendor MSA       |
| Buyer | Ontario | v3 | Saved         |
|--------------------------------------|
| Review  Ask  Draft  Playbooks  Std   |
|--------------------------------------|
| [Context banner or active run state] |
|                                      |
| [Scrollable tab content]             |
|                                      |
+--------------------------------------+
```

Shared behavior:

- The header always shows project, represented party, jurisdiction, and current document version.
- The tab rail is sticky.
- A contextual banner can show `Review running`, `3 suggestions filtered`, or `Using selection scope`.

## 4. Screen 1 - Review Setup

Purpose: start a full-document or selection-scoped review run.

```text
+--------------------------------------+
| Skua                                 |
| Maple Acquisition / Vendor MSA       |
| Review  Ask  Draft  Playbooks  Std   |
|--------------------------------------|
| Review setup                         |
| Choose how to analyze this document. |
|                                      |
| Review type                          |
| [ General                     v ]    |
|                                      |
| Scope                                |
| ( ) Full document                    |
| (o) Current selection                |
|                                      |
| Represented party                    |
| [ Buyer                       v ]    |
|                                      |
| Jurisdiction                         |
| [ Ontario                     v ]    |
|                                      |
| Audience                             |
| [ Internal                    v ]    |
|                                      |
| Deal context                         |
| [ Share purchase, vendor paper   ]   |
|                                      |
| Markup settings                      |
| [x] Insert comments                  |
| [x] Suggest tracked changes          |
| [x] Include fallback position        |
| Severity threshold                   |
| [ Medium                      v ]    |
|                                      |
| Playbooks                            |
| [x] Commercial Review Canada         |
| [ ] Vendor Paper Sweep               |
|                                      |
| [ Run review ]                       |
+--------------------------------------+
```

Interaction notes:

- If the user launched from `Review Selection`, selection scope is preselected and locked until the pane is reopened.
- If no selection is active, the pane falls back to full-document scope and shows a small inline notice.
- `Run review` creates a `review_run` and transitions into the progress state.

## 5. Screen 2 - Review Running

Purpose: give immediate feedback while suggestions are generated.

```text
+--------------------------------------+
| Review running                       |
|--------------------------------------|
| General review over selection        |
| Buyer | Ontario | Internal           |
|                                      |
| [##########...............] 42%      |
|                                      |
| Current step                         |
| Checking assignment and transfer     |
| language against selected playbooks. |
|                                      |
| Suggestions found so far             |
| High: 1  Medium: 2  Low: 0           |
|                                      |
| [ View partial results ]             |
| [ Cancel ]                           |
+--------------------------------------+
```

Interaction notes:

- `View partial results` is enabled only after the first suggestion is stored.
- Partial results are clearly labeled as incomplete.

## 6. Screen 3 - Review Results List

Purpose: browse, filter, and prioritize suggestions.

```text
+--------------------------------------+
| Review results                       |
| 6 suggestions | 2 high | 1 applied   |
|--------------------------------------|
| Filters                              |
| Severity [ All v ]  Status [ Open v ]|
| Type     [ All v ]                   |
|                                      |
| [High] Consent may be required on    |
| change of control                    |
| Assignment | 84% confidence          |
| "Neither party may assign..."        |
| [Open] [Jump] [Review]               |
|--------------------------------------|
| [Medium] Auto-renewal appears to     |
| renew unless notice is given.        |
| Renewal | 78% confidence             |
| "Initial term of one year..."        |
| [Open] [Jump] [Review]               |
|--------------------------------------|
| [Low] Governing law should be        |
| confirmed against playbook default.  |
| Governing law | 62% confidence       |
| [Reviewed] [Jump] [Review]           |
+--------------------------------------+
```

Interaction notes:

- `Jump` selects the underlying Word range using the stored anchor.
- `Review` opens the detail screen for that suggestion.
- Filters are local once results are loaded.

## 7. Screen 4 - Suggestion Detail

Purpose: inspect one suggestion deeply and decide what to do.

```text
+--------------------------------------+
| < Back to results                    |
|--------------------------------------|
| Consent may be required on change of |
| control                              |
| [High] Assignment | 84% confidence   |
|                                      |
| Why this matters                     |
| The clause prohibits assignment      |
| without consent and does not carve   |
| out affiliate transfers or internal  |
| reorganizations.                     |
|                                      |
| Source excerpt                       |
| "Neither party may assign this       |
| Agreement without prior written      |
| consent..."                          |
| [ Jump to source ]                   |
|                                      |
| Proposed comment                     |
| +----------------------------------+ |
| | Buyer counsel note: consider    | |
| | adding an affiliate or change-  | |
| | of-control carve-out.           | |
| +----------------------------------+ |
|                                      |
| Proposed redline                     |
| +----------------------------------+ |
| | Neither party may assign this   | |
| | Agreement without prior written | |
| | consent, except to an affiliate | |
| | ...                             | |
| +----------------------------------+ |
|                                      |
| [ Apply comment ]                    |
| [ Apply redline ]                    |
| [ Mark reviewed ]                    |
| [ Dismiss ]                          |
| [ Save to playbook ]                 |
+--------------------------------------+
```

Interaction notes:

- `Apply comment` and `Apply redline` first update the document locally, then call the API receipt endpoint.
- If application fails because the anchor drifted, the add-in shows `Anchor moved - reselect text or refresh anchors`.
- `Save to playbook` opens a compact inline form rather than a modal.

## 8. Screen 5 - Ask

Purpose: ask cited questions without leaving Word.

```text
+--------------------------------------+
| Ask                                  |
|--------------------------------------|
| Sources                              |
| [x] Current document                 |
| [x] Current selection                |
| [ ] Uploaded references              |
| [x] Org library                      |
| [ ] Legal sources                    |
| [ ] Web search                       |
|                                      |
| Ask a question                       |
| +----------------------------------+ |
| | Does this agreement allow        | |
| | assignment on a change of       | |
| | control?                        | |
| +----------------------------------+ |
|                                      |
| Answer format                        |
| [ Plain answer                v ]    |
|                                      |
| [ Ask ]                              |
|--------------------------------------|
| Answer                               |
| The agreement appears to prohibit    |
| assignment without consent and does  |
| not include an express change-of-    |
| control carve-out.                   |
|                                      |
| Citations                            |
| - Assignment clause                  |
| - Library precedent note             |
|                                      |
| [ Turn into clause ]                 |
| [ Turn into checklist ]              |
| [ Copy to memo ]                     |
+--------------------------------------+
```

Interaction notes:

- If both customer documents and legal or web sources are used, the answer area splits into `Customer documents` and `Public sources`.
- Citations should jump either to Word anchors or to a side-sheet preview for non-Word sources.

## 9. Screen 6 - Draft from Library

Purpose: find precedent, preview provenance, auto-adjust, and insert at cursor.

```text
+--------------------------------------+
| Draft                                |
|--------------------------------------|
| Mode                                 |
| (o) Draft from library               |
| ( ) Draft from instruction           |
| ( ) Improve existing clause          |
|                                      |
| Search library                       |
| [ assignment clause affiliate     ]  |
|                                      |
| Filters                              |
| Type [ MSA v ] Law [ Ontario v ]     |
| Role [ Customer v ]                  |
|                                      |
| Results                              |
| Customer MSA assignment clause       |
| Ontario | 2025 | Approved form       |
| "Neither party may assign..."        |
| [ Preview ] [ Auto-adjust ]          |
|--------------------------------------|
| Preview                              |
| Source: 2025 Customer MSA            |
| Provenance: Maple Software / signed  |
|                                      |
| Adjusted draft                       |
| +----------------------------------+ |
| | Neither party may assign this   | |
| | Agreement without prior written | |
| | consent, except to an affiliate | |
| | ...                             | |
| +----------------------------------+ |
|                                      |
| [ Insert at cursor ]                 |
| [ Copy text ]                        |
+--------------------------------------+
```

Interaction notes:

- `Auto-adjust` uses the current document style and represented party defaults.
- If the cursor is not in a sensible insertion location, the add-in inserts after the current paragraph and warns the user.

## 10. Screen 7 - Playbooks

Purpose: manage rule packs without leaving Word.

```text
+--------------------------------------+
| Playbooks                            |
|--------------------------------------|
| Scope [ Organization v ]             |
|                                      |
| Commercial Review Canada             |
| v4 | 38 checks                       |
| [ Run ] [ Edit ] [ Export ]          |
|--------------------------------------|
| Vendor Paper Sweep                   |
| v2 | 12 checks                       |
| [ Run ] [ Edit ] [ Export ]          |
|--------------------------------------|
| Import playbook                       |
| [ Choose YAML / JSON file ]          |
|                                      |
| Quick view                            |
| Tabs: Rules | Questions              |
| - coc_consent                        |
| - governing_law                      |
| - liability_cap                      |
+--------------------------------------+
```

Interaction notes:

- Editing can open a compact in-pane editor for metadata plus a "download/edit/reimport" workflow for raw YAML in v1.
- Import validation errors render inline with the line number when available.

## 11. Screen 8 - Standards

Purpose: compare the current document to house standard or precedent corpus.

```text
+--------------------------------------+
| Standards                            |
|--------------------------------------|
| Compare against                      |
| [ House Standard               v ]   |
|                                      |
| Standard pack                        |
| [ Buyer MSA Ontario 2026       v ]   |
|                                      |
| [ Run standards check ]              |
|--------------------------------------|
| Coverage score                       |
| 73.5 / 100                           |
|                                      |
| Missing clauses                      |
| - Affiliate transfer carve-out       |
| - Data localization fallback         |
|                                      |
| Weak clauses                         |
| Assignment clause                    |
| [ Go to ] [ Show fix ] [ Insert fix ]|
|                                      |
| Limitation of liability              |
| [ Go to ] [ Show fix ] [ Insert fix ]|
+--------------------------------------+
```

Interaction notes:

- `Insert fix` reuses the same local Word-application flow as review redlines.
- v1 should label this area `Standards`, not `Market`.

## 12. Empty, Error, and Drift States

### No document context

```text
+--------------------------------------+
| Open a DOCX contract to begin.       |
| Review, Ask, and Draft all require   |
| an active Word document.             |
+--------------------------------------+
```

### Anchor drift

```text
+--------------------------------------+
| Anchor moved                         |
| The source text changed after this   |
| suggestion was created.              |
|                                      |
| [ Jump to closest match ]            |
| [ Refresh anchors ]                  |
| [ Dismiss suggestion ]               |
+--------------------------------------+
```

### Provider blocked

```text
+--------------------------------------+
| Provider not available               |
| Your organization allows only        |
| hosted models for this workspace.    |
|                                      |
| [ View provider settings ]           |
+--------------------------------------+
```

## 13. Implementation Notes

- Build the pane as a React app inside `apps/word-addin`.
- Use Office.js only in a thin adapter layer so the bulk of state and UI logic remains testable in plain React.
- Keep the visual language close to the existing `apps/review` product tone: editorial, calm, and legal-workflow oriented.
- Favor inline disclosure over modal stacks. A narrow pane cannot sustain deep modal nesting well.
- Persist local pane state per document so reopening the pane returns the user to the last active suggestion or tab.
