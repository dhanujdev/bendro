import { NextRequest } from "next/server"
import { z } from "zod"
import { StretchSchema, BodyAreaSchema, IntensitySchema } from "@/types"
import { listStretches } from "@/lib/data"

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

  const { limit, offset } = query.data
  const { data, total } = await listStretches(query.data)
  const validated = z.array(StretchSchema).parse(data)

  return Response.json({ data: validated, total, limit, offset })
}
