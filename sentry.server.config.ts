import * as Sentry from "@sentry/nextjs"

/**
 * Server-side Sentry init.
 *
 * No-op when SENTRY_DSN is unset — keeps local dev + CI free of noise
 * and allows preview deploys without a Sentry project to still run.
 * Loaded by `instrumentation.ts` via `process.env.NEXT_RUNTIME === "nodejs"`.
 */
const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
  })
}
