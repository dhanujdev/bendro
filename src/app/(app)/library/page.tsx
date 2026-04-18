import Link from "next/link"
import { Play, Clock } from "lucide-react"
import { MOCK_ROUTINES, GOAL_META } from "@/lib/mock-data"

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

export default function LibraryPage() {
  return (
    <div className="flex flex-col min-h-full px-4 py-6 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Library</h1>
        <p className="text-white/50 text-sm mt-1">Browse all routines</p>
      </header>

      <div className="flex flex-col gap-3">
        {MOCK_ROUTINES.map((routine) => {
          const meta = GOAL_META[routine.goal]
          const levelColor = LEVEL_COLORS[routine.level] ?? "text-white/60 bg-white/10"
          return (
            <Link
              key={routine.id}
              href={`/player/${routine.slug}`}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-[#7C5CFC]/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{meta.emoji}</span>
                <div>
                  <p className="font-semibold text-white group-hover:text-[#7C5CFC] transition-colors">
                    {routine.title}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5 max-w-[240px] line-clamp-1">
                    {routine.description ?? ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor}`}>
                      {LEVEL_LABEL[routine.level]}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <Clock className="size-3" />
                      {Math.round(routine.totalDurationSec / 60)} min
                    </span>
                    <span className="text-xs text-white/40">{meta.label}</span>
                  </div>
                </div>
              </div>
              <Play className="size-5 text-white/20 group-hover:text-[#7C5CFC] transition-colors shrink-0 ml-2" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
