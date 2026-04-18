# Template: Gherkin Feature File
# Replace: {FeatureName}, {persona}, {action}, {benefit}, {domain}
# Location: tests/features/{domain}/{feature-name}.feature
# See: docs/specs/BDD_STRATEGY.md for the full BDD strategy

Feature: {FeatureName}
  As a {persona}
  I want to {action}
  So that {benefit}

  Background:
    Given I am authenticated as a "WORKSPACE_MEMBER" in workspace "ws-test-001"
    And the workspace has an active policy with monthly_token_budget of 1000000

  # ---------------------------------------------------------------------------
  # Happy Path (required — at least one)
  # ---------------------------------------------------------------------------

  Scenario: {FeatureName} — happy path
    Given {initial state}
    When I {action}
    Then the response status is 201
    And the response contains "{expected_field}" with value "{expected_value}"
    And an audit event "{EVENT_TYPE}" is recorded for workspace "ws-test-001"

  # ---------------------------------------------------------------------------
  # Validation Error (required — at least one)
  # ---------------------------------------------------------------------------

  Scenario: {FeatureName} — missing required field
    Given I am authenticated as a "WORKSPACE_MEMBER"
    When I {action} with missing required field "{field_name}"
    Then the response status is 422
    And the error code is "VALIDATION_ERROR"

  Scenario: {FeatureName} — invalid field value
    Given I am authenticated as a "WORKSPACE_MEMBER"
    When I {action} with "{field_name}" set to "{invalid_value}"
    Then the response status is 400
    And the error code is "{SPECIFIC_ERROR_CODE}"

  # ---------------------------------------------------------------------------
  # Authorization Failure (required — at least one)
  # ---------------------------------------------------------------------------

  Scenario: {FeatureName} — insufficient role
    Given I am authenticated as a "VIEWER" in workspace "ws-test-001"
    When I {action}
    Then the response status is 403
    And the error code is "INSUFFICIENT_PERMISSIONS"

  Scenario: {FeatureName} — unauthenticated request
    Given I am not authenticated
    When I {action}
    Then the response status is 401
    And the error code is "MISSING_TOKEN"

  # ---------------------------------------------------------------------------
  # Multi-Tenancy Isolation (required for any endpoint accessing tenant data)
  # ---------------------------------------------------------------------------

  Scenario: {FeatureName} — cross-tenant access denied
    Given workspace "ws-test-001" has a {resource_name} with id "{resource_id}"
    And I am authenticated as a "WORKSPACE_MEMBER" in workspace "ws-test-002"
    When I try to access the {resource_name} "{resource_id}" in workspace "ws-test-001"
    Then the response status is 404
    And the error code is "{RESOURCE}_NOT_FOUND"

  # ---------------------------------------------------------------------------
  # Edge Cases (add as many as needed)
  # ---------------------------------------------------------------------------

  Scenario: {FeatureName} — {edge_case_description}
    Given {edge_case_setup}
    When {edge_case_action}
    Then {edge_case_outcome}
