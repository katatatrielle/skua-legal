# Pilot Kit

This kit is the bounded onboarding package for the first solo-first pilots.

## Included

- Starter playbooks for:
  - NDA recipient review
  - Services agreement, customer-side review
  - SaaS agreement, customer-side review
- Sample contract text in `docs/pilot/samples`
- Release-gate dashboard in the support web app
- Word add-in QA matrix in `docs/testing/word-addin-phase6-qa-matrix.md`
- Computer-control execution script in `docs/testing/phase10-computer-control-test-plan.md`
- Issue reporting flow in `docs/pilot/issue-reporting.md`
- Competitive eval rubric in `docs/pilot/spellbook-competitive-eval.md`

## Pilot Setup

1. Start the API, support web app, and Word add-in locally or in staging.
2. Create a pilot workspace and confirm the user can sign in from Word.
3. Load one sample contract from `docs/pilot/samples` into the workspace.
4. Run `Review`, `Ask`, and `Revise` once each from the Word add-in.
5. Save at least one clause to the clause bank.
6. Confirm billing, trust, and deletion controls are visible in `Settings`.
7. Confirm the support web app shows:
   - billing
   - trust
   - support admin overview
   - release criteria
8. Run the computer-control checklist before pilot handoff.

## Sample Matters

- `Pilot NDA matter`
  - Use `docs/pilot/samples/nda-sample.txt`
- `Pilot services matter`
  - Use `docs/pilot/samples/services-agreement-sample.txt`
- `Pilot SaaS matter`
  - Use `docs/pilot/samples/saas-agreement-sample.txt`

## Pilot Readiness Gate

The support web app now exposes the tracked release criteria for a workspace. A workspace is pilot-ready only when all of these pass with at least one real sample:

- parse success rate
- review failure rate
- citation validation failure rate
- add-in apply failure rate
- accepted suggestion rate
- average run cost

If any gate is red, pilot should pause until the issue is explained and bounded.

## Handoff Checklist

Before handing a pilot workspace to a user, confirm:

- the user can authenticate in Word
- a document sync succeeds
- review findings render with citations
- at least one comment or redline applies correctly
- ask returns a cited answer
- revise returns labeled suggested language
- a saved clause appears in the clause bank
- billing and trust surfaces load
- document and matter delete work
- the support web release dashboard is green for the pilot workspace
