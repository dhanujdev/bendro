@AGENTS.md

# Bendro — Claude Code Master Rules

> This file is the **highest-authority document** in the repository.
> Every agent reads this file first. Every rule here is non-negotiable.
> When this file conflicts with anything else, this file wins.

---

## 1. Project Identity

**Bendro** — AI-powered flexibility, mobility, and stretching copilot. Live camera + pose estimation guides users through guided routines with a mirrored 3D avatar.

**Architecture (Next.js 16 monolith with route groups):**
```
src/app/(marketing)/      Public marketing site (landing, pricing)
src/app/(app)/            Authenticated app (home, library, settings)
src/app/onboarding/       First-run goal capture
src/app/player/           Workout player (server) + camera/avatar (client)
src/app/api/              REST API routes (Next.js Route Handlers)
src/db/                   Drizzle schema, seed, client
src/lib/                  Cross-cutting utilities (data adapter, pose math)
src/lib/pose/             Pose-detection + VRM driver (single boundary)
src/services/             Business logic (routines, sessions, streaks, billing, personalization)
src/types/                Shared domain types
src/config/               Env + feature flags
```

**Primary stack:**
- Framework: Next.js 16 App Router + React 19 + TypeScript 5
- Styling: Tailwind CSS 4 + shadcn/ui + Base UI + framer-motion
- Database: Postgres (Neon serverless) + Drizzle ORM (with in-memory mock fallback)
- State: Zustand (client) + TanStack Query (server-state cache)
- Auth: NextAuth.js (when enabled)
- Billing: Stripe (when enabled)
- Pose / Avatar: MediaPipe Tasks Vision + Kalidokit + @pixiv/three-vrm + @react-three/fiber
- Validation: Zod
- Testing: Vitest + Testing Library + Playwright (planned)
- Deployment target: Vercel

---

## 2. Source of Truth Hierarchy

When sources conflict, the higher number wins:

```
1. CLAUDE.md (this file)                      ← highest authority
2. AGENTS.md (Next.js conventions warning)    ← framework-specific guardrails
3. docs/AGENT_MEMORY.md                       ← shared agent context (current phase, stack, decisions)
4. docs/ADR/*.md                              ← architectural decisions (immutable once Accepted)
5. docs/STANDARDS.md                          ← coding conventions (enforced by linting)
6. docs/specs/openapi/v1/                     ← contract specs (written before implementation)
7. .claude/rules/*.md                         ← system, architecture, security, health rules
8. docs/SESSION_HANDOFF.md                    ← current session state
```

---

## 3. Mandatory Pre-Coding Checklist

**Claude MUST complete ALL items before writing any implementation code:**

```
[ ] Read CLAUDE.md (this file) — if not already read this session
[ ] Read AGENTS.md — Next.js conventions warning (this is Next.js 16, breaking changes)
[ ] Read docs/AGENT_MEMORY.md — understand current phase and active decisions
[ ] Read relevant ADRs — for the area being modified
[ ] Read docs/SESSION_HANDOFF.md — understand current state and what not to break
[ ] Check docs/BLOCKERS.md — do not work on blocked items
[ ] Confirm OpenAPI contract exists for any new API route (contract-first)
[ ] Confirm Gherkin .feature file exists for the feature (BDD-first)
[ ] Confirm failing tests exist before writing implementation (TDD)
[ ] Schema change needed? → invoke db-migration-review skill FIRST
[ ] New architectural decision? → invoke create-adr skill FIRST
[ ] Security-sensitive code? → invoke security-check skill FIRST
[ ] Health/medical content? → check .claude/rules/HEALTH_RULES.md
```

---

## 4. Development Order (NON-NEGOTIABLE for every feature)

```
Step 1: Write/update OpenAPI spec for the route (docs/specs/openapi/v1/)
        → invoke contract-first skill
Step 2: Write Gherkin .feature file (tests/features/{domain}/{feature}.feature)
        → invoke bdd-scenario-write skill
        → scenarios must cover: happy path, error paths, auth/free-tier failure
Step 3: Write failing unit and integration tests (RED phase)
        → commit failing tests before any implementation
Step 4: Write minimal implementation code to pass tests (GREEN phase)
Step 5: Refactor for design patterns and readability (REFACTOR phase)
Step 6: Add JSDoc on all exported functions, types, components
Step 7: Update architecture diagrams if module boundaries changed
        → invoke architecture-diagram-update skill
Step 8: Run security scan → invoke security-scan skill
        → zero high/critical findings required
Step 9: Verify dev server still works (pnpm dev) and typecheck passes
Step 10: Commit checkpoint with conventional commit message
```

---

## 5. Architecture Invariants

**These boundaries are enforced by pr-reviewer agent. Violation = BLOCKED PR.**

```
Data access:           ONLY through src/lib/data.ts adapter — never direct Drizzle calls in routes/components
Business logic:        ONLY in src/services/* — never in route handlers or React components
Route handlers:        Thin — parse + validate input, delegate to services, return Response
React Server Components: Default. Use 'use client' only when interactivity is required.
Pose / avatar code:    ONLY in src/lib/pose/* and src/app/player/camera/_components/*
External SDKs:         ALL behind a wrapper module (Stripe → src/services/billing.ts, etc.)
Direct DB queries:     ALLOWED only inside src/services/* and src/db/* — never in route handlers
Mock vs DB:            src/lib/data.ts is the single switch — never branch on env in callers
```

**Design patterns (mandatory by context):**
```
Service:    All business logic → routinesService, sessionsService, streaksService, billingService
Adapter:    External services → wrap Stripe, MediaPipe, pose loader, etc.
Repository (lite): Drizzle queries grouped per aggregate → src/db/queries/{aggregate}.ts (when complexity grows)
Single boundary: Pose solver swappable in one file (src/lib/pose/vrm-driver.ts)
Route group:    (marketing) public, (app) authenticated, no cross-imports of layouts
```

---

## 6. Security Invariants

**Any violation = security bug, not a style issue. PRs with security violations are BLOCKED.**

```
User scoping:    Every query that returns user-owned data MUST filter by userId from session
                 NEVER trust userId from request body — always derive from authenticated session

Authentication:  NextAuth session required on /api/* routes that mutate user data
                 Public routes: /api/stretches (read-only catalog), /api/routines (read-only catalog)
                 Authenticated routes: /api/sessions, /api/progress, /api/favorites (when added)

Input validation: All inputs validated with Zod at route boundary
                  Body, query params, path params — all schema-validated before service call
                  Drizzle parameterizes by default; never use sql.raw with user input

Secrets:         Zero secrets in code or committed .env files
                 Zero logging of passwords, tokens, Stripe keys, session cookies, PII
                 .env.example is the only committed env template

Stripe:          Webhook signature verification REQUIRED on every Stripe webhook handler
                 Never trust Stripe customer/subscription IDs from client — verify against session

Camera/media:    Camera access is opt-in, gated by explicit user gesture
                 Pose data NEVER leaves the client (no upload of frames or landmarks)
                 If we add server-side pose analysis, document in ADR first

Rate limiting:   Public catalog endpoints: 60 req/min per IP
                 Authenticated mutations: 30 req/min per userId
                 Stripe webhook: no app-level limit (Stripe-side gating)

CORS:            Default Next.js (same-origin) — no wildcard. Add explicit allowlist if cross-origin needed.

Timeouts:        All external HTTP calls have explicit timeouts (default 10s, max 30s)
```

---

## 7. Health & Safety Invariant

```
Bendro is an exercise/movement product. Injury risk is real.

Mandatory safety language:
  - Onboarding: "Not medical advice. Consult a healthcare provider before starting any exercise program."
  - Pain feedback flow: pain ≥ 7 → suggest stop and seek medical guidance
  - AI-generated routines: include "Generated by AI — listen to your body, stop if pain"
  - Pre-existing conditions: surface a medical-clearance question in onboarding

Disclaimer text lives in: src/lib/disclaimers.ts (single source of truth — to be added)

Enforced by:
  → .claude/rules/HEALTH_RULES.md
  → security-check skill checklist
  → pr-reviewer agent reviews any user-facing copy or AI-generated content
```

---

## 8. Documentation Invariants

```
Code docs:
  TypeScript: JSDoc on every exported function, class, interface, and type
  React:      Component prop types fully documented; complex components get a top JSDoc
  Inline:     Comment explains WHY (not what) for any non-obvious algorithm or business rule

File limits:
  Functions:  ≤ 50 lines (split into smaller functions if exceeded)
  Files:      ≤ 300 lines (split into submodules if exceeded)
  Components: ≤ 200 lines (extract sub-components if exceeded)

Action logging:
  EXECUTION_LOG.md is updated automatically by action-logger hook on every tool call

Architecture diagrams:
  docs/architecture/*.md contain Mermaid diagrams
  Updated in the SAME PR as any module boundary change

CHANGELOG.md:
  Follows Keep a Changelog format
  ## [Unreleased] section updated on every commit

Session memory:
  docs/AGENT_MEMORY.md is updated by session-handoff skill when phase or blockers change
  docs/SESSION_HANDOFF.md is overwritten at end of every session
  docs/EXECUTION_LOG.md is append-only — never delete entries
```

---

## 9. Model Governance

```
Lead agents (Opus 4.6 — highest quality for architectural decisions and enforcement):
  planner, architect, security-lead, pr-reviewer

Subagents (default model — efficient for implementation tasks):
  backend-lead, frontend-lead, qa-lead, devops-lead, docs-lead

LLM calls in production code (when AI routine generation is added):
  ALL calls route through src/services/ai/ai-client.ts (single entry)
  Zero direct openai.* / anthropic.* SDK calls outside ai-client.ts
  Every call records cost + latency to a token_usage table (when added)
  Every call has explicit timeout + retry policy
```

---

## 10. Session Start Ritual

```
1. Read docs/AGENT_MEMORY.md         (current phase, stack, blockers)
2. Read docs/SESSION_HANDOFF.md      (last session state and what was in progress)
3. Read docs/BLOCKERS.md             (active blockers — do not work on blocked items)
4. Run: /status                      (quick project status report)
5. Confirm: which agent leads this session and which model it uses
```

---

## 11. Session End Ritual (NON-NEGOTIABLE)

```
1. pnpm typecheck && pnpm lint && pnpm test
2. (when configured) pnpm audit --audit-level=high
3. Invoke session-handoff skill       (updates SESSION_HANDOFF, NEXT_STEPS, BLOCKERS,
                                       DECISIONS, EXECUTION_LOG, AGENT_MEMORY)
4. Update docs/architecture/ if module boundaries changed
5. Update CHANGELOG.md ## [Unreleased] section
6. git commit -m "chore(docs): session {N} handoff - {one-line summary}"
```

**The docs are the memory. Chat history is not. If it isn't in the docs, it doesn't exist.**

---

## 12. Phase Model

See docs/PHASES.md for full entry criteria, deliverables, and exit criteria per phase.

| Phase | Name | Lead Agent | Model |
|-------|------|-----------|-------|
| 0 | Foundation & Framework Port | architect + planner | Opus |
| 1 | Test Coverage Baseline | qa-lead | Default |
| 2 | API Contract & Validation | backend-lead | Default |
| 3 | Auth (NextAuth) | security-lead + backend-lead | Opus |
| 4 | Player Stability (camera/pose/avatar) | frontend-lead | Default |
| 5 | DB Toggle Hardening (mock ↔ Neon) | backend-lead | Default |
| 6 | Onboarding & Personalization | frontend-lead + backend-lead | Default |
| 7 | Library, Search, Filters | frontend-lead | Default |
| 8 | Sessions & Streaks Loop | backend-lead + frontend-lead | Default |
| 9 | Billing (Stripe) | security-lead + backend-lead | Opus |
| 10 | PWA & Offline UX | frontend-lead | Default |
| 11 | Health Safety & Disclaimers | security-lead | Opus |
| 12 | Observability (Vercel Analytics, Sentry) | devops-lead | Default |
| 13 | Performance Pass (Lighthouse, bundle, RSC) | frontend-lead | Default |
| 14 | E2E Tests (Playwright) | qa-lead | Default |
| 15 | Vercel Deploy (preview + prod) | devops-lead | Default |

---

## 13. Quick Reference — Skill Invocation Guide

| Situation | Skill to Invoke |
|-----------|----------------|
| Starting any new feature | `contract-first` → `bdd-scenario-write` |
| Any architectural decision | `create-adr` |
| Any schema/migration change | `db-migration-review` |
| Any new API route | `api-contract-review` |
| Any security-sensitive code | `security-check` |
| Before any PR submission | `security-scan` |
| When module boundaries change | `architecture-diagram-update` |
| After major UI milestone | `ui-smoke-test` |
| End of every session | `session-handoff` |
| End of every phase | `phase-closeout` |

---

## 14. Conventional Commit Format

```
{type}({scope}): {subject}

Types:  feat | fix | docs | refactor | test | chore | perf | ci | security
Scopes: app | api | db | services | components | pose | player | onboarding |
        billing | auth | infra | shared | bdd | contracts | docs

Examples:
  feat(api): add POST /api/sessions with Zod validation
  test(bdd): add Gherkin scenarios for streak rollover at midnight
  security(auth): require NextAuth session on /api/sessions
  docs(adr): ADR-0003 chose NextAuth over Auth.js v5 for stability
  chore(docs): session 4 handoff - Phase 2 API contracts complete
```

---

## 15. Git Workflow

```
Branches:
  feat/{scope}-{description}    (e.g., feat/api-sessions-validation)
  fix/{scope}-{description}
  chore/{description}
  docs/{description}
  security/{description}

Never push directly to main.
All changes go through PR + automated CI + pr-reviewer agent approval.
Branch protection: required checks — typecheck, lint, test, build.
```

---

*Last updated: Foundation — Phase 0 (framework port from Creator OS)*
*Maintained by: architect agent*
