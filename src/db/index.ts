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
