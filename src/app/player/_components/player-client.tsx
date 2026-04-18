"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { Play, Pause, SkipForward, SkipBack, X, ChevronRight } from "lucide-react"
import type { RoutineWithStretches } from "@/types"
import { decideKeyAction, isTypingTarget, type PlayerPhase } from "@/lib/player/keyboard"
import { DisclaimerBanner } from "@/components/disclaimer-banner"
import { StretchCompletionBurst } from "./stretch-completion-burst"

type Phase = PlayerPhase

const COMPLETION_ANIM_MS = 500

export default function PlayerClient({ routine }: { routine: RoutineWithStretches }) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>("ready")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paused, setPaused] = useState(false)

  const current = routine.routineStretches[currentIndex]
  const isLast = currentIndex === routine.routineStretches.length - 1
  const isFirst = currentIndex === 0

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

  const goPrevious = useCallback(() => {
    if (currentIndex === 0) return
    setCurrentIndex((i) => Math.max(0, i - 1))
    setPhase("rest")
    setPaused(false)
  }, [currentIndex])

  const togglePause = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  const exit = useCallback(() => {
    router.push("/home")
  }, [router])

  useEffect(() => {
    if (phase !== "stretching" || paused) return
    if (timeLeft <= 0) {
      const delay = reduceMotion ? 0 : COMPLETION_ANIM_MS
      const defer = setTimeout(advanceOrComplete, delay)
      return () => clearTimeout(defer)
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, paused, timeLeft, advanceOrComplete, reduceMotion])

  useEffect(() => {
    if (phase === "complete") return

    function onKeyDown(e: KeyboardEvent) {
      const action = decideKeyAction({
        key: e.key,
        phase,
        currentIndex,
        hasModifier: e.ctrlKey || e.metaKey || e.altKey,
        isTyping: isTypingTarget(e.target),
      })
      if (action === "none") return
      e.preventDefault()
      switch (action) {
        case "pause-toggle":
          togglePause()
          return
        case "start":
          startStretch()
          return
        case "next":
          advanceOrComplete()
          return
        case "previous":
          goPrevious()
          return
        case "exit":
          exit()
          return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [phase, currentIndex, togglePause, startStretch, advanceOrComplete, goPrevious, exit])

  const progress = current
    ? ((current.durationSec - timeLeft) / current.durationSec) * 100
    : 0

  if (phase === "complete") {
    return (
      <div
        data-testid="player-complete"
        className="flex flex-col items-center justify-center min-h-dvh bg-[#0F0F14] px-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-2">Great work!</h1>
        <p className="text-white/50 mb-2">You completed</p>
        <p className="text-[#7C5CFC] font-semibold text-lg mb-8">{routine.title}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/home"
            data-testid="player-complete-home"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] py-4 text-white font-semibold transition-all"
          >
            Back to Home
          </Link>
          <Link
            href="/library"
            data-testid="player-complete-library"
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
      <div
        data-testid="player-ready"
        className="flex flex-col min-h-dvh bg-[#0F0F14] px-4 sm:px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-lg mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/home"
            data-testid="player-exit"
            aria-label="Exit player"
            className="-m-2 p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="size-6" />
          </Link>
          <span className="text-sm text-white/50">
            {routine.routineStretches.length} stretches
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white mb-2">{routine.title}</h1>
          <p className="text-white/50 mb-8">{routine.description ?? ""}</p>

          <div className="flex flex-col gap-3 mb-6">
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

          <DisclaimerBanner surface="routineStart" className="mb-8" />
        </div>

        <button
          onClick={startStretch}
          data-testid="player-start"
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
      <div
        data-testid="player-rest"
        className="flex flex-col items-center justify-center min-h-dvh bg-[#0F0F14] px-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <p className="text-white/50 text-sm mb-2">Next up</p>
        <h2 className="text-2xl font-bold text-white mb-6">{current.stretch.name}</h2>
        <button
          onClick={startStretch}
          data-testid="player-continue"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] px-8 py-4 text-white font-semibold transition-all active:scale-95"
        >
          Continue
          <ChevronRight className="size-5" />
        </button>
      </div>
    )
  }

  const showCompletionBurst = phase === "stretching" && timeLeft <= 0

  return (
    <div
      data-testid="player-stretching"
      className="relative flex flex-col min-h-dvh bg-[#0F0F14] px-4 sm:px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-lg mx-auto"
    >
      <AnimatePresence>
        {showCompletionBurst && <StretchCompletionBurst key="burst" />}
      </AnimatePresence>
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/home"
          data-testid="player-exit"
          aria-label="Exit player"
          className="-m-2 p-2 text-white/40 hover:text-white transition-colors"
        >
          <X className="size-5" />
        </Link>
        <span className="text-sm text-white/40" data-testid="player-progress-count">
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
        <div className="text-6xl font-bold text-white tabular-nums" data-testid="player-timer">
          {timeLeft}s
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={goPrevious}
            disabled={isFirst}
            aria-label="Previous stretch"
            data-testid="player-previous"
            className="size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10"
          >
            <SkipBack className="size-5 text-white/60" />
          </button>
          <button
            onClick={togglePause}
            aria-label={paused ? "Resume" : "Pause"}
            data-testid="player-pause-toggle"
            data-paused={paused ? "true" : "false"}
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
            aria-label="Next stretch"
            data-testid="player-skip"
            className="size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
          >
            <SkipForward className="size-5 text-white/60" />
          </button>
        </div>

        <p className="text-xs text-white/30 hidden sm:block" data-testid="player-shortcuts-hint">
          Space pause · ← prev · → next · Esc exit
        </p>
      </div>
    </div>
  )
}
