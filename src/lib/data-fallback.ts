/**
 * Helpers that classify an error thrown by the Drizzle/Neon service layer
 * as either "fall back to mock data" (missing env, connection-level failure)
 * or "propagate" (business / validation errors that callers should handle).
 *
 * Lives in its own module so the classifier can be unit-tested without
 * needing to mock the full data-adapter surface.
 */

/**
 * True if the error indicates the DB isn't reachable or configured —
 * the two cases where the mock-data fallback is correct. Anything else
 * (Zod validation, unique-constraint, programming bugs in the service
 * layer) should surface to the caller instead of being silently masked.
 */
export function isFallbackError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message
  if (/DATABASE_URL is not set/i.test(m)) return true
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(m)) return true
  if (/getaddrinfo|connect\s/i.test(m)) return true
  return false
}

/**
 * Short, human-readable reason string used in the one-shot fallback log
 * so dev output stays scannable even when a local clone has no DB.
 */
export function shortReason(msg: string): string {
  if (/DATABASE_URL is not set/i.test(msg)) return "DATABASE_URL not set"
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg))
    return "db unreachable"
  return msg.slice(0, 80)
}
