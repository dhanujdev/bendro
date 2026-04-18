"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Play, Pause, SkipForward, X, ChevronRight } from "lucide-react"
import type { RoutineWithStretches } from "@/types"

type Phase = "ready" | "stretching" | "rest" | "complete"

export default function PlayerClient({ routine }: { routine: RoutineWithStretches }) {
  const [phase, setPhase] = useState<Phase>("ready")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paused, setPaused] = useState(false)

  const current = routine.routineStretches[currentIndex]
  const isLast = currentIndex === routine.routineStretches.length - 1

  const startStretch = useCallback(() => {
    setTimeLeft(current.durationSec)
    setPhase("stretching")
    setPaused(false)
  }, [current])

  const advanceOrComplete = useCallback(() => {
    if (isLast) {
      setPhase("complete")
    } else {
      setCurrentIndex((i) => i + 1)
      setPhase("rest")
    }
  }, [isLast])

  useEffect(() => {
    if (phase !== "stretching" || paused) return
    if (timeLeft <= 0) {
      const defer = setTimeout(advanceOrComplete, 0)
      return () => clearTimeout(defer)
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, paused, timeLeft, advanceOrComplete])

  const progress = current
    ? ((current.durationSec - timeLeft) / current.durationSec) * 100
    : 0

  if (phase === "complete") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F0F14] px-6 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-2">Great work!</h1>
        <p className="text-white/50 mb-2">You completed</p>
        <p className="text-[#7C5CFC] font-semibold text-lg mb-8">{routine.title}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/home"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] py-4 text-white font-semibold transition-all"
          >
            Back to Home
          </Link>
          <Link
            href="/library"
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 py-4 text-white/70 font-medium hover:bg-white/5 transition-all"
          >
            Browse Library
          </Link>
        </div>
      </div>
    )
  }

  if (phase === "ready") {
    return (
      <div className="flex flex-col min-h-screen bg-[#0F0F14] px-4 pt-12 pb-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/home" className="text-white/50 hover:text-white transition-colors">
            <X className="size-6" />
          </Link>
          <span className="text-sm text-white/50">
            {routine.routineStretches.length} stretches
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white mb-2">{routine.title}</h1>
          <p className="text-white/50 mb-8">{routine.description ?? ""}</p>

          <div className="flex flex-col gap-3 mb-10">
            {routine.routineStretches.map((rs, i) => (
              <div key={rs.id} className="flex items-center gap-3">
                <span className="size-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50">
                  {i + 1}
                </span>
                <span className="text-sm text-white/80">{rs.stretch.name}</span>
                <span className="ml-auto text-xs text-white/40">{rs.durationSec}s</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={startStretch}
          className="flex items-center justify-center gap-3 w-full rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] py-5 text-white font-semibold text-lg transition-all active:scale-95"
        >
          <Play className="size-6 fill-white" />
          Start
        </button>
      </div>
    )
  }

  if (phase === "rest") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F0F14] px-6 text-center">
        <p className="text-white/50 text-sm mb-2">Next up</p>
        <h2 className="text-2xl font-bold text-white mb-6">{current.stretch.name}</h2>
        <button
          onClick={startStretch}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] px-8 py-4 text-white font-semibold transition-all active:scale-95"
        >
          Continue
          <ChevronRight className="size-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F14] px-4 pt-12 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/home" className="text-white/40 hover:text-white transition-colors">
          <X className="size-5" />
        </Link>
        <span className="text-sm text-white/40">
          {currentIndex + 1} / {routine.routineStretches.length}
        </span>
      </div>

      <div className="w-full h-1 bg-white/10 rounded-full mb-8">
        <div
          className="h-full bg-[#7C5CFC] rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <p className="text-[#7C5CFC] text-sm font-medium mb-2 capitalize">
          {current.stretch.bodyAreas.map((a) => a.replace("_", " ")).join(" · ")}
        </p>
        <h2 className="text-3xl font-bold text-white mb-4">{current.stretch.name}</h2>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">{current.stretch.instructions}</p>

        {current.stretch.cues.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            {current.stretch.cues.map((cue, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-white/70">
                <span className="text-[#7C5CFC] font-bold shrink-0">·</span>
                <span>{cue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="text-6xl font-bold text-white tabular-nums">{timeLeft}s</div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setPaused((p) => !p)}
            className="size-16 rounded-full bg-[#7C5CFC] hover:bg-[#6B4EE0] flex items-center justify-center transition-all active:scale-95"
          >
            {paused ? (
              <Play className="size-7 fill-white text-white" />
            ) : (
              <Pause className="size-7 text-white" />
            )}
          </button>
          <button
            onClick={advanceOrComplete}
            className="size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
          >
            <SkipForward className="size-5 text-white/60" />
          </button>
        </div>
      </div>
    </div>
  )
}
