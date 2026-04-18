import { test, expect, E2E_USERS } from "./fixtures"

/**
 * Signed-in happy-path smoke.
 *
 * Covers the core authenticated shell: /home progress dashboard, /library
 * catalog, /account plan status, and the paywall-decoration flow where a
 * free viewer clicking a premium routine lands on /account?upgrade=1.
 *
 * Data layer falls through to the in-memory mock-data adapter in this
 * environment (no DATABASE_URL in the e2e webServer env), so assertions
 * target structural testids and known mock slugs rather than exact values.
 */

test.describe("signed-in shell — free viewer", () => {
  test.beforeEach(async ({ authAs }) => {
    await authAs.signInAs(E2E_USERS.free)
  })

  test("/home renders dashboard + start CTA + upgrade banner", async ({
    page,
  }) => {
    await page.goto("/home")

    await expect(page.getByTestId("home-page")).toBeVisible()
    await expect(page.getByTestId("home-start-stretching")).toHaveAttribute(
      "href",
      "/player/demo",
    )
    await expect(page.getByTestId("home-stat-streak")).toBeVisible()
    await expect(page.getByTestId("home-stat-week-minutes")).toBeVisible()
    await expect(page.getByTestId("home-stat-total-sessions")).toBeVisible()

    // Free viewer sees the upgrade CTA; premium viewer will not (covered below).
    const upgrade = page.getByTestId("home-upgrade-cta")
    await expect(upgrade).toBeVisible()
    await expect(upgrade).toHaveAttribute(
      "href",
      /\/account\?upgrade=1&source=home/,
    )
  })

  test("/library lists routines and decorates premium rows as locked", async ({
    page,
  }) => {
    await page.goto("/library")
    await expect(page.getByTestId("library-routine-list")).toBeVisible()

    // Pull every routine card, find one flagged premium, and assert it is
    // locked for a free viewer. At least one premium routine must exist in
    // the mock/seed catalog — otherwise the paywall UX can't be exercised.
    const premiumRoutines = page.locator(
      '[data-testid^="library-routine-"][data-premium="true"]',
    )
    await expect(premiumRoutines.first()).toBeVisible()
    await expect(premiumRoutines.first()).toHaveAttribute(
      "data-locked",
      "true",
    )

    // Locked rows link to /account?upgrade=1&routine=…, not /player/…
    const href = await premiumRoutines.first().getAttribute("href")
    expect(href).toMatch(/\/account\?upgrade=1&routine=/)
  })

  test("/library premium row click → /account?upgrade=1 banner visible", async ({
    page,
  }) => {
    await page.goto("/library")
    const firstLocked = page
      .locator('[data-testid^="library-routine-"][data-locked="true"]')
      .first()
    await expect(firstLocked).toBeVisible()
    await firstLocked.click()

    await expect(page).toHaveURL(/\/account\?upgrade=1/)
    await expect(page.getByTestId("account-page")).toBeVisible()
    await expect(page.getByTestId("account-upgrade-banner")).toBeVisible()
    await expect(page.getByTestId("account-upgrade-cta")).toBeVisible()
  })

  test("/account shows Free plan badge + upgrade CTA", async ({ page }) => {
    await page.goto("/account")
    await expect(page.getByTestId("account-plan-status")).toHaveAttribute(
      "data-status",
      "free",
    )
    await expect(page.getByTestId("account-upgrade-cta")).toHaveAttribute(
      "href",
      "/pricing",
    )
  })
})

test.describe("signed-in shell — premium viewer", () => {
  test.beforeEach(async ({ authAs }) => {
    await authAs.signInAs(E2E_USERS.premium)
  })

  test("/home hides upgrade CTA for premium viewer", async ({ page }) => {
    await page.goto("/home")
    await expect(page.getByTestId("home-page")).toBeVisible()
    await expect(page.getByTestId("home-upgrade-cta")).toHaveCount(0)
  })

  test("/library shows premium rows as unlocked", async ({ page }) => {
    await page.goto("/library")
    const premiumRoutines = page.locator(
      '[data-testid^="library-routine-"][data-premium="true"]',
    )
    await expect(premiumRoutines.first()).toBeVisible()
    await expect(premiumRoutines.first()).toHaveAttribute(
      "data-locked",
      "false",
    )
    const href = await premiumRoutines.first().getAttribute("href")
    expect(href).toMatch(/^\/player\//)
  })

  test("/account shows active plan status", async ({ page }) => {
    await page.goto("/account")
    await expect(page.getByTestId("account-plan-status")).toHaveAttribute(
      "data-status",
      "active",
    )
  })
})

test.describe("signed-in shell — signed-out guardrails", () => {
  test.beforeEach(async ({ authAs }) => {
    await authAs.signOut()
  })

  test("/home redirects signed-out viewer to /signin", async ({ page }) => {
    await page.goto("/home")
    await expect(page).toHaveURL(/\/signin\?.*callbackUrl=/)
  })

  test("/account redirects signed-out viewer to /signin", async ({ page }) => {
    await page.goto("/account")
    await expect(page).toHaveURL(/\/signin\?.*callbackUrl=/)
  })
})
