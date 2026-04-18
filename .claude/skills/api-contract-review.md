---
name: api-contract-review
description: >
  Reviews any new or changed Next.js Route Handler (src/app/api/**/route.ts)
  against its OpenAPI spec in docs/specs/openapi/v1/bendro.yaml. Verifies the
  spec exists, Zod request/response schemas match the spec, status codes and
  error shapes are documented, and the handler stays thin.
---

# Skill: api-contract-review

Invoke when adding or modifying a Next.js Route Handler at `src/app/api/**/route.ts`.
Every route must pass this checklist before being considered complete.

## Pre-Conditions
- OpenAPI path entry exists in `docs/specs/openapi/v1/bendro.yaml` (contract-first)
- Gherkin `.feature` file exists under `tests/features/{domain}/` (bdd-scenario-write was invoked)
- Zod request/response schemas are defined in `src/types/` or co-located with the route

## Implementation Review Checklist

### Response Format
```
[ ] Success responses use a consistent JSON shape:
      { "data": {...} }                              # single resource
      { "data": [...], "nextCursor": "..." | null }  # list with cursor pagination
[ ] Error responses use:
      { "error": { "code": "ERROR_CODE", "message": "...", "details": {...} } }
[ ] HTTP status codes are semantically correct:
      200 GET success with body
      201 POST success — resource created
      204 No Content — successful DELETE or idempotent no-op
      400 Malformed request (syntax / JSON parse)
      401 Not authenticated (no NextAuth session)
      403 Authenticated but forbidden (premium gate, ownership denied)
      404 Resource not found (also used for cross-user isolation — prevents enumeration)
      409 Conflict (duplicate, version mismatch)
      422 Validation error (Zod parse failure with field details)
      429 Rate limited
      500 Server error (unhandled)
[ ] List endpoints use cursor-based pagination (cursor, limit) — NOT offset
[ ] Mutations return the updated/created resource (not just an empty body)
[ ] Never return raw Drizzle rows — map through a DTO in the service layer
```

### Authentication and Authorization
```
[ ] Public routes (catalog reads only): GET /api/stretches, GET /api/routines (non-owned)
[ ] Every other route calls requireSession() helper from src/lib/auth.ts (once added in Phase 3)
[ ] userId comes ONLY from the NextAuth session — never from body, query, or path
[ ] Ownership checks (e.g., session belongs to this user) live in the service layer
[ ] Cross-user access returns 404 (not 403) to prevent user enumeration
[ ] Premium-gated resources check user.subscriptionStatus in the service, not the route
```

### Request Validation
```
[ ] All inputs parsed with Zod at the top of the handler:
      const body = CreateSessionSchema.parse(await request.json())
[ ] ZodError caught and returned as 422 with field-level details:
      { "error": { "code": "VALIDATION_ERROR", "details": { "field": "reason" } } }
[ ] Max body size enforced (default Next.js ~4MB; explicit smaller limit for upload routes)
[ ] No raw user input passed into sql.raw() or dynamic Drizzle expressions
[ ] Query/path params parsed with z.coerce where numeric/boolean
[ ] File uploads (future): MIME allowlist, max size, sanitized filename stored in Vercel Blob / S3
```

### Observability Hooks
```
[ ] Mutations emit a structured log line with { userId, route, status, durationMs }
[ ] Until Phase 12: use console.log with a structured object
[ ] From Phase 12 (Sentry + Vercel Analytics): replace console.log with the observability helper
[ ] Read-only catalog reads do NOT need per-request events
[ ] No PII (email, tokens, session cookies, Stripe customer/subscription IDs) ever appears in log fields
```

### OpenAPI Compliance
```
[ ] Each operation has a unique operationId (camelCase, e.g., createSession)
[ ] Every request/response field has a description
[ ] Error responses reference shared error schemas in components.schemas
[ ] At least one request and one response example is provided
[ ] Breaking changes bump the spec version (v1 → v2) and live under docs/specs/openapi/v2/
```

### Tests Required
```
[ ] Happy path (Vitest integration test against the handler — correct input → expected status + body)
[ ] 401 test (no session)
[ ] 403 test (wrong owner or premium-gated without subscription)
[ ] 404 test (cross-user isolation)
[ ] 422 test (Zod invalid input)
[ ] Gherkin feature covers happy path + at least one error path + auth failure
```

### Layering
```
[ ] Route handler ONLY: parse input → call service → shape Response
[ ] Zero Drizzle / db imports inside src/app/ (allowed only in src/services/* and src/db/*)
[ ] Zero business logic in the handler (compute, branch, validate domain rules → service)
[ ] Zero `process.env.X` reads in handlers — route through src/config/env.ts
```

## Run Against the Spec
After implementation:
```bash
# Lint the OpenAPI spec
npx @redocly/cli lint docs/specs/openapi/v1/bendro.yaml

# Typecheck / lint / test the whole project
pnpm typecheck && pnpm lint && pnpm test
```
All must pass with zero errors before the PR is opened.
