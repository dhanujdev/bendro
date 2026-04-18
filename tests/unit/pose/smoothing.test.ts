import { describe, it, expect } from "vitest"
import {
  DEFAULT_MAX_ANGULAR_VELOCITY,
  velocityClampedSlerpT,
} from "@/lib/pose/smoothing"

describe("velocityClampedSlerpT", () => {
  it("returns 0 when angular distance is non-positive", () => {
    expect(velocityClampedSlerpT(0, 0.4, 8, 0.033)).toBe(0)
    expect(velocityClampedSlerpT(-0.5, 0.4, 8, 0.033)).toBe(0)
  })

  it("returns 0 when dt is non-positive", () => {
    expect(velocityClampedSlerpT(0.2, 0.4, 8, 0)).toBe(0)
    expect(velocityClampedSlerpT(0.2, 0.4, 8, -0.01)).toBe(0)
  })

  it("returns 0 when alpha is non-positive", () => {
    expect(velocityClampedSlerpT(0.2, 0, 8, 0.033)).toBe(0)
  })

  it("returns 0 when max velocity is non-positive", () => {
    expect(velocityClampedSlerpT(0.2, 0.4, 0, 0.033)).toBe(0)
  })

  it("rejects NaN / Infinity inputs (defensive)", () => {
    expect(velocityClampedSlerpT(Number.NaN, 0.4, 8, 0.033)).toBe(0)
    expect(velocityClampedSlerpT(0.2, Number.NaN, 8, 0.033)).toBe(0)
    expect(velocityClampedSlerpT(0.2, 0.4, Number.POSITIVE_INFINITY, 0.033)).toBe(0)
    expect(velocityClampedSlerpT(0.2, 0.4, 8, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it("returns the base alpha when the velocity cap is loose enough", () => {
    // distance = 0.1 rad, maxStep = 8 * 0.033 = 0.264 rad → velocity cap = 1
    // alpha = 0.4 is the binding constraint
    expect(velocityClampedSlerpT(0.1, 0.4, 8, 0.033)).toBeCloseTo(0.4, 5)
  })

  it("clamps slerp t below base alpha when the velocity cap is tight", () => {
    // distance = 2 rad, maxStep = 8 * 0.033 = 0.264 rad → velocity cap = 0.132
    // alpha = 0.4 is loose; velocity clamp wins
    const t = velocityClampedSlerpT(2, 0.4, 8, 0.033)
    expect(t).toBeLessThan(0.4)
    expect(t).toBeCloseTo(0.132, 3)
  })

  it("caps slerp t at 1 (never allows overshoot)", () => {
    // huge dt + velocity → velocityT would exceed 1; we cap
    const t = velocityClampedSlerpT(0.05, 1, 100, 10)
    expect(t).toBeLessThanOrEqual(1)
    expect(t).toBe(1)
  })

  it("caps at base alpha even when both (alpha, velocity) are <= 1", () => {
    // alpha 0.3 < velocity cap 0.5 → alpha wins
    expect(velocityClampedSlerpT(0.1, 0.3, 1.5, 0.033)).toBeCloseTo(0.3, 5)
  })

  it("caps at velocity t when velocity cap < alpha", () => {
    // alpha 0.8 > velocity cap 0.33 → velocity wins
    const t = velocityClampedSlerpT(0.1, 0.8, 1, 0.033)
    expect(t).toBeCloseTo(0.33, 2)
  })

  it("exports a sensible default max angular velocity", () => {
    expect(DEFAULT_MAX_ANGULAR_VELOCITY).toBeGreaterThan(0)
    // Between 1 and 20 rad/sec is a reasonable window for humanoid limbs.
    expect(DEFAULT_MAX_ANGULAR_VELOCITY).toBeGreaterThanOrEqual(1)
    expect(DEFAULT_MAX_ANGULAR_VELOCITY).toBeLessThanOrEqual(20)
  })

  it("scales the cap linearly with dt (shorter frame = tighter cap)", () => {
    // Same distance, same velocity, half dt → half the allowed step
    const t1 = velocityClampedSlerpT(1, 1, 10, 0.033)
    const t2 = velocityClampedSlerpT(1, 1, 10, 0.0165)
    expect(t2).toBeCloseTo(t1 / 2, 4)
  })
})
