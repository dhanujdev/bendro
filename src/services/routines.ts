import { eq, and, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { routines, routineStretches, stretches } from "@/db/schema";
import type { CreateRoutine } from "@/types/routine";

export async function getRoutineById(id: string) {
  const routine = await db.query.routines.findFirst({
    where: eq(routines.id, id),
    with: {
      routineStretches: {
        orderBy: (rs, { asc }) => [asc(rs.orderIndex)],
        with: { stretch: true },
      },
    },
  });
  return routine ?? null;
}

export async function getRoutineBySlug(slug: string) {
  const routine = await db.query.routines.findFirst({
    where: eq(routines.slug, slug),
    with: {
      routineStretches: {
        orderBy: (rs, { asc }) => [asc(rs.orderIndex)],
        with: { stretch: true },
      },
    },
  });
  return routine ?? null;
}

export async function listRoutines({
  userId,
  goal,
  isPremium,
}: {
  userId?: string;
  goal?: string;
  isPremium?: boolean;
} = {}) {
  const conditions = [];

  if (goal) conditions.push(eq(routines.goal, goal as never));
  if (isPremium !== undefined)
    conditions.push(eq(routines.isPremium, isPremium));

  // Include system routines (no owner) and user-owned routines
  if (userId) {
    conditions.push(
      or(isNull(routines.ownerId), eq(routines.ownerId, userId))!
    );
  } else {
    conditions.push(isNull(routines.ownerId));
  }

  return db.query.routines.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: (r, { asc }) => [asc(r.title)],
  });
}

export async function createRoutine(input: CreateRoutine) {
  const [routine] = await db.insert(routines).values(input).returning();
  return routine;
}

export async function addStretchToRoutine({
  routineId,
  stretchId,
  orderIndex,
  durationSec,
  sideFirst,
}: {
  routineId: string;
  stretchId: string;
  orderIndex: number;
  durationSec: number;
  sideFirst?: string | null;
}) {
  const [rs] = await db
    .insert(routineStretches)
    .values({ routineId, stretchId, orderIndex, durationSec, sideFirst })
    .returning();
  return rs;
}

export async function deleteRoutine(id: string) {
  await db.delete(routines).where(eq(routines.id, id));
}

export async function listStretches() {
  return db.select().from(stretches).orderBy(stretches.name);
}

export async function getStretchBySlug(slug: string) {
  const stretch = await db.query.stretches.findFirst({
    where: eq(stretches.slug, slug),
  });
  return stretch ?? null;
}
