# Phase 12 — Monetisation Polish / Paywall UX — CLOSED

**Lead:** frontend-lead
**Closed:** 2026-04-18
**Tests:** 300 passing (25 files); typecheck clean.

## Scope delivered

Flipping premium gating from Phase 9's "hide entirely" to "decorate +
show upsell", adding a real `/account` surface with Stripe customer
portal deep-link, and planting the telemetry seam for future analytics.

### 1. Paywall decoration on `/library`

`src/app/(app)/library/page.tsx`:

- Fetches `viewerIsPremium = await isPremium(session.user.id)` once.
- Each routine row computes `locked = routine.isPremium && !viewerIsPremium`.
- Locked rows route to `/account?upgrade=1&routine={slug}` instead of
  `/player/{slug}`; unlocked rows unchanged.
- Rendered premium badge (`Sparkles` icon + "Premium" label) and a
  swapped `Lock` affordance on the right when locked.
- `data-locked`, `data-premium` attributes on every routine row for
  Phase 14 Playwright.

This is purely a UX flip — `getRoutines()` still resolves the same rows
as before (catalog-level filter from Phase 9 remains as a defence-in-
depth for signed-out API callers; the library page overrides it by
passing `premiumUnlocked: true` and deciding lock state client-side).

### 2. `/account` page — `src/app/(app)/account/page.tsx`

Async RSC. Auth-required; `redirect("/signin?callbackUrl=/account")`
on no session.

- Reads `subscriptionStatus` via `getSubscriptionStatus(userId)`.
- Plan-status card with `data-status` attribute + colour-coded badge
  (free / active / trialing / past_due / canceled).
- Renders `<OpenPortalButton />` for premium users (client component,
  POSTs to `/api/billing/portal`, redirects `window.location.href` on
  success, renders inline amber error on failure).
- Renders `Upgrade to Premium` link (`/pricing`) for free users.
- Upgrade prompt banner (`data-testid="account-upgrade-banner"`,
  `role="status"`) shown when `?upgrade=1` AND the viewer is not
  premium — wired from the library locked-card click and the /home
  upgrade CTA.

### 3. `POST /api/billing/portal`

New route at `src/app/api/billing/portal/route.ts`:

- Auth-gated via `auth()`.
- Zod `PortalRequestSchema = { returnUrl?: string.url() }`.
- Calls `createCustomerPortalSession({ userId, returnUrl })`.
- Error translation:
  - `NO_CUSTOMER` → 409 `CONFLICT`
  - `STRIPE_SECRET_KEY is not set` → 503 `INTERNAL`
  - anything else → 500 `INTERNAL`
- `returnUrl` defaults to `${NEXT_PUBLIC_APP_URL}/account`.

`src/services/billing.ts` gains `createCustomerPortalSession(input)`:

- Throws `NO_CUSTOMER` if the user row has no `stripeCustomerId`.
- Otherwise `stripe.billingPortal.sessions.create({ customer, return_url })`.

### 4. Upgrade CTA on `/home`

`src/app/(app)/home/page.tsx`:

- Fetches `viewerIsPremium` alongside the existing progress payload.
- When not premium, renders a full-width `<Link>` to
  `/account?upgrade=1&source=home` above the recommended rail, styled
  consistently with the camera-mode tile but using the gradient-filled
  Sparkles variant. `data-testid="home-upgrade-cta"`.
- Suppressed entirely for premium users.

### 5. `trackEvent` telemetry stub — `src/lib/analytics.ts`

Single-file stub so every monetisation interaction already emits a
named event; we can wire it to PostHog / Segment / Mixpanel later
without touching callers.

- `EventName` union enumerates the events we care about for the
  funnel (`upgrade.clicked`, `upgrade.completed`, `portal.opened`,
  `premium.viewed`, `premium.locked_clicked`).
- Server-branch (no `window`) logs to `console.info` for visibility
  during dev; client-branch pushes to `window.__bendroEvents` so
  Playwright can assert on it directly without a mock.
- Wired into `<OpenPortalButton />` (`portal.opened` on click).

### 6. Tests

- `tests/unit/billing.test.ts` +4: `createCustomerPortalSession` happy
  path, NO_CUSTOMER (no stripeCustomerId / no user row), 503 when
  STRIPE_SECRET_KEY is unset.
- `tests/integration/api/billing-portal.test.ts` (new): 6 scenarios
  (401 no session, 400 malformed returnUrl, 409 NO_CUSTOMER, 503
  stripe unconfigured, 200 happy, default-returnUrl fallback).
- `tests/unit/analytics.test.ts` (new): 4 scenarios covering
  server-branch console.info, client-branch `window.__bendroEvents`
  push, default props object, append behaviour across calls.

Total: **+14 tests vs Phase 11 close (286 → 300)**.

### 7. Contracts + BDD scaffolds

- OpenAPI: new `POST /billing/portal` (200 / 400 / 401 / 409 / 503) in
  `docs/specs/openapi/v1/bendro.yaml`, identical envelope shape to
  `/billing/checkout`.
- `tests/features/billing/portal.feature` (new): 6 scenarios (auth,
  NO_CUSTOMER, malformed URL, 503, happy, default returnUrl).
- `tests/features/billing/account.feature` (new): 8 scenarios
  (redirect, free CTA, premium portal button, past_due amber badge,
  upgrade banner visibility, portal click navigation, telemetry
  emission, portal-error surfacing).
- `tests/features/library/library.feature` +3: paywall decoration for
  free users, unlocked rows for premium users, locked-click lands on
  `/account?upgrade=1`.
- `tests/features/home/home.feature` +2: free-user CTA, premium-user
  CTA suppression.

Step bindings deferred to Phase 14 alongside all other Playwright wiring.

## Deferred / non-goals

- **Analytics backend.** `trackEvent` is a stub. Wiring to a real SaaS
  (PostHog / Segment / Mixpanel) is Phase 15+.
- **Subscription metadata.** `/account` shows plan status only, not the
  price tier, next-renewal date, or cancel-at-period-end flag. Would
  require either an extra Stripe Subscription fetch or persisting the
  fields on our users row. Deferred — Stripe's own customer portal
  already surfaces all of this, one click away via "Manage billing".
- **Decorate-on-API.** `GET /api/routines` still drops premium rows for
  free users (Phase 9 behaviour). The library page overrides via
  `premiumUnlocked: true`. If we ever expose the API publicly we'll
  flip the default, but for now the catalog filter is defence-in-depth
  for the handful of endpoints that don't decorate.
- **Checkout success confirmation page.** Stripe redirects to
  `NEXT_PUBLIC_APP_URL/settings/billing?checkout=success` today. A
  dedicated thank-you page is a Phase 13+ marketing concern.

## Quality gates

- `pnpm test -- --run` → 300 / 300 passing (25 files).
- `pnpm typecheck` → clean.
- No new external dependencies.
- No schema changes (Phase 9 already added `users.stripeCustomerId`
  and `stripe_webhook_events` ledger).
- No new feature flags.
- `.env.example`: unchanged. `STRIPE_SECRET_KEY` already required
  (Phase 9); portal reuses the same client.

## Security review

- `createCustomerPortalSession` sources `stripeCustomerId` from our DB,
  not from the request — attacker cannot open someone else's portal.
- `userId` comes from `auth()` — parallel to the Phase 9 / ADR-0005
  checkout invariant.
- `returnUrl` validated as `z.string().url()`; Stripe additionally
  validates it allowlist-side when the portal is configured.
- No new PII fields logged. `portal.opened` event carries only a
  static `source` label.
