---
name: atrielle-orchestrator
description: Route non-trivial work in Atrielle repos to the right harness skill, preserving progressive disclosure and using repo-local docs, graphify, tests, and evals as the system of record.
---

# Atrielle Orchestrator

Use this first for non-trivial work in `legalkg`, `atrielle-mvp`, `skua`, or `atrielle-site`.

## Start

1. Read `AGENTS.md`.
2. Read `docs/agent/index.md` if present.
3. If `graphify-out/GRAPH_REPORT.md` exists, read it before broad code search.
4. Classify the task, then route to one main skill.

## Routing

- Architecture, dependency, or cross-module questions: `context-navigation`
- Feature work, refactors, or code edits: `implementation-loop`
- Product, legal workflow, privacy, or claims: `product-domain`
- Tests, evals, screenshots, builds, or QA: `validation-harness`
- Stale docs, graph drift, repeated mistakes, or cleanup: `repo-maintenance`
- Preview deploys, production release, DNS, or incidents: `release-ops`

## Utility Skills

- Use global `graphify` for graph generation and graph queries.
- Use global `planning-with-files` when the task needs a durable plan, findings log, or cleanup progress log.
- Use file-type skills such as documents, spreadsheets, or presentations only when the artifact type requires them.

## Harness Rules

- Keep `AGENTS.md` small. Put durable truth in docs, schemas, tests, evals, and graphify outputs.
- Prefer mechanical checks over prose rules when a rule should always hold.
- Promote repeated review comments into docs, tests, lint checks, or skill instructions.
- If a doc and the code disagree, treat that as drift and route through `repo-maintenance`.
