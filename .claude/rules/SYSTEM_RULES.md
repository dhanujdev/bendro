# Bendro — Claude Code System Rules

> These rules are HARD CONSTRAINTS on Claude's behavior in this repository.
> They exist to prevent hallucination, scope creep, and architectural violations.
> Every agent and every session is bound by these rules. No exceptions.

---

## Rule 1 — Read Before Write (ALWAYS)

Before modifying ANY file, Claude MUST have read it in the current session.
Before adding code to a module, Claude MUST understand the existing code structure.

**Violation indicator:** Editing a file based on memory of a previous session without re-reading it.
**Prevention:** The `pre-write-check.py` hook blocks writes to files not read this session.

---

## Rule 2 — Contract Before Code

No implementation code may be written before a contract exists.

- New REST endpoint → OpenAPI spec in `docs/specs/openapi/v1/` first
- New external webhook handler → spec in `docs/specs/webhooks/` first
- New Server Action with cross-page contract → type in `src/types/` first

**Violation indicator:** Writing a route handler without a corresponding spec file.
**Prevention:** `contract-guard.py` hook blocks writes to `src/app/api/**/route.ts` without a matching spec.

---

## Rule 3 — Tests Before Implementation

Failing tests MUST exist before any implementation code is written.

1. Write the test → it FAILS → commit
2. Write the implementation → test PASSES → commit

If Claude writes implementation and tests in the same response, it is violating TDD.
The `tdd-guard.py` hook warns when implementation files are written without test files.

---

## Rule 4 — Architecture Boundary Enforcement

These boundaries are absolute. Claude must NEVER:

| Violation | What Should Happen Instead |
|---|---|
| Call `drizzle` or `db` directly in a route handler | Delegate to a service in `src/services/*` |
| Call `drizzle` or `db` directly in a React component | Fetch via API route or Server Component + service |
| Put business logic in a route handler | Move to service layer |
| Import `@mediapipe/*` outside `src/lib/pose/*` or player camera components | Route through the pose adapter |
| Import `stripe` outside `src/services/billing.ts` | Route through the billing service |
| Branch on `DATABASE_URL` in a caller | Use `src/lib/data.ts` adapter |
| Import a `(marketing)` layout into an `(app)` page (or vice versa) | Keep route groups isolated |
| Use `any` type | Specify a concrete type or `unknown` |

If Claude is about to violate one of these, it MUST stop, create an ADR if this represents a genuine architectural decision, or use the existing pattern.

---

## Rule 5 — User Scoping Is Absolute

Every query that returns user-owned data (sessions, favorites, streaks, user profile, billing)
MUST filter by `userId` derived from the authenticated NextAuth session.

Claude must NEVER trust `userId` from a request body, query string, or path parameter.

User-scoped tables: `users, sessions, favorites, streaks` (and any future user-owned data).
Catalog tables: `stretches, routines, routine_stretches` — unless the routine is owned (`routines.ownerId` set), in which case ownership is enforced at the service layer.

---

## Rule 6 — Security Is Non-Negotiable

Claude must NEVER:
- Log passwords, emails, tokens, API keys, session cookies, or Stripe customer/subscription IDs
- Hardcode any secret value (use environment variables)
- Write authentication code that bypasses NextAuth middleware
- Generate a wildcard CORS configuration
- Write SQL using string concatenation or `sql.raw()` with user input
- Call `eval`, `new Function`, or `child_process` with user-provided input
- Upload camera frames or pose landmarks to the server (camera data stays client-side)

If asked to do any of the above, Claude must refuse and explain why.

---

## Rule 7 — Scope Discipline

Claude must ONLY do what was asked:
- Bug fix → fix the bug, do not refactor surrounding code
- Feature → implement the feature, do not add "nice to have" extras
- Documentation → update the relevant docs, do not change implementation
- Do NOT add error handling for impossible scenarios
- Do NOT add configuration for things that don't need to be configurable
- Do NOT add abstraction layers for one-time operations

---

## Rule 8 — Checkpoint Discipline

For any task that takes more than 10 tool calls, Claude MUST:
1. Write a checkpoint to `.claude/checkpoints/ACTIVE.md` after each major step
2. Include: what was done, what is next, and key decisions made
3. The checkpoint must be specific enough that a new session can pick up without reading chat history

---

## Rule 9 — Source of Truth Hierarchy

```
1. CLAUDE.md (highest authority)
2. AGENTS.md (Next.js 16 conventions)
3. .claude/rules/SYSTEM_RULES.md (this file)
4. docs/AGENT_MEMORY.md (current phase and decisions)
5. docs/ADR/*.md (architectural decisions — immutable once Accepted)
6. docs/STANDARDS.md (coding conventions)
7. docs/specs/ (contract specs)
8. docs/SESSION_HANDOFF.md (current session state)
```

---

## Rule 10 — Model Selection

Certain agents MUST run on `claude-opus-4-6`:
- `planner`, `architect`, `security-lead`, `pr-reviewer`

High-stakes decisions (architecture, security, PR approval) require the best available model.

---

## Rule 11 — Anti-Hallucination Guardrails

Claude must NEVER:
- Invent file paths that haven't been verified to exist (use Glob/Read first)
- Assume a function or class exists without checking (use Grep first)
- Reference an ADR number without verifying the ADR file exists
- Claim a test passes without running it
- Describe what code does without reading the current version of that code
- Assume a Next.js API still works the way it did pre-16 — this is Next.js 16 and APIs have changed (see AGENTS.md)

---

## Rule 12 — Minimal Changes

Claude must prefer the smallest change that accomplishes the goal:
- Do not rewrite files that are correct
- Do not "clean up" code that wasn't part of the task
- Do not add new dependencies unless required for the task
- Do not upgrade dependencies unless required for the task

The right diff size is the smallest diff that makes the failing test pass.

---

*Enforced by:*
*1. This file (human-readable intent)*
*2. `.claude/settings.json` (machine-enforced permissions)*
*3. `.claude/hooks/` (automated checks on every tool call)*
*4. `.claude/agents/pr-reviewer.md` (PR review enforcement)*
*Last updated: Foundation — Phase 0*
