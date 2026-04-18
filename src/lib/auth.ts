import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"

import { db } from "@/db"
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

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  providers: buildProviders(),
  callbacks: {
    /**
     * Ensure `session.user.id` is the domain `users.id` uuid so API handlers
     * can use it as the authoritative userId.
     */
    session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id
      }
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
