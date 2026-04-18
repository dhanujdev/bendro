/**
 * Unit tests for `src/services/billing.ts` — Phase 9.
 *
 * Strategy: mock the Drizzle `db` helper for read/update assertions, and
 * replace `getStripe()` with a fake Stripe client via `process.env.STRIPE_SECRET_KEY`
 * absence (tested path for misconfigured envs) or by intercepting the
 * `stripe` module (tested path for real API calls).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

// Replace the `stripe` constructor so no real HTTP call is ever made. We
// control what each service call sees via `mockStripe` below. Must be a
// real constructor (not a plain arrow) because `billing.ts` calls it
// with `new Stripe(...)`.
const mockStripe = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
};
vi.mock("stripe", () => {
  function StripeMock() {
    return mockStripe;
  }
  return { default: StripeMock };
});

import {
  getSubscriptionStatus,
  isPremium,
  updateSubscriptionStatus,
  getOrCreateStripeCustomer,
  cancelSubscription,
  createCheckoutSession,
  verifyWebhookSignature,
  handleStripeEvent,
  _resetStripeClient,
} from "@/services/billing";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: { users: { findFirst: ReturnType<typeof vi.fn> } };
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function makeUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update.mockReturnValueOnce({ set });
  return { set, where };
}

function makeInsertChain(returned: Array<{ eventId: string }>) {
  const returning = vi.fn().mockResolvedValue(returned);
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing });
  mockDb.insert.mockReturnValueOnce({ values });
  return { values, onConflictDoNothing, returning };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetAllMocks();
  _resetStripeClient();
  process.env = {
    ...ORIGINAL_ENV,
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_WEBHOOK_SECRET: "whsec_fake",
    STRIPE_PREMIUM_PRICE_ID: "price_monthly_fake",
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getSubscriptionStatus", () => {
  it("returns 'free' when user has no subscriptionStatus", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce(null);
    expect(await getSubscriptionStatus("u1")).toBe("free");
  });

  it("returns the user's status when present", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      subscriptionStatus: "active",
    });
    expect(await getSubscriptionStatus("u1")).toBe("active");
  });

  it("returns 'free' when status field is missing", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({});
    expect(await getSubscriptionStatus("u1")).toBe("free");
  });
});

describe("isPremium", () => {
  it.each([
    ["active", true],
    ["trialing", true],
    ["free", false],
    ["past_due", false],
    ["canceled", false],
  ] as const)("maps %s -> %s", async (status, expected) => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      subscriptionStatus: status,
    });
    expect(await isPremium("u1")).toBe(expected);
  });

  it("returns false when the user does not exist", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce(null);
    expect(await isPremium("u1")).toBe(false);
  });
});

describe("updateSubscriptionStatus", () => {
  it("updates status + updatedAt when no stripeCustomerId is given", async () => {
    const chain = makeUpdateChain();
    await updateSubscriptionStatus("u1", "active");
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "active",
        updatedAt: expect.any(Date),
      }),
    );
    // And it does NOT include stripeCustomerId
    expect(chain.set.mock.calls[0][0]).not.toHaveProperty("stripeCustomerId");
  });

  it("includes stripeCustomerId when provided", async () => {
    const chain = makeUpdateChain();
    await updateSubscriptionStatus("u1", "active", "cus_123");
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "active",
        stripeCustomerId: "cus_123",
      }),
    );
  });
});

describe("getOrCreateStripeCustomer", () => {
  it("returns existing stripeCustomerId without hitting Stripe", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: "cus_existing",
    });
    expect(await getOrCreateStripeCustomer("u1", "a@b.com")).toBe(
      "cus_existing",
    );
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
  });

  it("creates a Stripe customer and persists the id when absent", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: null,
    });
    const chain = makeUpdateChain();
    mockStripe.customers.create.mockResolvedValueOnce({ id: "cus_new" });

    expect(await getOrCreateStripeCustomer("u1", "a@b.com")).toBe("cus_new");
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: "a@b.com",
      metadata: { userId: "u1" },
    });
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ stripeCustomerId: "cus_new" }),
    );
  });

  it("creates a Stripe customer when the user row does not yet exist", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce(null);
    makeUpdateChain();
    mockStripe.customers.create.mockResolvedValueOnce({ id: "cus_new2" });
    expect(await getOrCreateStripeCustomer("u1", "a@b.com")).toBe("cus_new2");
  });

  it("throws a configuration error when STRIPE_SECRET_KEY is unset", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: null,
    });
    await expect(
      getOrCreateStripeCustomer("u1", "a@b.com"),
    ).rejects.toThrow(/STRIPE_SECRET_KEY is not set/);
  });
});

describe("createCheckoutSession", () => {
  it("rejects priceIds not in the configured allowlist", async () => {
    await expect(
      createCheckoutSession({
        userId: "u1",
        email: "a@b.com",
        priceId: "price_not_in_allowlist",
        successUrl: "https://x/ok",
        cancelUrl: "https://x/no",
      }),
    ).rejects.toThrow(/UNKNOWN_PRICE/);
  });

  it("creates a Stripe Checkout Session when the priceId matches config", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: "cus_abc",
    });
    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      id: "cs_123",
      url: "https://checkout.stripe.com/c/pay/cs_123",
    });

    const res = await createCheckoutSession({
      userId: "u1",
      email: "a@b.com",
      priceId: "price_monthly_fake",
      successUrl: "https://x/ok",
      cancelUrl: "https://x/no",
    });
    expect(res.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
    expect(res.sessionId).toBe("cs_123");
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_abc",
        success_url: "https://x/ok",
        cancel_url: "https://x/no",
        client_reference_id: "u1",
      }),
    );
  });

  it("propagates Stripe-level failures when the session has no url", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: "cus_abc",
    });
    mockStripe.checkout.sessions.create.mockResolvedValueOnce({
      id: "cs_bad",
      url: null,
    });
    await expect(
      createCheckoutSession({
        userId: "u1",
        email: "a@b.com",
        priceId: "price_monthly_fake",
        successUrl: "https://x/ok",
        cancelUrl: "https://x/no",
      }),
    ).rejects.toThrow(/without a URL/);
  });
});

describe("verifyWebhookSignature", () => {
  it("delegates to Stripe SDK's constructEvent with the raw body", () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      id: "evt_ok",
      type: "customer.subscription.created",
    });
    const event = verifyWebhookSignature("raw-body", "t=123,v1=sig");
    expect(event.id).toBe("evt_ok");
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      "raw-body",
      "t=123,v1=sig",
      "whsec_fake",
    );
  });

  it("throws when the signature header is missing", () => {
    expect(() => verifyWebhookSignature("x", null)).toThrow(
      /Missing Stripe-Signature/,
    );
  });

  it("throws when STRIPE_WEBHOOK_SECRET is unset", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => verifyWebhookSignature("x", "sig")).toThrow(
      /STRIPE_WEBHOOK_SECRET is not set/,
    );
  });
});

describe("handleStripeEvent — idempotency", () => {
  it("short-circuits on duplicate event id (no state mutation)", async () => {
    // The insert returned zero rows => the event id already exists.
    makeInsertChain([]);
    const res = await handleStripeEvent({
      id: "evt_dup",
      type: "customer.subscription.created",
      data: { object: { id: "sub_1", metadata: { userId: "u1" }, status: "active" } },
    } as unknown as import("stripe").default.Event);

    expect(res).toEqual({
      received: true,
      duplicate: true,
      type: "customer.subscription.created",
      eventId: "evt_dup",
    });
    // No UPDATE on users when deduplicated
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("applies state change + marks processedAt on first delivery", async () => {
    // First call: insert into ledger succeeds (returns the event id).
    makeInsertChain([{ eventId: "evt_new" }]);
    // Second chain: the updateSubscriptionStatus call on users.
    const usersUpdate = makeUpdateChain();
    // Third chain: the processedAt update on stripe_webhook_events.
    const ledgerUpdate = makeUpdateChain();

    const res = await handleStripeEvent({
      id: "evt_new",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_1",
          metadata: { userId: "u1" },
          customer: "cus_abc",
          status: "active",
        },
      },
    } as unknown as import("stripe").default.Event);

    expect(res.duplicate).toBe(false);
    expect(usersUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "active",
        stripeCustomerId: "cus_abc",
      }),
    );
    expect(ledgerUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ processedAt: expect.any(Date) }),
    );
  });

  it("maps invoice.payment_failed to past_due", async () => {
    makeInsertChain([{ eventId: "evt_inv" }]);
    const usersUpdate = makeUpdateChain();
    makeUpdateChain();

    await handleStripeEvent({
      id: "evt_inv",
      type: "invoice.payment_failed",
      data: { object: { metadata: { userId: "u1" } } },
    } as unknown as import("stripe").default.Event);

    expect(usersUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "past_due" }),
    );
  });

  it("maps customer.subscription.deleted to canceled", async () => {
    makeInsertChain([{ eventId: "evt_del" }]);
    const usersUpdate = makeUpdateChain();
    makeUpdateChain();

    await handleStripeEvent({
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_1", metadata: { userId: "u1" } },
      },
    } as unknown as import("stripe").default.Event);

    expect(usersUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "canceled" }),
    );
  });

  it("records unknown event types in the ledger but skips state change", async () => {
    makeInsertChain([{ eventId: "evt_other" }]);
    // processedAt update
    makeUpdateChain();

    const res = await handleStripeEvent({
      id: "evt_other",
      type: "customer.created",
      data: { object: {} },
    } as unknown as import("stripe").default.Event);

    expect(res.duplicate).toBe(false);
    // Only the ledger update chain was consumed — no user-row update.
    // makeUpdateChain consumed db.update once; the users update was never called.
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });
});

describe("cancelSubscription", () => {
  it("sets subscriptionStatus to 'canceled'", async () => {
    const chain = makeUpdateChain();
    await cancelSubscription("u1");
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "canceled" }),
    );
  });
});
