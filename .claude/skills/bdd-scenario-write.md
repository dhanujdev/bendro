# Skill: bdd-scenario-write

Invoke this skill **AFTER contract-first skill** and **BEFORE writing any implementation code**.
Gherkin scenarios are the specification for the sprint. Failing step definitions are committed before implementation.

## File Location
`tests/features/{domain}/{feature}.feature`

Domain folders:
- `auth/` — authentication, authorization, RBAC
- `workflows/` — workflow runs, goal intake, status
- `policies/` — budget enforcement, content moderation, feature flags
- `approvals/` — human-in-the-loop approval cycle
- `artifacts/` — generated artifact delivery and management
- `admin/` — control plane: audit timeline, cost dashboard, policy config

## Gherkin Template
```gherkin
Feature: {Feature Name — matches PRD user story title}
  As a {Creator | WORKSPACE_OWNER | PLATFORM_ADMIN}
  I want to {concrete action}
  So that {business benefit}

  Background:
    Given I am authenticated as a workspace owner
    And my workspace has id "ws-test-001"
    And my workspace policy allows "content_strategy_v1" workflow

  # ============================================================
  # Happy Path
  # ============================================================
  Scenario: Successfully start a content strategy workflow
    Given I have a project titled "Q4 Social Campaign"
    And the project goal is "Generate LinkedIn content for product launch"
    When I start a "content_strategy_v1" workflow for the project
    Then the response status is 202
    And the response contains a "workflow_run_id"
    And the workflow run status is "running"

  # ============================================================
  # Validation Errors
  # ============================================================
  Scenario: Reject workflow start with empty goal
    Given I have a project titled "Empty Goal Project"
    When I start a workflow with an empty goal
    Then the response status is 422
    And the error code is "GOAL_REQUIRED"
    And the error details reference the "goal" field

  Scenario: Reject workflow start for disabled workflow type
    Given my workspace policy does not allow "content_strategy_v1"
    When I attempt to start a "content_strategy_v1" workflow
    Then the response status is 403
    And the error code is "WORKFLOW_TYPE_DISABLED"

  # ============================================================
  # Authorization
  # ============================================================
  Scenario: Viewer cannot start workflows
    Given I am authenticated as a workspace viewer
    When I attempt to start a workflow
    Then the response status is 403
    And the error code is "INSUFFICIENT_PERMISSIONS"

  Scenario: Cannot access another workspace's workflow
    Given workspace "ws-other" has a workflow run "run-abc"
    When I request the status of workflow run "run-abc"
    Then the response status is 404
    And no data from workspace "ws-other" is revealed

  # ============================================================
  # Edge Cases
  # ============================================================
  Scenario: Workflow blocked by budget limit
    Given my workspace has exhausted its monthly token budget
    When I attempt to start a workflow
    Then the response status is 402
    And the error code is "BUDGET_EXCEEDED"
    And a "budget_exceeded" audit event is recorded
```

## Quality Rules for Scenarios

### DO
- Use domain language (not implementation details)
- Make Then clauses specific and measurable
- Test auth failure in every feature (it's a security requirement)
- Test cross-tenant isolation if the feature accesses user data
- Include the audit event check when an action should be audited

### DON'T
- Share state between scenarios (each must be independent)
- Reference database IDs directly in Given clauses
- Use vague Then clauses like "the operation succeeds"
- Skip the authorization failure scenario — it's mandatory

## Minimum Scenarios Per Feature
```
1. Happy path (complete successful flow)
2. At least 1 validation error path (invalid input → 422)
3. Authorization failure (wrong role → 403)
4. Cross-tenant isolation (if feature accesses user data → 404, not 403)
5. Edge case specific to this domain
```

## After Writing Scenarios

### Step 1: Create stub step definitions (they MUST fail)
```python
# tests/step_definitions/workflows/workflow_run_steps.py
from behave import given, when, then

@given('I am authenticated as a workspace owner')
def step_auth_workspace_owner(context):
    raise NotImplementedError("Step not implemented yet — RED phase")

@when('I start a "{workflow_type}" workflow for the project')
def step_start_workflow(context, workflow_type):
    raise NotImplementedError("Step not implemented yet — RED phase")

@then('the response status is {status_code:d}')
def step_check_status(context, status_code):
    raise NotImplementedError("Step not implemented yet — RED phase")
```

### Step 2: Run to confirm they fail
```bash
behave tests/features/workflows/workflow_run.feature
# Expected: all scenarios FAIL — this is correct (RED phase)
```

### Step 3: Commit the failing tests
```bash
git add tests/features/ tests/step_definitions/
git commit -m "test(bdd): add failing scenarios for workflow run — RED phase"
```

### Step 4: Only now begin implementation (GREEN phase)

## Step Definition Patterns
```python
# Auth fixture — reuse across all step definitions
@given('I am authenticated as a {role}')
def step_auth(context, role):
    """Set up JWT token for the specified role in context.headers."""
    context.headers = {"Authorization": f"Bearer {get_test_token(role, context.workspace_id)}"}

# Response capture — reuse across all
@when('I {verb} {resource}')
def step_api_call(context, verb, resource):
    """Make API call and store response in context."""
    context.response = context.client.request(verb, f"/api/v1/{resource}", headers=context.headers)

# Standard then steps — reuse
@then('the response status is {code:d}')
def step_status_check(context, code):
    assert context.response.status_code == code, \
        f"Expected {code}, got {context.response.status_code}: {context.response.json()}"
```
