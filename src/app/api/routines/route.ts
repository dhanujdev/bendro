import { NextRequest } from "next/server"
import { z } from "zod"
import {
  RoutineSchema,
  CreateRoutineSchema,
  GoalSchema,
  IntensitySchema,
} from "@/types"
import { MOCK_ROUTINES } from "@/lib/mock-data"

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

  const { goal, level, isPremium, maxDurationSec, limit, offset } = query.data

  let routines = [...MOCK_ROUTINES]
  if (goal !== undefined) routines = routines.filter((r) => r.goal === goal)
  if (level !== undefined) routines = routines.filter((r) => r.level === level)
  if (isPremium !== undefined)
    routines = routines.filter((r) => r.isPremium === isPremium)
  if (maxDurationSec !== undefined)
    routines = routines.filter((r) => r.totalDurationSec <= maxDurationSec)

  const total = routines.length
  const page = routines.slice(offset, offset + limit)
  const validated = z.array(RoutineSchema).parse(page)

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

  // Mock-mode: fabricate an id and timestamps. In DB-mode this would call
  // `createRoutine(parsed.data)` from `@/services/routines`.
  const now = new Date()
  const routine = RoutineSchema.parse({
    ...parsed.data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  })

  return Response.json({ data: routine }, { status: 201 })
}
