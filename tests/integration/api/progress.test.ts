import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  getProgress: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { GET } from "@/app/api/progress/route";
import * as dataModule from "@/lib/data";
import * as authModule from "@/lib/auth";
import { NextRequest } from "next/server";

const mockGet = dataModule.getProgress as ReturnType<typeof vi.fn>;
const mockAuth = authModule.auth as unknown as ReturnType<typeof vi.fn>;

const USER_ID = "00000000-0000-4000-8000-000000000001";

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

function asAuthed() {
  mockAuth.mockResolvedValue({
    user: { id: USER_ID, email: "u@example.com", name: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  });
}

function asGuest() {
  mockAuth.mockResolvedValue(null);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/progress", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    asGuest();
    const res = await GET(new NextRequest("http://localhost/api/progress"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the progress payload when signed in", async () => {
    asAuthed();
    mockGet.mockResolvedValueOnce(PROGRESS);
    const res = await GET(new NextRequest("http://localhost/api/progress"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.currentStreak).toBe(3);
    expect(body.data.history.length).toBe(7);
  });

  it("passes the session userId (not a body/query userId) to the data layer", async () => {
    asAuthed();
    mockGet.mockResolvedValueOnce({ ...PROGRESS, history: [] });
    await GET(
      new NextRequest(
        // Any userId in the query string is ignored — we now source from auth.
        "http://localhost/api/progress?userId=99999999-9999-4999-8999-999999999999&days=14",
      ),
    );
    expect(mockGet).toHaveBeenCalledWith({
      userId: USER_ID,
      days: 14,
    });
  });

  it("returns VALIDATION_ERROR when days > 365", async () => {
    asAuthed();
    const res = await GET(
      new NextRequest("http://localhost/api/progress?days=9999"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("defaults days to 30 when omitted", async () => {
    asAuthed();
    mockGet.mockResolvedValueOnce({ ...PROGRESS, history: [] });
    await GET(new NextRequest("http://localhost/api/progress"));
    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ days: 30, userId: USER_ID }),
    );
  });
});
