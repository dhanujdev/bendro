import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getUserProfile, updateUserProfile } from "@/lib/data"
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http"
import { BodyAreaSchema } from "@/types/stretch"
import { GoalSchema } from "@/types/routine"

const PreExistingConditionsSchema = z
  .object({
    recentInjury: z.boolean(),
    recentSurgery: z.boolean(),
    jointOrSpineCondition: z.boolean(),
    pregnancy: z.boolean(),
  })
  .strict()

export type PreExistingConditions = z.infer<typeof PreExistingConditionsSchema>

const UpdateProfileSchema = z
  .object({
    goals: z.array(GoalSchema).max(7).optional(),
    focusAreas: z.array(BodyAreaSchema).max(13).optional(),
    avoidAreas: z.array(BodyAreaSchema).max(13).optional(),
    reminderTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    timezone: z.string().min(1).max(64).optional(),
    conditions: PreExistingConditionsSchema.optional(),
    markOnboarded: z.boolean().optional(),
  })
  .strict()

const ProfileResponseSchema = z.object({
  userId: z.string(),
  goals: z.array(GoalSchema),
  focusAreas: z.array(z.string()),
  avoidAreas: z.array(z.string()),
  safetyFlag: z.boolean(),
  reminderTime: z.string().nullable(),
  timezone: z.string(),
  onboardedAt: z.coerce.date().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse(ERROR_CODES.UNAUTHENTICATED, "Sign in to read profile")
  }
  const profile = await getUserProfile(session.user.id)
  const payload = ProfileResponseSchema.parse(profile)
  return jsonResponse({ data: payload })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse(
      ERROR_CODES.UNAUTHENTICATED,
      "Sign in to update profile",
    )
  }

  const parsedBody = await readJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = UpdateProfileSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid profile patch", {
      details: parsed.error.issues,
    })
  }

  const { conditions, ...rest } = parsed.data

  const patch = { ...rest } as Parameters<typeof updateUserProfile>[1]
  if (conditions) {
    patch.safetyFlag =
      conditions.recentInjury ||
      conditions.recentSurgery ||
      conditions.jointOrSpineCondition ||
      conditions.pregnancy
  }

  const updated = await updateUserProfile(session.user.id, patch)
  const payload = ProfileResponseSchema.parse(updated)
  return jsonResponse({ data: payload })
}
