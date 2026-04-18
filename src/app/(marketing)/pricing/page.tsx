import Link from "next/link"
import { Check, X } from "lucide-react"

type Feature = { label: string; free: boolean; premium: boolean }

const FEATURES: Feature[] = [
  { label: "6 system routines", free: true, premium: true },
  { label: "Basic progress tracking", free: true, premium: true },
  { label: "Daily reminders", free: true, premium: true },
  { label: "Stretch library access", free: true, premium: true },
  { label: "Unlimited routines", free: false, premium: true },
  { label: "Custom routine builder", free: false, premium: true },
  { label: "Advanced analytics & charts", free: false, premium: true },
  { label: "Goal-based personalization", free: false, premium: true },
  { label: "Priority support", free: false, premium: true },
  { label: "Early access to new features", free: false, premium: true },
]

export default function PricingPage() {
  return (
    <div className="px-6 py-16 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Simple pricing</h1>
        <p className="text-white/50 text-lg">Start free. Upgrade when you&apos;re ready.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-white/50 mb-2">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-bold text-white">$0</span>
              <span className="text-white/40 mb-1.5">/month</span>
            </div>
            <p className="text-sm text-white/40 mt-2">No credit card required</p>
          </div>
          <Link
            href="/onboarding"
            className="block text-center rounded-xl border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors mb-8"
          >
            Get started free
          </Link>
          <ul className="space-y-3">
            {FEATURES.filter((f) => f.free).map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm text-white/70">
                <Check className="size-4 text-green-400 shrink-0" />
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-[#7C5CFC]/50 bg-[#7C5CFC]/10 p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#7C5CFC] text-white text-xs font-semibold px-4 py-1 rounded-full">
              Most popular
            </span>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-[#7C5CFC] mb-2">Premium</p>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-bold text-white">$9.99</span>
              <span className="text-white/40 mb-1.5">/month</span>
            </div>
            <p className="text-sm text-white/40 mt-2">Cancel anytime</p>
          </div>
          <Link
            href="/onboarding"
            className="block text-center rounded-xl bg-[#7C5CFC] hover:bg-[#6B4EE0] py-3 text-sm font-semibold text-white transition-colors mb-8 shadow-lg shadow-[#7C5CFC]/25"
          >
            Start free trial
          </Link>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm">
                {f.premium ? (
                  <>
                    <Check className="size-4 text-green-400 shrink-0" />
                    <span className="text-white/80">{f.label}</span>
                  </>
                ) : (
                  <>
                    <X className="size-4 text-white/20 shrink-0" />
                    <span className="text-white/30 line-through">{f.label}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-bold text-white mb-2">All plans include</h2>
        <p className="text-white/50 text-sm mb-6">No ads. No data selling. Just stretching.</p>
        <div className="grid grid-cols-2 gap-3 text-sm text-white/60">
          {["Guided audio cues", "Offline access", "iOS & Android ready", "Dark mode"].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Check className="size-4 text-[#7C5CFC] shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
