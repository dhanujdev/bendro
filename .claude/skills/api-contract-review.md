# Skill: api-contract-review

Invoke when adding or modifying API endpoints.
Every endpoint must pass this checklist before being considered complete.

## Pre-Conditions
- OpenAPI spec exists at docs/specs/openapi/v1/{resource}.yaml (contract-first — ADR-0013)
- BDD scenarios exist for this endpoint (bdd-scenario-write skill was invoked)

## Implementation Review Checklist

### Response Format
```
[ ] All success responses use the standard envelope:
      { "data": {...}, "meta": { "requestId": "...", "timestamp": "...", "version": "1" } }
[ ] All error responses use:
      { "error": { "code": "ERROR_CODE", "message": "...", "details": {...} }, "meta": {...} }
[ ] HTTP status codes are semantically correct:
      200: GET success with body
      201: POST success — resource created
      202: POST success — async operation queued
      400: Malformed request (syntax error)
      401: Not authenticated (no/invalid JWT)
      403: Authenticated but not authorized (wrong role/wrong tenant)
      404: Resource not found (or tenant-scoped not found that reveals 403)
      409: Conflict (resource already exists)
      422: Validation error (semantically invalid input)
      429: Rate limited
      500: Internal server error
[ ] List endpoints support cursor-based pagination (pageSize, pageToken) — NOT offset
[ ] All mutations return the updated resource (not just 204 No Content)
```

### Authentication and Authorization
```
[ ] Endpoint requires authentication (unless explicitly documented as public)
[ ] Auth check uses FastAPI dependency injection (get_workspace_context):
      workspace: WorkspaceContext = Depends(get_workspace_context)
[ ] RBAC role check is in the dependency — NOT in the route handler
[ ] workspace_id comes from the JWT token — NOT from request body or path params
[ ] Cross-tenant access returns 404 (not 403) to avoid tenant enumeration
```

### Request Validation
```
[ ] All request inputs validated with Pydantic (Python) or Zod (TypeScript)
[ ] Validation errors return 422 with field-level details:
      { "error": { "code": "VALIDATION_ERROR", "details": { "field": "reason" } } }
[ ] Max request body size enforced (100KB limit)
[ ] No user input passed directly to DB queries, shell commands, or LLM prompts
[ ] File upload endpoints validate: type allowlist, max size, no path traversal
```

### Audit Events
```
[ ] Every mutation endpoint emits an appropriate audit event via packages/observability
[ ] Audit event includes: event_type, run_id (if applicable), tenant_id, user_id, timestamp
[ ] READ endpoints do NOT need audit events (unless admin-sensitive reads)
```

### OpenAPI Compliance
```
[ ] Every endpoint has an operationId (unique, camelCase)
[ ] Every field in request/response schemas has a description
[ ] All error response schemas are documented
[ ] Example request and response provided
[ ] Breaking changes have version bump in path: /api/v1/ → /api/v2/
```

### Tests Required
```
[ ] Happy path test (correct input → expected response)
[ ] Authentication failure test (no token → 401)
[ ] Authorization failure test (wrong role → 403)
[ ] Cross-tenant isolation test (other tenant's resource → 404)
[ ] Validation failure test (invalid input → 422 with field errors)
[ ] 404 test for resource-not-found (for resource-level endpoints)
[ ] Rate limit test (optional — integration test level)
```

### Repository Pattern
```
[ ] Route handler ONLY calls service layer (no business logic in handler)
[ ] Service layer ONLY calls repository classes (no ORM calls in service)
[ ] Repository class handles ALL DB queries for this resource
[ ] workspace_id filter applied in EVERY repository query
```

## Run Against the Spec
After implementation:
```bash
# Validate OpenAPI spec is still valid
npx @redocly/cli lint docs/specs/openapi/v1/{resource}.yaml

# Confirm implementation matches spec
# (manual review or use schemathesis for property-based testing)
python -m schemathesis run docs/specs/openapi/v1/{resource}.yaml \
  --base-url http://localhost:8000
```
