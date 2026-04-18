/**
 * Integration tests for POST /api/billing/checkout.
 *
 * Mocks the billing service + auth. The route contract we lock in:
 *  - 401 UNAUTHENTICATED when no session
 *  - 400 VALIDATION_ERROR on bad body
 *  - 400 VALIDATION_ERROR when priceId isn't in the server-side allowlist
 *  - 201 { data: { url, sessionId } } on happy path
 *  - default success/cancel URLs derived from NEXT_PUBLIC_APP_URL
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/services/billing", () => ({
  createCheckoutSession: vi.fn(),
}));

import { POST } from "@/app/api/billing/checkout/route";
import * as authModule from "@/lib/auth";
import * as billingModule from "@/services/billing";

const mockAuth = authModule.auth as unknown as ReturnType<typeof vi.fn>;
const mockCreate = billingModule.createCheckoutSession as ReturnType<
  typeof vi.fn
>;

const USER_ID = "00000000-0000-4000-8000-000000000001";
const AUTH_SESSION = {
  user: { id: USER_ID, email: "a@b.com" },
  expires: new Date(Date.now() + 60_000).toISOString(),
};

function buildRequest(body: unknown, url = "http://localhost/api/billing/checkout") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockAuth.mockResolvedValue(AUTH_SESSION);
  process.env.NEXT_PUBLIC_APP_URL = "https://bendro.example";
});

describe("POST /api/billing/checkout", () => {
  it("returns 401 when the viewer is not signed in", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(buildRequest({ priceId: "price_abc" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_JSON on malformed body", async () => {
    const res = await POST(buildRequest("not-json"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("returns 400 VALIDATION_ERROR when priceId is missing", async () => {
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when the service rejects UNKNOWN_PRICE", async () => {
    mockCreate.mockRejectedValueOnce(new Error("UNKNOWN_PRICE"));
    const res = await POST(buildRequest({ priceId: "price_off_allowlist" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toMatch(/allowlist/i);
  });

  it("returns 503 INTERNAL when Stripe is not configured", async () => {
    mockCreate.mockRejectedValueOnce(new Error("STRIPE_SECRET_KEY is not set"));
    const res = await POST(buildRequest({ priceId: "price_x" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
  });

  it("returns 201 with the checkout URL on happy path", async () => {
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/c/pay/cs_123",
      sessionId: "cs_123",
    });
    const res = await POST(
      buildRequest({
        priceId: "price_x",
        successUrl: "https://app/ok",
        cancelUrl: "https://app/no",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
    expect(body.data.sessionId).toBe("cs_123");

    // Route passes the userId from the auth session — never from the body
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        email: "a@b.com",
        priceId: "price_x",
        successUrl: "https://app/ok",
        cancelUrl: "https://app/no",
      }),
    );
  });

  it("derives default success/cancel URLs from NEXT_PUBLIC_APP_URL when omitted", async () => {
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/c/pay/cs_222",
      sessionId: "cs_222",
    });
    await POST(buildRequest({ priceId: "price_x" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: "https://bendro.example/settings/billing?checkout=success",
        cancelUrl: "https://bendro.example/settings/billing?checkout=cancel",
      }),
    );
  });

  it("ignores any userId or email in the request body — session is source of truth", async () => {
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/c/pay/cs_333",
      sessionId: "cs_333",
    });
    await POST(
      buildRequest({
        priceId: "price_x",
        userId: "spoofed-user-id",
        email: "attacker@evil",
      }),
    );
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.userId).toBe(USER_ID);
    expect(callArgs.email).toBe("a@b.com");
  });
});
