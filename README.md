# CleanRoom Law

Single-user legal research and drafting workspace built around verified authorities, claim-level support inspection, and restart-first recovery when support fails.

## What you can do

- Create matters from the home page.
- Capture messy research items and extract candidate authorities.
- Run authority intake and provenance review before anything reaches drafting.
- Build outline nodes from verified authorities only.
- Draft one section at a time with claim-level citation support.
- Inspect support, open defects, checkpoints, model runs, and restart recommendations in the draft workspace.
- Re-run restart from an open defect without reusing tainted prose.

## Local setup

1. Copy env vars.

```bash
cp .env.example .env
```

2. Start Postgres.

```bash
docker compose up -d db
```

3. Install dependencies.

```bash
npm install
```

4. Generate Prisma client, apply committed migrations, and seed the demo matter.

```bash
npm run db:setup:local
```

5. Start the app.

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

The seeded matter is called `CleanRoom Demo Matter`.

## Running tests

Unit and integration tests:

```bash
npm test
```

Production build:

```bash
npm run build
```

Playwright:

```bash
npm run test:e2e
```

Playwright assumes Postgres is running and the demo seed has been applied.

## Database workflows

Apply committed migrations:

```bash
npm run db:migrate
```

Reset the local database:

```bash
npm run db:reset
npm run db:setup:local
```

## Model configuration

The app defaults to heuristic fallbacks in automated tests.

- `OPENAI_API_KEY` enables OpenAI-backed provenance review and section drafting.
- `OPENAI_PROVENANCE_MODEL` controls authority review.
- `OPENAI_DRAFT_MODEL` controls section drafting.
- `OPENAI_INPUT_COST_PER_1K_TOKENS` and `OPENAI_OUTPUT_COST_PER_1K_TOKENS` are optional if you want non-zero cost estimates in diagnostics.

## Manual acceptance checklist

1. Create a new matter.
2. Add a citation-only or snippet research item.
3. Create an authority and select a preferred source.
4. Run intake and provenance review.
5. Verify the authority, attach it to an outline node, and draft a section.
6. Inspect claim support in the citation inspector.
7. Block or invalidate an authority and confirm the restart queue appears.
8. Run restart from the draft workspace and confirm the section is regenerated or cleared safely.
