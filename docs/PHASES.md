# Bendro Phase Plan

> Every phase is a mega-session. It has a lead agent, a clear entry criterion,
> a list of deliverables, and an exit criterion that must pass before moving on.
> No phase ships without the `phase-closeout` skill producing a green report.

Baseline at start of Phase 0: existing bendro code at `/Users/dhanujgumpella/bendro`
(Next.js 16 app, Drizzle schema + 6 API routes, mock↔DB adapter, camera/VRM
integration, 1 unit test). Target state at end of Phase 15: production-deployed
on Vercel with Stripe billing live and E2E suite green.

---

## Phase 0 — Foundation & Framework Port

**Lead:** architect + planner (Opus). **Status:** in progress.

**Entry:** fresh repo, no framework.

**Deliverables:**
- `.claude/` agents, skills, hooks, rules, commands ported & adapted
- `CLAUDE.md`, `AGENT_MEMORY.md`, `DECISIONS.md`, `BLOCKERS.md`, `CHANGELOG.md`, `EXECUTION_LOG.md`, `PHASES.md`, `STANDARDS.md`
- `docs/PRD.md`, `docs/BACKLOG.md`
- ADR-0001/0002/0003 (baseline architecture, data adapter, pose boundary)
- `docs/specs/openapi/v1/bendro.yaml` scaffold

**Exit:** all files above present; `session-handoff` skill runs clean; first commit on `main` closing out Phase 0.

---

## Phase 1 — Test Coverage Baseline

**Lead:** qa-lead. **Duration estimate:** 1 session.

**Entry:** Phase 0 closed. Only one existing unit test (`tests/unit/streaks.test.ts`).

**Deliverables:**
- Vitest config hardened (coverage reporter → `coverage/coverage-summary.json` for `post-test.py`).
- Unit tests for every function in `src/services/*.ts` (routines, sessions, streaks, personalization, billing stub).
- Unit tests for `src/lib/data.ts` adapter (mock path).
- Unit tests for `src/lib/pose/angles.ts` (pose math is pure — easy to test).
- BDD `.feature` files scaffolded for each existing API route in `tests/features/api/`.
- Vitest coverage threshold enforced ≥ 70% overall, ≥ 85% on `src/services/*`.

**Exit:** `pnpm test` green with coverage report; `pre-pr-gate.py` Gate 1 passes.

---

## Phase 2 — API Contract & Validation

**Lead:** backend-lead. **Duration:** 1–2 sessions.

**Entry:** Phase 1 green; OpenAPI scaffold from Phase 0.

**Deliverables:**
- Full OpenAPI 3.1 spec for all 6 routes (request bodies, responses, error shapes).
- Zod schemas in `src/schemas/*` that match OpenAPI 1:1.
- Every route handler: parse → `zod.safeParse` → service call → typed response.
- Error envelope standardized: `{ error: { code, message, details? } }`.
- `packages/api-types` style (or simpler: `src/types/api.ts`) with inferred types from Zod.
- Integration tests per route in `tests/integration/api/*.test.ts` covering happy path + validation failure + not-found.

**Exit:** every route validated; `contract-guard.py` passes for all resources; integration suite green.

---

## Phase 3 — Auth (NextAuth)

**Lead:** security-lead + backend-lead (Opus gate). **Duration:** 2 sessions.

**Entry:** Phase 2 green. Stable API shape before adding auth scoping.

**Deliverables:**
- ADR on NextAuth choice (v5 vs. v4), chosen providers (email magic link + Google).
- NextAuth config in `src/app/api/auth/[...nextauth]/route.ts`.
- Session adapter wired to Drizzle (`accounts`, `sessions` NextAuth tables in schema).
- Server-side `getServerSession` helper in `src/lib/auth.ts`; never read userId from body.
- Route middleware: `/api/sessions`, `/api/progress`, `/api/favorites` require session; public catalog endpoints stay public.
- Sign-in page, sign-out flow, session provider on client shell.
- Integration tests for auth-required routes (401 without session, 200 with).

**Exit:** `pre-pr-gate.py` Gate 4 passes (no userId from body). Manual smoke test of sign-in→sign-out→session flow.

---

## Phase 4 — Player Stability (camera / pose / avatar)

**Lead:** frontend-lead. **Duration:** 2 sessions.

**Entry:** Phase 3 green.

**Deliverables:**
- Camera permission flow: explicit button, visible preview, explicit "stop camera" path.
- Error recovery: camera denied, no camera, browser unsupported — each has a friendly fallback UI.
- MediaPipe model loading: lazy, cached, shown behind a visible "loading model" state.
- Avatar sync smoothness: frame-throttled updates; no jank under 30fps.
- Unit tests for `pose/angles.ts` and VRM bone mapping (already in Phase 1 partly; fill gaps).
- Playwright smoke test: open player, confirm consent UI renders, mock camera accept path.

**Exit:** `ui-smoke-test` skill green; dev server manual smoke on Safari/Chrome.

---

## Phase 5 — DB Toggle Hardening (mock ↔ Neon)

**Lead:** backend-lead. **Duration:** 1 session.

**Entry:** Phase 4 green.

**Deliverables:**
- `src/lib/data.ts` refined: explicit `DataAdapter` type, one source of truth for env flag.
- Migration flow tested locally: `pnpm db:generate` → review SQL → `pnpm db:migrate`.
- Neon branching for preview envs (Vercel preview → Neon preview branch).
- Seed script idempotent; `pnpm db:seed` safe to re-run.
- Integration tests run against both mock and a real Postgres (docker compose for CI).

**Exit:** `pnpm db:seed` clean on Neon; integration tests green in both modes.

---

## Phase 6 — Onboarding & Personalization

**Lead:** frontend-lead + backend-lead. **Duration:** 1–2 sessions.

**Entry:** Phase 5 green.

**Deliverables:**
- `src/app/onboarding/*` flow: goal selection, focus/avoid body areas, pre-existing-condition gate.
- Personalization service: filter routine catalog by goals + avoid areas + `safety_flag`.
- User profile API: `GET /api/me`, `PATCH /api/me` to update goals/timezone/reminder.
- Feature flag: `config/features.ts` → `ONBOARDING_V1_ENABLED`.
- BDD features + Playwright smoke covering full onboarding happy path.

**Exit:** new user can sign up, complete onboarding, see a personalized home screen.

---

## Phase 7 — Library, Search, Filters

**Lead:** frontend-lead. **Duration:** 1 session.

**Entry:** Phase 6 green.

**Deliverables:**
- `/library` page: routine grid with goal/body-area/intensity filters.
- Server-side filtering via `GET /api/routines?goal=&bodyArea=&intensity=`.
- TanStack Query cache keyed on filter state; optimistic UI for favorite toggle.
- Empty states, loading skeletons, error states.
- Unit tests for filter reducers; Playwright smoke for filter interaction.

**Exit:** catalog discoverable; filters performant; Lighthouse score ≥ 90 on `/library`.

---

## Phase 8 — Sessions & Streaks Loop

**Lead:** backend-lead + frontend-lead. **Duration:** 2 sessions.

**Entry:** Phase 7 green.

**Deliverables:**
- Session create/complete flow wired end-to-end: UI → `POST /api/sessions` → service → DB.
- Streak rollover logic: daily, timezone-aware, gap-tolerant ("streak freeze" optional).
- Pain feedback capture per session (0–10 rating, respects `HEALTH_RULES.md` thresholds).
- Progress dashboard on `/home`: today/week/month stats, current streak, longest streak.
- BDD scenarios: streak continues, streak resets, timezone boundary, pain ≥ 7 branch.
- Integration tests for streak edge cases (DST, leap, timezone shifts).

**Exit:** full daily loop usable: start → play → complete → streak updates → visible on home.

---

## Phase 9 — Billing (Stripe)

**Lead:** security-lead + backend-lead (Opus gate). **Duration:** 2 sessions.

**Entry:** Phase 8 green.

**Deliverables:**
- Stripe Checkout for upgrade from free → subscriber.
- `src/services/billing.ts` the ONLY file that imports `stripe`.
- Webhook handler at `src/app/api/webhooks/stripe/route.ts` with signature verification + idempotency.
- `users.subscriptionStatus` updated by webhook.
- Premium-only routines gated in the catalog query.
- Test-mode live: staging → Stripe test keys → `pnpm stripe listen` forwarding.
- Integration tests: checkout session create, webhook signature valid/invalid, subscription state transitions.

**Exit:** test-mode checkout flow works end-to-end; pr-reviewer approves billing module.

---

## Phase 10 — PWA & Offline UX

**Lead:** frontend-lead. **Duration:** 1 session.

**Entry:** Phase 9 green.

**Deliverables:**
- `src/app/manifest.ts` complete; icons; splash screens.
- Service worker for routine catalog caching.
- Offline banner + fallback for player (pose works offline if model cached).
- Install prompt on iOS/Android.

**Exit:** Lighthouse PWA ≥ 90; add-to-home-screen works.

---

## Phase 11 — Health Safety & Disclaimers

**Lead:** security-lead (Opus). **Duration:** 1 session.

**Entry:** Phase 10 green.

**Deliverables:**
- `src/lib/disclaimers.ts` — single source of truth for every disclaimer string (per `HEALTH_RULES.md`).
- Disclaimer rendering on: onboarding, routine start, AI-generated cards (forward-compat), pain feedback prompt.
- Pain-feedback-≥7 flow: suggest medical guidance, deprioritize similar routines next time.
- Pre-existing-condition safety-flag enforcement throughout personalization.
- Audit: grep repo for user-facing text, ensure none contradicts disclaimers.

**Exit:** `HEALTH_RULES.md` checklist 100% satisfied; pr-reviewer gate 4 passes.

---

## Phase 12 — Observability (Vercel Analytics, Sentry)

**Lead:** devops-lead. **Duration:** 1 session.

**Entry:** Phase 11 green.

**Deliverables:**
- `@vercel/analytics` wired.
- `@sentry/nextjs` error capture (server + client, but NOT pose frames or user PII).
- Structured logger wrapper for server actions (no `console.log` in committed code).
- Alert rules: 5xx rate, webhook signature failures, Stripe webhook lag.

**Exit:** a deliberate test error shows up in Sentry dashboard; Vercel Analytics shows pageviews.

---

## Phase 13 — Performance Pass

**Lead:** frontend-lead. **Duration:** 1 session.

**Entry:** Phase 12 green.

**Deliverables:**
- Lighthouse audit on each major route; minimum score 90 on all four Core Web Vitals.
- Bundle analyzer: identify any >100KB non-critical import; lazy-load or drop.
- RSC audit: no accidental `'use client'` on static content.
- Image optimization: all hero/thumbnail images via `next/image`.
- MediaPipe model deferred until player route.

**Exit:** Lighthouse green across the board.

---

## Phase 14 — E2E Tests (Playwright)

**Lead:** qa-lead. **Duration:** 1–2 sessions.

**Entry:** Phase 13 green.

**Deliverables:**
- Playwright config with mobile + desktop viewports.
- Core flows: sign up → onboarding → start routine → complete → streak updates.
- Auth flow: sign in / sign out / session refresh.
- Billing flow: upgrade path via Stripe test mode.
- CI integration: Playwright runs on every PR against preview deploy.

**Exit:** Playwright suite green on preview deploy.

---

## Phase 15 — Vercel Deploy (preview + prod)

**Lead:** devops-lead. **Duration:** 1 session.

**Entry:** Phase 14 green.

**Deliverables:**
- Vercel project created; env vars set (DATABASE_URL, NEXTAUTH_URL/SECRET, STRIPE_*, SENTRY_DSN).
- Production Neon branch provisioned; migrations applied.
- Domain + HTTPS configured.
- Preview deploys per PR with seed data.
- Production smoke test checklist: sign in, start routine, upgrade, webhook round-trip.

**Exit:** `https://bendro.app` (or chosen domain) live; v1 launched.

---

## Phase Management

- Only one phase is active at a time.
- Phase transitions require the `phase-closeout` skill producing a green report and a commit `chore(phase-closeout): close Phase N`.
- Mid-phase blockers go in `docs/BLOCKERS.md`.
- Each phase's deliverables become the entry criterion for the next.
