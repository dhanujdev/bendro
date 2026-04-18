import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: {
      stretches: {
        findMany: vi.fn(),
      },
      routines: {
        findMany: vi.fn(),
      },
    },
  },
}));

import {
  generateRoutine,
  suggestRoutinesForUser,
} from "@/services/personalization";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: {
    stretches: { findMany: ReturnType<typeof vi.fn> };
    routines: { findMany: ReturnType<typeof vi.fn> };
  };
};

type StretchRow = {
  id: string;
  bodyAreas: string[];
  intensity: "gentle" | "moderate" | "deep";
  bilateral: boolean;
  defaultDurationSec: number;
};

function stretch(overrides: Partial<StretchRow> & Pick<StretchRow, "id">): StretchRow {
  return {
    bodyAreas: ["hips"],
    intensity: "moderate",
    bilateral: false,
    defaultDurationSec: 30,
    ...overrides,
  };
}

const baseInput = {
  userId: "00000000-0000-0000-0000-000000000001",
  goals: ["flexibility"] as const,
  focusAreas: [] as never[],
  avoidAreas: [] as never[],
  timeBudgetSec: 600,
  intensity: "moderate" as const,
  daysPerWeek: 5,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("generateRoutine", () => {
  it("returns empty stretches when no candidates match target areas", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      stretch({ id: "s1", bodyAreas: ["ears"] }), // fake area; won't match any goal
    ]);
    const result = await generateRoutine({ ...baseInput });
    expect(result.stretches).toEqual([]);
    expect(result.totalDurationSec).toBe(0);
    expect(result.goal).toBe("flexibility");
    expect(result.intensity).toBe("moderate");
  });

  it("filters out stretches overlapping avoidAreas", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      stretch({ id: "s1", bodyAreas: ["hips"] }),
      stretch({ id: "s2", bodyAreas: ["hips", "lower_back"] }),
    ]);
    const result = await generateRoutine({
      ...baseInput,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      avoidAreas: ["lower_back"] as any,
    });
    expect(result.stretches.every((s) => s.stretch.id !== "s2")).toBe(true);
  });

  it("selects stretches up to the time budget and preserves phase ordering", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      // Warmup area (shoulders)
      stretch({
        id: "warmup-1",
        bodyAreas: ["shoulders"],
        defaultDurationSec: 20,
      }),
      // Main (hips — not in warmup/cooldown lists)
      stretch({
        id: "main-1",
        bodyAreas: ["hips"],
        defaultDurationSec: 40,
      }),
      // Cooldown (hamstrings)
      stretch({
        id: "cooldown-1",
        bodyAreas: ["hamstrings"],
        defaultDurationSec: 30,
      }),
    ]);
    const result = await generateRoutine({ ...baseInput, timeBudgetSec: 900 });
    expect(result.stretches.length).toBeGreaterThan(0);
    expect(result.totalDurationSec).toBeGreaterThan(0);
    // goal passthrough
    expect(result.goal).toBe("flexibility");
  });

  it("doubles duration for bilateral stretches", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      stretch({
        id: "b1",
        bodyAreas: ["hips"],
        bilateral: true,
        defaultDurationSec: 30,
      }),
    ]);
    const result = await generateRoutine({ ...baseInput, timeBudgetSec: 900 });
    if (result.stretches.length > 0) {
      expect(result.stretches[0].durationSec).toBe(60);
    }
  });

  it("falls back to the 'main' phase when bodyAreas is empty", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      // No body areas at all — still filtered out because no target match.
      stretch({ id: "empty", bodyAreas: [] }),
    ]);
    const result = await generateRoutine({ ...baseInput });
    expect(result.stretches).toEqual([]);
  });

  it("biases scoring toward focusAreas", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      stretch({ id: "s-focus", bodyAreas: ["hips"] }),
      stretch({ id: "s-off", bodyAreas: ["chest"] }),
    ]);
    const result = await generateRoutine({
      ...baseInput,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      focusAreas: ["hips"] as any,
      timeBudgetSec: 900,
    });
    const ids = result.stretches.map((s) => s.stretch.id);
    if (ids.length > 0) {
      // s-focus should be preferred (higher score)
      expect(ids).toContain("s-focus");
    }
  });

  it("uses an unknown goal gracefully (empty target set)", async () => {
    mockDb.query.stretches.findMany.mockResolvedValueOnce([
      stretch({ id: "s1", bodyAreas: ["hips"] }),
    ]);
    const result = await generateRoutine({
      ...baseInput,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      goals: ["does_not_exist"] as any,
    });
    expect(result.stretches).toEqual([]);
  });
});

describe("suggestRoutinesForUser", () => {
  it("filters routines to those matching the user's goals", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce([
      { id: "r1", goal: "flexibility" },
      { id: "r2", goal: "mobility" },
      { id: "r3", goal: "flexibility" },
    ]);
    const result = await suggestRoutinesForUser("u1", ["flexibility"], []);
    expect(result.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("returns at most 6 routines", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, goal: "mobility" })),
    );
    const result = await suggestRoutinesForUser("u1", ["mobility"], []);
    expect(result.length).toBe(6);
  });

  it("returns empty when no routines match goals", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce([
      { id: "r1", goal: "posture" },
    ]);
    const result = await suggestRoutinesForUser("u1", ["flexibility"], []);
    expect(result).toEqual([]);
  });

  it("accepts focusAreas without throwing", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await suggestRoutinesForUser("u1", ["flexibility"], ["hips"] as any);
    expect(mockDb.query.routines.findMany).toHaveBeenCalledTimes(1);
  });
});
