## Skua Agent Rules

Start with `package.json`, `docs/specs/secure-legal-ai-workbench-v1.md`, `apps/`, `packages/`, and `services/api/`. Use `rg`, targeted file reads, workspace scripts, tests, and browser checks to navigate the repo.

Use ordinary repo navigation. Do not create standalone planning logs at the repo root. For planning, discuss first and write a durable `.prd/<feature>.md` only when the user asks for a PRD-style artifact.

Primary surfaces:
- Product contract: `docs/specs/secure-legal-ai-workbench-v1.md`
- Word workflow: `apps/word-addin/`
- Web/control room: `apps/web/`
- API and policy: `services/api/`
- Shared packages: `packages/`

Validation defaults:
- Use targeted tests while iterating.
- Run `npm run test` for broad confidence when the change touches shared contracts, API behavior, or user-facing workflows.

Preserve unrelated dirty worktree changes.
