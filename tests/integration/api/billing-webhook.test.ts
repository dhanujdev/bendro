/**
 * Integration tests for POST /api/webhooks/stripe.
 *
 * Stripe webhooks need the RAW body for HMAC verification. These tests
 * assert that the route:
 *  - passes the raw body text straight to verifyWebhookSignature
 *  - returns 400 on signature failure (without calling handleStripeEvent)
 *  - returns 200 with the service's dedup result on a valid delivery
 *  - returns 500 when the downstream handler throws (so Stripe retries)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/billing", () => ({
  verifyWebhookSignature: vi.fn(),
  handleStripeEvent: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/stripe/route";
import * as billingModule from "@/services/billing";

const mockVerify = billingModule.verifyWebhookSignature as ReturnType<
  typeof vi.fn
>;
const mockHandle = billingModule.handleStripeEvent as ReturnType<typeof vi.fn>;

function buildRequest(rawBody: string, signature: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== null) headers["stripe-signature"] = signature;
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 VALIDATION_ERROR when the signature is invalid", async () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error("No signatures found matching the expected signature for payload")
    });
    const res = await POST(buildRequest("{\"id\":\"evt_x\"}", "bad"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it("forwards the raw body text (not parsed JSON) to verifyWebhookSignature", async () => {
    mockVerify.mockReturnValueOnce({ id: "evt_1", type: "customer.subscription.created" });
    mockHandle.mockResolvedValueOnce({
      received: true,
      duplicate: false,
      type: "customer.subscription.created",
      eventId: "evt_1",
    });
    const raw = "{\"id\":\"evt_1\",\"type\":\"customer.subscription.created\"}";
    await POST(buildRequest(raw, "t=1,v1=sig"));
    expect(mockVerify).toHaveBeenCalledWith(raw, "t=1,v1=sig");
  });

  it("returns 200 + the dedup envelope on a valid delivery", async () => {
    mockVerify.mockReturnValueOnce({ id: "evt_2", type: "customer.subscription.updated" });
    mockHandle.mockResolvedValueOnce({
      received: true,
      duplicate: false,
      type: "customer.subscription.updated",
      eventId: "evt_2",
    });
    const res = await POST(buildRequest("{}", "sig"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      received: true,
      duplicate: false,
      type: "customer.subscription.updated",
      eventId: "evt_2",
    });
  });

  it("returns duplicate=true when the event was already processed", async () => {
    mockVerify.mockReturnValueOnce({ id: "evt_dup", type: "customer.subscription.created" });
    mockHandle.mockResolvedValueOnce({
      received: true,
      duplicate: true,
      type: "customer.subscription.created",
      eventId: "evt_dup",
    });
    const res = await POST(buildRequest("{}", "sig"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
  });

  it("returns 500 when handleStripeEvent throws (so Stripe retries)", async () => {
    mockVerify.mockReturnValueOnce({ id: "evt_err", type: "customer.subscription.created" });
    mockHandle.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(buildRequest("{}", "sig"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
  });
});
