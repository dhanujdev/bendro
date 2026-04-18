import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import type { Disclaimer, DisclaimerSurface } from "@/lib/disclaimers"
import { getDisclaimer } from "@/lib/disclaimers"

/**
 * Renders a mandated disclaimer from `src/lib/disclaimers.ts`.
 *
 * Every user-facing surface listed in `.claude/rules/HEALTH_RULES.md
 * §Mandatory Disclosures` renders this component instead of inlining
 * copy. The severity prop (neutral / caution / warn) drives a Tailwind
 * variant so a "Listen to your body" reminder and a "consult a
 * healthcare provider" warning don't look identical.
 */
export function DisclaimerBanner({
  surface,
  disclaimer,
  className,
}: {
  /** Pick a surface — the component looks up the copy from the registry. */
  surface?: DisclaimerSurface
  /** Alternatively, pass a resolved Disclaimer (e.g. painPromptForRating(r)). */
  disclaimer?: Disclaimer
  className?: string
}) {
  const d = disclaimer ?? (surface ? getDisclaimer(surface) : null)
  if (!d) return null

  const tone =
    d.severity === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : d.severity === "caution"
        ? "border-amber-500/20 bg-amber-500/5 text-amber-50/90"
        : "border-white/10 bg-white/5 text-white/60"

  const Icon = d.severity === "warn" || d.severity === "caution" ? AlertTriangle : null

  return (
    <div
      role={d.severity === "warn" ? "alert" : undefined}
      data-testid={`disclaimer-${d.id}`}
      data-severity={d.severity}
      className={`rounded-xl border p-4 text-xs leading-relaxed ${tone} ${className ?? ""}`.trim()}
    >
      <div className="flex items-start gap-3">
        {Icon && <Icon className="size-4 shrink-0 mt-0.5" />}
        <div className="flex-1">
          <p>{d.body}</p>
          {d.cta && (
            <Link
              href={d.cta.href}
              data-testid={`disclaimer-${d.id}-cta`}
              className="mt-2 inline-flex items-center text-xs font-semibold underline underline-offset-2"
            >
              {d.cta.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
