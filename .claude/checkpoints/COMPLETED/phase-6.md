# Phase 6 — Onboarding & Personalization (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** frontend-lead + backend-lead

## Delivered

1. **Pre-existing-condition schema extension.** `users` gains two columns:
   `safety_flag BOOLEAN NOT NULL DEFAULT false` and
   `onboarded_at TIMESTAMP`. Migration
   `src/db/migrations/0001_loud_patriot.sql` generated via drizzle-kit.
   Per `HEALTH_RULES.md §Pre-Existing Condition Gating`, **the four raw
   yes/no answers are never persisted** — the server collapses them to a
   single `safety_flag` boolean and discards the rest. The JSDoc on the
   column spells out the privacy invariant so the next person to touch
   this schema can't accidentally violate it.

2. **Profile service (`src/services/profile.ts`).** Drizzle-backed
   `getProfile(userId)` + `updateProfile(userId, patch)` with a strict
   `UpdateProfilePatch` interface. Partial-patch semantics: only fields
   present on the patch are written, `updatedAt` is always bumped, and
   `markOnboarded: true` sets `onboardedAt = new Date()`. 9 unit tests
   in `tests/unit/profile.test.ts` pin the partial-patch invariant,
   missing-user error, and scalar passthrough.

3. **DataAdapter extended with profile ops.** `src/lib/data.ts` exports
   `getUserProfile` + `updateUserProfile` that go through
   `withFallback(...)` against `services/profile.ts`, falling back to
   the in-memory `mock-data.ts` profile store (`getMockProfile` /
   `updateMockProfile` / `resetMockProfiles`). Both functions are added
   to the `DataAdapter` interface — compiler-enforced contract.

4. **`GET /api/me` + `PATCH /api/me` (`src/app/api/me/route.ts`).**
   - GET: returns the signed-in user's profile. `UNAUTHENTICATED` for
     guests.
   - PATCH: strict (`.strict()`) Zod schema that rejects unknown fields,
     including client-supplied `userId` (trust-boundary invariant —
     `userId` comes from `auth()`, never the body). The `conditions`
     object is validated at the boundary, then the server derives
     `safetyFlag = conditions.recentInjury || recentSurgery ||
     jointOrSpineCondition || pregnancy` and **discards the raw object**
     before calling `updateUserProfile`. 12 integration tests in
     `tests/integration/api/me.test.ts` cover auth, validation errors,
     persistence, the privacy assertion (call patch must NOT contain
     `conditions`/`recentInjury`/`recentSurgery`), and the strict-schema
     rejection of client-supplied `userId`.

5. **OpenAPI contract.** `docs/specs/openapi/v1/bendro.yaml` gets `/me`
   paths (`getMe`, `updateMe`) and schemas `UserProfile`,
   `PreExistingConditions` (with an explicit comment: *"These answers
   are never persisted; server derives safetyFlag."*), and
   `UpdateProfile` with `additionalProperties: false` — the spec mirrors
   the runtime schema's strict rejection.

6. **`filterRoutineCatalog` in `src/services/personalization.ts`.**
   Pure function `<R extends Pick<RoutineType, "goal" | "level">>(rows,
   profile)` that filters the catalog by the persisted profile:
   - Empty `goals` ⇒ no goal filter (not "match nothing").
   - Non-empty `avoidAreas` ⇒ drop routines whose goal maps (via
     `GOAL_BODY_AREAS`) to ANY avoided area.
   - `safetyFlag=true` ⇒ drop routines where `level === "deep"`
     (conservative proxy; Phase 11 replaces this with the real
     `deep-spine` / `high-load` / `prone` caution-tag filter).
   The source comment calls out the Phase-11 boundary so the successor
   knows exactly what to replace. 9 new unit tests in
   `tests/unit/personalization.test.ts` pin purity, the goal-filter
   corner cases, the avoidArea mapping, the safety-flag rule, the
   combined-intersection case, and unknown-goal graceful handling.

7. **Multi-step onboarding UI (`src/app/onboarding/page.tsx`).**
   ~370-line RSC-shell + client multi-step flow with steps
   `intro → goals → focus → avoid → conditions`. Built on a generic
   `MultiSelectStep<T>` component (reused across goals / focus / avoid),
   a `StepHeader` progress bar, and a `ConditionsStep` with four yes/no
   pairs + an amber safety-gate warning when any "yes" is selected.
   Submit PATCHes `/api/me` with `{ goals, focusAreas, avoidAreas,
   conditions, markOnboarded: true }` and routes to `/home`.
   `data-testid` attributes on every step and the submit button give
   Phase 14 Playwright an easy target. `LegacyOnboarding` preserved
   behind the feature flag for instant rollback.

8. **`ONBOARDING_V1_ENABLED` feature flag.** Added to
   `src/config/features.ts` as `onboardingV1`. Defaults ON; set
   `NEXT_PUBLIC_FF_ONBOARDING_V1=false` to fall back to the legacy
   single-step goal picker.

9. **BDD scaffolds.** `tests/features/api/me.feature` (13 scenarios —
   guest 401, strict-schema rejection of `surprise` and `userId`,
   invalid-enum goal, malformed reminderTime, persistence, the
   privacy-critical conditions→safetyFlag-only flow, markOnboarded
   passthrough) and `tests/features/onboarding/onboarding.feature`
   (multi-step progression, safety-gate appearance rule, submit
   happy-path, legacy fallback). Step bindings deferred to Phase 14
   per `tests/features/README.md` convention.

## Coverage

```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|---------
All files           |   76.31 |    75.10 |   76.51 |   76.45
 services           |   95.00 |    94.17 |   87.93 |   95.93
 services/profile   |  (incl) |   (incl) |  (incl) |   100.00
 services/persona…  |   96.07 |    86.84 |   96.15 |    98.80
```

184 tests across 17 files, all green (up from 154/15 at Phase 5 close).
Both global (≥70%) and service-layer (≥85% lines) thresholds pass.

## Notes for Future Phases

- **Caution-tag filter (Phase 11).** `filterRoutineCatalog` currently
  uses `level === "deep"` as a conservative proxy for safety-flag
  exclusion. Phase 11 adds `cautions: string[]` to the `routines`
  schema (with tags `deep-spine`, `high-load`, `prone`, etc.) and
  replaces the `level` check with a caution-tag intersection. The
  current code's comment is a pointer so the swap is localized.
- **Playwright smoke of the onboarding flow (Phase 14).** The `data-
  testid` attributes are already on every step (`step-intro`, `step-
  goals`, `step-focus`, `step-avoid`, `step-conditions`, `submit-
  onboarding`) and the BDD feature file describes the full happy path
  + safety-gate branch. Phase 14 just needs to bind these.
- **Migration application.** The pre-existing
  `0000_loose_ghost_rider.sql` (Phase 3 NextAuth bootstrap) plus the
  new `0001_loud_patriot.sql` are both still unapplied in dev. Phase
  14 integration-db tests will be the first consumer; Phase 15
  Vercel+Neon deploy will run them in preview branch builds.

## Exit Criteria Met

- [x] `pnpm test` green (184 tests / 17 files)
- [x] `pnpm typecheck` clean
- [x] `pnpm test:coverage` meets thresholds (global ≥70% lines,
      services ≥85% lines + functions)
- [x] Drizzle schema + migration committed
- [x] `src/services/profile.ts` + unit tests
- [x] `DataAdapter` extended with `getUserProfile` / `updateUserProfile`
- [x] `GET /api/me` + `PATCH /api/me` with strict Zod schema
- [x] OpenAPI `/me` paths + schemas (additionalProperties: false)
- [x] `filterRoutineCatalog` + unit tests
- [x] Multi-step onboarding UI behind `ONBOARDING_V1_ENABLED`
- [x] BDD scaffolds (`tests/features/api/me.feature`,
      `tests/features/onboarding/onboarding.feature`)
- [x] Integration tests for `/api/me` (12 scenarios, privacy assertion)

## Next Phase

**Phase 7 — Library / Search / Filters** (frontend-lead). Entry
criterion met: the persisted profile now carries `goals`,
`focusAreas`, `avoidAreas`, `safetyFlag`, and `filterRoutineCatalog` is
the pure-function contract Phase 7 will wire into the library page's
server-side filter.
