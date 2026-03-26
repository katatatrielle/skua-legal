# CleanRoom Law — Milestone Plan

## Objective of v1

Build one narrow vertical slice that proves the product is useful for a real memo workflow:

**research inbox → authority intake/review → outline node → one drafted section → side-by-side citation inspector → defect-triggered restart**

That is the first version worth building.

---

## Milestone 0 — Freeze system rules before code

### Goal
Lock down the parts that should not drift while building.

### Decisions to freeze
- v1 scope and non-goals
- canonical workflow
- core entities and statuses
- trust boundaries
- restart policy
- citation inspector as a core feature
- section-by-section drafting only

### Deliverables
- lean PRD
- domain model
- UX flows
- operating spec
- milestone plan

### Exit criteria
You can describe, in one sentence each:
- what the app does
- what it does not do
- what the happy path is
- what the failure path is

---

## Milestone 1 — Foundation and persistence

### Goal
Create the basic app skeleton and persistent state model.

### Build
- project scaffold
- database schema for:
  - Matter
  - ResearchItem
  - Authority
  - OutlineNode
  - DraftSection
  - ClaimSupportLink
  - Defect
  - Checkpoint
- CRUD operations for these entities
- matter-centric routing/navigation
- basic status transitions

### Deliverables
- app can create a matter
- app can save and reload research items, authorities, outline nodes, and sections
- state survives refresh/restart

### Exit criteria
You can:
1. create a matter
2. paste research items
3. create an authority record
4. reload the page and everything is still there

---

## Milestone 2 — Research Inbox and authority intake

### Goal
Support fast ingestion of messy research and conversion into candidate authorities.

### Build
- Research Inbox screen
- paste/add ResearchItems
- candidate authority extraction from pasted text
- create Authority records from ResearchItems
- authority queue view
- intake status tracking:
  - existence not checked
  - retrieval not checked
  - candidate / blocked / invalidated

### Deliverables
- user can dump in messy notes/snippets/citations
- user can convert promising items into authority candidates
- authority queue exists

### Exit criteria
From one matter, you can paste:
- a case citation
- a quote
- a note

and produce a usable list of candidate authorities.

---

## Milestone 3 — Authority verification and review

### Goal
Build the trust core of the system.

### Build
- Authority Review screen
- deterministic intake checks:
  - existence
  - retrieval
  - pinpoint availability
- model-assisted review:
  - speaker classification
  - fit assessment
  - risk summary
- explicit actions:
  - Verify
  - Verify with Warning
  - Block
  - Invalidate
- defect creation for failures

### Deliverables
- authority record becomes the real unit of trust
- blocked/invalid authorities cannot silently pass downstream

### Exit criteria
You can take a candidate authority and end in one of these states:
- verified
- verified with warning
- blocked
- invalidated

with visible reason and any linked defect.

---

## Milestone 4 — Outline Builder

### Goal
Let verified authorities shape structure.

### Build
- outline tree UI
- create/edit OutlineNodes
- attach verified authorities to nodes
- block invalidated authorities from attachment
- show node taint/warning states
- node readiness rules

### Deliverables
- clean authorities become usable structure
- unsupported nodes are visible

### Exit criteria
You can create:
- issue
- rule
- analysis

nodes, attach verified authorities, and mark a node ready for drafting.

---

## Milestone 5 — One-section drafting flow

### Goal
Generate one section at a time from a clean outline node.

### Build
- Draft Section action from OutlineNode
- prompt assembly from:
  - matter context
  - selected node
  - linked verified authorities
  - style constraints
- save generated DraftSection
- section status and taint status
- regenerate section action

### Deliverables
- app can generate one section from clean support
- draft is linked to node and matter

### Exit criteria
You can select a ready outline node and get a stored section draft.

### Design rule
No whole-memo generation.

---

## Milestone 6 — Citation inspector and claim support links

### Goal
Make support inspectable, not implicit.

### Build
- claim extraction or manual claim-linking layer
- ClaimSupportLink records
- split-pane Draft + Citation Inspector UI
- click a claim/citation and show:
  - authority metadata
  - excerpt
  - pinpoint
  - speaker classification
  - fit status
  - verification summary
  - defects

### Deliverables
- one-click side-by-side inspection
- support is visible and auditable

### Exit criteria
From a drafted section, you can click a claim or citation and inspect exactly what it is drawing from.

---

## Milestone 7 — Defect handling and restart flow

### Goal
Turn restart-first logic into real UX.

### Build
- Defect panel/modal
- taint propagation rules
- restart recommendation logic
- checkpoint creation and reuse
- restart actions:
  - authority only
  - outline node
  - section
- preserve/discard summary

### Deliverables
- substantive failures can invalidate downstream work cleanly
- user can restart from a clean checkpoint without manually untangling everything

### Exit criteria
If an authority fails after drafting, the app can:
1. mark affected artifacts tainted
2. recommend restart scope
3. regenerate from the last clean checkpoint

---

## Milestone 8 — Cost, logging, and evaluation harness

### Goal
Prove that the system is worth using.

### Build
- per-step model usage logging
- cost tracking by matter
- event logging:
  - defect counts
  - restarts
  - warnings
  - verification decisions
- baseline comparison worksheet or internal dashboard

### Deliverables
- evidence on time, cost, and reliability
- ability to compare against the current workflow

### Exit criteria
You can answer:
- how much did this matter cost in API usage?
- how often did defects arise?
- how often did restart happen?
- did this save time over the normal process?

---

## Milestone 9 — Tightening and usability polish

### Goal
Remove friction and make it personally sticky.

### Build
- faster ingestion
- keyboard shortcuts
- better defaults
- improved authority review ergonomics
- reduced clicks in citation inspection
- better preserve/discard explanations on restart

### Deliverables
- you actually want to use it repeatedly

### Exit criteria
You choose this over the current workflow for a real assignment without forcing yourself.

---

## Recommended build order inside the vertical slice

1. foundation/persistence
2. research inbox
3. authority review
4. outline builder
5. one-section drafting
6. citation inspector
7. defect/restart
8. logging/eval
9. polish