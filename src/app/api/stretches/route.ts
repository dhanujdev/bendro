import { NextRequest } from "next/server"
import { z } from "zod"
import { StretchSchema, BodyAreaSchema, IntensitySchema } from "@/types"
import { MOCK_STRETCHES } from "@/lib/mock-data"

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
    return Response.json(
      { error: "Invalid query parameters", issues: query.error.issues },
      { status: 400 },
    )
  }

  const { bodyArea, intensity, limit, offset } = query.data

  let stretches = [...MOCK_STRETCHES]
  if (bodyArea !== undefined)
    stretches = stretches.filter((s) => s.bodyAreas.includes(bodyArea))
  if (intensity !== undefined)
    stretches = stretches.filter((s) => s.intensity === intensity)

  const total = stretches.length
  const page = stretches.slice(offset, offset + limit)
  const validated = z.array(StretchSchema).parse(page)

  return Response.json({ data: validated, total, limit, offset })
}
