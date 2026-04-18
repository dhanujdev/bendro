import { auth } from "@/lib/auth"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"
import { CreateCheckoutSessionBodySchema } from "@/types"
import { createCheckoutSession } from "@/services/billing"

/**
 * POST /api/billing/checkout
 *
 * Starts a Stripe Checkout Session for the authed user. The caller submits
 * a Stripe `priceId`; we validate it against the server-side allowlist in
 * `src/config/billing.ts` before handing it to Stripe so a buggy client
 * cannot redirect a user into an unrelated checkout.
 *
 * Errors:
 *  - 401 UNAUTHENTICATED              no session
 *  - 400 VALIDATION_ERROR             missing/malformed body
 *  - 400 VALIDATION_ERROR/UNKNOWN_PRICE  priceId not in allowlist
 *  - 503 INTERNAL                     Stripe misconfigured (no secret key)
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return errorResponse(
      ERROR_CODES.UNAUTHENTICATED,
      "Sign in to start checkout",
    )
  }

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = CreateCheckoutSessionBodySchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const successUrl =
    parsed.data.successUrl ?? `${origin}/settings/billing?checkout=success`
  const cancelUrl =
    parsed.data.cancelUrl ?? `${origin}/settings/billing?checkout=cancel`

  try {
    const result = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId: parsed.data.priceId,
      successUrl,
      cancelUrl,
    })
    return jsonResponse({ data: result }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === "UNKNOWN_PRICE") {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Unknown priceId — not in the configured plan allowlist",
      )
    }
    if (message.includes("STRIPE_SECRET_KEY")) {
      return errorResponse(
        ERROR_CODES.INTERNAL,
        "Billing is not configured on this environment",
        { status: 503 },
      )
    }
    throw err
  }
}
