import { redirect } from "next/navigation"
import Link from "next/link"
import { Crown, Sparkles, ExternalLink } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSubscriptionStatus } from "@/services/billing"
import { OpenPortalButton } from "./_components/open-portal-button"

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const STATUS_LABEL: Record<string, string> = {
  free: "Free plan",
  active: "Premium (active)",
  trialing: "Premium (trial)",
  past_due: "Premium (payment past due)",
  canceled: "Canceled",
}

const STATUS_TONE: Record<string, string> = {
  free: "text-white/70 bg-white/5",
  active: "text-[#B4A0FF] bg-[#7C5CFC]/15",
  trialing: "text-[#B4A0FF] bg-[#7C5CFC]/15",
  past_due: "text-amber-300 bg-amber-500/10",
  canceled: "text-white/60 bg-white/5",
}

export default async function AccountPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/account")
  }

  const raw = await searchParams
  const upgradePrompt = raw.upgrade === "1"
  const subscriptionStatus = await getSubscriptionStatus(session.user.id)
  const isPremium =
    subscriptionStatus === "active" || subscriptionStatus === "trialing"
  const label = STATUS_LABEL[subscriptionStatus] ?? subscriptionStatus
  const tone = STATUS_TONE[subscriptionStatus] ?? "text-white/70 bg-white/5"

  return (
    <div
      data-testid="account-page"
      className="mx-auto flex min-h-full max-w-lg flex-col px-4 py-6 text-white"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-1 text-sm text-white/50">
          Manage your Bendro subscription.
        </p>
      </header>

      {upgradePrompt && !isPremium && (
        <div
          data-testid="account-upgrade-banner"
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-[#7C5CFC]/40 bg-[#7C5CFC]/10 p-4 text-sm"
        >
          <Sparkles className="size-5 shrink-0 text-[#B4A0FF]" />
          <div className="flex-1">
            <p className="font-semibold text-white">Unlock premium routines</p>
            <p className="mt-1 text-white/70">
              You tried to open a premium routine. Upgrade to reach the full
              library, including AI-personalised plans.
            </p>
          </div>
        </div>
      )}

      <section
        data-testid="account-plan-card"
        className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <div className="flex items-center gap-3">
          <Crown
            className={`size-5 ${isPremium ? "text-[#7C5CFC]" : "text-white/30"}`}
          />
          <p className="text-sm font-semibold text-white">Plan</p>
          <span
            data-testid="account-plan-status"
            data-status={subscriptionStatus}
            className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${tone}`}
          >
            {label}
          </span>
        </div>
      </section>

      {isPremium ? (
        <OpenPortalButton />
      ) : (
        <Link
          href="/pricing"
          data-testid="account-upgrade-cta"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#7C5CFC] py-4 font-semibold text-white transition-all hover:bg-[#6B4EE0] active:scale-95"
        >
          <Crown className="size-5" />
          Upgrade to Premium
        </Link>
      )}

      <p className="mt-6 text-xs text-white/40">
        Premium is billed by Stripe. Manage or cancel anytime from the Stripe
        portal — changes sync back here automatically.
        <ExternalLink className="ml-1 inline size-3" />
      </p>
    </div>
  )
}
