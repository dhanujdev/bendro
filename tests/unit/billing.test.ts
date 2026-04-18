import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

import {
  getSubscriptionStatus,
  isPremium,
  updateSubscriptionStatus,
  getOrCreateStripeCustomer,
  cancelSubscription,
} from "@/services/billing";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: { users: { findFirst: ReturnType<typeof vi.fn> } };
  update: ReturnType<typeof vi.fn>;
};

function makeUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update.mockReturnValueOnce({ set });
  return { set, where };
}

beforeEach(() => {
  vi.resetAllMocks();
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
  it("updates status only when no stripeCustomerId is given", async () => {
    const chain = makeUpdateChain();
    await updateSubscriptionStatus("u1", "active");
    expect(chain.set).toHaveBeenCalledWith({ subscriptionStatus: "active" });
  });

  it("includes stripeCustomerId when provided", async () => {
    const chain = makeUpdateChain();
    await updateSubscriptionStatus("u1", "active", "cus_123");
    expect(chain.set).toHaveBeenCalledWith({
      subscriptionStatus: "active",
      stripeCustomerId: "cus_123",
    });
  });
});

describe("getOrCreateStripeCustomer", () => {
  it("returns existing stripeCustomerId when present", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: "cus_existing",
    });
    expect(await getOrCreateStripeCustomer("u1", "a@b.com")).toBe(
      "cus_existing",
    );
  });

  it("throws when Stripe integration is not yet wired up", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({
      stripeCustomerId: null,
    });
    await expect(getOrCreateStripeCustomer("u1", "a@b.com")).rejects.toThrow(
      /Stripe integration not initialized/,
    );
  });

  it("throws when the user is not found", async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce(null);
    await expect(getOrCreateStripeCustomer("u1", "a@b.com")).rejects.toThrow(
      /Stripe integration not initialized/,
    );
  });
});

describe("cancelSubscription", () => {
  it("sets subscriptionStatus to 'canceled'", async () => {
    const chain = makeUpdateChain();
    await cancelSubscription("u1");
    expect(chain.set).toHaveBeenCalledWith({ subscriptionStatus: "canceled" });
  });
});
