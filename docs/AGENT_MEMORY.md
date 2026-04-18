# Agent Memory — Bendro

> Shared context for every agent. Read this at the start of every session.
> Updated by the `session-handoff` skill whenever phase or decisions change.
> When this file conflicts with `CLAUDE.md`, `CLAUDE.md` wins.

Last updated: 2026-04-18 (Phase 3 closeout)

---

## Current Phase

**Phase 3 — Auth (NextAuth)** closed on 2026-04-18. See
`.claude/checkpoints/COMPLETED/phase-3.md`.

Phases 0–3 all closed:
- Phase 0 — Foundation & Framework Port (`.claude/checkpoints/COMPLETED/phase-0.md`)
- Phase 1 — Test Coverage Baseline (`.claude/checkpoints/COMPLETED/phase-1.md`)
- Phase 2 — API Contract & Validation (`.claude/checkpoints/COMPLETED/phase-2.md`)
- Phase 3 — Auth / NextAuth (`.claude/checkpoints/COMPLETED/phase-3.md`)

Next phase: **Phase 4 — Player Stability** (frontend-lead).
Top backlog items: camera permission flow + error recovery, MediaPipe lazy
loading behind an error boundary, VRM smoothness / jank budget, Playwright
smoke test covering the player route without a live camera.

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
| Billing | Stripe (planned — Phase 9; currently stub) |
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
