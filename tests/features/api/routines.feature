Feature: Routines catalog API
  As a consumer of the bendro catalog
  I want to list, page, filter, and fetch individual routines
  So that the library UI can show the right content in a predictable shape.

  Background:
    Given the data layer returns seeded routine fixtures

  # ─── GET /api/routines ──────────────────────────────────────────────────────
  Scenario: List routines with default pagination
    When I send GET "/api/routines"
    Then the response status is 200
    And the response body has "data" as an array
    And the response body has "limit" equal to 20
    And the response body has "offset" equal to 0

  Scenario: Filter routines by goal
    When I send GET "/api/routines?goal=flexibility"
    Then the response status is 200
    And every returned routine has goal "flexibility"

  Scenario: Reject an unknown goal value
    When I send GET "/api/routines?goal=nonsense_goal"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"
    And the response error details is a non-empty array

  Scenario: Reject a limit over the maximum
    When I send GET "/api/routines?limit=9999"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  # ─── POST /api/routines ─────────────────────────────────────────────────────
  Scenario: Create a routine with a valid payload
    When I send POST "/api/routines" with a valid routine body
    Then the response status is 201
    And the response body data has a uuid "id"

  Scenario: Reject malformed JSON body
    When I send POST "/api/routines" with body "not-json"
    Then the response status is 400
    And the response error code is "INVALID_JSON"

  Scenario: Reject a payload missing required fields
    When I send POST "/api/routines" with body {"slug": "x"}
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  # ─── GET /api/routines/[id] ─────────────────────────────────────────────────
  Scenario: Fetch a routine by slug
    Given a routine exists with slug "morning-wake-up-flow"
    When I send GET "/api/routines/morning-wake-up-flow"
    Then the response status is 200
    And the response body data slug is "morning-wake-up-flow"
    And the response body data has an array of "routineStretches"

  Scenario: Unknown routine slug returns not-found
    When I send GET "/api/routines/definitely-not-a-routine"
    Then the response status is 404
    And the response error code is "NOT_FOUND"
