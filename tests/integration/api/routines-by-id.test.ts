import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  getRoutineByIdOrSlug: vi.fn(),
}));

import { GET } from "@/app/api/routines/[id]/route";
import * as dataModule from "@/lib/data";

const mockGet = dataModule.getRoutineByIdOrSlug as ReturnType<typeof vi.fn>;

const ROUTINE_WITH_STRETCHES = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "morning-wake-up-flow",
  title: "Morning",
  description: null,
  goal: "flexibility",
  level: "gentle",
  totalDurationSec: 300,
  isPremium: false,
  isAiGenerated: false,
  ownerId: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  routineStretches: [],
};

function invoke(id: string) {
  return GET(new Request(`http://localhost/api/routines/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/routines/[id]", () => {
  it("returns 200 and the routine when present", async () => {
    mockGet.mockResolvedValueOnce(ROUTINE_WITH_STRETCHES);
    const res = await invoke("morning-wake-up-flow");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.slug).toBe("morning-wake-up-flow");
    expect(Array.isArray(body.data.routineStretches)).toBe(true);
  });

  it("returns NOT_FOUND when the routine does not exist", async () => {
    mockGet.mockResolvedValueOnce(null);
    const res = await invoke("does-not-exist");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toMatch(/not found/i);
  });

  it("forwards the id param to the data layer", async () => {
    mockGet.mockResolvedValueOnce(ROUTINE_WITH_STRETCHES);
    await invoke("abc-123");
    expect(mockGet).toHaveBeenCalledWith("abc-123");
  });
});
