import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { SubscriptionStatus } from "@/types/user";

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { subscriptionStatus: true },
  });
  return user?.subscriptionStatus ?? "free";
}

export async function isPremium(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId);
  return status === "active" || status === "trialing";
}

export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus,
  stripeCustomerId?: string
) {
  const values: Partial<typeof users.$inferInsert> = { subscriptionStatus: status };
  if (stripeCustomerId) values.stripeCustomerId = stripeCustomerId;
  await db.update(users).set(values).where(eq(users.id, userId));
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripeCustomerId: true },
  });
  if (user?.stripeCustomerId) return user.stripeCustomerId;

  void email; // used when Stripe SDK is wired up
  throw new Error("Stripe integration not initialized");
}

export async function cancelSubscription(userId: string) {
  await db
    .update(users)
    .set({ subscriptionStatus: "canceled" })
    .where(eq(users.id, userId));
}
