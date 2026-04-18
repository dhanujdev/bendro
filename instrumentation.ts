/**
 * Next.js 16 instrumentation hook.
 *
 * Called once per runtime (`nodejs` or `edge`). Loads the matching Sentry
 * config file, which internally no-ops when SENTRY_DSN is absent — so it
 * is safe to keep this hook enabled even on deploys without Sentry wired.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs"
