import { NextRequest } from "next/server"
import { z } from "zod"
import { StretchSchema, BodyAreaSchema, IntensitySchema } from "@/types"
import { listStretches } from "@/lib/data"
import { ERROR_CODES, errorResponse, jsonResponse } from "@/lib/http"

const ListQuerySchema = z.object({
  bodyArea: BodyAreaSchema.optional(),
  intensity: IntensitySchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export async function GET(request: NextRequest) {
  const query = ListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )
  if (!query.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid query parameters", {
      details: query.error.issues,
    })
  }

  const { limit, offset } = query.data
  const { data, total } = await listStretches(query.data)
  const validated = z.array(StretchSchema).parse(data)

  return jsonResponse({ data: validated, total, limit, offset })
}
