import { z } from "zod"

export const SessionStatus = z.enum(["active", "completed", "abandoned"])
export type SessionStatus = z.infer<typeof SessionStatus>

export const SessionSchema = z.object({
  id: z.string(),
  routineId: z.string(),
  userId: z.string().optional(),
  status: SessionStatus,
  currentStretchIndex: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  stretchesCompleted: z.number().int().nonnegative(),
})
export type Session = z.infer<typeof SessionSchema>

export const CreateSessionSchema = z.object({
  routineId: z.string().min(1),
})
export type CreateSession = z.infer<typeof CreateSessionSchema>

export const UpdateSessionSchema = z.object({
  status: SessionStatus.optional(),
  currentStretchIndex: z.number().int().nonnegative().optional(),
  stretchesCompleted: z.number().int().nonnegative().optional(),
})
export type UpdateSession = z.infer<typeof UpdateSessionSchema>
