/**
 * Unit tests for src/app/sitemap.ts and src/app/robots.ts.
 *
 * We treat these as small pure functions: given env, return a static
 * shape. The tests guard the public surface (which URLs we advertise
 * to search engines) against accidental regressions — e.g. someone
 * stops disallowing /api/ or /account, or the sitemap silently drops
 * /pricing.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import sitemap from "@/app/sitemap"
import robots from "@/app/robots"

describe("sitemap()", () => {
  const ORIGINAL_URL = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://bendro.example"
  })
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_URL
  })

  it("includes every public marketing route", () => {
    const entries = sitemap()
    const paths = entries.map((e) => e.url.replace("https://bendro.example", ""))
    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/pricing",
        "/signin",
        "/legal/terms",
        "/legal/privacy",
      ]),
    )
  })

  it("uses NEXT_PUBLIC_APP_URL as the base and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://bendro.example///"
    const entries = sitemap()
    expect(entries[0].url.startsWith("https://bendro.example/")).toBe(true)
    // No double slashes in the path segment
    for (const e of entries) {
      const afterScheme = e.url.replace(/^https?:\/\//, "")
      expect(afterScheme).not.toContain("//")
    }
  })

  it("assigns priority 1.0 to the landing page and lower to legal", () => {
    const entries = sitemap()
    const byPath = Object.fromEntries(
      entries.map((e) => [
        e.url.replace("https://bendro.example", ""),
        e.priority,
      ]),
    )
    expect(byPath["/"]).toBe(1.0)
    expect(byPath["/legal/terms"]).toBeLessThan(byPath["/"]!)
    expect(byPath["/legal/privacy"]).toBeLessThan(byPath["/"]!)
  })

  it("falls back to the production host when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const entries = sitemap()
    expect(entries[0].url.startsWith("https://bendro.app")).toBe(true)
  })
})

describe("robots()", () => {
  it("disallows every signed-in-only route", () => {
    const r = robots()
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules
    const disallow = rule.disallow as string[]
    for (const path of [
      "/api/",
      "/home",
      "/library",
      "/player",
      "/account",
      "/settings",
      "/onboarding",
      "/medical-guidance",
    ]) {
      expect(disallow).toContain(path)
    }
  })

  it("allows the marketing funnel", () => {
    const r = robots()
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules
    const allow = rule.allow as string[]
    expect(allow).toEqual(expect.arrayContaining(["/", "/pricing", "/signin"]))
  })

  it("advertises the sitemap URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://bendro.example"
    const r = robots()
    expect(r.sitemap).toBe("https://bendro.example/sitemap.xml")
  })
})
