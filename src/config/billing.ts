/**
 * Billing configuration — the single place price / product IDs live in
 * source. The Stripe service is the ONLY file allowed to import `stripe`
 * (parallel to the `next-auth`-only-in-`src/lib/auth.ts` rule), but the
 * price catalog is plain config and lives here so UI code can show plan
 * names without pulling in the Stripe SDK.
 *
 * Checkout endpoints validate the incoming `priceId` against this
 * allowlist so clients cannot spin up a checkout with an arbitrary
 * Stripe price (defense-in-depth even though `STRIPE_SECRET_KEY` only
 * exposes *your* prices).
 */

export type BillingPlanId = "premium_monthly" | "premium_annual"

export interface BillingPlan {
  id: BillingPlanId
  label: string
  /**
   * Resolved at runtime from env because the same code path ships to
   * dev (test-mode prices), staging (test-mode with separate prices),
   * and prod (live-mode). Returns `undefined` in dev when the env isn't
   * set — the checkout route rejects with `CHECKOUT_UNAVAILABLE`.
   */
  priceId: string | undefined
  intervalMonths: 1 | 12
}

export function getBillingPlans(): Record<BillingPlanId, BillingPlan> {
  return {
    premium_monthly: {
      id: "premium_monthly",
      label: "Premium (monthly)",
      priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
      intervalMonths: 1,
    },
    premium_annual: {
      id: "premium_annual",
      label: "Premium (annual)",
      priceId: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
      intervalMonths: 12,
    },
  }
}

/**
 * Given a user-supplied priceId, confirm it matches a configured plan
 * and return the plan descriptor. Returns `null` if the priceId is
 * unknown or unconfigured.
 */
export function resolvePlanByPriceId(priceId: string): BillingPlan | null {
  const plans = getBillingPlans()
  for (const plan of Object.values(plans)) {
    if (plan.priceId && plan.priceId === priceId) return plan
  }
  return null
}
