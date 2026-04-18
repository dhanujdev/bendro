import "server-only"
import type { EventName, EventProps } from "./analytics"

/**
 * Server-only PostHog capture.
 *
 * Guarded by `server-only` so an accidental client import crashes the
 * build instead of bundling `posthog-node` (which references
 * `node:fs`). No-op when NEXT_PUBLIC_POSTHOG_KEY / POSTHOG_KEY is unset.
 */

interface ServerPostHogClient {
  capture: (args: {
    distinctId: string
    event: string
    properties: EventProps
  }) => void
}

let client: ServerPostHogClient | null = null
let initAttempted = false

async function getClient(): Promise<ServerPostHogClient | null> {
  if (client) return client
  if (initAttempted) return null
  initAttempted = true

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.POSTHOG_KEY
  if (!key) return null

  const mod = await import("posthog-node")
  client = new mod.PostHog(key, {
    host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  })
  return client
}

export async function captureServerEvent(
  name: EventName,
  props: EventProps,
): Promise<void> {
  const ph = await getClient()
  if (!ph) return
  const distinctId = String(props.userId ?? props.distinctId ?? "anon")
  try {
    ph.capture({ distinctId, event: name, properties: props })
  } catch (err) {
    console.warn("[analytics] server capture failed", err)
  }
}
