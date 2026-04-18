"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
import { Search, X } from "lucide-react"
import { GOAL_META } from "@/lib/mock-data"
import type { Goal, Intensity } from "@/types"

const LEVELS: { value: Intensity; label: string }[] = [
  { value: "gentle", label: "Gentle" },
  { value: "moderate", label: "Moderate" },
  { value: "deep", label: "Deep" },
]

const DURATION_BUCKETS: {
  value: "short" | "medium" | "long"
  label: string
}[] = [
  { value: "short", label: "≤5 min" },
  { value: "medium", label: "5–15 min" },
  { value: "long", label: ">15 min" },
]

const GOALS: Goal[] = [
  "flexibility",
  "mobility",
  "recovery",
  "stress_relief",
  "posture",
  "athletic_performance",
  "pain_relief",
]

interface Props {
  initialQuery: string
  initialGoal: Goal | null
  initialLevel: Intensity | null
  initialBucket: "short" | "medium" | "long" | null
  totalCount: number
  shownCount: number
}

export function LibraryFilterBar({
  initialQuery,
  initialGoal,
  initialLevel,
  initialBucket,
  totalCount,
  shownCount,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [qDraft, setQDraft] = useState(initialQuery)

  const currentGoal = initialGoal
  const currentLevel = initialLevel
  const currentBucket = initialBucket

  const buildHref = useCallback(
    (
      patch: Partial<{
        q: string | null
        goal: string | null
        level: string | null
        durationBucket: string | null
      }>,
    ) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k)
        else next.set(k, v)
      }
      const qs = next.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, searchParams],
  )

  function navigate(patch: Parameters<typeof buildHref>[0]) {
    const href = buildHref(patch)
    startTransition(() => router.replace(href, { scroll: false }))
  }

  function onSubmitSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ q: qDraft.trim() || null })
  }

  const hasAnyFilter = useMemo(
    () =>
      Boolean(
        initialQuery ||
          currentGoal ||
          currentLevel ||
          currentBucket,
      ),
    [initialQuery, currentGoal, currentLevel, currentBucket],
  )

  function clearAll() {
    setQDraft("")
    startTransition(() => router.replace(pathname, { scroll: false }))
  }

  return (
    <div className="flex flex-col gap-4" data-testid="library-filter-bar">
      <form onSubmit={onSubmitSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
        <input
          type="search"
          placeholder="Search routines"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          data-testid="library-search-input"
          className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7C5CFC]/60"
        />
        {qDraft.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQDraft("")
              navigate({ q: null })
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      <div className="flex flex-wrap gap-2" data-testid="library-goal-chips">
        {GOALS.map((g) => {
          const selected = currentGoal === g
          const meta = GOAL_META[g]
          return (
            <button
              key={g}
              type="button"
              onClick={() => navigate({ goal: selected ? null : g })}
              data-testid={`library-goal-${g}`}
              aria-pressed={selected}
              className={[
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                selected
                  ? "bg-[#7C5CFC] border-[#7C5CFC] text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {meta.emoji} {meta.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2" data-testid="library-level-chips">
        {LEVELS.map(({ value, label }) => {
          const selected = currentLevel === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => navigate({ level: selected ? null : value })}
              data-testid={`library-level-${value}`}
              aria-pressed={selected}
              className={[
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                selected
                  ? "bg-white/90 border-white/90 text-black"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {label}
            </button>
          )
        })}
        <span className="w-px bg-white/10 mx-1" />
        {DURATION_BUCKETS.map(({ value, label }) => {
          const selected = currentBucket === value
          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                navigate({ durationBucket: selected ? null : value })
              }
              data-testid={`library-bucket-${value}`}
              aria-pressed={selected}
              className={[
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                selected
                  ? "bg-white/90 border-white/90 text-black"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          {shownCount} of {totalCount} routines
          {pending ? " · updating…" : ""}
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            data-testid="library-clear-filters"
            className="text-white/60 hover:text-white underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
