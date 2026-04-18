Feature: Progress API
  As a user who has completed sessions
  I want to retrieve my streak, totals, and daily history
  So that my progress screen can reflect my recent activity.

  Background:
    Given a user has completed several sessions over the last 30 days

  Scenario: Fetch progress with default window
    When I send GET "/api/progress"
    Then the response status is 200
    And the response body data has "currentStreak" as a non-negative integer
    And the response body data has "history" with 30 entries

  Scenario: Fetch progress for a specific user and window
    When I send GET "/api/progress?userId=00000000-0000-4000-8000-000000000001&days=14"
    Then the response status is 200
    And the response body data has "history" with 14 entries

  Scenario: Reject a non-uuid userId
    When I send GET "/api/progress?userId=not-a-uuid"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Reject days > 365
    When I send GET "/api/progress?days=9999"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"
