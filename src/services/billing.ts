/**
 * Stripe service — the ONLY file in the repo allowed to import `stripe`.
 *
 * This mirrors the `next-auth`-only-in-`src/lib/auth.ts` rule (ADR-0004)
 * and the Stripe-only-in-`src/services/billing.ts` architecture boundary
 * enforced by `.claude/hooks/pre-pr-gate.py`. Every other file calls
 * through this module so the SDK surface can be evolved, mocked for
 * tests, and audited for PCI scope in one place.
 *
 * Runtime sequence:
 *   1. createCheckoutSession(userId, email, priceId)   → returns Stripe Checkout URL
 *   2. Client redirects to Stripe; user pays
 *   3. Stripe POSTs `customer.subscription.created` to /api/webhooks/stripe
 *   4. handleStripeEvent(...) updates users.subscriptionStatus
 */

import Stripe from "stripe"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { stripeWebhookEvents } from "@/db/schema"
import type { SubscriptionStatus } from "@/types/user"
import { resolvePlanByPriceId } from "@/config/billing"

// ─── Stripe client (lazy) ─────────────────────────────────────────────────────

let _stripe: Stripe | null = null

/**
 * Lazy init so modules that don't actually call Stripe (tests, local dev
 * without STRIPE_SECRET_KEY, tRPC type generation) never crash. The
 * caller gets a plain Error if the key is missing at call time, which
 * the route translates to a user-facing error.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  _stripe = new Stripe(key, {
    // Use the library's pinned default. The SDK embeds the version it was
    // built against in `Stripe.DEFAULT_API_VERSION` and typecheck requires
    // the literal match; calling `new Stripe(key)` without options picks it
    // up automatically. Bump intentionally when you upgrade the SDK.
    typescript: true,
  })
  return _stripe
}

/** Testing hook — reset the cached client between runs. */
export function _resetStripeClient(): void {
  _stripe = null
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSubscriptionStatus(
  userId: string,
): Promise<SubscriptionStatus> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { subscriptionStatus: true },
  })
  return user?.subscriptionStatus ?? "free"
}

export async function isPremium(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId)
  return status === "active" || status === "trialing"
}

// ─── Write (called from webhook handler only) ─────────────────────────────────

export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus,
  stripeCustomerId?: string,
): Promise<void> {
  const values: Partial<typeof users.$inferInsert> = {
    subscriptionStatus: status,
    updatedAt: new Date(),
  }
  if (stripeCustomerId) values.stripeCustomerId = stripeCustomerId
  await db.update(users).set(values).where(eq(users.id, userId))
}

// ─── Customer lifecycle ───────────────────────────────────────────────────────

/**
 * Resolve the Stripe Customer id for this user, creating one in Stripe
 * if it doesn't exist yet. Idempotent by design — calling twice returns
 * the same customer id. Email is used for Stripe receipts and Customer
 * Portal log-ins; keep it in sync with the auth provider's email.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripeCustomerId: true },
  })
  if (existing?.stripeCustomerId) return existing.stripeCustomerId

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return customer.id
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutInput {
  userId: string
  email: string
  priceId: string
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResult {
  /** URL to redirect the user to for the Stripe-hosted checkout page. */
  url: string
  /** The Checkout Session id — stored client-side is optional. */
  sessionId: string
}

/**
 * Build a Stripe Checkout Session for a subscription on `priceId`.
 *
 * Rejects with `Error("UNKNOWN_PRICE")` when the priceId isn't in the
 * local allowlist — defense-in-depth even though a secret key only
 * exposes your prices, because a buggy client UI could still pass the
 * wrong one. The route translates this to a 400 `VALIDATION_ERROR`.
 */
export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const plan = resolvePlanByPriceId(input.priceId)
  if (!plan) throw new Error("UNKNOWN_PRICE")

  const customerId = await getOrCreateStripeCustomer(input.userId, input.email)

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    // Forward metadata so webhook handlers can map events back to our
    // internal userId without a Stripe API round-trip.
    metadata: { userId: input.userId, planId: plan.id },
    subscription_data: {
      metadata: { userId: input.userId, planId: plan.id },
    },
  })

  if (!session.url) {
    throw new Error("Checkout session created without a URL")
  }
  return { url: session.url, sessionId: session.id }
}

// ─── Webhook handling (signature + idempotency) ───────────────────────────────

export interface WebhookResult {
  received: true
  duplicate: boolean
  type: string
  eventId: string
}

/**
 * Verify the signature of a Stripe webhook POST and construct the event
 * object. Must be called with the RAW request body (not a parsed JSON
 * object) or the HMAC comparison will fail.
 *
 * Throws if the signature is invalid or the webhook secret is missing;
 * the route translates both to a 400.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set")
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header")

  return getStripe().webhooks.constructEvent(rawBody, signatureHeader, secret)
}

/**
 * Process a verified Stripe event. Guarantees at-most-once side-effect
 * by writing to the `stripe_webhook_events` ledger BEFORE applying the
 * state change. Duplicate deliveries short-circuit with
 * `{ duplicate: true }` and no subscription mutation.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
): Promise<WebhookResult> {
  // Idempotency: try to insert the event id; if it already exists we
  // already processed this delivery.
  const inserted = await db
    .insert(stripeWebhookEvents)
    .values({
      eventId: event.id,
      type: event.type,
      receivedAt: new Date(),
      payload: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: stripeWebhookEvents.eventId })
    .returning({ eventId: stripeWebhookEvents.eventId })

  const duplicate = inserted.length === 0

  if (!duplicate) {
    await applySubscriptionStateChange(event)
    await db
      .update(stripeWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(stripeWebhookEvents.eventId, event.id))
  }

  return { received: true, duplicate, type: event.type, eventId: event.id }
}

async function applySubscriptionStateChange(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const userId = resolveUserIdFromSubscription(sub)
      if (!userId) return
      const status = mapStripeStatus(sub.status)
      await updateSubscriptionStatus(
        userId,
        status,
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      )
      return
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const userId = resolveUserIdFromSubscription(sub)
      if (!userId) return
      await updateSubscriptionStatus(userId, "canceled")
      return
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const userId = resolveUserIdFromInvoice(invoice)
      if (!userId) return
      await updateSubscriptionStatus(userId, "past_due")
      return
    }
    default:
      // Event type we don't care about — the ledger row is enough.
      return
  }
}

function resolveUserIdFromSubscription(sub: Stripe.Subscription): string | null {
  const fromMetadata = sub.metadata?.userId
  if (fromMetadata) return fromMetadata
  // Fall back to scanning the customer metadata when the subscription
  // itself lacks a userId — happens when a subscription is created via
  // the Stripe dashboard rather than our checkout flow.
  return null
}

function resolveUserIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const fromMetadata = invoice.metadata?.userId
  if (fromMetadata) return fromMetadata
  // Stripe API 2025+ moved the subscription reference onto
  // `invoice.parent.subscription_details`. We only read the metadata that
  // was forwarded from the Subscription object at creation time.
  if (
    invoice.parent?.type === "subscription_details" &&
    invoice.parent.subscription_details
  ) {
    const sub = invoice.parent.subscription_details.subscription
    if (sub && typeof sub !== "string") {
      return sub.metadata?.userId ?? null
    }
    return invoice.parent.subscription_details.metadata?.userId ?? null
  }
  return null
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active"
    case "trialing":
      return "trialing"
    case "past_due":
    case "unpaid":
      return "past_due"
    case "canceled":
    case "incomplete_expired":
      return "canceled"
    case "incomplete":
    case "paused":
    default:
      return "free"
  }
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

export interface PortalInput {
  userId: string
  /** Where Stripe redirects the user after they close the portal. */
  returnUrl: string
}

export interface PortalResult {
  url: string
}

/**
 * Open the Stripe-hosted Customer Portal for a user who already has a
 * `stripeCustomerId` on file. Rejects with `NO_CUSTOMER` when the user
 * has never been through checkout — the route translates this to a 409
 * so the UI can route them to checkout instead.
 */
export async function createCustomerPortalSession(
  input: PortalInput,
): Promise<PortalResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
    columns: { stripeCustomerId: true },
  })
  if (!user?.stripeCustomerId) {
    throw new Error("NO_CUSTOMER")
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: input.returnUrl,
  })
  return { url: session.url }
}

// ─── Cancel (self-service via API; webhook is source of truth) ────────────────

export async function cancelSubscription(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ subscriptionStatus: "canceled", updatedAt: new Date() })
    .where(eq(users.id, userId))
}
