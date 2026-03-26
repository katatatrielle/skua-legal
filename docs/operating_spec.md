Operating Spec: Human-Led, Restart-First Legal Research and Writing Workflow
1. Objective

This workflow exists to produce lawyer-reviewable legal research and writing from mixed human and LLM inputs while minimizing contamination from false, misread, misattributed, or overclaimed authorities.

The system is designed around four commitments:

Authorities must be admitted before they are used.
Substantive defects trigger rollback, not cosmetic revision.
Only clean checkpoints are reusable.
The human decides what survives restart.
2. System rule set
Rule 1 — Search results are not usable authorities

Anything found in search, docs, notes, or external tools is a candidate source only until it passes authority intake.

Rule 2 — No authority may shape an outline or draft before verification

A case, statute, regulation, or secondary source cannot be used in issue framing, rule synthesis, outlining, or drafting until it is admitted into the verified authority registry.

Rule 3 — Upstream substantive defects presumptively taint downstream work

If an authority defect affects the evidentiary basis of a proposition, all dependent artifacts are presumed tainted unless the human overrides.

Rule 4 — Restart is the default remedy for substantive defects

For hard-fail and narrowing defects, the default response is rollback to the last clean checkpoint, not local patching.

Rule 5 — Preserve scaffolds, not contaminated prose

On restart, the system preserves verified authorities, defect history, dependencies, and human instructions. It discards contaminated syntheses, outlines, and prose unless the human explicitly keeps them.

3. Core workflow stages
Stage 0 — Search and research mining
Purpose

Collect candidate authorities, facts, commentary, and background materials.

Inputs
user search
external search tools
databases
case repositories
statutes/regulations
documents and notes
Outputs
research log entries
candidate authority names
raw links/citations
candidate excerpts or notes
Exit condition

Candidate items are ready for authority intake.

Forbidden action

No candidate item may be used to support a proposition in outline or draft.

Stage 1 — Authority intake
Purpose

Determine whether a candidate authority is real and retrievable.

Required checks

For each candidate authority:

Existence check
exact authority found
ambiguous match
not found
Retrieval check
full text retrieved
text unavailable
Pinpoint structure check
paragraph numbering available
page numbering available
neither available
Outputs

Authority registry entry with intake status.

Exit conditions

Authority may move forward only if:

existence = pass
retrieval = pass
Default consequences
ambiguous match → blocked pending human review
not found → invalidated
no text → blocked or invalidated
Stage 2 — Provenance and fit review
Purpose

Determine what the authority actually says and whether it supports the intended proposition.

Required tasks

Using retrieved text:

Excerpt identification
pull the relevant language
record location
Speaker classification
court holding
dicta
quoted authority
party submission
procedural history
background fact
unknown
Fit assessment
supports proposition
supports narrower proposition only
partially supports
does not support
misleading if quoted alone
Danger scan
not adopted by court
quoted out of context
overgeneralized
merely procedural
fact-bound
Outputs

Updated authority registry entry:

excerpt
location
speaker classification
fit status
risk level
verification status
Exit conditions

Authority may be used in outline/draft only if:

speaker classification is not disqualifying
fit status is acceptable
risk is acceptable or specifically accepted by human
Stage 3 — Issue framing and outline
Purpose

Build issue statements, rule structure, and outline using verified authorities only.

Inputs
verified authorities
human instructions
unresolved questions
adverse authorities
strategic goals
Outputs
issue statement
short answer or thesis
section outline
authority-to-section assignments
flagged open questions
Exit conditions

Outline is clean only if every rule/proposition node is linked to verified authorities or explicitly marked as unresolved.

Forbidden action

No unverified authority may anchor a rule statement or section conclusion.

Stage 4 — Section drafting
Purpose

Draft section-level analysis from clean outline nodes.

Inputs
clean outline node
linked verified authorities
relevant facts
style constraints
structure constraints
Outputs
section draft
paragraph-level claim map
authority links for each claim
Exit conditions

Drafted section must expose its claim-authority dependencies.

Default assumption

Draft text is disposable unless its dependencies remain clean.

Stage 5 — Claim-level verification
Purpose

Check each claim in draft sections against linked authorities.

Required tasks

For each material claim:

identify supporting authority
retrieve relevant excerpt
confirm quote/proposition match
confirm speaker/provenance
confirm no overstatement
confirm pinpoint sufficiency
Outputs
claim verification result
defect entries where needed
taint flags for affected artifacts
Exit conditions

Section passes only if all material claims are:

verified
narrowed and regenerated
flagged for human decision
Stage 6 — Final sweep
Purpose

Resolve remaining issues after substantive verification is complete.

Tasks
citation form
McGill formatting
internal consistency
signal use
duplicated propositions
unresolved warnings
omitted adverse authority check
coherence polish
Rule

This stage may clean up presentation. It must not be the first stage discovering foundational authority defects.

4. Core objects and required fields
A. Research Log
Required fields
research_item_id
source_type
source_name
query_or_reference
date_accessed
raw_link_or_locator
candidate_authorities
notes
status
Allowed statuses
unprocessed
mined
abandoned
B. Authority Registry
Required fields
authority_id
authority_type
cited_name
normalized_name
jurisdiction
court_or_body
decision_or_enactment_date
source_database
existence_status
retrieval_status
pinpoint_type
excerpt_text
excerpt_location
speaker_classification
proposition_under_review
fit_status
risk_level
verification_status
status
defect_count
Allowed authority_type
case
statute
regulation
rule
secondary_source
other
Allowed existence_status
pass
ambiguous
fail_not_found
Allowed retrieval_status
pass
fail_no_text
Allowed pinpoint_type
paragraphs
pages
none
Allowed speaker_classification
court_holding
dicta
quoted_authority
party_submission
procedural_history
background_fact
unknown
Allowed fit_status
supports
supports_narrower_only
partial_support
does_not_support
misleading_if_isolated
Allowed risk_level
low
medium
high
Allowed verification_status
not_started
intake_passed
provenance_reviewed
fit_reviewed
verified
verified_with_warning
blocked
invalidated
Allowed status
candidate
eligible
blocked
invalidated
C. Defect Ledger
Required fields
defect_id
defect_type
severity
authority_id
artifact_id
stage_detected
description
required_action
restart_scope_recommended
restart_scope_chosen
status
resolution_note
discovered_by
resolved_by
reopen_count
Allowed severity
critical
major
minor
Allowed status
open
pending_human
resolved
waived
reopened
Allowed restart_scope_recommended / chosen
none
authority_only
proposition
paragraph
section
outline
memo
D. Artifact Graph
Required fields
artifact_id
artifact_type
parent_ids
authority_dependencies
claim_dependencies
taint_status
clean_checkpoint_parent
last_verified_at
status
Allowed artifact_type
proposition
outline_node
paragraph
section
memo
Allowed taint_status
clean
suspect
tainted
Allowed status
draft
verified
invalidated
discarded
5. Checkpoints
Checkpoint 0 — Raw research

Only research log exists. Nothing trusted.

Checkpoint 1 — Clean authority set

Authorities passed existence, retrieval, and preliminary provenance/fit review.

Checkpoint 2 — Clean outline

Outline built only from clean authorities.

Checkpoint 3 — Clean section

Section drafted and claims linked to clean authorities.

Checkpoint 4 — Clean final draft

All sections verified and presentation cleaned.

6. Defect taxonomy
Class 1 — Hard-fail defects

These presumptively require restart.

Codes
AUTH_NOT_FOUND
AUTH_AMBIGUOUS_MATCH
AUTH_WRONG_JURISDICTION
AUTH_WRONG_CASE
TEXT_NOT_RETRIEVED
QUOTE_NOT_FOUND
QUOTE_MISATTRIBUTED
COUNSEL_ARG_AS_LAW
NONADOPTED_QUOTED_SOURCE
PROPOSITION_UNSUPPORTED
ADVERSE_AUTH_OMITTED_MATERIAL
Default severity
critical or major
Default remedy
invalidate or block authority
taint all downstream dependent artifacts
restart from highest tainted node
Class 2 — Narrowing defects

These preserve the authority but defeat the proposition as stated.

Codes
SUPPORTS_NARROWER_ONLY
DICTA_NOT_HOLDING
PROCEDURAL_NOT_SUBSTANTIVE
FACT_BOUND_OVERGENERALIZATION
PARTIAL_SUPPORT_ONLY
PINPOINT_IMPRECISE_BUT_RECOVERABLE
Default severity
major
Default remedy
narrow proposition
re-run fit review
restart affected proposition/paragraph/section as needed
Class 3 — Presentation defects

These usually do not justify restart.

Codes
MCGILL_FORMAT_ERROR
PINPOINT_FORMAT_ERROR
SIGNAL_ERROR
QUOTE_INTEGRATION_ERROR
WEAK_TOPIC_SENTENCE
REDUNDANCY
STYLE_ONLY
Default severity
minor
Default remedy
patch locally
7. Restart policy
Default restart rule

If a defect changes or undermines the legal support for a proposition, restart from the last clean checkpoint that predates the tainted artifact.

Restart decision tree
Step 1

Is the defect substantive or presentational?

presentational → patch
substantive → continue
Step 2

Does the defect invalidate the authority itself?

yes → taint all dependent artifacts and restart from highest tainted node
no → continue
Step 3

Does the authority survive only for a narrower proposition?

yes → rewrite proposition and restart all dependent artifacts using the broader proposition
no → continue
Step 4

Did the defect shape issue framing or section structure?

yes → restart outline or section, not merely sentence-level text
no → restart at proposition or paragraph level
Presumption

When there is doubt between a narrow restart and a broader restart, the system should recommend the broader restart. The human may override.

8. Taint propagation rules
Rule A

Every artifact inherits the authority dependencies of its parents.

Rule B

If an authority is blocked or invalidated, all dependent propositions become tainted.

Rule C

If a tainted proposition anchors an outline node, the outline node becomes tainted.

Rule D

If a tainted outline node anchors a section draft, the section becomes tainted.

Rule E

If a tainted section controls memo structure or thesis, the memo may require higher-scope restart.

9. Preservation rules on restart
Preserve automatically
verified authority entries
open defect entries
resolved defect history
research log
human notes
unresolved questions
clean prompt scaffolds
clean outline nodes unaffected by taint
Discard by default
tainted propositions
tainted outline nodes
tainted paragraphs
tainted sections
tainted synthesized rule statements
tainted case summaries
Human override allowed

The human may retain a discarded artifact as:

background note
example prompt
drafting seed
scrap language for manual reuse

Retained artifacts must remain marked tainted unless fully regenerated from clean dependencies.

10. Human override rules
The human may:
admit an authority with warning
waive a minor defect
narrow restart scope
broaden restart scope
preserve a prompt skeleton
preserve a tainted artifact as non-authoritative scrap
decide that a proposition is strategically abandoned
The human may not silently convert:
invalidated authority into verified authority
tainted artifact into clean artifact
unsupported proposition into supported proposition

Those status changes require new verification.

11. Minimum pass criteria by stage
Stage 1 pass
authority found
text retrieved
Stage 2 pass
excerpt identified
speaker classified
fit acceptable
no unresolved critical defect
Stage 3 pass
every material outline node linked to verified authority or marked unresolved
Stage 4 pass
every material paragraph exposes authority dependencies
Stage 5 pass
every material claim either verified, narrowed and regenerated, or escalated to human
Stage 6 pass
no unresolved critical or major defects
only minor presentational items remain, if any
12. Recommended operating defaults
Default 1

Unverified authorities are invisible to drafting prompts.

Default 2

A model may summarize a source only after text retrieval, not from citation string alone.

Default 3

A quoted passage may not be treated as court law until speaker classification is completed.

Default 4

A proposition marked supports_narrower_only cannot be reused in broader form downstream.

Default 5

Draft regeneration should use the last clean checkpoint as input, not contaminated text plus correction instructions.

Default 6

Every critical defect opens a defect-ledger entry automatically.

Default 7

Every critical or major defect triggers taint propagation automatically.

13. Compact operating example

A model proposes:
“Smith v Jones holds that a party is entitled to rescind whenever disclosure was incomplete.”

Intake
case found: yes
text retrieved: yes
paragraphs available: yes
Provenance review
excerpt found at para 42
speaker classification: party submission quoted by court
fit: does not support proposition
defect: COUNSEL_ARG_AS_LAW
Consequence
authority status: blocked or invalidated for that proposition
proposition tainted
outline node using that rule tainted
section using that outline node tainted
restart scope recommended: section or outline, depending on how central it was
What survives
clean authorities elsewhere
defect record
human note: “Need actual holding on rescission threshold”
maybe the prior section prompt skeleton, if still useful
What is discarded
draft prose built on the false rule