import { NextRequest } from "next/server"
import { z } from "zod"
import { getProgress } from "@/lib/data"

const QuerySchema = z.object({
  userId: z.string().uuid().optional(),
  days: z.coerce.number().int().positive().max(365).default(30),
})

const ProgressResponseSchema = z.object({
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  totalMinutes: z.number().int().nonnegative(),
  thisWeekMinutes: z.number().int().nonnegative(),
  thisMonthMinutes: z.number().int().nonnegative(),
  avgCompletionPct: z.number().min(0).max(100),
  activeDays: z.array(z.string()),
  history: z.array(
    z.object({
      date: z.string(),
      minutesStretched: z.number().int().nonnegative(),
      sessionsCompleted: z.number().int().nonnegative(),
      completionPct: z.number().min(0).max(100),
    }),
  ),
})

export async function GET(request: NextRequest) {
  const query = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )
  if (!query.success) {
    return Response.json(
      { error: "Invalid query parameters", issues: query.error.issues },
      { status: 400 },
    )
  }

  const progress = await getProgress(query.data)
  const validated = ProgressResponseSchema.parse(progress)
  return Response.json({ data: validated })
}
