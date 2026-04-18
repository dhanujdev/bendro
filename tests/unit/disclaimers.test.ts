import { describe, it, expect } from "vitest"
import {
  DISCLAIMERS,
  DISCLAIMER_SURFACES,
  getDisclaimer,
  painPromptForRating,
  type DisclaimerSurface,
} from "@/lib/disclaimers"

describe("disclaimers registry", () => {
  it("covers every surface in the type union", () => {
    // Treat the surface list as the authoritative enumeration — every
    // entry must resolve to a Disclaimer.
    for (const surface of DISCLAIMER_SURFACES) {
      const d = DISCLAIMERS[surface]
      expect(d).toBeDefined()
      expect(d.id).toBe(surface)
      expect(d.body.length).toBeGreaterThan(20)
      expect(["neutral", "caution", "warn"]).toContain(d.severity)
    }
  })

  it("onboarding intro matches HEALTH_RULES mandated copy", () => {
    const d = DISCLAIMERS.onboardingIntro
    expect(d.body).toContain("flexibility and mobility")
    expect(d.body).toContain("not medical advice")
    expect(d.body).toContain("healthcare provider")
  })

  it("routine start reminds users to stop on sharp pain", () => {
    const d = DISCLAIMERS.routineStart
    expect(d.body).toMatch(/sharp pain/i)
    expect(d.body).toMatch(/listen to your body/i)
  })

  it("high-pain prompt surfaces a medical-guidance CTA", () => {
    const d = DISCLAIMERS.painPromptHigh
    expect(d.severity).toBe("warn")
    expect(d.cta).toBeDefined()
    expect(d.cta?.label).toMatch(/medical/i)
    // Must be an internal route — never external URL.
    expect(d.cta?.href.startsWith("/")).toBe(true)
  })

  it("AI-generated card disclaimer exists for forward-compat", () => {
    // No AI-generated cards ship in v1, but the copy must already be
    // wired so Phase-19 (AI routines) can render it immediately.
    const d = DISCLAIMERS.aiGeneratedCard
    expect(d.body).toMatch(/ai/i)
    expect(d.body).toMatch(/not a substitute/i)
  })

  it("safety gate guides to speak with a healthcare provider", () => {
    const d = DISCLAIMERS.safetyGate
    expect(d.body).toMatch(/healthcare provider/i)
    expect(d.severity).toBe("caution")
  })

  it("marketing pain-relief disclaimer disavows medical treatment", () => {
    const d = DISCLAIMERS.marketingPainRelief
    expect(d.body).toMatch(/does not treat or cure/i)
  })
})

describe("getDisclaimer()", () => {
  it("returns the correct disclaimer for a surface", () => {
    expect(getDisclaimer("onboardingIntro").id).toBe("onboardingIntro")
    expect(getDisclaimer("routineStart").id).toBe("routineStart")
  })

  it("every DisclaimerSurface maps 1:1 to a body", () => {
    // Guard: unit test fails if someone adds a surface to the type
    // union but forgets to add an entry to DISCLAIMERS.
    const surfaces: DisclaimerSurface[] = [
      "onboardingIntro",
      "routineStart",
      "painPromptLow",
      "painPromptMedium",
      "painPromptHigh",
      "safetyGate",
      "aiGeneratedCard",
      "marketingPainRelief",
    ]
    for (const s of surfaces) {
      expect(getDisclaimer(s)).toBeDefined()
    }
    // Also assert the two lists match — catches a surface added to the
    // type but not the public enumeration.
    expect([...DISCLAIMER_SURFACES].sort()).toEqual(surfaces.sort())
  })
})

describe("painPromptForRating()", () => {
  it("0–3 → low-tier copy", () => {
    for (const r of [0, 1, 2, 3]) {
      expect(painPromptForRating(r).id).toBe("painPromptLow")
    }
  })

  it("4–6 → medium-tier copy", () => {
    for (const r of [4, 5, 6]) {
      expect(painPromptForRating(r).id).toBe("painPromptMedium")
    }
  })

  it("7–10 → high-tier copy with a medical CTA", () => {
    for (const r of [7, 8, 9, 10]) {
      const d = painPromptForRating(r)
      expect(d.id).toBe("painPromptHigh")
      expect(d.cta).toBeDefined()
    }
  })

  it("clamps below 0 to low-tier (defensive)", () => {
    expect(painPromptForRating(-5).id).toBe("painPromptLow")
  })
})
