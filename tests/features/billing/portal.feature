Feature: Stripe customer portal
  As a premium subscriber
  I want a deep-link into the Stripe customer portal
  So that I can manage or cancel my subscription

  Background:
    Given the Stripe service is configured with a test-mode secret

  Scenario: signed-out user cannot open the portal
    Given no authenticated session
    When I POST /api/billing/portal with an empty body
    Then the response status is 401
    And the error code is "UNAUTHENTICATED"
    And no Stripe billing portal session is created

  Scenario: user without a Stripe customer gets 409 CONFLICT
    Given I am signed in as "u1"
    And the user row has no stripeCustomerId
    When I POST /api/billing/portal with an empty body
    Then the response status is 409
    And the error code is "CONFLICT"
    And no Stripe billing portal session is created

  Scenario: malformed returnUrl is rejected
    Given I am signed in as "u1"
    When I POST /api/billing/portal with returnUrl "not-a-url"
    Then the response status is 400
    And the error code is "VALIDATION_ERROR"

  Scenario: Stripe misconfigured returns 503 (not 500)
    Given the environment is missing STRIPE_SECRET_KEY
    And I am signed in as "u1"
    When I POST /api/billing/portal with an empty body
    Then the response status is 503
    And the error code is "INTERNAL"
    And the message indicates billing is not configured

  Scenario: happy path — returns a Stripe-hosted portal URL
    Given I am signed in as "u1"
    And the user has stripeCustomerId "cus_123"
    When I POST /api/billing/portal with returnUrl "https://bendro.app/account"
    Then the response status is 200
    And the response body contains a "url" starting with "https://billing.stripe.com/"
    And the portal session is created with customer "cus_123"
    And the portal session return_url is "https://bendro.app/account"

  Scenario: returnUrl defaults to /account when omitted
    Given I am signed in as "u1"
    And NEXT_PUBLIC_APP_URL is "https://bendro.app"
    And the user has stripeCustomerId "cus_123"
    When I POST /api/billing/portal with an empty body
    Then the portal session return_url is "https://bendro.app/account"
