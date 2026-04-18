import Link from "next/link"
import { Play, Flame, Clock, Zap, Camera } from "lucide-react"

const FEATURED_ROUTINES = [
  { id: "routine-1", name: "Morning Wake-Up", duration: 10, goal: "morning_wakeup", emoji: "☀️" },
  { id: "routine-2", name: "Desk Reset", duration: 8, goal: "desk_reset", emoji: "💻" },
  { id: "routine-5", name: "Bedtime Wind Down", duration: 10, goal: "sleep", emoji: "🌙" },
]

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full px-4 py-6 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="text-white/50 text-sm">Good morning</p>
        <h1 className="text-2xl font-bold text-white mt-1">Ready to stretch?</h1>
      </header>

      <section className="mb-4">
        <Link
          href="/player/demo"
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
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1">
            <Flame className="size-5 text-orange-400" />
            <span className="text-xl font-bold text-white">5</span>
            <span className="text-xs text-white/50">Day streak</span>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1">
            <Clock className="size-5 text-[#7C5CFC]" />
            <span className="text-xl font-bold text-white">48</span>
            <span className="text-xs text-white/50">Min this week</span>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-1">
            <Zap className="size-5 text-yellow-400" />
            <span className="text-xl font-bold text-white">42</span>
            <span className="text-xs text-white/50">Sessions</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Recommended for you</h2>
        <div className="flex flex-col gap-3">
          {FEATURED_ROUTINES.map((routine) => (
            <Link
              key={routine.id}
              href={`/player/${routine.id}`}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-[#7C5CFC]/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{routine.emoji}</span>
                <div>
                  <p className="font-medium text-white group-hover:text-[#7C5CFC] transition-colors">
                    {routine.name}
                  </p>
                  <p className="text-xs text-white/50">{routine.duration} min</p>
                </div>
              </div>
              <Play className="size-4 text-white/30 group-hover:text-[#7C5CFC] transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
