import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

/**
 * Lazy-initialized Drizzle client.
 *
 * The connection is only created on first property access, so importing
 * `@/db` in a file that's bundled for the client (or loaded in dev without
 * `DATABASE_URL` set) won't crash. It throws the moment code actually tries
 * to run a query, which is the correct time to surface the misconfiguration.
 */

type Drizzle = ReturnType<typeof drizzle<typeof schema>>

let _db: Drizzle | null = null

function getDb(): Drizzle {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local to run queries against Neon.",
    )
  }
  _db = drizzle(neon(url), { schema })
  return _db
}

export const db = new Proxy({} as Drizzle, {
  get(_, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

export type DB = Drizzle

/**
 * True if `DATABASE_URL` is set to a non-empty value. The single source of
 * truth for "is a DB configured". Used by callers that need to decide
 * up front whether to attempt a DB call vs. go straight to mock data —
 * e.g. future CLI tooling, seed scripts, or test setup.
 *
 * `src/lib/data.ts` deliberately does NOT call this helper — it relies on
 * the service layer throwing with a recognizable message and on
 * `isFallbackError` to decide. That way a partially-misconfigured env
 * (URL set but DNS unreachable) also falls back, instead of hanging.
 */
export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0)
}
