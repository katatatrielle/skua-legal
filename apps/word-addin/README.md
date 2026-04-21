# Word Add-in

This app is the primary Skua v1 surface.

Current responsibilities:

- Review
- Ask
- Revise
- Saved Clauses
- Settings

Current live behaviors:

- sign in and restore an add-in session with the platform auth endpoints
- choose the active workspace inside Word
- sync the current Word document or selection into the platform
- run platform review requests against the synced scope
- apply comments, tracked-change redlines, fallback inserts, and host undo
- run platform Ask requests with cited answers or unsupported-answer refusal
- run platform Revise requests for suggested language with citations
- create, edit, delete, and apply workspace clause-bank entries
- save preferred language from review and revise back into the workspace clause bank
- emit preference signals when findings are applied, dismissed, or reused
- show workspace billing status, recent spend, and spend-cap posture inside Settings
- show trust-center details and let users delete synced platform documents and matters
- recover anchors after document edits with best-match warnings

Run:

```bash
cd /path/to/skua
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:word-addin
```

Manifest:

- `apps/word-addin/public/manifest.word.xml`

Notes:

- Saved clauses are now backed by the platform clause-bank API and scoped to the active workspace.
- Manual host QA expectations and known bounds are documented in `docs/testing/word-addin-phase6-qa-matrix.md`.
- The full pilot-era computer-control runbook is documented in `docs/testing/phase10-computer-control-test-plan.md`.
