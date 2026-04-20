# Word Add-in App

This app is the first scaffold for the Skua Word add-in experience.

Current responsibilities:

- render a task-pane-sized product shell
- prove the Review, Ask, Draft, Playbooks, and Standards tab structure
- exercise the shared review-run and suggestion contracts from `@skua/schemas`
- give the repo a realistic UI target before deeper Office.js and API wiring land
- expose a sideloadable Word manifest plus command assets for local add-in testing

## Run

```bash
cd /path/to/skua
npm run dev:word-addin
```

The scaffold runs on `http://127.0.0.1:3001`.

Because the dev script uses `next dev --experimental-https`, the add-in origin is also available at `https://localhost:3001`, which is the URL used by the local manifest.

## Manifest

The local add-in only manifest lives at:

- `apps/word-addin/public/manifest.word.xml`

The manifest currently:

- targets Word only
- uses a shared runtime
- adds Home-tab ribbon buttons for Open Pane, Review Selection, Review Document, Ask, Draft from Library, Refresh Anchors, and Export to Project
- routes those buttons to the task pane with tab query parameters

## Current Office integration

The thin Office adapter lives at:

- `apps/word-addin/lib/office.ts`

Current live host behaviors:

- detect whether the pane is running inside Word
- read the current selection text and OOXML
- read the current document body text for full-document review scope
- read current change-tracking mode
- insert a comment at the current selection
- replace the current selection while temporarily enabling tracked changes if needed
- search the current document for a stored clause excerpt and re-select the closest match in Word

Current live review behaviors:

- post a real review run to the DD API through same-origin Next.js proxy routes
- persist the run and suggestions in the DD API's local SQLite database
- render returned review suggestions in the Review tab instead of using mock review cards
- persist comment/redline application receipts, dismissals, and reviewed states back to the DD API
- capture post-apply selection context from Word and send it with suggestion application receipts
- help reviewers recover from anchor drift by locating the latest clause text in the document
- save review suggestions into persisted playbook-note memory and surface those notes in the Playbooks tab
- let reviewers choose the target playbook and target check before saving a suggestion note
- export review summaries back to the local project store
- post real Ask runs to the DD API and poll for worker-completed cited answers
- post real Draft runs to the DD API and poll for worker-completed clause results plus library matches
- use richer local state for Playbooks so it aligns more closely with the wireframe docs

## Notes

- Review, Ask, and Draft are now API-backed; Standards and most Playbooks authoring actions are still local/mock-backed.
- The next implementation pass should connect Standards and playbook editing to first-class backend runs instead of local UI state.
