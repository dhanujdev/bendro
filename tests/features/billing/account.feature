Feature: Account page
  As a signed-in user
  I want to see my current Bendro plan
  So that I can manage or upgrade my subscription

  Background:
    Given the user is signed in as "u1"

  Scenario: signed-out user is redirected to signin
    Given no authenticated session
    When I GET /account
    Then I am redirected to "/signin?callbackUrl=/account"

  Scenario: free user sees the upgrade CTA
    Given the user subscriptionStatus is "free"
    When I GET /account
    Then the plan status badge text is "Free plan"
    And the "Upgrade to Premium" link points to "/pricing"
    And no "Manage billing" button is rendered

  Scenario: premium user sees the manage-billing button
    Given the user subscriptionStatus is "active"
    When I GET /account
    Then the plan status badge text is "Premium (active)"
    And a "Manage billing" button is rendered
    And no "Upgrade to Premium" link is rendered

  Scenario: past_due user sees the amber status badge
    Given the user subscriptionStatus is "past_due"
    When I GET /account
    Then the plan status badge text is "Premium (payment past due)"
    And the badge has the amber variant
    And a "Manage billing" button is rendered

  Scenario: upgrade banner shows when ?upgrade=1 and user is free
    Given the user subscriptionStatus is "free"
    When I GET /account?upgrade=1
    Then the upgrade prompt banner is rendered
    And the banner mentions "premium routines"

  Scenario: upgrade banner is suppressed for premium users
    Given the user subscriptionStatus is "active"
    When I GET /account?upgrade=1
    Then no upgrade prompt banner is rendered

  Scenario: manage-billing opens the Stripe portal
    Given the user subscriptionStatus is "active"
    And POST /api/billing/portal returns a URL "https://billing.stripe.com/session/xyz"
    When I click "Manage billing"
    Then the browser navigates to "https://billing.stripe.com/session/xyz"
    And the "portal.opened" telemetry event is emitted with source "account"

  Scenario: portal error surfaces on the page
    Given the user subscriptionStatus is "active"
    And POST /api/billing/portal returns 409 CONFLICT
    When I click "Manage billing"
    Then an error alert is rendered
    And the browser does not navigate away
