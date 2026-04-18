Feature: Stripe checkout
  As an authenticated free user
  I want to upgrade to premium via Stripe Checkout
  So that I can unlock premium routines

  Background:
    Given the Stripe service is configured with a test-mode secret
    And the plan allowlist contains priceId "price_monthly_test"

  Scenario: signed-out user cannot start checkout
    Given no authenticated session
    When I POST /api/billing/checkout with priceId "price_monthly_test"
    Then the response status is 401
    And the error code is "UNAUTHENTICATED"
    And no Stripe Checkout Session is created

  Scenario: happy path — returns a Stripe-hosted URL
    Given I am signed in as "u1"
    When I POST /api/billing/checkout with priceId "price_monthly_test"
    Then the response status is 201
    And the response body contains a "url" starting with "https://checkout.stripe.com/"
    And a Stripe Customer is resolved or created for "u1"
    And the Checkout Session is created with client_reference_id "u1"

  Scenario: priceId not in the server-side allowlist is rejected
    Given I am signed in as "u1"
    When I POST /api/billing/checkout with priceId "price_not_configured"
    Then the response status is 400
    And the error code is "VALIDATION_ERROR"
    And no Stripe Checkout Session is created

  Scenario: body cannot spoof the userId
    Given I am signed in as "u1"
    When I POST /api/billing/checkout with priceId "price_monthly_test" and userId "attacker"
    Then the Stripe Checkout Session is created for userId "u1"
    And the attacker userId is ignored

  Scenario: Stripe misconfigured returns 503 (not 500)
    Given the environment is missing STRIPE_SECRET_KEY
    And I am signed in as "u1"
    When I POST /api/billing/checkout with priceId "price_monthly_test"
    Then the response status is 503
    And the error code is "INTERNAL"
    And the message indicates billing is not configured

  Scenario: default success and cancel URLs
    Given I am signed in as "u1"
    And NEXT_PUBLIC_APP_URL is "https://bendro.app"
    When I POST /api/billing/checkout with priceId "price_monthly_test" and no URLs
    Then the Checkout Session success_url is "https://bendro.app/settings/billing?checkout=success"
    And the Checkout Session cancel_url is "https://bendro.app/settings/billing?checkout=cancel"
