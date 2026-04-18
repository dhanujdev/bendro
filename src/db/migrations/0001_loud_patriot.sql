ALTER TABLE "users" ADD COLUMN "safety_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp;