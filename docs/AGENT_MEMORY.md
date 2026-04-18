# Agent Memory — Bendro

> Shared context for every agent. Read this at the start of every session.
> Updated by the `session-handoff` skill whenever phase or decisions change.
> When this file conflicts with `CLAUDE.md`, `CLAUDE.md` wins.

Last updated: 2026-04-18 (Phase 11 closeout)

---

## Current Phase

**Phase 11 — Health Safety & Disclaimers** closed on 2026-04-18. See
`.claude/checkpoints/COMPLETED/phase-11.md`.

Phases 0–11 all closed:
- Phase 0 — Foundation & Framework Port (`.claude/checkpoints/COMPLETED/phase-0.md`)
- Phase 1 — Test Coverage Baseline (`.claude/checkpoints/COMPLETED/phase-1.md`)
- Phase 2 — API Contract & Validation (`.claude/checkpoints/COMPLETED/phase-2.md`)
- Phase 3 — Auth / NextAuth (`.claude/checkpoints/COMPLETED/phase-3.md`)
- Phase 4 — Player Stability (`.claude/checkpoints/COMPLETED/phase-4.md`)
- Phase 5 — DB Toggle Hardening (`.claude/checkpoints/COMPLETED/phase-5.md`)
- Phase 6 — Onboarding & Personalization (`.claude/checkpoints/COMPLETED/phase-6.md`)
- Phase 7 — Library / Search / Filters (`.claude/checkpoints/COMPLETED/phase-7.md`)
- Phase 8 — Sessions & Streaks Loop (`.claude/checkpoints/COMPLETED/phase-8.md`)
- Phase 9 — Billing (Stripe) (`.claude/checkpoints/COMPLETED/phase-9.md`)
- Phase 10 — Player polish (`.claude/checkpoints/COMPLETED/phase-10.md`)
- Phase 11 — Health Safety & Disclaimers (`.claude/checkpoints/COMPLETED/phase-11.md`)

Next phase: **Phase 12 — Monetisation Polish / Paywall UX** (frontend-lead).
Top backlog items: premium-routine paywall decoration (Phase 9 currently
hides premium rows for free users — Phase 12 flips to "decorate + show
upsell"), `/account` billing page with current plan + cancel link, upgrade
CTA placements, Stripe customer portal deep-link. No schema changes
expected; `stripe_webhook_events` ledger already in place from Phase 9.

---

## Stack Snapshot

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (React 19, TS 5) — **breaking changes vs. training data; see AGENTS.md** |
| Styling | Tailwind CSS 4, shadcn/ui, Base UI, framer-motion |
| Database | Neon serverless Postgres (prod) + in-memory mock (local/dev/test) |
| ORM | Drizzle + drizzle-kit (migrations in `src/db/migrations/`) |
| Data adapter | `src/lib/data.ts` — single switch between mock and DB |
| State | Zustand (client UI), TanStack Query (server-state cache) |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.31`) + `@auth/drizzle-adapter`, database sessions, Google OAuth + Resend magic-link (Phase 3) |
| Billing | Stripe Checkout + signed webhooks (Phase 9 — ADR-0005) |
| Pose / Avatar | MediaPipe Tasks Vision → Kalidokit → @pixiv/three-vrm on @react-three/fiber |
| Validation | Zod at every route boundary |
| Testing | Vitest (unit/integration); Playwright planned Phase 14 |
| Deploy | Vercel (preview + prod) — Phase 15 |

---

## Codebase Snapshot

Source tree that matters:

```
src/app/
  (marketing)/           public site (landing, pricing)
  (app)/                 signed-in shell (home, library, settings)
  onboarding/            first-run goal capture
  player/                workout player (RSC + client camera/avatar)
  api/                   6 Route Handlers
  layout.tsx / page.tsx  root shell + landing redirect

src/api routes today (all unauthenticated):
  /api/stretches           GET list
  /api/routines            GET list
  /api/routines/[id]       GET detail
  /api/sessions            POST create, GET list
  /api/sessions/[id]       GET detail
  /api/progress            GET streak + totals

src/services/
  routines.ts              routine listing + detail
  sessions.ts              session create/list + completion
  streaks.ts               streak compute/update
  billing.ts               Stripe wrapper stub
  personalization.ts       safety-flag filtering stub

src/db/
  schema.ts                Drizzle schema (7 tables + enums + relations)
  seed.ts                  sample stretches + routines
  index.ts                 lazy Neon client

src/lib/
  data.ts                  mock ↔ DB adapter (single toggle)
  pose/angles.ts           joint angle math
  pose/landmarks.ts        MediaPipe landmark constants
  pose/vrm-driver.ts       VRM bone driver (single swappable boundary)
  mock-data.ts             in-memory fixtures
  utils.ts                 cn() + shared helpers

src/types/                 domain types
src/config/env.ts          env reader (single chokepoint)
src/config/features.ts     feature flags

tests/
  setup.ts                 vitest setup
  unit/streaks.test.ts     one existing test (streak math)
```

---

## Key Decisions in Force

Formal record lives in `docs/ADR/`. Running log in `docs/DECISIONS.md`.
Highlights:

1. **Next.js 16 full-stack monolith.** No microservices, no orchestrator, no separate API service. Next.js route handlers serve as the API.
2. **Data access through `src/lib/data.ts`.** Callers never branch on env; the adapter picks mock or Drizzle.
3. **Pose detection runs client-side only.** No frames or landmarks leave the device. This is both a privacy invariant and a cost invariant.
4. **Single external-SDK wrappers.** Stripe → `src/services/billing.ts`. Future AI client → `src/services/ai/ai-client.ts`.
5. **Zod at every route boundary.** Body / query / path params validated before service call.
6. **Health rules replace legal rules.** `.claude/rules/HEALTH_RULES.md` governs disclaimers, pain feedback, pre-existing-condition gating, camera privacy.
7. **16-phase model (0–15).** See `docs/PHASES.md`.
8. **Auth.js v5 + Drizzle adapter, database sessions.** `src/lib/auth.ts` is the only file that imports `next-auth` (parallel to the Stripe-only-in-`services/billing.ts` rule). See `docs/ADR/ADR-0004-authjs-v5-drizzle.md`.
9. **`userId` is server-sourced.** Authenticated routes read `userId` from `auth()` and ignore any value in the request body or query string. Cross-tenant access returns `404 NOT_FOUND`, not `403`, to prevent session-id enumeration.
10. **Auth sessions table renamed to `auth_sessions`** to avoid collision with workout `sessions`. Passed to `DrizzleAdapter` via `sessionsTable: authSessions`. (D-006)
11. **Local Postgres 16 via `docker-compose.db.yml`** for dev + CI parity with Neon (`bendro/bendro/bendro` on `localhost:5432`). Drizzle migrations work unchanged between vanilla Postgres and Neon serverless. `pnpm db:local:up | down | reset` wraps the container. (D-007)
12. **`DataAdapter` interface via `typeof`** exported from `src/lib/data.ts`; `isFallbackError` / `shortReason` extracted to `src/lib/data-fallback.ts` so the fallback classifier is unit-tested independently. Adding a new data operation now forces the function + the interface to move together. (D-008)
13. **Pre-existing conditions are never persisted** — the PATCH `/api/me` handler validates the 4 yes/no answers, derives `safetyFlag = any(...)`, and discards the raw object before calling the data layer. Persisting `safety_flag` only (not individual answers) is a privacy invariant from `HEALTH_RULES.md §Pre-Existing Condition Gating`. Enforced by integration test `tests/integration/api/me.test.ts` which asserts the data-layer call patch does NOT contain `conditions` / `recentInjury` / `recentSurgery`.
14. **Onboarding UI is feature-flagged.** `NEXT_PUBLIC_FF_ONBOARDING_V1` defaults true; set to `false` to fall back to `LegacyOnboarding`. Instant-rollback path for the multi-step flow. `filterRoutineCatalog` uses `level === "deep"` as a conservative safety-flag proxy; Phase 11 replaces it with a real caution-tag column on `routines`.
15. **Stripe SDK only in `src/services/billing.ts`** (ADR-0005). Parallel to the `next-auth`-only-in-`src/lib/auth.ts` rule. `src/config/billing.ts` holds the server-side price allowlist; `createCheckoutSession()` throws `UNKNOWN_PRICE` when the submitted priceId isn't configured. Webhook handler uses the RAW request body (`request.text()`) for HMAC verification — never `.json()` first — and gates duplicate deliveries via `stripe_webhook_events.event_id` with `onConflictDoNothing`. Route `/api/webhooks/stripe` is pinned to `runtime = "nodejs"` + `dynamic = "force-dynamic"`.
16. **Premium-routine gate is a catalog-level filter, not a paywall.** `GET /api/routines` resolves `isPremium(userId)` from `users.subscriptionStatus` and drops `isPremium=true` rows for viewers not in `{active, trialing}`. Free users and signed-out visitors never see premium rows. Phase 10 can add paywall UX (visible-but-locked) without schema changes by flipping `premiumUnlocked` usage from "filter" to "decorate".

---

## Active Blockers

See `docs/BLOCKERS.md`.

---

## Agent Roster (After Pruning)

| Agent | Model | Owns |
|---|---|---|
| architect | Opus | System architecture, ADR authorship, module-boundary governance |
| planner | Opus | Phase plans, PRD, backlog, BDD scenario outlines |
| security-lead | Opus | Auth, secrets, Stripe webhooks, health-disclaimer enforcement, SAST |
| pr-reviewer | Opus | Final PR gate — runs the full enterprise checklist |
| backend-lead | Default | `src/app/api/*`, `src/services/*`, `src/db/*`, `src/lib/data.ts` |
| frontend-lead | Default | `src/app/**/*.tsx`, `src/components/*`, Tailwind, player/camera UI |
| qa-lead | Default | Vitest suites, BDD features, Playwright E2E, coverage gates |
| devops-lead | Default | CI, Vercel deploy, env management, observability |
| docs-lead | Default | CHANGELOG, architecture diagrams, ADR formatting, EXECUTION_LOG |

Deleted (did not apply): `orchestration-lead`, `policy-lead`, `data-lead`.

---

## Skills Available

```
api-contract-review        architecture-diagram-update   bdd-scenario-write
contract-first             create-adr                    db-migration-review
enterprise-standards-check phase-closeout                repo-scaffold
security-check             security-scan                 session-handoff
ui-smoke-test
```

Deleted (did not apply): `langgraph-review`, `policy-check`, `cost-tracking-check`, `workflow-adapter-check`, `evaluation-run`.

---

## Coding Conventions Quick Reference

Full conventions in `docs/STANDARDS.md`. One-line reminders:

- RSC by default, `'use client'` only where interactivity is needed.
- Exported functions get JSDoc. Components document their props type.
- Files ≤ 300 lines; functions ≤ 50; components ≤ 200.
- No `any`, no `@ts-ignore`, no `console.log` in committed code.
- Tailwind utility classes ordered by Tailwind Prettier plugin conventions.
- API routes: parse → validate (Zod) → service call → return.
- Tests first. Colocated `*.test.ts` or `tests/unit/**`.
