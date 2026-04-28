---
name: product-domain
description: Use for Atrielle product meaning, legal workflow semantics, privacy/data-boundary questions, product claims, lane packs, and marketing positioning.
---

# Product Domain

Use when correctness depends on product or legal-workflow meaning rather than code mechanics.

## Subskills

- `atrielle-mvp`: Bounded, evidence-backed follow-through inbox; deterministic ingest, replay, review, and eval assets.
- `skua-workbench`: Secure legal AI workbench; Word-first Ask/Draft/Review assistant with visible data-boundary controls.
- `atrielle-site`: Public marketing site; copy and layout must match current product claims and avoid unsupported promises.
- `legal-privacy-boundaries`: PIPEDA, Ontario public-sector, PHIPA-sensitive, confidentiality, provider-routing, retention, and audit posture.

## Source-Of-Truth Docs

- Atrielle MVP: `docs/README.md`, `docs/mvp_product_scope.md`, `docs/atrielle_mvp_product_trust_contract.md`, `docs/candidate_case_state_architecture_note.md`, `docs/api_surface_policy.md`.
- Civil litigation: `docs/civil_litigation_pilot_scope.md`, `docs/civil_litigation_supported_boundary_note.md`, `docs/civil_litigation_source_pack.md`.
- Labour/employment: `docs/labour_employment_supported_boundary_note.md`, `docs/labour_employment_lane_scorecard.md`.
- Skua: `docs/specs/secure-legal-ai-workbench-v1.md`, `docs/privacy/canada-ontario-privacy-requirements.md`, `docs/privacy/hosting-and-model-routing-plan.md`.
- Atrielle site: `README.md`, current page/component copy, deployed copy if available.

## Rules

- Product claims must be grounded in active docs or implemented behavior.
- For legal/privacy claims, cite the controlling repo doc and mark uncertainty.
- If a doc is stale or conflicts with code, route to `repo-maintenance`.
