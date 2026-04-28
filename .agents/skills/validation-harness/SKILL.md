---
name: validation-harness
description: Use to choose and run tests, evals, builds, typechecks, screenshots, browser checks, and other verification loops for Atrielle repos.
---

# Validation Harness

Use whenever a task needs proof that behavior still works.

## Subskills

- `python-validation`: Python tests, lint, typing, CLI smoke checks.
- `frontend-validation`: Node/Next lint, typecheck, build, and local server checks.
- `eval-validation`: Eval manifests, deterministic replay, scorecards, launch gates.
- `visual-regression`: Browser screenshots, responsive checks, and interaction smoke tests.

## Repo Checks

- `legalkg` / `atrielle-mvp`: prefer targeted `python3 -m pytest`, then `python3 -m ruff check .`, `python3 -m mypy src` when risk warrants.
- `skua`: use root `npm run test` for full confidence; targeted scripts include `npm run lint`, workspace typechecks, and `npm run test:api`.
- `atrielle-site`: use `npm run lint` and `npm run build`; run local browser checks for layout or copy changes.

## Evals

- For Atrielle MVP behavior, inspect `evals/manifests`, `docs/eval_architecture.md`, and relevant CLI entrypoints in `pyproject.toml`.
- For product claims, validation may require docs plus fixture/eval evidence, not only unit tests.

## Visual Checks

- Start the app locally when the UI requires runtime validation.
- Capture desktop and mobile screenshots for meaningful UI changes.
- Check that text does not overlap and that the first screen reflects the product contract.
