import { z } from "zod"
import { StretchSchema } from "./stretch"

export const RoutineGoal = z.enum([
  "posture",
  "lower_back_relief",
  "flexibility",
  "sleep",
  "workout_recovery",
  "desk_reset",
  "morning_wakeup",
  "stress_relief",
])
export type RoutineGoal = z.infer<typeof RoutineGoal>

export const RoutineLevel = z.enum(["gentle", "moderate", "deep"])
export type RoutineLevel = z.infer<typeof RoutineLevel>

export const RoutineStretchSchema = z.object({
  order: z.number().int().nonnegative(),
  stretch: StretchSchema,
  durationSeconds: z.number().int().positive(),
  notes: z.string().optional(),
})
export type RoutineStretch = z.infer<typeof RoutineStretchSchema>

export const RoutineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  goal: RoutineGoal,
  level: RoutineLevel,
  durationMinutes: z.number().int().positive(),
  stretchCount: z.number().int().nonnegative(),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()),
})
export type Routine = z.infer<typeof RoutineSchema>

export const RoutineWithStretchesSchema = RoutineSchema.extend({
  stretches: z.array(RoutineStretchSchema),
})
export type RoutineWithStretches = z.infer<typeof RoutineWithStretchesSchema>

export const RoutineListQuerySchema = z.object({
  goal: RoutineGoal.optional(),
  level: RoutineLevel.optional(),
  maxDuration: z.coerce.number().int().positive().optional(),
  isSystem: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})
export type RoutineListQuery = z.infer<typeof RoutineListQuerySchema>

export const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  goal: RoutineGoal,
  level: RoutineLevel,
  stretchIds: z.array(z.string()).min(1).max(30),
  tags: z.array(z.string()).default([]),
})
export type CreateRoutine = z.infer<typeof CreateRoutineSchema>
