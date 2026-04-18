import { z } from "zod";

export const PainFeedbackSchema = z.record(
  z.string().uuid(),
  z.number().int().min(0).max(10)
);
export type PainFeedback = z.infer<typeof PainFeedbackSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  routineId: z.string().uuid().nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  durationDoneSec: z.number().int().min(0),
  completionPct: z.number().min(0).max(100),
  skippedStretchIds: z.array(z.string().uuid()),
  painFeedback: PainFeedbackSchema,
  createdAt: z.coerce.date(),
});
export type SessionType = z.infer<typeof SessionSchema>;

/**
 * Wire schema: what POST /api/sessions accepts in the request body.
 * userId is never accepted from the body — it is resolved server-side
 * from the auth session (ADR-0004).
 */
export const StartSessionBodySchema = z.object({
  routineId: z.string().uuid(),
});
export type StartSessionBody = z.infer<typeof StartSessionBodySchema>;

/**
 * Service schema: what the startSession service function accepts. userId
 * is required here and is filled in by the route handler from auth().
 */
export const StartSessionSchema = z.object({
  userId: z.string().uuid(),
  routineId: z.string().uuid(),
});
export type StartSession = z.infer<typeof StartSessionSchema>;

export const CompleteSessionSchema = z.object({
  sessionId: z.string().uuid(),
  durationDoneSec: z.number().int().min(0),
  completionPct: z.number().min(0).max(100),
  skippedStretchIds: z.array(z.string().uuid()).default([]),
  painFeedback: PainFeedbackSchema.default({}),
});
export type CompleteSession = z.infer<typeof CompleteSessionSchema>;

export const SessionSummarySchema = z.object({
  totalSessions: z.number().int(),
  totalDurationSec: z.number().int(),
  avgCompletionPct: z.number(),
  streakDays: z.number().int(),
  lastSessionAt: z.coerce.date().nullable(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
