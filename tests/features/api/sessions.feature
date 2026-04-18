Feature: Sessions API
  As a signed-in user starting a stretch session
  I want to start and update sessions that belong to me
  So that my time, completion, and pain feedback are recorded against the
  right account.

  Background:
    Given a valid user exists with id "00000000-0000-4000-8000-000000000001"
    And a routine exists with id "22222222-2222-4000-8000-000000000001"
    And I am signed in as user "00000000-0000-4000-8000-000000000001"

  # ─── POST /api/sessions ─────────────────────────────────────────────────────
  Scenario: Start a new session with a valid payload
    When I send POST "/api/sessions" with body:
      """
      { "routineId": "22222222-2222-4000-8000-000000000001" }
      """
    Then the response status is 201
    And the response body data has a uuid "id"
    And the response body data "userId" equals "00000000-0000-4000-8000-000000000001"
    And the response body data "completedAt" equals null

  Scenario: The server ignores any userId supplied in the body
    When I send POST "/api/sessions" with body:
      """
      { "routineId": "22222222-2222-4000-8000-000000000001",
        "userId":    "99999999-9999-4999-8999-999999999999" }
      """
    Then the response status is 201
    And the response body data "userId" equals "00000000-0000-4000-8000-000000000001"

  Scenario: Reject start without an auth session
    Given I am not signed in
    When I send POST "/api/sessions" with body:
      """
      { "routineId": "22222222-2222-4000-8000-000000000001" }
      """
    Then the response status is 401
    And the response error code is "UNAUTHENTICATED"

  Scenario: Reject start with a missing routineId
    When I send POST "/api/sessions" with body:
      """
      {}
      """
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Reject start with malformed JSON
    When I send POST "/api/sessions" with body "{not-json"
    Then the response status is 400
    And the response error code is "INVALID_JSON"

  # ─── PATCH /api/sessions/[id] ───────────────────────────────────────────────
  Scenario: Update my own session
    Given a session exists with id "33333333-3333-4333-8333-333333333333" owned by me
    When I send PATCH "/api/sessions/33333333-3333-4333-8333-333333333333" with body:
      """
      { "durationDoneSec": 120, "completionPct": 50 }
      """
    Then the response status is 200
    And the response body data durationDoneSec is 120
    And the response body data completionPct is 50

  Scenario: Reject update to a session that belongs to another user
    Given a session exists with id "33333333-3333-4333-8333-333333333333" owned by another user
    When I send PATCH "/api/sessions/33333333-3333-4333-8333-333333333333" with body:
      """
      { "durationDoneSec": 120 }
      """
    Then the response status is 404
    And the response error code is "NOT_FOUND"

  Scenario: Updating an unknown session returns not-found
    When I send PATCH "/api/sessions/00000000-0000-4000-8000-deadbeefdead0" with body:
      """
      { "durationDoneSec": 1 }
      """
    Then the response status is 404
    And the response error code is "NOT_FOUND"

  Scenario: Reject update without an auth session
    Given I am not signed in
    When I send PATCH "/api/sessions/33333333-3333-4333-8333-333333333333" with body:
      """
      { "durationDoneSec": 1 }
      """
    Then the response status is 401
    And the response error code is "UNAUTHENTICATED"

  Scenario: Reject completionPct out of range
    Given a session exists with id "33333333-3333-4333-8333-333333333333" owned by me
    When I send PATCH "/api/sessions/33333333-3333-4333-8333-333333333333" with body:
      """
      { "completionPct": 150 }
      """
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  # ─── Health-safety guard (HEALTH_RULES.md) ──────────────────────────────────
  # Phase 8 will add a scenario for pain >= 7 triggering the safety-guidance
  # branch; the endpoint accepts the rating now, but the follow-up suggestion
  # is a later concern.
