# Phase 15 — Observability + CI e2e + checkout happy-path — CLOSED

**Lead:** devops-lead
**Closed:** 2026-04-18
**Tests:** 307 unit/integration (26 files) + 18 Playwright e2e (3 files);
typecheck clean; `pnpm build` clean.

## Scope delivered

Standing up the operational surface area needed for a Vercel preview +
prod deploy: Sentry wiring for error capture, PostHog wiring for
product analytics, a GitHub Actions CI workflow that runs typecheck /
unit tests / build / Playwright on every PR, a documented env-var
matrix (`docs/DEPLOY.md`), and the first Stripe-checkout happy-path
e2e (with offline mocking so the test never calls real Stripe).

### 1. Sentry wiring (SENTRY_DSN)

- `@sentry/nextjs@10.49.0` installed as a runtime dep.
- `sentry.server.config.ts`, `sentry.edge.config.ts`,
  `sentry.client.config.ts` at repo root — each is a no-op when the
  matching DSN env var (`SENTRY_DSN` server, `NEXT_PUBLIC_SENTRY_DSN`
  client) is unset, so local dev + CI + preview-without-Sentry stay
  quiet.
- `instrumentation.ts` at repo root — the Next.js 16 hook that loads
  server or edge config based on `process.env.NEXT_RUNTIME`, and
  re-exports `captureRequestError as onRequestError` so Next's
  built-in error-reporting pipe surfaces exceptions automatically.
- `next.config.ts` now unconditionally wraps the config with
  `withSentryConfig(...)`. Without `SENTRY_AUTH_TOKEN` it is a no-op
  (no source-map upload, no tracing wrappers) so wrapping is safe to
  keep live by default.

### 2. PostHog wiring (NEXT_PUBLIC_POSTHOG_KEY)

- `posthog-js` + `posthog-node` installed.
- `src/lib/analytics.ts` refactored to lazy-init `posthog-js` on the
  client when `NEXT_PUBLIC_POSTHOG_KEY` is set; otherwise falls back
  to the existing `window.__bendroEvents` test buffer. `trackEvent`
  signature is unchanged — existing call sites keep working.
- `src/lib/analytics-server.ts` is a new server-only module
  (`import "server-only"`) that lazy-loads `posthog-node` for RSC /
  API-route callers. Splitting client + server paths keeps
  `posthog-node` (which requires `node:fs`) physically out of the
  client bundle — attempting to include it triggered a Turbopack
  chunking failure during `pnpm build`, which this split resolves.

### 3. GitHub Actions CI

`.github/workflows/ci.yml` added with three jobs:

- `lint-typecheck-test` — pnpm install + lint + typecheck + vitest.
  Blocks every downstream job.
- `build` — `pnpm build` against the production config, validates the
  Next build still works post-Sentry wrap.
- `e2e` — `pnpm exec playwright install chromium` (browser cache
  keyed on `pnpm-lock.yaml`) + `pnpm e2e`. `CI=true` enables retries
  + github reporter. Uploads `test-results/` + `playwright-report/`
  as artifacts on failure.

Concurrency group cancels in-progress runs on the same branch; all
three jobs reuse the pnpm store cache via `pnpm/action-setup@v4` +
`actions/setup-node@v4`.

### 4. `docs/DEPLOY.md` env-var matrix

Per-environment table (Preview / Prod) for every env var Bendro reads:
`DATABASE_URL`, `AUTH_SECRET` + `AUTH_URL`, `AUTH_GOOGLE_*` +
`AUTH_RESEND_KEY` + `AUTH_EMAIL_FROM`, the five Stripe variables, the
six observability variables, `NEXT_PUBLIC_APP_URL`, `OPENAI_API_KEY`,
and the `E2E_AUTH_BYPASS` no-never-set contract. Deploy checklist
walks the Vercel project setup, integration install, verification of
a preview deploy, and the rollback protocol referencing `DB_TOGGLE.md`.

`src/config/env.ts` + `.env.example` updated to match — `AUTH_*`
variables (previously partially populated), the five Sentry vars, the
two PostHog vars, and `STRIPE_PREMIUM_ANNUAL_PRICE_ID` are now all
present in both files. Missing observability values are optional
across environments (no-op when absent).

### 5. Stripe checkout happy-path e2e

`tests/e2e/billing.spec.ts` (2 specs):

- `pricing → premium CTA → checkout POST → Stripe redirect`:
  Playwright `page.route("**/api/billing/checkout")` intercepts the
  POST and returns a mock `{ sessionId, url }`. A second `page.route`
  intercepts the mock Stripe URL and returns a stub HTML page.
  Asserts: CTA renders enabled (`data-has-price-id="true"`,
  `data-signed-in="true"`), click navigates to the mock Stripe URL,
  and the captured POST body is the expected priceId.
- `checkout endpoint error surfaces inline alert`: intercept returns
  a 400 `{ error.code: VALIDATION_ERROR, message: "Unknown priceId…" }`
  and the test asserts the `pricing-checkout-error` banner renders
  the server message.

`playwright.config.ts` webServer.env now sets
`STRIPE_PREMIUM_PRICE_ID=price_e2e_test_premium` so the CTA renders
enabled without real Stripe keys. The previous "disabled when unset"
e2e in `marketing.spec.ts` has been rewritten to assert the enabled
signed-out path (click routes to `/signin?callbackUrl=/pricing`);
the disabled-fallback UX assertion stays as a unit-level concern in
`tests/unit/` where env toggling is per-test.

## Deferred / non-goals

- **Vercel project link + preview deploy.** Creating the Vercel
  project requires an interactive login (`vercel link` /
  `vercel env pull`) and therefore needs explicit owner action. All
  the wiring the CLI needs (env-var matrix, next.config Sentry
  wrap, build-green) is in place.
- **Player e2e (`/player/demo`).** Needs a dedicated fixture that
  stubs `navigator.mediaDevices.getUserMedia`, short-circuits the
  MediaPipe Tasks Vision loader, and skips VRM init. Filed as a
  Phase 16 follow-up.
- **Onboarding e2e step bindings.** Multi-step form helper still
  deferred. Filed as a Phase 16 follow-up.
- **Server-side PostHog `trackEvent`.** The server split is ready
  via `src/lib/analytics-server.ts::captureServerEvent`; no current
  server call sites wire into it. Will land with the first RSC or
  API route that needs it.
- **Production monitoring alerts (PagerDuty / Slack).** Phase 16 scope.
- **Load + performance testing.** Phase 16 scope.

## Quality gates

- `pnpm test` → 307 / 307 passing (26 files).
- `pnpm e2e` → 18 / 18 passing across chromium (3 files, ~8s).
- `pnpm typecheck` → clean.
- `pnpm build` → clean (Sentry wrap did not regress the Drizzle-adapter
  fix landed in Phase 14).
- No schema changes.
- New runtime deps: `@sentry/nextjs@10.49.0`, `posthog-js@1.369.3`,
  `posthog-node@5.29.2`.

## Files changed

```
.claude/checkpoints/ACTIVE.md                                  (updated)
.claude/checkpoints/COMPLETED/phase-15.md                      (new)
.env.example                                                    (AUTH_* + observability)
.github/workflows/ci.yml                                        (new)
CHANGELOG.md                                                    (updated)
docs/AGENT_MEMORY.md                                            (updated)
docs/DEPLOY.md                                                  (new)
instrumentation.ts                                              (new)
next.config.ts                                                  (Sentry wrap)
package.json / pnpm-lock.yaml                                   (Sentry + PostHog deps)
playwright.config.ts                                            (STRIPE_PREMIUM_PRICE_ID)
sentry.client.config.ts                                         (new)
sentry.edge.config.ts                                           (new)
sentry.server.config.ts                                         (new)
src/config/env.ts                                               (observability env)
src/lib/analytics.ts                                            (posthog-js wiring)
src/lib/analytics-server.ts                                     (new, server-only)
tests/e2e/billing.spec.ts                                       (new)
tests/e2e/marketing.spec.ts                                     (enabled-CTA rewrite)
```
