import Link from "next/link"
import { Check, X } from "lucide-react"
import { auth } from "@/lib/auth"
import { getBillingPlans } from "@/config/billing"
import { StartCheckoutButton } from "./_components/start-checkout-button"

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

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What's included in the free plan?",
    a: "You get the six core system routines, progress tracking, streaks, and the full stretch library. No credit card required.",
  },
  {
    q: "What do I unlock with Premium?",
    a: "Unlimited custom routines, a drag-and-drop routine builder, goal-based personalization, advanced analytics, and early access to new features as they ship.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel in one click from Account → Manage billing. You keep Premium until the end of the current billing period; we never bill you again after that.",
  },
  {
    q: "Do you offer refunds?",
    a: "Within the first 14 days of a new subscription, email us and we'll refund you in full, no questions asked. After that, you can cancel anytime but the remaining period is not prorated.",
  },
  {
    q: "How do you handle my data?",
    a: "Pose detection runs entirely on-device — camera frames and landmarks never leave your browser. Only the metadata we explicitly need (progress, streaks, preferences) is sent to our server.",
  },
  {
    q: "Is Bendro medical advice?",
    a: "No. Bendro helps you build a stretching habit and is not a substitute for professional medical advice. Stop and consult a qualified healthcare provider if a movement causes sharp pain, numbness, or injury.",
  },
  {
    q: "Which platforms are supported?",
    a: "Any modern browser on desktop or mobile. Native iOS and Android apps are on the roadmap.",
  },
]

export default async function PricingPage() {
  const session = await auth()
  const signedIn = !!session?.user?.id
  const premiumPriceId = getBillingPlans().premium_monthly.priceId ?? null

  return (
    <div className="px-6 py-16 max-w-5xl mx-auto" data-testid="pricing-page">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Simple pricing</h1>
        <p className="text-white/50 text-lg">
          Start free. Upgrade when you&apos;re ready.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        <div
          data-testid="pricing-plan-free"
          className="rounded-3xl border border-white/10 bg-white/5 p-8"
        >
          <div className="mb-6">
            <p className="text-sm font-medium text-white/50 mb-2">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-bold text-white">$0</span>
              <span className="text-white/40 mb-1.5">/month</span>
            </div>
            <p className="text-sm text-white/40 mt-2">
              No credit card required
            </p>
          </div>
          <Link
            href={signedIn ? "/home" : "/signin?callbackUrl=/home"}
            data-testid="pricing-start-free"
            className="block text-center rounded-xl border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors mb-8"
          >
            {signedIn ? "Back to app" : "Get started free"}
          </Link>
          <ul className="space-y-3">
            {FEATURES.filter((f) => f.free).map((f) => (
              <li
                key={f.label}
                className="flex items-center gap-3 text-sm text-white/70"
              >
                <Check className="size-4 text-green-400 shrink-0" />
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div
          data-testid="pricing-plan-premium"
          className="rounded-3xl border border-[#7C5CFC]/50 bg-[#7C5CFC]/10 p-8 relative"
        >
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
          <div className="mb-8">
            <StartCheckoutButton
              signedIn={signedIn}
              priceId={premiumPriceId}
              label={signedIn ? "Upgrade to Premium" : "Sign in to upgrade"}
            />
          </div>
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
                    <span className="text-white/30 line-through">
                      {f.label}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        data-testid="pricing-includes"
        className="rounded-2xl border border-white/10 bg-white/5 p-8 max-w-2xl mx-auto text-center mb-16"
      >
        <h2 className="text-xl font-bold text-white mb-2">All plans include</h2>
        <p className="text-white/50 text-sm mb-6">
          No ads. No data selling. Just stretching.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm text-white/60">
          {["Guided audio cues", "Offline access", "iOS & Android ready", "Dark mode"].map(
            (item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="size-4 text-[#7C5CFC] shrink-0" />
                {item}
              </div>
            ),
          )}
        </div>
      </div>

      <section
        data-testid="pricing-faq"
        className="max-w-2xl mx-auto"
        aria-labelledby="pricing-faq-heading"
      >
        <h2
          id="pricing-faq-heading"
          className="text-2xl font-bold text-white mb-6 text-center"
        >
          Frequently asked questions
        </h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              data-testid="pricing-faq-item"
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 open:border-[#7C5CFC]/30"
            >
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-white">
                <span>{item.q}</span>
                <span
                  aria-hidden
                  className="ml-4 transition-transform group-open:rotate-45 text-white/40"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
