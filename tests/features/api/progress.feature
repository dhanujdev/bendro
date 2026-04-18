Feature: Progress API
  As a signed-in user who has completed sessions
  I want to retrieve my streak, totals, and daily history
  So that my progress screen can reflect my recent activity.

  Background:
    Given I am signed in as user "00000000-0000-4000-8000-000000000001"
    And that user has completed several sessions over the last 30 days

  Scenario: Fetch progress with default window
    When I send GET "/api/progress"
    Then the response status is 200
    And the response body data has "currentStreak" as a non-negative integer
    And the response body data has "history" with 30 entries

  Scenario: Fetch progress for a specific window
    When I send GET "/api/progress?days=14"
    Then the response status is 200
    And the response body data has "history" with 14 entries

  Scenario: Reject a missing session cookie
    Given I am not signed in
    When I send GET "/api/progress"
    Then the response status is 401
    And the response error code is "UNAUTHENTICATED"

  Scenario: Ignore any userId supplied in the query string
    When I send GET "/api/progress?userId=99999999-9999-4999-8999-999999999999"
    Then the response status is 200
    And the response body data reflects user "00000000-0000-4000-8000-000000000001"

  Scenario: Reject days > 365
    When I send GET "/api/progress?days=9999"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"
