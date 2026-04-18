---
name: security-check
description: >
  Pre-implementation security checklist for bendro. Invoke before writing
  auth, billing, PII-handling, camera-touching, or webhook code. Covers
  NextAuth session enforcement, Zod validation at the boundary, userId-
  from-session (never from body), camera consent gating, Stripe webhook
  signature verification, and logging hygiene.
---

# Skill: security-check

Invoke BEFORE implementing: authentication flows, billing/Stripe code, any PII
handling, camera/pose code, webhook handlers, AI client wrappers, or any
user-input processing.

## Authentication Checklist (NextAuth)
```
[ ] Using NextAuth.js server config in src/lib/auth.ts — not a custom auth scheme
[ ] NEXTAUTH_SECRET loaded from env via src/config/env.ts — never hardcoded
[ ] Session cookie is httpOnly, secure in production, sameSite=lax
[ ] Session TTL configured (default 30 days; shorter for sensitive surfaces)
[ ] Route handlers call `requireSession()` (helper in src/lib/auth.ts)
[ ] Public routes explicitly listed (GET /api/stretches, GET /api/routines catalog reads)
[ ] No session lookup via client-side JS for authorization decisions — always server-side
```

## Authorization Checklist
```
[ ] Every mutation route checks the session BEFORE any business logic runs
[ ] userId is read from the session — NEVER from request body, query, or path
[ ] Ownership checks (session.userId === resource.userId) live in the service layer
[ ] Cross-user reads return null from the service → 404 from the route (prevents enumeration)
[ ] Premium-gated resources check user.subscriptionStatus in the service, not the UI
[ ] No role hierarchy (bendro is per-user) — ownership is the only axis
```

## Data Access Checklist
```
[ ] All Drizzle queries on user-scoped tables filter by userId
[ ] All queries are parameterized by Drizzle's query builder — no sql.raw with user input
[ ] If sql.raw is unavoidable, inputs are allowlist-validated with a comment explaining why
[ ] DTO mapping in the service layer — never return raw Drizzle rows to the client
[ ] Soft-delete only where history matters (sessions, safety_events); otherwise hard delete is fine
[ ] No direct DB access from src/app/ (routes or components)
```

## Input Handling Checklist
```
[ ] All request bodies validated with Zod at the route boundary
[ ] Query params and path params parsed with z.coerce where numeric/boolean
[ ] Max body size (~4MB Next.js default) acceptable; smaller explicit limit for uploads
[ ] File uploads (future):
      - MIME allowlist (image/png, image/jpeg for avatars)
      - Max size 5MB
      - Sanitized filename (no path traversal)
      - Stored with random UUID name in Vercel Blob / S3 — not the DB
[ ] URL inputs (e.g., custom avatar): validated against an allowlist (SSRF protection)
[ ] All string inputs: length limits enforced, no null bytes, no control characters
```

## Secrets Checklist
```
[ ] No secrets in source code, comments, or TODOs
[ ] .env.local is gitignored; only .env.example is committed with placeholder values
[ ] Production secrets live in Vercel Environment Variables (Production scope)
[ ] Preview deployments use separate scoped secrets (or none for public-only flows)
[ ] detect-secrets scan passes with zero NEW findings vs baseline
[ ] Any accidentally exposed credential is rotated IMMEDIATELY — never just "masked"
```

## Logging Safety Checklist
```
[ ] No email, password, session cookie, OAuth token, Stripe customer/subscription ID in logs
[ ] No full request/response bodies logged in production
[ ] Safe to log: userId (UUID), routineId, sessionId, route, status, durationMs
[ ] Until Phase 12: structured console.log with object fields
[ ] From Phase 12: structured logs via the observability helper → Sentry + Vercel Analytics
[ ] Error messages to the client never reveal internal system details or stack traces
```

## Stripe / Billing Checklist (Phase 9+)
```
[ ] /api/stripe/webhook handler verifies the signature using STRIPE_WEBHOOK_SECRET on EVERY call
[ ] Webhook is idempotent — de-dup by event.id (store processed event IDs or use Stripe's built-in semantics)
[ ] Stripe customer IDs / subscription IDs are NEVER trusted from client requests — always looked up via the session user
[ ] Checkout session creation uses customer or customer_email from the server session, never from the client
[ ] Subscription status updates come ONLY from verified webhooks, never from client-side calls
[ ] All Stripe SDK calls live in src/services/billing.ts (single boundary)
```

## Camera / Pose Privacy Checklist
```
[ ] Camera access is gated by an explicit user gesture (button click) — no auto-prompt
[ ] Camera preview is visible to the user whenever the camera is active (no hidden capture)
[ ] Pose landmarks and video frames NEVER leave the browser — no fetch() carrying them
[ ] No analytics beacons include landmark or frame data
[ ] If server-side pose analysis is ever proposed, create an ADR FIRST and a separate consent step
[ ] The player page shows visible UI copy describing the privacy model
```

## Health / Safety Checklist (Phase 11+)
```
[ ] Mandatory disclaimers present on onboarding, routine start, and AI-generated content
[ ] Pain feedback flow uses the thresholds in src/services/safety.ts (3, 6, 7)
[ ] Pain rating ≥ 7 triggers the "stop and seek medical guidance" UX
[ ] AI-generated routines include the AI-content disclaimer from src/lib/disclaimers.ts
[ ] Pre-existing-condition gates filter caution-tagged routines (see HEALTH_RULES.md)
```

## After Security Check
If any item fails, DO NOT proceed with implementation until resolved.
Document any accepted risks in `docs/DECISIONS.md` with:
- Risk description
- Mitigating control in place
- Planned remediation date

When in doubt, escalate to the security-lead agent before writing the code.
