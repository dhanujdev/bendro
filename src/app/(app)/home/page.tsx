import Link from "next/link"
import { redirect } from "next/navigation"
import { Play, Flame, Clock, Zap, Camera } from "lucide-react"
import { MOCK_ROUTINES, GOAL_META } from "@/lib/mock-data"
import { auth } from "@/lib/auth"
import { getProgress } from "@/lib/data"

const FEATURED_SLUGS = [
  "morning-wake-up-flow",
  "desk-worker-relief",
  "bedtime-wind-down",
]

export default async function HomePage() {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    redirect("/signin?callbackUrl=/home")
  }

  const progress = await getProgress({
    userId: authSession.user.id,
    days: 30,
  })

  const featured = FEATURED_SLUGS
    .map((slug) => MOCK_ROUTINES.find((r) => r.slug === slug))
    .filter((r): r is NonNullable<typeof r> => !!r)

  return (
    <div
      className="flex flex-col min-h-full px-4 py-6 max-w-lg mx-auto"
      data-testid="home-page"
    >
      <header className="mb-8">
        <p className="text-white/50 text-sm">Good morning</p>
        <h1 className="text-2xl font-bold text-white mt-1">Ready to stretch?</h1>
      </header>

      <section className="mb-4">
        <Link
          href="/player/demo"
          data-testid="home-start-stretching"
          className="flex items-center justify-center gap-3 w-full rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] active:scale-95 transition-all py-5 text-white font-semibold text-lg shadow-lg shadow-[#7C5CFC]/30"
        >
          <Play className="size-6 fill-white" />
          Start Stretching
        </Link>
      </section>

      <section className="mb-8">
        <Link
          href="/player/camera"
          className="flex items-center justify-between gap-3 w-full rounded-2xl border border-[#7C5CFC]/30 bg-[#7C5CFC]/10 hover:bg-[#7C5CFC]/15 active:scale-[0.98] transition-all px-4 py-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#7C5CFC]/20 flex items-center justify-center">
              <Camera className="size-5 text-[#7C5CFC]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Camera mode</p>
              <p className="text-xs text-white/50">Live pose coaching · beta</p>
            </div>
          </div>
          <span className="text-xs font-medium text-[#7C5CFC] uppercase tracking-wider">Try</span>
        </Link>
      </section>

      <section className="mb-8">
        <div className="grid grid-cols-3 gap-3">
          <div
            data-testid="home-stat-streak"
            className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1"
          >
            <Flame className="size-5 text-orange-400" />
            <span className="text-xl font-bold text-white">{progress.currentStreak}</span>
            <span className="text-xs text-white/50">Day streak</span>
          </div>
          <div
            data-testid="home-stat-week-minutes"
            className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1"
          >
            <Clock className="size-5 text-[#7C5CFC]" />
            <span className="text-xl font-bold text-white">{progress.thisWeekMinutes}</span>
            <span className="text-xs text-white/50">Min this week</span>
          </div>
          <div
            data-testid="home-stat-total-sessions"
            className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1"
          >
            <Zap className="size-5 text-yellow-400" />
            <span className="text-xl font-bold text-white">{progress.totalSessions}</span>
            <span className="text-xs text-white/50">Sessions</span>
          </div>
        </div>
        {progress.longestStreak > 0 && progress.longestStreak !== progress.currentStreak && (
          <p
            data-testid="home-longest-streak"
            className="mt-3 text-center text-xs text-white/40"
          >
            Longest streak: {progress.longestStreak} days
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Recommended for you</h2>
        <div className="flex flex-col gap-3">
          {featured.map((routine) => {
            const meta = GOAL_META[routine.goal]
            return (
              <Link
                key={routine.id}
                href={`/player/${routine.slug}`}
                data-testid={`home-recommended-${routine.slug}`}
                className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-[#7C5CFC]/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <p className="font-medium text-white group-hover:text-[#7C5CFC] transition-colors">
                      {routine.title}
                    </p>
                    <p className="text-xs text-white/50">
                      {Math.round(routine.totalDurationSec / 60)} min · {meta.label}
                    </p>
                  </div>
                </div>
                <Play className="size-4 text-white/30 group-hover:text-[#7C5CFC] transition-colors" />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
