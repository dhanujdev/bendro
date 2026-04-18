import Link from "next/link"
import { Play, Clock, Lock, Sparkles } from "lucide-react"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { GOAL_META } from "@/lib/mock-data"
import { getRoutines, getUserProfile } from "@/lib/data"
import { isPremium as isViewerPremium } from "@/services/billing"
import {
  GoalSchema,
  IntensitySchema,
  type BodyArea,
} from "@/types"
import { LibraryFilterBar } from "./_components/library-filter-bar"

const LEVEL_COLORS: Record<string, string> = {
  gentle: "text-green-400 bg-green-400/10",
  moderate: "text-yellow-400 bg-yellow-400/10",
  deep: "text-red-400 bg-red-400/10",
}

const LEVEL_LABEL: Record<string, string> = {
  gentle: "Gentle",
  moderate: "Moderate",
  deep: "Deep",
}

const DurationBucketSchema = z.enum(["short", "medium", "long"])

const SearchParamsSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  goal: GoalSchema.optional(),
  level: IntensitySchema.optional(),
  durationBucket: DurationBucketSchema.optional(),
})

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const parsed = SearchParamsSchema.safeParse({
    q: firstValue(raw.q),
    goal: firstValue(raw.goal),
    level: firstValue(raw.level),
    durationBucket: firstValue(raw.durationBucket),
  })
  const filters = parsed.success ? parsed.data : {}

  const session = await auth()
  const profile = session?.user?.id
    ? await getUserProfile(session.user.id)
    : null
  const viewerIsPremium = session?.user?.id
    ? await isViewerPremium(session.user.id)
    : false

  const { data, total } = await getRoutines({
    limit: 100,
    offset: 0,
    goal: filters.goal,
    level: filters.level,
    durationBucket: filters.durationBucket,
    q: filters.q,
    avoidBodyAreas:
      profile && profile.avoidAreas.length > 0
        ? (profile.avoidAreas as BodyArea[])
        : undefined,
    safetyFlag: profile?.safetyFlag || undefined,
  })

  return (
    <div className="flex flex-col min-h-full px-4 py-6 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Library</h1>
        <p className="text-white/50 text-sm mt-1">
          {profile?.safetyFlag
            ? "Browse routines (gentle + moderate only — safety flag on)"
            : "Browse all routines"}
        </p>
      </header>

      <div className="mb-6">
        <LibraryFilterBar
          initialQuery={filters.q ?? ""}
          initialGoal={filters.goal ?? null}
          initialLevel={filters.level ?? null}
          initialBucket={filters.durationBucket ?? null}
          totalCount={total}
          shownCount={data.length}
        />
      </div>

      {data.length === 0 ? (
        <div
          data-testid="library-empty-state"
          className="flex flex-col items-center justify-center py-16 text-center text-white/50"
        >
          <p className="text-sm">No routines match your filters.</p>
          <p className="text-xs mt-1">
            Try clearing one — your goals, avoid areas, and safety flag are
            applied automatically.
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-3"
          data-testid="library-routine-list"
        >
          {data.map((routine) => {
            const meta = GOAL_META[routine.goal]
            const levelColor =
              LEVEL_COLORS[routine.level] ?? "text-white/60 bg-white/10"
            const locked = routine.isPremium && !viewerIsPremium
            const href = locked
              ? `/account?upgrade=1&routine=${routine.slug}`
              : `/player/${routine.slug}`
            return (
              <Link
                key={routine.id}
                href={href}
                data-testid={`library-routine-${routine.slug}`}
                data-locked={locked ? "true" : "false"}
                data-premium={routine.isPremium ? "true" : "false"}
                className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-[#7C5CFC]/40 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{meta.emoji}</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-[#7C5CFC] transition-colors flex items-center gap-2">
                      {routine.title}
                      {routine.isPremium && (
                        <span
                          data-testid={`library-routine-${routine.slug}-premium-badge`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#7C5CFC]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B4A0FF]"
                        >
                          <Sparkles className="size-3" />
                          Premium
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5 max-w-[240px] line-clamp-1">
                      {routine.description ?? ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor}`}
                      >
                        {LEVEL_LABEL[routine.level]}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Clock className="size-3" />
                        {Math.round(routine.totalDurationSec / 60)} min
                      </span>
                      <span className="text-xs text-white/40">
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </div>
                {locked ? (
                  <Lock
                    data-testid={`library-routine-${routine.slug}-lock`}
                    className="size-5 text-[#7C5CFC]/60 group-hover:text-[#7C5CFC] transition-colors shrink-0 ml-2"
                  />
                ) : (
                  <Play className="size-5 text-white/20 group-hover:text-[#7C5CFC] transition-colors shrink-0 ml-2" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
