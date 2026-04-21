# Word Add-in Phase 6 QA Matrix

This matrix documents the bounded manual QA surface for the Word add-in core experience after Phase 6.

## Core matrix

| Area | Word Mac desktop | Word Windows desktop | Expected behavior | Known bounds |
|---|---|---|---|---|
| Sign in / sign out | Manual verification required | Manual verification required | Add-in stores the session in an HTTP-only cookie and restores `auth/me` on reload | Browser preview cannot validate host-only session persistence semantics |
| Workspace switching | Manual verification required | Manual verification required | Workspace selector changes the active platform workspace and subsequent sync/run calls scope correctly | No cross-user workspace sharing polish yet |
| Sync full document | Manual verification required | Manual verification required | Current Word body text uploads as a text snapshot and reuses the last synced version when the body hash is unchanged | This is a text snapshot, not native DOCX round-tripping from Word |
| Sync current selection | Manual verification required | Manual verification required | Current selection uploads as a scoped text snapshot and avoids duplicate re-sync when the selection hash is unchanged | Selection sync is only as precise as the active Word selection |
| Review run | Manual verification required | Manual verification required | Review runs against the synced scope, returns findings with citations, and supports comment/redline/fallback actions in Word | Apply actions are local Word actions, not persisted backend apply events yet |
| Ask run | Manual verification required | Manual verification required | Ask returns a short cited answer or refuses unsupported factual claims | Selection-local retrieval is strongest when the current document has already been synced |
| Revise run | Manual verification required | Manual verification required | Revise returns `Suggested language:` output plus rationale and citations | Clause-bank persistence is still local add-in storage until Phase 7 |
| Anchor relocation | Manual verification required | Manual verification required | Citation jump uses backend relocation plus Word text search and warns on best-match fallback | Heavily rewritten clauses can still fail to relocate exactly |
| Undo last apply | Manual verification required | Manual verification required | Add-in attempts host undo when available and otherwise instructs the user to use Word Undo directly | Host support for `undoAsync` is not uniform across Office runtimes |

## Stress cases

| Case | Expected behavior | Current bound |
|---|---|---|
| Long documents | Full-document sync should still produce a text snapshot and review/ask/revise should remain scoped to the active workspace | Large text snapshots may be slower because the add-in currently uploads plain text instead of native DOCX bytes |
| Tracked changes on | Comment/redline insertion should apply without forcing a mode change | Reviewers should still confirm Word's own track-changes rendering before pilot use |
| Tracked changes off | Add-in temporarily enables track changes for redline/insert flows where needed | The host may still vary in how visibly that toggle transition is surfaced |
| Heavily edited drafts | Citation jump should attempt best-match relocation and warn when it falls back | Best-match search is text-based and can fail after substantial rewrite or clause deletion |
| Browser preview | Pane should render and explain that Office host actions are unavailable | This is only a scaffold mode, not a supported production path |

## Pilot guidance

- Pilot reviewers should use synced full-document runs for the most reliable Ask and Revise behavior.
- Review apply flows are bounded to comment, replace selection, insert-after selection, and Word-host undo where available.
- Saved clauses are local to the add-in browser/runtime until backend clause-bank CRUD lands in Phase 7.
