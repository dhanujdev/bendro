# Phase 9 — Billing (Stripe) (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1 (continuation of the Phase-8 session)
**Lead:** security-lead + backend-lead

## Delivered

1. **`stripe` SDK wrapper** at `src/services/billing.ts` — the ONLY file
   in the repo that `import`s `stripe`. Parallel to ADR-0004's
   `next-auth`-only-in-`src/lib/auth.ts` rule. Lazy client init guarded
   by `STRIPE_SECRET_KEY`; absent key throws a plain Error that the
   route maps to `503 INTERNAL`, so `pnpm dev` and `pnpm test` never
   crash at boot. Exports: `getStripe`, `_resetStripeClient` (tests),
   `getSubscriptionStatus`, `isPremium`, `updateSubscriptionStatus`,
   `getOrCreateStripeCustomer`, `createCheckoutSession`,
   `verifyWebhookSignature`, `handleStripeEvent`, `cancelSubscription`.

2. **Price / plan catalog** at `src/config/billing.ts`. `getBillingPlans()`
   returns a `Record<BillingPlanId, BillingPlan>` with priceIds resolved
   at runtime from env (`STRIPE_PREMIUM_PRICE_ID`,
   `STRIPE_PREMIUM_ANNUAL_PRICE_ID`). `resolvePlanByPriceId(priceId)` is
   the server-side allowlist check — `createCheckoutSession()` throws
   `UNKNOWN_PRICE` if the caller passes an unconfigured price. Closes
   the attack surface where a buggy client could redirect a user into
   an unrelated checkout.

3. **`stripe_webhook_events` idempotency ledger.** New Drizzle table +
   migration (`src/db/migrations/0002_lively_arachne.sql`). Columns:
   `event_id text PK`, `type`, `received_at`, `processed_at (nullable)`,
   `payload jsonb`. Webhook handler uses
   `.onConflictDoNothing({ target: eventId })` — zero rows returned
   means duplicate delivery, short-circuit with no state mutation.

4. **`POST /api/billing/checkout`** at
   `src/app/api/billing/checkout/route.ts`. Gates on `auth()`; rejects
   with `UNAUTHENTICATED` when the viewer is signed out. Validates the
   request body with `CreateCheckoutSessionBodySchema`. The `userId`
   and `email` passed into `createCheckoutSession` come from the
   session, NEVER from the request body (matches Phase-3 invariant).
   Default success/cancel URLs derived from `NEXT_PUBLIC_APP_URL` when
   caller omits them. Maps `UNKNOWN_PRICE` → 400 VALIDATION_ERROR and
   `STRIPE_SECRET_KEY` missing → 503 INTERNAL.

5. **`POST /api/webhooks/stripe`** at
   `src/app/api/webhooks/stripe/route.ts`. `runtime = "nodejs"` +
   `dynamic = "force-dynamic"` so the raw body is preserved for HMAC
   verification (if Next parsed JSON before us, the signature would
   fail). Reads `request.text()` (not `.json()`), calls
   `verifyWebhookSignature(rawBody, signatureHeader)`, then
   `handleStripeEvent()`. Handler exceptions return 500 so Stripe
   retries. Signature failures return 400 with `VALIDATION_ERROR`.

6. **Subscription state machine in `applySubscriptionStateChange()`.**
   - `customer.subscription.created|updated` → `mapStripeStatus(sub.status)`
     + persist `stripeCustomerId`
   - `customer.subscription.deleted` → `subscriptionStatus = "canceled"`
   - `invoice.payment_failed` → `subscriptionStatus = "past_due"`
   - Unknown event types recorded in ledger, no side effect
   `mapStripeStatus()` collapses Stripe's 8-state enum down to our
   5-state `SubscriptionStatus`.

7. **Premium-routine gate** in the catalog query. `GET /api/routines`
   now calls `isPremium(userId)` and passes `premiumUnlocked` into
   `getRoutines()`. The adapter drops rows with `isPremium=true` for
   unauthenticated or non-active viewers. Signed-out visitors and free
   users never see premium rows. Chose "hide entirely" over
   "paywall-visible" for MVP — library reflects what the user can
   actually start. Phase 10 can layer paywall UX without schema
   changes.

8. **Zod schemas** for checkout request/response in
   `src/types/user.ts`: `CreateCheckoutSessionBodySchema`,
   `CreateCheckoutSessionResponseSchema`.

9. **Env validation extended** — `src/config/env.ts` adds
   `STRIPE_PREMIUM_ANNUAL_PRICE_ID` as optional. In prod, the original
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PREMIUM_PRICE_ID` are required (boot fails if absent); in
   dev all billing env is optional.

10. **Unit tests rewritten** in `tests/unit/billing.test.ts` (27
    assertions). Covers subscription status reads, premium mapping,
    `getOrCreateStripeCustomer` (existing/new/missing-user/STRIPE_SECRET_KEY-unset),
    `createCheckoutSession` (happy path, UNKNOWN_PRICE, missing URL),
    webhook signature verification (happy / missing header /
    missing secret), `handleStripeEvent` idempotency (duplicate /
    first / payment_failed / deleted / unknown-type), and
    `cancelSubscription`. `vi.mock("stripe")` returns a constructor
    shim so `new Stripe(...)` works without real HTTP.

11. **Integration tests** — two new files:
    - `tests/integration/api/billing-checkout.test.ts` (7 scenarios):
      401 unauth, 400 invalid JSON, 400 validation error, 400
      UNKNOWN_PRICE, 503 misconfigured, 201 happy path, default
      success/cancel URLs, userId/email spoofing ignored.
    - `tests/integration/api/billing-webhook.test.ts` (5 scenarios):
      400 bad signature, raw-body forwarded to verify, 200 happy
      path, 200 duplicate=true, 500 on handler exception.
    - `tests/integration/api/routines.test.ts` updated to mock
      `@/lib/auth` + `@/services/billing` since the routes route now
      calls both to evaluate the premium gate.

12. **BDD feature files** — three new specs in
    `tests/features/billing/`:
    - `checkout.feature` (6 scenarios)
    - `webhook.feature` (8 scenarios)
    - `premium-gate.feature` (6 scenarios)
    Step bindings deferred to Phase 14 per `tests/features/README.md`.

13. **OpenAPI spec updates** at `docs/specs/openapi/v1/bendro.yaml`.
    Added `billing` tag + two new operations:
    - `createCheckoutSession` (POST `/billing/checkout`) with 201 / 400
      / 401 / 503 envelopes.
    - `stripeWebhook` (POST `/webhooks/stripe`) with 200 / 400 / 500
      envelopes. Note: `duplicate` boolean in the 200 response body
      signals de-duplication.

14. **ADR-0005** (`docs/ADR/ADR-0005-stripe-billing.md`). Locks in:
    single-SDK-importer rule, price allowlist, raw-body webhook
    verification, idempotency ledger, exactly-once via
    onConflictDoNothing, premium routine gating strategy. Documents
    four rejected alternatives (Payment Links, Stripe Elements,
    Paddle/MoR, polling) with rationale.

## Coverage

| Area | Lines | Target |
|---|---|---|
| `src/services/billing.ts` | 85.33% | ≥85% |
| `src/services/**` overall | 92.34% | ≥85% |
| Global lines | 77.75% | ≥70% |

Test suite: 19 files, 232 tests, all green.

## Exit Criteria — all met

- [x] `src/services/billing.ts` is the sole `stripe` importer
- [x] Checkout flow validates priceId against server-side allowlist
- [x] Webhook handler verifies HMAC signature before any state mutation
- [x] `stripe_webhook_events` ledger deduplicates by event id
- [x] All 4 subscription state transitions wired
      (created / updated / deleted / payment_failed)
- [x] Premium-routine gate hides `isPremium=true` from free users
- [x] Integration tests for checkout + webhook routes
- [x] BDD scaffolds for billing scenarios
- [x] ADR-0005 written and Accepted
- [x] OpenAPI spec updated
- [x] Drizzle migration generated

## Notes for follow-up phases

- **Phase 10 — Paywall UX.** Need a `/settings/billing` page with the
  Stripe Customer Portal deep-link for self-serve management, and a
  "Upgrade" CTA on premium routine cards (currently hidden). The
  billing service is ready; just UX left.
- **Phase 14 — Playwright.** The `pnpm stripe listen` flow is ready
  for local e2e tests. CI will need a separate Stripe test-mode
  account with Forwarded events.
- **Phase 15 — SDK boundary enforcement.** Add a `pre-pr-gate.py` rule
  that grep-blocks `import Stripe from "stripe"` outside
  `src/services/billing.ts`.
- **Retention.** The `stripe_webhook_events` table grows unboundedly.
  Add a nightly prune job when row count > 1M (years away at our
  expected scale).

## Next phase

**Phase 10 — Player polish** (frontend-lead). Final camera UX,
keyboard shortcuts, session completion animation, mobile layout pass.
