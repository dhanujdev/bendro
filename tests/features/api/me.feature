Feature: Profile GET/PATCH API
  As the signed-in user
  I want to read and update my onboarding profile
  So that personalization uses goals, focus, avoid, timezone, and a derived
  safety flag — without ever persisting my raw health-condition answers.

  Background:
    Given a user is signed in with id "00000000-0000-4000-8000-000000000001"

  # ─── GET /api/me ────────────────────────────────────────────────────────────
  Scenario: Guest cannot read a profile
    Given no session exists
    When I send GET "/api/me"
    Then the response status is 401
    And the response error code is "UNAUTHENTICATED"

  Scenario: Signed-in user reads their profile
    Given the profile exists with goals ["flexibility"] and timezone "America/Los_Angeles"
    When I send GET "/api/me"
    Then the response status is 200
    And the response body data userId matches the session userId
    And the response body data goals is ["flexibility"]
    And the response body data timezone is "America/Los_Angeles"
    And the response body data safetyFlag is false

  # ─── PATCH /api/me ──────────────────────────────────────────────────────────
  Scenario: Guest cannot update a profile
    Given no session exists
    When I send PATCH "/api/me" with body {"goals": ["flexibility"]}
    Then the response status is 401

  Scenario: Reject malformed JSON body
    When I send PATCH "/api/me" with body "{ not-json"
    Then the response status is 400
    And the response error code is "INVALID_JSON"

  Scenario: Reject unknown fields (strict schema)
    When I send PATCH "/api/me" with body {"goals": ["flexibility"], "surprise": true}
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Reject an invalid goal value
    When I send PATCH "/api/me" with body {"goals": ["invalid-goal"]}
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Reject a malformed reminderTime
    When I send PATCH "/api/me" with body {"reminderTime": "8am"}
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Persist goals and timezone
    When I send PATCH "/api/me" with body {"goals": ["flexibility","mobility"], "timezone": "America/New_York"}
    Then the response status is 200
    And the data layer receives a patch with goals ["flexibility","mobility"]
    And the data layer receives a patch with timezone "America/New_York"

  # ─── HEALTH_RULES.md privacy invariant ──────────────────────────────────────
  Scenario: Derive safetyFlag=true when ANY condition is true and NEVER persist the raw answers
    When I send PATCH "/api/me" with body:
      """
      {
        "conditions": {
          "recentInjury": false,
          "recentSurgery": true,
          "jointOrSpineCondition": false,
          "pregnancy": false
        }
      }
      """
    Then the response status is 200
    And the data layer receives a patch with safetyFlag true
    And the data layer patch does NOT contain "conditions"
    And the data layer patch does NOT contain "recentInjury"
    And the data layer patch does NOT contain "recentSurgery"

  Scenario: Derive safetyFlag=false when ALL conditions are false
    When I send PATCH "/api/me" with body:
      """
      {
        "conditions": {
          "recentInjury": false,
          "recentSurgery": false,
          "jointOrSpineCondition": false,
          "pregnancy": false
        }
      }
      """
    Then the response status is 200
    And the data layer receives a patch with safetyFlag false

  Scenario: Pass markOnboarded through to the data layer
    When I send PATCH "/api/me" with body {"markOnboarded": true}
    Then the response status is 200
    And the data layer receives a patch with markOnboarded true

  # ─── Trust boundary: session is the source of truth for userId ─────────────
  Scenario: Client-supplied userId is rejected by the strict schema
    When I send PATCH "/api/me" with body {"userId": "99999999-9999-4999-8999-999999999999", "goals": ["mobility"]}
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"
    And the data layer is NOT called
