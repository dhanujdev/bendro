import { NextRequest } from "next/server"
import { z } from "zod"
import { RoutineListQuerySchema, CreateRoutineSchema, RoutineSchema } from "@/types"
import { MOCK_ROUTINES } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = RoutineListQuerySchema.safeParse(Object.fromEntries(searchParams))

  if (!query.success) {
    return Response.json({ error: "Invalid query parameters", issues: query.error.issues }, { status: 400 })
  }

  const { goal, level, maxDuration, isSystem, limit, offset } = query.data

  let routines = [...MOCK_ROUTINES]

  if (goal !== undefined) routines = routines.filter((r) => r.goal === goal)
  if (level !== undefined) routines = routines.filter((r) => r.level === level)
  if (maxDuration !== undefined) routines = routines.filter((r) => r.durationMinutes <= maxDuration)
  if (isSystem !== undefined) routines = routines.filter((r) => r.isSystem === isSystem)

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
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 })
  }

  const now = new Date().toISOString()
  const newRoutine = RoutineSchema.parse({
    id: `routine-custom-${Date.now()}`,
    name: parsed.data.name,
    description: parsed.data.description,
    goal: parsed.data.goal,
    level: parsed.data.level,
    durationMinutes: Math.ceil((parsed.data.stretchIds.length * 45) / 60),
    stretchCount: parsed.data.stretchIds.length,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
    tags: parsed.data.tags,
  })

  return Response.json({ data: newRoutine }, { status: 201 })
}
