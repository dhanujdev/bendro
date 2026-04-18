Feature: Sessions API
  As an authenticated user
  I want to start a stretch session and update it as I progress
  So that my time, completion, and pain feedback are recorded.

  Background:
    Given a valid user exists with id "00000000-0000-4000-8000-000000000001"
    And a routine exists with id "22222222-2222-4000-8000-000000000001"

  # ─── POST /api/sessions ─────────────────────────────────────────────────────
  Scenario: Start a new session with a valid payload
    When I send POST "/api/sessions" with body:
      """
      {
        "userId": "00000000-0000-4000-8000-000000000001",
        "routineId": "22222222-2222-4000-8000-000000000001"
      }
      """
    Then the response status is 201
    And the response body data has a uuid "id"
    And the response body data has "completedAt" equal to null

  Scenario: Reject start with a non-uuid userId
    When I send POST "/api/sessions" with body:
      """
      { "userId": "not-a-uuid", "routineId": "22222222-2222-4000-8000-000000000001" }
      """
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Reject start with malformed JSON
    When I send POST "/api/sessions" with body "{not-json"
    Then the response status is 400
    And the response error code is "INVALID_JSON"

  # ─── PATCH /api/sessions/[id] ───────────────────────────────────────────────
  Scenario: Update session progress
    Given a session exists with id "33333333-3333-4333-8333-333333333333"
    When I send PATCH "/api/sessions/33333333-3333-4333-8333-333333333333" with body:
      """
      { "durationDoneSec": 120, "completionPct": 50 }
      """
    Then the response status is 200
    And the response body data durationDoneSec is 120
    And the response body data completionPct is 50

  Scenario: Reject completionPct out of range
    Given a session exists with id "33333333-3333-4333-8333-333333333333"
    When I send PATCH "/api/sessions/33333333-3333-4333-8333-333333333333" with body:
      """
      { "completionPct": 150 }
      """
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Updating an unknown session returns not-found
    When I send PATCH "/api/sessions/missing" with body:
      """
      { "durationDoneSec": 1 }
      """
    Then the response status is 404
    And the response error code is "NOT_FOUND"

  # ─── Health-safety guard (HEALTH_RULES.md) ──────────────────────────────────
  # Phase 8 will add a scenario for pain >= 7 triggering the safety-guidance
  # branch; the endpoint accepts the rating now, but the follow-up suggestion
  # is a later concern.
