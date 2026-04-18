import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import type { StartSession, CompleteSession } from "@/types/session";
import { updateStreak } from "./streaks";

export async function startSession(input: StartSession) {
  const [session] = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      routineId: input.routineId,
      startedAt: new Date(),
    })
    .returning();
  return session;
}

export async function completeSession(input: CompleteSession, timezone = "UTC") {
  const [session] = await db
    .update(sessions)
    .set({
      completedAt: new Date(),
      durationDoneSec: input.durationDoneSec,
      completionPct: input.completionPct,
      skippedStretchIds: input.skippedStretchIds,
      painFeedback: input.painFeedback,
    })
    .where(eq(sessions.id, input.sessionId))
    .returning();

  if (session && input.completionPct >= 50) {
    await updateStreak(session.userId, timezone);
  }

  return session;
}

export async function getSessionById(id: string) {
  return db.query.sessions.findFirst({
    where: eq(sessions.id, id),
  });
}

export async function getUserSessions(userId: string, limit = 20) {
  return db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    orderBy: (s, { desc }) => [desc(s.startedAt)],
    limit,
  });
}

export async function getSessionSummary(userId: string) {
  const rows = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      totalDurationSec: sql<number>`sum(${sessions.durationDoneSec})::int`,
      avgCompletionPct: sql<number>`avg(${sessions.completionPct})::float`,
      lastSessionAt: sql<Date>`max(${sessions.startedAt})`,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        gte(sessions.completionPct, 50)
      )
    );

  const row = rows[0];
  return {
    totalSessions: row?.totalSessions ?? 0,
    totalDurationSec: row?.totalDurationSec ?? 0,
    avgCompletionPct: row?.avgCompletionPct ?? 0,
    lastSessionAt: row?.lastSessionAt ?? null,
  };
}

export async function getRecentSessions(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db.query.sessions.findMany({
    where: and(
      eq(sessions.userId, userId),
      gte(sessions.startedAt, since)
    ),
    orderBy: (s, { desc }) => [desc(s.startedAt)],
  });
}
