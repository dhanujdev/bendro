import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: {
      sessions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("@/services/streaks", () => ({
  updateStreak: vi.fn(),
}));

import {
  startSession,
  completeSession,
  getSessionById,
  getUserSessions,
  getSessionSummary,
  getRecentSessions,
} from "@/services/sessions";
import { db } from "@/db";
import { updateStreak } from "@/services/streaks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: {
    sessions: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

const mockUpdateStreak = updateStreak as unknown as ReturnType<typeof vi.fn>;

function captureInsert<T>(row: T) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  mockDb.insert.mockReturnValueOnce({ values });
  return { values, returning };
}

function captureUpdate<T>(row: T) {
  const returning = vi.fn().mockResolvedValue([row]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update.mockReturnValueOnce({ set });
  return { set, where, returning };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("startSession", () => {
  it("inserts a session row and returns it", async () => {
    const created = { id: "sess1", userId: "u1", routineId: "r1" };
    const chain = captureInsert(created);
    const result = await startSession({ userId: "u1", routineId: "r1" });
    expect(result).toEqual(created);
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        routineId: "r1",
        startedAt: expect.any(Date),
      }),
    );
  });
});

describe("completeSession", () => {
  it("updates the session and triggers streak update when completionPct >= 50", async () => {
    const session = { id: "sess1", userId: "u1" };
    captureUpdate(session);
    const result = await completeSession(
      {
        sessionId: "sess1",
        durationDoneSec: 180,
        completionPct: 75,
        skippedStretchIds: [],
        painFeedback: {},
      },
      "UTC",
    );
    expect(result).toEqual(session);
    expect(mockUpdateStreak).toHaveBeenCalledWith("u1", "UTC");
  });

  it("skips streak update when completionPct < 50", async () => {
    captureUpdate({ id: "sess1", userId: "u1" });
    await completeSession({
      sessionId: "sess1",
      durationDoneSec: 30,
      completionPct: 20,
      skippedStretchIds: [],
      painFeedback: {},
    });
    expect(mockUpdateStreak).not.toHaveBeenCalled();
  });

  it("defaults timezone to UTC when not passed", async () => {
    captureUpdate({ id: "sess1", userId: "u1" });
    await completeSession({
      sessionId: "sess1",
      durationDoneSec: 200,
      completionPct: 50,
      skippedStretchIds: [],
      painFeedback: {},
    });
    expect(mockUpdateStreak).toHaveBeenCalledWith("u1", "UTC");
  });

  it("skips streak update when the session row is not returned", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValueOnce({ set });

    const result = await completeSession({
      sessionId: "sess1",
      durationDoneSec: 200,
      completionPct: 90,
      skippedStretchIds: [],
      painFeedback: {},
    });
    expect(result).toBeUndefined();
    expect(mockUpdateStreak).not.toHaveBeenCalled();
  });
});

describe("getSessionById", () => {
  it("delegates to db.query.sessions.findFirst", async () => {
    const session = { id: "sess1" };
    mockDb.query.sessions.findFirst.mockResolvedValueOnce(session);
    expect(await getSessionById("sess1")).toBe(session);
  });
});

describe("getUserSessions", () => {
  it("passes the default limit of 20", async () => {
    mockDb.query.sessions.findMany.mockResolvedValueOnce([]);
    await getUserSessions("u1");
    expect(mockDb.query.sessions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 }),
    );
  });

  it("accepts a custom limit", async () => {
    mockDb.query.sessions.findMany.mockResolvedValueOnce([]);
    await getUserSessions("u1", 5);
    expect(mockDb.query.sessions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });
});

describe("getSessionSummary", () => {
  function mockSelectRow(row: unknown) {
    const where = vi.fn().mockResolvedValue([row]);
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValueOnce({ from });
  }

  it("returns aggregated totals when rows exist", async () => {
    mockSelectRow({
      totalSessions: 12,
      totalDurationSec: 3600,
      avgCompletionPct: 82.5,
      lastSessionAt: new Date("2024-06-15T00:00:00Z"),
    });
    const result = await getSessionSummary("u1");
    expect(result.totalSessions).toBe(12);
    expect(result.totalDurationSec).toBe(3600);
    expect(result.avgCompletionPct).toBe(82.5);
    expect(result.lastSessionAt).toBeInstanceOf(Date);
  });

  it("returns zero defaults when no rows exist", async () => {
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValueOnce({ from });

    const result = await getSessionSummary("u1");
    expect(result).toEqual({
      totalSessions: 0,
      totalDurationSec: 0,
      avgCompletionPct: 0,
      lastSessionAt: null,
    });
  });

  it("falls back to zeros when individual fields are missing", async () => {
    mockSelectRow({});
    const result = await getSessionSummary("u1");
    expect(result.totalSessions).toBe(0);
    expect(result.totalDurationSec).toBe(0);
    expect(result.avgCompletionPct).toBe(0);
    expect(result.lastSessionAt).toBeNull();
  });
});

describe("getRecentSessions", () => {
  it("uses a 30-day window by default", async () => {
    mockDb.query.sessions.findMany.mockResolvedValueOnce([]);
    await getRecentSessions("u1");
    expect(mockDb.query.sessions.findMany).toHaveBeenCalledTimes(1);
  });

  it("accepts a custom day range", async () => {
    mockDb.query.sessions.findMany.mockResolvedValueOnce([]);
    await getRecentSessions("u1", 7);
    expect(mockDb.query.sessions.findMany).toHaveBeenCalledTimes(1);
  });
});
