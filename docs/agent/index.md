# Agent Knowledge Index

This file is the agent-facing table of contents for `skua`. Keep durable truth in the linked docs, not in `AGENTS.md`.

## Start Here

1. Read `AGENTS.md`.
2. Use `atrielle-orchestrator` to route the task.
3. If present, read `graphify-out/GRAPH_REPORT.md` before broad code search.
4. Read the smallest source-of-truth doc set below.

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
- Use `validation-harness` for browser, API, and visual validation choices.

## Planning And Maintenance

- `docs/pilot/` - pilot-facing workflows and issue reporting.
- `docs/testing/` - QA plans and matrices.
- Use `repo-maintenance` for stale docs, product drift, graph drift, and cleanup.
- Use global `planning-with-files` for cleanup sweeps.
- Use global `graphify` for graph generation and graph queries.
