import { ERROR_CODES, errorResponse, jsonResponse } from "@/lib/http"
import { handleStripeEvent, verifyWebhookSignature } from "@/services/billing"

/**
 * POST /api/webhooks/stripe
 *
 * Receives signed webhook deliveries from Stripe. The signature HMAC is
 * computed over the raw request body, so we MUST read the body as text
 * and never call `request.json()` first — Next's App Router gives us the
 * raw body via `request.text()` as long as the route is marked dynamic.
 *
 * Idempotency guard is inside `handleStripeEvent()` — the event id is
 * inserted into `stripe_webhook_events` via `onConflictDoNothing`, so
 * duplicate deliveries short-circuit without mutating subscription state.
 */

// Stripe replays webhook deliveries on failure, so we must refuse any
// build-time caching and run this handler on every request.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  let event
  try {
    event = verifyWebhookSignature(rawBody, signature)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature"
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, message)
  }

  try {
    const result = await handleStripeEvent(event)
    return jsonResponse(result)
  } catch (err) {
    // Log and surface 500 so Stripe retries. Never leak error internals
    // to the webhook response body — Stripe echoes response text to their
    // dashboard, not the end user.
    console.error("[stripe-webhook] failed to process event", {
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(ERROR_CODES.INTERNAL, "Failed to process webhook")
  }
}
