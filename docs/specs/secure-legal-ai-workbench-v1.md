# Secure Legal AI Workbench - v1 Product Contract

Status: Active
Updated: 2026-04-27

## 1. Wedge

Lawyers already want to use Claude, Codex, and similar frontier-model tools for client work. The blocker is not interest. The blocker is whether they can use those tools without violating confidentiality, PII obligations, data-hosting expectations, retention rules, or client-specific provider restrictions.

Skua v1 is the secure legal workbench for that job.

The product is not trying to beat every legal drafting or contract-review tool. It gives lawyers a safe, Word-native way to use powerful AI on real client material.

## 2. Product Shape

Skua should feel like a legal Cursor:

- the matter is the project root
- Word is the primary editor
- the assistant has modes instead of separate product areas
- citations and suggested edits stay close to the document
- provider, data, audit, cost, and retention posture are first-class

The active app surfaces are:

- `apps/word-addin`: primary lawyer workflow
- `apps/web`: control room for uploads, matter status, billing, trust, support, and readiness
- `services/api`: auth, document sync, context retrieval, provider policy, assistant runs, memory, trust, audit
- `services/worker`: background parse/run processing

## 3. v1 User Jobs

The lawyer should be able to:

- sync the current Word document or selected clause into a matter
- ask a factual question and receive a cited answer or refusal
- ask for suggested language and apply it as a Word edit
- run a bounded review when they need issue spotting
- save reusable language into workspace memory
- see what data will be sent to which provider before a run
- delete synced documents and understand retention behavior
- inspect audit, usage, and cost history

## 4. Assistant Modes

The Word add-in has one primary assistant surface.

### Ask

Ask answers must be short, factual, and grounded in the current matter or current selection. Unsupported factual questions must be refused.

### Draft

Draft mode produces `Suggested language`. The user can replace the current selection, insert after the selection, copy, or save the language to memory.

### Review

Review mode is still useful, but it is a mode of the assistant, not the whole product. Findings must include source anchors and citations.

Future modes such as summarize, compare, and explain can be added only if they reuse the same data-boundary contract.

## 5. Data Boundary Contract

Every assistant run should resolve and log:

- workspace and matter
- document version or selection scope
- provider and model policy
- hosted vs BYOK mode
- estimated tokens and cost
- PII/confidential-data flags when available
- retention policy
- audit event ID

Before pilots, the UI should make the provider, plan, scope, and retention posture visible near the run controls. The API should keep durable audit and usage records for every run.

## 5.1 Canada and Ontario Privacy Posture

The active privacy requirements file is `docs/privacy/canada-ontario-privacy-requirements.md`.
The active hosting and model-routing plan is `docs/privacy/hosting-and-model-routing-plan.md`.

For Canada/Ontario pilots, Skua should be designed around:

- PIPEDA accountability, consent, limiting collection/use/disclosure/retention, safeguards, openness, access, and breach-record expectations
- Ontario FIPPA/MFIPPA public-sector collection authority, notice, PIA, safeguards, retention, breach, and reporting expectations
- Ontario Bill 194 / Enhancing Digital Security and Trust Act AI accountability, risk-management, disclosure, documentation, and human-oversight readiness for public-sector deployments
- PHIPA-sensitive matter controls when documents may contain personal health information
- Law Society of Ontario confidentiality expectations for client information and cloud/provider use

This means the v1 privacy roadmap is not just policy copy. It needs product-enforced controls: matter compliance profiles, provider allow/deny lists, data-residency posture, PIA export packets, breach/incident records, and explicit pre-run confirmations for sensitive or cross-border provider use.

The model-routing posture is:

- client legal content stays on Canada-approved routes by default
- a named `self_hosted_qwen_ca` route should cover Canada-resident open-model classification, redaction, routing, and restricted-matter fallback workflows after evaluation
- external SOTA proprietary models are allowed for public reference, Skua internal planning, code, and approved anonymized planning
- difficult matter-specific tasks can escalate to external models only through explicit user approval and a logged provider receipt
- the lawyer UI must show why a route is allowed, warned, or blocked before the run starts

## 6. Output Rules

User-visible model output must follow these rules:

- factual answers need citations
- unsupported claims need refusal
- suggested language must be labeled as suggested language
- review findings need source anchors
- generated edits must be easy to apply in Word
- low confidence should be visible, not hidden

## 7. Kept Capabilities

Keep and continue to improve:

- Word document and selection sync
- parsing, citation, and anchor relocation
- Word comments, redlines, insertion, copy, and undo
- auth, workspaces, matters, and membership checks
- provider config, BYOK validation, encrypted secret storage
- usage ledger, spend estimates, billing summaries, and hard caps
- trust profile, deletion controls, retention posture, and audit events
- workspace clause memory and preference signals

## 8. Quarantined Capabilities

Do not extend these as active product areas:

- DD report generation
- workflow templates
- standards governance
- broad web-based review workspaces
- market comparison, benchmarking, or legal research
- enterprise admin beyond what trust and support require

They should stay out of the active app packages. If any internals remain in the backend, treat them as implementation inventory, not product direction.

## 9. Near-Term Implementation Backlog

### Phase 41 - Reset Active Product Story

- rewrite active docs around secure legal AI workbench
- change package/app descriptions
- make the Word add-in open on one assistant surface
- trim support web copy to control-room language
- stop fetching DD workflow data in the active web path

### Phase 42 - Data Boundary UX

- show provider, plan, document scope, and retention posture near run controls
- add a single pre-run boundary summary for ask, draft, and review
- make spend-estimate warnings consistent across modes

### Phase 43 - Real Provider Bridge

- add one provider-backed assistant path behind current provider policy
- keep deterministic fallback for tests
- log provider, model, tokens, cost, and audit event for every run

### Phase 44 - Canada/Ontario Privacy Guardrails

- add matter compliance profiles for private-sector, Ontario public-sector, and PHIPA-sensitive matters
- add provider registry metadata for data residency, training use, retention, subprocessors, contract status, and cross-border transfer notice text
- add `self_hosted_qwen_ca` and managed-Qwen route records, with managed Qwen blocked for Canada-strict matters unless the registry proves Canada-only processing
- enforce provider/storage policy before assistant runs
- add PIA packet and breach/incident ledger endpoints
- surface red/yellow/green data-boundary posture in the add-in and control room

### Phase 45 - Lawyer UI Preview

- build a browser-safe lawyer workbench preview so the assistant UI can be tested without Word sideloading friction
- make the first screen the actual Ask/Draft/Review loop, not a control room
- show matter policy, provider route, scope, and data boundary beside the run controls
- keep Word as the target surface and reuse the same policy router/API contracts

### Phase 46 - Lawyer Pilot

- run 2-3 lawyers through real Word documents
- measure whether they would use this instead of copying text into Claude, ChatGPT, or Codex
- block scope expansion until that answer is clear

## 10. Product Test

The reset is successful when the first screen communicates:

> This is the safe way to use frontier AI on confidential legal documents from Word.

Any feature that does not reinforce that message should stay outside v1.
