import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for Bendro e2e.
 *
 * We run the full dev server in-process via `webServer` so the tests
 * always hit real Next.js routing (not a mock). The E2E_AUTH_BYPASS +
 * E2E_USER_ID env vars switch src/lib/auth.ts into the stubbed-session
 * branch so the tests can simulate signed-out / free / premium users
 * without touching the provider stack.
 *
 * `reporter` defaults to `list` for local + GitHub Actions summary.
 * Set CI=true to get retries on flaky paths.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_AUTH_BYPASS: "1",
      // Auth.js refuses to boot without a secret even when no provider is
      // configured. We give it a deterministic dev-only value so the
      // /api/auth/* routes stop spamming `MissingSecret` during e2e.
      AUTH_SECRET:
        "e2e-playwright-secret-do-not-use-outside-tests-0123456789abcdef",
      // A synthetic priceId lets the /pricing Premium CTA render as
      // enabled. Tests that want to exercise the happy-path intercept
      // `/api/billing/checkout` via `page.route()` — Stripe is never
      // actually called. Tests that want to exercise the disabled-CTA
      // fallback UX override this at the config-unit level instead.
      STRIPE_PREMIUM_PRICE_ID: "price_e2e_test_premium",
    },
  },
})
