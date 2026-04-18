# Session Handoff

**Date:** 2026-04-18
**Last Session:** Phase 15 closeout + Vercel go-live + CI YAML fix
**Current Phase:** 15 — CLOSED. Phase 16 scoped, not started.
**Working Directory:** `/Users/dhanujgumpella/bendro`
**Git Branch:** `main`
**Live URL:** https://bendro.vercel.app (HTTP 200 confirmed)

---

## TL;DR for the next session

Read this file + `CLAUDE.md` + `docs/AGENT_MEMORY.md` + `.claude/checkpoints/ACTIVE.md` in that order. Then run `git status` and `git log --oneline -5` to see the current state. Then pick up from §"Immediate first actions" below.

Bendro is now v1-deployable. Phases 0–15 closed: framework port, test baseline, API contracts, Auth.js v5, player stability, DB toggle, onboarding, library filters, sessions/streaks, Stripe billing, player polish, health safety, paywall UX, marketing site, Playwright e2e, Sentry + PostHog + CI. 307 unit/integration specs + 18 Playwright specs passing locally. Vercel is live.

---

## Immediate first actions (copy-paste ready)

```
cd /Users/dhanujgumpella/bendro
git status
git log --oneline -5
git log origin/main..HEAD
```

**Expected state:**
- Branch `main`, working tree clean
- One unpushed commit: `a59cea6 fix(ci): rewrite workflow with block YAML syntax`
- Previous head on origin/main: `8967902 feat(phase-15): observability + CI e2e + stripe checkout happy-path`

**First action the new session should take:**

1. Push the unpushed CI fix — the user must do this themselves (`git push origin main` is blocked for Claude by their permission policy). Ask the user to run:
   ```
   cd /Users/dhanujgumpella/bendro && git push origin main
   ```

2. After push, verify GitHub Actions runs successfully:
   ```
   gh run list --branch main --limit 2
   ```
   Expect `.github/workflows/ci.yml` with 3 jobs (lint-typecheck-test, build, e2e) to start and succeed. If any fails, investigate the specific job log via `gh run view <run-id> --log-failed`.

3. Confirm Vercel is still serving: `curl -sI https://bendro.vercel.app/ | head -3`.

---

## What happened in the previous session

1. **Phase 14 closeout** (already committed before this session): playwright e2e, auth bypass seam, drizzle-adapter conditional.

2. **Phase 15 executed end-to-end:**
   - Sentry: `@sentry/nextjs@10.49.0` + 3 config files + `instrumentation.ts` + `withSentryConfig` wrap in `next.config.ts`. All no-op when DSN / auth-token unset.
   - PostHog: client/server physical split — `src/lib/analytics.ts` (client-safe, lazy `posthog-js`) + `src/lib/analytics-server.ts` (`import "server-only"`, lazy `posthog-node`). Split needed because Turbopack traced `posthog-node`'s `node:fs` into the client bundle otherwise.
   - GitHub Actions CI at `.github/workflows/ci.yml` — 3 jobs (lint/typecheck/test → build + e2e).
   - `docs/DEPLOY.md` per-environment env-var matrix + rollback protocol.
   - `src/config/env.ts` + `.env.example` synced with full `AUTH_*` block + Sentry + PostHog vars.
   - Stripe checkout happy-path e2e at `tests/e2e/billing.spec.ts` via offline `page.route()` intercepts — Stripe is NEVER called.
   - `playwright.config.ts` webServer.env now seeds `STRIPE_PREMIUM_PRICE_ID=price_e2e_test_premium`.
   - Rewrote the "disabled CTA" spec in `marketing.spec.ts` to assert the enabled signed-out path (click → `/signin?callbackUrl=/pricing`).
   - Committed as `8967902` (20 files, +2825 / -117).

3. **Phase 15 closeout docs:**
   - `.claude/checkpoints/COMPLETED/phase-15.md`
   - `CHANGELOG.md` `[Unreleased] → Added` prepended
   - `docs/AGENT_MEMORY.md` updated to Phase 15 closeout + added decisions #19/20/21
   - `.claude/checkpoints/ACTIVE.md` rewritten for Phase 16 scope

4. **Vercel go-live confirmed** at https://bendro.vercel.app (HTTP 200, fresh render). User pushed `main` directly via terminal (Claude's push was blocked).

5. **CI YAML was broken.** GitHub rejected the workflow file entirely for commit `8967902` — zero check-runs created. Root cause: the workflow used inline flow-mapping syntax `with: { version: ${{ env.PNPM_VERSION }} }` which GitHub's parser can't handle (the colon inside the `${{ }}` collides with YAML flow-mapping syntax). **Fix committed locally as `a59cea6`** — rewrote the whole workflow in block YAML, validated with `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`. **NOT YET PUSHED.**

6. **Audit completed.** Searched for every stub / TODO / FIXME / mock / deferred item. Zero inline TODO markers in source. All "stubs" are intentional (mock data fallback, feature flags, E2E bypass seams, BDD feature files without step bindings — executable coverage is in Vitest/Playwright instead).

---

## Current state of the codebase

### Branch & commits

```
Branch: main
HEAD:   a59cea6 fix(ci): rewrite workflow with block YAML syntax   [LOCAL ONLY]
        8967902 feat(phase-15): observability + CI e2e + stripe checkout happy-path   [on origin/main]
        3d28b29 feat(phase-14): playwright e2e + auth bypass seam + drizzle-adapter fix
        ... (16 more phase commits)
```

Worktree is clean. One commit ahead of `origin/main`.

### Tests

- `pnpm test` → 307 / 307 passing (26 files). Thresholds green: global ≥70% lines, services ≥85% lines + functions.
- `pnpm e2e` → 18 / 18 passing across chromium (3 files: marketing, app, billing).
- `pnpm typecheck` → clean.
- `pnpm build` → clean (Sentry wrap inert without auth token; Drizzle adapter conditional on `DATABASE_URL`).

### Vercel deploy

- Live at https://bendro.vercel.app
- Deploys from `main` automatically. CI status is independent — Vercel will deploy even if GH Actions fails.
- Env vars in Vercel dashboard are unknown from this side (user needs to populate per `docs/DEPLOY.md` matrix).

---

## Phase 16 — opens on a user-gated item

`.claude/checkpoints/ACTIVE.md` has the full scope. Summary:

**Blocked on user (requires interactive owner login):**
- `vercel link` + `vercel env pull` — Vercel CLI needs browser/OAuth login the user must do.
- Populate Preview + Production env vars in Vercel dashboard per `docs/DEPLOY.md`.
- Register Stripe webhook URL at `{prod-url}/api/webhooks/stripe` in Stripe dashboard.
- Create Sentry project + grab `SENTRY_DSN` / `SENTRY_AUTH_TOKEN`.
- Create PostHog project + grab `NEXT_PUBLIC_POSTHOG_KEY`.
- Create Google OAuth client + Resend API key for sign-in providers.

**Autonomous work available (in suggested priority order):**

1. **`/api/health` endpoint** — trivial but required for uptime monitoring. Return `{ status, uptime, commitSha, timestamp }`. No auth.

2. **Server-side PostHog call-sites** — infrastructure ready (`src/lib/analytics-server.ts::captureServerEvent`), zero call sites. Wire into:
   - `src/app/api/webhooks/stripe/route.ts` on `customer.subscription.{created,updated,deleted}` + `invoice.payment_failed`
   - `src/app/api/billing/portal/route.ts` on successful session creation
   - `src/app/api/me/route.ts` when safety-flag changes

3. **Player e2e fixture** — need to stub:
   - `navigator.mediaDevices.getUserMedia` (return synthetic `MediaStream`)
   - `@mediapipe/tasks-vision` loader (module mock)
   - VRM/three-vrm init (skip WebGL requirement)
   - Then cover ready → stretching → rest → complete transitions + keyboard shortcuts. Scenarios already written in `tests/features/player/player.feature` (25 scenarios).

4. **Onboarding e2e step bindings** — `.feature` file at `tests/features/onboarding/onboarding.feature` (7 scenarios) documents the multi-step flow. Need `stepAs({ goals, focus, avoid, conditions })` helper and Playwright bindings.

5. **Sentry alert routing** — wire Sentry → Slack or PagerDuty webhook. Requires Sentry project setup first (user action).

6. **Load testing baseline** — k6 or artillery script against `/pricing → POST /api/billing/checkout` and `/home → /api/progress`. Target: 100 concurrent users; log p50/p95/p99.

7. **Neon backup/restore runbook** — `docs/RUNBOOKS/neon-restore.md`. Docs-only.

---

## Critical context that isn't in CLAUDE.md

### Two rules that have tripped up automation

1. **Pushing to `main` is blocked by permission policy.** Any `git push origin main` by Claude returns "Pushing directly to the main branch, which bypasses PR review." The user must push manually. Feature-branch pushes work fine.

2. **Destructive git operations are also blocked.** `git push origin --delete <branch>` was blocked. `git reset --hard`, `git push --force`, etc. probably are too.

### Auto mode is active in the user's Claude Code session

- Rule 1: Execute immediately, minimize interruptions.
- Rule 5: Do NOT take overly destructive actions. Pushing to main + deleting branches fall under this.

### The user's terminal experience

When the user pastes a `!` prefix into their zsh terminal it triggers history expansion. The `!` prefix is a Claude Code *prompt box* feature, not a shell feature. Be explicit about which one.

### E2E bypass seams are physically disabled in prod

`src/lib/auth.ts:117-134` + `src/services/billing.ts:65-81` both gate on `NODE_ENV !== "production"` AND `E2E_AUTH_BYPASS === "1"`. Vercel production env MUST NOT set `E2E_AUTH_BYPASS`. `docs/DEPLOY.md` documents this.

### What doesn't work yet

- `/player/*` has zero Playwright e2e coverage.
- `/onboarding` multi-step has zero Playwright e2e coverage (feature file exists, no step bindings).
- No `/api/health` endpoint — any uptime monitor pointed at the default path will 404.
- Server-side PostHog has zero call sites — subscription/portal funnel events only land client-side.
- Sentry will capture errors but not route them anywhere (no Slack/PagerDuty integration).

---

## Source of truth hierarchy

Read in this order for full context:

1. `CLAUDE.md` (master rules — highest authority)
2. `.claude/rules/SYSTEM_RULES.md`, `ARCHITECTURE_RULES.md`, `SECURITY_RULES.md`, `HEALTH_RULES.md`
3. `docs/AGENT_MEMORY.md` (current phase + 21 decisions)
4. `docs/ADR/` (6 ADRs — 0001 base architecture, 0002 data adapter, 0003 pose solver boundary, 0004 Auth.js v5, 0005 Stripe billing, 0006 TBD)
5. `docs/STANDARDS.md` (coding conventions)
6. `docs/PHASES.md` (16-phase plan)
7. `.claude/checkpoints/ACTIVE.md` (current phase scope)
8. `.claude/checkpoints/COMPLETED/phase-{0..15}.md` (what each phase shipped)
9. `docs/specs/openapi/v1/bendro.yaml` (API contracts)
10. `docs/DEPLOY.md` (env-var matrix + deploy checklist)
11. `docs/DB_TOGGLE.md` (mock ↔ local ↔ Neon workflow)

---

## Stack snapshot

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (React 19, TS 5) — *breaking changes vs training data; see `AGENTS.md`* |
| Styling | Tailwind CSS 4, shadcn/ui, Base UI, framer-motion |
| Database | Neon serverless Postgres (prod) + in-memory mock (local/test) |
| ORM | Drizzle + drizzle-kit (migrations in `src/db/migrations/`) |
| Data adapter | `src/lib/data.ts` — single switch between mock and DB |
| State | Zustand (client UI), TanStack Query (server-state cache) |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.31`) + `@auth/drizzle-adapter`, database sessions, Google + Resend providers |
| Billing | Stripe Checkout + signed webhooks (Phase 9 — ADR-0005) |
| Pose / Avatar | MediaPipe Tasks Vision → Kalidokit → @pixiv/three-vrm on @react-three/fiber |
| Validation | Zod at every route boundary |
| Testing | Vitest (unit/integration, 307 specs); Playwright (e2e, 18 specs, chromium) |
| Observability | Sentry `@sentry/nextjs@10.49.0` + PostHog `posthog-js` / `posthog-node` |
| CI | GitHub Actions — lint + typecheck + test + build + Playwright e2e |
| Deploy | Vercel (live at https://bendro.vercel.app) |

---

## Architecture invariants

1. **Single external-SDK wrappers.** `next-auth` only in `src/lib/auth.ts`. `stripe` only in `src/services/billing.ts`. Future AI client only in `src/services/ai/ai-client.ts`.
2. **`userId` is server-sourced.** Authenticated routes read `userId` from `auth()` and ignore the body/query. Cross-tenant access returns 404 (not 403) to prevent session-id enumeration.
3. **Pose detection is client-only.** No frames, landmarks, or camera stream leave the device. Privacy + cost invariant.
4. **Data access through `src/lib/data.ts`.** Routes/services never branch on env.
5. **Zod at every route boundary.** Body + query + path params validated before service call.
6. **Pre-existing conditions are never persisted.** `PATCH /api/me` derives `safetyFlag` and discards the raw yes/no answers. Integration-tested.
7. **PostHog client/server physical split.** Client modules never import `posthog-node`.
8. **Sentry wrap is unconditional.** `next.config.ts` always wraps. Inert without `SENTRY_AUTH_TOKEN`.
9. **E2E bypass seams dual-gated.** `NODE_ENV !== "production"` AND `E2E_AUTH_BYPASS === "1"`. Physically disabled in prod.

---

## Agent roster

| Agent | Model | Owns |
|---|---|---|
| architect | Opus | System architecture, ADR authorship, module-boundary governance |
| planner | Opus | Phase plans, PRD, backlog, BDD scenario outlines |
| security-lead | Opus | Auth, secrets, Stripe webhooks, health-disclaimer enforcement, SAST |
| pr-reviewer | Opus | Final PR gate — runs the full enterprise checklist |
| backend-lead | Default | `src/app/api/*`, `src/services/*`, `src/db/*`, `src/lib/data.ts` |
| frontend-lead | Default | `src/app/**/*.tsx`, `src/components/*`, Tailwind, player/camera UI |
| qa-lead | Default | Vitest suites, BDD features, Playwright e2e, coverage gates |
| devops-lead | Default | CI, Vercel deploy, env management, observability |
| docs-lead | Default | CHANGELOG, architecture diagrams, ADR formatting, EXECUTION_LOG |

---

## Validation checklist before making any claims about shipping

When the new session finishes a Phase 16 item, verify in this order:

1. `pnpm lint && pnpm typecheck && pnpm test` locally → all green
2. `pnpm e2e` locally → 18/18 (or 19/19 after player e2e lands)
3. `pnpm build` locally → clean
4. Commit with conventional-commit format (see `CLAUDE.md` §14)
5. Ask user to push (Claude can't push to main)
6. Verify GitHub Actions green: `gh run list --branch main --limit 1`
7. Verify Vercel deploy updated: `curl -sI https://bendro.vercel.app/`
8. Update `CHANGELOG.md`, `docs/AGENT_MEMORY.md`, `.claude/checkpoints/`, commit, ask user to push again.

---

## Files changed in this session (already committed as `8967902` + `a59cea6`)

```
8967902 (origin/main):
  .claude/checkpoints/ACTIVE.md                    (rewritten → Phase 16 scope)
  .claude/checkpoints/COMPLETED/phase-15.md        (new)
  .env.example                                     (AUTH_* + observability)
  .github/workflows/ci.yml                         (new)
  CHANGELOG.md                                     (Phase 15 Added entry prepended)
  docs/AGENT_MEMORY.md                             (Phase 15 closeout, +decisions 19/20/21)
  docs/DEPLOY.md                                   (new)
  instrumentation.ts                               (new)
  next.config.ts                                   (Sentry wrap)
  package.json / pnpm-lock.yaml                    (Sentry + PostHog deps)
  playwright.config.ts                             (STRIPE_PREMIUM_PRICE_ID)
  sentry.client.config.ts                          (new)
  sentry.edge.config.ts                            (new)
  sentry.server.config.ts                          (new)
  src/config/env.ts                                (observability env)
  src/lib/analytics.ts                             (posthog-js wiring, client-only)
  src/lib/analytics-server.ts                      (new, server-only)
  tests/e2e/billing.spec.ts                        (new)
  tests/e2e/marketing.spec.ts                      (enabled-CTA rewrite)

a59cea6 (LOCAL ONLY, not pushed):
  .github/workflows/ci.yml                         (block YAML rewrite)
```

---

## Open questions for the user (ask when resuming)

1. Want to push the CI fix (`a59cea6`) now? Direct-to-main push is blocked for Claude.
2. Which Phase 16 items to prioritize: health endpoint + server PostHog (backend-lead, 1 session), or player e2e fixture (qa-lead, harder)?
3. Is Vercel linked to a domain yet (custom domain vs `bendro.vercel.app`)?
4. What env vars are currently set in Vercel prod? (Claude can't inspect, need user to share via `docs/DEPLOY.md` matrix.)

---

*End of handoff. A fresh Claude session should be able to resume cold from this file + `CLAUDE.md` + `docs/AGENT_MEMORY.md`.*
