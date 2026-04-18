import { describe, it, expect } from "vitest"
import { decideKeyAction, type PlayerPhase } from "@/lib/player/keyboard"

function decide(
  key: string,
  phase: PlayerPhase,
  opts: Partial<{ currentIndex: number; hasModifier: boolean; isTyping: boolean }> = {}
) {
  return decideKeyAction({
    key,
    phase,
    currentIndex: opts.currentIndex ?? 0,
    hasModifier: opts.hasModifier ?? false,
    isTyping: opts.isTyping ?? false,
  })
}

describe("decideKeyAction", () => {
  describe("modifier + typing guards", () => {
    it("returns none when a modifier key is held", () => {
      expect(decide(" ", "stretching", { hasModifier: true })).toBe("none")
      expect(decide("ArrowLeft", "stretching", { hasModifier: true, currentIndex: 2 })).toBe(
        "none"
      )
      expect(decide("Escape", "ready", { hasModifier: true })).toBe("none")
    })

    it("returns none when the user is typing in a form control", () => {
      expect(decide(" ", "stretching", { isTyping: true })).toBe("none")
      expect(decide("Escape", "stretching", { isTyping: true })).toBe("none")
    })

    it("returns none for any key during the complete phase", () => {
      expect(decide(" ", "complete")).toBe("none")
      expect(decide("Escape", "complete")).toBe("none")
      expect(decide("ArrowRight", "complete")).toBe("none")
    })
  })

  describe("space bar", () => {
    it("maps to pause-toggle while stretching", () => {
      expect(decide(" ", "stretching")).toBe("pause-toggle")
      expect(decide("Spacebar", "stretching")).toBe("pause-toggle")
    })

    it("maps to start from ready", () => {
      expect(decide(" ", "ready")).toBe("start")
    })

    it("maps to start from rest (starts the next stretch)", () => {
      expect(decide(" ", "rest")).toBe("start")
    })
  })

  describe("arrow right", () => {
    it("advances during stretching", () => {
      expect(decide("ArrowRight", "stretching")).toBe("next")
    })

    it("advances during rest", () => {
      expect(decide("ArrowRight", "rest")).toBe("next")
    })

    it("does nothing on the ready screen", () => {
      expect(decide("ArrowRight", "ready")).toBe("none")
    })
  })

  describe("arrow left", () => {
    it("goes previous during stretching when not on the first stretch", () => {
      expect(decide("ArrowLeft", "stretching", { currentIndex: 2 })).toBe("previous")
    })

    it("goes previous during rest when not on the first stretch", () => {
      expect(decide("ArrowLeft", "rest", { currentIndex: 1 })).toBe("previous")
    })

    it("returns none on the first stretch — there is nothing before it", () => {
      expect(decide("ArrowLeft", "stretching", { currentIndex: 0 })).toBe("none")
      expect(decide("ArrowLeft", "rest", { currentIndex: 0 })).toBe("none")
    })

    it("returns none on the ready screen", () => {
      expect(decide("ArrowLeft", "ready", { currentIndex: 0 })).toBe("none")
    })
  })

  describe("escape", () => {
    it("exits from every non-complete phase", () => {
      expect(decide("Escape", "ready")).toBe("exit")
      expect(decide("Escape", "stretching")).toBe("exit")
      expect(decide("Escape", "rest", { currentIndex: 3 })).toBe("exit")
    })
  })

  describe("unrelated keys", () => {
    it("returns none for keys we do not handle", () => {
      expect(decide("a", "stretching")).toBe("none")
      expect(decide("Enter", "ready")).toBe("none")
      expect(decide("Tab", "stretching")).toBe("none")
    })
  })
})

// isTypingTarget uses `instanceof HTMLElement`, which only resolves inside a
// browser. It is covered by the Phase-14 Playwright suite rather than Vitest
// (node env). Keeping the contract here as a smoke — the helper exists and
// is exported.

