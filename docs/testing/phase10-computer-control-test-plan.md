# Phase 10 Computer-Control Test Plan

This is the explicit checklist for the later Computer Use run. It covers the support web app and the Word add-in. The goal is to execute the same pilot-critical workflows on a real host instead of only through API tests.

## Preconditions

- API is running and reachable by the add-in and support web app.
- Support web app is running with `SKUA_SUPPORT_TOKEN`.
- Word add-in is sideloaded.
- A pilot user account exists.
- Sample contracts from `docs/pilot/samples` are available locally.

## Test 1: Word Sign-In

1. Open the Word add-in task pane.
2. Sign in with the pilot user.
3. Close and reopen the task pane.
4. Confirm the session restores without forcing another sign-in.

Expected:

- The authenticated workspace loads.
- No auth error appears after reopen.

## Test 2: Provider Settings And Cost Surface

1. Open `Settings`.
2. Save a hosted provider config.
3. Confirm billing and trust details render.
4. Save a BYOK config with a valid key format.
5. Confirm the masked key, plan type, and billing policy update.

Expected:

- Provider config saves successfully.
- Hosted and BYOK states are visually distinct.
- Billing and trust sections render without errors.

## Test 3: Full Document Sync From Word

1. Open `services-agreement-sample.txt` content in Word.
2. Trigger full-document sync from the add-in.
3. Confirm the synced document appears in the current matter.
4. Trigger sync again without editing.

Expected:

- The first sync creates one document version.
- The second sync does not create an accidental duplicate for identical content.

## Test 4: Selection Sync For Scoped Work

1. Select the subcontracting clause in the sample services agreement.
2. Trigger selection sync.
3. Open `Ask` and `Revise`.

Expected:

- The selected text is available to scoped `Ask` and `Revise`.
- The selection boundary is preserved closely enough for local retrieval.

## Test 5: Review Run And Findings List

1. Open `Review`.
2. Run a review using the services agreement playbook.
3. Confirm findings appear with severity, explanation, and citations.
4. Use filters by severity and issue type.

Expected:

- Findings render in ranked order.
- Each displayed finding has a source anchor or quote.
- Filters narrow the list without breaking the panel.

## Test 6: Source Navigation And Anchor Relocation

1. Open a finding citation from the review list.
2. Confirm Word navigates to the cited clause.
3. Edit the clause lightly.
4. Try the same citation again.

Expected:

- The first navigation lands on the cited text.
- After a light edit, the add-in either relocates successfully or shows a best-match warning.

## Test 7: Apply Comment

1. Apply a finding as a Word comment.
2. Confirm the comment lands on the intended clause.
3. Use the add-in undo action if available.

Expected:

- The comment attaches to the expected clause.
- The add-in logs the apply action without crashing.
- Undo or rollback works when offered.

## Test 8: Apply Redline

1. Apply a finding as a tracked-change redline.
2. Repeat once with Word tracked changes on.
3. Repeat once with Word tracked changes off.

Expected:

- The inserted replacement text is correct.
- Word shows a coherent tracked-change result in both cases supported by the add-in.

## Test 9: Save Clause From Review

1. Save one review suggestion to the clause bank.
2. Open `Saved Clauses`.
3. Confirm the saved entry appears with the right issue type and contract type.

Expected:

- Clause save succeeds.
- The new entry is immediately visible in the clause list.

## Test 10: Ask With Citation

1. Open `Ask`.
2. Ask whether the agreement renews automatically.
3. Ask a selection-scoped question against a highlighted clause.

Expected:

- The answer is concise.
- The answer includes one to three citations.
- Selection-scoped ask prefers the highlighted clause over the broader document.

## Test 11: Ask Unsupported Question

1. Ask a factual question not supported by the document.

Expected:

- The add-in refuses the claim instead of inventing an answer.
- The response remains short and clearly unsupported.

## Test 12: Revise Clause

1. Open `Revise`.
2. Rewrite the subcontracting clause to add notice and responsibility language.
3. Test `Insert`, `Replace`, and `Copy` flows if all are available.

Expected:

- The result is labeled as suggested language.
- Rationale and citations render.
- Insert and replace target the intended selection.

## Test 13: Clause Bank CRUD

1. Create a clause manually in `Saved Clauses`.
2. Edit the saved clause.
3. Delete the saved clause.
4. Save another clause from a suggestion.

Expected:

- CRUD operations persist correctly.
- A saved clause can be reused by `Revise`.

## Test 14: Preference Memory

1. Accept one suggestion.
2. Dismiss one finding.
3. Re-run review or revise on the same contract type.

Expected:

- The product records the actions without error.
- Preferred language is surfaced earlier where the ranking layer applies.

## Test 15: Spend Estimate Warning And Block

1. Configure a low per-run cap.
2. Attempt a large `Ask` or `Review` run.

Expected:

- The add-in shows a warning or block before the run.
- The blocked run does not proceed.

## Test 16: Billing And Trust Review

1. Reopen `Settings`.
2. Confirm current month usage, warning threshold, hard cap, and recent runs.
3. Confirm trust text for storage, provider visibility, deletion, and BYOK.

Expected:

- Billing values are populated.
- Trust details load without placeholder errors.

## Test 17: Document Delete

1. Delete a synced document from `Settings`.
2. Confirm it disappears from the matter list.
3. Attempt to reopen its findings if any are still visible.

Expected:

- The document disappears from the UI.
- Stale links fail gracefully.

## Test 18: Matter Delete

1. Delete the active matter from `Settings`.
2. Confirm related documents disappear.

Expected:

- The matter and its documents are removed from the visible list.
- The add-in remains usable after the delete completes.

## Test 19: Support Web Billing, Trust, Admin, And Release Dashboard

1. Open the support web app for the same workspace.
2. Confirm billing renders.
3. Confirm trust renders.
4. Confirm support admin overview renders.
5. Confirm release criteria render.

Expected:

- The billing panel shows run count and spend.
- The trust panel shows storage and deletion posture.
- The admin panel shows failure counts and feature flags.
- The release dashboard shows each tracked metric and overall readiness.

## Test 20: Pilot Kit Presence

1. Confirm the support web app mentions the pilot kit materials.
2. Confirm the local docs exist:
   - `docs/pilot/pilot-kit.md`
   - `docs/pilot/issue-reporting.md`
   - `docs/testing/phase10-computer-control-test-plan.md`

Expected:

- The pilot operator can find onboarding, support, and execution docs without asking engineering.
