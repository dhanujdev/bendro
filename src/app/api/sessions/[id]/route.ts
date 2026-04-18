import { z } from "zod"
import { SessionSchema, PainFeedbackSchema } from "@/types"
import { updateSession } from "@/lib/data"

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = UpdateSessionBodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const session = await updateSession(id, parsed.data)
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 })
  }

  const validated = SessionSchema.parse(session)
  return Response.json({ data: validated })
}
