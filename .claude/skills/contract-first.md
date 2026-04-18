---
name: contract-first
description: >
  Enforces that an OpenAPI spec is written and committed before any Next.js
  Route Handler is implemented. The spec for bendro lives in a single file,
  docs/specs/openapi/v1/bendro.yaml, with one paths entry per route.
---

# Skill: contract-first

Invoke this skill **BEFORE writing any implementation code** for a new or changed API route.
The contract must be committed to git before any implementation begins.

## Rule
The contract is the specification. Implementation conforms to the contract — not the other way around.
If you discover the contract needs changing during implementation, update the contract first and commit it.

## For REST Routes (OpenAPI)

### File Location
Single file: `docs/specs/openapi/v1/bendro.yaml`
All routes live under the same `paths:` tree, organized by resource.

### Minimum Required Sections per Route
```yaml
openapi: "3.1.0"
info:
  title: Bendro API
  version: "1.0.0"

paths:
  /api/sessions:
    post:
      operationId: createSession              # required — unique, camelCase
      summary: Record a completed routine as a session
      description: |
        Creates a workout session for the authenticated user. Increments the
        user's streak if this is the first session of the day. Requires a
        NextAuth session. Rate limited to 30/min per userId.
      security:
        - sessionCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSessionRequest'
            example:
              routineId: "morning-mobility-5m"
              durationSeconds: 300
              painRating: 2
      responses:
        '201':
          description: Session created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionResponse'
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '422': { $ref: '#/components/responses/ValidationError' }
        '429': { $ref: '#/components/responses/RateLimited' }

components:
  schemas:
    CreateSessionRequest:
      type: object
      required: [routineId, durationSeconds]
      properties:
        routineId:
          type: string
          description: "ID of the routine that was completed."
          example: "morning-mobility-5m"
        durationSeconds:
          type: integer
          minimum: 1
          description: "How long the user actually practiced, in seconds."
        painRating:
          type: integer
          minimum: 0
          maximum: 10
          description: "Self-reported pain 0–10. ≥ 7 triggers safety flow (Phase 11)."

  responses:
    Unauthenticated:
      description: No valid NextAuth session
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    # ... Forbidden, ValidationError, RateLimited, etc.

  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: next-auth.session-token
      description: "NextAuth session cookie (httpOnly, secure, sameSite=lax)"
```

### Validate the Spec
```bash
npx @redocly/cli lint docs/specs/openapi/v1/bendro.yaml
```
Must pass with zero errors before committing.

## For Server Actions With a Public Type Contract

### File Location
`src/types/{aggregate}.ts` — exported types that act as the contract between client and server action.

### Required
- Zod schema for input
- Exported TS type for response
- JSDoc explaining when to use the action
- Matching failing unit test before the action is implemented

## For Future Webhook Handlers (e.g., Stripe)

### File Location
`docs/specs/webhooks/{source}.md`

### Required Sections
```markdown
# Webhook Spec: {source} — {event-family}

## Event Types Handled
- `customer.subscription.updated` — propagate subscriptionStatus to the user
- `customer.subscription.deleted` — mark subscriptionStatus = "canceled"

## Verification
Signature header, secret env var, rejection behavior on mismatch.

## Idempotency
How we de-dup by event.id.

## Side Effects
Exact DB mutations and downstream calls.
```

## After Writing the Spec
1. `git commit -m "docs(contracts): add OpenAPI path for POST /api/sessions"`
2. Only THEN proceed to the `bdd-scenario-write` skill
3. The spec is the input to all downstream steps (BDD, implementation, tests)

## Contract Change Protocol
If implementation reveals the contract needs adjustment:
1. Update `docs/specs/openapi/v1/bendro.yaml`
2. `git commit -m "docs(contracts): update {operationId} spec — {reason}"`
3. Update the failing tests to match the new contract
4. Update the implementation
5. If it is a breaking change, bump to v2 (`docs/specs/openapi/v2/bendro.yaml`) and note it in CHANGELOG.md
