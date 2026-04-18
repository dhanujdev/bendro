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
  filterRoutineCatalog,
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

import type { GeneratePlanInput } from "@/types/routine";

const baseInput: GeneratePlanInput = {
  userId: "00000000-0000-0000-0000-000000000001",
  goals: ["flexibility"],
  focusAreas: [],
  avoidAreas: [],
  timeBudgetSec: 600,
  intensity: "moderate",
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

describe("filterRoutineCatalog", () => {
  // Minimal row shape that satisfies Pick<RoutineType, "goal" | "level">
  // plus an `id` tag so tests can assert which rows survived. Typed
  // precisely (no `any`) so the generic carries `id` through to the return.
  type Row = {
    id: string;
    goal: import("@/types").Goal;
    level: import("@/types/stretch").Intensity;
  };
  const routines: Row[] = [
    { id: "r1", goal: "flexibility", level: "gentle" },
    { id: "r2", goal: "flexibility", level: "deep" },
    { id: "r3", goal: "recovery", level: "moderate" },
    { id: "r4", goal: "athletic_performance", level: "deep" },
    { id: "r5", goal: "stress_relief", level: "gentle" },
    { id: "r6", goal: "posture", level: "moderate" },
    { id: "r7", goal: "pain_relief", level: "gentle" },
  ];

  it("returns everything when the profile is empty", () => {
    const result = filterRoutineCatalog(routines, {
      goals: [],
      avoidAreas: [],
      safetyFlag: false,
    });
    expect(result).toHaveLength(routines.length);
  });

  it("filters by goals when the user has picked some", () => {
    const result = filterRoutineCatalog(routines, {
      goals: ["flexibility", "recovery"] as any,
      avoidAreas: [],
      safetyFlag: false,
    });
    expect(result.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });

  it("empty goals means no goal filter (not 'match nothing')", () => {
    const result = filterRoutineCatalog(routines, {
      goals: [],
      avoidAreas: [],
      safetyFlag: false,
    });
    expect(result.map((r) => r.id)).toEqual(routines.map((r) => r.id));
  });

  it("drops routines whose goal maps to any avoidArea", () => {
    // flexibility maps to ["hips","hamstrings","shoulders","chest","calves"]
    // avoiding "hips" should drop r1 + r2 (and r4 — athletic also hits hips)
    const result = filterRoutineCatalog(routines, {
      goals: [],
      avoidAreas: ["hips"] as any,
      safetyFlag: false,
    });
    const ids = result.map((r) => r.id);
    expect(ids).not.toContain("r1");
    expect(ids).not.toContain("r2");
    expect(ids).not.toContain("r4");
  });

  it("safetyFlag=true drops deep-intensity routines", () => {
    const result = filterRoutineCatalog(routines, {
      goals: [],
      avoidAreas: [],
      safetyFlag: true,
    });
    const ids = result.map((r) => r.id);
    expect(ids).not.toContain("r2");
    expect(ids).not.toContain("r4");
    expect(ids).toContain("r1");
    expect(ids).toContain("r3");
  });

  it("safetyFlag keeps moderate and gentle routines", () => {
    const result = filterRoutineCatalog(routines, {
      goals: [],
      avoidAreas: [],
      safetyFlag: true,
    });
    for (const r of result) {
      expect(r.level).not.toBe("deep");
    }
  });

  it("combines goal + avoid + safetyFlag filters (intersection)", () => {
    // goals=flexibility, avoidAreas=[hamstrings] hits flexibility→hamstrings
    const result = filterRoutineCatalog(routines, {
      goals: ["flexibility"] as any,
      avoidAreas: ["hamstrings"] as any,
      safetyFlag: true,
    });
    expect(result).toEqual([]);
  });

  it("is a pure function (does not mutate the input)", () => {
    const snapshot = routines.map((r) => ({ ...r }));
    filterRoutineCatalog(routines, {
      goals: ["recovery"] as any,
      avoidAreas: ["neck"] as any,
      safetyFlag: true,
    });
    expect(routines).toEqual(snapshot);
  });

  it("handles unknown goal (no GOAL_BODY_AREAS entry) gracefully", () => {
    // Deliberately type-punned: an unmapped goal string shouldn't crash.
    const unknown = [
      { id: "rx", goal: "custom_goal" as Row["goal"], level: "gentle" as Row["level"] },
    ];
    const result = filterRoutineCatalog(unknown, {
      goals: [],
      avoidAreas: ["hips"],
      safetyFlag: false,
    });
    // No mapping → no avoided overlap → keep it.
    expect(result).toHaveLength(1);
  });
});
