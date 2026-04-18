/**
 * Telemetry stub — a single call site for product events so that when an
 * analytics stack lands (PostHog / Segment / Mixpanel), swapping the
 * implementation is a one-module change.
 *
 * The wrapper deliberately avoids any browser / PII collection today:
 *   - server-side: logs the event to stderr so structured log ingestion
 *     (Vercel / Datadog) can pick it up without extra wiring.
 *   - client-side: pushes to `window.__bendroEvents` for future replay
 *     by whichever analytics SDK we install.
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

export function trackEvent(name: EventName, props: EventProps = {}): void {
  const at = Date.now()

  if (typeof window === "undefined") {
    console.info(`[event] ${name}`, JSON.stringify(props))
    return
  }

  window.__bendroEvents = window.__bendroEvents ?? []
  window.__bendroEvents.push({ name, props, at })
}
