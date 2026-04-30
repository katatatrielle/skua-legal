# Agent Knowledge Index

This file is the agent-facing table of contents for `skua`. Keep durable truth in the linked docs, not in `AGENTS.md`.

## Start Here

1. Read `AGENTS.md`.
2. Read the smallest source-of-truth doc set below.
3. Use `rg`, workspace scripts, package metadata, tests, and targeted source reads to answer repo questions.

## Product Truth

- `docs/specs/secure-legal-ai-workbench-v1.md` - active v1 product contract.
- `docs/privacy/canada-ontario-privacy-requirements.md` - Canada/Ontario privacy requirements.
- `docs/privacy/hosting-and-model-routing-plan.md` - hosting and provider-routing plan.
- `docs/specs/solo-first-word-native-contract-copilot-v1.md` - Word-native workflow spec.
- `docs/specs/open-contracts-engineering-spec.md` - engineering spec for open contracts.

## Architecture And Runtime

- `package.json` - workspace scripts and validation entry points.
- `apps/word-addin/` - primary lawyer workflow surface.
- `apps/web/` - control room and web UI.
- `services/api/` - API, provider policy, audit, usage, retrieval, and trust.
- `packages/` - shared schemas, prompts, SDK, and playbooks.

## Validation

- Root `npm run test` for broad confidence.
- `npm run lint`, workspace typechecks, and `npm run test:api` for targeted checks.

## Planning And Maintenance

- `docs/pilot/` - pilot-facing workflows and issue reporting.
- `docs/testing/` - QA plans and matrices.
- Use `.prd/<feature>.md` for durable PRD-style plans when requested.
- Keep stale docs, product drift, and outdated claims out of active indexes.
