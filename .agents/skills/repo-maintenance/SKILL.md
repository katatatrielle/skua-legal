---
name: repo-maintenance
description: Use for stale docs, graphify refreshes, documentation garbage collection, drift detection, dependency hygiene, and repeated-pattern cleanup in Atrielle repos.
---

# Repo Maintenance

Use when the repo harness itself needs cleanup or when docs and code may have drifted.

## Subskills

- `doc-gardening`: Find stale docs, duplicate plans, dead links, outdated claims, and orphaned root planning files.
- `graphify-refresh`: Run full graphify for new graphs, or `python3 -m graphify update .` when an existing graph needs code refresh.
- `drift-detection`: Compare docs against code, schemas, package scripts, tests, eval manifests, and graphify output.
- `dependency-hygiene`: Prefer inspectable in-repo helpers and stable dependencies; avoid opaque packages for core invariants.

## Workflow

1. Use global `planning-with-files` for cleanup sweeps.
2. Inventory current docs and generated artifacts.
3. Identify stale, duplicate, or conflicting material with evidence.
4. Update indexes first: `docs/agent/index.md`, then repo docs indexes such as `docs/README.md`.
5. Promote repeated issues into tests, scripts, lint rules, or skill instructions.
6. Refresh graphify when code or architecture changes affect the map.

## Safety

- Do not silently delete historical plans or potentially important records. Archive or ask before deletion.
- Do not rewrite unrelated docs while cleaning a specific drift issue.
- Preserve user changes in dirty worktrees.
