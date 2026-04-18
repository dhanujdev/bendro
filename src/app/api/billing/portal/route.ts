import { z } from "zod"
import { auth } from "@/lib/auth"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"
import { createCustomerPortalSession } from "@/services/billing"

const PortalRequestSchema = z.object({
  returnUrl: z.string().url().optional(),
})

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe-hosted Customer Portal session for the authed user
 * and returns the URL. The client redirects the browser to that URL;
 * Stripe sends the user back to `returnUrl` (default: /account) once
 * they're done managing their subscription.
 *
 * Errors:
 *  - 401 UNAUTHENTICATED   no session
 *  - 400 VALIDATION_ERROR  malformed returnUrl
 *  - 409 CONFLICT          user has never checked out (no stripeCustomerId)
 *  - 503 INTERNAL          Stripe misconfigured (no secret key)
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse(
      ERROR_CODES.UNAUTHENTICATED,
      "Sign in to open the billing portal",
    )
  }

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = PortalRequestSchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const returnUrl = parsed.data.returnUrl ?? `${origin}/account`

  try {
    const result = await createCustomerPortalSession({
      userId: session.user.id,
      returnUrl,
    })
    return jsonResponse({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === "NO_CUSTOMER") {
      return errorResponse(
        ERROR_CODES.CONFLICT,
        "No billing profile on file — start a subscription first",
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
