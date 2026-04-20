# Findings & Decisions

## Requirements
- Build an MVP for commercial contract DD on share and asset purchases.
- Support deal workspaces, PDF/DOCX upload, auto-classification, structured extraction, issue spotting, review grid, cited deal chat, and export outputs.
- Keep playbooks editable as YAML or JSON instead of hardcoded logic.
- Start with operational document review, not autonomous legal reasoning or redlining.
- Use LibreChat as shell, LiteLLM as gateway, a custom DD service, self-hosted embeddings, Postgres/pgvector, Redis, object storage, and Langfuse.

## Research Findings
- The repo already contains the intended monorepo directory layout and a starter commercial playbook, but every workspace is placeholder-only.
- The first useful build slice is not full ingestion; it is a typed API and UI surface that reflects the end-state data model and review workflow.
- Source anchoring is a non-negotiable product requirement, so seed issue payloads should already carry document, page, section, and snippet metadata.
- This machine has Node and Python available, but not `pnpm`, so developer ergonomics need to work with `npm` as well.
- Local `file:` dependencies are the safest monorepo link strategy here because `workspace:*` was rejected by the installed npm build.
- The next slice needs to replace seed fixtures with a real upload path or the core product claim remains unproven.
- A lightweight SQLite plus local-files approach is enough to prove real uploads and reviewable output without committing to the final infra stack yet.
- DOCX page references in a first local slice are inherently approximate unless the file has explicit page breaks; that is acceptable for this stage but still a real product gap.
- The current repo exposes only a due-diligence workspace and review grid, so the Word add-in, contract review actions, precedent library, and richer workflow APIs still need a formal spec before implementation.
- The existing SQLite schema (`workspaces`, `documents`, `document_pages`, `issues`) is a useful seed, but the PRD requires a broader normalized model with document versions, anchors, playbooks, review suggestions, queries, workflows, exports, and provider configuration.
- The current review app already demonstrates a usable visual language for a legal-workflow side panel, which can inform the Word add-in wireframes even though the Word UX will need task-pane constraints and selection-scoped actions.
- The new `docs/specs` bundle now captures the next-stage target as three artifacts: an engineering spec with canonical Postgres tables, a shared API contract doc, and Word add-in wireframes grounded in real task-pane constraints.
- The first implementation step after the spec package can be done safely without touching Office.js yet: a typed `apps/word-addin` scaffold built as a narrow Next.js task-pane shell.
- The shared schema package can now carry both the current DD workspace contracts and the next-stage review contracts without breaking the review app, which keeps the migration incremental.
- Office sideloading is viable from this repo now because the Word add-in dev server can run over `https://localhost:3001`, the task pane loads `office.js`, and a local add-in-only manifest has been validated with Microsoft's official manifest validator.
- For a shared runtime add-in-only manifest, the `<Runtimes>` block must sit directly under `<Host>` and not inside `<DesktopFormFactor>`, and `ShowTaskpane` buttons can route to different pane tabs through distinct `SourceLocation` URLs.
- The current Office adapter is intentionally thin: it reads selection text, reads OOXML, inspects change-tracking mode, inserts comments, and replaces selection text with temporary tracking enabled when necessary. Product data is still mock-backed above that layer.
- The next incremental backend step did not require full document-version infrastructure. A useful bridge is a persisted `review_runs` table keyed by submitted selection text plus a lightweight heuristic suggestion generator.
- Because the task pane runs over `https://localhost:3001` while the DD API is still plain HTTP on `http://127.0.0.1:8000`, a same-origin Next.js proxy route is the safest local development bridge for live review calls.
- The Word add-in Review tab now uses live API-backed review data; the other tabs remain intentionally mock-backed until their corresponding backend slices exist.
- The next useful refinement after live review creation was not polling or streaming; it was making suggestion actions durable. Persisting apply, dismiss, and reviewed states makes the add-in feel much less demo-like.
- Returning the full updated `ReviewRunRecord` from each suggestion-action endpoint is a good fit for this stage because it eliminates client-side reconciliation logic and keeps the pane state easy to replace after every action.
- The next useful refinement after persisted actions was not a bigger workflow engine; it was preserving action history separately from current state. An append-only `review_suggestion_events` table makes debugging and reviewer context much easier without complicating suggestion filters.
- The Office adapter can cheaply capture a post-apply selection snapshot after comment or redline application, which is a useful precursor to fuller anchor-drift handling later.
- A practical first anchor-recovery path does not need persistent Word object handles. Microsoft’s Word API supports `Body.search(...)` returning a `RangeCollection`, and the first matching `Range` can be navigated to with `Range.select()`, which is enough to jump the reviewer back to the likely clause in the document.
- The next valuable review refinement after anchor recovery is lightweight knowledge capture. A separate `playbook_saved_notes` store lets the add-in keep “save to playbook” real and auditable without attempting in-place YAML mutation or full playbook editing yet.
- Once saved notes exist, reviewers need one more layer of control: choosing the target check. The loaded YAML playbooks already expose check IDs and labels, so the add-in can let the reviewer bucket notes precisely without any new backend lookup service.
- The remaining docs-alignment work after targeted playbook capture was mostly UX and state glue, not net-new architecture: review setup controls, running progress state, issue-type filters, review-summary export, richer Ask/Draft/Playbooks interactions, and ribbon entry points.
- A small `review_run_exports` table is enough to make “Export to Project” real in the current slice without inventing a larger project-memory service first.
- The safest pre-broadening move is not a full service rewrite. A bridge layer that auto-creates canonical `projects`, `document_versions`, page-backed `document_anchors`, `job_records`, and `audit_events` under the existing workspace flow gives the repo a stable expansion point without breaking the Word add-in or review app.
- Existing local dev databases need backfill logic on startup or the new canonical routes will behave inconsistently across machines. Rehydrating missing `projects` and `document_versions` from prior `workspaces`, `documents`, and `document_pages` is enough for this stage.
- A lightweight canonical route set is enough to prove the new platform boundary now: `projects`, project-scoped upload, document detail, ingest job replay, and audit log. That gives future web and add-in surfaces something stable to build against before the full contracts API exists.
- The next infrastructure step after canonical records is a real execution model, not another feature tab. A shared `job_records` queue plus a small worker runner gives the repo a durable path for long-running work without forcing an immediate migration to Redis or Celery.
- SQLite queue semantics are viable for this local stage if claim and complete operations read their rows inside the same transaction. Cross-connection reads immediately after `INSERT` or `UPDATE` can look stale until commit, which matters for enqueue and completion responses.
- Keeping the existing synchronous endpoints while adding queue-backed companions is the safest way to broaden the platform. Current UX stays intact, but new features can target the async job surface from the start.
- Ask is a good second workload for the queue model because it exercises persisted runs, citations, worker completion, and add-in polling without needing the full library/retrieval system yet.
- The Word add-in Ask flow needs more than a document ID. In practice, the active selection is often the only reliable context at run time, so the persisted Ask contract needs optional selection text and anchor payloads even in the long-term model.
- Draft is the natural third workflow on the same backbone. It needs one extra output shape beyond Ask: a persisted generated clause plus a short ranked set of precedent-style matches so the add-in still feels library-backed.
- The first queue-backed Draft implementation does not need full semantic retrieval to be useful. Deterministic library-style matches and document-aware clause adjustments are enough to prove the run model and UI choreography before pgvector-backed search lands.
- The next structural step after queued Draft is a shared retrieval layer. Extracting lightweight clause-like library items from document anchors is enough to make Draft consume real uploaded content now, even before embeddings and vector search exist.
- DOCX provenance is still imperfect because the current parser tracks headings at the page bucket level, not the paragraph/section block level. That means library item section labels can be coarse even when the clause text itself is usable.
- Tightening retrieval quality is mostly a data-shape problem now: if the same clause unit feeds anchors, library items, and Draft provenance, the rest of the workflow gets cleaner without another top-level feature.
- Basic metadata filters on library search already pay off. Even before embeddings, doc-type, governing-law, counterparty, and document-name filters make precedent lookup feel much less toy-like.
- Next.js route-type generation is part of the real typecheck path for these apps, but `next typegen` alone still proved flaky here. Using `next build >/dev/null && tsc --noEmit` is slower but stable on a fresh checkout.
- The first web-side expansion should stay on the same queue model as the Word add-in. Query runs are a clean fit because they need persistence, polling, tabular output, and export, but not yet a full template system.
- Reusing the existing citation and document-metadata helpers gets multi-document queries surprisingly far. For the current slice, questions like governing law, counterparty, assignment consent, and auto-renewal can be answered well enough without a separate extraction engine.
- Workflow templates do not need a brand-new executor at this stage. Treating a workflow run as “query extraction plus report assembly” is enough to ship DD memo drafts and exceptions while keeping the codepath coherent.
- File-backed workflow templates are a better fit than hardcoded templates even in this early slice, because they preserve the product principle that firms should be able to edit the rules and outputs.
- Once reports exist, the next useful step is not more generation quality in isolation. Reviewers need a correction loop: fix extracted cells, then separately edit the memo/exceptions output without rerunning everything.
- Lightweight artifact downloads are enough for the current slice. Plain markdown/text exports prove the UX and contracts now, and richer Word/XLSX formatting can layer on later.
- The next useful report-layer upgrade after text exports is binary artifact parity, not a new feature surface. Workflow tables and memo drafts can move to `.xlsx` and `.docx` while still reusing the same workflow/report persistence model.
- Reviewer correction history needs to include report regenerations triggered by cell fixes, not just direct memo edits. Otherwise the audit trail looks incomplete even when the content changes correctly.
- Next.js route handlers in this repo accept binary artifact bodies cleanly when the exported `Uint8Array` is wrapped as a `Buffer`, which is the safest pattern for the review app's proxy routes.
- Once binary exports exist, the next trust improvement is structured composition rather than another new workflow: reviewer workbooks benefit from dedicated citations/history sheets, and memo exports benefit from metadata and history sections.
- Event history becomes much more useful when each saved event carries a compact diff summary. The UI and exports can then explain what changed without re-diffing whole snapshots on every read.
- After structured composition, the next leverage point is moving layout decisions into the workflow template itself. Workbook tabs and memo sections are workflow behavior, not just renderer behavior.
- Template-driven export layouts fit the current architecture well because the workflow YAML is already the editable control surface. Extending that file is cleaner than adding another export-only config system.
- Once layout is template-driven, artifact variants are the natural next step. They let one workflow keep the same extraction logic while producing different buyer/internal deliverable shapes.
- The Standards tab was one of the last obviously mock-shaped surfaces in the Word add-in. Replacing it with a file-backed comparison run improves product alignment more than further report-format refinement would.
- The current standards implementation is now on the right backbone, but it is still a scoring pass rather than a full remediation loop. The next meaningful step is clause-level fix insertion, not more scoring permutations.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Build the kickoff around a typed DD API and seeded workspace data | This makes the next ingestion and extraction phases additive rather than requiring contract redesign later. |
| Keep services and apps independently runnable with local package metadata | The repo needs a clear developer experience immediately if others are going to fork and extend it. |
| Model issue and extraction outputs with shared TypeScript and Python-friendly schemas | The architecture spans a Next.js-style UI and Python orchestration services, so shared data contracts matter early. |
| Add first-pass memo and exceptions-list payloads to the seed API | Those outputs are part of the MVP promise and should influence the data model from the start. |
| Use SQLite and synchronous parsing for the first real upload slice | This minimizes setup friction while still exercising the full workspace-upload-review path. |
| Keep issue spotting heuristic for now | Deterministic spotting is enough to prove the document-in, cited-issue-out path before bringing in prompts or model orchestration. |
| Publish the next-stage product design as markdown docs under `docs/` | This gives the repo an implementation target without prematurely locking the code into one backend or Word add-in scaffold. |
| Treat the first Word add-in pass as a product-shell milestone, not an Office integration milestone | This de-risks the build by proving UI density, interaction model, and shared contracts before manifest and host APIs are involved. |
| Validate Office manifests with `office-addin-manifest` before calling the layer complete | The XML schema ordering rules are strict enough that validation catches real sideload blockers quickly. |
| Use a selection-text review bridge before full document anchoring | This is the fastest way to replace mock review cards with live API behavior while keeping the future anchor model compatible. |
| Make review-suggestion action endpoints return the parent run, not a tiny status payload | This keeps the current add-in implementation simple and avoids additional fetch choreography after each action. |
| Store review action history in a separate append-only table instead of denormalizing it into the suggestion row | This keeps current-state filters fast and predictable while still preserving a useful timeline. |
| Handle first-pass anchor drift recovery in the add-in UI rather than adding a new backend workflow | The needed data already exists on the suggestion record, and Word-side quote search is the shortest path to an actionable reviewer recovery flow. |
| Store saved playbook captures separately from loaded YAML playbooks | Review-time knowledge capture and authored rule packs are different concerns, so keeping them separate avoids pretending captured notes are already productionized rules. |
| Reuse loaded playbook YAML metadata to drive save-target selection in the add-in | The playbook list and check list are already available in the client, so explicit targeting does not require another orchestration layer. |
| Use lightweight local state to align Ask and Draft with the wireframes before building full backend runs for them | This keeps the UI honest to the product shape while reserving heavier API work for a later slice. |
| Bridge canonical project/document/job/audit records into the current DD API instead of waiting for a full service split | This keeps the repo runnable while moving the persisted data model closer to the engineering spec. |
| Introduce the worker model first for re-ingest and review-export jobs | These are narrow enough to prove queue semantics now and broad enough to establish the pattern future workflows can reuse. |
| Move Ask onto the queued run model before Draft | Ask has a simpler output surface, so it is the faster way to prove that end-user add-in interactions can create persisted runs and poll worker-completed results. |
| Move Draft onto the same persisted run model immediately after Ask | Once Ask proved the queue/polling pattern, Draft could reuse it with only one new output contract instead of inventing another architecture. |
| Derive the first library items from extracted anchor segments | This reuses existing parsing work, keeps the retrieval layer cheap, and gives future features a common source of clause-like text right away. |
| Tighten retrieval quality before adding another major feature surface | Clause-level provenance and metadata filters improve both Draft and future query/workflow features without widening the platform again. |
| Put multi-document queries on the canonical project/job layer before touching workflows or DD memo templating | That keeps the web-side roadmap additive: workflow templates can later wrap query runs instead of replacing them. |
| Use workflow runs as the first DD report artifact source | Memo drafts, exception lists, and document summaries now have a durable parent run, which makes later export jobs and reviewer corrections much easier to add. |
| Add correction and export loops before richer output formatting | Reviewer trust improves more from editable artifacts than from prettier artifacts at this stage. |
| Add binary export support and event history on top of the existing correction loop before broadening again | This turns the workflow/report slice from editable-only into a more credible reviewer deliverable without requiring another architectural branch. |
| Add diff-aware event summaries at write time instead of computing them ad hoc in the UI | The same summary now feeds the workspace history view and the exported artifact appendix, which keeps product behavior consistent. |
| Keep fallback export layouts in code even after making workflow artifacts template-driven | This avoids brittle failures if a workflow YAML is older or only partially configured while still letting newer templates control the structure. |
| Add artifact variants to the workflow YAML instead of branching workflows just for deliverable style | This keeps extraction logic stable while still letting teams choose buyer-full versus executive-brief style output. |
| Standards remediation should be explicit in the API contract | Returning `fix_mode` and `matched_excerpt` from the backend lets the Word add-in apply the right action without inventing its own remediation heuristics. |
| Standards JSON blobs need tolerant hydration while the schema evolves | Older SQLite rows stored only clause labels or minimal dicts, so backward-compatible record building prevents existing runs from breaking. |
| Standards template breadth is cheap once the loader scans a directory | Adding `vendor-paper-tightened.yaml` broadened coverage without introducing any new configuration surface. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| No prior runnable code existed in the repo | Treat the kickoff as a fresh scaffold-to-foundation pass and avoid assuming hidden app state. |
| FastAPI smoke tests required `httpx` in addition to the runtime stack | Added a `dev` extra and verified endpoints with `TestClient`. |
| YAML numeric parsing conflicted with strict string version fields | Normalized playbook version values to quoted strings. |
| Next.js app-router typing was stricter than the first `searchParams` signature | Updated the page prop typing to match generated Next types. |
| Office typings did not expose `InsertLocation.after`, and `insertText(..., \"After\")` did not return a `Range` | Switched to the literal `"After"` API value and returned an anchor snapshot from the inserted fix text instead of relying on a typed range object. |

## Resources
- `/Users/katerinamcmullen/Documents/GitHub/skua/README.md`
- `/Users/katerinamcmullen/Documents/GitHub/skua/packages/playbooks/commercial-dd-basic.yaml`
- `/Users/katerinamcmullen/.codex/skills/planning-with-files/SKILL.md`

## Visual/Browser Findings
- None yet.
