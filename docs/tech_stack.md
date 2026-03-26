# CleanRoom Law — Stack and Architecture Decision

## Goal

Choose the fastest stack to build a narrow, stateful, inspectable MVP.

---

## Stack choice

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind
- shadcn/ui

### Backend
- Next.js Route Handlers for MVP API surface
- server-side TypeScript for orchestration

### Database
- Postgres

### ORM / migrations
- Prisma ORM
- Prisma Migrate

### Auth
- Supabase Auth for later
- for local MVP: single-user dev mode is acceptable
- for hosted MVP: email auth

### Storage
- Postgres first
- file/object storage only when source uploads are added

### AI integration
- provider abstraction layer
- Vercel AI SDK
- app-owned orchestration functions, not a generic agent framework

### Logging / analytics
- application event log in Postgres
- structured model usage log
- basic product analytics later

### Deployment
- Vercel for web app
- Supabase or managed Postgres backend

---

## Architecture shape

### App pattern
Single Next.js application with:
- server-rendered matter pages
- Route Handlers for mutations and orchestration endpoints
- background-ish tasks handled synchronously first, then queued later if needed

### Why
Keep ops simple.
Avoid premature microservices.

---

## Core modules

### 1. Matter module
Responsibilities:
- create matter
- update matter metadata
- list matter state

### 2. Research module
Responsibilities:
- ingest ResearchItems
- extract candidate authorities
- manage research inbox

### 3. Authority module
Responsibilities:
- create authority records
- run intake
- store excerpt/pinpoint
- manage verification status
- manage defects

### 4. Outline module
Responsibilities:
- CRUD OutlineNodes
- attach authorities
- enforce eligibility rules

### 5. Draft module
Responsibilities:
- generate DraftSections
- store generated text
- regenerate sections

### 6. Citation inspector module
Responsibilities:
- create/read ClaimSupportLinks
- serve side-by-side inspection data

### 7. Restart module
Responsibilities:
- taint propagation
- checkpoint creation
- restart recommendation
- restart execution

### 8. Usage/logging module
Responsibilities:
- track model calls
- store event logs
- calculate per-matter usage and cost

---

## Data flow

### Flow A — Research to authority
ResearchItem
→ candidate extraction
→ Authority
→ intake checks
→ verification status

### Flow B — Authority to outline
eligible Authority
→ OutlineNode attachment
→ node readiness

### Flow C — Outline to draft
ready OutlineNode
→ prompt assembly
→ DraftSection
→ ClaimSupportLinks

### Flow D — Defect to restart
Defect
→ taint propagation
→ checkpoint lookup
→ restart scope recommendation
→ regenerate affected artifact

---

## Service boundaries

For v1, keep everything in one repo and one app.

Do not split into:
- separate AI service
- separate verification service
- separate analytics service

Only separate later if one of these becomes painful:
- queueing
- model routing complexity
- document processing scale

---

## Persistence decisions

### Persist
- all core entities
- all statuses
- all defects
- checkpoints
- model usage metadata
- verification summaries

### Do not persist as first-class objects
- full prompt history
- chain-of-thought-like intermediate reasoning
- disposable parsing outputs unless useful

---

## Queueing decision

### V1
No dedicated queue required if flow is mostly interactive and section-sized.

### Trigger for queue later
Introduce a job runner only if:
- source ingestion becomes long-running
- source parsing becomes file-heavy
- verification batches become slow enough to hurt UX

---

## Security / trust decisions

### Single-user first
Treat this as a single-user app in design and threat model.

### Hosted later
When authentication is added:
- every row must belong to a user
- access should be enforced at the database layer
- model logs and source texts should not leak across users

---

## Recommended repo structure

apps/web/
- app/
- components/
- lib/
- server/
- styles/

packages/domain/
- types
- schemas
- state transitions

packages/ai/
- prompt builders
- model routing
- extraction/classification helpers

packages/db/
- prisma schema
- db client
- migrations

docs/
- lean-prd.md
- domain-model.md
- ux-flows.md
- milestone-plan.md
- trust-boundaries-and-restart-rules.md
- model-tool-routing.md
- stack-architecture.md

---

## Build principles

- one deployable app
- one database
- strong typed state transitions
- deterministic checks before model reasoning
- restart from clean checkpoints
- inspectability over autonomy