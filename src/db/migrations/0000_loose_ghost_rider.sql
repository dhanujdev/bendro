CREATE TYPE "public"."body_area" AS ENUM('neck', 'shoulders', 'chest', 'upper_back', 'lower_back', 'hips', 'glutes', 'quads', 'hamstrings', 'calves', 'ankles', 'wrists', 'full_body');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('routine', 'stretch');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('flexibility', 'mobility', 'recovery', 'stress_relief', 'posture', 'athletic_performance', 'pain_relief');--> statement-breakpoint
CREATE TYPE "public"."intensity" AS ENUM('gentle', 'moderate', 'deep');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('free', 'trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_stretches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"stretch_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"duration_sec" integer NOT NULL,
	"side_first" text
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"goal" "goal" NOT NULL,
	"level" "intensity" DEFAULT 'moderate' NOT NULL,
	"total_duration_sec" integer NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "routines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"routine_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_done_sec" integer DEFAULT 0 NOT NULL,
	"completion_pct" real DEFAULT 0 NOT NULL,
	"skipped_stretch_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pain_feedback" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"longest_count" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "stretches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"cues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cautions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"intensity" "intensity" DEFAULT 'moderate' NOT NULL,
	"bilateral" boolean DEFAULT false NOT NULL,
	"default_duration_sec" integer DEFAULT 30 NOT NULL,
	"media_url" text,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stretches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" timestamp,
	"image" text,
	"display_name" text,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"focus_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avoid_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reminder_time" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_stretches" ADD CONSTRAINT "routine_stretches_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_stretches" ADD CONSTRAINT "routine_stretches_stretch_id_stretches_id_fk" FOREIGN KEY ("stretch_id") REFERENCES "public"."stretches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_unique" ON "favorites" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "routine_stretches_routine_idx" ON "routine_stretches" USING btree ("routine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_stretches_unique" ON "routine_stretches" USING btree ("routine_id","order_index");--> statement-breakpoint
CREATE INDEX "routines_slug_idx" ON "routines" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "routines_owner_idx" ON "routines" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "routines_goal_idx" ON "routines" USING btree ("goal");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_routine_idx" ON "sessions" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "streaks_user_idx" ON "streaks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stretches_slug_idx" ON "stretches" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_stripe_idx" ON "users" USING btree ("stripe_customer_id");