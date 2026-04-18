import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { hasDatabaseUrl } from "@/db"

const original = process.env.DATABASE_URL

describe("hasDatabaseUrl", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL
  })

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = original
  })

  it("returns false when DATABASE_URL is unset", () => {
    expect(hasDatabaseUrl()).toBe(false)
  })

  it("returns false when DATABASE_URL is an empty string", () => {
    process.env.DATABASE_URL = ""
    expect(hasDatabaseUrl()).toBe(false)
  })

  it("returns true when DATABASE_URL is set to a non-empty value", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/bendro"
    expect(hasDatabaseUrl()).toBe(true)
  })
})
