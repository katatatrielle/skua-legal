## Atrielle Agent Harness

Use `atrielle-orchestrator` for non-trivial work.
Local skill files live under `.agents/skills/<skill>/SKILL.md`; open the relevant file when routing to a skill.

Start with:
- `graphify-out/GRAPH_REPORT.md` if present
- `docs/agent/index.md` if present
- the relevant skill routed by `atrielle-orchestrator`

Routing:
- architecture, dependencies, or cross-module questions: `context-navigation`
- code changes, refactors, or feature work: `implementation-loop`
- product, legal workflow, or privacy meaning: `product-domain`
- tests, evals, screenshots, or builds: `validation-harness`
- stale docs, graph drift, or cleanup: `repo-maintenance`
- previews, releases, deploys, or incidents: `release-ops`

Use global utility skills when appropriate:
- `graphify` for graph generation and graph queries
- `planning-with-files` for multi-step plans, cleanup sweeps, or release work

Do not treat this file as the knowledge base. Repo truth belongs in docs, code, schemas, tests, evals, and graphify outputs.
