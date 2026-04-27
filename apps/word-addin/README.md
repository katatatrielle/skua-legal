# Word Add-in

This app is the primary Skua surface: a secure legal AI workbench inside Word.

Current visible areas:

- Assistant: Ask, Draft, and Review modes
- Memory: workspace saved clauses and reusable legal language
- Controls: sign-in, workspace, provider policy, billing, deletion, and trust posture

Current live behaviors:

- sign in and restore an add-in session with the platform auth endpoints
- choose the active workspace inside Word
- sync the current Word document or selection into the platform
- ask cited questions against the synced matter context
- draft suggested language with citations and rationale
- run bounded citation-anchored reviews when needed
- apply comments, tracked-change redlines, fallback inserts, and host undo
- create, edit, delete, and apply workspace memory entries
- emit preference signals when findings, drafts, or saved clauses are reused
- show provider mode, billing status, recent spend, and spend-cap posture
- show trust-center details and let users delete synced documents and matters
- recover anchors after document edits with best-match warnings

Run:

```bash
cd /path/to/skua
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:word-addin
```

The dev server must be reachable at `https://localhost:3001` because Word add-in manifests require a secure task pane URL. The `dev` script creates a local certificate under `apps/word-addin/certificates/` if one is missing and starts Next with that certificate explicitly.

For Word desktop, trust `apps/word-addin/certificates/localhost.pem` in macOS Keychain before sideloading the manifest. Browser preview can be checked with `curl -k https://localhost:3001`.

Manifest:

- `apps/word-addin/public/manifest.word.xml`

Notes:

- The add-in should stay centered on safe frontier-model use from Word.
- Saved clauses are workspace-backed memory, not a separate playbook product.
- Manual host QA expectations and known bounds are documented in `docs/testing/word-addin-phase6-qa-matrix.md`.
