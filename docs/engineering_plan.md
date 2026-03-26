# CleanRoom Law — Engineering Plan

## Goal

Build the first useful vertical slice with the fewest irreversible decisions.

---

## Phase 1 — Foundation

### Tasks
- scaffold Next.js app
- set up TypeScript, Tailwind, component library
- set up Postgres + Prisma
- define core schema
- generate database client
- create matter CRUD
- create research item CRUD

### Acceptance criteria
- app boots locally
- matter can be created and reopened
- research items persist

---

## Phase 2 — Authority pipeline

### Tasks
- authority schema + CRUD
- research → authority conversion
- intake status fields
- authority queue UI
- deterministic intake checks
- defect creation on intake failure

### Acceptance criteria
- candidate authorities can be created
- authority states update correctly
- blocked/invalidated states are visible

---

## Phase 3 — Verification workflow

### Tasks
- provenance/fit prompt builders
- provider abstraction layer
- authority review screen
- verify / warning / block / invalidate actions
- status guards

### Acceptance criteria
- verified authorities become eligible
- non-eligible authorities cannot be attached downstream

---

## Phase 4 — Outline workflow

### Tasks
- outline node schema + CRUD
- hierarchical outline UI
- attach authorities to node
- readiness rules
- taint status rendering

### Acceptance criteria
- ready node can be created only from eligible authorities

---

## Phase 5 — Section drafting

### Tasks
- prompt assembly for one-section drafting
- DraftSection schema + CRUD
- draft generation endpoint
- regenerate endpoint
- section status handling

### Acceptance criteria
- one section can be drafted from one ready node
- draft persists and can be regenerated

---

## Phase 6 — Citation inspector

### Tasks
- ClaimSupportLink schema
- claim extraction flow
- draft split-pane UI
- citation inspector data endpoint
- defect visibility in inspector

### Acceptance criteria
- clicking a claim shows source excerpt, pinpoint, speaker, fit, and trace

---

## Phase 7 — Restart flow

### Tasks
- Checkpoint schema and creation rules
- taint propagation logic
- restart recommendation rules
- preserve/discard UX
- restart execution endpoint

### Acceptance criteria
- section can be invalidated and regenerated from last clean checkpoint

---

## Phase 8 — Logging and eval

### Tasks
- model usage log
- event log
- cost estimation
- evaluation view or export
- baseline comparison notes

### Acceptance criteria
- per-matter cost and restart history are visible

---

## Testing plan

### Unit tests
- state transitions
- taint propagation
- restart scope mapping
- eligibility guards

### Integration tests
- research → authority
- authority → outline
- outline → draft
- defect → restart

### Manual product tests
- run on real assignment
- compare to old workflow