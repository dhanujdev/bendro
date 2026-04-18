import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import type { Goal } from "@/types"

export interface UserProfile {
  userId: string
  goals: Goal[]
  focusAreas: string[]
  avoidAreas: string[]
  safetyFlag: boolean
  reminderTime: string | null
  timezone: string
  onboardedAt: Date | null
}

export interface UpdateProfilePatch {
  goals?: Goal[]
  focusAreas?: string[]
  avoidAreas?: string[]
  safetyFlag?: boolean
  reminderTime?: string | null
  timezone?: string
  markOnboarded?: boolean
}

function toProfile(
  row: typeof users.$inferSelect,
): UserProfile {
  return {
    userId: row.id,
    goals: row.goals as Goal[],
    focusAreas: row.focusAreas,
    avoidAreas: row.avoidAreas,
    safetyFlag: row.safetyFlag,
    reminderTime: row.reminderTime,
    timezone: row.timezone,
    onboardedAt: row.onboardedAt,
  }
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!row) {
    throw new Error(`user ${userId} not found`)
  }
  return toProfile(row)
}

export async function updateProfile(
  userId: string,
  patch: UpdateProfilePatch,
): Promise<UserProfile> {
  const update: Partial<typeof users.$inferInsert> = { updatedAt: new Date() }
  if (patch.goals !== undefined) update.goals = patch.goals
  if (patch.focusAreas !== undefined) update.focusAreas = patch.focusAreas
  if (patch.avoidAreas !== undefined) update.avoidAreas = patch.avoidAreas
  if (patch.safetyFlag !== undefined) update.safetyFlag = patch.safetyFlag
  if (patch.reminderTime !== undefined) update.reminderTime = patch.reminderTime
  if (patch.timezone !== undefined) update.timezone = patch.timezone
  if (patch.markOnboarded) update.onboardedAt = new Date()

  const [row] = await db
    .update(users)
    .set(update)
    .where(eq(users.id, userId))
    .returning()

  if (!row) {
    throw new Error(`user ${userId} not found`)
  }
  return toProfile(row)
}
