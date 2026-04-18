import { test as base, expect, type BrowserContext } from "@playwright/test"

/**
 * Playwright fixtures for Bendro e2e.
 *
 * The dev server runs with `E2E_AUTH_BYPASS=1` (see `playwright.config.ts`).
 * That flag unlocks the stubbed-session branches in `src/lib/auth.ts` and
 * `src/services/billing.ts`. Tests flip viewer state by setting cookies on
 * the browser context before navigating.
 *
 * Cookie contract (keep in sync with the seams in src):
 *   e2e_user_id                UUID    → viewer userId exposed via `auth()`
 *   e2e_user_email             string  → optional, defaults to {id}@e2e.local
 *   e2e_user_name              string  → optional, defaults to "E2E User"
 *   e2e_subscription_status    enum    → "free" | "active" | "trialing" |
 *                                         "past_due" | "canceled"
 *
 * No cookies ⇒ signed-out viewer.
 */

const BASE_DOMAIN = "localhost"

// Deterministic UUIDs so tests can join across pages / requests.
export const E2E_USERS = {
  free: {
    id: "99999999-9999-4000-8000-000000000001",
    email: "free-e2e@e2e.local",
    name: "Free E2E User",
    status: "free" as const,
  },
  premium: {
    id: "99999999-9999-4000-8000-000000000002",
    email: "premium-e2e@e2e.local",
    name: "Premium E2E User",
    status: "active" as const,
  },
  pastDue: {
    id: "99999999-9999-4000-8000-000000000003",
    email: "past-due-e2e@e2e.local",
    name: "Past-Due E2E User",
    status: "past_due" as const,
  },
}

type E2eUser = (typeof E2E_USERS)[keyof typeof E2E_USERS]

async function setAuthCookies(
  context: BrowserContext,
  user: E2eUser,
): Promise<void> {
  await context.addCookies([
    {
      name: "e2e_user_id",
      value: user.id,
      domain: BASE_DOMAIN,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "e2e_user_email",
      value: user.email,
      domain: BASE_DOMAIN,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "e2e_user_name",
      value: user.name,
      domain: BASE_DOMAIN,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "e2e_subscription_status",
      value: user.status,
      domain: BASE_DOMAIN,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ])
}

async function clearAuthCookies(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: "e2e_user_id" })
  await context.clearCookies({ name: "e2e_user_email" })
  await context.clearCookies({ name: "e2e_user_name" })
  await context.clearCookies({ name: "e2e_subscription_status" })
}

interface AuthHelpers {
  /** Write cookies onto the current context so `auth()` returns a signed-in session. */
  signInAs: (user: E2eUser) => Promise<void>
  /** Remove the e2e_* cookies so `auth()` falls through to signed-out. */
  signOut: () => Promise<void>
}

export const test = base.extend<{ authAs: AuthHelpers }>({
  authAs: async ({ context }, use) => {
    const helpers: AuthHelpers = {
      signInAs: (user) => setAuthCookies(context, user),
      signOut: () => clearAuthCookies(context),
    }
    await use(helpers)
  },
})

export { expect }
