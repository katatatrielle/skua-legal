# Canada and Ontario Privacy Requirements

Status: Working product requirements, not legal advice
Updated: 2026-04-27

Skua should treat Canadian and Ontario privacy compliance as a product-control system: collect less, show the data boundary before every AI run, document provider transfers, keep audit/breach evidence, and make deletion/retention enforceable.

## Primary Sources Reviewed

- Office of the Privacy Commissioner of Canada, PIPEDA fair information principles: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/
- Office of the Privacy Commissioner of Canada, PIPEDA accountability principle: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_accountability/
- Office of the Privacy Commissioner of Canada, mandatory breach reporting guidance: https://www.priv.gc.ca/en/privacy-topics/business-privacy/breaches-and-safeguards/privacy-breaches-at-your-business/gd_pb_201810/
- Information and Privacy Commissioner of Ontario, protecting personal information in the public sector: https://www.ipc.on.ca/en/privacy-organizations/protecting-personal-information
- Ontario, Strengthening Cyber Security and Building Trust in the Public Sector Act, 2024 / Bill 194: https://www.ontario.ca/laws/statute/s24024
- Information and Privacy Commissioner of Ontario, PHIPA third-party provider case note: https://www.ipc.on.ca/en/cases-of-note/custodians-must-ensure-phi-protected-even-when-using-third-party-providers
- Law Society of Ontario, confidentiality: https://lso.ca/lawyers/practice-supports-and-resources/topics/the-lawyer-client-relationship/confidentialite
- Law Society of Ontario, cloud computing resource page: https://lso.ca/lawyers/technology-resource-centre/practice-resources-and-supports/cloud-computing

## Applicability Map

| Scenario | Likely regime to design for | Product implication |
| --- | --- | --- |
| Private-sector law firm using Skua for client work | PIPEDA plus professional confidentiality duties | Need meaningful notice, accountable processor controls, safeguards, third-party transfer transparency, retention/deletion, breach evidence, and client/matter provider restrictions. |
| Ontario public-sector client or public-sector law office | FIPPA/MFIPPA and Bill 194 where applicable | Need PIA-ready records, public-sector AI transparency fields, human oversight, risk-management documentation, breach/reporting evidence, and third-party digital-information controls. |
| Health-sector matters containing PHI | PHIPA-sensitive workflow, even if Skua is not itself a custodian in all deployments | Need stricter safeguards, PHI flags, third-party due diligence artifacts, access logging, breach notification support, and optional PHI-disabled provider policies. |
| Ontario lawyers handling any client confidential information | Law Society confidentiality duties | Default to least disclosure, matter-level consent/authorization evidence, no training use, provider contract review, and visible warnings before sending confidential material to external providers. |

## Design Requirements

### 1. Data minimization and purpose binding

- Store a specific purpose on every synced document and assistant run.
- Support selection-only runs so the lawyer can avoid sending the whole document.
- Keep `scope_label`, document version IDs, selected playbook IDs, provider, model, and estimated token/cost metadata on the pre-run boundary.
- Treat new run modes as new purposes unless they reuse the same documented data-boundary contract.

### 2. Meaningful consent and client authorization support

- Show the user what data will be collected, used, disclosed to a provider, retained, and logged before each run.
- Add matter-level fields for client authorization status, client restrictions, and prohibited providers.
- Make hosted vs BYOK, provider jurisdiction, and possible foreign-law access visible before a run.
- For sensitive or unexpected uses, require explicit confirmation and record the confirmation event.

### 3. Third-party processor and cross-border transfer controls

- Treat OpenAI, Anthropic, object storage, and infrastructure vendors as subprocessors in product metadata.
- Maintain a provider registry with provider name, model family, region/data-hosting posture, training-use posture, retention posture, subprocessors, and contract status.
- Allow workspace policy to require Canada-hosted storage and to block external model providers unless BYOK or an approved contract is present.
- Keep a per-run provider receipt that records which provider/model received which scoped input class.

### 4. Safeguards and access control

- Enforce workspace and matter access checks before document, run, memory, billing, and deletion operations.
- Encrypt provider secrets with a production-grade KMS envelope design before production.
- Add role-based access controls beyond owner/member before pilots with more than one firm.
- Log admin/support access separately from lawyer run activity.
- Add export controls for audit logs and privacy-impact-assessment packets.

### 5. Retention, deletion, and access rights

- Retain source documents only while needed for the matter purpose or configured retention period.
- Keep usage/audit records long enough for billing, security, breach, and legal defensibility, with a documented retention schedule.
- Maintain deletion events that prove source objects, parsed segments, generated artifacts, and related records were removed or tombstoned.
- Add subject-access/export support for personal-information records where applicable.

### 6. Breach and incident readiness

- Keep records of all security/privacy incidents with enough detail to support PIPEDA and Ontario public-sector reporting analysis.
- Add breach-severity fields: affected workspace, data classes, provider/subprocessor, time window, containment status, real-risk/significant-harm analysis, notification status, and evidence links.
- Preserve a two-year minimum breach-record retention floor for PIPEDA-governed deployments unless counsel sets a stricter schedule.
- Add PHIPA-specific breach flags for PHI theft, loss, unauthorized use, unauthorized disclosure, and hostile encryption.

### 7. Ontario public-sector AI readiness

- Keep AI-system metadata suitable for Bill 194-style disclosure, accountability, risk-management, documentation, and human oversight.
- Record the human user responsible for each model-assisted action.
- Do not allow autonomous document edits: generated language must remain suggested language and be applied by the lawyer.
- Add a PIA export packet containing data flows, authority/purpose fields, access roles, retention, safeguards, provider transfers, and risk mitigations.

## Product Controls To Add Next

1. Matter compliance profile: jurisdiction, public-sector flag, PHI flag, client authorization, provider allow/deny list, storage region requirement.
2. Provider registry: hosted/BYOK/self-hosted, data residency, processing region, training use, retention, subprocessors, contract status, cross-border transfer notice text. Include a named `self_hosted_qwen_ca` route for evaluated Canada-hosted open-model processing, plus managed-provider routes that are blocked for Canada-strict matters until Canadian processing is proven.
3. PIA packet endpoint: machine-readable export of purposes, data flows, roles, safeguards, retention, provider disclosures, and run history.
4. Breach/incident ledger: internal admin route with PIPEDA/FIPPA/PHIPA fields and export.
5. Policy enforcement before run: block or warn if the matter profile conflicts with provider/storage/retention policy.

## Current Repo Coverage

- Present: auth, workspace scoping, provider config, BYOK, encrypted provider-secret storage, spend estimates, data-boundary summary, audit events, usage ledger, deletion controls, trust profile, and deterministic fallback.
- Partial: PII/sensitivity flags are lightweight regex checks only; they are not a complete privacy classifier.
- Missing: matter compliance profile, provider registry metadata, explicit client authorization records, Canada/Ontario data-residency enforcement, PIA packet export, breach/incident ledger, PHI-specific controls, and production-grade KMS-backed secret management.
