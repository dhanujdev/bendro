# ADR-0004: Auth.js v5 with Drizzle Adapter for Session Auth

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** security-lead, backend-lead
**Context for:** Phase 3 and every subsequent feature that consumes `userId`
**Supersedes:** none
**Superseded by:** none

---

## Context

Phase 2 closed with every API route validated and a stable error envelope.
Every route that takes a `userId` currently reads it from the request body or
query string — an obvious authz bug that the Phase 3 gate exists to close.

Requirements for Phase 3:

1. **Server-owned identity.** `userId` MUST come from a verified server-side
   session, never from user-controlled input.
2. **Two providers minimum.** Email magic link (primary — no password) and
   Google OAuth (secondary — low friction for returning users).
3. **Revocable sessions.** A user signing out (or admin revoking) must
   terminate access immediately, which JWT-only flows cannot do without
   extra blocklist plumbing.
4. **Zero vendor lock-in for the user database.** Our own `users` table
   already stores domain state (goals, focusAreas, stripeCustomerId).
   Identity should extend it, not replace it with a vendor-hosted one.
5. **Runs on Vercel + Neon.** No external session store service.
6. **Small surface area.** We are a single Next.js 16 monolith (ADR-0001).

## Decision

Use **Auth.js v5** (the next major of NextAuth.js, distributed as
`next-auth@beta`) with the **Drizzle adapter** (`@auth/drizzle-adapter`),
a **database session strategy**, and **two providers**:

- **Resend** (magic link) — primary.
- **Google OAuth** — secondary.

### Shape of the integration

```
src/lib/auth.ts
  ├── NextAuth() config (providers, adapter, session strategy, callbacks)
  └── re-exports: handlers, auth, signIn, signOut

src/app/api/auth/[...nextauth]/route.ts
  └── export const { GET, POST } = handlers

src/db/schema.ts
  ├── extend `users` with nullable name / emailVerified / image
  ├── new `accounts` (compound PK on provider + providerAccountId)
  ├── new `auth_sessions`         (singular "session" is ambiguous in
  │                                this repo — we already have a workout
  │                                `sessions` table; prefix avoids collision)
  └── new `verification_tokens`
```

### Why database sessions, not JWT

Auth.js supports both. We pick database sessions because:

- We already run Postgres (Neon) — no new store required.
- Sign-out has to terminate access without waiting for JWT expiry. With
  DB sessions this is one DELETE. With JWT we would need a revocation
  list (additional table, additional middleware check) to match the same
  UX, which is strictly more code than DB sessions.
- Stripe-webhook-driven subscription changes (Phase 9) can mutate the
  session row directly when needed.

The cost is one extra DB roundtrip per authenticated request. Neon's
serverless driver at p50 < 20ms in our region makes this acceptable.
We revisit if the p95 under load degrades materially.

### Why extend the existing `users` table

The alternative would be an Auth.js-owned `user` table plus a join to our
domain-`users` table. That would double the source of truth for "who is
this person", introduce sync questions (which side is authoritative for
email changes?), and duplicate every cascade. Instead:

- Keep `users.id` as `uuid` (Postgres-native, keeps existing FKs
  intact from `sessions`, `favorites`, `streaks`, `routines.ownerId`).
- Add three nullable Auth.js columns: `name`, `emailVerified`, `image`.
- Pass custom tables to `DrizzleAdapter(db, { usersTable, … })`.

If the adapter's type constraints refuse uuid id (Auth.js docs default
to `text`), we switch to `text` in a follow-up migration — the same data
fits either type. This is a low-probability risk; if it materializes it
surfaces at build time and is a one-column swap plus type cast.

### Why Resend + Google (and not email/password)

- **No password**: we don't want to own password hashing, reset flows, or
  credential-leak response for a v1 consumer product.
- **Resend**: provider of choice because it integrates cleanly with
  Vercel, has a generous free tier for magic-link volume, and exposes a
  simple HTTP API (no SMTP).
- **Google**: covers the majority of our target user base without asking
  them to check email.

Both providers plug into Auth.js as one-line entries. If Apple or GitHub
are requested later, adding them is trivial.

## Consequences

**Positive:**
- `userId` becomes a server-side-only concept. `contract-guard.py` Gate 4
  can be flipped on and will block any PR that reintroduces body-sourced
  userId.
- Single `users` table remains the source of truth for both identity and
  domain state.
- Session revocation is free (one DELETE).
- Providers are swappable without touching business logic.

**Negative:**
- Three new tables in the schema (accounts, auth_sessions,
  verification_tokens) plus three new columns on `users`. Migration work
  is one-time.
- Any DB outage breaks login, not just data reads. Acceptable — we
  already hard-depend on Neon for every authenticated request.
- Auth.js v5 is a pre-1.0 beta. Risk: breaking changes before GA. We pin
  the minor; we read release notes at every bump. We prefer this over v4
  because v5 is the future and the Next.js 16 App Router integration
  guidance in v4 is thin.

**Neutral:**
- Client-side session reads use `useSession` from `next-auth/react`.
  Server-side reads use the `auth()` helper from `src/lib/auth.ts`.
- Middleware (for route-level protection) comes in a follow-up phase if
  needed — per-route `auth()` checks are enough for v1.

## Enforcement

- `src/services/billing.ts` is the ONLY file that imports `stripe`. The
  parallel rule for Auth.js is: **`src/lib/auth.ts` is the only file that
  imports `next-auth`.** `pre-pr-gate.py` adds this check.
- Every mutation route (`POST`/`PATCH`/`DELETE`) calls `auth()` and
  returns `UNAUTHENTICATED` envelope if no session. `pre-pr-gate.py`
  Gate 4 grep-checks that no route handler parses a `userId` from
  `request.body` or `request.nextUrl.searchParams`.
- Public catalog routes (`GET /api/stretches`, `GET /api/routines`,
  `GET /api/routines/[id]`) remain unauthenticated — they serve content,
  not user data. This is documented inline and enforced by the same gate
  (no `userId` parse).

## Revisit Triggers

Reopen this decision if any of the following occur:

1. Auth.js v5 reaches GA and changes any of the API contracts we rely on.
2. We add a first-party mobile client that cannot hold cookies → may
   need JWT endpoint for that client specifically.
3. The session table write rate becomes a measurable bottleneck under
   load → consider switching to JWT with a Redis-backed blocklist.
4. Legal/compliance requirements demand password-based login (unlikely
   for a fitness app, but possible with enterprise customers).

---

## References

- Auth.js Drizzle adapter docs: `/nextauthjs/next-auth` — Drizzle Adapter
- Auth.js v5 migration guide
- `CLAUDE.md` §6 (security invariants)
- `.claude/rules/SECURITY_RULES.md`
- `docs/PHASES.md` — Phase 3 deliverables
- `src/db/schema.ts` — existing `users` table
