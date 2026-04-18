import * as Sentry from "@sentry/nextjs"

/**
 * Client-side Sentry init. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
 *
 * We read the DSN from the public env (`NEXT_PUBLIC_SENTRY_DSN`) so it
 * can be inlined into the client bundle. Server-side config reads the
 * private `SENTRY_DSN`; both can point at the same project.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
    ),
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
  })
}
