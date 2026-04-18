# Phase 5 — DB Toggle Hardening (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** backend-lead

## Delivered

1. **`DataAdapter` contract formalized** in `src/lib/data.ts`. An explicit
   `DataAdapter` interface (built from `typeof` on each exported function)
   plus a `dataAdapter` object that satisfies it. Callers retain the
   existing named imports; tests can now `vi.mock("@/lib/data", ...)` to
   swap the whole adapter behind a single shape. Adding a new operation
   now forces both the function and the interface to move together — the
   compiler catches drift.

2. **Fallback classifier extracted** to `src/lib/data-fallback.ts`.
   `isFallbackError()` and `shortReason()` moved out of `data.ts` so the
   classifier can be unit-tested independently. `tests/unit/data-fallback.test.ts`
   adds 11 tests: happy paths (`DATABASE_URL is not set`, `ENOTFOUND`,
   `ECONNREFUSED`, `ETIMEDOUT`, `fetch failed`, `getaddrinfo`, `connect `),
   rejection of real errors (Zod, unique-constraint, non-Error throws),
   case-insensitivity, and truncation at 80 chars.

3. **`hasDatabaseUrl()` helper** added to `src/db/index.ts`. Returns
   `true` iff `DATABASE_URL` is set and non-empty. The JSDoc explains
   why `src/lib/data.ts` deliberately **does not** call it — the
   adapter prefers error-classifier-based fallback because a set-but-
   unreachable URL is indistinguishable from an unset URL at the
   application layer, and we want callers to get identical "safe
   mock" behavior for both. `tests/unit/db-env.test.ts` (3 tests)
   pins unset / empty / set cases and preserves the original
   `process.env.DATABASE_URL` across runs.

4. **Local Postgres via Docker Compose.** `docker-compose.db.yml`
   provisions `postgres:16-alpine` on `localhost:5432` with credentials
   `bendro / bendro / bendro`, named container `bendro-postgres`, persistent
   volume `bendro-pgdata`, and a `pg_isready` healthcheck. `package.json`
   gains `db:local:up` / `db:local:down` / `db:local:reset` scripts. The
   compose file is the same one CI (Phase 15) will lean on, so local
   and CI Postgres are exactly equivalent.

5. **`.env.example` updated** to show both Neon and local-compose URLs
   side-by-side, with a pointer to `docs/DB_TOGGLE.md` for the workflow.
   Default remains unset (mock fallback on fresh clones).

6. **`docs/DB_TOGGLE.md` runbook** covering:
   - TL;DR backend-selection table (mock / local / Neon preview / Neon prod).
   - Docker compose workflow (up / down / reset, container details).
   - Migration workflow: `pnpm db:generate` → review → `pnpm db:migrate` →
     `pnpm db:seed` → `pnpm db:studio`, with review-the-SQL notes
     (NOT NULL defaults, enum changes, split add→backfill→drop).
   - Neon branching strategy: main branch for prod, Neon × Vercel
     integration for per-PR preview branches, manual prod migrations
     off the auto-deploy path.
   - Fallback semantics: how `withFallback(op, tryDb, fallback)` picks
     between Drizzle and mock data, and what `isFallbackError()` catches
     vs. what surfaces to the caller.
   - Troubleshooting table + references.

7. **`docs/DECISIONS.md` D-007 and D-008** captured the two load-bearing
   decisions: local Postgres 16 via compose (parity with Neon), and
   `DataAdapter` interface via `typeof` (compile-time contract without
   duplicated type definitions, extracted fallback classifier for unit
   testing).

## Coverage

```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|---------
All files           |   80.94 |    77.20 |   81.89 |   80.79
 lib/data-fallback  |   93.33 |    91.66 |  100.00 |  100.00
 services           |   93.90 |    91.54 |   86.53 |   95.13
```

154 tests across 15 files, all green. Both global (≥70%) and service-layer
(≥85% lines) thresholds pass. Global line coverage up from 79.88% → 80.79%.

## Notes for Future Phases

- **Integration tests against real Postgres** — Phase 14 (E2E) owns the
  `tests/integration-db/**` suite and the `pnpm test:integration:db`
  script that starts `docker-compose.db.yml`, runs migrations + seed,
  then executes the DB-backed tests. The compose file, seed idempotency
  (`onConflictDoNothing`), and the `DataAdapter` shape are all ready for
  that wiring — Phase 14 just needs to point Vitest at a container.
- **Neon × Vercel preview branches** — wiring is documented in
  `docs/DB_TOGGLE.md §Neon branching` but the integration must be
  enabled from the Vercel dashboard. Phase 15 (Deployment) turns this on
  and asserts that every preview runs `pnpm db:migrate` during its build
  command. Production migrations stay off the auto-deploy path
  (maintenance-window only).
- **`ADR-0005 skipped intentionally.** ADR-0002 already covers the
  mock ↔ Drizzle adapter pattern; Phase 5 is hardening work, not a new
  architectural decision. Captured as DECISIONS D-007 and D-008 instead
  to avoid ADR churn.
- **Pre-existing `src/db/migrations/0000_loose_ghost_rider.sql`** from
  Phase 3 is still not applied — the Phase 3 closeout deferred this to
  Phase 5, but Phase 5 is adapter-shape work, not a migration exercise.
  Apply when Phase 6 (Onboarding) lands its schema changes, so the first
  migration-apply is meaningful end-to-end.

## Exit Criteria Met

- [x] `pnpm test` green (154 tests across 15 files)
- [x] `pnpm typecheck` clean
- [x] Coverage thresholds pass (global ≥70% lines, services ≥85% lines)
- [x] `DataAdapter` interface exported from `src/lib/data.ts`
- [x] `isFallbackError` / `shortReason` extracted to `src/lib/data-fallback.ts`
      with 11 dedicated unit tests
- [x] `hasDatabaseUrl()` helper on `src/db/index.ts` with 3 unit tests
- [x] `docker-compose.db.yml` with healthcheck + volume
- [x] `pnpm db:local:up` / `down` / `reset` scripts wired
- [x] `.env.example` updated to show local + Neon URLs
- [x] `docs/DB_TOGGLE.md` runbook committed
- [x] `docs/DECISIONS.md` D-007, D-008 appended
- [x] `CHANGELOG.md` [Unreleased] updated; single closeout commit

## Next Phase

**Phase 6 — Onboarding & Personalization** (frontend-lead + backend-lead,
Default model). Entry criterion met.
Top backlog items: goal capture form (`src/app/onboarding/*`), focus /
avoid body-area selection, pre-existing-condition gate per
`HEALTH_RULES.md`, `src/services/personalization.ts` tightened from stub
to real filter, `GET /api/me` + `PATCH /api/me`, `ONBOARDING_V1_ENABLED`
feature flag, BDD + Playwright-scaffold coverage of the onboarding
happy path.
