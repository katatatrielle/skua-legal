---
name: context-navigation
description: Use for architecture, dependency, module ownership, cross-module relationship, and codebase orientation questions. Prefer graphify and docs indexes before broad raw search.
---

# Context Navigation

Use when the task is about understanding the codebase before changing it.

## Subskills

- `graphify-map`: If `graphify-out/GRAPH_REPORT.md` exists, read it. For relationship questions, prefer `python3 -m graphify query`, `path`, or `explain`.
- `docs-index`: Read `docs/agent/index.md`, then the smallest linked doc set that answers the question.
- `architecture-reader`: Inspect package roots, public APIs, tests, and boundary scripts before making claims.

## Workflow

1. Identify the current repo and likely domain.
2. Check graphify output if present.
3. Read the repo docs index and relevant source-of-truth docs.
4. Use `rg` or targeted file reads only after the map is checked.
5. Answer with concrete files, commands, and uncertainty when the evidence is partial.

## Repo Entry Points

- `legalkg` / `atrielle-mvp`: `docs/README.md`, `pyproject.toml`, `src/atrielle`, `tests`, `evals`.
- `skua`: `docs/specs/secure-legal-ai-workbench-v1.md`, `package.json`, `apps`, `packages`, `services/api`.
- `atrielle-site`: `README.md`, `package.json`, `app`, `components`, `styles`.
