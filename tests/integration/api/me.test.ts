import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/data", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

import { GET, PATCH } from "@/app/api/me/route"
import * as dataModule from "@/lib/data"
import * as authModule from "@/lib/auth"
import { NextRequest } from "next/server"

const mockGet = dataModule.getUserProfile as ReturnType<typeof vi.fn>
const mockUpdate = dataModule.updateUserProfile as ReturnType<typeof vi.fn>
const mockAuth = authModule.auth as unknown as ReturnType<typeof vi.fn>

const USER_ID = "00000000-0000-4000-8000-000000000001"

const BASE_PROFILE = {
  userId: USER_ID,
  goals: [],
  focusAreas: [],
  avoidAreas: [],
  safetyFlag: false,
  reminderTime: null as string | null,
  timezone: "UTC",
  onboardedAt: null as Date | null,
}

function asAuthed() {
  mockAuth.mockResolvedValue({
    user: { id: USER_ID, email: "u@example.com", name: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  })
}

function asGuest() {
  mockAuth.mockResolvedValue(null)
}

function patch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/me", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("GET /api/me", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    asGuest()
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("UNAUTHENTICATED")
  })

  it("returns the profile for the signed-in user", async () => {
    asAuthed()
    mockGet.mockResolvedValueOnce({
      ...BASE_PROFILE,
      goals: ["flexibility"],
      timezone: "America/Los_Angeles",
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.userId).toBe(USER_ID)
    expect(body.data.goals).toEqual(["flexibility"])
    expect(body.data.timezone).toBe("America/Los_Angeles")
    expect(body.data.safetyFlag).toBe(false)
  })
})

describe("PATCH /api/me", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    asGuest()
    const res = await PATCH(patch({ goals: ["flexibility"] }))
    expect(res.status).toBe(401)
  })

  it("returns INVALID_JSON for a malformed body", async () => {
    asAuthed()
    const res = await PATCH(patch("{ not-json"))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("INVALID_JSON")
  })

  it("returns VALIDATION_ERROR for unknown fields (strict)", async () => {
    asAuthed()
    const res = await PATCH(patch({ goals: ["flexibility"], surprise: true }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns VALIDATION_ERROR for an invalid goal", async () => {
    asAuthed()
    const res = await PATCH(patch({ goals: ["invalid-goal"] }))
    expect(res.status).toBe(400)
  })

  it("returns VALIDATION_ERROR for malformed reminderTime", async () => {
    asAuthed()
    const res = await PATCH(patch({ reminderTime: "8am" }))
    expect(res.status).toBe(400)
  })

  it("persists goals + timezone and returns the updated profile", async () => {
    asAuthed()
    mockUpdate.mockResolvedValueOnce({
      ...BASE_PROFILE,
      goals: ["flexibility", "mobility"],
      timezone: "America/New_York",
    })
    const res = await PATCH(
      patch({
        goals: ["flexibility", "mobility"],
        timezone: "America/New_York",
      }),
    )
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(USER_ID, {
      goals: ["flexibility", "mobility"],
      timezone: "America/New_York",
    })
    const body = await res.json()
    expect(body.data.goals).toEqual(["flexibility", "mobility"])
  })

  it("derives safetyFlag=true when ANY condition is true and NEVER persists the conditions object", async () => {
    asAuthed()
    mockUpdate.mockResolvedValueOnce({ ...BASE_PROFILE, safetyFlag: true })
    const res = await PATCH(
      patch({
        conditions: {
          recentInjury: false,
          recentSurgery: true,
          jointOrSpineCondition: false,
          pregnancy: false,
        },
      }),
    )
    expect(res.status).toBe(200)
    const callPatch = mockUpdate.mock.calls[0][1] as Record<string, unknown>
    expect(callPatch.safetyFlag).toBe(true)
    // Privacy invariant from HEALTH_RULES.md — individual answers must not
    // cross into the persistence layer.
    expect(callPatch).not.toHaveProperty("conditions")
    expect(callPatch).not.toHaveProperty("recentInjury")
    expect(callPatch).not.toHaveProperty("recentSurgery")
  })

  it("derives safetyFlag=false when ALL conditions are false", async () => {
    asAuthed()
    mockUpdate.mockResolvedValueOnce({ ...BASE_PROFILE, safetyFlag: false })
    await PATCH(
      patch({
        conditions: {
          recentInjury: false,
          recentSurgery: false,
          jointOrSpineCondition: false,
          pregnancy: false,
        },
      }),
    )
    const callPatch = mockUpdate.mock.calls[0][1] as Record<string, unknown>
    expect(callPatch.safetyFlag).toBe(false)
  })

  it("passes markOnboarded through to the data layer", async () => {
    asAuthed()
    mockUpdate.mockResolvedValueOnce({
      ...BASE_PROFILE,
      onboardedAt: new Date("2026-04-18T00:00:00Z"),
    })
    const res = await PATCH(patch({ markOnboarded: true }))
    expect(res.status).toBe(200)
    const callPatch = mockUpdate.mock.calls[0][1] as Record<string, unknown>
    expect(callPatch.markOnboarded).toBe(true)
  })

  it("uses the session userId, never a client-supplied one", async () => {
    asAuthed()
    mockUpdate.mockResolvedValueOnce(BASE_PROFILE)
    await PATCH(
      patch({
        // Deliberately try to override — strict schema should reject, NOT
        // silently write to the wrong user. userId is not in the schema at
        // all, so this trips additionalProperties=false.
        userId: "99999999-9999-4999-8999-999999999999",
        goals: ["mobility"],
      }),
    )
    // PATCH rejected by strict validation
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
