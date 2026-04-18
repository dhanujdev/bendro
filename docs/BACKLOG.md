# Bendro — Backlog

> Prioritized backlog items grouped by phase. Each item is a vertical slice
> with an acceptance criterion. Items pulled from `docs/PRD.md` functional
> requirements and current-state gaps.
>
> Workflow: pull the top unstarted item in the current phase → invoke
> `contract-first` → `bdd-scenario-write` → write tests → implement → PR.
> Don't start Phase N+1 items while Phase N is open.

Last updated: 2026-04-18 (Phase 0)

Legend: **P0** ship-blocking · **P1** important · **P2** nice-to-have

---

## Phase 0 — Foundation & Framework Port (nearly done)

- [x] Port `.claude/` structure from Creator OS
- [x] Adapt rules (SYSTEM, ARCHITECTURE, SECURITY, HEALTH)
- [x] Prune + adapt agents and skills
- [x] Adapt Python hooks for bendro paths
- [x] Write AGENT_MEMORY, BLOCKERS, DECISIONS, CHANGELOG, EXECUTION_LOG, PHASES, STANDARDS
- [x] Write ADR-0001 / ADR-0002 / ADR-0003
- [x] Scaffold `docs/specs/openapi/v1/bendro.yaml`
- [x] Write PRD + this BACKLOG
- [ ] **P0** Close Phase 0: `git commit -m "chore(docs): Phase 0 framework port complete"`

---

## Phase 1 — Test Coverage Baseline

- [ ] **P0** Add Vitest coverage reporter (`v8`) writing `coverage/coverage-summary.json`
- [ ] **P0** Unit tests for `src/services/routines.ts` (list + filter + get-by-id-or-slug)
- [ ] **P0** Unit tests for `src/services/sessions.ts` (start, update, completion math)
- [ ] **P0** Unit tests for `src/services/streaks.ts` (extend existing test; cover timezone + gap cases)
- [ ] **P0** Unit tests for `src/services/personalization.ts` (goal/focus/avoid filtering, safety flag)
- [ ] **P1** Unit tests for `src/services/billing.ts` (stub — test the stub's shape so the future implementation matches)
- [ ] **P0** Unit tests for `src/lib/data.ts` mock backend (round-trip every exported function)
- [ ] **P0** Unit tests for `src/lib/pose/angles.ts` (pure math — joint angle cases)
- [ ] **P1** BDD `.feature` scaffolds for each API route under `tests/features/api/`
- [ ] **P0** Coverage gate in `vitest.config.ts`: ≥ 70% global, ≥ 85% services

Exit criterion: `pnpm test` green with coverage report; Gate 1 in `pre-pr-gate.py` passes.

---

## Phase 2 — API Contract & Validation

- [ ] **P0** Move Zod schemas from `src/types/` into `src/schemas/api/` (one file per resource)
- [ ] **P0** Standardize error envelope: `{ error: { code, message, details? } }` everywhere
- [ ] **P0** Refactor routes to: parse → `safeParse` → service → `Response.json`
- [ ] **P0** Integration tests per route in `tests/integration/api/*.test.ts`:
      happy path, validation failure, not-found, malformed JSON
- [ ] **P1** Add `GET /api/sessions` list endpoint (missing from current API)
- [ ] **P1** Add `GET /api/sessions/{id}` read endpoint (currently only PATCH)
- [ ] **P1** Document every error code in `docs/specs/openapi/v1/bendro.yaml`
- [ ] **P2** Generate a typed API client from OpenAPI for internal use

Exit criterion: `contract-guard.py` passes for every resource; 100% routes covered by integration tests.

---

## Phase 3 — Auth (NextAuth)

- [ ] **P0** ADR-0004: NextAuth v5 vs. v4 selection
- [ ] **P0** Install `next-auth` + Drizzle adapter; add NextAuth tables to schema
- [ ] **P0** Generate + apply migration for auth tables
- [ ] **P0** Configure providers: email magic link (Resend) + Google OAuth
- [ ] **P0** Implement `src/lib/auth.ts` with `getServerSession()`
- [ ] **P0** Protect `/api/sessions` (POST, PATCH) — 401 without session
- [ ] **P0** Protect `/api/progress` — 401 without session
- [ ] **P0** Remove `userId` from request bodies/queries; read from session
- [ ] **P0** Sign-in page `/auth/sign-in`
- [ ] **P0** Sign-out flow in the (app) shell
- [ ] **P0** Session provider on client shell
- [ ] **P0** Integration tests: 401 without session, 200 with session, cross-user access denied
- [ ] **P1** Update OpenAPI spec: remove `userId` fields; add security scheme
- [ ] **P1** `pre-pr-gate.py` Gate 4 passes (no userId from body)

Exit criterion: manual smoke: sign-in → start routine → sign-out works.

---

## Phase 4 — Player Stability

- [ ] **P0** Camera permission UI: explicit button, no auto-prompt
- [ ] **P0** Handle `getUserMedia` errors: denied, no device, insecure context
- [ ] **P0** "Stop camera" control that releases MediaStream
- [ ] **P0** MediaPipe model loading state + retry on failure
- [ ] **P0** Frame throttling so avatar runs ≥ 24fps on mid-tier mobile
- [ ] **P1** VRM fallback model if main one fails to load
- [ ] **P1** Client-side error boundary around `<AvatarView />`
- [ ] **P0** Playwright smoke: open `/player/[id]/camera`, verify consent UI

Exit criterion: `ui-smoke-test` skill green on Safari + Chrome.

---

## Phase 5 — DB Toggle Hardening

- [ ] **P0** Extract `DataAdapter` TypeScript interface from `src/lib/data.ts`
- [ ] **P0** Make mock + Drizzle backends both satisfy the interface (compile-time guarantee)
- [ ] **P0** One env-var switch; callers never read env
- [ ] **P0** Integration suite runs twice in CI: mock + docker-compose Postgres
- [ ] **P0** Neon preview branching wired to Vercel previews
- [ ] **P1** Idempotent `pnpm db:seed` (safe on re-run)

Exit criterion: full integration suite green in both modes.

---

## Phase 6 — Onboarding & Personalization

- [ ] **P0** Onboarding screens: goals, focus areas, avoid areas
- [ ] **P0** Pre-existing-condition question set (yes/no per HEALTH_RULES §Pre-Existing Condition Gating)
- [ ] **P0** Store `safety_flag` on user record (not the reason)
- [ ] **P0** `PATCH /api/me` endpoint for profile + timezone + reminder time
- [ ] **P0** `GET /api/me` endpoint
- [ ] **P0** Personalization query: filter routines by goals, avoid areas, safety flag
- [ ] **P0** Today's recommendation logic on `/home`
- [ ] **P1** Reminder email (Resend) at user's chosen time — optional for v1
- [ ] **P0** BDD + integration tests for onboarding happy path

Exit criterion: fresh sign-up → completed onboarding → personalized home.

---

## Phase 7 — Library, Search, Filters

- [ ] **P0** `/library` grid: routine cards with thumbnail + duration + goal
- [ ] **P0** Filter bar: goal, body area, intensity, premium-only toggle
- [ ] **P0** Server-side filtering via `GET /api/routines` query params
- [ ] **P0** Favorite toggle: `POST /api/favorites`, `DELETE /api/favorites/{id}`
- [ ] **P0** Favorites tab / filter on library
- [ ] **P1** Full-text search on routine title (Postgres `tsvector`)
- [ ] **P1** Empty/loading/error states polished

Exit criterion: catalog navigable and performant; Lighthouse ≥ 90 on `/library`.

---

## Phase 8 — Sessions & Streaks Loop

- [ ] **P0** Full session wire: player start → `POST /api/sessions` → service → DB
- [ ] **P0** Session complete: `PATCH /api/sessions/{id}` with final payload
- [ ] **P0** Streak rollover logic: timezone-aware, daily, gap-tolerant
- [ ] **P0** Pain feedback UI per stretch (0–10 slider)
- [ ] **P0** Progress dashboard on `/home`: today/week/month, current + longest streak
- [ ] **P0** BDD: streak continues; streak resets; DST; timezone shift
- [ ] **P1** "Streak freeze" (one miss forgiven per week) — optional

Exit criterion: daily loop usable: start → play → complete → streak updates.

---

## Phase 9 — Billing (Stripe)

- [ ] **P0** ADR-0005: Stripe Checkout vs. Stripe Elements
- [ ] **P0** `src/services/billing.ts` is the only Stripe importer
- [ ] **P0** `POST /api/billing/checkout` — creates Stripe Checkout session
- [ ] **P0** `POST /api/webhooks/stripe` with `stripe.webhooks.constructEvent` verification
- [ ] **P0** Idempotent handler keyed on `event.id` (stored in a `processed_stripe_events` table)
- [ ] **P0** Subscription state flows: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] **P0** Premium gate in routine catalog query
- [ ] **P0** Pricing page (`/pricing`) with real Stripe products
- [ ] **P0** Integration tests: valid signature, invalid signature rejected, idempotency, state transitions
- [ ] **P0** pr-reviewer gate: every billing PR reviewed

Exit criterion: test-mode checkout works end-to-end.

---

## Phase 10 — PWA & Offline

- [ ] **P0** Finish `src/app/manifest.ts`: icons, name, colors, display
- [ ] **P0** Service worker: cache stretches + routines catalog
- [ ] **P0** MediaPipe model cached via service worker
- [ ] **P0** Offline banner on non-catalog routes
- [ ] **P1** Add-to-home-screen prompt with dismiss memory
- [ ] **P0** Lighthouse PWA ≥ 90

Exit criterion: Lighthouse PWA passes; installs cleanly on iOS + Android.

---

## Phase 11 — Health Safety & Disclaimers

- [ ] **P0** `src/lib/disclaimers.ts` — all strings from HEALTH_RULES.md §Mandatory Disclosures
- [ ] **P0** Render disclaimers on: onboarding, routine start, pain feedback, AI cards (forward-compat)
- [ ] **P0** `src/services/safety.ts` — pain threshold constants + gating logic
- [ ] **P0** Pain ≥ 7: show medical-guidance prompt, deprioritize routine
- [ ] **P0** Pre-existing-condition safety flag enforced in catalog filter
- [ ] **P0** Audit: grep repo for user-facing copy that contradicts disclaimers
- [ ] **P0** `safety_events` table for pain ≥ 7 (audit trail)
- [ ] **P1** Emergency-language copy (per HEALTH_RULES §Emergency Language)

Exit criterion: HEALTH_RULES.md checklist 100% satisfied; pr-reviewer approves.

---

## Phase 12 — Observability

- [ ] **P0** `@vercel/analytics` on all pages
- [ ] **P0** `@sentry/nextjs` on server + client (already in deps; wire it)
- [ ] **P0** Scrub PII + pose data from Sentry events
- [ ] **P0** Structured server logger (replace `console.log` if any leaked in)
- [ ] **P1** Alert: 5xx rate > 1% over 5min
- [ ] **P1** Alert: Stripe webhook signature failure (any count)
- [ ] **P1** Alert: `/api/progress` p95 > 500ms

Exit criterion: deliberate test error appears in Sentry; Vercel Analytics shows data.

---

## Phase 13 — Performance Pass

- [ ] **P0** Lighthouse audit on `/`, `/home`, `/library`, `/pricing`, `/player/[id]`, `/player/[id]/camera`
- [ ] **P0** Bundle analyzer — identify > 100KB non-critical imports
- [ ] **P0** Lazy-load MediaPipe + VRM libs (player route only)
- [ ] **P0** `next/image` on all raster imagery
- [ ] **P0** RSC audit — no accidental `'use client'` on static content
- [ ] **P0** All Core Web Vitals green

Exit criterion: Lighthouse ≥ 90 across four Core Web Vitals on every audited route.

---

## Phase 14 — E2E Tests (Playwright)

- [ ] **P0** Playwright config: mobile (iPhone 13) + desktop (chromium)
- [ ] **P0** Sign-up → onboarding → start routine → complete → streak
- [ ] **P0** Sign-in → sign-out → session refresh
- [ ] **P0** Billing: upgrade path using Stripe test mode
- [ ] **P0** Wire Playwright into CI against preview deploy
- [ ] **P1** Visual regression snapshots on key screens

Exit criterion: Playwright suite green on preview deploy.

---

## Phase 15 — Vercel Deploy

- [ ] **P0** Create Vercel project + connect GitHub
- [ ] **P0** Env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_*`, `RESEND_API_KEY`, `STRIPE_*`, `SENTRY_DSN`
- [ ] **P0** Neon production branch + migrations applied
- [ ] **P0** Domain + HTTPS
- [ ] **P0** Preview deploys per PR with preview Neon branch
- [ ] **P0** Production smoke checklist: sign in, start routine, upgrade, webhook
- [ ] **P1** Add `devops-lead`'s runbook to `docs/RUNBOOK.md`

Exit criterion: production URL live; smoke checklist 100% green.

---

## Backlog — Post-v1

- **AI routine generation** (`src/services/ai/ai-client.ts` — single entry for LLM calls; mandatory AI-disclosure copy).
- **HealthKit / Google Fit** read-only integration with explicit per-category consent.
- **Offline session logging** with sync on reconnect.
- **Social / community** (heavy content-moderation scope; reopen after v1).
- **Internationalization** (English-only at v1).
- **Server-side pose summaries** (requires new ADR + legal review).
