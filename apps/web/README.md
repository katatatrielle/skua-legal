# Web App

This app is the Skua control room. It supports the Word workbench; it is not the main lawyer workflow.

Current responsibilities:

- workspace and matter selection
- support-side document upload
- cited finding and document-status inspection
- billing, trust, support-admin, and readiness visibility when a support token is configured
- operational proof that provider, storage, retention, deletion, and usage controls are working

Run:

```bash
cd /path/to/skua
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:web
```

Notes:

- The main workflow remains the Word add-in.
- DD workflows and report generation are no longer exposed through the active web app.
- `SKUA_SUPPORT_TOKEN` enables the internal support/admin panels, workspace billing summary, and readiness dashboard.
