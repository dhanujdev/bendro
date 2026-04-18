import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  getProgress: vi.fn(),
}));

import { GET } from "@/app/api/progress/route";
import * as dataModule from "@/lib/data";
import { NextRequest } from "next/server";

const mockGet = dataModule.getProgress as ReturnType<typeof vi.fn>;

const PROGRESS = {
  currentStreak: 3,
  longestStreak: 12,
  totalSessions: 42,
  totalMinutes: 320,
  thisWeekMinutes: 45,
  thisMonthMinutes: 160,
  avgCompletionPct: 87,
  activeDays: ["monday", "friday"],
  history: Array.from({ length: 7 }, (_, i) => ({
    date: `2024-01-0${i + 1}`,
    minutesStretched: 5 + i,
    sessionsCompleted: 1,
    completionPct: 80,
  })),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/progress", () => {
  it("returns the progress payload on happy path", async () => {
    mockGet.mockResolvedValueOnce(PROGRESS);
    const res = await GET(new NextRequest("http://localhost/api/progress"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.currentStreak).toBe(3);
    expect(body.data.history.length).toBe(7);
  });

  it("passes userId + days query to the data layer", async () => {
    mockGet.mockResolvedValueOnce({ ...PROGRESS, history: [] });
    await GET(
      new NextRequest(
        "http://localhost/api/progress?userId=00000000-0000-4000-8000-000000000001&days=14",
      ),
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "00000000-0000-4000-8000-000000000001",
        days: 14,
      }),
    );
  });

  it("returns VALIDATION_ERROR on invalid userId", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/progress?userId=not-a-uuid"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR when days > 365", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/progress?days=9999"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("defaults days to 30 when omitted", async () => {
    mockGet.mockResolvedValueOnce({ ...PROGRESS, history: [] });
    await GET(new NextRequest("http://localhost/api/progress"));
    expect(mockGet).toHaveBeenCalledWith(expect.objectContaining({ days: 30 }));
  });
});
