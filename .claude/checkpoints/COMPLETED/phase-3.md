# Phase 3 — Auth (NextAuth) (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** security-lead + backend-lead (Opus)

## Delivered

1. **ADR-0004 — Auth.js v5 + Drizzle adapter** (`docs/ADR/ADR-0004-authjs-v5-drizzle.md`).
   Decision: `next-auth@5.0.0-beta.31` + `@auth/drizzle-adapter@1.11.2`, database
   session strategy, Google OAuth + Resend magic-link providers. Revisit triggers
   documented (v5 GA, mobile client, session-write bottleneck, password-login demand).
   `DECISIONS.md` updated with D-005 (Auth.js v5 + DB sessions) and D-006
   (rename adapter sessions table to `auth_sessions` to avoid collision with
   workout `sessions`).

2. **Drizzle schema extension** (`src/db/schema.ts`):
   - `users` extended with `name`, `emailVerified`, `image`.
   - New `accounts` table (compound PK on `(provider, providerAccountId)`).
   - New `auth_sessions` table (renamed from NextAuth's default `session`).
   - New `verification_tokens` table (compound PK on `(identifier, token)`).
   - Relations + inferred types (`Account`, `AuthSession`, `VerificationToken`)
     wired up.
   - Bootstrap migration `src/db/migrations/0000_loose_ghost_rider.sql` generated
     via `pnpm db:generate`. Apply deferred to Phase 5 (Neon wiring).

3. **`src/lib/auth.ts`** — The sole `next-auth` importer (parallel to the
   Stripe-only-in-`services/billing.ts` rule). Exports
   `{ handlers, auth, signIn, signOut }`. Dynamic provider array (Google and
   Resend included only when env is present). Database session strategy. Custom
   `session({ session, user })` callback assigns `session.user.id = user.id`.
   `src/types/next-auth.d.ts` augments the module so `session.user.id` is typed.

4. **`src/app/api/auth/[...nextauth]/route.ts`** — Re-exports `{ GET, POST }`
   from `handlers`. Single entry point for Auth.js.

5. **Env contract** (`src/config/env.ts`): added `AUTH_SECRET`, `AUTH_URL`,
   `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`
   as `devOptional` — missing env does not break local dev; the sign-in page
   renders an "Auth not configured" banner instead.

6. **Route gates** — Three mutation/read routes now require auth:
   - `POST /api/sessions`: `auth()` → `UNAUTHENTICATED` on miss. `userId`
     sourced from session, **never** from body. Body now validated with
     `StartSessionBodySchema` (drops `userId`).
   - `PATCH /api/sessions/[id]`: `auth()` → `UNAUTHENTICATED` on miss.
     Cross-user ownership check returns `NOT_FOUND` (not 403) per
     `SECURITY_RULES §Authorization`. New `getSessionById` in `src/lib/data.ts`
     (with mock-data fallback) supports the check.
   - `GET /api/progress`: `auth()` → `UNAUTHENTICATED` on miss. `userId` from
     session; any `userId` in the query string is ignored.

7. **Sign-in UI** (`src/app/signin/page.tsx`) — Server component. Awaits
   `auth()` + `searchParams`. Redirects signed-in users to
   `callbackUrl ?? "/home"`. Renders a Resend magic-link form (server action
   wrapping `signIn("resend", ...)`) and a Google button (server action wrapping
   `signIn("google", ...)`). Friendly "Auth not configured" banner when neither
   env is set. Error banner on `?error=`.

8. **`AuthStatus` component** (`src/components/auth-buttons.tsx`) — Server
   component that renders a sign-in button or a signed-in label + sign-out
   form button (server actions around `signIn` / `signOut`).

9. **`(app)` layout gate** (`src/app/(app)/layout.tsx`) — Converted to an async
   server component: `const session = await auth(); if (!session?.user?.id)
   redirect("/signin?callbackUrl=/home")`. Header now shows the bendro wordmark
   + `<AuthStatus />`.

10. **OpenAPI spec** (`docs/specs/openapi/v1/bendro.yaml`):
    - `components.securitySchemes.sessionCookie` (apiKey, cookie,
      `authjs.session-token`) added.
    - `Unauthorized` response added; referenced from `POST /sessions`,
      `PATCH /sessions/{id}`, `GET /progress`.
    - `StartSession` schema: `required: [routineId]`, `userId` property
      removed.
    - `userId` query parameter removed from `GET /progress`.
    - `info.description` auth paragraph rewritten to reflect Phase 3 status.

11. **BDD scenarios rewritten**:
    - `tests/features/api/sessions.feature` — auth Background; happy-path start,
      spoofed-body-userId ignored, no-auth 401, missing routineId 400, malformed
      JSON 400, own-session PATCH 200, cross-user PATCH 404, unknown session 404,
      no-auth PATCH 401, completionPct > 100 400.
    - `tests/features/api/progress.feature` — auth Background; default window,
      specific window, no-auth 401, spoofed query-string userId ignored, days >
      365 400.

12. **Integration tests rewritten** with the
    `vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))` pattern to sidestep
    Vitest's ESM resolution errors on `next-auth`'s sub-imports. `asAuthed()` /
    `asGuest()` helpers set session state explicitly per test. Tests assert
    that body/query-supplied `userId` is **never** used (service mocks record
    auth-derived `userId`).

## Coverage

```
File          | % Stmts | % Branch | % Funcs | % Lines
--------------|---------|----------|---------|---------
All files     |    ~76  |    ~72   |   ~85   |   ~76.5
 services     |    ~94  |    ~91   |   ~86   |   ~95.1
```

120 tests across 12 files, all green. Both global (≥70%) and service-layer
(≥85% lines) thresholds pass.

`src/lib/auth.ts` is excluded from coverage (integration-boundary surface whose
only behavior is wiring `NextAuth()` + `DrizzleAdapter`); it will be exercised
via the Playwright sign-in flow in Phase 14.

## Security Notes

- `userId` is no longer accepted in request bodies or query strings on
  authenticated routes. The server extracts it from `auth()` and overrides any
  client-supplied value. Integration tests explicitly assert this override.
- Cross-tenant access returns `404 NOT_FOUND`, not `403 FORBIDDEN`, to prevent
  session-id enumeration.
- `AUTH_SECRET` must be set in staging and production. Local dev can run
  without it (the sign-in page shows an "Auth not configured" banner).
- Pose data privacy invariant unchanged: nothing about this phase affects
  client-only landmark processing.

## Notes for Future Phases

- `pnpm db:migrate` is not wired yet. Phase 5 (Neon provisioning) will apply
  `0000_loose_ghost_rider.sql` against a real database and verify the Drizzle
  adapter writes to `accounts` / `auth_sessions` / `verification_tokens` as
  expected.
- A Playwright sign-in smoke test (camera-independent) is scheduled for
  Phase 14; it will cover the integration behavior that unit-test mocks skip.
- `GET /api/stretches` and `GET /api/routines` remain public by design
  (marketing/library browsing pre-signin). Revisit once paywall lands in
  Phase 9.

## Exit Criteria Met

- [x] `pnpm test` green (120 tests across 12 files)
- [x] `pnpm typecheck` clean (including `next-auth` module augmentation)
- [x] Coverage thresholds pass (global ≥70% lines, services ≥85% lines)
- [x] Every mutation route is auth-gated; `userId` is server-sourced
- [x] Cross-tenant access returns 404, not 403
- [x] OpenAPI `securitySchemes` + `Unauthorized` response documented
- [x] BDD scenarios cover no-auth, spoofed-userId, and cross-user cases
- [x] ADR-0004 written; DECISIONS.md updated (D-005, D-006)
- [x] `CHANGELOG.md` updated; single closeout commit

## Next Phase

**Phase 4 — Player Stability** (frontend-lead, Default).
Entry criterion met.
Top backlog items: camera permission flow + error recovery, MediaPipe lazy
loading behind an error boundary, VRM smoothness / jank budget, a
Playwright smoke test that the player route loads without MediaPipe (camera
mocked or skipped).
