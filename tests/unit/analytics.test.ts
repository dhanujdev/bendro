import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { trackEvent } from "@/lib/analytics"

describe("trackEvent", () => {
  let originalWindow: typeof globalThis.window | undefined

  beforeEach(() => {
    originalWindow = globalThis.window
    vi.spyOn(console, "info").mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore the environment between tests so the server branch and the
    // client branch each see a clean slate.
    if (originalWindow === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window
    } else {
      globalThis.window = originalWindow
    }
    vi.restoreAllMocks()
  })

  it("server branch: logs to console.info with event name and props", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window
    const spy = vi.spyOn(console, "info")
    trackEvent("upgrade.clicked", { source: "library" })
    expect(spy).toHaveBeenCalledWith(
      "[event] upgrade.clicked",
      JSON.stringify({ source: "library" }),
    )
  })

  it("client branch: pushes event onto window.__bendroEvents", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {} as typeof window
    trackEvent("portal.opened", { ref: "account-page" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (globalThis as any).window.__bendroEvents as Array<{
      name: string
      props: Record<string, unknown>
    }>
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe("portal.opened")
    expect(events[0].props).toEqual({ ref: "account-page" })
  })

  it("defaults props to {} when omitted", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {} as typeof window
    trackEvent("premium.viewed")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (globalThis as any).window.__bendroEvents as Array<{
      props: Record<string, unknown>
    }>
    expect(events[0].props).toEqual({})
  })

  it("appends subsequent events rather than overwriting", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {} as typeof window
    trackEvent("upgrade.clicked")
    trackEvent("upgrade.completed")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (globalThis as any).window.__bendroEvents as Array<{
      name: string
    }>
    expect(events.map((e) => e.name)).toEqual([
      "upgrade.clicked",
      "upgrade.completed",
    ])
  })
})
