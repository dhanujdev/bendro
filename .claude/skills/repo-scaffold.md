---
name: repo-scaffold
description: >
  Bootstraps a new module in bendro — a service, a schema entity, or a route
  group. Generates the OpenAPI stub, the Gherkin feature stub, the failing
  Vitest test, and the implementation file with TODOs. Use to maintain the
  contract-first → BDD → failing test → implementation sequence.
---

# Skill: repo-scaffold

Invoke when introducing a new module:
- New service file in `src/services/`
- New schema entity (table) in `src/db/schema.ts`
- New route group / page tree under `src/app/`
- New API route under `src/app/api/`

Generates the four artifacts required by the development order in CLAUDE.md §4.

## Expected Directory Structure (verify or create)

```bash
check_dirs=(
  "src/app/(marketing)"
  "src/app/(app)"
  "src/app/onboarding"
  "src/app/player"
  "src/app/api/routines"
  "src/app/api/sessions"
  "src/app/api/stretches"
  "src/app/api/progress"
  "src/components/ui"
  "src/config"
  "src/db"
  "src/lib/pose"
  "src/services"
  "src/types"
  "docs/ADR"
  "docs/architecture"
  "docs/specs/openapi/v1"
  "docs/specs/webhooks"
  "tests/features"
  "tests/unit"
  ".claude/agents"
  ".claude/skills"
  ".claude/hooks"
  ".claude/commands"
  ".claude/rules"
  ".github/workflows"
)

for dir in "${check_dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "MISSING: $dir"
    mkdir -p "$dir"
    echo "CREATED: $dir"
  else
    echo "OK: $dir"
  fi
done
```

## Artifact 1 — OpenAPI Path Stub
For a new API route `src/app/api/{resource}/route.ts`, add an entry to
`docs/specs/openapi/v1/bendro.yaml`:

```yaml
paths:
  /api/{resource}:
    post:
      operationId: create{Resource}
      summary: TODO
      description: |
        TODO — write what this endpoint does, who can call it, and the
        key side effects.
      security:
        - sessionCookie: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Create{Resource}Request' }
      responses:
        '201': { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/{Resource}Response' } } } }
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '422': { $ref: '#/components/responses/ValidationError' }
```

Commit: `docs(contracts): add stub path for /api/{resource}`

## Artifact 2 — Gherkin Feature Stub
Create `tests/features/{domain}/{feature}.feature`:

```gherkin
Feature: {Feature Title}
  As a signed-in user
  I want to {concrete action}
  So that {business benefit}

  Scenario: Happy path — TODO
    Given I am signed in as "user-test-001"
    When I TODO
    Then the response status is 201
    And TODO

  Scenario: Reject invalid input
    Given I am signed in as "user-test-001"
    When I TODO with invalid body
    Then the response status is 422

  Scenario: Unauthenticated request is rejected
    Given I am not signed in
    When I TODO
    Then the response status is 401
```

Commit: `test(bdd): add failing scenarios for {feature} — RED phase`

## Artifact 3 — Failing Vitest Test
Create `tests/unit/services/{service}.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { create{Resource} } from '@/services/{service}'

describe('create{Resource}', () => {
  it('creates a {resource} for the signed-in user', async () => {
    // TODO — Arrange
    // TODO — Act
    // TODO — Assert
    throw new Error('Not implemented — RED phase')
  })
})
```

Run it once to confirm RED:
```bash
pnpm test tests/unit/services/{service}.test.ts
# Expected: FAIL
```

Commit: `test({service}): add failing unit test for create{Resource} — RED`

## Artifact 4 — Implementation Skeleton
Create `src/services/{service}.ts`:

```typescript
import { z } from 'zod'
import { getData } from '@/lib/data'

/**
 * Input shape for create{Resource}. Validated at the route boundary.
 */
export const Create{Resource}Schema = z.object({
  // TODO — define fields matching OpenAPI request schema
})

export type Create{Resource}Input = z.infer<typeof Create{Resource}Schema>

/**
 * Creates a {resource} owned by the given user.
 *
 * @param userId - ID from the NextAuth session (never from request body).
 * @param input - Validated input matching Create{Resource}Schema.
 */
export async function create{Resource}(
  userId: string,
  input: Create{Resource}Input,
): Promise<never> {
  // TODO — implement via src/lib/data.ts (mock ↔ Drizzle adapter)
  throw new Error('Not implemented')
}
```

And the route handler `src/app/api/{resource}/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Create{Resource}Schema, create{Resource} } from '@/services/{service}'
// import { requireSession } from '@/lib/auth' // once Phase 3 lands

/**
 * POST /api/{resource}
 */
export async function POST(request: NextRequest) {
  // const session = await requireSession()
  // const userId = session.user.id
  const userId = 'TODO-session-user-id'

  const parsed = Create{Resource}Schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 422 },
    )
  }

  const result = await create{Resource}(userId, parsed.data)
  return NextResponse.json({ data: result }, { status: 201 })
}
```

Commit (after the failing test passes GREEN): `feat({service}): implement create{Resource}`

## Required Root Files (verify)
```
CLAUDE.md
AGENTS.md
CHANGELOG.md
README.md
package.json
tsconfig.json
next.config.ts
drizzle.config.ts
.env.example
.gitignore
```

## Required .claude/ Files
```
.claude/settings.json
.claude/agents/*
.claude/skills/*   (13 skills)
.claude/rules/*    (SYSTEM, ARCHITECTURE, SECURITY, HEALTH)
.claude/hooks/*
.claude/commands/*
```

## Required docs/ Files
```
docs/PHASES.md
docs/AGENT_MEMORY.md
docs/EXECUTION_LOG.md
docs/SESSION_HANDOFF.md
docs/DECISIONS.md
docs/BLOCKERS.md
docs/NEXT_STEPS.md
docs/STANDARDS.md
docs/ADR/*
docs/specs/openapi/v1/bendro.yaml
docs/architecture/*
```

## Verification Command
```bash
echo "Skills:   $(ls .claude/skills/*.md 2>/dev/null | wc -l) (expected 13)"
echo "Rules:    $(ls .claude/rules/*.md 2>/dev/null | wc -l) (expected 4)"
echo "ADRs:     $(ls docs/ADR/*.md 2>/dev/null | wc -l)"
echo "Diagrams: $(ls docs/architecture/*.md 2>/dev/null | wc -l)"
echo "Services: $(ls src/services/*.ts 2>/dev/null | wc -l)"
```
