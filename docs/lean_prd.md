# CleanRoom Law — Lean PRD

## Product Type
Single-user legal research and drafting workspace.

Not:
- a legal search engine
- a chatbot wrapper
- practice management software

Core idea:
A restart-first system that verifies authorities before they shape the outline or draft.

---

## Target User
Law student (you)

Profile:
- memo-heavy workflow
- uses multiple LLMs
- copy-paste + re-prompt heavy
- cares about correctness and traceability
- wants to replace subscriptions with API usage

---

## Core Problem

Current workflow:
- repeated prompting
- context rebuilding
- tab chaos
- unclear authority reliability
- contamination spreads before detection
- no clean restart mechanism

---

## Core Job

Turn:
- messy research
- candidate authorities
- notes and snippets

Into:
- verified authorities
- structured outline
- section draft
- inspectable citations
- clean restart on failure

---

## Product Thesis

Wins if:
- faster than chat workflows
- more reliable authority handling
- less prompting overhead
- visible verification

---

## MVP Scope

1. create matter
2. paste research items
3. verify authorities
4. build outline (verified only)
5. draft one section
6. inspect citations side-by-side
7. restart cleanly on failure

---

## Non-Goals

- legal search
- collaboration
- document sync
- full memo generation
- general chatbot
- billing
- enterprise features

---

## Reliability Decisions

### Deterministic
- existence
- retrieval
- pinpoint

### Model-assisted
- speaker classification
- fit assessment
- drafting

### Human-controlled
- accept warnings
- restart scope
- override decisions

### Restart bias
Default: restart over patching

---

## UX Principles

- workspace, not chat
- always show:
  - what is safe
  - what is risky
  - what is tainted
- always answer:
  **what is the next safe move?**

---

## Success Metrics

### Usage
You actually use it

### Time
Less prompting / context rebuilding

### Reliability
Catches:
- fake cases
- bad quotes
- wrong speaker
- overclaims

### Trust
You can inspect every citation

### Cost
Cheaper than subscriptions

---

## Primary Risk

Too much friction → you stop using it

Solution:
Keep v1 narrow and fast