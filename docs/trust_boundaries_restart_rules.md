# CleanRoom Law — Trust Boundaries and Restart Rules

## Goal

Make the system reliable by deciding:
- what must be deterministic
- what may be model-assisted
- what requires human judgment
- what blocks progress
- what triggers restart

---

## Trust Boundary 1 — Research is not authority

Anything pasted into the Research Inbox is untrusted.

ResearchItems may include:
- case names
- citations
- snippets
- notes
- quotes
- propositions

None of these may support an outline node or draft section until converted into an Authority and verified.

---

## Trust Boundary 2 — Authority admission is gated

An Authority may become `eligible` only after passing intake.

### Intake checks
Deterministic first:
- existence status
- retrieval status
- pinpoint availability
- excerpt location

If any of the following occurs, the authority cannot become eligible:
- not found
- ambiguous match unresolved
- no source text
- no usable excerpt for the proposition under review

---

## Trust Boundary 3 — Citation support is claim-specific

A verified authority is not automatically good for every claim.

Every material claim in a draft section must map to a ClaimSupportLink with:
- authority_id
- excerpt_text
- excerpt_location
- speaker_classification
- fit_status
- verification_summary

No ClaimSupportLink, no trusted support.

---

## Trust Boundary 4 — Model output cannot self-promote

Models may:
- classify speaker/provenance
- assess fit
- explain risk
- draft sections
- suggest restart scope

Models may not:
- mark an authority `verified` without passing deterministic intake
- override a blocked or invalidated authority
- convert a tainted section back to clean without re-verification
- silently broaden a proposition beyond fit status

---

## Deterministic vs model-assisted vs human-controlled

### Deterministic
These are tool/code-driven checks:
- exact or high-confidence citation normalization
- existence lookup, if source locator is available
- retrieval success/failure
- pinpoint detection
- exact quote / excerpt match where applicable
- taint propagation
- checkpoint creation
- restart execution

### Model-assisted
These are bounded LLM tasks:
- candidate authority extraction from notes
- speaker/provenance classification
- fit assessment
- risk summary
- claim extraction
- section drafting
- explanation of defects

### Human-controlled
These require user decision:
- verify with warning vs block
- accept narrow fit for strategic use
- choose restart scope when recommendations are borderline
- preserve scrap text or discard it
- abandon a line of argument entirely

---

## Promotion rules

### Authority promotion
`candidate` → `eligible` only if:
- existence_status = `pass`
- retrieval_status = `pass`
- verification_status in:
  - `verified`
  - `verified_with_warning`

### OutlineNode promotion
`draft` → `ready` only if:
- all linked authorities are `eligible`
- no linked critical defects are open

### DraftSection promotion
`draft` → `verified` only if:
- all material claims have ClaimSupportLinks
- no critical or major unresolved defects remain
- taint_status = `clean`

---

## Defect classes

### Hard-fail defects
Default remedy: restart

Examples:
- authority not found
- wrong case
- wrong jurisdiction
- quote not found
- quote misattributed
- counsel argument presented as law
- proposition unsupported

### Narrowing defects
Default remedy: narrow proposition + restart affected artifacts

Examples:
- supports narrower only
- dicta not holding
- procedural not substantive
- fact-bound overgeneralization

### Presentation defects
Default remedy: patch only

Examples:
- formatting
- signal usage
- quote integration
- style

---

## Restart rules

## Rule 1
If an authority defect changes the legal support for a proposition, all downstream artifacts depending on that proposition are presumptively tainted.

## Rule 2
Restart from the highest tainted node, not the lowest visible symptom.

## Rule 3
Preserve clean scaffolding, not contaminated prose.

## Rule 4
Broad restart is preferred over narrow patching when the difference is uncertain.

---

## Taint propagation

### Authority fails
→ linked ClaimSupportLinks become tainted  
→ linked OutlineNodes become suspect or tainted  
→ linked DraftSections become suspect or tainted

### ClaimSupportLink fails
→ paragraph/claim becomes tainted  
→ DraftSection may become tainted  
→ restart recommendation recalculated

### OutlineNode becomes tainted
→ any DraftSection derived from it becomes tainted

---

## Restart scopes

Allowed scopes:
- `authority_only`
- `proposition`
- `outline_node`
- `section`

### Default mapping
- hard-fail authority defect → `section` or `outline_node`
- fit narrowing defect → `proposition` or `section`
- formatting defect → `none`

---

## Preserve vs discard

### Preserve automatically
- Matter
- ResearchItems
- verified Authorities
- clean OutlineNodes
- Checkpoints
- Defect history
- user notes

### Discard by default
- tainted ClaimSupportLinks
- tainted DraftSections
- tainted synthesized rule text
- tainted case summaries generated from failed support

### Optional preserve as scrap
User may keep tainted text as:
- notes
- prompt seed
- drafting scrap

Scrap never regains clean status without regeneration.