import type { DefaultSession } from "next-auth"

/**
 * Extend Auth.js's default Session type so `session.user.id` is always present
 * and typed as a string. The id value comes from the adapter user row, wired
 * through the `session` callback in `src/lib/auth.ts`.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
