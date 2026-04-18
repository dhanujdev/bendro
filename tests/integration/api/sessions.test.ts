import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  startSession: vi.fn(),
  updateSession: vi.fn(),
}));

import { POST } from "@/app/api/sessions/route";
import { PATCH } from "@/app/api/sessions/[id]/route";
import * as dataModule from "@/lib/data";

const mockStart = dataModule.startSession as ReturnType<typeof vi.fn>;
const mockUpdate = dataModule.updateSession as ReturnType<typeof vi.fn>;

const BASE_SESSION = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "00000000-0000-4000-8000-000000000001",
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/sessions", () => {
  it("creates a session and returns 201", async () => {
    mockStart.mockResolvedValueOnce(BASE_SESSION);
    const res = await POST(
      jsonRequest("http://localhost/api/sessions", {
        userId: BASE_SESSION.userId,
        routineId: BASE_SESSION.routineId,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(BASE_SESSION.id);
  });

  it("returns INVALID_JSON for malformed body", async () => {
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

  it("returns VALIDATION_ERROR when userId isn't a UUID", async () => {
    const res = await POST(
      jsonRequest("http://localhost/api/sessions", {
        userId: "not-a-uuid",
        routineId: BASE_SESSION.routineId,
      }),
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

  it("updates a session and returns 200", async () => {
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

  it("returns NOT_FOUND when the session doesn't exist", async () => {
    mockUpdate.mockResolvedValueOnce(null);
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
});
