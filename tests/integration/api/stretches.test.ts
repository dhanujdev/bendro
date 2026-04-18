import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({
  listStretches: vi.fn(),
}));

import { GET } from "@/app/api/stretches/route";
import * as dataModule from "@/lib/data";
import { NextRequest } from "next/server";

const mockList = dataModule.listStretches as ReturnType<typeof vi.fn>;

const STRETCH = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "neck-side-tilt",
  name: "Neck Side Tilt",
  instructions: "Tilt your head slowly to one side and hold.",
  cues: ["Breathe"],
  cautions: ["Stop if painful"],
  bodyAreas: ["neck"],
  intensity: "gentle",
  bilateral: true,
  defaultDurationSec: 30,
  mediaUrl: null,
  thumbnailUrl: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/stretches", () => {
  it("returns a page of stretches on happy path", async () => {
    mockList.mockResolvedValueOnce({ data: [STRETCH], total: 1 });
    const res = await GET(new NextRequest("http://localhost/api/stretches"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
  });

  it("propagates bodyArea/intensity filters to data layer", async () => {
    mockList.mockResolvedValueOnce({ data: [], total: 0 });
    await GET(
      new NextRequest(
        "http://localhost/api/stretches?bodyArea=neck&intensity=gentle&limit=10&offset=5",
      ),
    );
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({
        bodyArea: "neck",
        intensity: "gentle",
        limit: 10,
        offset: 5,
      }),
    );
  });

  it("returns VALIDATION_ERROR on unknown bodyArea", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/stretches?bodyArea=left_elbow"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR on negative offset", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/stretches?offset=-1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
