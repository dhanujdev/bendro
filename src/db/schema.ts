import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const bodyAreaEnum = pgEnum("body_area", [
  "neck",
  "shoulders",
  "chest",
  "upper_back",
  "lower_back",
  "hips",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "ankles",
  "wrists",
  "full_body",
]);

export const goalEnum = pgEnum("goal", [
  "flexibility",
  "mobility",
  "recovery",
  "stress_relief",
  "posture",
  "athletic_performance",
  "pain_relief",
]);

export const intensityEnum = pgEnum("intensity", [
  "gentle",
  "moderate",
  "deep",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const entityTypeEnum = pgEnum("entity_type", [
  "routine",
  "stretch",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const stretches = pgTable(
  "stretches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    cues: jsonb("cues").$type<string[]>().notNull().default([]),
    cautions: jsonb("cautions").$type<string[]>().notNull().default([]),
    bodyAreas: jsonb("body_areas")
      .$type<string[]>()
      .notNull()
      .default([]),
    intensity: intensityEnum("intensity").notNull().default("moderate"),
    bilateral: boolean("bilateral").notNull().default(false),
    defaultDurationSec: integer("default_duration_sec").notNull().default(30),
    mediaUrl: text("media_url"),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("stretches_slug_idx").on(t.slug)]
);

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    goal: goalEnum("goal").notNull(),
    level: intensityEnum("level").notNull().default("moderate"),
    totalDurationSec: integer("total_duration_sec").notNull(),
    isPremium: boolean("is_premium").notNull().default(false),
    isAiGenerated: boolean("is_ai_generated").notNull().default(false),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("routines_slug_idx").on(t.slug),
    index("routines_owner_idx").on(t.ownerId),
    index("routines_goal_idx").on(t.goal),
  ]
);

export const routineStretches = pgTable(
  "routine_stretches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    stretchId: uuid("stretch_id")
      .notNull()
      .references(() => stretches.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    durationSec: integer("duration_sec").notNull(),
    sideFirst: text("side_first"),
  },
  (t) => [
    index("routine_stretches_routine_idx").on(t.routineId),
    uniqueIndex("routine_stretches_unique").on(t.routineId, t.orderIndex),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    // NextAuth-adapter columns (ADR-0004). Nullable because magic-link
    // flows create a user row before the user has filled in a profile.
    name: text("name"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    // Domain columns
    displayName: text("display_name"),
    goals: jsonb("goals").$type<string[]>().notNull().default([]),
    focusAreas: jsonb("focus_areas").$type<string[]>().notNull().default([]),
    avoidAreas: jsonb("avoid_areas").$type<string[]>().notNull().default([]),
    // Derived from onboarding pre-existing-condition questions per
    // HEALTH_RULES.md §Pre-Existing Condition Gating. We persist only the
    // boolean — never the individual answers (privacy). Set true if the user
    // answered "yes" to ANY: recent injury, recent surgery, diagnosed
    // joint/spine condition, pregnancy. User can clear this flag later.
    safetyFlag: boolean("safety_flag").notNull().default(false),
    onboardedAt: timestamp("onboarded_at"),
    reminderTime: text("reminder_time"),
    timezone: text("timezone").notNull().default("UTC"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("free"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_stripe_idx").on(t.stripeCustomerId),
  ]
);

// ─── NextAuth (Auth.js v5) tables — see ADR-0004 ──────────────────────────────
//
// Drizzle adapter expects: users, accounts, sessions, verificationTokens.
// We extended the existing `users` above. The session table is named
// `auth_sessions` to avoid collision with the workout `sessions` table (D-006).

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_idx").on(t.userId),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    routineId: uuid("routine_id").references(() => routines.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    durationDoneSec: integer("duration_done_sec").notNull().default(0),
    completionPct: real("completion_pct").notNull().default(0),
    skippedStretchIds: jsonb("skipped_stretch_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    painFeedback: jsonb("pain_feedback")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_routine_idx").on(t.routineId),
    index("sessions_started_at_idx").on(t.startedAt),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("favorites_unique").on(t.userId, t.entityType, t.entityId),
    index("favorites_user_idx").on(t.userId),
  ]
);

export const streaks = pgTable(
  "streaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    currentCount: integer("current_count").notNull().default(0),
    longestCount: integer("longest_count").notNull().default(0),
    lastActiveDate: text("last_active_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("streaks_user_idx").on(t.userId)]
);

// ─── Relations ────────────────────────────────────────────────────────────────
//
// Declared explicitly so Drizzle's relational query API (`db.query.X.findFirst({
// with: { … } })`) works at runtime. Without these, queries like
//   db.query.routines.findFirst({ with: { routineStretches: { with: { stretch } } } })
// throw: "No relation found for routineStretches".

export const usersRelations = relations(users, ({ many }) => ({
  routines: many(routines),
  sessions: many(sessions),
  favorites: many(favorites),
  streaks: many(streaks),
  accounts: many(accounts),
  authSessions: many(authSessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  owner: one(users, {
    fields: [routines.ownerId],
    references: [users.id],
  }),
  routineStretches: many(routineStretches),
  sessions: many(sessions),
}));

export const routineStretchesRelations = relations(
  routineStretches,
  ({ one }) => ({
    routine: one(routines, {
      fields: [routineStretches.routineId],
      references: [routines.id],
    }),
    stretch: one(stretches, {
      fields: [routineStretches.stretchId],
      references: [stretches.id],
    }),
  })
);

export const stretchesRelations = relations(stretches, ({ many }) => ({
  routineStretches: many(routineStretches),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  routine: one(routines, {
    fields: [sessions.routineId],
    references: [routines.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, {
    fields: [streaks.userId],
    references: [users.id],
  }),
}));

// ─── Types inferred from schema ───────────────────────────────────────────────

export type Stretch = typeof stretches.$inferSelect;
export type NewStretch = typeof stretches.$inferInsert;
export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
export type RoutineStretch = typeof routineStretches.$inferSelect;
export type NewRoutineStretch = typeof routineStretches.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type Streak = typeof streaks.$inferSelect;
export type NewStreak = typeof streaks.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
