import { z } from "zod";
import { BodyAreaSchema } from "./stretch";
import { GoalSchema } from "./routine";

export const SubscriptionStatusSchema = z.enum([
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  goals: z.array(GoalSchema),
  focusAreas: z.array(BodyAreaSchema),
  avoidAreas: z.array(BodyAreaSchema),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  timezone: z.string(),
  subscriptionStatus: SubscriptionStatusSchema,
  stripeCustomerId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type UserType = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  goals: z.array(GoalSchema).default([]),
  focusAreas: z.array(BodyAreaSchema).default([]),
  avoidAreas: z.array(BodyAreaSchema).default([]),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  timezone: z.string().default("UTC"),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial();
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// ─── Billing (Phase 9) ────────────────────────────────────────────────────────
//
// Request schema for POST /api/billing/checkout. priceId is validated against
// the server-side allowlist inside `src/config/billing.ts`; the client can
// only submit Stripe price ids we've configured, which closes the attack
// vector where a buggy UI could redirect a user into an unrelated checkout.

export const CreateCheckoutSessionBodySchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CreateCheckoutSessionBody = z.infer<
  typeof CreateCheckoutSessionBodySchema
>;

export const CreateCheckoutSessionResponseSchema = z.object({
  data: z.object({
    url: z.string().url(),
    sessionId: z.string(),
  }),
});
export type CreateCheckoutSessionResponse = z.infer<
  typeof CreateCheckoutSessionResponseSchema
>;

export const StreakSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  currentCount: z.number().int().min(0),
  longestCount: z.number().int().min(0),
  lastActiveDate: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type StreakType = z.infer<typeof StreakSchema>;
