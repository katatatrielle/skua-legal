# Open Contracts for Canada - Word Add-in Wireframes

Status: Draft  
Updated: 2026-04-20  
Related:
- `docs/specs/open-contracts-engineering-spec.md`
- `docs/specs/open-contracts-endpoint-contracts.md`

## 1. Design Constraints

- target a task-pane width of 360 to 420 px
- assume the user keeps the pane open while reading and editing in Word
- Word remains the primary canvas
- all apply actions happen locally through Office.js
- default interaction is single-column, stacked, and scannable

## 2. Product Framing

The add-in is the primary surface for the product.

The web console is supportive. It handles account access, playbooks, clause bank, run history, and billing or provider settings, but it should not displace Word for review work.

## 3. Ribbon Entry Points

```text
+----------------------------------------------------------------------------------+
| Skua Contracts                                                                   |
|----------------------------------------------------------------------------------|
| [Open Pane] [Review Selection] [Review Document] [Ask] [Revise Clause]           |
| [Refresh Anchors] [Open Clause Bank]                                             |
+----------------------------------------------------------------------------------+
```

Behavior notes:

- `Open Pane` restores the last active tab
- `Review Selection` opens Review with selection scope locked
- `Review Document` opens Review with full-document scope
- `Revise Clause` opens Revise and preloads the current selection
- `Open Clause Bank` opens the saved fallback surface

## 4. Shared Shell

```text
+--------------------------------------+
| Skua                                 |
| Northshore / Vendor MSA              |
| Buyer | Ontario | v3 | Hosted        |
|--------------------------------------|
| Review Ask Revise Clause Bank PBs    |
|--------------------------------------|
| [Context banner or active run state] |
|                                      |
| [Scrollable tab content]             |
|                                      |
+--------------------------------------+
```

Shared behavior:

- header shows matter, represented party, jurisdiction, document version, and provider mode
- tab rail is sticky
- banner can show `Using selection scope`, `Review running`, or `Budget warning`

## 5. Review Tab

### 5.1 Review setup

Purpose: start a full-document or selection-scoped review run.

```text
+--------------------------------------+
| Review setup                         |
|--------------------------------------|
| Review type                          |
| [ General contract review      v ]   |
|                                      |
| Scope                                |
| ( ) Full document                    |
| (o) Current selection                |
|                                      |
| Represented party                    |
| [ Buyer                       v ]    |
|                                      |
| Contract type                        |
| [ Vendor MSA                  v ]    |
|                                      |
| Playbook                             |
| [ Buyer-side MSA Review       v ]    |
|                                      |
| Output                               |
| [x] Comments                         |
| [x] Tracked changes                  |
| [x] Include fallback language        |
|                                      |
| Spend guardrail                      |
| Warn over $ [ 1.00 ]                 |
|                                      |
| [ Run review ]                       |
+--------------------------------------+
```

### 5.2 Review running

```text
+--------------------------------------+
| Review running                       |
|--------------------------------------|
| Buyer-side MSA Review                |
| [##########...............] 42%      |
|                                      |
| Current step                         |
| Checking assignment and transfer     |
| language against playbook rules.     |
|                                      |
| Findings so far                      |
| High: 1  Medium: 2  Low: 0           |
|                                      |
| [ View partial ] [ Cancel ]          |
+--------------------------------------+
```

### 5.3 Review results

```text
+--------------------------------------+
| Review results                       |
| 6 findings | 2 high | 1 applied      |
|--------------------------------------|
| Filters                              |
| Severity [ All v ] Status [ Open v ] |
|                                      |
| [High] Consent may be required on    |
| change of control                    |
| Assignment | 84% confidence          |
| "Neither party may assign..."        |
| [Jump] [Review]                      |
|--------------------------------------|
| [Medium] Auto-renewal appears to     |
| renew unless notice is given.        |
| Renewal | 78% confidence             |
| [Jump] [Review]                      |
+--------------------------------------+
```

### 5.4 Finding detail

```text
+--------------------------------------+
| < Back                               |
|--------------------------------------|
| Consent may be required on change of |
| control                              |
| [High] Assignment | 84% confidence   |
|                                      |
| Why this matters                     |
| The clause blocks assignment without |
| an affiliate or internal transfer    |
| carve-out.                           |
|                                      |
| Source excerpt                       |
| "Neither party may assign this       |
| Agreement..."                        |
| [ Jump to source ]                   |
|                                      |
| Proposed comment                     |
| +----------------------------------+ |
| | Buyer note: consider adding an  | |
| | affiliate or reorganization     | |
| | carve-out.                      | |
| +----------------------------------+ |
|                                      |
| Proposed redline                     |
| +----------------------------------+ |
| | Neither party may assign...     | |
| | except to an affiliate or in    | |
| | connection with a reorg...      | |
| +----------------------------------+ |
|                                      |
| [ Apply comment ]                    |
| [ Apply redline ]                    |
| [ Mark reviewed ]                    |
| [ Dismiss ]                          |
| [ Save fallback ]                    |
+--------------------------------------+
```

Behavior notes:

- `Apply comment` and `Apply redline` mutate Word locally first, then send a receipt to the API
- if the anchor drifted, show `Anchor moved. Re-select text or refresh anchors.`
- `Save fallback` pushes the suggestion into the clause bank

## 6. Ask Tab

Purpose: ask cited questions without leaving Word.

```text
+--------------------------------------+
| Ask                                  |
|--------------------------------------|
| Scope                                |
| ( ) Full document                    |
| (o) Current selection                |
|                                      |
| Ask a question                       |
| +----------------------------------+ |
| | Does this agreement allow        | |
| | assignment on a change of       | |
| | control?                        | |
| +----------------------------------+ |
|                                      |
| [ Ask ]                              |
|--------------------------------------|
| Answer                               |
| The agreement appears to prohibit    |
| assignment without consent, with no  |
| explicit change-of-control carve-out.|
|                                      |
| Citations                            |
| 1. "Neither party may assign..."     |
| 2. "This Agreement binds successors" |
|                                      |
| Next                                 |
| [ Revise this clause ]               |
+--------------------------------------+
```

Return shape:

- short answer
- confidence
- one to three citations
- optional next-step prompt

## 7. Revise Tab

Purpose: rewrite the selected clause with citations and fallback context.

```text
+--------------------------------------+
| Revise                               |
|--------------------------------------|
| Selected text                        |
| "Neither party may assign this       |
| Agreement without prior consent..."  |
|                                      |
| Instruction                          |
| [ Make this supplier-friendly     ]  |
|                                      |
| Use playbook                         |
| [ Buyer-side MSA Review       v ]    |
|                                      |
| Use saved fallbacks                  |
| [x] Clause bank                      |
|                                      |
| [ Generate revision ]                |
|--------------------------------------|
| Revised clause                       |
| "Neither party may assign this       |
| Agreement without consent, except..."|
|                                      |
| Why                                  |
| Preserves a consent baseline while   |
| adding internal-transfer flexibility.|
|                                      |
| Source and fallback citations        |
| [ Current clause ] [ Saved fallback ]|
|                                      |
| [ Insert with tracked changes ]      |
| [ Copy ]                             |
| [ Save as fallback ]                 |
+--------------------------------------+
```

Important rule: Revise does not auto-mutate the document. The user must explicitly apply or insert the result.

## 8. Clause Bank Tab

Purpose: surface saved fallback language and reusable clause options.

```text
+--------------------------------------+
| Clause Bank                          |
|--------------------------------------|
| Search                               |
| [ assignment carve-out           ]   |
|                                      |
| Filters                              |
| Contract [ MSA v ] Issue [ Assign v ]|
|                                      |
| Saved fallback                       |
| Affiliate carve-out fallback         |
| Buyer-side | Used 7 times            |
| "Neither party may assign..."        |
| [ Insert ] [ Use in Revise ]         |
|--------------------------------------|
| Save current selection               |
| [ Save selected clause ]             |
+--------------------------------------+
```

Behavior notes:

- entries should preserve provenance when created from accepted suggestions
- the tab should support lightweight tagging and recency sorting

## 9. Playbooks Tab

Purpose: manage the rule set behind review behavior.

```text
+--------------------------------------+
| Playbooks                            |
|--------------------------------------|
| Active playbook                      |
| Buyer-side MSA Review                |
|                                      |
| Rules                                |
| [x] Assignment carve-out expected    |
| [x] Auto-renewal requires notice     |
| [x] Liability cap fallback available |
|                                      |
| Preferred fallback language          |
| 3 saved                              |
|                                      |
| [ Open in web console ]              |
+--------------------------------------+
```

The add-in should support light inspection and selection. Full editing can stay in the web console in v1.

## 10. Context and Settings

Purpose: keep the user aware of cost, provider, and matter context without turning the add-in into an admin surface.

```text
+--------------------------------------+
| Settings and context                 |
|--------------------------------------|
| Workspace                            |
| KMC Law                              |
|                                      |
| Matter                               |
| Northshore Vendor MSA                |
|                                      |
| Provider                             |
| Hosted OpenAI                        |
|                                      |
| Spend this month                     |
| $16.70 / $50.00                      |
|                                      |
| [ Open billing and provider settings ]|
+--------------------------------------+
```

## 11. Deferred or Legacy UX

The add-in should not center any of the following in v1:

- broad multi-document diligence tables
- memo drafting workflows
- DD report exports
- deal-room navigation
- admin-heavy governance controls

Those behaviors may remain elsewhere in the repo during transition, but they are not the target Word UX.
