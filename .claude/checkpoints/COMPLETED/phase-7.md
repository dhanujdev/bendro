# Phase 7 — Library / Search / Filters (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** frontend-lead

## Delivered

1. **`ListRoutinesFilter` expanded** in `src/lib/data.ts` with five new
   fields: `q` (free-text search across title/slug/description,
   case-insensitive), `bodyAreas[]` (keep rows whose goal maps to any
   listed area via `GOAL_BODY_AREAS`), `avoidBodyAreas[]` (drop rows
   whose goal maps to any avoided area), `durationBucket` (`short` ≤
   300s, `medium` ≤ 900s, `long` > 900s), and `safetyFlag` (drops
   `level === "deep"` — same conservative proxy Phase 6 used in
   `filterRoutineCatalog`, replaced by real caution-tag filtering in
   Phase 11). `applyRoutineFilters` applies every new predicate against
   both the DB path and the mock fallback so both backends behave
   identically under test.

2. **`GOAL_BODY_AREAS` exported** from `src/services/personalization.ts`
   so `src/lib/data.ts` shares the single mapping source of truth. No
   duplicated body-area table.

3. **`GET /api/routines` query expansion** (`src/app/api/routines/route.ts`).
   Added `q`, `bodyArea`, `avoidBodyArea`, `durationBucket`,
   `safetyFlag` as query params. The handler normalizes the singular
   `bodyArea`/`avoidBodyArea` strings into the adapter's plural arrays,
   so the public URL surface stays simple but the internal filter stays
   multi-valued (ready for Phase 11 when we expose multi-select chips).
   8 new integration tests in `tests/integration/api/routines.test.ts`
   cover: query propagation for every new param, array-mapping at the
   adapter boundary, unknown-value rejection for `bodyArea` /
   `durationBucket`, and the trimmed-empty-`q` rejection.

4. **Library page rewritten as RSC** (`src/app/(app)/library/page.tsx`).
   The page is now an async server component that:
   - Reads `searchParams` (`q`, `goal`, `level`, `durationBucket`) via
     `SearchParamsSchema.safeParse` so a malformed URL can't crash the
     render.
   - Calls `auth()` + `getUserProfile(userId)` to project the persisted
     `avoidAreas` + `safetyFlag` through the query automatically — the
     user never has to re-click safety preferences.
   - Calls `getRoutines(filter)` once server-side (no client-side
     catalog fetch), then renders either the routine list with
     `data-testid="library-routine-{slug}"` or the empty state
     (`data-testid="library-empty-state"`). Subtitle reflects when the
     safety flag is on ("gentle + moderate only — safety flag on").

5. **`LibraryFilterBar` client component**
   (`src/app/(app)/library/_components/library-filter-bar.tsx`).
   Pure URL-state round-trip: every chip click / search submit builds a
   new `URLSearchParams` off the current one and calls
   `router.replace(href, { scroll: false })` inside `useTransition()`
   so the server component re-renders with fresh filters. Features:
   - Search input with `Enter` submission + clear-search X button.
   - Goal chips (all 7 goals with emoji + label).
   - Level chips (gentle / moderate / deep) + duration bucket chips
     (≤5 / 5–15 / >15 min) in one row, visually separated.
   - `N of N routines` count + a "Clear filters" link that removes
     every filter param in one go.
   - `data-testid` on every control (`library-filter-bar`,
     `library-search-input`, `library-goal-{goal}`,
     `library-level-{level}`, `library-bucket-{bucket}`,
     `library-clear-filters`) so Phase 14 Playwright has a stable hook.

6. **8 new unit tests** in `tests/unit/data-adapter.test.ts` pin the
   new filter semantics against the mock backend: case-insensitive
   search, no-match empty result, duration bucket boundaries for
   `short`/`long`, `safetyFlag` drops deep, `avoidBodyAreas` drops
   matching goals via `GOAL_BODY_AREAS`, `bodyAreas` keeps matching
   goals, combined-intersection case.

7. **OpenAPI spec updated** (`docs/specs/openapi/v1/bendro.yaml`). Five
   new query params on `listRoutines` with descriptions, enums, and
   length constraints. `BodyArea` schema already existed and was
   re-referenced.

8. **BDD scaffolds.**
   - `tests/features/api/routines.feature` extended with 8 new
     scenarios covering the query expansion + error envelope cases.
   - `tests/features/library/library.feature` (10 scenarios): initial
     render, URL-state round-trip for goal + search, clear-search,
     clear-filters, profile-driven filters (avoidAreas auto-applied,
     safetyFlag drops deep + shows banner), empty state, intersection
     case. Step bindings deferred to Phase 14 per
     `tests/features/README.md` convention.

## Coverage

```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|---------
All files           |   77.21 |    76.36 |   78.01 |   77.18
 services           |   95.00 |    94.17 |   87.93 |   95.93
 lib/data-fallback  |   93.33 |    91.66 |  100.00 |  100.00
```

200 tests across 17 files, all green (up from 184/17 at Phase 6
close). Global (≥70%) and service-layer (≥85% lines + functions)
thresholds both pass.

## Notes for Future Phases

- **Real caution-tag filter (Phase 11).** `safetyFlag=true` currently
  drops `level === "deep"`. Phase 11 adds a `cautions string[]` column
  to `routines` (tags `deep-spine`, `high-load`, `prone`, etc.) and
  replaces the level-based proxy with a tag-intersection filter. The
  JSDoc on `ListRoutinesFilter.safetyFlag` is a pointer so the swap
  stays localized.
- **Multi-select body-area UI (Phase 11 or later).** The adapter
  already accepts `bodyAreas: BodyArea[]`, but the URL surface only
  expresses a single `bodyArea` / `avoidBodyArea`. When Phase 11 lands
  the caution-tag filter it can also introduce repeated query params
  (`?bodyArea=hips&bodyArea=neck`) or a `bodyAreas=hips,neck` CSV —
  pick whichever the chip UI wants. The adapter is already ready.
- **Body-area chips in the FilterBar.** Scope-cut for this phase — the
  avoid mapping runs server-side from the persisted profile (which is
  the important invariant), so adding user-clickable body-area chips
  is a UX polish item that can land with the caution-tag work.
- **Profile not found in library.** `getUserProfile` falls back to
  `MockUserProfile` for a signed-in user that has never saved a
  profile. Phase 6 onboarding creates one on submit; the library page
  tolerates the pre-onboarding case by just skipping the profile-
  driven filters.

## Exit Criteria Met

- [x] `pnpm test` green (200 tests / 17 files)
- [x] `pnpm typecheck` clean
- [x] `pnpm test:coverage` meets thresholds (global ≥70% lines,
      services ≥85% lines + functions)
- [x] `ListRoutinesFilter` + `applyRoutineFilters` expanded
- [x] `GET /api/routines` accepts q / bodyArea / avoidBodyArea /
      durationBucket / safetyFlag
- [x] Library page is an RSC that reads the signed-in profile and
      projects it into the query
- [x] URL-state filter bar with search + goal + level + bucket chips
- [x] OpenAPI `listRoutines` parameters updated
- [x] BDD scaffolds for `/api/routines` + `library`
- [x] 8 new unit tests + 8 new integration tests

## Next Phase

**Phase 8 — Sessions & Streaks Loop** (backend-lead + frontend-lead).
Entry criterion met: the library can deliver a user to
`/player/[slug]`; the next phase wires the end-to-end
`start → play → complete → streak updates → visible on /home` loop.
