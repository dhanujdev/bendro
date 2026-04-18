import { NextRequest } from "next/server"
import { z } from "zod"
import {
  RoutineSchema,
  CreateRoutineSchema,
  GoalSchema,
  IntensitySchema,
} from "@/types"
import { getRoutines, createRoutine } from "@/lib/data"

const ListQuerySchema = z.object({
  goal: GoalSchema.optional(),
  level: IntensitySchema.optional(),
  isPremium: z.coerce.boolean().optional(),
  maxDurationSec: z.coerce.number().int().positive().optional(),
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
  const { data, total } = await getRoutines(query.data)
  const validated = z.array(RoutineSchema).parse(data)

  return Response.json({ data: validated, total, limit, offset })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = CreateRoutineSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const routine = await createRoutine(parsed.data)
  const validated = RoutineSchema.parse(routine)

  return Response.json({ data: validated }, { status: 201 })
}
