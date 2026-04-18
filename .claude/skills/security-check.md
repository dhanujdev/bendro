# Skill: security-check

Invoke before implementing: authentication flows, authorization checks, data access
patterns, external service integrations, file upload handling, or any user-input processing.

## Authentication Checklist
```
[ ] Using NextAuth.js (web/admin) or JWT validation middleware (API) — not custom auth
[ ] JWT validation uses a verified library (python-jose or PyJWT with proper config)
[ ] JWT secret loaded from environment variable — never hardcoded
[ ] Access token TTL: 15 minutes
[ ] Refresh token TTL: 7 days, rotation on every use
[ ] Token expiry (exp claim) validated on every request
[ ] JTI (JWT ID) claim included for revocation support
[ ] Refresh token stored as httpOnly cookie — never in localStorage
```

## Authorization Checklist
```
[ ] RBAC enforcement at FastAPI dependency injection layer:
      workspace: WorkspaceContext = Depends(get_workspace_context)
      # This dependency: validates JWT, extracts claims, checks role, returns WorkspaceContext
[ ] workspace_id extracted from JWT claims — NEVER from request body or query params
[ ] Cross-tenant check: workspace in JWT must match resource's workspace_id
[ ] Privilege escalation attempts emit security_violation audit event
[ ] All RBAC checks emit authorization_checked audit event
```

## Data Access Checklist
```
[ ] All DB queries use parameterized values (never string concatenation)
[ ] workspace_id filter on every query touching user data
[ ] Repository pattern: no raw ORM calls outside Repository classes
[ ] Soft-delete pattern for user data (deleted_at timestamp) — don't hard delete
[ ] PII fields documented in docs/DATA_CLASSIFICATION.md
```

## Input Handling Checklist
```
[ ] File uploads:
      - Type validation: only allowlisted MIME types accepted
      - Size limit: configurable max (default 100MB for media files, 10MB for docs)
      - No path traversal: filenames sanitized (no ../ in path)
      - Stored with random UUID name — not original filename
      - Scanned before processing (ClamAV stub for MVP)
[ ] URL inputs (any endpoint that accepts a URL):
      - Validate against allowlist of accepted domains (SSRF protection)
      - No redirects followed to non-allowlisted domains
[ ] All string inputs: max length enforced, no null bytes, no control characters
[ ] JSON body: max 100KB enforced by middleware
```

## Secrets Checklist
```
[ ] No secrets in source code (literal strings, comments, or TODOs)
[ ] No secrets in environment variable files committed to git
[ ] .env.example has placeholder values with description comments
[ ] detect-secrets scan passes with zero new findings:
      detect-secrets scan --baseline .secrets.baseline
[ ] API keys rotated to fresh values after any accidental exposure
```

## Logging Safety Checklist
```
[ ] No PII in logs at any level (names, emails, phone numbers, addresses)
[ ] No tokens, passwords, or API keys in logs
[ ] No full request/response bodies in production logs
[ ] Correlation IDs (trace_id, run_id, tenant_id) are safe to log
[ ] Error messages don't reveal internal system details to external callers
```

## Content Safety Checklist
```
[ ] User-submitted text (goals, prompts) passes content moderation before LLM processing
[ ] AI-generated artifacts pass content moderation before delivery to user
[ ] Content moderation result recorded in validation_results state field
[ ] Moderation violations emit content_moderation_triggered audit event
[ ] Platform owner can configure blocked categories per workspace policy
```

## After Security Check
If any item fails, do NOT proceed with implementation until resolved.
Document any accepted risks in docs/DECISIONS.md with:
- Risk description
- Mitigating control in place
- Planned remediation date
