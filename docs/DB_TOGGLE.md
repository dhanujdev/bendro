# DB Toggle — Mock ↔ Postgres

> The runbook for switching bendro between the in-memory mock data, a local
> Postgres container, and Neon (preview / prod). See ADR-0002 for the
> architectural rationale and `docs/DECISIONS.md` D-007 for the local-DB
> choice.

---

## TL;DR

| Backend | How to enable | When to use |
|---|---|---|
| Mock (default) | leave `DATABASE_URL` unset | Fresh clone, unit tests, quick dev |
| Local Postgres | `pnpm db:local:up` + set `DATABASE_URL` | Integration testing, parity checks, migrations |
| Neon preview | Vercel preview env var | Preview deploys (1 branch = 1 DB) |
| Neon prod | Vercel prod env var | Production deploys |

The adapter (`src/lib/data.ts`) picks the backend automatically. Callers
never branch on the backend. `isFallbackError()` handles graceful
fallback when the DB is misconfigured or unreachable.

---

## Local Postgres via Docker

### Start / stop

```bash
pnpm db:local:up       # docker compose up -d (detached)
pnpm db:local:down     # docker compose down (volume preserved)
pnpm db:local:reset    # down -v && up -d (DESTRUCTIVE — drops data)
```

Container details:

- Name: `bendro-postgres`
- Image: `postgres:16-alpine`
- Port: `5432`
- User / pass / db: `bendro` / `bendro` / `bendro`
- Volume: `bendro-pgdata` (preserved across `up/down`; wiped by `reset`)

### Point the app at the container

Add to `.env.local`:

```
DATABASE_URL=postgresql://bendro:bendro@localhost:5432/bendro
```

Restart `pnpm dev` so the env change takes effect.

---

## Migration workflow

### 1. Change the schema

Edit `src/db/schema.ts`. Any change to `pgTable(...)` or `pgEnum(...)` is a
schema change.

### 2. Generate the migration

```bash
pnpm db:generate
```

Drizzle-kit writes a new SQL file into `src/db/migrations/`. **Review the
generated SQL before applying it.** Look for:

- Column adds with a NOT NULL default — OK
- Column drops — confirm no code references the column
- Type changes — confirm compatible with existing data
- Enum changes — Postgres does not allow dropping enum values in a single
  migration; split into add-new → backfill → drop-old if needed

### 3. Apply the migration

Against local:

```bash
pnpm db:local:up
DATABASE_URL=postgresql://bendro:bendro@localhost:5432/bendro pnpm db:migrate
```

Against a Neon branch (preview or prod):

```bash
DATABASE_URL="postgres://...@ep-xyz.neon.tech/...?sslmode=require" pnpm db:migrate
```

### 4. Seed (idempotent)

```bash
pnpm db:seed
```

The seed uses `INSERT ... ON CONFLICT DO NOTHING` on every write, so it is
safe to re-run against an already-populated database. Routine ↔ stretch
joins are only inserted when the routine itself was newly created, to avoid
stomping manual edits.

### 5. Verify

```bash
pnpm db:studio   # opens Drizzle Studio against DATABASE_URL
```

---

## Neon branching for previews

**Strategy:** one Neon branch per long-lived environment. Every PR gets a
Neon "preview" branch forked from the main branch at PR-open time,
torn down on PR-close.

1. Create the Neon project. Note the main branch's `DATABASE_URL`.
2. In Vercel → Project → Environment Variables, set:
   - Production → `DATABASE_URL` = main-branch URL
   - Preview → `DATABASE_URL` = fetched from the Neon Vercel integration
     (which auto-creates a branch per Vercel preview deploy)
3. Enable the [Neon × Vercel integration](https://vercel.com/integrations/neon)
   so each Vercel preview gets a throwaway Neon branch with the current
   schema. Preview branches cost pennies and are garbage-collected when the
   Vercel preview is removed.
4. Ensure `pnpm db:migrate` runs as part of the Vercel Build Command on
   preview so every preview has the latest schema. (Production migrations
   run manually from a maintenance window — never on auto-deploy.)

---

## Integration testing against real Postgres (roadmap)

Phase 14 (E2E) will add:

- `tests/integration-db/**` — suite that runs with a live Postgres
- CI step that starts `docker-compose.db.yml`, runs migrations + seed,
  then runs the DB-backed integration suite
- `pnpm test:integration:db` script

Until then, the Drizzle paths are exercised manually + via the mock
fallback unit tests in `tests/unit/data-adapter.test.ts` and
`tests/unit/data-fallback.test.ts`.

---

## Fallback semantics (what happens when the DB is down)

`src/lib/data.ts` wraps every DB call in `withFallback(op, tryDb, fallback)`.
If `tryDb` throws and `isFallbackError(err)` returns true, the adapter:

1. Logs the fallback **once per operation per process** (so dev console
   stays quiet on fresh clones with no `DATABASE_URL`).
2. Calls `fallback()`, which returns data from `src/lib/mock-data.ts`.

`isFallbackError` returns true for:

- `DATABASE_URL is not set`
- Connection-level failures: `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`,
  `fetch failed`, `getaddrinfo`, `connect` (space-delimited)

Anything else — a Zod error inside a service, a unique-constraint
violation, a real bug — surfaces to the caller.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App keeps returning mock data despite `DATABASE_URL` set | Container not running, or URL typo | `pnpm db:local:up`; check `DATABASE_URL` in `.env.local`; restart `pnpm dev` |
| `pnpm db:migrate` says "no migrations to run" but schema is out of sync | `drizzle-kit` cached — run with a clean shell | `pnpm db:generate && pnpm db:migrate` |
| `pnpm db:seed` duplicates routines | Unexpected — seed is idempotent | Check `onConflictDoNothing()` is still present in `src/db/seed.ts` |
| Container port conflict on 5432 | Another Postgres running locally | Stop it or change the host port in `docker-compose.db.yml` |

---

## References

- ADR-0002 — Mock ↔ Drizzle Data Adapter pattern
- ADR-0004 — Auth.js v5 + Drizzle adapter (for the new auth-related tables)
- D-007, D-008 — local DB + DataAdapter interface decisions
- `src/lib/data.ts`, `src/lib/data-fallback.ts`
- `src/db/index.ts`, `src/db/schema.ts`, `src/db/seed.ts`
- `docker-compose.db.yml`, `drizzle.config.ts`
