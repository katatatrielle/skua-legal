# Issue Reporting Flow

Use this flow for pilot bugs, regressions, and support incidents.

## Required Fields

- Workspace ID
- User email
- Environment
  - local
  - staging
  - pilot
- Surface
  - Word add-in
  - support web
  - API
- Workflow
  - sync
  - review
  - ask
  - revise
  - clause bank
  - billing
  - trust
  - deletion
- Severity
  - blocker
  - major
  - normal
  - minor
- What the user expected
- What actually happened
- Exact timestamp with timezone

## Evidence To Attach

- screenshot or screen recording
- request ID if visible
- job ID if visible
- document name
- affected finding ID, review run ID, ask run ID, or revise run ID when available
- whether tracked changes were on or off in Word

## Triage Rules

- `blocker`
  - user cannot review, ask, revise, or apply output
  - respond same day
- `major`
  - cited output or apply behavior is wrong, but there is a workaround
  - respond next business day
- `normal`
  - UI bug, confusing wording, non-blocking mismatch
  - batch into weekly pilot triage
- `minor`
  - copy issue or low-risk polish
  - backlog unless repeated

## Minimum Repro Format

1. Sign in as `<user>`.
2. Open `<document>`.
3. Go to `<panel>`.
4. Click `<action>`.
5. Observe `<result>`.

## Support Response Template

- Summary
- Repro status
- Scope
- Immediate workaround
- Next engineering action
- Whether pilot use should pause for this workflow
