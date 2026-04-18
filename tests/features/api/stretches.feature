Feature: Stretches catalog API
  As a consumer of the bendro catalog
  I want to list and filter stretches by body area and intensity
  So that routines can be assembled and browsed by area of focus.

  Background:
    Given the data layer returns seeded stretch fixtures

  Scenario: List stretches with default pagination
    When I send GET "/api/stretches"
    Then the response status is 200
    And the response body has "data" as an array
    And the response body has "limit" equal to 20
    And the response body has "offset" equal to 0

  Scenario: Filter stretches by body area
    When I send GET "/api/stretches?bodyArea=neck"
    Then the response status is 200
    And every returned stretch has bodyAreas containing "neck"

  Scenario: Filter stretches by intensity
    When I send GET "/api/stretches?intensity=gentle"
    Then the response status is 200
    And every returned stretch has intensity "gentle"

  Scenario: Reject an unknown body area
    When I send GET "/api/stretches?bodyArea=left_elbow"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"

  Scenario: Reject negative offset
    When I send GET "/api/stretches?offset=-1"
    Then the response status is 400
    And the response error code is "VALIDATION_ERROR"
