import { test, expect, E2E_USERS } from "./fixtures"

/**
 * Signed-in Stripe checkout happy-path.
 *
 * We never call real Stripe in e2e — the /api/billing/checkout POST
 * is intercepted via Playwright `page.route()` and returns a mock
 * Checkout Session URL. The navigation then points the browser at a
 * synthetic page we also intercept so the test stays offline and
 * deterministic.
 */

const MOCK_CHECKOUT_URL = "https://checkout.stripe.com/e2e-mock-session-xyz"

test.describe("billing — signed-in checkout happy-path", () => {
  test.beforeEach(async ({ authAs }) => {
    await authAs.signInAs(E2E_USERS.free)
  })

  test("pricing → premium CTA → checkout POST → Stripe redirect", async ({
    page,
  }) => {
    let capturedBody: { priceId?: string } | null = null

    await page.route("**/api/billing/checkout", async (route) => {
      const req = route.request()
      const raw = req.postData() ?? "{}"
      capturedBody = JSON.parse(raw)
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: { sessionId: "cs_test_e2e_mock", url: MOCK_CHECKOUT_URL },
        }),
      })
    })

    await page.route(MOCK_CHECKOUT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><html><body><h1 data-testid="stripe-mock">Stripe checkout (mocked)</h1></body></html>',
      })
    })

    await page.goto("/pricing")
    const cta = page.getByTestId("pricing-start-checkout")
    await expect(cta).toBeEnabled()
    await expect(cta).toHaveAttribute("data-signed-in", "true")
    await expect(cta).toHaveAttribute("data-has-price-id", "true")

    await cta.click()

    await expect(page.getByTestId("stripe-mock")).toBeVisible()
    expect(page.url()).toBe(MOCK_CHECKOUT_URL)
    expect(capturedBody).toEqual({ priceId: "price_e2e_test_premium" })
  })

  test("checkout endpoint error surfaces inline alert", async ({ page }) => {
    await page.route("**/api/billing/checkout", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Unknown priceId — not in the configured plan allowlist",
          },
        }),
      })
    })

    await page.goto("/pricing")
    await page.getByTestId("pricing-start-checkout").click()

    const alert = page.getByTestId("pricing-checkout-error")
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/Unknown priceId/i)
  })
})
