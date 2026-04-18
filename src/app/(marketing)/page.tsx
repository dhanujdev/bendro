import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Zap, TrendingUp, Calendar } from "lucide-react"
import { auth } from "@/lib/auth"

const FEATURES = [
  {
    icon: Zap,
    title: "Personalized routines",
    description: "Get stretch plans built around your goals — desk relief, better sleep, post-workout recovery, and more.",
  },
  {
    icon: TrendingUp,
    title: "Track your progress",
    description: "See your streaks, total minutes stretched, and improvement over time with beautiful charts.",
  },
  {
    icon: Calendar,
    title: "Build lasting habits",
    description: "Daily reminders and streaks keep you consistent. Even 7 minutes a day makes a real difference.",
  },
]

export default async function LandingPage() {
  const session = await auth()
  if (session?.user?.id) {
    redirect("/home")
  }

  return (
    <>
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 px-4 py-1.5 text-sm text-[#7C5CFC] font-medium mb-6">
          <span className="size-1.5 rounded-full bg-[#7C5CFC] animate-pulse" />
          Now available for free
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-4">
          Daily stretching,{" "}
          <span className="text-[#7C5CFC]">made simple</span>
        </h1>
        <p className="text-xl text-white/50 max-w-lg mb-10">
          Bend helps you build a consistent stretching habit with guided routines tailored to your body and goals.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 rounded-full bg-[#7C5CFC] hover:bg-[#6B4EE0] px-8 py-4 text-white font-semibold text-base transition-all active:scale-95 shadow-lg shadow-[#7C5CFC]/25"
          >
            Start for free
            <ChevronRight className="size-5" />
          </Link>
          <Link
            href="/player/demo"
            className="flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-white/70 font-medium text-base hover:bg-white/5 transition-all"
          >
            Try a demo
          </Link>
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything you need to stretch smarter
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-[#7C5CFC]/30 hover:bg-white/8 transition-all"
            >
              <div className="size-10 rounded-xl bg-[#7C5CFC]/15 flex items-center justify-center mb-4">
                <Icon className="size-5 text-[#7C5CFC]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-white/50 mb-8">Start free, upgrade when you&apos;re ready.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
              <p className="text-sm font-medium text-white/50 mb-1">Free</p>
              <p className="text-4xl font-bold text-white mb-4">$0</p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li>✓ 6 guided routines</li>
                <li>✓ Basic progress tracking</li>
                <li>✓ Daily reminders</li>
              </ul>
              <Link
                href="/onboarding"
                className="block text-center rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Get started
              </Link>
            </div>
            <div className="rounded-2xl border border-[#7C5CFC]/50 bg-[#7C5CFC]/10 p-6 text-left relative">
              <span className="absolute top-4 right-4 text-xs bg-[#7C5CFC] text-white px-2 py-0.5 rounded-full font-medium">
                Popular
              </span>
              <p className="text-sm font-medium text-[#7C5CFC] mb-1">Premium</p>
              <p className="text-4xl font-bold text-white mb-4">
                $9.99
                <span className="text-base font-normal text-white/50">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li>✓ Unlimited routines</li>
                <li>✓ Custom routine builder</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Priority support</li>
              </ul>
              <Link
                href="/pricing"
                className="block text-center rounded-xl bg-[#7C5CFC] hover:bg-[#6B4EE0] py-2.5 text-sm font-medium text-white transition-colors"
              >
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
