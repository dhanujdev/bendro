# ADR-0002: Mock ↔ Drizzle Data Adapter at `src/lib/data.ts`

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** backend-lead, architect
**Supersedes:** none
**Superseded by:** none

---

## Context

Bendro needs to be developable without a database dependency:

- Local development should not require a Postgres instance.
- Unit tests must run fast and hermetic.
- CI must not require a Neon account.
- Preview deploys should exercise the real DB path.

Callers that need data (route handlers, services, server components) should
not branch on `process.env.DATABASE_URL ? drizzle : mock`. That kind of
branching pollutes every caller, makes testing harder, and creates subtle
bugs when the mock path and the DB path drift.

## Decision

All reads/writes from application code go through a single adapter module:
**`src/lib/data.ts`**.

- The adapter exports a single `data` object whose shape is the same
  whether backed by the mock or by Drizzle.
- The adapter picks its backend once at module load based on
  `process.env.DATABASE_URL`:
  - absent / empty → in-memory mock (`src/lib/mock-data.ts` seeds).
  - present → lazy Neon client + Drizzle.
- Callers **never** read `process.env.DATABASE_URL` themselves.
- Callers **never** import `db` from `src/db/index.ts` directly (except
  within `src/services/*.ts` which own the query implementations).
- Services own the actual query logic; `data.ts` is a thin dispatcher.

## Consequences

**Positive:**
- Switching dev ↔ preview ↔ prod is a single env-var change.
- Unit tests are fast and hermetic (mock backend, no I/O).
- Integration tests exercise the same call signature as prod.
- Adding a new query means touching exactly two places: the service,
  and the adapter's dispatch table.

**Negative:**
- Two implementations of each query must stay in sync (the mock and the
  Drizzle one). Mitigation: shared type — both implement the same
  TypeScript interface, so drift is a compile error.
- The mock backend is a correctness hazard if it silently diverges from
  real Postgres behavior (joins, cascades, enum constraints). Mitigation:
  Phase 5 hardening runs the integration suite against both backends.

**Neutral:**
- Drizzle alone could serve both paths if we ran Postgres in a docker
  compose for every dev. We judged the mock's speed + zero-infra win
  worth the dual implementation.

## Constraints This Creates

- `src/app/**/*.ts(x)` **must not** import from `drizzle-orm` or
  `@neondatabase/serverless`. Enforced by `pre-pr-gate.py` Gate 3.
- `src/components/**` same.
- Only `src/services/*.ts` and `src/db/*.ts` may import Drizzle.
- `src/lib/data.ts` is the only public data-access entry.

## Revisit Triggers

Reopen this decision if:

1. The mock path becomes too divergent to maintain → drop it and require
   a dev Postgres (docker compose).
2. We introduce a non-Postgres backend (e.g., Redis for streaks) → the
   adapter grows a second shape; may need sub-adapters per aggregate.
3. Drizzle's RSC story improves to the point the abstraction adds no
   value.

---

## References

- `CLAUDE.md` §5 (Architecture Invariants)
- `.claude/rules/ARCHITECTURE_RULES.md`
- `src/lib/data.ts`, `src/lib/mock-data.ts`, `src/db/index.ts`, `src/db/schema.ts`
