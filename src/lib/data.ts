/**
 * Data adapter — transparent DB ↔ mock-data layer for the API routes.
 *
 * Each function here tries the Drizzle service in `@/services/*` first. If
 * `DATABASE_URL` is not set (see `src/db/index.ts`) or the connection fails,
 * we fall back to the in-memory mock-data in `@/lib/mock-data` so fresh
 * clones can `pnpm dev` with zero config.
 *
 * Fallback is logged once per process, per "reason bucket", so the dev
 * console stays quiet after the first hit.
 */

import type {
  RoutineType,
  RoutineWithStretches,
  StretchType,
  SessionType,
  StartSession,
  CreateRoutine,
  Goal,
  Intensity,
  BodyArea,
} from "@/types"
import {
  MOCK_ROUTINES,
  MOCK_STRETCHES,
  MOCK_PROGRESS,
  findRoutineByIdOrSlug as findMockRoutineByIdOrSlug,
  createMockSession,
  updateMockSession,
  findMockSession,
  type MockProgress,
} from "@/lib/mock-data"
import { isFallbackError, shortReason } from "@/lib/data-fallback"

// ─── Fallback bookkeeping ─────────────────────────────────────────────────────

const loggedFallbacks = new Set<string>()

function logFallbackOnce(op: string, err: unknown) {
  if (loggedFallbacks.has(op)) return
  loggedFallbacks.add(op)
  const msg = err instanceof Error ? err.message : String(err)
  console.info(
    `[data] ${op}: using mock-data fallback (${shortReason(msg)}). Set DATABASE_URL to hit Neon.`,
  )
}

async function withFallback<T>(
  op: string,
  tryDb: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    return await tryDb()
  } catch (err) {
    if (!isFallbackError(err)) throw err
    logFallbackOnce(op, err)
    return await fallback()
  }
}

// ─── Types shared with routes ────────────────────────────────────────────────

export interface ListRoutinesFilter {
  goal?: Goal
  level?: Intensity
  isPremium?: boolean
  maxDurationSec?: number
  limit: number
  offset: number
}

export interface ListStretchesFilter {
  bodyArea?: BodyArea
  intensity?: Intensity
  limit: number
  offset: number
}

export interface UpdateSessionPatch {
  durationDoneSec?: number
  completionPct?: number
  skippedStretchIds?: string[]
  painFeedback?: Record<string, number>
  completed?: boolean
}

export type ProgressPayload = MockProgress

// ─── Routines ────────────────────────────────────────────────────────────────

export async function getRoutines(
  filter: ListRoutinesFilter,
): Promise<{ data: RoutineType[]; total: number }> {
  return withFallback(
    "getRoutines",
    async () => {
      const { listRoutines } = await import("@/services/routines")
      const rows = await listRoutines({
        goal: filter.goal,
        isPremium: filter.isPremium,
      })
      const filtered = applyRoutineFilters(rows as RoutineType[], filter)
      const total = filtered.length
      const page = filtered.slice(filter.offset, filter.offset + filter.limit)
      return { data: page, total }
    },
    () => {
      const filtered = applyRoutineFilters([...MOCK_ROUTINES], filter)
      const total = filtered.length
      const page = filtered.slice(filter.offset, filter.offset + filter.limit)
      return { data: page, total }
    },
  )
}

function applyRoutineFilters(
  rows: RoutineType[],
  filter: ListRoutinesFilter,
): RoutineType[] {
  let out = rows
  if (filter.goal !== undefined) out = out.filter((r) => r.goal === filter.goal)
  if (filter.level !== undefined)
    out = out.filter((r) => r.level === filter.level)
  if (filter.isPremium !== undefined)
    out = out.filter((r) => r.isPremium === filter.isPremium)
  if (filter.maxDurationSec !== undefined)
    out = out.filter((r) => r.totalDurationSec <= filter.maxDurationSec!)
  return out
}

export async function getRoutineByIdOrSlug(
  idOrSlug: string,
): Promise<RoutineWithStretches | null> {
  return withFallback(
    "getRoutineByIdOrSlug",
    async () => {
      const { getRoutineById, getRoutineBySlug } = await import(
        "@/services/routines"
      )
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      )
      const hit = isUuid
        ? await getRoutineById(idOrSlug)
        : await getRoutineBySlug(idOrSlug === "demo" ? "quick-full-body-stretch" : idOrSlug)
      return (hit as RoutineWithStretches | null) ?? null
    },
    () => findMockRoutineByIdOrSlug(idOrSlug),
  )
}

export async function createRoutine(input: CreateRoutine): Promise<RoutineType> {
  return withFallback(
    "createRoutine",
    async () => {
      const { createRoutine: dbCreateRoutine } = await import(
        "@/services/routines"
      )
      const row = await dbCreateRoutine(input)
      return row as RoutineType
    },
    () => {
      const now = new Date()
      return {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as RoutineType
    },
  )
}

// ─── Stretches ────────────────────────────────────────────────────────────────

export async function listStretches(
  filter: ListStretchesFilter,
): Promise<{ data: StretchType[]; total: number }> {
  return withFallback(
    "listStretches",
    async () => {
      const { listStretches: dbListStretches } = await import(
        "@/services/routines"
      )
      const rows = (await dbListStretches()) as StretchType[]
      const filtered = applyStretchFilters(rows, filter)
      const total = filtered.length
      const page = filtered.slice(filter.offset, filter.offset + filter.limit)
      return { data: page, total }
    },
    () => {
      const filtered = applyStretchFilters([...MOCK_STRETCHES], filter)
      const total = filtered.length
      const page = filtered.slice(filter.offset, filter.offset + filter.limit)
      return { data: page, total }
    },
  )
}

function applyStretchFilters(
  rows: StretchType[],
  filter: ListStretchesFilter,
): StretchType[] {
  let out = rows
  if (filter.bodyArea !== undefined)
    out = out.filter((s) => s.bodyAreas.includes(filter.bodyArea!))
  if (filter.intensity !== undefined)
    out = out.filter((s) => s.intensity === filter.intensity)
  return out
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function startSession(input: StartSession): Promise<SessionType> {
  return withFallback(
    "startSession",
    async () => {
      const { startSession: dbStart } = await import("@/services/sessions")
      const row = await dbStart(input)
      return row as SessionType
    },
    () => createMockSession(input),
  )
}

export async function getSessionById(
  id: string,
): Promise<SessionType | null> {
  return withFallback(
    "getSessionById",
    async () => {
      const { getSessionById: dbGet } = await import("@/services/sessions")
      const row = await dbGet(id)
      return (row as SessionType | undefined) ?? null
    },
    () => findMockSession(id),
  )
}

export async function updateSession(
  id: string,
  patch: UpdateSessionPatch,
): Promise<SessionType | null> {
  return withFallback(
    "updateSession",
    async () => {
      // The DB service only exposes completeSession (expects all fields) and
      // low-level updates aren't defined. We do a best-effort direct update
      // here so partial PATCHes work in DB-mode.
      const { db } = await import("@/db")
      const { sessions } = await import("@/db/schema")
      const { eq } = await import("drizzle-orm")

      const set: Record<string, unknown> = {}
      if (patch.durationDoneSec !== undefined)
        set.durationDoneSec = patch.durationDoneSec
      if (patch.completionPct !== undefined)
        set.completionPct = patch.completionPct
      if (patch.skippedStretchIds !== undefined)
        set.skippedStretchIds = patch.skippedStretchIds
      if (patch.painFeedback !== undefined) set.painFeedback = patch.painFeedback
      if (patch.completed) set.completedAt = new Date()

      if (Object.keys(set).length === 0) {
        const row = await db.query.sessions.findFirst({
          where: eq(sessions.id, id),
        })
        return (row as SessionType | undefined) ?? null
      }

      const [row] = await db
        .update(sessions)
        .set(set)
        .where(eq(sessions.id, id))
        .returning()

      if (!row) return null

      // Trigger streak update on completion if threshold met
      if (patch.completed && (patch.completionPct ?? row.completionPct) >= 50) {
        const { updateStreak } = await import("@/services/streaks")
        await updateStreak(row.userId).catch(() => {
          /* non-fatal */
        })
      }

      return row as SessionType
    },
    () => {
      const { completed, ...rest } = patch
      return updateMockSession(id, {
        ...rest,
        ...(completed ? { completedAt: new Date() } : {}),
      })
    },
  )
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface ProgressOptions {
  userId?: string
  days: number
}

export async function getProgress(
  opts: ProgressOptions,
): Promise<ProgressPayload> {
  return withFallback(
    "getProgress",
    async () => {
      if (!opts.userId) {
        // No user scope available → surface mock-shape for now.
        return sliceMockProgress(opts.days)
      }
      return await computeDbProgress(opts.userId, opts.days)
    },
    () => sliceMockProgress(opts.days),
  )
}

function sliceMockProgress(days: number): ProgressPayload {
  return {
    ...MOCK_PROGRESS,
    history: MOCK_PROGRESS.history.slice(0, days),
  }
}

async function computeDbProgress(
  userId: string,
  days: number,
): Promise<ProgressPayload> {
  const { getRecentSessions } = await import("@/services/sessions")
  const { getStreak } = await import("@/services/streaks")

  const [recent, streak] = await Promise.all([
    getRecentSessions(userId, days),
    getStreak(userId),
  ])

  const completed = recent.filter(
    (s) => s.completionPct >= 50 && s.completedAt !== null,
  )

  const totalSessions = completed.length
  const totalSeconds = completed.reduce((a, s) => a + s.durationDoneSec, 0)
  const totalMinutes = Math.round(totalSeconds / 60)
  const avgCompletionPct = completed.length
    ? Math.round(
        completed.reduce((a, s) => a + s.completionPct, 0) / completed.length,
      )
    : 0

  // Bucket sessions by local calendar date (UTC for now — per-user tz wiring
  // is a follow-up).
  const byDate = new Map<
    string,
    { minutes: number; sessions: number; pctSum: number }
  >()
  for (const s of completed) {
    const date = s.startedAt.toISOString().split("T")[0]
    const b = byDate.get(date) ?? { minutes: 0, sessions: 0, pctSum: 0 }
    b.minutes += Math.round(s.durationDoneSec / 60)
    b.sessions += 1
    b.pctSum += s.completionPct
    byDate.set(date, b)
  }

  const history: ProgressPayload["history"] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().split("T")[0]
    const b = byDate.get(key)
    history.push({
      date: key,
      minutesStretched: b?.minutes ?? 0,
      sessionsCompleted: b?.sessions ?? 0,
      completionPct: b && b.sessions ? Math.round(b.pctSum / b.sessions) : 0,
    })
  }

  const now2 = new Date()
  const weekAgo = new Date(now2)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  const monthAgo = new Date(now2)
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 30)

  const thisWeekMinutes = Math.round(
    completed
      .filter((s) => s.startedAt >= weekAgo)
      .reduce((a, s) => a + s.durationDoneSec, 0) / 60,
  )
  const thisMonthMinutes = Math.round(
    completed
      .filter((s) => s.startedAt >= monthAgo)
      .reduce((a, s) => a + s.durationDoneSec, 0) / 60,
  )

  // Active days-of-week over the window
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]
  const activeDaySet = new Set<string>()
  for (const s of completed) {
    activeDaySet.add(dayNames[s.startedAt.getUTCDay()])
  }

  return {
    currentStreak: streak?.currentCount ?? 0,
    longestStreak: streak?.longestCount ?? 0,
    totalSessions,
    totalMinutes,
    thisWeekMinutes,
    thisMonthMinutes,
    avgCompletionPct,
    activeDays: Array.from(activeDaySet),
    history,
  }
}

// ─── Adapter contract ────────────────────────────────────────────────────────

/**
 * `DataAdapter` is the contract every read/write path through the API
 * depends on. There is one canonical implementation (`dataAdapter` below)
 * that tries the Drizzle/Neon service layer first and falls back to the
 * in-memory mock when the DB is missing or unreachable.
 *
 * The named exports above are the ergonomic surface callers use. This
 * interface + object exists so:
 *
 *   1. The compiler pins the exact shape of the adapter (no more "forgot
 *      to add a function to both impls" bugs when the data layer grows).
 *   2. Tests that want to stub the entire data layer can do
 *      `vi.mock("@/lib/data", () => ({ dataAdapter: fake, ...stubs }))`.
 *   3. Future in-process variants (e.g. a fully-mocked Neon client for
 *      CI integration tests) can be swapped in behind the same contract.
 */
export interface DataAdapter {
  getRoutines: typeof getRoutines
  getRoutineByIdOrSlug: typeof getRoutineByIdOrSlug
  createRoutine: typeof createRoutine
  listStretches: typeof listStretches
  startSession: typeof startSession
  getSessionById: typeof getSessionById
  updateSession: typeof updateSession
  getProgress: typeof getProgress
}

export const dataAdapter: DataAdapter = {
  getRoutines,
  getRoutineByIdOrSlug,
  createRoutine,
  listStretches,
  startSession,
  getSessionById,
  updateSession,
  getProgress,
}
