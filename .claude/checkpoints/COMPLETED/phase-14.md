# Phase 14 — E2E Coverage / Playwright step bindings — CLOSED

**Lead:** qa-lead
**Closed:** 2026-04-18
**Tests:** 307 unit/integration (26 files) + 16 Playwright e2e (2 files);
typecheck clean; `pnpm build` clean.

## Scope delivered

Wiring a real end-to-end harness around the marketing funnel, the signed-in
shell, and the paywall-decoration flow built up over Phases 9–13. Instead of
binding every one of the ~80 Gherkin scenarios accumulated across those
phases, we locked in the core smoke paths the release gate actually cares
about; the remaining scenarios stay as BDD scaffolds until the product
surface settles.

### 1. Playwright install + config

- `pnpm add -D @playwright/test` + `npx playwright install chromium`.
- `playwright.config.ts` at repo root — chromium-only, webServer runs
  `pnpm dev` with `E2E_AUTH_BYPASS=1`, `AUTH_SECRET` seeded so
  `/api/auth/*` stops spamming `MissingSecret`.
- `package.json` scripts: `e2e`, `e2e:ui`, `e2e:install`.
- `vitest.config.ts` now excludes `tests/e2e/**` so the vitest runner
  doesn't trip over `test.describe()` coming from the Playwright runtime.

### 2. Auth + billing bypass seams

Two narrow, production-safe seams added so Playwright can simulate
signed-out, free, and premium viewers without provisioning real OAuth
or Stripe state:

- `src/lib/auth.ts` — a new `maybeE2eSession()` helper wraps the
  NextAuth-exported `auth()`. Only active when
  `NODE_ENV !== "production"` AND `E2E_AUTH_BYPASS === "1"`. Reads
  `e2e_user_id` / `e2e_user_email` / `e2e_user_name` cookies and
  returns a synthetic `Session` shaped like Auth.js's. Falls through
  to the real `auth()` otherwise.
- `src/services/billing.ts` — parallel `maybeE2eSubscriptionStatus()`
  seam on `getSubscriptionStatus()` reads an `e2e_subscription_status`
  cookie (`free | active | trialing | past_due | canceled`) so premium
  state can be flipped without a user row.

Both seams are physically disabled in production (double-gated: env
flag AND `NODE_ENV` check).

### 3. Drizzle-adapter blocker fixed (was deferred to Phase 15)

`src/lib/auth.ts` now conditionally attaches `DrizzleAdapter(db, …)` only
when `hasDatabaseUrl()` returns true. Without a `DATABASE_URL`, the config
falls back to `session: { strategy: "jwt" }`. The `session()` callback
reads `token.sub` when `user?.id` is absent, so the JWT path still
resolves a domain userId.

This unblocks:
- `pnpm dev` without `DATABASE_URL` — previously crashed at module
  load because `DrizzleAdapter` inspects the `db` Proxy and rejects it
  as "Unsupported database type (object)".
- `pnpm build` — same crash during "Collecting page data". Build now
  succeeds cleanly, closing the Phase 13 deploy prereq.

### 4. Playwright fixtures

`tests/e2e/fixtures.ts`:

- Exports `test` (extended base), `expect`, and a typed `E2E_USERS`
  registry (`free`, `premium`, `pastDue`) with deterministic UUIDs.
- `authAs.signInAs(user)` and `authAs.signOut()` helpers set or clear
  the four `e2e_*` cookies on the browser context.
- Cookie contract documented in the file header.

### 5. E2E specs

`tests/e2e/marketing.spec.ts` (7 specs):
- Signed-out landing: hero + marketing shell + CTA label contract.
- Signed-out → Pricing nav → free CTA says "Get started free".
- Signed-out → Premium CTA is disabled when `STRIPE_PREMIUM_PRICE_ID`
  is unset (exercises the dev-fallback UX).
- Footer legal links → /legal/terms + /legal/privacy render.
- Pricing FAQ `<details>` toggles open on click.
- Auth bypass: signed-in viewer redirects `/` → `/home`.
- Auth bypass: signed-in viewer sees "Open app" CTA + "Back to app"
  free-plan CTA on `/pricing`.

`tests/e2e/app.spec.ts` (9 specs):
- Free viewer `/home` → dashboard + start CTA + upgrade CTA.
- Free viewer `/library` → premium rows decorated as locked.
- Free viewer `/library` click on locked row → `/account?upgrade=1`
  banner visible + upgrade CTA.
- Free viewer `/account` → Free plan badge + upgrade CTA to `/pricing`.
- Premium viewer `/home` → upgrade CTA is hidden.
- Premium viewer `/library` → premium rows unlocked, link to `/player/…`.
- Premium viewer `/account` → active plan status badge.
- Signed-out `/home` and `/account` redirect to `/signin?callbackUrl=…`.

### 6. Mock catalog — premium seed

Added `hip-opener-deep` (isPremium: true, level: deep) to
`MOCK_ROUTINES`. Without it the paywall decoration path was vacuously
correct in dev (no premium rows to filter), making an e2e impossible.
The DB seed already had this routine; the mock now matches.

## Deferred / non-goals

- **Player e2e (`/player/demo`).** Skipped — requires camera permission
  prompting, WebGL, MediaPipe loader, and VRM avatar init. Needs a
  dedicated fixture that stubs `getUserMedia` and skips VRM. Filed as
  Phase 15 follow-up.
- **Onboarding e2e.** Scenarios exist in `tests/features/onboarding/`
  but step bindings remain deferred — the multi-step form needs its
  own helper and isn't on the release critical path.
- **CI job.** No GitHub Actions workflow added in this phase; Phase
  15 will own CI + deploy together. Running `pnpm e2e` locally is the
  release gate for now.
- **Billing checkout e2e (happy-path).** Disabled CTA is covered; the
  signed-in-with-priceId path needs a Stripe Checkout URL mock or a
  network intercept. Deferred to Phase 15 when real Stripe test-mode
  keys are wired.

## Quality gates

- `pnpm test` → 307 / 307 passing (26 files).
- `pnpm e2e` → 16 / 16 passing across chromium (2 files, ~6s).
- `pnpm typecheck` → clean.
- `pnpm build` → clean (Drizzle-adapter blocker resolved).
- No schema changes.
- No new runtime deps (`@playwright/test` is devDependency only).

## Files changed

```
.claude/checkpoints/ACTIVE.md                               (updated)
.claude/checkpoints/COMPLETED/phase-14.md                   (new)
CHANGELOG.md                                                 (updated)
docs/AGENT_MEMORY.md                                         (updated)
package.json                                                 (e2e scripts)
playwright.config.ts                                         (new)
src/lib/auth.ts                                              (seams + adapter gate)
src/services/billing.ts                                      (billing bypass seam)
src/lib/mock-data.ts                                         (premium routine seed)
tests/e2e/fixtures.ts                                        (new)
tests/e2e/marketing.spec.ts                                  (new)
tests/e2e/app.spec.ts                                        (new)
vitest.config.ts                                             (exclude tests/e2e/**)
```
