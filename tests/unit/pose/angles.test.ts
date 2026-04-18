import { describe, expect, it } from "vitest"
import {
  angleAtJoint,
  isReliable,
  VISIBILITY_THRESHOLD,
  type Landmark,
} from "@/lib/pose/angles"

const p = (x: number, y: number, z?: number, visibility?: number): Landmark => ({
  x,
  y,
  ...(z !== undefined ? { z } : {}),
  ...(visibility !== undefined ? { visibility } : {}),
})

describe("angleAtJoint (2D)", () => {
  it("returns ~180° for a straight limb (hip–knee–ankle in line)", () => {
    // Vertical line, b in the middle.
    const a = p(0, 0)
    const b = p(0, 1)
    const c = p(0, 2)
    expect(angleAtJoint(a, b, c)).toBeCloseTo(180, 5)
  })

  it("returns 90° for a right-angle bend", () => {
    // a is directly above b, c is directly to the right of b.
    const a = p(0, 0)
    const b = p(0, 1)
    const c = p(1, 1)
    expect(angleAtJoint(a, b, c)).toBeCloseTo(90, 5)
  })

  it("returns 60° for an equilateral-triangle vertex", () => {
    // b at origin, a and c separated by 60° on the unit circle.
    const a = p(1, 0)
    const b = p(0, 0)
    const c = p(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3))
    expect(angleAtJoint(a, b, c)).toBeCloseTo(60, 5)
  })

  it("returns ~0° when the two rays overlap", () => {
    const a = p(1, 1)
    const b = p(0, 0)
    const c = p(2, 2)
    expect(angleAtJoint(a, b, c)).toBeCloseTo(0, 5)
  })

  it("returns NaN when a coincides with b (zero-length vector)", () => {
    const a = p(0, 0)
    const b = p(0, 0)
    const c = p(1, 0)
    expect(angleAtJoint(a, b, c)).toBeNaN()
  })

  it("returns NaN when c coincides with b (zero-length vector)", () => {
    const a = p(1, 0)
    const b = p(0, 0)
    const c = p(0, 0)
    expect(angleAtJoint(a, b, c)).toBeNaN()
  })
})

describe("angleAtJoint (3D)", () => {
  it("uses z when present on all three landmarks", () => {
    // a along +y, c along +z, b at origin → 90°.
    const a = p(0, 1, 0)
    const b = p(0, 0, 0)
    const c = p(0, 0, 1)
    expect(angleAtJoint(a, b, c)).toBeCloseTo(90, 5)
  })

  it("falls back to 2D when any landmark is missing z", () => {
    // If 3D were used, the +y vs +z rays would be 90° apart.
    // In 2D-only, (0,1) and (0,0) collapse — c becomes zero-length in XY,
    // so we expect NaN. That proves z was ignored.
    const a = p(0, 1, 0)
    const b = p(0, 0, 0)
    const c = p(0, 0) // no z
    expect(angleAtJoint(a, b, c)).toBeNaN()
  })

  it("gives the same result as 2D when z is identical on all three", () => {
    const a2d = angleAtJoint(p(0, 0), p(0, 1), p(1, 1))
    const a3d = angleAtJoint(p(0, 0, 5), p(0, 1, 5), p(1, 1, 5))
    expect(a3d).toBeCloseTo(a2d, 5)
  })

  it("is clamped — slightly-over-1 cosine does not produce NaN", () => {
    // Use points that would numerically exceed 1 under floating-point.
    const a = p(1e-9, 0, 0)
    const b = p(0, 0, 0)
    const c = p(2e-9, 0, 0)
    const deg = angleAtJoint(a, b, c)
    expect(Number.isFinite(deg)).toBe(true)
    expect(deg).toBeCloseTo(0, 3)
  })
})

describe("isReliable", () => {
  it("returns true when every landmark meets the visibility threshold", () => {
    expect(
      isReliable(
        p(0, 0, undefined, 0.9),
        p(0, 1, undefined, 0.8),
        p(1, 1, undefined, 0.7),
      ),
    ).toBe(true)
  })

  it("returns false when any landmark is below threshold", () => {
    expect(
      isReliable(
        p(0, 0, undefined, 0.9),
        p(0, 1, undefined, 0.1),
        p(1, 1, undefined, 0.7),
      ),
    ).toBe(false)
  })

  it("returns true at exactly the threshold (inclusive)", () => {
    expect(isReliable(p(0, 0, undefined, VISIBILITY_THRESHOLD))).toBe(true)
  })

  it("returns false just below the threshold", () => {
    expect(isReliable(p(0, 0, undefined, VISIBILITY_THRESHOLD - 0.01))).toBe(false)
  })

  it("treats missing visibility as fully visible (1.0)", () => {
    expect(isReliable(p(0, 0), p(0, 1))).toBe(true)
  })

  it("returns true for an empty argument list (vacuous truth)", () => {
    expect(isReliable()).toBe(true)
  })

  it("is consistent with the documented VISIBILITY_THRESHOLD value", () => {
    expect(VISIBILITY_THRESHOLD).toBe(0.5)
  })
})
