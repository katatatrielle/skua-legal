---
name: implementation-loop
description: Use for scoped code changes, feature work, refactors, and fixes that need implementation plus verification in Atrielle repos.
---

# Implementation Loop

Use when the user wants a change made, not just explained.

## Subskills

- `plan-work`: For multi-step work, use global `planning-with-files` and keep `task_plan.md`, `findings.md`, and `progress.md` current.
- `edit-code`: Make narrow edits that follow existing repo patterns and ownership boundaries.
- `self-review`: Review the diff for regressions, stale docs, risky assumptions, and missing tests.
- `validate-change`: Run the smallest meaningful check first, then broaden based on risk.

## Workflow

1. Route through `context-navigation` if architecture is unclear.
2. Identify acceptance criteria and affected files.
3. Implement in small, reviewable patches.
4. Update docs, schemas, fixtures, or evals when behavior changes.
5. Run targeted validation from `validation-harness`.
6. If code or docs changed meaningfully, refresh graphify with `python3 -m graphify update .` when a graph already exists.

## Defaults

- Do not invent new abstractions unless they reduce real complexity or match a local pattern.
- Do not leave plans at repo root when they become durable docs; move durable plans under `docs/plans/`.
- Do not revert unrelated dirty worktree changes.
