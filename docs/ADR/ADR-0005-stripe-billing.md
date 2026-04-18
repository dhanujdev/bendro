# ADR-0005: Stripe-Hosted Checkout + Signed Webhook Ledger for Billing

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** security-lead, backend-lead
**Context for:** Phase 9 and every subsequent feature that reads/writes `users.subscriptionStatus`
**Supersedes:** none
**Superseded by:** none

---

## Context

Phase 9 monetizes the product: free users should be able to upgrade to
premium, which unlocks `isPremium=true` routines in the catalog. We need a
billing integration that is:

1. **PCI-out-of-scope.** We must never see a card number. Stripe's hosted
   Checkout page keeps us at SAQ A.
2. **Source-of-truth authoritative.** The local `users.subscriptionStatus`
   must always reflect Stripe's view. Reconciliation happens via webhooks,
   not polling.
3. **Exactly-once.** Stripe guarantees at-least-once webhook delivery and
   retries for up to 3 days on 5xx responses. A duplicate delivery must
   not double-charge domain state.
4. **Non-spoofable.** A buggy client UI must not be able to redirect a
   user into a checkout for a price we never configured, and a spoofed
   POST to the webhook endpoint must not mutate subscription state.
5. **Mockable offline.** `pnpm dev` and `pnpm test` must work without any
   Stripe account or network access. Missing env = feature degrades
   gracefully, not a crash-at-boot.

The same constraint shape we hit in Phase 3 for `next-auth` (one file owns
the SDK) and in Phase 5 for the data adapter (one file switches between
mock and DB) applies here.

---

## Decision

Adopt Stripe Checkout (hosted redirect) with signed, deduplicated webhook
reconciliation. Specifically:

### Stripe SDK boundary

- `src/services/billing.ts` is the **only** file in the repo allowed to
  `import Stripe from "stripe"`. Parallel to ADR-0004's
  `next-auth`-only-in-`src/lib/auth.ts` rule.
- The client is constructed lazily on first call (`getStripe()`),
  guarded by `STRIPE_SECRET_KEY`. Missing key throws a plain `Error`
  that the route translates to `503 INTERNAL`. Nothing crashes at boot.
- `_resetStripeClient()` is exported for tests — not used in production.

### Price / plan catalog

- `src/config/billing.ts` exports `getBillingPlans()` returning a
  `Record<BillingPlanId, BillingPlan>` with priceIds resolved from env at
  runtime (`STRIPE_PREMIUM_PRICE_ID`, `STRIPE_PREMIUM_ANNUAL_PRICE_ID`).
- `resolvePlanByPriceId(priceId)` is the server-side allowlist
  check. `createCheckoutSession()` throws `UNKNOWN_PRICE` when the
  caller passes a priceId not in the catalog. The checkout route maps
  that to `400 VALIDATION_ERROR`.
- This closes the attack surface where a buggy client could redirect a
  user into a checkout for an arbitrary Stripe price. Defense-in-depth
  even though `STRIPE_SECRET_KEY` only exposes *our* prices.

### Checkout flow

```
Client: POST /api/billing/checkout { priceId }
  → route validates session + body
  → billing.createCheckoutSession({ userId, email, priceId, successUrl, cancelUrl })
       → resolvePlanByPriceId (allowlist)
       → getOrCreateStripeCustomer (idempotent)
       → stripe.checkout.sessions.create
  → 201 { data: { url, sessionId } }
Client redirects window.location → Stripe-hosted Checkout
User pays on Stripe; Stripe redirects back to successUrl
Stripe POSTs customer.subscription.created → /api/webhooks/stripe
```

The `userId` in every Stripe call comes from `auth()`, never from the
request body. `client_reference_id` and both `metadata` (session +
subscription) are populated so the webhook handler can map events back
to our internal `users.id` without a Stripe API round-trip.

### Webhook flow (idempotency ledger)

- `POST /api/webhooks/stripe` reads the **raw** body via `request.text()`.
  `export const runtime = "nodejs"` and `export const dynamic =
  "force-dynamic"` so no caching or edge-runtime parsing corrupts the
  signature HMAC.
- `verifyWebhookSignature(rawBody, signatureHeader)` delegates to
  `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`.
  Bad/missing signature → `400 VALIDATION_ERROR`, no state mutation.
- `handleStripeEvent(event)` inserts the event id into
  `stripe_webhook_events` via `.onConflictDoNothing({ target: eventId })`.
  If the insert returned zero rows, the delivery is a duplicate — return
  `{ duplicate: true }` and skip state mutation. Otherwise apply the
  state change, then mark `processedAt`.
- Handled event types:
  - `customer.subscription.created|updated` → `subscriptionStatus =
    mapStripeStatus(sub.status)` + persist `stripeCustomerId`
  - `customer.subscription.deleted` → `subscriptionStatus = "canceled"`
  - `invoice.payment_failed` → `subscriptionStatus = "past_due"`
- Other event types are recorded in the ledger but have no side effect.
- Handler exceptions return `500 INTERNAL` so Stripe retries (Stripe
  retries on any non-2xx for up to 3 days).

### Schema

```sql
create table stripe_webhook_events (
  event_id     text primary key,
  type         text not null,
  received_at  timestamp not null default now(),
  processed_at timestamp,
  payload      jsonb not null
);
create index stripe_webhook_events_type_idx     on stripe_webhook_events(type);
create index stripe_webhook_events_received_idx on stripe_webhook_events(received_at);
```

The raw `payload` column is intentional — it gives us audit trail and
replay ability when debugging a malformed state transition.

### Premium-routine gate

`GET /api/routines` now resolves `viewerIsPremium = isPremium(userId)` and
passes `premiumUnlocked` into the data adapter. When `false`, routines
with `isPremium=true` are filtered out of the list entirely. We chose
**hide** over **paywall-visible** for MVP simplicity — the library
reflects what the user can actually start. Phase 10 can add paywall UX
without schema changes.

### Env layering

- Dev: `STRIPE_SECRET_KEY` optional. Absent → routes return
  `503 INTERNAL` with "billing not configured".
- Local e2e: developer runs `pnpm stripe listen`, sets `STRIPE_*` env
  against their Stripe test-mode account.
- Prod: all three keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PREMIUM_PRICE_ID`) are required — env validator throws at boot
  if missing.

---

## Alternatives Considered

### Alternative A — Payment Links

Stripe Payment Links skip the API entirely — paste a URL into your UI
and Stripe handles the rest. Rejected because: no server-side user
context (can't forward `userId` in metadata without query params that
leak to the user), no programmatic success/cancel URLs per-user, and
still need a webhook handler anyway for subscription state. Saves zero
meaningful code.

### Alternative B — Stripe Elements (embedded card)

Embed the card form with `@stripe/stripe-js`. Rejected because: pulls us
into PCI SAQ A-EP territory (your page loads Stripe.js, so CSP/integrity
monitoring required), and Checkout's hosted page already provides Apple
Pay / Google Pay / Link / local payment methods for free. Phase-9 value
is subscription state + gating, not checkout UX.

### Alternative C — Paddle / LemonSqueezy (merchant of record)

Handles global tax collection. Rejected for now: higher transaction fees,
smaller API surface, less ecosystem tooling. Stripe Tax is sufficient at
our scale; we can migrate to merchant-of-record when we cross the
revenue-per-jurisdiction threshold that forces VAT collection.

### Alternative D — Poll Stripe instead of webhooks

Nightly job fetches all active subscriptions and diffs against our DB.
Rejected because: minutes-to-hours of latency between Stripe's view and
ours means users can start a premium routine seconds after canceling, or
not start one seconds after paying. Webhooks are the only path to
seconds-level convergence.

### Alternative E — No idempotency ledger (rely on Stripe's dedup)

Stripe does NOT guarantee exactly-once delivery — their docs explicitly
warn you to dedupe by `event.id`. Rejected because it would make us
duplicate-vulnerable at the first network partition.

---

## Consequences

### Positive

- PCI scope minimized: we never handle card data.
- Subscription state is always reconciled from Stripe within seconds.
- Duplicate webhook deliveries are provably a no-op.
- Adding a new plan tier = one env var + one entry in
  `getBillingPlans()`. No code in the checkout or webhook paths.
- Premium-routine gate is a single boolean passed into the existing
  filter pipeline; it composes cleanly with goal/level/bodyArea filters.

### Negative

- One more external dependency to stub in tests (we stub `stripe` with
  a `vi.mock` factory returning a constructor shim).
- `stripe_webhook_events` is an append-only table that will grow
  unboundedly. We'll need a retention job (>30 days = pruned) when it
  crosses ~10M rows, but that's years away.
- Any change to Stripe's event envelope or API version requires a
  deliberate SDK bump and review — we pin via the SDK's default
  `Stripe.API_VERSION`, so a version bump will be visible in a diff.

### Risks

- **Webhook secret rotation.** Stripe supports multiple active secrets,
  but a naive rotation (overwrite the env without a dual-acceptance
  window) drops in-flight deliveries. Mitigation: document the rotation
  runbook; prefer Stripe's built-in dashboard-based rotation with a
  12-hour overlap.
- **Clock skew on signature validation.** Stripe's signature includes a
  timestamp with a default 5-minute tolerance. A very skewed clock on a
  serverless function could reject valid deliveries. Mitigation: Vercel
  instances have NTP-synced clocks; monitor 400 rate on the webhook.

---

## Invariants (locked in by this ADR)

1. `src/services/billing.ts` is the only file that `import`s `stripe`.
   Parallel to ADR-0004 for `next-auth`. Enforced by convention for
   now; a pre-PR hook can be added in Phase 15.
2. `userId` in billing flows comes from the session, never from a
   request body. Enforced by the checkout route + webhook handler.
3. `priceId` is validated against `resolvePlanByPriceId()` before any
   Stripe API call. Enforced by `createCheckoutSession()` itself.
4. Webhook handler uses the RAW body for signature verification. Never
   call `request.json()` before `verifyWebhookSignature()`.
5. Every webhook delivery is recorded in `stripe_webhook_events`, even
   the ones we ignore. This gives us an auditable chain of custody.
6. `users.stripeCustomerId` is set exactly once per user — either by
   `getOrCreateStripeCustomer()` at checkout, or by a webhook handler
   if a subscription is created via the Stripe dashboard.

---

## Follow-ups

- **Phase 10 — Paywall UX.** Add a `/settings/billing` page with
  subscription status + Stripe Customer Portal deep-link for self-serve
  management. Out-of-scope for Phase 9.
- **Phase 14 — Playwright e2e.** Drive the full checkout redirect flow
  via `pnpm stripe listen` in CI.
- **Phase 15 — Architectural enforcement.** Add a `pre-pr-gate.py` rule
  that blocks any `import Stripe from "stripe"` outside
  `src/services/billing.ts`.
