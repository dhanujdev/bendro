import { test, expect, E2E_USERS } from "./fixtures"

/**
 * Signed-out marketing funnel + auth-bypass smoke.
 *
 * Locks in the public surface area that Vercel exposes: the landing page,
 * the marketing shell, the pricing page (free/premium CTA labels), and
 * the legal stubs. Also proves the E2E_AUTH_BYPASS cookie seam is wired —
 * once a synthetic session exists the landing page must redirect to /home.
 */

test.describe("marketing — signed-out funnel", () => {
  test.beforeEach(async ({ authAs }) => {
    await authAs.signOut()
  })

  test("landing → hero + marketing shell + CTA label", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByTestId("marketing-shell")).toBeVisible()
    await expect(page.getByTestId("marketing-header")).toBeVisible()
    await expect(page.getByTestId("marketing-footer")).toBeVisible()

    const cta = page.getByTestId("marketing-cta")
    await expect(cta).toHaveAttribute("data-signed-in", "false")
    await expect(cta).toHaveText(/Get started/i)

    await expect(
      page.getByRole("heading", { name: /Daily stretching/i }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /Start for free/i })).toBeVisible()
  })

  test("landing → pricing nav → free CTA says Get started free", async ({
    page,
  }) => {
    await page.goto("/")
    await page
      .getByTestId("marketing-header")
      .getByRole("link", { name: "Pricing" })
      .click()
    await expect(page).toHaveURL(/\/pricing$/)

    await expect(page.getByTestId("pricing-page")).toBeVisible()
    await expect(page.getByTestId("pricing-plan-free")).toBeVisible()
    await expect(page.getByTestId("pricing-plan-premium")).toBeVisible()
    await expect(page.getByTestId("pricing-start-free")).toHaveText(
      /Get started free/i,
    )
  })

  test("pricing → premium CTA disabled when STRIPE_PREMIUM_PRICE_ID unset", async ({
    page,
  }) => {
    // Fresh dev env has no Stripe price configured. The button must
    // render disabled with an explanatory note so the UI never POSTs a
    // checkout that would 503.
    await page.goto("/pricing")
    const premiumCta = page.getByTestId("pricing-start-checkout")
    await expect(premiumCta).toBeVisible()
    await expect(premiumCta).toBeDisabled()
    await expect(premiumCta).toHaveAttribute("data-has-price-id", "false")
    await expect(premiumCta).toHaveAttribute("data-signed-in", "false")
    await expect(page.getByTestId("pricing-unavailable-note")).toBeVisible()
  })

  test("footer legal links → terms + privacy pages render", async ({ page }) => {
    await page.goto("/")

    const footer = page.getByTestId("marketing-footer")
    await footer.getByRole("link", { name: /Terms of Service/i }).click()
    await expect(page).toHaveURL(/\/legal\/terms$/)
    await expect(page.getByTestId("legal-terms-page")).toBeVisible()

    await page.goto("/legal/privacy")
    await expect(
      page.getByRole("heading", { name: /Privacy Policy/i }),
    ).toBeVisible()
  })

  test("pricing FAQ toggles open on click", async ({ page }) => {
    await page.goto("/pricing")
    const firstFaq = page.getByTestId("pricing-faq-item").first()
    await expect(firstFaq).toBeVisible()
    await expect(firstFaq).not.toHaveAttribute("open", "")
    await firstFaq.locator("summary").click()
    // <details> gets an `open` attribute when expanded.
    await expect(firstFaq).toHaveAttribute("open", /.*/)
  })
})

test.describe("marketing — auth bypass seam", () => {
  test("landing redirects signed-in free user to /home", async ({
    page,
    authAs,
  }) => {
    await authAs.signInAs(E2E_USERS.free)
    await page.goto("/")
    await expect(page).toHaveURL(/\/home$/)
  })

  test("marketing header CTA reads Open app for signed-in viewer", async ({
    page,
    authAs,
  }) => {
    await authAs.signInAs(E2E_USERS.free)
    // /pricing renders the marketing layout without redirecting.
    await page.goto("/pricing")
    const cta = page.getByTestId("marketing-cta")
    await expect(cta).toHaveAttribute("data-signed-in", "true")
    await expect(cta).toHaveText(/Open app/i)
    await expect(page.getByTestId("pricing-start-free")).toHaveText(
      /Back to app/i,
    )
  })
})
