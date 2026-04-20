# Word Add-in

This app is the primary Skua v1 surface.

Current responsibilities:

- Review
- Ask
- Revise
- Saved Clauses
- Settings

Current live behaviors:

- read the current Word selection and document body
- run persisted review requests
- apply comments and tracked-change redlines
- run persisted Ask requests with citations
- run persisted Revise requests for suggested language
- save review guidance into clause-memory scaffolding
- recover anchors after document edits

Run:

```bash
cd /path/to/skua
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:word-addin
```

Manifest:

- `apps/word-addin/public/manifest.word.xml`

Notes:

- The add-in still reuses some older draft and playbook implementation paths internally while the visible UI has been narrowed to the v1 contract.
- The next slice should promote saved-clause CRUD and settings surfaces into first-class backend features.
