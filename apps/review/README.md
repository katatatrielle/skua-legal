# Review App

This app is the transitional web console for Skua Legal.

Target role in the product:

- auth and account entry
- workspace and matter context
- playbook management
- clause-bank and saved fallback management
- run history, audit visibility, and spend-style controls

Current prototype responsibilities still include older review-workspace behavior:

- spreadsheet-style issue grid and source inspection
- create-workspace and upload controls for real files
- project-backed query history and CSV export
- legacy workflow and DD report panels
- reviewer correction flows and artifact export history

## Transition Notes

- `apps/review` remains the filesystem path for compatibility.
- The current UI still contains DD- and workflow-oriented prototype panels.
- Those legacy panels are no longer the target product thesis; they are transitional scaffolding while the console narrows around solo-first contract review support.
- The reusable foundations here are workspace switching, upload flows, run history, and project-backed persistence.

## Run

```bash
cd /path/to/skua
DD_API_BASE_URL=http://127.0.0.1:8000 npm run dev:review
```

## Notes

- The app expects the backend at `DD_API_BASE_URL`; that env var name stays unchanged for now.
- The app still expects the transitional backend service under `services/dd-api`.
- The seed workspace `project-redwood` remains available for local prototype testing.
