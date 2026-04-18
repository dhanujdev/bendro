# Phase 2 — API Contract & Validation (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** backend-lead

## Delivered

1. Standard error envelope `{ error: { code, message, details? } }` introduced in
   `src/lib/http.ts`. 8 error codes defined (VALIDATION_ERROR, INVALID_JSON,
   NOT_FOUND, UNAUTHENTICATED, FORBIDDEN, CONFLICT, RATE_LIMITED, INTERNAL) with
   default HTTP status mapping.
2. All 6 API route handlers migrated to use `errorResponse()`, `jsonResponse()`,
   and `readJsonBody()` helpers:
   - `GET /api/stretches`
   - `GET /api/routines`, `POST /api/routines`
   - `GET /api/routines/[id]`
   - `POST /api/sessions`
   - `PATCH /api/sessions/[id]`
   - `GET /api/progress`
3. Bugfix caught en route: `z.coerce.boolean()` on `?isPremium=false` was
   coercing the string `"false"` to `true`. Replaced with
   `z.enum(["true","false"]).transform((v) => v === "true")`.
4. `docs/specs/openapi/v1/bendro.yaml` Error + ValidationFailure schemas
   rewritten to match the new envelope; `ErrorCode` enum added.
5. Integration tests per route in `tests/integration/api/`:
   - `routines.test.ts` (7 tests)
   - `routines-by-id.test.ts` (3 tests)
   - `stretches.test.ts` (4 tests)
   - `sessions.test.ts` (7 tests)
   - `progress.test.ts` (5 tests)
6. `tests/unit/http.test.ts` (12 tests) covers the helpers directly.
7. BDD `.feature` scaffolds in `tests/features/api/` for routines, stretches,
   sessions, progress — plus `tests/features/README.md` explaining the
   step-definition deferral until Phase 14.

## Coverage

```
File          | % Stmts | % Branch | % Funcs | % Lines
--------------|---------|----------|---------|---------
All files     |   80.21 |    74.43 |   85.18 |   80.42
 lib          |   69.76 |    62.85 |   83.92 |   69.14
 services     |    93.9 |    91.54 |   86.53 |   95.13
```

117 tests across 12 files, all green. Both global (≥70%) and service-layer
(≥85% lines) thresholds pass.

## Notes for Future Phases

- The PATCH /api/sessions/[id] `completed` flag is the only mechanism that
  triggers streak updates today. Phase 3 will rewire this to read userId
  from the authenticated session (currently from body/query).
- `data.ts` lines 248-357 (DB-success path of `updateSession`) and
  lines 368-423 (`computeDbProgress`) remain untested; they need real-DB
  integration tests in Phase 5.
- `tests/features/*.feature` bindings deferred to Phase 14 (Playwright
  step definitions) — documented in `tests/features/README.md`.

## Exit Criteria Met

- [x] `pnpm test` green (117 tests)
- [x] `pnpm typecheck` clean
- [x] Coverage thresholds pass (global ≥70% lines, services ≥85% lines)
- [x] Every route uses the standardized `{ error: { code, message, details? } }` envelope
- [x] Integration tests cover happy + validation + not-found per route
- [x] BDD `.feature` skeletons committed for every route
- [x] OpenAPI `Error` / `ValidationFailure` schemas match the new envelope
- [x] `CHANGELOG.md` updated; single closeout commit

## Next Phase

**Phase 3 — Auth (NextAuth)** (security-lead + backend-lead, Opus).
Entry criterion met.
Top backlog item: ADR on NextAuth version, provider choice, and Drizzle
adapter wiring; then move `userId` from request bodies to server-side
`getServerSession()`.
