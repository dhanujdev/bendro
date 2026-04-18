import { NextRequest } from "next/server"
import { z } from "zod"
import {
  RoutineSchema,
  CreateRoutineSchema,
  GoalSchema,
  IntensitySchema,
  BodyAreaSchema,
} from "@/types"
import { getRoutines, createRoutine } from "@/lib/data"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"

const DurationBucketSchema = z.enum(["short", "medium", "long"])

const BoolStringSchema = z
  .enum(["true", "false"])
  .transform((v) => v === "true")

const ListQuerySchema = z.object({
  goal: GoalSchema.optional(),
  level: IntensitySchema.optional(),
  isPremium: BoolStringSchema.optional(),
  maxDurationSec: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  bodyArea: BodyAreaSchema.optional(),
  avoidBodyArea: BodyAreaSchema.optional(),
  durationBucket: DurationBucketSchema.optional(),
  safetyFlag: BoolStringSchema.optional(),
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

  const { limit, offset, bodyArea, avoidBodyArea, ...rest } = query.data
  const { data, total } = await getRoutines({
    ...rest,
    limit,
    offset,
    bodyAreas: bodyArea ? [bodyArea] : undefined,
    avoidBodyAreas: avoidBodyArea ? [avoidBodyArea] : undefined,
  })
  const validated = z.array(RoutineSchema).parse(data)

  return jsonResponse({ data: validated, total, limit, offset })
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = CreateRoutineSchema.safeParse(body.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details: parsed.error.issues,
    })
  }

  const routine = await createRoutine(parsed.data)
  const validated = RoutineSchema.parse(routine)

  return jsonResponse({ data: validated }, { status: 201 })
}
