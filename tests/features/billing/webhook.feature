Feature: Stripe webhook handling
  As the system of record for subscription state
  I must process Stripe webhook deliveries exactly once
  And I must reject deliveries with a bad signature

  Background:
    Given STRIPE_WEBHOOK_SECRET is configured
    And the stripe_webhook_events ledger is empty

  Scenario: missing Stripe-Signature header is rejected
    When Stripe POSTs an event to /api/webhooks/stripe without a signature header
    Then the response status is 400
    And the error code is "VALIDATION_ERROR"
    And the ledger has no rows

  Scenario: bad signature is rejected (HMAC mismatch)
    When Stripe POSTs an event to /api/webhooks/stripe with a signature that does not match the raw body
    Then the response status is 400
    And the error code is "VALIDATION_ERROR"
    And the ledger has no rows

  Scenario: customer.subscription.created → users.subscriptionStatus=active
    Given a user "u1" exists with subscriptionStatus "free"
    When Stripe sends a "customer.subscription.created" event for userId "u1" with status "active"
    Then the response status is 200
    And the body has duplicate=false
    And users."u1".subscriptionStatus becomes "active"
    And the stripe_webhook_events row for that eventId has processedAt set

  Scenario: duplicate delivery is a no-op
    Given the ledger already has an entry for eventId "evt_1"
    And user "u1" has subscriptionStatus "canceled" from the first delivery
    When Stripe POSTs the exact same "evt_1" event again
    Then the response status is 200
    And the body has duplicate=true
    And users."u1".subscriptionStatus remains "canceled"

  Scenario: invoice.payment_failed → past_due
    Given user "u1" has subscriptionStatus "active"
    When Stripe sends an "invoice.payment_failed" event for userId "u1"
    Then users."u1".subscriptionStatus becomes "past_due"

  Scenario: customer.subscription.deleted → canceled
    Given user "u1" has subscriptionStatus "active"
    When Stripe sends a "customer.subscription.deleted" event for userId "u1"
    Then users."u1".subscriptionStatus becomes "canceled"

  Scenario: unknown event types are recorded but have no side effect
    When Stripe sends a "customer.updated" event for userId "u1"
    Then the ledger contains a row for that eventId
    And users."u1".subscriptionStatus is unchanged

  Scenario: handler exception → 500 so Stripe retries
    Given a webhook handler that throws on state update
    When Stripe sends a valid signed event
    Then the response status is 500
    And the error code is "INTERNAL"
    And Stripe will retry the delivery
