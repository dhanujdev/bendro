import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Bendro",
  description:
    "How Bendro handles your data. Pose detection runs on-device; frames and landmarks never leave your browser.",
}

const LAST_UPDATED = "April 18, 2026"

export default function PrivacyPage() {
  return (
    <article
      data-testid="legal-privacy-page"
      className="max-w-2xl mx-auto px-6 py-16 text-white"
    >
      <p className="text-xs uppercase tracking-wider text-white/40">Legal</p>
      <h1 className="text-3xl font-bold mt-2 mb-2">Privacy Policy</h1>
      <p className="text-sm text-white/50 mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-sm text-white/70 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            1. What we collect
          </h2>
          <p>
            We collect only the data we need to run the service: your email
            and name from the sign-in provider, your stretching goals and
            preferences, and session metadata (which routine, how long, when).
            Subscription state is synced from Stripe. We do not sell any of
            this to anyone.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            2. Camera and pose data stay on your device
          </h2>
          <p>
            Bendro&apos;s camera-mode runs MediaPipe pose detection entirely
            in your browser. Camera frames, pose landmarks, and derived
            angles never leave your device — we cannot see them and do not
            store them. This is an architectural invariant documented in
            our public <code>SECURITY_RULES.md</code>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            3. Pre-existing-condition questions
          </h2>
          <p>
            During onboarding we ask four yes/no questions about recent
            injury, surgery, pregnancy, and chronic conditions. We never
            persist the individual answers — we derive a single
            <code> safety_flag </code> boolean and discard the raw answers
            server-side. That flag is used to default your library to
            gentle routines.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            4. Authentication
          </h2>
          <p>
            We use Auth.js with Google OAuth and passwordless email
            (Resend). We do not store passwords. OAuth tokens are held
            server-side in our database and rotated per provider policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            5. Payment processing
          </h2>
          <p>
            Payments are processed by Stripe. We store your Stripe customer
            id and subscription status; we never see your card number. See{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-[#7C5CFC] underline"
            >
              Stripe&apos;s privacy policy
            </a>{" "}
            for their handling.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            6. Your rights
          </h2>
          <p>
            You can request an export or deletion of your data at any time
            by emailing{" "}
            <a
              className="text-[#7C5CFC] underline"
              href="mailto:privacy@bendro.app"
            >
              privacy@bendro.app
            </a>
            . We respond within 30 days. EU/UK residents have rights under
            GDPR/UK-GDPR; California residents have rights under CCPA.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            7. Analytics
          </h2>
          <p>
            We emit a small number of named product events
            (<code>upgrade.clicked</code>, <code>portal.opened</code>, etc.)
            for funnel analysis. These never contain PII — only the event
            name and anonymous context like source route. No third-party
            analytics SDK is loaded today.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">
            8. Contact
          </h2>
          <p>
            Privacy questions?{" "}
            <a
              className="text-[#7C5CFC] underline"
              href="mailto:privacy@bendro.app"
            >
              privacy@bendro.app
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 text-sm">
        <Link href="/legal/terms" className="text-[#7C5CFC] hover:underline">
          ← Terms of Service
        </Link>
      </div>
    </article>
  )
}
