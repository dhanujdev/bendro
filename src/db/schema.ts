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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
    displayName: text("display_name"),
    goals: jsonb("goals").$type<string[]>().notNull().default([]),
    focusAreas: jsonb("focus_areas").$type<string[]>().notNull().default([]),
    avoidAreas: jsonb("avoid_areas").$type<string[]>().notNull().default([]),
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
