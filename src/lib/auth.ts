import NextAuth from "next-auth"
import type { NextAuthConfig, Session } from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"

import { db, hasDatabaseUrl } from "@/db"
import {
  users,
  accounts,
  authSessions,
  verificationTokens,
} from "@/db/schema"

/**
 * Auth.js v5 configuration for bendro.
 *
 * See ADR-0004. This module is the ONLY place that imports `next-auth`.
 * `pre-pr-gate.py` enforces that rule.
 *
 * Session strategy: database (Drizzle-backed). Pros and cons discussed in
 * ADR-0004; the short version is "free revocation, one source of truth for
 * users, no password custody".
 */

function buildProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = []

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    )
  }

  if (process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM) {
    providers.push(
      Resend({
        apiKey: process.env.AUTH_RESEND_KEY,
        from: process.env.AUTH_EMAIL_FROM,
      }),
    )
  }

  return providers
}

/**
 * When `DATABASE_URL` is set we wire the Drizzle adapter (prod, staging,
 * local-with-Postgres). When it isn't (fresh clone, Vercel preview without
 * DB env, Playwright runs) we fall back to JWT sessions so the app can
 * still boot. The E2E auth-bypass seam below short-circuits `auth()` in
 * tests, so the adapter absence is invisible to callers.
 *
 * This also unblocks `pnpm build` page-data collection, which previously
 * threw "Unsupported database type (object)" when DrizzleAdapter inspected
 * the `db` Proxy at module load.
 */
const dbAdapterConfig: Partial<NextAuthConfig> = hasDatabaseUrl()
  ? {
      adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: authSessions,
        verificationTokensTable: verificationTokens,
      }),
      session: { strategy: "database" },
    }
  : {
      session: { strategy: "jwt" },
    }

export const authConfig = {
  ...dbAdapterConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  providers: buildProviders(),
  callbacks: {
    /**
     * Ensure `session.user.id` is the domain `users.id` uuid so API handlers
     * can use it as the authoritative userId. With JWT sessions the `user`
     * arg is undefined; fall back to `token.sub` (Auth.js sets it from the
     * provider account id during the first sign-in).
     */
    session({ session, user, token }) {
      if (session.user) {
        if (user?.id) {
          session.user.id = user.id
        } else if (token?.sub) {
          session.user.id = token.sub
        }
      }
      return session
    },
  },
} satisfies NextAuthConfig

const nextAuthInstance = NextAuth(authConfig)
export const { handlers, signIn, signOut } = nextAuthInstance
const nextAuthAuth = nextAuthInstance.auth

/**
 * E2E auth bypass seam.
 *
 * Playwright tests set cookies `e2e_user_id` / `e2e_user_email` to simulate
 * signed-in users without touching real OAuth providers. Gated by
 * `E2E_AUTH_BYPASS=1` AND `NODE_ENV !== "production"` so it is physically
 * impossible to enable in production even if an env var leaks.
 *
 * Returns `null` when the bypass is off or no cookie is set — callers fall
 * through to the real `nextAuthAuth()`.
 */
async function maybeE2eSession(): Promise<Session | null> {
  if (process.env.NODE_ENV === "production") return null
  if (process.env.E2E_AUTH_BYPASS !== "1") return null

  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const userId = cookieStore.get("e2e_user_id")?.value
  if (!userId) return null

  const email =
    cookieStore.get("e2e_user_email")?.value ?? `${userId}@e2e.local`
  const name = cookieStore.get("e2e_user_name")?.value ?? "E2E User"

  return {
    user: { id: userId, email, name },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session
}

/**
 * Auth resolver used by RSCs and route handlers.
 *
 * In production and in dev without the E2E flag this is a pass-through to
 * Auth.js. In Playwright runs with `E2E_AUTH_BYPASS=1` a synthetic session
 * is returned based on test-set cookies.
 */
export async function auth(): Promise<Session | null> {
  const bypass = await maybeE2eSession()
  if (bypass) return bypass
  return nextAuthAuth()
}
