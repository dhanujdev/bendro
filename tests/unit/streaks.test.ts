import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatDateInTimezone, previousDate } from "@/services/streaks";

// ─── Pure-function tests (no DB needed) ──────────────────────────────────────

describe("formatDateInTimezone", () => {
  it("formats UTC date correctly", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    expect(formatDateInTimezone(date, "UTC")).toBe("2024-03-15");
  });

  it("returns correct date for New York timezone (behind UTC)", () => {
    // 2024-03-15 01:00 UTC is 2024-03-14 in New York (EST = UTC-5)
    const date = new Date("2024-03-15T01:00:00Z");
    expect(formatDateInTimezone(date, "America/New_York")).toBe("2024-03-14");
  });

  it("returns correct date for Tokyo timezone (ahead of UTC)", () => {
    // 2024-03-14 23:00 UTC is 2024-03-15 in Tokyo (JST = UTC+9)
    const date = new Date("2024-03-14T23:00:00Z");
    expect(formatDateInTimezone(date, "Asia/Tokyo")).toBe("2024-03-15");
  });
});

describe("previousDate", () => {
  it("returns the day before the given date", () => {
    expect(previousDate("2024-03-15")).toBe("2024-03-14");
  });

  it("handles month boundary correctly", () => {
    expect(previousDate("2024-03-01")).toBe("2024-02-29"); // 2024 is leap year
  });

  it("handles year boundary correctly", () => {
    expect(previousDate("2024-01-01")).toBe("2023-12-31");
  });
});

// ─── Streak logic tests (mocked DB) ──────────────────────────────────────────

vi.mock("@/db", () => ({
  db: {
    query: {
      streaks: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { updateStreak, getStreak } from "@/services/streaks";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: { streaks: { findFirst: ReturnType<typeof vi.fn> } };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function makeInsertChain(returnValue: object) {
  return () => ({
    values: () => ({
      returning: () => Promise.resolve([returnValue]),
    }),
  });
}

function makeUpdateChain(returnValue: object) {
  return () => ({
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve([returnValue]),
      }),
    }),
  });
}

const TODAY = "2024-06-15";
const YESTERDAY = "2024-06-14";
const TWO_DAYS_AGO = "2024-06-13";

beforeEach(() => {
  vi.resetAllMocks();
  // Mock "today" consistently
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});

describe("updateStreak", () => {
  it("creates a new streak for a new user", async () => {
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(null);
    const expected = {
      userId: "user-1",
      currentCount: 1,
      longestCount: 1,
      lastActiveDate: TODAY,
    };
    mockDb.insert.mockImplementationOnce(makeInsertChain(expected));

    const result = await updateStreak("user-1", "UTC");
    expect(result.currentCount).toBe(1);
    expect(result.longestCount).toBe(1);
    expect(result.lastActiveDate).toBe(TODAY);
  });

  it("is a no-op when last active date is today", async () => {
    const existing = {
      userId: "user-1",
      currentCount: 5,
      longestCount: 10,
      lastActiveDate: TODAY,
    };
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(existing);

    const result = await updateStreak("user-1", "UTC");
    expect(result.currentCount).toBe(5);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("increments streak on consecutive day", async () => {
    const existing = {
      userId: "user-1",
      currentCount: 5,
      longestCount: 10,
      lastActiveDate: YESTERDAY,
    };
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(existing);
    const expected = {
      ...existing,
      currentCount: 6,
      longestCount: 10,
      lastActiveDate: TODAY,
    };
    mockDb.update.mockImplementationOnce(makeUpdateChain(expected));

    const result = await updateStreak("user-1", "UTC");
    expect(result.currentCount).toBe(6);
    expect(result.longestCount).toBe(10);
  });

  it("updates longest count when current surpasses it", async () => {
    const existing = {
      userId: "user-1",
      currentCount: 10,
      longestCount: 10,
      lastActiveDate: YESTERDAY,
    };
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(existing);
    const expected = {
      ...existing,
      currentCount: 11,
      longestCount: 11,
      lastActiveDate: TODAY,
    };
    mockDb.update.mockImplementationOnce(makeUpdateChain(expected));

    const result = await updateStreak("user-1", "UTC");
    expect(result.currentCount).toBe(11);
    expect(result.longestCount).toBe(11);
  });

  it("resets streak to 1 after a gap", async () => {
    const existing = {
      userId: "user-1",
      currentCount: 7,
      longestCount: 7,
      lastActiveDate: TWO_DAYS_AGO,
    };
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(existing);
    const expected = {
      ...existing,
      currentCount: 1,
      longestCount: 7,
      lastActiveDate: TODAY,
    };
    mockDb.update.mockImplementationOnce(makeUpdateChain(expected));

    const result = await updateStreak("user-1", "UTC");
    expect(result.currentCount).toBe(1);
    expect(result.longestCount).toBe(7);
  });

  it("preserves longest count on reset", async () => {
    const existing = {
      userId: "user-1",
      currentCount: 3,
      longestCount: 30,
      lastActiveDate: "2024-01-01",
    };
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(existing);
    const expected = {
      ...existing,
      currentCount: 1,
      longestCount: 30,
      lastActiveDate: TODAY,
    };
    mockDb.update.mockImplementationOnce(makeUpdateChain(expected));

    const result = await updateStreak("user-1", "UTC");
    expect(result.longestCount).toBe(30);
  });
});

describe("getStreak", () => {
  it("returns null when no streak exists", async () => {
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(null);
    const result = await getStreak("user-1");
    expect(result).toBeNull();
  });

  it("returns the streak when it exists", async () => {
    const streak = {
      id: "streak-1",
      userId: "user-1",
      currentCount: 5,
      longestCount: 10,
      lastActiveDate: TODAY,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.query.streaks.findFirst.mockResolvedValueOnce(streak);
    const result = await getStreak("user-1");
    expect(result?.currentCount).toBe(5);
  });
});
