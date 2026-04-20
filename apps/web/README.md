# Web App

This app is the thin support surface for Skua.

Current responsibilities:

- workspace and matter selection
- support-side document upload
- findings and citation inspection
- lightweight memo and exception views

Run:

```bash
cd /path/to/skua
SKUA_API_BASE_URL=http://127.0.0.1:8000 npm run dev:web
```

Notes:

- This is not the primary product surface.
- The main workflow remains the Word add-in.
- `DD_API_BASE_URL` still works as a fallback during the rename transition.
