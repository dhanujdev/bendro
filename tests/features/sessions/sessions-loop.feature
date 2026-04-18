Feature: Sessions loop — start, complete, streak updates
  As a signed-in user
  I want to start a routine, play it, mark it complete, and see my
  streak update on the next daily boundary
  So that the workout loop compounds into a habit without me having to
  remember state across sessions.

  Background:
    Given a user is signed in as userId "u-1" with timezone "UTC"
    And a routine exists with id "r-1" and title "Morning Mobility"

  # ─── Start ─────────────────────────────────────────────────────────────────
  Scenario: Starting a session creates a row with userId from the session, not the body
    When I send POST "/api/sessions" with body {"routineId": "r-1", "userId": "u-999"}
    Then the response status is 201
    And the data layer receives a start with userId "u-1"
    And the persisted session has completedAt null

  Scenario: Starting a session without a sign-in session returns UNAUTHENTICATED
    Given no user is signed in
    When I send POST "/api/sessions" with body {"routineId": "r-1"}
    Then the response status is 401
    And the response error code is "UNAUTHENTICATED"

  # ─── Complete + streak ────────────────────────────────────────────────────
  Scenario: Completing a session with ≥50% triggers a streak update
    Given an open session "s-1" owned by "u-1"
    When I send PATCH "/api/sessions/s-1" with body {"completionPct": 80, "completed": true}
    Then the response status is 200
    And the data layer receives a streak update for user "u-1" with timezone "UTC"

  Scenario: Completing a session with <50% does NOT update the streak
    Given an open session "s-2" owned by "u-1"
    When I send PATCH "/api/sessions/s-2" with body {"completionPct": 30, "completed": true}
    Then the response status is 200
    And the data layer does NOT receive a streak update

  Scenario: Re-completing a completed session returns CONFLICT
    Given a completed session "s-3" owned by "u-1"
    When I send PATCH "/api/sessions/s-3" with body {"completed": true}
    Then the response status is 409
    And the response error code is "CONFLICT"
    And the data layer does NOT receive an update

  Scenario: Updating a completed session's fields returns CONFLICT (immutability)
    Given a completed session "s-3" owned by "u-1"
    When I send PATCH "/api/sessions/s-3" with body {"painFeedback": {"st-1": 8}}
    Then the response status is 409
    And the response error code is "CONFLICT"

  # ─── Cross-tenant ──────────────────────────────────────────────────────────
  Scenario: Completing another user's session returns NOT_FOUND (no 403 leak)
    Given an open session "s-4" owned by "u-other"
    When I send PATCH "/api/sessions/s-4" with body {"completed": true}
    Then the response status is 404
    And the response error code is "NOT_FOUND"

  # ─── Pain feedback (HEALTH_RULES.md §Pain Feedback) ───────────────────────
  Scenario: Pain feedback is captured per stretch on completion
    Given an open session "s-5" owned by "u-1" with stretchIds ["st-1","st-2"]
    When I send PATCH "/api/sessions/s-5" with body:
      """
      { "completionPct": 100, "completed": true,
        "painFeedback": { "st-1": 2, "st-2": 7 } }
      """
    Then the response status is 200
    And the persisted session has painFeedback entry "st-2" equal to 7

  Scenario: Pain rating must be in the 0–10 range
    Given an open session "s-6" owned by "u-1"
    When I send PATCH "/api/sessions/s-6" with body:
      """
      { "painFeedback": { "st-1": 11 } }
      """
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  # ─── Timezone-aware rollover ──────────────────────────────────────────────
  Scenario: Completion in New York uses America/New_York for streak date
    Given the user's profile timezone is "America/New_York"
    And an open session "s-7" owned by "u-1"
    When I send PATCH "/api/sessions/s-7" with body {"completionPct": 90, "completed": true}
    Then the data layer receives a streak update with timezone "America/New_York"
