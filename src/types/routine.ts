import { z } from "zod";
import { BodyAreaSchema, IntensitySchema } from "./stretch";

export const GoalSchema = z.enum([
  "flexibility",
  "mobility",
  "recovery",
  "stress_relief",
  "posture",
  "athletic_performance",
  "pain_relief",
]);
export type Goal = z.infer<typeof GoalSchema>;

export const RoutineStretchSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid(),
  stretchId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  durationSec: z.number().int().positive(),
  sideFirst: z.string().nullable(),
});
export type RoutineStretchType = z.infer<typeof RoutineStretchSchema>;

export const RoutineSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  goal: GoalSchema,
  level: IntensitySchema,
  totalDurationSec: z.number().int().positive(),
  isPremium: z.boolean(),
  isAiGenerated: z.boolean(),
  ownerId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type RoutineType = z.infer<typeof RoutineSchema>;

export const CreateRoutineSchema = RoutineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateRoutine = z.infer<typeof CreateRoutineSchema>;

// Full routine with stretch details
export const RoutineWithStretchesSchema = RoutineSchema.extend({
  routineStretches: z.array(
    RoutineStretchSchema.extend({
      stretch: z.object({
        id: z.string().uuid(),
        slug: z.string(),
        name: z.string(),
        instructions: z.string(),
        cues: z.array(z.string()),
        cautions: z.array(z.string()),
        bodyAreas: z.array(BodyAreaSchema),
        intensity: IntensitySchema,
        bilateral: z.boolean(),
        defaultDurationSec: z.number().int(),
        mediaUrl: z.string().url().nullable(),
        thumbnailUrl: z.string().url().nullable(),
      }),
    })
  ),
});
export type RoutineWithStretches = z.infer<typeof RoutineWithStretchesSchema>;

export const GeneratePlanInputSchema = z.object({
  userId: z.string().uuid(),
  goals: z.array(GoalSchema).min(1),
  focusAreas: z.array(BodyAreaSchema).default([]),
  avoidAreas: z.array(BodyAreaSchema).default([]),
  timeBudgetSec: z.number().int().min(300).max(7200),
  intensity: IntensitySchema.default("moderate"),
  daysPerWeek: z.number().int().min(1).max(7).default(5),
});
export type GeneratePlanInput = z.infer<typeof GeneratePlanInputSchema>;
