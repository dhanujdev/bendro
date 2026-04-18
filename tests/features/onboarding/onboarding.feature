Feature: Multi-step onboarding flow
  As a first-time user
  I want to pick my goals, focus areas, avoid areas, and answer a short
  pre-existing-condition screener
  So that bendro can personalize my library and show a safety gate when
  appropriate — while keeping my individual health answers private.

  Background:
    Given the user is signed in
    And the onboardingV1 feature flag is enabled

  # ─── Step rendering ─────────────────────────────────────────────────────────
  Scenario: Starts on the intro step with the HEALTH_RULES disclaimer
    When I open "/onboarding"
    Then I see the intro step
    And I see a "not a substitute for medical advice" disclaimer
    And I see a "Start" action

  Scenario: Advance through the steps in order
    Given I am on "/onboarding"
    When I click "Start"
    Then I see the goals step
    When I select "Flexibility" and click "Next"
    Then I see the focus step
    When I select "Hips" and click "Next"
    Then I see the avoid step
    When I select "Lower back" and click "Next"
    Then I see the conditions step

  # ─── Safety gate ────────────────────────────────────────────────────────────
  Scenario: Safety-gate warning appears when ANY condition is "yes"
    Given I am on the conditions step
    When I answer "Yes" to "recent surgery"
    Then I see the amber safety-gate warning
    And the submit button is enabled

  Scenario: No warning when ALL conditions are "no"
    Given I am on the conditions step
    When I answer "No" to every condition
    Then I do not see the safety-gate warning
    And the submit button is enabled

  # ─── Submit ─────────────────────────────────────────────────────────────────
  Scenario: Submit completes onboarding and routes to /home
    Given I am on the conditions step with valid prior selections
    When I click "Finish"
    Then a PATCH request is sent to "/api/me"
    And the request body contains "markOnboarded" equal to true
    And the request body contains a "conditions" object with 4 booleans
    And I am redirected to "/home"

  Scenario: The raw conditions never reach the data layer
    Given the onboarding form is submitted with recentSurgery = true
    When the PATCH "/api/me" handler processes the request
    Then the server persists safetyFlag = true
    And the server does NOT persist the individual condition answers
    # HEALTH_RULES.md §Pre-Existing Condition Gating — privacy invariant.

  # ─── Legacy fallback ────────────────────────────────────────────────────────
  Scenario: Legacy goal-picker renders when onboardingV1 is disabled
    Given the onboardingV1 feature flag is disabled
    When I open "/onboarding"
    Then I see the legacy single-step goal picker
    And I do not see the multi-step progress bar
