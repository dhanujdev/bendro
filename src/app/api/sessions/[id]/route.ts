import { z } from "zod"
import { SessionSchema, PainFeedbackSchema } from "@/types"
import { updateSession } from "@/lib/data"
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
  const { id } = await ctx.params

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = UpdateSessionBodySchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const session = await updateSession(id, parsed.data)
  if (!session) {
    return errorResponse(ERROR_CODES.NOT_FOUND, "Session not found")
  }

  const validated = SessionSchema.parse(session)
  return jsonResponse({ data: validated })
}
