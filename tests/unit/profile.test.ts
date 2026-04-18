import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}))

import { getProfile, updateProfile } from "@/services/profile"
import { db } from "@/db"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: { users: { findFirst: ReturnType<typeof vi.fn> } }
  update: ReturnType<typeof vi.fn>
}

const USER_ID = "00000000-0000-4000-8000-000000000001"

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: USER_ID,
    goals: ["flexibility"],
    focusAreas: [],
    avoidAreas: [],
    safetyFlag: false,
    reminderTime: null,
    timezone: "UTC",
    onboardedAt: null,
    ...overrides,
  }
}

function captureUpdate(returnRow: Record<string, unknown>) {
  const returningSpy = vi.fn().mockResolvedValue([returnRow])
  const whereSpy = vi.fn().mockReturnValue({ returning: returningSpy })
  const setSpy = vi.fn().mockReturnValue({ where: whereSpy })
  mockDb.update.mockReturnValueOnce({ set: setSpy })
  return { setSpy, whereSpy, returningSpy }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("getProfile", () => {
  it("maps the users row to a UserProfile", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce(
      row({ goals: ["mobility"], timezone: "America/New_York", safetyFlag: true }),
    )
    const profile = await getProfile(USER_ID)
    expect(profile.userId).toBe(USER_ID)
    expect(profile.goals).toEqual(["mobility"])
    expect(profile.timezone).toBe("America/New_York")
    expect(profile.safetyFlag).toBe(true)
    expect(profile.onboardedAt).toBeNull()
  })

  it("throws when the user is not found", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce(undefined)
    await expect(getProfile(USER_ID)).rejects.toThrow(/not found/)
  })
})

describe("updateProfile", () => {
  it("writes only the supplied fields (partial patch)", async () => {
    const { setSpy } = captureUpdate(row({ goals: ["mobility"] }))
    await updateProfile(USER_ID, { goals: ["mobility"] })
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>
    expect(written.goals).toEqual(["mobility"])
    expect(written).toHaveProperty("updatedAt")
    // Untouched fields must NOT be written (partial-patch invariant).
    expect(written).not.toHaveProperty("focusAreas")
    expect(written).not.toHaveProperty("avoidAreas")
    expect(written).not.toHaveProperty("safetyFlag")
    expect(written).not.toHaveProperty("reminderTime")
    expect(written).not.toHaveProperty("timezone")
    expect(written).not.toHaveProperty("onboardedAt")
  })

  it("writes safetyFlag when provided", async () => {
    const { setSpy } = captureUpdate(row({ safetyFlag: true }))
    await updateProfile(USER_ID, { safetyFlag: true })
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>
    expect(written.safetyFlag).toBe(true)
  })

  it("writes reminderTime=null when explicitly cleared", async () => {
    const { setSpy } = captureUpdate(row({ reminderTime: null }))
    await updateProfile(USER_ID, { reminderTime: null })
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>
    expect(written).toHaveProperty("reminderTime", null)
  })

  it("sets onboardedAt when markOnboarded is true", async () => {
    const { setSpy } = captureUpdate(
      row({ onboardedAt: new Date("2026-04-18T00:00:00Z") }),
    )
    await updateProfile(USER_ID, { markOnboarded: true })
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>
    expect(written.onboardedAt).toBeInstanceOf(Date)
  })

  it("does NOT set onboardedAt when markOnboarded is false", async () => {
    const { setSpy } = captureUpdate(row())
    await updateProfile(USER_ID, { markOnboarded: false })
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>
    expect(written).not.toHaveProperty("onboardedAt")
  })

  it("passes all scalar fields through when provided together", async () => {
    const { setSpy } = captureUpdate(
      row({
        goals: ["flexibility", "mobility"],
        focusAreas: ["hips"],
        avoidAreas: ["lower_back"],
        safetyFlag: true,
        reminderTime: "08:00",
        timezone: "America/Los_Angeles",
      }),
    )
    await updateProfile(USER_ID, {
      goals: ["flexibility", "mobility"],
      focusAreas: ["hips"],
      avoidAreas: ["lower_back"],
      safetyFlag: true,
      reminderTime: "08:00",
      timezone: "America/Los_Angeles",
    })
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>
    expect(written.goals).toEqual(["flexibility", "mobility"])
    expect(written.focusAreas).toEqual(["hips"])
    expect(written.avoidAreas).toEqual(["lower_back"])
    expect(written.safetyFlag).toBe(true)
    expect(written.reminderTime).toBe("08:00")
    expect(written.timezone).toBe("America/Los_Angeles")
  })

  it("throws when the user does not exist", async () => {
    const returningSpy = vi.fn().mockResolvedValue([])
    const whereSpy = vi.fn().mockReturnValue({ returning: returningSpy })
    const setSpy = vi.fn().mockReturnValue({ where: whereSpy })
    mockDb.update.mockReturnValueOnce({ set: setSpy })
    await expect(updateProfile(USER_ID, { goals: ["mobility"] })).rejects.toThrow(
      /not found/,
    )
  })
})
