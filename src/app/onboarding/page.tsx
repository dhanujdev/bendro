"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRight } from "lucide-react"

const GOALS = [
  { id: "morning_wakeup", label: "Morning energy", emoji: "☀️" },
  { id: "desk_reset", label: "Desk relief", emoji: "💻" },
  { id: "lower_back_relief", label: "Back pain", emoji: "🧘" },
  { id: "flexibility", label: "Flexibility", emoji: "🤸" },
  { id: "sleep", label: "Better sleep", emoji: "🌙" },
  { id: "workout_recovery", label: "Recovery", emoji: "💪" },
  { id: "stress_relief", label: "Stress relief", emoji: "😌" },
  { id: "posture", label: "Posture", emoji: "🏃" },
]

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F14] px-4 py-12 max-w-lg mx-auto">
      <div className="mb-8">
        <p className="text-[#7C5CFC] text-sm font-medium mb-2">Welcome to Bend</p>
        <h1 className="text-3xl font-bold text-white leading-tight">
          What are your <br />
          stretch goals?
        </h1>
        <p className="text-white/50 mt-2 text-sm">Select all that apply. You can change this later.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-10">
        {GOALS.map((goal) => {
          const active = selected.includes(goal.id)
          return (
            <button
              key={goal.id}
              onClick={() => toggle(goal.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                active
                  ? "border-[#7C5CFC] bg-[#7C5CFC]/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="text-2xl">{goal.emoji}</span>
              <span className="text-sm font-medium">{goal.label}</span>
            </button>
          )
        })}
      </div>

      <Link
        href="/home"
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] disabled:opacity-40 py-4 text-white font-semibold text-base transition-all active:scale-95"
      >
        Build My Plan
        <ChevronRight className="size-5" />
      </Link>

      <Link href="/home" className="text-center text-sm text-white/30 hover:text-white/50 transition-colors mt-4">
        Skip for now
      </Link>
    </div>
  )
}
