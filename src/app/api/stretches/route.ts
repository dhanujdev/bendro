import { NextRequest } from "next/server"
import { z } from "zod"
import { StretchListQuerySchema, StretchSchema } from "@/types"
import { MOCK_STRETCHES } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = StretchListQuerySchema.safeParse(Object.fromEntries(searchParams))

  if (!query.success) {
    return Response.json({ error: "Invalid query parameters", issues: query.error.issues }, { status: 400 })
  }

  const { bodyArea, intensity, limit, offset } = query.data

  let stretches = [...MOCK_STRETCHES]

  if (bodyArea !== undefined) stretches = stretches.filter((s) => s.bodyArea === bodyArea)
  if (intensity !== undefined) stretches = stretches.filter((s) => s.intensity === intensity)

  const total = stretches.length
  const page = stretches.slice(offset, offset + limit)

  const validated = z.array(StretchSchema).parse(page)
  return Response.json({ data: validated, total, limit, offset })
}
