# Changelog

All notable changes to Bendro are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Creator OS framework port: `.claude/` agents, skills, hooks, rules, commands adapted to bendro stack (Next.js 16 / Drizzle / NextAuth / Stripe).
- `.claude/rules/HEALTH_RULES.md` — absolute prohibitions, mandatory disclaimers, pain-feedback flow, pre-existing-condition gating, camera/pose privacy.
- Foundational docs: `docs/AGENT_MEMORY.md`, `docs/BLOCKERS.md`, `docs/DECISIONS.md`, `docs/EXECUTION_LOG.md`, `docs/PHASES.md`, this `CHANGELOG.md`.
- `.claude/checkpoints/ACTIVE.md` + `docs/SESSION_HANDOFF.md` workflow for cross-session continuity.
- **Phase 1 — Test Coverage Baseline:** `@vitest/coverage-v8` reporter wired up with per-service threshold (≥85% lines for `src/services/**`) and global threshold (≥70% lines). `test:coverage` script added. Unit tests added for `billing`, `routines`, `sessions`, `personalization`, and `src/lib/data.ts` adapter (83 tests total, services at 95% line coverage).
- **Phase 2 — API Contract & Validation:** `src/lib/http.ts` with standardized `{ error: { code, message, details? } }` envelope and 8 error codes (VALIDATION_ERROR, INVALID_JSON, NOT_FOUND, UNAUTHENTICATED, FORBIDDEN, CONFLICT, RATE_LIMITED, INTERNAL). All 6 API routes migrated. `docs/specs/openapi/v1/bendro.yaml` Error schema rewritten. Integration tests added for every route (`tests/integration/api/*`) and Gherkin scaffolds in `tests/features/api/*`. 117 tests passing.
- **Phase 3 — Auth (NextAuth):** Auth.js v5 (`next-auth@5.0.0-beta.31`) + `@auth/drizzle-adapter@1.11.2` with database session strategy. `src/lib/auth.ts` is the sole `next-auth` importer (parallel to the Stripe-only-in-`services/billing.ts` rule) and exports `{ handlers, auth, signIn, signOut }`. New Drizzle tables: `accounts`, `auth_sessions` (renamed from NextAuth's default `session` to avoid workout-session collision), `verification_tokens`; `users` extended with `name`/`emailVerified`/`image`. Bootstrap migration `src/db/migrations/0000_loose_ghost_rider.sql` generated (apply deferred to Phase 5). `src/app/api/auth/[...nextauth]/route.ts` re-exports `handlers`. `src/app/signin/page.tsx` server component with Google OAuth + Resend magic-link providers (dynamic based on env) and an "Auth not configured" fallback. `AuthStatus` component in `src/components/auth-buttons.tsx`. `(app)` layout converted to an async server component that redirects unauthenticated users to `/signin?callbackUrl=/home`. ADR-0004 authored; `DECISIONS.md` D-005/D-006. 120 tests passing.

### Changed
- Python hooks (`contract-guard.py`, `tdd-guard.py`, `pre-pr-gate.py`, `schema-changed.py`, `post-migration.py`) retargeted from `services/api`, `services/orchestrator`, `packages/*` layout to bendro's `src/app/api/**/route.ts`, `src/services/**`, `src/db/**`, Drizzle + pnpm conventions.
- **`userId` is now server-sourced** on `POST /api/sessions`, `PATCH /api/sessions/[id]`, and `GET /api/progress`. The server reads it from `auth()` and ignores any value in the request body or query string. `StartSession` OpenAPI schema no longer accepts `userId`; `/progress` no longer accepts a `userId` query parameter.
- `(app)` layout is now an async RSC that gates on `await auth()`.
- `src/types/next-auth.d.ts` module augmentation adds `session.user.id: string` to the Auth.js types.

### Removed
- Creator-OS-only agents: `orchestration-lead`, `policy-lead`, `data-lead`.
- Creator-OS-only skills: `langgraph-review`, `policy-check`, `cost-tracking-check`, `workflow-adapter-check`, `evaluation-run`.
- `.claude/rules/LEGAL_RULES.md` (replaced by `HEALTH_RULES.md` — exercise/medical domain).

### Fixed
- `/api/routines?isPremium=false` was returning premium routines because `z.coerce.boolean()` coerces the string `"false"` to `true`. Replaced with `z.enum(["true","false"]).transform(…)` (Phase 2).

### Security
- Documented camera/pose privacy invariant in `SECURITY_RULES.md` and `HEALTH_RULES.md`: pose data never leaves the client.
- Added Stripe-only-in-`src/services/billing.ts` and MediaPipe-only-in-`src/lib/pose/*` architecture boundary checks to `pre-pr-gate.py`.
- **Phase 3 auth gates:** `POST /api/sessions`, `PATCH /api/sessions/[id]`, and `GET /api/progress` now require a valid Auth.js session (`UNAUTHENTICATED` otherwise). `userId` is extracted from the session server-side and overrides any client-supplied value.
- **Cross-tenant access returns `404 NOT_FOUND`, not `403`**, on `PATCH /api/sessions/[id]` to prevent session-id enumeration.
- `AUTH_SECRET` added to the env contract as `devOptional`; required in staging/production. Local dev runs without it and shows an "Auth not configured" banner on the sign-in page.

---

## Prior History (pre-framework port)

### 2026-04-17 and earlier
Scaffolded at https://github.com/dhanujdev/bendro — initial Next.js app, Drizzle schema, 6 API routes, camera/VRM integration, mock↔DB adapter. See `git log` for granular history.
