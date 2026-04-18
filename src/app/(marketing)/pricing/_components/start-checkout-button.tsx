"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

interface Props {
  signedIn: boolean
  priceId: string | null
  label: string
}

/**
 * Pricing-page Premium CTA.
 *
 * Three states:
 *   1. signed-out → navigate to `/signin?callbackUrl=/pricing` so the
 *      user returns here after authenticating.
 *   2. signed-in + configured priceId → POST to `/api/billing/checkout`,
 *      redirect to the hosted Stripe URL.
 *   3. no priceId configured → disabled button + explanatory tooltip.
 *
 * Emits `upgrade.clicked` on every press (including the signed-out case
 * so we can measure funnel fallout).
 */
export function StartCheckoutButton({ signedIn, priceId, label }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const disabled = !priceId

  function onClick() {
    setError(null)
    trackEvent("upgrade.clicked", {
      source: "pricing",
      signedIn,
      hasPriceId: !!priceId,
    })

    if (!signedIn) {
      window.location.href = "/signin?callbackUrl=/pricing"
      return
    }
    if (!priceId) return

    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ priceId }),
        })
        const body = (await res.json()) as
          | { data: { url: string } }
          | { error: { code: string; message: string } }
        if (!res.ok || !("data" in body)) {
          const message =
            "error" in body
              ? body.error.message
              : "We couldn't start checkout."
          setError(message)
          return
        }
        window.location.href = body.data.url
      } catch {
        setError("Network error — please try again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        data-testid="pricing-start-checkout"
        data-signed-in={signedIn ? "true" : "false"}
        data-has-price-id={priceId ? "true" : "false"}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4EE0] disabled:opacity-60 disabled:cursor-not-allowed py-3 text-sm font-semibold text-white transition-colors shadow-lg shadow-[#7C5CFC]/25"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {label}
      </button>
      {disabled && (
        <p
          data-testid="pricing-unavailable-note"
          className="text-center text-xs text-white/40"
        >
          Premium checkout is not configured on this environment yet.
        </p>
      )}
      {error && (
        <p
          role="alert"
          data-testid="pricing-checkout-error"
          className="text-center text-xs text-amber-300"
        >
          {error}
        </p>
      )}
    </div>
  )
}
