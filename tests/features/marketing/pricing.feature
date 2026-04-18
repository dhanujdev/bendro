Feature: Pricing page
  As a prospective or existing user
  I want to compare Free vs Premium and upgrade via Stripe
  So that I can choose a plan without leaving the marketing site

  Background:
    Given the marketing shell is rendered
    And the environment sets STRIPE_PREMIUM_PRICE_ID to "price_monthly_test"

  Scenario: Free plan card links to sign-in when signed-out
    Given no authenticated session
    When I open "/pricing"
    Then the Free plan CTA text is "Get started free"
    And its href is "/signin?callbackUrl=/home"

  Scenario: Signed-in user sees "Back to app" on the Free plan CTA
    Given an authenticated free user
    When I open "/pricing"
    Then the Free plan CTA text is "Back to app"
    And its href is "/home"

  Scenario: Signed-out user sees "Sign in to upgrade" on Premium
    Given no authenticated session
    When I open "/pricing"
    Then the Premium CTA button text is "Sign in to upgrade"

  Scenario: Signed-in user clicking Premium starts Stripe Checkout
    Given an authenticated free user
    And POST /api/billing/checkout returns url "https://checkout.stripe.com/cs/123"
    When I click the Premium CTA
    Then trackEvent "upgrade.clicked" is emitted with source "pricing" and signedIn true
    And the browser navigates to "https://checkout.stripe.com/cs/123"

  Scenario: Checkout failure surfaces an inline error
    Given an authenticated free user
    And POST /api/billing/checkout returns 503 INTERNAL
    When I click the Premium CTA
    Then an inline error is rendered
    And the browser does not navigate away

  Scenario: Premium CTA is disabled when priceId is not configured
    Given the environment has no STRIPE_PREMIUM_PRICE_ID
    And an authenticated free user
    When I open "/pricing"
    Then the Premium CTA is disabled
    And a note "Premium checkout is not configured on this environment yet" is visible

  Scenario: FAQ items are collapsible
    When I open "/pricing"
    Then I see at least 6 FAQ questions
    And clicking a question expands its answer inline
