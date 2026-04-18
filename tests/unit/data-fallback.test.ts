import { describe, expect, it } from "vitest"
import { isFallbackError, shortReason } from "@/lib/data-fallback"

describe("isFallbackError", () => {
  it("accepts a missing DATABASE_URL error", () => {
    expect(isFallbackError(new Error("DATABASE_URL is not set"))).toBe(true)
  })

  it.each([
    "getaddrinfo ENOTFOUND db.neon.tech",
    "connect ECONNREFUSED 127.0.0.1:5432",
    "ETIMEDOUT",
    "fetch failed",
    "connect ENOTFOUND neon-host",
  ])("accepts connection-level failure: %s", (msg) => {
    expect(isFallbackError(new Error(msg))).toBe(true)
  })

  it("rejects Zod / business validation errors", () => {
    expect(
      isFallbackError(new Error("Invalid input: completionPct must be 0–100")),
    ).toBe(false)
  })

  it("rejects unique-constraint violations", () => {
    expect(
      isFallbackError(
        new Error(
          "duplicate key value violates unique constraint \"routines_slug_key\"",
        ),
      ),
    ).toBe(false)
  })

  it("rejects non-Error throws (string, number, null)", () => {
    expect(isFallbackError("DATABASE_URL is not set")).toBe(false)
    expect(isFallbackError(null)).toBe(false)
    expect(isFallbackError(42)).toBe(false)
  })

  it("matches case-insensitively on DATABASE_URL", () => {
    expect(isFallbackError(new Error("database_url is not set"))).toBe(true)
  })
})

describe("shortReason", () => {
  it("collapses DATABASE_URL-not-set to a stable label", () => {
    expect(shortReason("DATABASE_URL is not set. ...extra context...")).toBe(
      "DATABASE_URL not set",
    )
  })

  it("collapses connection-level failures to 'db unreachable'", () => {
    expect(shortReason("ENOTFOUND some-host")).toBe("db unreachable")
    expect(shortReason("fetch failed")).toBe("db unreachable")
    expect(shortReason("ECONNREFUSED 127.0.0.1:5432")).toBe("db unreachable")
    expect(shortReason("ETIMEDOUT after 30000ms")).toBe("db unreachable")
  })

  it("truncates other messages to 80 chars so logs stay scannable", () => {
    const long = "a".repeat(200)
    expect(shortReason(long)).toHaveLength(80)
  })

  it("returns short messages verbatim", () => {
    expect(shortReason("something weird")).toBe("something weird")
  })
})
