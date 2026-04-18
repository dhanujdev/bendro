import { z } from "zod"

/**
 * Dev-friendly env validation.
 *
 * In production (NODE_ENV === "production"), every secret is required and the
 * app refuses to boot without them. In development/test, missing secrets are
 * optional so `pnpm dev` and `pnpm test` work on a fresh clone — wire real
 * values up in `.env.local` when you're ready to hit Neon / Stripe / NextAuth.
 */

const isProd = process.env.NODE_ENV === "production"

const prodRequired = z.string().min(1)
const devOptional = z.string().min(1).optional()

const envSchema = z.object({
  // Database (Neon Postgres)
  DATABASE_URL: isProd ? z.string().url() : z.string().url().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Stripe
  STRIPE_SECRET_KEY: isProd ? prodRequired : devOptional,
  STRIPE_WEBHOOK_SECRET: isProd ? prodRequired : devOptional,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: isProd ? prodRequired : devOptional,
  STRIPE_PREMIUM_PRICE_ID: isProd ? prodRequired : devOptional,

  // Auth
  NEXTAUTH_SECRET: isProd ? prodRequired : devOptional,
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),

  // AI (optional everywhere)
  OPENAI_API_KEY: z.string().optional(),

  // Node env
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(`Invalid environment variables:\n${missing}`)
  }
  return parsed.data
}

// Only validate at runtime, not during type-checking.
export const env =
  process.env.NODE_ENV === "test"
    ? (process.env as unknown as Env)
    : validateEnv()
