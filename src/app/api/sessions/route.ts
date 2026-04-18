import { SessionSchema, StartSessionSchema } from "@/types"
import { startSession } from "@/lib/data"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"

export async function POST(request: Request) {
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = StartSessionSchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const session = await startSession(parsed.data)
  const validated = SessionSchema.parse(session)
  return jsonResponse({ data: validated }, { status: 201 })
}
