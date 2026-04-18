import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  /* config options here */
}

/**
 * `withSentryConfig` is inert when SENTRY_DSN / SENTRY_AUTH_TOKEN are unset:
 * it wraps the build but uploads no source maps and captures no events.
 * Safe to keep in the default export unconditionally.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
