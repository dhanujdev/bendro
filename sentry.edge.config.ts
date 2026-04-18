import * as Sentry from "@sentry/nextjs"

/**
 * Edge runtime Sentry init (middleware + edge route handlers).
 * No-op when SENTRY_DSN is unset.
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
