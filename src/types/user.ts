import { z } from "zod"

export const DaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])
export type Day = z.infer<typeof DaySchema>

export const ProgressEntrySchema = z.object({
  date: z.string().date(),
  minutesStretched: z.number().int().nonnegative(),
  sessionsCompleted: z.number().int().nonnegative(),
  routineIds: z.array(z.string()),
})
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>

export const ProgressSchema = z.object({
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  totalMinutes: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  thisWeekMinutes: z.number().int().nonnegative(),
  thisMonthMinutes: z.number().int().nonnegative(),
  history: z.array(ProgressEntrySchema),
  activeDays: z.array(DaySchema),
})
export type Progress = z.infer<typeof ProgressSchema>

export const ProgressQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
})
export type ProgressQuery = z.infer<typeof ProgressQuerySchema>
