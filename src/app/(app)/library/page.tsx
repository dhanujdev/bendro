import Link from "next/link"
import { Play, Clock } from "lucide-react"

const ROUTINES = [
  { id: "routine-1", name: "Morning Wake-Up Flow", duration: 10, level: "Gentle", goal: "Morning", emoji: "☀️", description: "Gently wake your body with this energizing routine." },
  { id: "routine-2", name: "Desk Worker Relief", duration: 8, level: "Moderate", goal: "Desk Reset", emoji: "💻", description: "Combat the effects of sitting all day." },
  { id: "routine-3", name: "Lower Back Relief", duration: 12, level: "Gentle", goal: "Back Pain", emoji: "🧘", description: "Targeted stretches to ease lower back tension." },
  { id: "routine-4", name: "Post-Workout Recovery", duration: 15, level: "Deep", goal: "Recovery", emoji: "💪", description: "Cool down and recover after exercise." },
  { id: "routine-5", name: "Bedtime Wind Down", duration: 10, level: "Gentle", goal: "Sleep", emoji: "🌙", description: "Prepare your body and mind for restful sleep." },
  { id: "routine-demo", name: "Quick Full-Body Stretch", duration: 7, level: "Moderate", goal: "Flexibility", emoji: "⚡", description: "A fast, balanced routine for any time of day." },
]

const LEVEL_COLORS: Record<string, string> = {
  Gentle: "text-green-400 bg-green-400/10",
  Moderate: "text-yellow-400 bg-yellow-400/10",
  Deep: "text-red-400 bg-red-400/10",
}

export default function LibraryPage() {
  return (
    <div className="flex flex-col min-h-full px-4 py-6 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Library</h1>
        <p className="text-white/50 text-sm mt-1">Browse all routines</p>
      </header>

      <div className="flex flex-col gap-3">
        {ROUTINES.map((routine) => (
          <Link
            key={routine.id}
            href={`/player/${routine.id}`}
            className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-[#7C5CFC]/40 transition-all group"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{routine.emoji}</span>
              <div>
                <p className="font-semibold text-white group-hover:text-[#7C5CFC] transition-colors">
                  {routine.name}
                </p>
                <p className="text-xs text-white/50 mt-0.5 max-w-[200px] line-clamp-1">
                  {routine.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[routine.level]}`}>
                    {routine.level}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Clock className="size-3" />
                    {routine.duration} min
                  </span>
                  <span className="text-xs text-white/40">{routine.goal}</span>
                </div>
              </div>
            </div>
            <Play className="size-5 text-white/20 group-hover:text-[#7C5CFC] transition-colors shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  )
}
