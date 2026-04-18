import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service — Bendro",
  description:
    "The terms under which you may use Bendro. Stretching guidance only; not medical advice.",
}

const LAST_UPDATED = "April 18, 2026"

export default function TermsPage() {
  return (
    <article
      data-testid="legal-terms-page"
      className="max-w-2xl mx-auto px-6 py-16 text-white"
    >
      <p className="text-xs uppercase tracking-wider text-white/40">Legal</p>
      <h1 className="text-3xl font-bold mt-2 mb-2">Terms of Service</h1>
      <p className="text-sm text-white/50 mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-sm text-white/70 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            1. Acceptance
          </h2>
          <p>
            By creating an account or using Bendro you agree to these terms.
            If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            2. What Bendro is
          </h2>
          <p>
            Bendro is a stretching habit tool. It provides guided routines,
            progress tracking, and optional on-device pose feedback. Bendro
            is <strong>not</strong> a medical device and does not provide
            medical advice, diagnosis, or treatment. Consult a qualified
            healthcare provider before beginning any new exercise program,
            and stop immediately if you feel sharp pain, numbness, or
            anything that doesn&apos;t feel right.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            3. Accounts
          </h2>
          <p>
            You are responsible for keeping your account credentials
            confidential and for all activity under your account. You must
            be at least 13 years old to use Bendro (16 in the EU/UK).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            4. Subscriptions and billing
          </h2>
          <p>
            Premium subscriptions renew automatically until you cancel. You
            can cancel any time from Account → Manage billing; your plan
            stays active until the end of the current billing period. New
            subscribers are eligible for a full refund within 14 days by
            emailing support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            5. Acceptable use
          </h2>
          <p>
            Don&apos;t abuse the service: no reverse engineering, scraping,
            automated mass account creation, or using Bendro to harass or
            deceive other users. We may suspend or terminate accounts that
            violate this clause.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            6. Limitation of liability
          </h2>
          <p>
            Bendro is provided &quot;as is&quot; without warranty. To the
            maximum extent permitted by law, Bendro is not liable for any
            indirect, incidental, or consequential damages arising from your
            use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            7. Changes
          </h2>
          <p>
            We may update these terms. Material changes will be announced
            at least 14 days before they take effect. Continuing to use the
            service after that date constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            8. Contact
          </h2>
          <p>
            Questions about these terms?{" "}
            <a
              className="text-[#7C5CFC] underline"
              href="mailto:hello@bendro.app"
            >
              hello@bendro.app
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 text-sm">
        <Link href="/legal/privacy" className="text-[#7C5CFC] hover:underline">
          Privacy policy →
        </Link>
      </div>
    </article>
  )
}
