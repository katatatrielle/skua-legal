# CleanRoom Law — Model and Tool Routing

## Goal

Minimize cost and maximize reliability by routing each task to:
- deterministic code/tools first
- cheap models when possible
- stronger models only when needed

---

## Core routing principle

Use the cheapest component that can safely do the job.

Order of preference:
1. deterministic code/tool
2. cheap fast model
3. strong reasoning model
4. human review

---

## Task classes

## 1. Ingestion and parsing
Tasks:
- split pasted research into items
- extract candidate case names/citations
- detect likely quotations
- normalize simple structure

Default route:
- cheap fast model
- regex / parser support where possible

Reason:
Low stakes and high volume

---

## 2. Authority intake
Tasks:
- normalize citation
- fetch or attach source text if provided
- detect paragraph/page numbering
- locate exact excerpt / quote match

Default route:
- deterministic code/tool first
- no model unless needed for fallback explanation

Reason:
These are binary-ish checks and should not depend on model judgment

---

## 3. Provenance and fit review
Tasks:
- identify who is speaking
- distinguish holding / dicta / quoted authority / party submission
- assess whether excerpt fits proposition
- produce risk summary

Default route:
- strong reasoning model

Reason:
This is legally meaningful classification where sloppy output is dangerous

---

## 4. Outline help
Tasks:
- turn verified authorities into issue/rule/analysis node suggestions
- surface missing support
- suggest ordering

Default route:
- cheap fast model for structure suggestions
- strong model only when the reasoning load is high

Reason:
Outline support matters, but this is still cheaper to redo than draft prose

---

## 5. Section drafting
Tasks:
- draft one section from one outline node
- keep to linked authorities
- preserve style constraints

Default route:
- strong reasoning model

Reason:
This is one of the few tasks where quality beats cheapness

---

## 6. Claim extraction
Tasks:
- split section into material claims
- identify claims worth citation inspection

Default route:
- cheap fast model

Reason:
Useful, repetitive, and restartable

---

## 7. Citation inspector summaries
Tasks:
- produce verification_summary
- explain why support fits or does not fit
- summarize defect impact

Default route:
- cheap fast model if all structured inputs exist
- strong model only if provenance is ambiguous

Reason:
Once structured state exists, explanation is cheap

---

## 8. Restart recommendation
Tasks:
- suggest restart scope
- explain preserve/discard consequences

Default route:
- deterministic rules first
- cheap fast model for explanation layer

Reason:
The recommendation should come from policy, not vibes

---

## Required tool inputs for v1

V1 should support these intake paths:
- pasted case citation
- pasted excerpt
- pasted note
- pasted proposition
- optional source URL
- optional raw source text

V1 should not depend on built-in legal search.

That means:
- if the user has source text or a source URL, run full intake
- if the user has only a bare authority reference, create candidate authority but block deterministic verification until more source information is provided

---

## Provider routing policy

Use a provider abstraction layer so the app can switch models without major code changes.

### Provider classes
- `fast-cheap`
- `strong-reasoning`

Do not hardcode product logic to one model vendor.

---

## Retry policy

### Deterministic failures
No silent retries beyond short transient retry for network issues.

### Model tasks
- one initial call
- one retry only for transient/API failure
- no “ask again until it sounds right”

### Human escalation
Escalate when:
- provenance classification remains ambiguous
- fit assessment is borderline and materially important
- restart scope would discard significant work

---

## Cost rules

### Per-matter goals
- prefer many cheap calls over many strong calls
- keep strong-model calls limited to:
  - provenance/fit
  - section drafting

### Logging
Track:
- task type
- provider class
- tokens
- estimated cost
- latency
- matter_id

### Guardrails
Block expensive drafting if:
- linked authorities are not all eligible
- open critical defects remain
- no clean outline node exists

---

## Prompt assembly rules

### Research parsing prompt
Use only:
- raw ResearchItem text
- matter issue
- extraction schema

### Authority provenance prompt
Use only:
- authority metadata
- exact excerpt
- local surrounding context
- proposition under review
- classification schema

### Section drafting prompt
Use only:
- matter issue
- selected OutlineNode
- linked eligible authorities
- style constraints
- explicit prohibition on unsupported propositions

Never include:
- blocked authorities
- tainted sections
- invalidated claims
- long chat history