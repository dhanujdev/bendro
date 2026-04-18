import { SessionSchema, StartSessionBodySchema } from "@/types"
import { startSession } from "@/lib/data"
import { auth } from "@/lib/auth"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse(
      ERROR_CODES.UNAUTHENTICATED,
      "Sign in to start a session",
    )
  }

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = StartSessionBodySchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const started = await startSession({
    userId: session.user.id,
    routineId: parsed.data.routineId,
  })
  const validated = SessionSchema.parse(started)
  return jsonResponse({ data: validated }, { status: 201 })
}
