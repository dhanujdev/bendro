# Phase 8 — Sessions & Streaks Loop (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** backend-lead + frontend-lead

## Delivered

1. **Completion semantics hardened** in `src/app/api/sessions/[id]/route.ts`.
   Completed sessions are now immutable: any PATCH to a session with
   `completedAt !== null` returns `409 CONFLICT`. This includes
   re-completing (`completed: true` a second time) AND updating
   painFeedback / durationDoneSec / completionPct on a closed session.
   Prevents a client bug from double-triggering streak logic or
   overwriting the final completion metadata. `ERROR_CODES.CONFLICT`
   was already in the error taxonomy — now in use.

2. **Timezone-aware streak rollover.** The route pulls
   `getUserProfile(userId).timezone` only when the PATCH is completing
   the session (no wasted round-trip on mid-session updates), and
   forwards it to `updateSession(id, patch, { timezone })`. The data
   adapter threads timezone into `updateStreak(userId, timezone)` which
   uses `formatDateInTimezone` to compute the user's local calendar
   date. Default remains UTC when the caller doesn't pass a profile
   timezone (e.g., tests / scripts).

3. **`UpdateSessionOptions` contract** added to `src/lib/data.ts`:
   ```ts
   export interface UpdateSessionOptions {
     timezone?: string
   }
   export async function updateSession(
     id: string,
     patch: UpdateSessionPatch,
     options: UpdateSessionOptions = {},
   ): Promise<SessionType | null>
   ```
   Backward-compatible (options default to `{}`). The mock fallback
   branch ignores timezone (no streaks in the in-memory mock).

4. **`/home` dashboard rewritten as async RSC**
   (`src/app/(app)/home/page.tsx`). Calls `auth()` and redirects
   unauthenticated users to `/signin?callbackUrl=/home`. Pulls real
   numbers via `getProgress({ userId, days: 30 })` and renders three
   stat cards (current streak, week minutes, total sessions) plus a
   longest-streak hint when it's larger than the current streak.
   `data-testid` on every card + CTA (`home-page`,
   `home-start-stretching`, `home-stat-streak`,
   `home-stat-week-minutes`, `home-stat-total-sessions`,
   `home-longest-streak`, `home-recommended-{slug}`) so Phase 14
   Playwright has a stable hook.

5. **DST + timezone edge-case proofs** in `tests/unit/streaks.test.ts`.
   4 new unit tests assert `previousDate` is DST-safe on US
   spring-forward (2024-03-10) and fall-back (2024-11-03), and that
   `formatDateInTimezone` correctly resolves `America/New_York` during
   the spring-forward morning and `Asia/Tokyo` across the UTC-midnight
   boundary. Together these lock in that streak rollover works in
   every timezone we'll see, regardless of DST.

6. **Integration tests for completion semantics** in
   `tests/integration/api/sessions.test.ts` (+3 new): CONFLICT on
   already-completed PATCH, timezone forwarded to `updateSession` on
   completion, profile is NOT fetched on non-completion PATCHes.
   Existing mock updated to include `getUserProfile: vi.fn()`.

7. **BDD scaffolds.**
   - `tests/features/sessions/sessions-loop.feature` (10 scenarios):
     start semantics with spoofed userId rejection, unauthenticated
     start, complete with ≥50% triggers streak, complete with <50%
     does NOT, double-complete returns CONFLICT, completed-session
     fields are immutable (CONFLICT), cross-tenant returns NOT_FOUND
     (no 403 leak), pain feedback captured per stretch, pain rating
     out-of-range rejected, New York timezone forwarded on completion.
   - `tests/features/home/home.feature` (7 scenarios): unauth
     redirect, streak card reads from progress, week minutes + total
     sessions render, new-user zeros (no placeholders), Start
     Stretching CTA links to demo player, camera tile links correctly,
     recommended rail renders three featured routines.
   - Step bindings deferred to Phase 14 per
     `tests/features/README.md` convention.

8. **OpenAPI spec updated** (`docs/specs/openapi/v1/bendro.yaml`).
   New `Conflict` response component; `PATCH /sessions/{id}` now
   documents `409 CONFLICT` with a description that names the
   immutability invariant and the timezone-on-completion rule.

## Coverage

```
File          | % Stmts | % Branch | % Funcs | % Lines
--------------|---------|----------|---------|---------
All files     |   77.21 |    75.89 |   78.01 |   77.18
 services     |   95.00 |    94.17 |   87.93 |   95.93
  streaks.ts  |   95.00 |   100.00 |   80.00 |   95.00
```

207 tests across 17 files, all green (up from 200/17 at Phase 7
close). Global (≥70%) and service-layer (≥85% lines + functions)
thresholds both pass. `pnpm typecheck` clean.

## Notes for Future Phases

- **Pain-≥7 guidance flow (Phase 11).** The schema captures per-
  stretch pain ratings 0–10 today, and the PATCH validates the 0–10
  bound. Phase 11 (Health Safety & Disclaimers) is where we add the
  user-facing response: suggest medical guidance, flag the routine
  for deprioritization in `suggestRoutinesForUser`, and emit a
  disclaimer banner. Out of scope for Phase 8 — capture layer only.
- **Streak freeze / grace day (deferred).** `updateStreak` currently
  resets to 1 after any 1-day gap. A "streak freeze" (allow 1 missed
  day per week) would need a `freeze_consumed_at` column on
  `streaks`. Product decision deferred; revisit when we have real
  retention data.
- **`getProgress` per-user timezone bucketing (follow-up).** The
  `computeDbProgress` helper in `src/lib/data.ts` still buckets the
  `history` array by UTC calendar date (see comment at line ~416).
  For `/home` + `/library` this is close enough; a later pass can
  thread the profile timezone through so per-day cells match the
  user's local wall-clock.
- **`/home` longest-streak visibility rule.** We only show the
  longest-streak hint when `longestStreak > 0 && longestStreak !==
  currentStreak`, so new users don't see a redundant "Longest
  streak: 0 days" line. Product may want this visible once a user
  has completed their first streak; revisit with real data.

## Exit Criteria Met

- [x] `pnpm test` green (207 tests / 17 files)
- [x] `pnpm typecheck` clean
- [x] `pnpm test:coverage` meets thresholds (global ≥70% lines,
      services ≥85% lines + functions)
- [x] `POST /api/sessions` → service → DB (already wired, tests pass)
- [x] `PATCH /api/sessions/[id]` rejects double-complete with CONFLICT
- [x] `PATCH /api/sessions/[id]` threads user timezone into streak update
- [x] `/home` is an async RSC that reads real progress for the signed-in
      user
- [x] Streak rollover is DST-safe + timezone-aware (4 new unit tests)
- [x] Pain feedback capture accepts per-stretch 0–10 rating
- [x] OpenAPI PATCH `/sessions/{id}` documents 409 CONFLICT
- [x] BDD scaffolds for sessions loop + home dashboard

## Next Phase

**Phase 9 — Billing (Stripe)** (security-lead + backend-lead, Opus
gate). Entry criterion met: the full daily loop (start → play →
complete → streak updates → visible on /home) works end-to-end; the
next phase gates premium routines behind a subscription, wires
Stripe Checkout, and handles webhook signature verification +
idempotency.
