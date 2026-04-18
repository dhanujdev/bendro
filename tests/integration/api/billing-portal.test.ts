/**
 * Integration tests for POST /api/billing/portal.
 *
 * Mocks the billing service + auth. Contract:
 *  - 401 UNAUTHENTICATED when no session
 *  - 400 VALIDATION_ERROR on malformed returnUrl
 *  - 409 CONFLICT when the user has no stripeCustomerId (NO_CUSTOMER)
 *  - 503 INTERNAL when Stripe is unconfigured (missing secret key)
 *  - 200 { data: { url } } on happy path
 *  - returnUrl defaults to `${NEXT_PUBLIC_APP_URL}/account`
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))
vi.mock("@/services/billing", () => ({
  createCustomerPortalSession: vi.fn(),
}))

import { POST } from "@/app/api/billing/portal/route"
import * as authModule from "@/lib/auth"
import * as billingModule from "@/services/billing"

const mockAuth = authModule.auth as unknown as ReturnType<typeof vi.fn>
const mockPortal = billingModule.createCustomerPortalSession as ReturnType<
  typeof vi.fn
>

const USER_ID = "00000000-0000-4000-8000-000000000002"
const AUTH_SESSION = {
  user: { id: USER_ID, email: "a@b.com" },
  expires: new Date(Date.now() + 60_000).toISOString(),
}

function buildRequest(body: unknown, url = "http://localhost/api/billing/portal") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(AUTH_SESSION)
  process.env.NEXT_PUBLIC_APP_URL = "https://bendro.example"
})

describe("POST /api/billing/portal", () => {
  it("returns 401 when the viewer is not signed in", async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("UNAUTHENTICATED")
    expect(mockPortal).not.toHaveBeenCalled()
  })

  it("returns 400 VALIDATION_ERROR for a malformed returnUrl", async () => {
    const res = await POST(buildRequest({ returnUrl: "not-a-url" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 409 CONFLICT when the user has no Stripe customer", async () => {
    mockPortal.mockRejectedValueOnce(new Error("NO_CUSTOMER"))
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe("CONFLICT")
  })

  it("returns 503 when STRIPE_SECRET_KEY is unset", async () => {
    mockPortal.mockRejectedValueOnce(new Error("STRIPE_SECRET_KEY is not set"))
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error.code).toBe("INTERNAL")
  })

  it("returns the portal URL on the happy path", async () => {
    mockPortal.mockResolvedValueOnce({
      url: "https://billing.stripe.com/p/session/xyz",
    })
    const res = await POST(
      buildRequest({ returnUrl: "https://bendro.example/account" }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.url).toBe("https://billing.stripe.com/p/session/xyz")
    expect(mockPortal).toHaveBeenCalledWith({
      userId: USER_ID,
      returnUrl: "https://bendro.example/account",
    })
  })

  it("defaults returnUrl to /account when omitted", async () => {
    mockPortal.mockResolvedValueOnce({
      url: "https://billing.stripe.com/p/session/default",
    })
    await POST(buildRequest({}))
    expect(mockPortal).toHaveBeenCalledWith({
      userId: USER_ID,
      returnUrl: "https://bendro.example/account",
    })
  })
})
