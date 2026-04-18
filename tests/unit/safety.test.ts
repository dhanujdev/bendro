import { describe, it, expect } from "vitest"
import {
  PAIN_HIGH_THRESHOLD,
  PAIN_MEDIUM_THRESHOLD,
  classifyPainRating,
  sessionHadHighPain,
} from "@/services/safety"

describe("classifyPainRating()", () => {
  it("returns 'low' for 0–3", () => {
    for (const r of [0, 1, 2, 3]) expect(classifyPainRating(r)).toBe("low")
  })

  it("returns 'medium' for 4–6", () => {
    for (const r of [4, 5, 6]) expect(classifyPainRating(r)).toBe("medium")
  })

  it("returns 'high' for 7–10", () => {
    for (const r of [7, 8, 9, 10]) expect(classifyPainRating(r)).toBe("high")
  })

  it("treats non-finite and negative inputs as 'low' (defensive)", () => {
    expect(classifyPainRating(Number.NaN)).toBe("low")
    expect(classifyPainRating(Number.POSITIVE_INFINITY)).toBe("low")
    expect(classifyPainRating(-1)).toBe("low")
  })

  it("thresholds match HEALTH_RULES table", () => {
    expect(PAIN_MEDIUM_THRESHOLD).toBe(4)
    expect(PAIN_HIGH_THRESHOLD).toBe(7)
  })
})

describe("sessionHadHighPain()", () => {
  it("returns false for empty / null / undefined feedback", () => {
    expect(sessionHadHighPain(undefined)).toBe(false)
    expect(sessionHadHighPain(null)).toBe(false)
    expect(sessionHadHighPain({})).toBe(false)
  })

  it("returns false when all ratings are below the high threshold", () => {
    expect(sessionHadHighPain({ a: 2, b: 4, c: 6 })).toBe(false)
  })

  it("returns true when ANY rating is in the high tier", () => {
    expect(sessionHadHighPain({ a: 2, b: 7 })).toBe(true)
    expect(sessionHadHighPain({ a: 10 })).toBe(true)
  })

  it("ignores malformed ratings without crashing", () => {
    expect(sessionHadHighPain({ a: Number.NaN, b: 3 })).toBe(false)
  })
})
