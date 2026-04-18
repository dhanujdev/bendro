import { z } from "zod"
import { SessionSchema, PainFeedbackSchema } from "@/types"
import { getSessionById, getUserProfile, updateSession } from "@/lib/data"
import { auth } from "@/lib/auth"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"

const UpdateSessionBodySchema = z.object({
  durationDoneSec: z.number().int().nonnegative().optional(),
  completionPct: z.number().min(0).max(100).optional(),
  skippedStretchIds: z.array(z.string().uuid()).optional(),
  painFeedback: PainFeedbackSchema.optional(),
  completed: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return errorResponse(
      ERROR_CODES.UNAUTHENTICATED,
      "Sign in to update a session",
    )
  }

  const { id } = await ctx.params

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = UpdateSessionBodySchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const existing = await getSessionById(id)
  // Return NOT_FOUND both when the session doesn't exist AND when it belongs
  // to another user — avoids leaking whether a session id is valid.
  // (SECURITY_RULES.md §Authorization: cross-tenant access returns 404.)
  if (!existing || existing.userId !== authSession.user.id) {
    return errorResponse(ERROR_CODES.NOT_FOUND, "Session not found")
  }

  // Completed sessions are immutable. Reject any further PATCH to prevent
  // the client from re-triggering streak logic or overwriting completion
  // metadata after the session closed. (Phase 8 completion semantics.)
  if (existing.completedAt !== null) {
    return errorResponse(
      ERROR_CODES.CONFLICT,
      "Session already completed",
    )
  }

  // On completion, fetch the user's timezone so streak rollover happens on
  // the user's local calendar date. Non-completion PATCHes don't touch
  // streaks, so skip the profile round-trip.
  const timezone = parsed.data.completed
    ? (await getUserProfile(authSession.user.id)).timezone
    : undefined

  const updated = await updateSession(id, parsed.data, { timezone })
  if (!updated) {
    return errorResponse(ERROR_CODES.NOT_FOUND, "Session not found")
  }

  const validated = SessionSchema.parse(updated)
  return jsonResponse({ data: validated })
}
