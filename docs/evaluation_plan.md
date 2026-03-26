# CleanRoom Law — Evaluation Plan

## Goal

Prove the product is better than the current workflow on:
- time
- reliability
- trust
- cost

---

## Baseline workflow

Current baseline:
- CanLII / cases / notes in multiple tabs
- copy-paste into multiple LLM chats
- repeated prompting
- manual re-checking
- manual restart after contamination

---

## Test assignment types

Use real work:
- research memo sections
- case summary / case comment sections
- factum-like argument sections if relevant

Do not evaluate on toy prompts.

---

## Core metrics

### Time
- time to first usable outline node
- time to first usable section draft
- time lost to re-prompting
- time to recover from authority failure

### Reliability
Count:
- fake or unresolved authorities
- bad speaker attribution
- overclaimed propositions
- unsupported quotations
- defects caught before drafting
- defects caught after drafting

### Trust / inspectability
- can every material claim be inspected?
- can you see excerpt + pinpoint + speaker + fit in one place?
- how often do you still need to leave the app to understand support?

### Cost
- API cost per matter
- API cost per section
- strong-model vs cheap-model breakdown

### Stickiness
- did you choose this over your old workflow?
- did you reopen the app voluntarily for the next assignment?

---

## Success thresholds for v1

### Time
- meaningful reduction in repeated prompting
- noticeably faster recovery after authority failure

### Reliability
- catches obvious support failures before they reach the final section draft
- no silent use of blocked/invalidated authorities

### Trust
- citation inspector is sufficient for routine support review

### Cost
- cheaper than maintaining multiple subscriptions at equivalent usage

---

## Test cases to force

### Authority failures
- nonexistent case
- ambiguous authority
- wrong jurisdiction
- quote not found
- counsel argument presented as law
- quoted authority not adopted
- supports narrower only

### Workflow failures
- draft built on authority later blocked
- outline node with mixed-quality support
- restart at section scope
- warning-level authority accepted by user

---

## Evaluation cadence

### After Milestone 3
Test authority review only

### After Milestone 5
Test outline + one-section drafting

### After Milestone 7
Test restart flow end to end

### After Milestone 8
Compare cost and time against baseline