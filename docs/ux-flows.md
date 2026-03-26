# CleanRoom Law — UX Flows

---

## Flow 1: Research Ingestion

Goal:
Dump messy research fast

Steps:
1. create matter
2. paste notes / cases / snippets
3. system stores as ResearchItems
4. extract candidate authorities
5. send to intake

UX rule:
Fast, no friction

---

## Flow 2: Authority Review

Goal:
Decide if authority is usable

Steps:
1. open authority queue
2. see:
   - excerpt
   - existence
   - pinpoint
   - speaker
   - fit
3. choose:
   - verify
   - warning
   - block
   - invalidate

UX rule:
Decisive, not chatty

---

## Flow 3: Outline Builder

Goal:
Build structure from clean authorities

Steps:
1. create nodes
2. attach verified authorities
3. system blocks invalid ones
4. mark node ready

UX rule:
Only clean support allowed

---

## Flow 4: Section Drafting

Goal:
Draft one section

Steps:
1. select outline node
2. generate section
3. link claims to authorities

UX rule:
One section at a time

---

## Flow 5: Citation Inspector

Goal:
See exactly what supports a claim

Interaction:
click claim → open right pane

Shows:
- excerpt
- pinpoint
- speaker
- fit
- trace

UX rule:
1-click inspection

---

## Flow 6: Defect + Restart

Goal:
Recover cleanly

Steps:
1. defect triggered
2. system marks taint
3. shows:
   - cause
   - affected artifacts
   - restart scope
4. user chooses restart
5. system regenerates from checkpoint

UX rule:
Restart should feel controlled

---

## Core Screens

1. Matter Dashboard
2. Research Inbox
3. Authority Review
4. Outline Builder
5. Draft + Inspector
6. Defect / Restart Panel

---

## Core UX Principle

Always answer:
**What is the next safe move?**