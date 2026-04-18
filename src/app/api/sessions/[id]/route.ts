import { SessionSchema, UpdateSessionSchema } from "@/types"
import { updateMockSession } from "@/lib/mock-data"

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = UpdateSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 })
  }

  const session = updateMockSession(id, parsed.data)
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 })
  }

  const validated = SessionSchema.parse(session)
  return Response.json({ data: validated })
}
