"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react"
import { GOAL_META } from "@/lib/mock-data"
import { features } from "@/config/features"
import type { Goal } from "@/types"
import type { BodyArea } from "@/types/stretch"

const GOALS: Goal[] = [
  "flexibility",
  "mobility",
  "recovery",
  "stress_relief",
  "posture",
  "athletic_performance",
  "pain_relief",
]

const BODY_AREAS: Array<{ value: BodyArea; label: string }> = [
  { value: "neck", label: "Neck" },
  { value: "shoulders", label: "Shoulders" },
  { value: "chest", label: "Chest" },
  { value: "upper_back", label: "Upper back" },
  { value: "lower_back", label: "Lower back" },
  { value: "hips", label: "Hips" },
  { value: "glutes", label: "Glutes" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "calves", label: "Calves" },
  { value: "ankles", label: "Ankles" },
  { value: "wrists", label: "Wrists" },
  { value: "full_body", label: "Full body" },
]

type Step = "intro" | "goals" | "focus" | "avoid" | "conditions"

interface Conditions {
  recentInjury: boolean
  recentSurgery: boolean
  jointOrSpineCondition: boolean
  pregnancy: boolean
}

const STEP_ORDER: Step[] = ["intro", "goals", "focus", "avoid", "conditions"]

export default function OnboardingPage() {
  if (!features.onboardingV1) return <LegacyOnboarding />
  return <MultiStepOnboarding />
}

function MultiStepOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("intro")
  const [goals, setGoals] = useState<Goal[]>([])
  const [focusAreas, setFocusAreas] = useState<BodyArea[]>([])
  const [avoidAreas, setAvoidAreas] = useState<BodyArea[]>([])
  const [conditions, setConditions] = useState<Conditions>({
    recentInjury: false,
    recentSurgery: false,
    jointOrSpineCondition: false,
    pregnancy: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const stepIndex = STEP_ORDER.indexOf(step)
  const next = () => setStep(STEP_ORDER[Math.min(stepIndex + 1, STEP_ORDER.length - 1)])
  const back = () => setStep(STEP_ORDER[Math.max(stepIndex - 1, 0)])

  async function submit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals,
          focusAreas,
          avoidAreas,
          conditions,
          markOnboarded: true,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        throw new Error(body?.error?.message ?? `Save failed (${res.status})`)
      }
      router.push("/home")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Save failed")
      setSubmitting(false)
    }
  }

  const anyCondition =
    conditions.recentInjury ||
    conditions.recentSurgery ||
    conditions.jointOrSpineCondition ||
    conditions.pregnancy

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F14] px-4 py-10 max-w-lg mx-auto">
      <StepHeader stepIndex={stepIndex} total={STEP_ORDER.length} />

      {step === "intro" && <IntroStep />}

      {step === "goals" && (
        <MultiSelectStep
          title="Stretch goals"
          hint="Pick one or more. You can change this later."
          items={GOALS.map((g) => ({ value: g, label: GOAL_META[g].label, emoji: GOAL_META[g].emoji }))}
          selected={goals}
          toggle={(v) =>
            setGoals((prev) => (prev.includes(v) ? prev.filter((g) => g !== v) : [...prev, v]))
          }
          testid="step-goals"
        />
      )}

      {step === "focus" && (
        <MultiSelectStep
          title="Focus areas"
          hint="Which body areas do you want to work on?"
          items={BODY_AREAS.map((a) => ({ value: a.value, label: a.label }))}
          selected={focusAreas}
          toggle={(v) =>
            setFocusAreas((prev) =>
              prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v],
            )
          }
          testid="step-focus"
        />
      )}

      {step === "avoid" && (
        <MultiSelectStep
          title="Avoid areas"
          hint="Skip stretches that target these. Leave empty if nothing to avoid."
          items={BODY_AREAS.map((a) => ({ value: a.value, label: a.label }))}
          selected={avoidAreas}
          toggle={(v) =>
            setAvoidAreas((prev) =>
              prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v],
            )
          }
          testid="step-avoid"
        />
      )}

      {step === "conditions" && (
        <ConditionsStep
          conditions={conditions}
          setConditions={setConditions}
          showGate={anyCondition}
        />
      )}

      {submitError && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {submitError}
        </p>
      )}

      <div className="mt-auto pt-10 flex items-center gap-3">
        {stepIndex > 0 && (
          <button
            onClick={back}
            disabled={submitting}
            className="flex items-center gap-1 rounded-xl border border-white/15 px-4 py-3 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        )}
        {step !== "conditions" ? (
          <button
            onClick={next}
            className="ml-auto flex items-center gap-2 rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] px-6 py-3 text-white font-semibold transition-all active:scale-95"
            data-testid="next-button"
          >
            Continue
            <ChevronRight className="size-5" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="ml-auto flex items-center gap-2 rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] px-6 py-3 text-white font-semibold transition-all active:scale-95 disabled:opacity-60"
            data-testid="submit-button"
          >
            {submitting ? "Saving..." : "Build My Plan"}
            {!submitting && <ChevronRight className="size-5" />}
          </button>
        )}
      </div>

      <Link
        href="/home"
        className="text-center text-xs text-white/30 hover:text-white/60 transition-colors mt-6"
      >
        Skip for now
      </Link>
    </div>
  )
}

function StepHeader({ stepIndex, total }: { stepIndex: number; total: number }) {
  return (
    <div className="mb-6 flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= stepIndex ? "bg-[#7C5CFC]" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  )
}

function IntroStep() {
  return (
    <div>
      <p className="text-[#7C5CFC] text-sm font-medium mb-2">Welcome to Bendro</p>
      <h1 className="text-3xl font-bold text-white leading-tight mb-4">
        Let&apos;s build your stretching plan
      </h1>
      <p className="text-white/70 text-sm leading-relaxed mb-6">
        A few quick questions — goals, focus areas, and anything to avoid — then
        we&apos;ll put together a starting library tailored to you.
      </p>
      <div
        className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/60 leading-relaxed"
        data-testid="intro-disclaimer"
      >
        Bendro provides general flexibility and mobility content. It is not
        medical advice. Consult a qualified healthcare provider before starting
        any new exercise program.
      </div>
    </div>
  )
}

function MultiSelectStep<T extends string>({
  title,
  hint,
  items,
  selected,
  toggle,
  testid,
}: {
  title: string
  hint: string
  items: Array<{ value: T; label: string; emoji?: string }>
  selected: T[]
  toggle: (v: T) => void
  testid: string
}) {
  return (
    <div data-testid={testid}>
      <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
      <p className="text-white/50 text-sm mb-6">{hint}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => {
          const active = selected.includes(item.value)
          return (
            <button
              key={item.value}
              onClick={() => toggle(item.value)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
                active
                  ? "border-[#7C5CFC] bg-[#7C5CFC]/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {item.emoji && <span className="text-lg">{item.emoji}</span>}
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ConditionsStep({
  conditions,
  setConditions,
  showGate,
}: {
  conditions: Conditions
  setConditions: (c: Conditions) => void
  showGate: boolean
}) {
  const items: Array<{ key: keyof Conditions; label: string }> = [
    { key: "recentInjury", label: "Recent injury (in the last 6 weeks)" },
    { key: "recentSurgery", label: "Surgery in the last 6 months" },
    {
      key: "jointOrSpineCondition",
      label: "Diagnosed condition affecting joint or spine mobility",
    },
    { key: "pregnancy", label: "Currently pregnant or post-partum (< 6 weeks)" },
  ]

  return (
    <div data-testid="step-conditions">
      <h2 className="text-2xl font-bold text-white mb-1">Anything to be mindful of?</h2>
      <p className="text-white/50 text-sm mb-6">
        Yes or no. Your answers aren&apos;t stored — we only remember whether to
        keep things gentle.
      </p>
      <div className="space-y-2">
        {items.map((item) => {
          const value = conditions[item.key]
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-sm text-white/80">{item.label}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setConditions({ ...conditions, [item.key]: false })}
                  aria-pressed={!value}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    !value
                      ? "bg-white/15 text-white"
                      : "bg-transparent text-white/40 hover:text-white/70"
                  }`}
                >
                  No
                </button>
                <button
                  onClick={() => setConditions({ ...conditions, [item.key]: true })}
                  aria-pressed={value}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    value
                      ? "bg-[#7C5CFC] text-white"
                      : "bg-transparent text-white/40 hover:text-white/70"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {showGate && (
        <div
          className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"
          role="alert"
          data-testid="safety-gate"
        >
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Please speak with a healthcare provider before continuing. We&apos;ll
            default your library to gentle routines. You can adjust this later in
            settings.
          </p>
        </div>
      )}
    </div>
  )
}

function LegacyOnboarding() {
  const [selected, setSelected] = useState<Goal[]>([])
  const toggle = (goal: Goal) =>
    setSelected((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    )

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F14] px-4 py-12 max-w-lg mx-auto">
      <div className="mb-8">
        <p className="text-[#7C5CFC] text-sm font-medium mb-2">Welcome to Bend</p>
        <h1 className="text-3xl font-bold text-white leading-tight">
          What are your <br />
          stretch goals?
        </h1>
        <p className="text-white/50 mt-2 text-sm">
          Select all that apply. You can change this later.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-10">
        {GOALS.map((goal) => {
          const meta = GOAL_META[goal]
          const active = selected.includes(goal)
          return (
            <button
              key={goal}
              onClick={() => toggle(goal)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                active
                  ? "border-[#7C5CFC] bg-[#7C5CFC]/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="text-2xl">{meta.emoji}</span>
              <span className="text-sm font-medium">{meta.label}</span>
            </button>
          )
        })}
      </div>
      <Link
        href="/home"
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#7C5CFC] hover:bg-[#6B4EE0] py-4 text-white font-semibold text-base transition-all active:scale-95"
      >
        Build My Plan
        <ChevronRight className="size-5" />
      </Link>
      <Link
        href="/home"
        className="text-center text-sm text-white/30 hover:text-white/50 transition-colors mt-4"
      >
        Skip for now
      </Link>
    </div>
  )
}
