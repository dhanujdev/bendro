Feature: Premium-routine catalog gate
  Routines flagged `isPremium=true` must only be returned to users whose
  Stripe subscription is currently in {active, trialing}. Free users never
  see premium rows — they're filtered out at the adapter boundary rather
  than shown behind a paywall (Phase 9 scope).

  Background:
    Given the catalog contains both free and premium routines
    And each routine's `isPremium` field is persisted in Postgres

  Scenario: free user gets no premium routines
    Given I am signed in as "u1" with subscriptionStatus "free"
    When I GET /api/routines
    Then the response status is 200
    And no routine in the response has isPremium=true

  Scenario: active subscriber gets both free and premium routines
    Given I am signed in as "u1" with subscriptionStatus "active"
    When I GET /api/routines
    Then the response status is 200
    And the response contains at least one routine with isPremium=true

  Scenario: trialing subscriber gets premium routines
    Given I am signed in as "u1" with subscriptionStatus "trialing"
    When I GET /api/routines
    Then the response contains at least one routine with isPremium=true

  Scenario: past_due is treated as free
    Given I am signed in as "u1" with subscriptionStatus "past_due"
    When I GET /api/routines
    Then no routine in the response has isPremium=true

  Scenario: signed-out visitor gets no premium routines
    Given no authenticated session
    When I GET /api/routines
    Then the response status is 200
    And no routine in the response has isPremium=true

  Scenario: explicit isPremium=true filter yields nothing for free users
    Given I am signed in as "u1" with subscriptionStatus "free"
    When I GET /api/routines?isPremium=true
    Then the response status is 200
    And the `total` field is 0
