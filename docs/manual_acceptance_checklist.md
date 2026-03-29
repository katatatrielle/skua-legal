# Manual Acceptance Checklist

Use this after `docker compose up -d db` and `npm run db:setup:local`.

## Happy path

1. Open the seeded `CleanRoom Demo Matter`.
2. Confirm research, authorities, and draft pages all load.
3. Create a new matter from the home page.
4. Add a snippet-backed research item with a clear authority citation.
5. Create an authority from that research item and open review.
6. Run intake using the linked source text.
7. Run provenance review with a proposition that matches the excerpt.
8. Verify the authority.
9. Open draft workspace, create an outline node, attach the verified authority, and draft a section.
10. Confirm the citation inspector shows claim text, claim location, authority name, excerpt, locator, and verification summary.
11. Confirm diagnostics show non-zero model runs and recent workflow events.

## Failure path

1. Starting from a drafted section, return to authority review.
2. Block or invalidate the authority used in that drafted section.
3. Open draft workspace and confirm the restart queue appears.
4. Confirm the affected outline node and draft section show `suspect` or `tainted` state.
5. Run restart from the recommended scope.
6. Confirm the section is either regenerated from remaining clean support or cleared safely when no clean support remains.
7. Confirm diagnostics show a restart event and the latest clean checkpoint.

## Evaluation notes

Record these while using a real assignment:

- Time to first clean outline node
- Time to first usable section draft
- Number of defects caught before drafting
- Number of restarts triggered
- Approximate API cost shown in diagnostics
- Whether you could inspect every material claim without leaving the app
