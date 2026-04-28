---
name: release-ops
description: Use for preview deploys, production release preparation, rollback notes, release validation, DNS cautions, and incident followup for Atrielle repos.
---

# Release Ops

Use when work affects deployment, release gates, domains, operational readiness, or incident followup.

## Subskills

- `preview-deploy`: Build locally, deploy preview if configured, and smoke test the preview URL.
- `production-release`: Check release gates, docs, env vars, migrations, DNS/domain notes, and rollback plan.
- `incident-followup`: Convert failures into tests, docs, monitoring checks, or repo-maintenance tasks.

## Repo Notes

- `atrielle-site`: Vercel/v0 is the likely deployment path. Do not change Microsoft 365 MX/TXT records during website cutover.
- `skua`: Treat provider policy, audit, retention, billing, and trust posture as release-critical.
- `legalkg` / `atrielle-mvp`: Treat eval evidence, launch gates, API surface policy, and pilot scope as release-critical.

## Workflow

1. Identify the release surface and current deployment mechanism.
2. Run validation from `validation-harness`.
3. Check product claims through `product-domain`.
4. Record unresolved risk and rollback steps.
5. Feed repeated release issues into `repo-maintenance`.
