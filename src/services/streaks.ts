import { eq } from "drizzle-orm";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import type { StreakType } from "@/types/user";

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Format a Date to YYYY-MM-DD in the given timezone */
export function formatDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

/** Compute the previous calendar date string */
export function previousDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Streak logic ─────────────────────────────────────────────────────────────

/**
 * Update or create the streak row for a user.
 *
 * Rules:
 * - Same day → no-op (streak already counted today)
 * - Consecutive day → increment
 * - Gap of 1+ day → reset to 1
 * - Always update longestCount if currentCount surpasses it
 */
export async function updateStreak(
  userId: string,
  timezone: string = "UTC"
): Promise<StreakType> {
  const today = formatDateInTimezone(new Date(), timezone);

  const existing = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!existing) {
    const [row] = await db
      .insert(streaks)
      .values({
        userId,
        currentCount: 1,
        longestCount: 1,
        lastActiveDate: today,
      })
      .returning();
    return row as StreakType;
  }

  // Already counted today
  if (existing.lastActiveDate === today) {
    return existing as StreakType;
  }

  const yesterday = previousDate(today);
  const isConsecutive = existing.lastActiveDate === yesterday;

  const newCurrent = isConsecutive ? existing.currentCount + 1 : 1;
  const newLongest = Math.max(existing.longestCount, newCurrent);

  const [row] = await db
    .update(streaks)
    .set({
      currentCount: newCurrent,
      longestCount: newLongest,
      lastActiveDate: today,
      updatedAt: new Date(),
    })
    .where(eq(streaks.userId, userId))
    .returning();

  return row as StreakType;
}

export async function getStreak(userId: string): Promise<StreakType | null> {
  const row = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });
  return row ? (row as StreakType) : null;
}

export async function resetStreak(userId: string): Promise<void> {
  await db
    .update(streaks)
    .set({ currentCount: 0, lastActiveDate: null, updatedAt: new Date() })
    .where(eq(streaks.userId, userId));
}
