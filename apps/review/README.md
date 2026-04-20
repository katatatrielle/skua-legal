# Review App

This app is the diligence review surface.

Current responsibilities:

- spreadsheet-style issue grid
- filters by issue type, severity, status, and document type
- seed memo draft and exceptions list display
- highlight cards for top diligence issues
- create-workspace and upload controls for real files
- queue-backed multi-document query runs with table output and CSV export
- queue-backed DD workflow runs with generated memo drafts, exceptions, and document summaries
- reviewer correction flows for extracted workflow cells plus memo/exceptions editing, multi-sheet workflow `.xlsx` export, memo `.docx` export, and visible edit history with diff summaries

## Run

```bash
cd /path/to/skua
DD_API_BASE_URL=http://127.0.0.1:8000 npm run dev:review
```

## Notes

- The app expects the DD API to expose at least the `project-redwood` seed workspace.
- Real uploads require creating a non-demo workspace first.
- Styling is intentionally more editorial than dashboard-generic so the review surface has a distinct legal-workflow feel.
- Query runs are project-backed, so the app now loads canonical project documents and query history alongside the older workspace review surface.
- Workflow runs reuse the same project/job layer, so the review app can now show saved-style diligence sweeps and report output without leaving the workspace.
- The current workflow panel supports cell correction, report editing, rerun, multi-sheet workflow `.xlsx` download, memo `.docx` download, and a lightweight history view for saved workflow/report events with change summaries.
- Export structure is now driven by the workflow template, and the current workflow panel can choose among template-declared artifact variants before running.
