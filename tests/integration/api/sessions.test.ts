import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  startSession: vi.fn(),
  updateSession: vi.fn(),
  getSessionById: vi.fn(),
  getUserProfile: vi.fn(),
}));

// Mock the auth module so tests don't need Next.js runtime to resolve
// next-auth's sub-module imports. Each test sets the return value it needs.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { POST } from "@/app/api/sessions/route";
import { PATCH } from "@/app/api/sessions/[id]/route";
import * as dataModule from "@/lib/data";
import * as authModule from "@/lib/auth";

const mockStart = dataModule.startSession as ReturnType<typeof vi.fn>;
const mockUpdate = dataModule.updateSession as ReturnType<typeof vi.fn>;
const mockGetSession = dataModule.getSessionById as ReturnType<typeof vi.fn>;
const mockGetProfile = dataModule.getUserProfile as ReturnType<typeof vi.fn>;
const mockAuth = authModule.auth as unknown as ReturnType<typeof vi.fn>;

const USER_ID = "00000000-0000-4000-8000-000000000001";

const BASE_SESSION = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: USER_ID,
  routineId: "22222222-2222-4000-8000-000000000001",
  startedAt: new Date("2024-01-01T00:00:00Z"),
  completedAt: null,
  durationDoneSec: 0,
  completionPct: 0,
  skippedStretchIds: [],
  painFeedback: {},
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

describe("POST /api/sessions", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    asGuest();
    const res = await POST(
      jsonRequest("http://localhost/api/sessions", {
        routineId: BASE_SESSION.routineId,
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("creates a session using the session userId, not the body", async () => {
    asAuthed();
    mockStart.mockResolvedValueOnce(BASE_SESSION);

    const res = await POST(
      jsonRequest("http://localhost/api/sessions", {
        // Attempt to spoof: userId in body should be ignored.
        userId: "99999999-9999-4999-8999-999999999999",
        routineId: BASE_SESSION.routineId,
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(BASE_SESSION.id);
    // Service was called with the auth-derived userId, not the body-supplied one.
    expect(mockStart).toHaveBeenCalledWith({
      userId: USER_ID,
      routineId: BASE_SESSION.routineId,
    });
  });

  it("returns INVALID_JSON for malformed body (even when authed)", async () => {
    asAuthed();
    const res = await POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("returns VALIDATION_ERROR when routineId is missing", async () => {
    asAuthed();
    const res = await POST(
      jsonRequest("http://localhost/api/sessions", {}),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/sessions/[id]", () => {
  function patchCtx(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns UNAUTHENTICATED without a session", async () => {
    asGuest();
    const res = await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { durationDoneSec: 1 },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("updates a session and returns 200 when owner matches", async () => {
    asAuthed();
    mockGetSession.mockResolvedValueOnce(BASE_SESSION);
    mockUpdate.mockResolvedValueOnce({
      ...BASE_SESSION,
      durationDoneSec: 120,
      completionPct: 50,
    });
    const res = await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { durationDoneSec: 120, completionPct: 50 },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.durationDoneSec).toBe(120);
  });

  it("returns NOT_FOUND when the session belongs to another user", async () => {
    asAuthed();
    mockGetSession.mockResolvedValueOnce({
      ...BASE_SESSION,
      userId: "11111111-1111-4111-8111-111111111111",
    });
    const res = await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { durationDoneSec: 1 },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    // We did not call update for a stranger's session.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the session doesn't exist", async () => {
    asAuthed();
    mockGetSession.mockResolvedValueOnce(null);
    const res = await PATCH(
      jsonRequest(
        "http://localhost/api/sessions/missing",
        { durationDoneSec: 1 },
        "PATCH",
      ),
      patchCtx("missing"),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns INVALID_JSON on broken body", async () => {
    asAuthed();
    const res = await PATCH(
      new Request(`http://localhost/api/sessions/${BASE_SESSION.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
      patchCtx(BASE_SESSION.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("returns VALIDATION_ERROR when completionPct > 100", async () => {
    asAuthed();
    const res = await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { completionPct: 150 },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // ─── Phase 8 completion semantics ─────────────────────────────────────────
  it("returns CONFLICT when the session is already completed", async () => {
    asAuthed();
    mockGetSession.mockResolvedValueOnce({
      ...BASE_SESSION,
      completedAt: new Date("2024-01-01T00:30:00Z"),
      completionPct: 100,
    });
    const res = await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { completed: true },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
    // Completed sessions are immutable — no write attempted.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("passes the user's timezone to updateSession on completion", async () => {
    asAuthed();
    mockGetSession.mockResolvedValueOnce(BASE_SESSION);
    mockGetProfile.mockResolvedValueOnce({
      userId: USER_ID,
      goals: [],
      focusAreas: [],
      avoidAreas: [],
      safetyFlag: false,
      reminderTime: null,
      timezone: "America/New_York",
      onboardedAt: null,
    });
    mockUpdate.mockResolvedValueOnce({
      ...BASE_SESSION,
      completedAt: new Date(),
      completionPct: 90,
    });

    const res = await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { completionPct: 90, completed: true },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      BASE_SESSION.id,
      expect.objectContaining({ completed: true, completionPct: 90 }),
      { timezone: "America/New_York" },
    );
  });

  it("does not fetch the profile when the PATCH isn't completing", async () => {
    asAuthed();
    mockGetSession.mockResolvedValueOnce(BASE_SESSION);
    mockUpdate.mockResolvedValueOnce({
      ...BASE_SESSION,
      durationDoneSec: 30,
    });

    await PATCH(
      jsonRequest(
        `http://localhost/api/sessions/${BASE_SESSION.id}`,
        { durationDoneSec: 30 },
        "PATCH",
      ),
      patchCtx(BASE_SESSION.id),
    );

    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      BASE_SESSION.id,
      expect.objectContaining({ durationDoneSec: 30 }),
      { timezone: undefined },
    );
  });
});
