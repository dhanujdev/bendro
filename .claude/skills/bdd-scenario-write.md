---
name: bdd-scenario-write
description: >
  Writes Gherkin .feature files under tests/features/{domain}/{feature}.feature.
  Scenarios must cover happy path, validation errors, and — when applicable —
  auth failure and free-tier vs paid gating. Run after contract-first and
  before any implementation.
---

# Skill: bdd-scenario-write

Invoke this skill **AFTER contract-first** and **BEFORE writing any implementation code**.
Gherkin scenarios are the specification for the feature. Failing step definitions are committed before implementation.

## File Location
`tests/features/{domain}/{feature}.feature`

Domain folders used in bendro:
- `auth/` — NextAuth sign-in, sign-out, session enforcement
- `onboarding/` — first-run goal capture, safety questionnaire
- `routines/` — catalog browse, filter, detail
- `sessions/` — start/complete a routine, persistence
- `streaks/` — daily streak rollover, restoration
- `player/` — camera gating, pose runtime, avatar lifecycle
- `billing/` — Stripe checkout, subscription status, webhook
- `safety/` — pain feedback, disclaimer gating (Phase 11+)

## Gherkin Template
```gherkin
Feature: Create a workout session
  As a signed-in user
  I want to log a completed routine as a session
  So that my streak and history update correctly

  Background:
    Given I am signed in as "user-test-001"
    And the routine catalog contains a routine "morning-mobility-5m"

  # ============================================================
  # Happy Path
  # ============================================================
  Scenario: Successfully create a session for a completed routine
    When I POST /api/sessions with routineId "morning-mobility-5m" and durationSeconds 300
    Then the response status is 201
    And the response body data has a "sessionId"
    And my streak for today is incremented
    And a structured log entry is emitted with userId, route, status, durationMs

  # ============================================================
  # Validation Errors
  # ============================================================
  Scenario: Reject session with unknown routineId
    When I POST /api/sessions with routineId "does-not-exist" and durationSeconds 300
    Then the response status is 422
    And the error code is "VALIDATION_ERROR"
    And the error details reference "routineId"

  Scenario: Reject session with negative duration
    When I POST /api/sessions with routineId "morning-mobility-5m" and durationSeconds -10
    Then the response status is 422
    And the error code is "VALIDATION_ERROR"
    And the error details reference "durationSeconds"

  # ============================================================
  # Authentication
  # ============================================================
  Scenario: Unauthenticated request is rejected
    Given I am not signed in
    When I POST /api/sessions with a valid body
    Then the response status is 401
    And the error code is "UNAUTHENTICATED"

  # ============================================================
  # Cross-user isolation
  # ============================================================
  Scenario: Cannot read another user's session
    Given user "user-other" owns session "ses-abc"
    When I GET /api/sessions/ses-abc
    Then the response status is 404
    And no data from user "user-other" is revealed

  # ============================================================
  # Free-tier vs paid (applies from Phase 9)
  # ============================================================
  Scenario: Free user is blocked from premium-only routine
    Given my subscriptionStatus is "free"
    And the routine "deep-hip-opener-premium" is marked premium
    When I POST /api/sessions with routineId "deep-hip-opener-premium"
    Then the response status is 403
    And the error code is "PREMIUM_REQUIRED"
```

## Quality Rules for Scenarios

### DO
- Use domain language (routine, session, streak, pain rating) — not implementation jargon
- Make Then clauses specific and measurable
- Test auth failure in every feature touching user data (security requirement)
- Test cross-user isolation on any endpoint that reads user-owned data
- From Phase 9+, include at least one free-vs-paid scenario for gated features
- For any Phase 11 safety-touching feature, include a pain ≥ 7 scenario

### DON'T
- Share state between scenarios — each must be independent
- Reference database IDs or Drizzle internals in Given clauses
- Use vague Then clauses like "the operation succeeds"
- Skip the 401 scenario on authenticated endpoints

## Minimum Scenarios Per Feature
```
1. Happy path (complete successful flow)
2. At least 1 validation error path (invalid input → 422)
3. Authentication failure (no session → 401) — if endpoint is authenticated
4. Cross-user isolation (if feature reads user-owned data → 404, not 403)
5. One domain-specific edge case (streak rollover at midnight, camera denied, webhook replay, etc.)
6. From Phase 9+, free-tier gating scenario — if the feature is premium-gated
```

## After Writing Scenarios

### Step 1: Create stub step definitions that FAIL
Bendro uses Vitest for step execution. Write failing steps in `tests/features/{domain}/steps/{feature}.steps.ts`:

```typescript
// tests/features/sessions/steps/create-session.steps.ts
import { Given, When, Then } from 'vitest-cucumber' // or your chosen runner

Given('I am signed in as {string}', (_userId: string) => {
  throw new Error('Step not implemented yet — RED phase')
})

When('I POST /api/sessions with routineId {string} and durationSeconds {int}', (_routineId: string, _seconds: number) => {
  throw new Error('Step not implemented yet — RED phase')
})

Then('the response status is {int}', (_code: number) => {
  throw new Error('Step not implemented yet — RED phase')
})
```

### Step 2: Run to confirm they fail
```bash
pnpm test tests/features/sessions/create-session.feature
# Expected: all scenarios FAIL — this is correct (RED phase)
```

### Step 3: Commit the failing tests
```bash
git add tests/features/
git commit -m "test(bdd): add failing scenarios for create-session — RED phase"
```

### Step 4: Only now begin implementation (GREEN phase)

## Shared Step Patterns
Reuse across feature files by putting shared steps in `tests/features/_shared/`:

```typescript
// tests/features/_shared/auth.steps.ts
Given('I am signed in as {string}', (userId: string) => {
  // install a fake NextAuth session for the test user
  installTestSession({ user: { id: userId, subscriptionStatus: 'free' } })
})

Given('I am not signed in', () => {
  clearTestSession()
})

// tests/features/_shared/response.steps.ts
Then('the response status is {int}', function (code: number) {
  expect(this.response.status).toBe(code)
})

Then('the error code is {string}', function (code: string) {
  expect(this.response.body.error.code).toBe(code)
})
```
