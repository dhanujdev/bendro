import { SessionSchema, StartSessionSchema } from "@/types"
import { startSession } from "@/lib/data"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = StartSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const session = await startSession(parsed.data)
  const validated = SessionSchema.parse(session)
  return Response.json({ data: validated }, { status: 201 })
}
