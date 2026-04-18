/**
 * Integration tests for /api/routines (GET list, POST create)
 * — mocks @/lib/data and invokes the handler directly with a Request.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  getRoutines: vi.fn(),
  createRoutine: vi.fn(),
}));

import { GET, POST } from "@/app/api/routines/route";
import * as dataModule from "@/lib/data";
import { NextRequest } from "next/server";

const mockGetRoutines = dataModule.getRoutines as ReturnType<typeof vi.fn>;
const mockCreateRoutine = dataModule.createRoutine as ReturnType<typeof vi.fn>;

const FULL_ROUTINE = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "morning-wake-up-flow",
  title: "Morning Wake Up Flow",
  description: "Gentle morning stretches.",
  goal: "flexibility",
  level: "gentle",
  totalDurationSec: 300,
  isPremium: false,
  isAiGenerated: false,
  ownerId: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

function buildRequest(url: string): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/routines", () => {
  it("returns {data, total, limit, offset} on happy path", async () => {
    mockGetRoutines.mockResolvedValueOnce({
      data: [FULL_ROUTINE],
      total: 1,
    });
    const res = await GET(buildRequest("http://localhost/api/routines"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
  });

  it("propagates filter query params to the data layer", async () => {
    mockGetRoutines.mockResolvedValueOnce({ data: [], total: 0 });
    await GET(
      buildRequest(
        "http://localhost/api/routines?goal=flexibility&level=gentle&isPremium=false&limit=5&offset=10",
      ),
    );
    expect(mockGetRoutines).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: "flexibility",
        level: "gentle",
        isPremium: false,
        limit: 5,
        offset: 10,
      }),
    );
  });

  it("returns VALIDATION_ERROR for a bad goal", async () => {
    const res = await GET(
      buildRequest("http://localhost/api/routines?goal=not_a_goal"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it("returns VALIDATION_ERROR when limit exceeds cap", async () => {
    const res = await GET(
      buildRequest("http://localhost/api/routines?limit=9999"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/routines", () => {
  it("creates a routine and returns 201", async () => {
    mockCreateRoutine.mockResolvedValueOnce(FULL_ROUTINE);
    const res = await POST(
      new NextRequest("http://localhost/api/routines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: "x",
          title: "x",
          description: null,
          goal: "flexibility",
          level: "gentle",
          totalDurationSec: 300,
          isPremium: false,
          isAiGenerated: false,
          ownerId: null,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.slug).toBe(FULL_ROUTINE.slug);
  });

  it("returns INVALID_JSON when the body isn't JSON", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/routines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("returns VALIDATION_ERROR when required fields are missing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/routines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "x" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details)).toBe(true);
  });
});
