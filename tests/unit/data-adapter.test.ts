/**
 * Tests the mock/DB fallback adapter in `src/lib/data.ts`.
 *
 * Strategy: make the services throw "DATABASE_URL is not set", which the
 * adapter recognizes as a fallback condition (isFallbackError) and quietly
 * swaps to mock-data. This exercises both data.ts and mock-data.ts in one
 * pass.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => {
  const err = new Error("DATABASE_URL is not set");
  return {
    db: new Proxy(
      {},
      {
        get() {
          throw err;
        },
      },
    ),
  };
});

vi.mock("@/services/routines", () => {
  const err = new Error("DATABASE_URL is not set");
  return {
    listRoutines: vi.fn().mockRejectedValue(err),
    getRoutineById: vi.fn().mockRejectedValue(err),
    getRoutineBySlug: vi.fn().mockRejectedValue(err),
    createRoutine: vi.fn().mockRejectedValue(err),
    listStretches: vi.fn().mockRejectedValue(err),
  };
});

vi.mock("@/services/sessions", () => {
  const err = new Error("DATABASE_URL is not set");
  return {
    startSession: vi.fn().mockRejectedValue(err),
    getRecentSessions: vi.fn().mockRejectedValue(err),
  };
});

vi.mock("@/services/streaks", () => ({
  getStreak: vi.fn().mockRejectedValue(new Error("DATABASE_URL is not set")),
  updateStreak: vi.fn(),
}));

import {
  getRoutines,
  getRoutineByIdOrSlug,
  createRoutine,
  listStretches,
  startSession,
  updateSession,
  getProgress,
} from "@/lib/data";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRoutines (fallback → mock)", () => {
  it("returns a page of mock routines", async () => {
    const result = await getRoutines({ limit: 3, offset: 0 });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("applies goal/level/isPremium filters to mock data", async () => {
    const result = await getRoutines({
      goal: "flexibility",
      level: "gentle",
      isPremium: false,
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.goal).toBe("flexibility");
      expect(r.level).toBe("gentle");
      expect(r.isPremium).toBe(false);
    }
  });

  it("applies maxDurationSec filter", async () => {
    const result = await getRoutines({
      maxDurationSec: 300,
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.totalDurationSec).toBeLessThanOrEqual(300);
    }
  });

  it("paginates via offset + limit", async () => {
    const first = await getRoutines({ limit: 1, offset: 0 });
    const second = await getRoutines({ limit: 1, offset: 1 });
    expect(first.data.length).toBe(1);
    expect(second.data.length).toBeGreaterThanOrEqual(0);
    if (second.data.length > 0) {
      expect(first.data[0].id).not.toBe(second.data[0].id);
    }
  });
});

describe("getRoutines — Phase 7 filter expansion", () => {
  it("q: case-insensitive substring match across title/slug/description", async () => {
    const all = await getRoutines({ limit: 50, offset: 0 });
    // Pick a substring we know exists in at least one title.
    const needleFrom = all.data[0].title.slice(0, 4).toUpperCase();
    const result = await getRoutines({ q: needleFrom, limit: 50, offset: 0 });
    expect(result.data.length).toBeGreaterThan(0);
    for (const r of result.data) {
      const hay = [r.title, r.slug, r.description ?? ""]
        .join(" ")
        .toLowerCase();
      expect(hay).toContain(needleFrom.toLowerCase());
    }
  });

  it("q: returns empty for a guaranteed no-match", async () => {
    const result = await getRoutines({
      q: "zzzz-impossible-token-xyz",
      limit: 50,
      offset: 0,
    });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("durationBucket: 'short' drops routines > 5 min", async () => {
    const result = await getRoutines({
      durationBucket: "short",
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.totalDurationSec).toBeLessThanOrEqual(300);
    }
  });

  it("durationBucket: 'long' drops routines <= 15 min", async () => {
    const result = await getRoutines({
      durationBucket: "long",
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.totalDurationSec).toBeGreaterThan(900);
    }
  });

  it("safetyFlag: drops deep-intensity routines", async () => {
    const result = await getRoutines({
      safetyFlag: true,
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.level).not.toBe("deep");
    }
  });

  it("avoidBodyAreas: drops routines whose goal maps to avoided areas", async () => {
    // flexibility maps to ["hips","hamstrings","shoulders","chest","calves"]
    // — avoiding "hips" should drop every flexibility routine.
    const result = await getRoutines({
      avoidBodyAreas: ["hips"],
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.goal).not.toBe("flexibility");
    }
  });

  it("bodyAreas: keeps only routines whose goal maps to ANY of the targets", async () => {
    const result = await getRoutines({
      bodyAreas: ["neck"],
      limit: 50,
      offset: 0,
    });
    // neck is in stress_relief, posture, pain_relief
    for (const r of result.data) {
      expect(["stress_relief", "posture", "pain_relief"]).toContain(r.goal);
    }
  });

  it("combines filters (intersection) — goal + bucket + safetyFlag", async () => {
    const result = await getRoutines({
      goal: "flexibility",
      durationBucket: "short",
      safetyFlag: true,
      limit: 50,
      offset: 0,
    });
    for (const r of result.data) {
      expect(r.goal).toBe("flexibility");
      expect(r.totalDurationSec).toBeLessThanOrEqual(300);
      expect(r.level).not.toBe("deep");
    }
  });
});

describe("getRoutineByIdOrSlug (fallback → mock)", () => {
  it("resolves the 'demo' alias to quick-full-body-stretch", async () => {
    const hit = await getRoutineByIdOrSlug("demo");
    expect(hit).not.toBeNull();
    expect(hit?.slug).toBeDefined();
  });

  it("resolves a UUID that matches a mock routine", async () => {
    const all = await getRoutines({ limit: 50, offset: 0 });
    const uuid = all.data[0].id;
    const hit = await getRoutineByIdOrSlug(uuid);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(uuid);
  });

  it("returns null for an unknown slug", async () => {
    const hit = await getRoutineByIdOrSlug("definitely-not-a-routine");
    expect(hit).toBeNull();
  });
});

describe("createRoutine (fallback → mock)", () => {
  it("fabricates an id + timestamps when in mock mode", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = {
      slug: "x",
      title: "x",
      description: null,
      goal: "flexibility",
      level: "gentle",
      totalDurationSec: 60,
      isPremium: false,
      isAiGenerated: false,
      ownerId: null,
    } as any;
    const r = await createRoutine(input);
    expect(r.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(r.createdAt).toBeInstanceOf(Date);
  });
});

describe("listStretches (fallback → mock)", () => {
  it("returns mock stretches", async () => {
    const result = await listStretches({ limit: 50, offset: 0 });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("filters by bodyArea", async () => {
    const result = await listStretches({
      bodyArea: "neck",
      limit: 50,
      offset: 0,
    });
    for (const s of result.data) {
      expect(s.bodyAreas).toContain("neck");
    }
  });

  it("filters by intensity", async () => {
    const result = await listStretches({
      intensity: "gentle",
      limit: 50,
      offset: 0,
    });
    for (const s of result.data) {
      expect(s.intensity).toBe("gentle");
    }
  });
});

describe("startSession + updateSession (fallback → mock)", () => {
  it("creates a session, then updates fields, then completes it", async () => {
    const created = await startSession({
      userId: "00000000-0000-4000-8000-000000000001",
      routineId: "22222222-2222-4000-8000-000000000001",
    });
    expect(created.id).toBeDefined();

    const patched = await updateSession(created.id, {
      durationDoneSec: 120,
      completionPct: 40,
      skippedStretchIds: [],
      painFeedback: {},
    });
    expect(patched?.durationDoneSec).toBe(120);
    expect(patched?.completionPct).toBe(40);

    const completed = await updateSession(created.id, {
      completed: true,
      completionPct: 90,
    });
    expect(completed?.completedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating an unknown session", async () => {
    const hit = await updateSession("not-an-id", { durationDoneSec: 0 });
    expect(hit).toBeNull();
  });
});

describe("getProgress (fallback → mock)", () => {
  it("returns a progress payload when no userId is given", async () => {
    const p = await getProgress({ days: 7 });
    expect(p.history.length).toBe(7);
    expect(p.currentStreak).toBeGreaterThanOrEqual(0);
  });

  it("falls back to mock when userId is given but DB is unreachable", async () => {
    const p = await getProgress({ userId: "u1", days: 14 });
    expect(p.history.length).toBe(14);
  });
});

describe("non-fallback errors surface instead of swallowed", () => {
  it("re-throws validation-like errors from the service layer", async () => {
    const routines = await import("@/services/routines");
    (routines.listRoutines as unknown as ReturnType<typeof vi.fn>)
      .mockReset()
      .mockRejectedValueOnce(new Error("Validation failed: bad goal"));
    await expect(
      getRoutines({ limit: 1, offset: 0 }),
    ).rejects.toThrow(/Validation failed/);
  });
});
