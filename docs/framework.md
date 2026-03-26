# The framework: a human-led, restart-first legal research and writing system
Core thesis

This is not a system that tries to “fix” bad reasoning after the fact. It is a human-led, checkpointed workflow that treats upstream authority defects as contamination events. When contamination appears, the default response is rollback and regeneration from the last clean checkpoint, not incremental self-correction.

The governing assumption is simple:

LLM outputs are cheap; contaminated legal reasoning is expensive.

So the system is designed to preserve only:

- validated authorities,
- defect history,
- dependency links,
- human strategic judgments,
- prompt scaffolds that remain clean.

It is designed to discard:

- contaminated syntheses,
- contaminated outlines,
- contaminated prose,
- contaminated case summaries.

## Design principles

1. Verification moves upstream

Verification does not sit at the end as a final sweep. It begins when an authority first enters the workflow.

2. Search results are not authorities

Search and document review produce candidate inputs only. An authority becomes usable only after deterministic intake and provenance checking.

3. Restart beats patching for substantive defects

Where an authority failure affects the evidentiary basis of a proposition, the downstream work is presumptively tainted.

4. The human decides what survives failure

The system can recommend restart scope, but the human decides whether to keep a prompt skeleton, a narrowed proposition, or nothing at all.

5. State must be explicit

The workflow cannot rely on vague memory. It needs structured objects, statuses, defect codes, and dependency tracking.

## The workflow
### Stage 0 — Search and document mining
Purpose

Generate candidate authorities and factual materials from search, cases, statutes, journal articles, practitioner materials, internal notes, or other tools you are using.

Output

A Research Log, not a set of usable authorities.

Key rule

Nothing from this stage is draft-eligible.

Human role

You run or supervise search using outside tools and decide what is worth sending into authority intake.

### Stage 1 — Authority intake and hard verification
Purpose

Determine whether a candidate authority is real, retrievable, and minimally usable.

Deterministic checks

For each authority, the system should attempt to answer:

Does this authority exist?
- exact match found
- ambiguous match
- not found
Can the text be retrieved?
- yes
- no
Does it have usable paragraph or page markers?
- paragraph numbers available
- page numbers available
- neither
Consequence

Only authorities that survive this stage enter the working authority set.

Restart effect

A failure here kills the authority before it contaminates issue framing or drafting.

### Stage 2 — Provenance and fit verification
Purpose

Determine what the authority actually says, who is speaking, and whether it supports the proposition being considered.

LLM task, bounded by retrieved text

Once the actual excerpt is retrieved, the model may assist with:

Speaker/provenance classification
- court holding
- dicta
- quoted authority
- party submission
- procedural history
- background fact
- unknown
Fit assessment
- supports proposition
- supports narrower proposition only
- partially supports
- does not support
- misleading if quoted alone
Danger detection
- opposing argument presented as law
- quote from another authority without adoption
- passage too fact-specific for generalized claim
- procedural statement used as substantive rule

Key rule

This stage is where authorities become not just “real,” but usable in argument.

Consequence

Only after this stage may an authority be relied upon in outlining or drafting.

### Stage 3 — Issue framing and authority-constrained outline
Purpose

Build legal analysis only from verified authorities.

Inputs
- verified authority registry
- unresolved questions
- human instructions
- known strategic constraints

Output

A clean outline with:

- issue statements,
- rule sections,
- authority assignments,
- open questions,
- adverse authorities flagged where relevant.

Key rule

No authority outside the verified set may anchor an outline node.

Restart effect

If an authority later fails and an outline node depends on it, that node is tainted and may require restart.

### Stage 4 — Section drafting
Purpose

Draft one section at a time from clean outline nodes and clean authorities.

Inputs
- clean section objective
- clean authorities only
- desired structure
- constraints on tone and style

Output

A draft section with claim-level links to authority objects.

Key rule

Drafting is disposable. The section is not a valuable artifact unless its dependencies remain clean.

### Stage 5 — Claim-level verification during drafting

Purpose

Check each claim in draft sections against the underlying authority set.

Task

For each claim:

- identify linked authority
- retrieve the relevant excerpt
- confirm provenance
- confirm fit
- flag overstatement, mismatch, missing pinpoint, or unsupported inference

Key rule

This is not a final holistic “review.” It is a structured claim-evidence check attached to drafting.

Consequence

This stage catches contamination before it spreads into later sections.

### Stage 6 — Final sweep
Purpose

Resolve residual issues after the legal substance is already grounded.

Focus
- formatting
- McGill citation form
- unresolved warnings
- stale pinpoints
- surface coherence
- omitted adverse authority check
- final consistency pass

Key rule

This stage is for cleanup, not first discovery of foundational defects.

## The core objects
1. Research Log

This records what was found during search and review.

Suggested fields:

research_item_id
query_or_source
search_tool
date
raw_link_or_reference
candidate_authorities
notes
status
unprocessed
mined
abandoned

This lets you move on from documents without pretending they are already reliable legal support.

2. Authority Registry

This replaces the passive authority table.

Suggested fields:

authority_id
authority_type
case
statute
regulation
secondary source
cited_name
normalized_name
jurisdiction
court_or_body
decision_date
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
defect_count
verification_status
status
candidate
verified
verified_with_warning
blocked
invalidated

This object is the admissibility gate for legal authorities in the workflow.

3. Defect Ledger

This tracks what went wrong and what happened next.

Suggested fields:

defect_id
authority_id
artifact_id
defect_type
severity
stage_detected
description
required_action
restart_scope_recommended
restart_scope_chosen
resolved_by
resolution
reopen_count
downstream_artifacts_tainted

This is the memory of failure. Without it, the system cannot learn where contamination entered or how it propagated.

4. Artifact Graph

This tracks dependencies across the workflow.

Artifacts include:

authority objects
propositions
outline nodes
paragraphs
sections
final memo

Suggested fields:

artifact_id
artifact_type
parent_ids
authority_dependencies
taint_status
clean_checkpoint_parent
last_verified_at
status

This is what makes restart disciplined rather than ad hoc.

## Clean checkpoints

The system needs explicit checkpoints so restart has a definite target.

Checkpoint 0 — Raw research state

Only the research log exists. Nothing is trusted.

Checkpoint 1 — Clean authority state

Authorities passed existence, retrieval, pinpoint, provenance, and basic fit review.

Checkpoint 2 — Clean outline state

Issue framing and outline are built only from clean authorities.

Checkpoint 3 — Clean section state

A section is drafted and all claims are linked to clean authorities.

Checkpoint 4 — Clean final state

The full draft has passed substantive verification and final presentation review.

## Restart logic

This is the major change.

Default rule

When a defect affects the evidentiary basis of a proposition, the default remedy is restart from the last clean checkpoint, not patching.

Defect classes
Class 1 — Hard-fail defects

These usually require immediate rollback.

Examples:

authority does not exist
wrong case
wrong jurisdiction
quote not found
quoted language is from counsel or another source but presented as court holding
proposition materially unsupported
authority misidentified at intake

Default remedy: invalidate authority and restart from the highest tainted node.

Class 2 — Narrowing defects

These preserve the authority but kill the claim as stated.

Examples:

authority supports only a narrower proposition
statement is dicta rather than holding
statement is procedural only
proposition overreads the case

Default remedy: narrow proposition, then restart affected paragraph, section, or outline node.

Class 3 — Presentation defects

These do not usually justify substantive restart.

Examples:

McGill formatting issue
poor quote integration
weak heading
citation signal problem
awkward sentence

Default remedy: patch locally.

Taint and rollback
Taint rule

Every proposition, outline node, paragraph, and section inherits the dependency structure of the authorities it uses.

If an authority fails, anything depending on it becomes tainted.

Rollback rule

The system should locate the highest tainted node and restart there.

Examples:

bad authority used in one sentence, but that sentence anchors the paragraph’s reasoning → restart paragraph
bad authority anchors a section’s rule explanation → restart section
bad authority shaped issue framing and authority prioritization → restart outline
fake case used across the memo → restart from clean authority state

This is more aggressive than the prior framework, and it should be.

## What survives a restart

Your change implies a clear preservation rule.

Preserve
verified authorities
defect history
human comments
unresolved research questions
clean prompt skeletons
strategic notes that do not depend on failed authorities
Discard by default
contaminated summaries
contaminated outlines
contaminated section drafts
contaminated case writeups
contaminated synthesized rules

The system should assume that prose built from bad premises is not worth saving unless the human explicitly says otherwise.

## The human role

The human is not there to rescue bad generations line by line. The human’s main functions are now:

selecting which candidate materials enter authority intake
deciding whether a defect is material
choosing restart scope where discretion exists
deciding whether to preserve a prompt scaffold
deciding whether a narrowed proposition is worth pursuing
supplying strategic direction after rollback

The system does not replace legal judgment. It creates a cleaner substrate for exercising it.

What is strongest about this revised framework

This version is materially better than the earlier one for five reasons.

1. It attacks garbage-in risk directly

The old authority table could quietly accumulate bad support. The new framework turns authority handling into gated admission plus provenance review.

2. It treats drafts as cheap

That is the right economics for LLM systems. You do not optimize for text preservation; you optimize for valid scaffolding.

3. It separates search from admissible authority

That resolves the earlier confusion between “found something in a doc” and “have a usable legal authority.”

4. It gives failure memory

The defect ledger and artifact graph make it possible to see what went wrong and where restart should occur.

5. It aligns better with legal risk

The workflow is no longer built around generic generation plus late review. It is built around admission control, provenance, and rollback.

The main weakness

The tradeoff is operational overhead.

This framework is heavier. It requires:

structured tracking,
disciplined state management,
consistent authority normalization,
human willingness to discard work,
some friction before drafting begins.

That is a real cost. But for legal research and writing, it is a rational cost. The alternative is polished contamination.

Bottom line

The new framework is:

human-led, authority-gated, provenance-aware, dependency-tracked, and restart-first.

Its central move is to stop treating verification as a late-stage editorial pass and instead make it the admission control system for authorities and claims. Once you do that, the authority table becomes a verified registry, defects become first-class objects, and restart becomes the normal response to substantive failure.