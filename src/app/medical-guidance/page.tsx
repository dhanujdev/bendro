import type { Metadata } from "next"
import Link from "next/link"
import { DisclaimerBanner } from "@/components/disclaimer-banner"

export const metadata: Metadata = {
  title: "Medical guidance | Bendro",
  description:
    "When to consult a healthcare provider and how to find qualified help.",
}

export default function MedicalGuidancePage() {
  return (
    <main
      data-testid="medical-guidance-page"
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] text-white"
    >
      <h1 className="text-3xl font-bold">Finding qualified guidance</h1>

      <DisclaimerBanner surface="painPromptHigh" />

      <section className="flex flex-col gap-3 text-white/80 leading-relaxed">
        <p>
          If a stretch caused sharp, persistent, or worsening pain, stop and
          speak with a qualified healthcare provider before continuing. Bendro
          is general flexibility content, not medical care, and it cannot tell
          the difference between normal soreness and an injury that needs
          attention.
        </p>
        <p>Good people to reach out to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Your primary care doctor, who can rule out something serious and
            refer you onward if needed.
          </li>
          <li>
            A licensed physical therapist — they diagnose movement issues and
            build safe return-to-activity plans.
          </li>
          <li>
            A sports medicine physician if the pain is tied to training load.
          </li>
          <li>
            An urgent care clinic or emergency room for sudden severe pain,
            numbness, or loss of function.
          </li>
        </ul>
        <p>
          We will also ease similar stretches in your upcoming recommendations
          so you can rebuild at a pace that feels right.
        </p>
      </section>

      <Link
        href="/home"
        data-testid="medical-guidance-home"
        className="mt-auto inline-flex items-center justify-center rounded-2xl bg-[#7C5CFC] py-4 font-semibold text-white transition-all hover:bg-[#6B4EE0]"
      >
        Back to Home
      </Link>
    </main>
  )
}
