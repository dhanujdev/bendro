/**
 * Telemetry — single call site for client product events.
 *
 * This module is bundle-safe for Client Components. It never imports
 * `posthog-node`. Server-side capture (from RSC or API routes) must
 * import `./analytics-server.ts` directly instead.
 *
 * Client routing: posthog-js when `NEXT_PUBLIC_POSTHOG_KEY` is set,
 * otherwise pushes to `window.__bendroEvents` for test replay. Falls
 * back to a `console.info` line server-side so events called from RSC
 * still show up in Vercel logs.
 *
 * Event names follow `snake_case.verb` (e.g. `upgrade.clicked`). Keep
 * them stable — renaming breaks downstream dashboards.
 */

export type EventName =
  | "upgrade.clicked"
  | "upgrade.completed"
  | "portal.opened"
  | "premium.viewed"
  | "premium.locked_clicked"

export interface EventProps {
  [key: string]: string | number | boolean | null | undefined
}

declare global {
  interface Window {
    __bendroEvents?: Array<{
      name: EventName
      props: EventProps
      at: number
    }>
  }
}

interface ClientPostHog {
  capture: (name: string, props: EventProps) => void
}

let clientPosthog: ClientPostHog | null = null
let clientPosthogInitAttempted = false

async function getClientPosthog(): Promise<ClientPostHog | null> {
  if (clientPosthog) return clientPosthog
  if (clientPosthogInitAttempted) return null
  clientPosthogInitAttempted = true

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  const mod = await import("posthog-js")
  const ph = mod.default
  ph.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: false,
    persistence: "localStorage",
  })
  clientPosthog = { capture: (n, p) => ph.capture(n, p) }
  return clientPosthog
}

/**
 * Fire-and-forget emit. Never throws; logs on failure so a broken
 * analytics SDK cannot break a user flow.
 */
export function trackEvent(name: EventName, props: EventProps = {}): void {
  const at = Date.now()

  if (typeof window === "undefined") {
    // Server-side callers should import `./analytics-server.ts` directly
    // for PostHog capture. Keeping the server branch bundler-safe means
    // posthog-node (with `node:fs`) never ends up in the client bundle.
    console.info(`[event] ${name}`, JSON.stringify(props))
    return
  }

  window.__bendroEvents = window.__bendroEvents ?? []
  window.__bendroEvents.push({ name, props, at })
  void getClientPosthog().then((ph) => {
    if (!ph) return
    try {
      ph.capture(name, props)
    } catch (err) {
      console.warn("[analytics] client capture failed", err)
    }
  })
}
