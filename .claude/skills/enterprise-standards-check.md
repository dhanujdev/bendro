---
name: enterprise-standards-check
description: >
  Comprehensive engineering standards gate for bendro. Run before any PR is
  submitted. Enforces: TS naming conventions, JSDoc on exported symbols,
  file/function/component size limits, design patterns (service + data
  adapter + pose single-boundary), security invariants, user-scoping, test
  coverage, and OpenAPI contract presence. Outputs a PASS/FAIL checklist.
---

# Skill: enterprise-standards-check

Run this skill before submitting any pull request. It is a complete gate that
covers all engineering standards defined in `docs/STANDARDS.md`, `CLAUDE.md`,
and the ADR set.

## Command

```bash
pnpm typecheck && pnpm lint && pnpm test
# plus the manual sections below
```

---

## Section 1 — Naming Conventions

### TypeScript
```bash
# Fail on explicit any (exception: test files and .d.ts)
grep -rn ": any\b" src/ --include="*.ts" --include="*.tsx" | grep -v ".d.ts" | grep -v "\.test\." | grep -v "\.spec\."
```

Expected: **0 `any` types outside tests**, justified with a `// eslint-disable-next-line` + comment if unavoidable.

Rules:
- [ ] TS files in `src/lib/`, `src/services/`, `src/config/`: `kebab-case.ts`
- [ ] React components: `PascalCase.tsx`
- [ ] Zod schemas: `XxxSchema` or `xxxSchema` (end in `Schema`)
- [ ] Hooks: `useXxx`
- [ ] Drizzle table objects: `lowercasePlural` (`users`, `sessions`, `routines`)
- [ ] Service modules export functions in `camelCase` with verbs (`createSession`, `listRoutines`)
- [ ] All exported functions, classes, interfaces, and type aliases have JSDoc
- [ ] Non-trivial functions have explicit return types

---

## Section 2 — Code Size Limits

```bash
# Files over 300 lines
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs wc -l | awk '$1 > 300 {print $0}' | sort -rn | head -20

# React components over 200 lines
find src/ -type f -name "*.tsx" | xargs wc -l | awk '$1 > 200 {print $0}' | sort -rn | head -20
```

Expected:
- [ ] 0 functions over 50 lines
- [ ] 0 files over 300 lines
- [ ] 0 components over 200 lines

If a file is over, split it: components into sub-components under `_components/`, services into cohesive sibling modules, libs into folders.

---

## Section 3 — Design Pattern Enforcement

### Service Layer (Business Logic Only in src/services/*)
```bash
# Route handlers must not import drizzle or db
grep -rn "from 'drizzle-orm'\|from '@/db'\|from '../db'" src/app/ --include="*.ts" --include="*.tsx"
```
Expected: **0 matches** (route handlers delegate to services).

```bash
# Business logic must not live in React components
grep -rn "from '@/db'" src/components/ src/app/ --include="*.tsx"
```
Expected: **0 matches**.

### Data Adapter Boundary
```bash
# No env branching in callers — only src/lib/data.ts decides mock vs DB
grep -rn "process.env.DATABASE_URL" src/ --include="*.ts" --include="*.tsx" | grep -v "src/lib/data.ts\|src/config/env.ts\|src/db/"
```
Expected: **0 matches outside src/lib/data.ts, src/config/env.ts, src/db/**.

### Pose Single Boundary
```bash
# MediaPipe / Kalidokit / VRM only in src/lib/pose/** or src/app/player/camera/_components/**
grep -rn "@mediapipe/\|kalidokit\|@pixiv/three-vrm" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "src/lib/pose/\|src/app/player/camera/_components/"
```
Expected: **0 matches outside allowed paths**.

### Stripe Single Boundary (when Phase 9 lands)
```bash
grep -rn "from 'stripe'" src/ --include="*.ts" | grep -v "src/services/billing.ts"
```
Expected: **0 matches outside src/services/billing.ts**.

### Env Reads
```bash
# process.env reads only in src/config/env.ts
grep -rn "process\.env\." src/ --include="*.ts" --include="*.tsx" | grep -v "src/config/env.ts"
```
Expected: near-zero — exceptions require a justifying comment.

---

## Section 4 — Security Invariants

```bash
# userId must come from the session, not the request body
grep -rn "body\.userId\|query\.userId\|params\.userId" src/app/api/ --include="*.ts"
```
Expected: **0 matches**.

```bash
# No logging of secrets / PII
grep -rn "console\.\(log\|info\|warn\|error\).*\(email\|password\|token\|stripeCustomerId\|sessionCookie\)" src/ --include="*.ts" --include="*.tsx"
```
Expected: **0 matches**.

```bash
# No sql.raw with user input — Drizzle parameterized queries only
grep -rn "sql\.raw(" src/ --include="*.ts"
```
Expected: **0 matches**, or each occurrence is allowlist-validated with a comment explaining why.

- [ ] Every query on user-scoped tables filters by `userId` from the NextAuth session
- [ ] No passwords, emails, tokens, Stripe IDs, or session cookies in log statements
- [ ] No hardcoded credentials — `detect-secrets scan` passes
- [ ] Stripe webhook handlers verify signature (Phase 9+)
- [ ] CORS is same-origin by default; no wildcard anywhere

---

## Section 5 — Documentation Completeness

```bash
# TS public exports without JSDoc (heuristic — spot check top matches)
grep -rn "^export " src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\.\|\.spec\." | head -30
```

- [ ] Every exported function, class, interface, and type in `src/` has JSDoc
- [ ] Complex components have a top-of-file JSDoc explaining purpose + props
- [ ] Inline comments explain WHY for any non-obvious logic
- [ ] CHANGELOG.md ## [Unreleased] is updated
- [ ] docs/architecture/ diagrams updated if module boundaries changed

---

## Section 6 — Test Coverage

```bash
# Vitest with coverage (configure in vite.config.ts / vitest.config.ts)
pnpm test -- --coverage

# Gherkin features exist where user-facing behavior was added
ls tests/features/
```

- [ ] Vitest coverage ≥ 85% on files in src/services/ and src/lib/
- [ ] Each new user-facing behavior has a Gherkin `.feature`
- [ ] Each feature has happy path + at least one error path + (if authenticated) auth failure
- [ ] Phase 14+: Playwright E2E tests for key flows

---

## Section 7 — Contract Compliance

```bash
# OpenAPI spec exists
test -f docs/specs/openapi/v1/bendro.yaml && echo OK || echo MISSING

# Lint the spec
npx @redocly/cli lint docs/specs/openapi/v1/bendro.yaml

# Every route handler has a matching path entry
for f in $(find src/app/api -name route.ts); do
  # Derive expected path, e.g., src/app/api/sessions/route.ts → /api/sessions
  route=$(echo "$f" | sed 's|src/app||; s|/route\.ts$||')
  grep -q "^\s*${route}:\s*$" docs/specs/openapi/v1/bendro.yaml || echo "MISSING spec entry for ${route}"
done
```

- [ ] `docs/specs/openapi/v1/bendro.yaml` exists and lints clean
- [ ] Every `src/app/api/**/route.ts` has a matching path entry in the spec
- [ ] Request/response Zod schemas match the OpenAPI schema shapes

---

## Section 8 — User Scoping (Cross-User Isolation)

```bash
# Search for service functions that accept a userId param — should be most of them
grep -rn "userId: string\|userId: User\['id'\]" src/services/ --include="*.ts"
```

- [ ] Every service function that reads or writes user-owned data takes a `userId` argument and uses it in the query
- [ ] Cross-user reads return `null` from the service, which the route maps to 404
- [ ] `userId` passed to services comes from `requireSession()` — never from request body

---

## Output Format

After running all sections, output:

```
ENTERPRISE STANDARDS CHECK — Bendro
====================================
Naming Conventions:    PASS / FAIL (N violations)
Code Size Limits:      PASS / FAIL (N violations)
Design Patterns:       PASS / FAIL (N violations)
Security:              PASS / FAIL (N violations)
Documentation:         PASS / FAIL (N violations)
Test Coverage:         PASS / FAIL (N% — need 85%)
Contracts:             PASS / FAIL (N missing spec entries)
User Scoping:          PASS / FAIL (N violations)

OVERALL: PASS / FAIL
If FAIL: PR submission is BLOCKED until all failures are resolved.
```

See `docs/STANDARDS.md` for the full standards reference.
