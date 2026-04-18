"use client"

import { useState, useTransition } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

export function OpenPortalButton() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function openPortal() {
    setError(null)
    trackEvent("portal.opened", { source: "account" })
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/portal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
        const body = (await res.json()) as
          | { data: { url: string } }
          | { error: { code: string; message: string } }
        if (!res.ok || !("data" in body)) {
          const message =
            "error" in body
              ? body.error.message
              : "We couldn't open the billing portal."
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
        onClick={openPortal}
        disabled={pending}
        data-testid="account-open-portal"
        data-pending={pending ? "true" : "false"}
        className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-4 font-semibold text-white transition-all hover:bg-white/15 active:scale-95 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <ExternalLink className="size-5" />
        )}
        Manage billing
      </button>
      {error && (
        <p
          data-testid="account-portal-error"
          role="alert"
          className="text-sm text-amber-300"
        >
          {error}
        </p>
      )}
    </div>
  )
}
