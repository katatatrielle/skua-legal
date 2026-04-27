# Hosting and Model Routing Plan

Status: Working architecture plan, not legal advice
Updated: 2026-04-27

This plan keeps Skua focused on the core wedge: lawyers can use frontier-model help from Word without guessing where confidential client data goes.

## Primary Sources Reviewed

- OPC PIPEDA fair information principles: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/
- Microsoft Azure data residency: https://azure.microsoft.com/en-ca/explore/global-infrastructure/data-residency
- Microsoft Foundry / Azure Direct Models data, privacy, and security: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy
- Microsoft Foundry deployment types: https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types
- Microsoft Foundry model availability: https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
- AWS Bedrock security and privacy: https://aws.amazon.com/bedrock/security-compliance/
- AWS Bedrock FAQ: https://aws.amazon.com/bedrock/faqs/
- AWS Bedrock model regional availability: https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html
- AWS Bedrock cross-Region inference: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html
- Google Cloud Vertex AI locations: https://docs.cloud.google.com/vertex-ai/docs/general/locations
- Google Cloud Vertex AI generative data residency: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency
- OpenAI enterprise privacy: https://openai.com/enterprise-privacy/
- OpenAI data residency announcement: https://openai.com/index/expanding-data-residency-access-to-business-customers-worldwide/
- Anthropic API and data retention: https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention
- Qwen3.5-35B-A3B model card: https://huggingface.co/Qwen/Qwen3.5-35B-A3B
- AWS Bedrock Qwen3 235B A22B model card: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-235b-a22b-2507.html
- Google Vertex AI Qwen3 Coder page: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/maas/qwen/qwen3-coder
- Oracle Cloud Infrastructure regions: https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm
- IBM Cloud Canada AI/data sovereignty announcement: https://canada.newsroom.ibm.com/2025-04-03-IBM-Enhances-Enterprise-Cloud-Capabilities-in-Canada-to-Meet-Local-Clients-AI-and-Data-Needs
- DigitalOcean Canada hosting: https://www.digitalocean.com/solutions/web-hosting-canada
- OVHcloud Canada: https://www.ovhcloud.com/en-ca/
- TELUS Sovereign AI Factory: https://www.telus.com/en/about/news-and-events/media-releases/telus-opens-canadas-first-fully-sovereign-ai-factory
- Bell and Hypertec sovereign AI partnership: https://explore.business.bell.ca/public-safety/bell-hypertec-strengthen-canada-sovereign-ai-ecosystem

## Decision

Use a Canada-hosted data plane by default. Treat model calls as policy-controlled disclosures, not ordinary implementation details.

Do not self-host frontier models in v1. The practical path is managed model APIs behind a strict policy router, with self-hosted/open-weight inference reserved for classification, redaction, retrieval support, and restricted deployments where managed frontier providers are not allowed.

Do add a named self-hosted Qwen route. `self_hosted_qwen_ca` should be the Canada-resident open-model layer for privacy gating and restricted legal workflows, not the default promise that Skua can beat Claude or GPT on every hard legal task.

Default v1 posture:

- App, database, object storage, audit logs, billing records, embeddings, and parsed document segments stay in Canada.
- Legal-document prompts use only providers and deployment modes allowed by the matter profile.
- Direct OpenAI/Anthropic or cross-border model calls are disabled for legal-client data unless the matter explicitly allows them.
- SOTA proprietary models may be used for internal planning, public research, generic drafting strategy, and anonymized routing only when the prompt contains no client document text, no matter facts, no PII, and no privileged legal analysis.

## Data Classes

| Class | Examples | Default residency | External SOTA allowed? |
| --- | --- | --- | --- |
| `public_reference` | Public statutes, public provider docs, generic legal concepts, UI copy | Flexible | Yes |
| `skua_internal` | Product plans, code architecture, non-client prompts, generated UI plans | Flexible | Yes, unless mixed with client facts |
| `anonymized_planning` | Abstracted task plans with no client names, no document excerpts, no unique facts | Canada preferred | Yes after automated and human-visible redaction record |
| `matter_metadata` | Matter name, parties, client restrictions, provider policy, usage logs | Canada | No, unless explicitly permitted |
| `client_legal_content` | Word document text, selected clauses, citations, generated legal advice tied to a matter | Canada | No by default |
| `restricted_sensitive` | PHI, public-sector restricted data, client-prohibited provider data, credentials, secrets | Canada, stricter controls | No |

## Hosting Approach

### Recommended v1 host: Azure Canada

Use Azure Canada as the first production-like path because Skua is Word-native and Azure gives the cleanest Microsoft alignment:

- Azure App Service, Container Apps, or AKS for API/web workloads.
- Azure Database for PostgreSQL Flexible Server in Canada.
- Azure Blob Storage in Canada for source documents and generated artifacts.
- Azure Key Vault with customer-managed keys where available.
- Private Link/VNet integration for database, storage, and model endpoints where practical.
- Microsoft Entra ID later for firm SSO.
- Azure Direct Models / Azure OpenAI only through deployment types that match the matter policy.

Important constraint: Azure global and data-zone deployment types can process prompts outside the selected deployment region. For Canada-strict matters, use `Standard` or regional provisioned deployments when the required model is available in a Canadian region. If only global/data-zone deployment is available, the UI must treat that as cross-region processing and block it unless the matter allows it.

### Second supported host: AWS Canada

AWS Canada is a strong alternate path for firms that prefer AWS or Bedrock:

- ECS/Fargate or EKS for workloads.
- RDS PostgreSQL in `ca-central-1`.
- S3 in `ca-central-1` with SSE-KMS.
- AWS KMS and Secrets Manager for keys and provider credentials.
- VPC endpoints / PrivateLink for private service access.
- Bedrock in Canada Central where the desired model supports in-region processing.

Important constraint: Bedrock model availability is per model and per region. Some strong models may be available from Canada only through geographic or global cross-region inference. That is not the same as Canada-only inference. The provider registry must record whether the route is in-region, geographic cross-region, or global.

### Other compute providers to track

| Provider | Canada footprint / value | Fit for Skua |
| --- | --- | --- |
| Google Cloud | Vertex AI regions include Montreal and Toronto; docs state regional storage/processing controls for supported features. | Good second/third model provider, especially for Gemini and Canada-hosted GPU work. |
| IBM Cloud | Toronto and Montreal cloud/AI investments positioned around regulated industries and data sovereignty. | Worth tracking for enterprise/public-sector sales, less urgent for MVP. |
| Oracle Cloud | Toronto and Montreal OCI regions. | Useful for cost/performance or customer-specific deployments, not first-choice Word/AI stack. |
| DigitalOcean | Toronto data center; simple app hosting and GPU offerings. | Fine for prototypes, weaker enterprise/legal trust story. |
| OVHcloud Canada | Canadian data centers and bare metal/GPU options. | Useful for lower-level self-hosted inference or sovereign alternatives, but more ops burden. |
| TELUS Sovereign AI Factory | Canadian-controlled GPU infrastructure marketed for training, fine-tuning, and inference. | Track for restricted public-sector/health deployments; likely procurement-heavy. |
| Bell AI Fabric / Hypertec | Canadian-hosted AI compute with Canadian-built GPU infrastructure partnership. | Track for sovereign AI deployment option; not MVP default. |

### Self-hosted Qwen route

Add `self_hosted_qwen_ca` as a first-class provider route.

Purpose:

- PII, PHI, party-name, address, and client-fact detection.
- Redaction checks before any anonymized-planning or external-SOTA route.
- Query rewriting, prompt compression, document chunk ranking, and citation-support checks.
- First-pass Ask/Draft/Review output when Canada-strict or client-prohibited matters cannot use managed frontier models.
- Fallback legal model for restricted deployments after evaluation passes.

Initial model candidates:

| Model family | Route | Role | Notes |
| --- | --- | --- | --- |
| Qwen smaller dense or MoE variants | Self-hosted on Canadian GPU or CPU/GPU mix | Classifier, redactor, router, cheap summarizer | Start here for cost and latency. |
| Qwen3.5-35B-A3B or comparable open-weight Qwen | Self-hosted on Canadian GPU | Strong open-model route for restricted legal workflows | The Qwen model card shows OpenAI-compatible serving through vLLM/SGLang, but the long-context examples assume multi-GPU tensor parallelism. |
| Qwen3 235B A22B | Managed or heavy self-hosted | Evaluation target, not MVP default | Quality may be attractive, but cost and region availability make it unsuitable as the first self-hosted route. |
| Managed Qwen on Bedrock or Vertex | Provider-specific managed route | Non-Canada-strict route unless registry proves Canadian processing | Current public docs reviewed did not establish Canada-only processing for the managed Qwen routes. |

Policy defaults:

- `self_hosted_qwen_ca` can receive `client_legal_content` only after the eval gate confirms citation behavior, refusal behavior, redaction behavior, and output quality for the target workflow.
- `self_hosted_qwen_ca` can receive `restricted_sensitive` only if the hosting contract, infrastructure, logging, and access controls meet the matter profile.
- Managed Qwen routes must be treated like any other external managed provider: region, retention, training, subprocessors, and cross-region processing must be explicit in the provider registry.
- The UI should label self-hosted Qwen as `Canada-hosted open model`, not as `private AI` unless the deployment actually satisfies the relevant privacy and security controls.

## Model Cascade

The cascade should route by data class and task risk.

1. Local deterministic layer
   - Clause boundary detection, citation validation, policy checks, cost estimates, audit events, simple refusal rules.
   - No provider disclosure.

2. Canada-resident small/medium model
   - PII/sensitivity classification, prompt compression, query rewriting, document chunk ranking, redaction checks.
   - Preferred implementation is `self_hosted_qwen_ca` or another evaluated open-weight model on Canadian compute.

3. Canada-resident strong model
   - Legal Ask, Draft, Review, summarize, compare, and explain when the prompt includes client legal content.
   - Must be routed through a provider/deployment that the matter policy allows.
   - Can use `self_hosted_qwen_ca` for restricted matters after eval, but managed frontier models remain the quality baseline when the matter permits them.

4. External SOTA model for non-client planning
   - Internal orchestration, model-route planning, generic research strategy, UI copy, public-law research summaries, provider comparison, and code assistance.
   - Must receive only `public_reference`, `skua_internal`, or approved `anonymized_planning` data.

5. Explicit external legal-data escalation
   - If a difficult matter-specific task requires a non-Canada or direct frontier model, Skua should show a blocking dialog with exact data classes, provider, model, region/processing posture, retention/training posture, and client authorization status.
   - The user must approve the run and the approval must be logged.

## Prompt Firewall

Before any provider call, run a policy gate that:

- classifies the input data class;
- checks matter profile restrictions;
- checks provider registry capabilities;
- detects PII, PHI, party names, emails, addresses, document excerpts, and unique matter facts;
- blocks restricted data from external SOTA routes;
- writes a provider receipt with route, model, data class, scope, estimated tokens, redaction state, and decision reason.

The provider receipt is part of the product. Lawyers should be able to understand why a route was allowed, warned, or blocked.

## Provider Registry Fields

Add a durable registry with:

- provider name and deployment name;
- model family and model ID;
- hosted, BYOK, customer cloud, or self-hosted mode;
- storage region and processing region;
- in-region, geographic cross-region, global, or unknown processing;
- training-use posture;
- retention posture;
- abuse-monitoring / human-review posture;
- subprocessors and contract/DPA status;
- PHI/public-sector eligibility;
- private networking support;
- customer-managed-key support;
- policy labels: `canada_strict_allowed`, `client_confidential_allowed`, `phi_allowed`, `public_sector_allowed`, `external_sota_allowed`.

Seed provider routes:

| Route ID | Default policy | Intended use |
| --- | --- | --- |
| `azure_openai_canada_regional` | Canada-strict candidate when model deployment is regional Canada | Managed strong model for legal work. |
| `aws_bedrock_canada_in_region` | Canada-strict candidate only for models with in-region Canada processing | Managed strong/open model for legal work. |
| `self_hosted_qwen_ca` | Canada-strict candidate after eval and infrastructure review | Open-model classifier/router and restricted legal fallback. |
| `direct_openai_external` | External-SOTA only by default | Non-client planning, public research, code/UI, or explicit legal-data escalation. |
| `direct_anthropic_external` | External-SOTA only by default | Non-client planning, public research, code/UI, or explicit legal-data escalation. |
| `managed_qwen_external_or_unknown` | Block for Canada-strict matters until region is proven | Evaluation and non-client workloads where allowed. |

## Matter Compliance Profile

Every matter needs:

- jurisdiction;
- private-sector / public-sector / PHIPA-sensitive flags;
- client authorization status;
- prohibited providers;
- allowed provider classes;
- required storage region;
- required processing region;
- external model permission;
- retention schedule;
- breach contact / notification path;
- PIA packet requirement.

## UI Requirements

The lawyer UI should make the policy visible at the point of work, not in a detached compliance console.

Minimum UI:

- Matter badge: `Canada strict`, `External models blocked`, `PHI sensitive`, or `Client-approved external`.
- Provider line beside the run button: provider, model, residency, retention, training posture.
- Scope selector: selection, current section, full document.
- Data-boundary review card before every run.
- Clear block state when a provider is disallowed.
- Escalation path when the lawyer wants stronger external models.
- Run history with provider receipts and citations.

For local development, build a browser-safe lawyer workbench preview on the web app so the UI can be reviewed without Word sideloading or localhost certificate friction. The Word add-in remains the target surface, but the browser preview should be good enough to iterate on the lawyer experience.

## Implementation Plan

### Phase A: Policy data model

- Add provider registry tables and seed entries for Azure Canada, AWS Canada, direct OpenAI, direct Anthropic, Google Vertex Canada, and self-hosted/open-weight.
- Seed `self_hosted_qwen_ca`, `managed_qwen_external_or_unknown`, and explicit direct proprietary model routes.
- Add matter compliance profile tables.
- Add policy labels to spend-estimate/data-boundary responses.

### Phase B: Prompt firewall

- Add a central provider-route decision function.
- Block legal-client data from external SOTA routes by default.
- Add anonymized-planning route support with a redaction receipt.
- Add tests for Canada-strict, PHI-sensitive, public-sector, and client-approved-external matters.

### Phase C: Hosting reference architecture

- Write Azure Canada deployment reference.
- Write AWS Canada alternative deployment reference.
- Define production KMS/secrets rotation expectations.
- Define logs, backups, retention, deletion, and incident-export expectations.

### Phase D: Lawyer UI

- Build a browser-safe lawyer workbench preview in the web app.
- Mirror the same assistant modes and data-boundary cards used by the Word add-in.
- Make the UI usable without requiring Word desktop.
- Keep the control room secondary.

### Phase E: Word host pass

- After the UI loop is stable, return to Word sideloading/certificate work.
- Validate real Office.js selection sync, comments, redlines, and undo against the same policy router.
