# Command: orchestrate

**Usage:** `/orchestrate {your request}`

**Alias:** `/o {request}`

This is the single entry point for ALL development work in this repository.
Describe what you want in plain English. The orchestrator will:
1. Classify the request (feature / bug / refactor / docs / infra / security)
2. Identify affected services, packages, and phases
3. Dispatch to the correct sequence of agents and skills
4. Follow the mandatory development order from CLAUDE.md Section 4
5. Maintain a checkpoint file so work can resume across sessions

---

## How the Orchestrator Thinks

When invoked, the orchestrator MUST:

### Step 1 — Session Checkpoint
```
Read: docs/SESSION_HANDOFF.md      (what was in progress)
Read: docs/BLOCKERS.md             (what is blocked)
Read: docs/AGENT_MEMORY.md         (current phase and stack)
Write: .claude/checkpoints/ACTIVE.md (checkpoint for THIS session)
```

### Step 2 — Classify the Request

| Request Type | Indicators | Primary Agent | Dispatch Path |
|---|---|---|---|
| New feature | "add", "implement", "build", "create" | Depends on domain (see below) | Full dev loop |
| Bug fix | "fix", "broken", "error", "wrong" | Relevant domain agent | Minimal fix path |
| Refactor | "refactor", "clean up", "reorganize" | Relevant domain agent | Refactor path |
| API endpoint | "endpoint", "route", "API" | backend-lead | Contract → BDD → implement |
| LangGraph workflow | "workflow", "graph", "node", "LangGraph" | orchestration-lead (Opus) | Workflow path |
| Auth/security | "auth", "JWT", "RBAC", "security", "permission" | security-lead (Opus) | Security path |
| Database/schema | "schema", "migration", "table", "column" | data-lead | Migration path |
| UI/Frontend | "page", "component", "UI", "app/web", "app/admin" | frontend-lead | UI path |
| Policy/budget | "policy", "budget", "limit", "moderation" | policy-lead | Policy path |
| Infrastructure | "docker", "CI", "deploy", "k8s", "config" | devops-lead | Infra path |
| Documentation | "docs", "diagram", "ADR", "spec", "README" | docs-lead | Docs path |
| Architecture decision | "should we", "decide", "ADR", "trade-off" | architect (Opus) | ADR path |

### Step 3 — Dispatch Paths

#### Full Dev Loop (new features)
```
1. Invoke: contract-first skill
   → Write/update OpenAPI or AsyncAPI spec
   → Commit spec before implementation
2. Invoke: bdd-scenario-write skill
   → Write Gherkin .feature file
   → Write stub step definitions (RED)
   → Commit failing tests
3. Implement (GREEN phase)
   → Write minimal implementation
   → Make tests pass
4. Refactor
   → Apply design patterns (Repository, Adapter, etc.)
   → Verify function/file size limits
5. Invoke: security-check skill (if security-sensitive)
6. Document
   → Docstrings/JSDoc on all public APIs
7. Invoke: architecture-diagram-update skill (if service boundaries changed)
8. Checkpoint: update .claude/checkpoints/ACTIVE.md
9. Invoke: enterprise-standards-check skill
10. Prepare PR
```

#### Minimal Fix Path (bug fixes)
```
1. Reproduce: write a failing test that captures the bug
2. Fix: minimal change to make test pass
3. Verify: no regression in existing tests
4. Document: inline comment explaining the fix and why
5. Invoke: security-check if fix touches auth/data access
6. Checkpoint
```

#### Workflow Path (LangGraph)
```
1. Invoke: langgraph-review skill
2. Invoke: contract-first (update workflow spec in docs/specs/workflows/)
3. Invoke: bdd-scenario-write
4. Implement node(s)
5. Unit test each node in isolation
6. Integration test the full graph
7. Update docs/architecture/workflow-graph.md
8. Checkpoint
```

#### Migration Path (database)
```
1. Invoke: db-migration-review skill
2. Write Prisma migration
3. Run migration locally
4. Update docs/architecture/er-diagram.md
5. Verify workspace_id on new tenant tables
6. Write integration test for new schema
7. Checkpoint
```

#### Security Path
```
1. Invoke: security-check skill (FIRST, before any code)
2. Invoke: contract-first (if new endpoint)
3. Implement with security invariants verified inline
4. Write security-specific tests (auth failure, unauthorized access, etc.)
5. Invoke: security-scan skill
6. Checkpoint
```

#### ADR Path
```
1. Invoke: create-adr skill
2. Document context, decision, consequences
3. Update DECISIONS.md
4. Update CLAUDE.md if new invariant is established
5. Update architecture diagrams if needed
6. Checkpoint
```

---

## Checkpoint System

Every dispatch path writes checkpoints to `.claude/checkpoints/`:

### Checkpoint Files
```
.claude/checkpoints/
├── ACTIVE.md          Current session state (overwritten each session)
├── COMPLETED/         Completed task checkpoints (archived)
│   └── {date}-{task}.md
└── BLOCKED/           Blocked task checkpoints
    └── {date}-{task}.md
```

### ACTIVE.md Format
```markdown
# Active Checkpoint
Date: {ISO date}
Session: {session number or description}
Request: {the original user request}
Classified as: {request type}
Assigned to: {agent/skill}
Phase: {current phase}

## Progress
- [x] Step 1: {completed step}
- [x] Step 2: {completed step}
- [ ] Step 3: {in progress step} ← CURRENT
- [ ] Step 4: {next step}

## Files Modified
- {file path}: {what changed and why}
- ...

## Tests Added/Modified
- {test file}: {what it tests}

## Blockers
- None

## Context for Next Session
{Key decisions made, why, and what the next session needs to know}

## Resume Instructions
{Exact steps for the next session to pick up from here}
```

### When to Write a Checkpoint
- After completing each major step (spec, failing tests, implementation, etc.)
- Before any long-running operation (test suite, security scan)
- Before context gets large (every ~30 tool calls)
- At session end (always — non-negotiable)

---

## Orchestrator Manifest

This manifest is auto-updated by the `sync-orchestrator.py` hook when agents, skills, or commands are added.

### Available Agents
<!-- AGENTS_START -->
- `planner` (claude-opus-4-6) — PRD → backlog, phases, BDD scenarios
- `architect` (claude-opus-4-6) — ADRs, service boundaries, design patterns
- `orchestration-lead` (claude-opus-4-6) — LangGraph, validators, model routing
- `security-lead` (claude-opus-4-6) — Auth, RBAC, SAST, content moderation
- `pr-reviewer` (claude-opus-4-6) — Full PR review against all standards
- `backend-lead` (default) — FastAPI, repositories, domain models
- `frontend-lead` (default) — Next.js, tRPC, components
- `policy-lead` (default) — Policy engine, feature flags, budget
- `data-lead` (default) — Schema, migrations, pgvector, multi-tenancy
- `qa-lead` (default) — BDD/TDD, coverage, LangSmith evaluation
- `devops-lead` (default) — CI/CD, Docker, infrastructure
- `docs-lead` (default) — Documentation, diagrams, changelog
<!-- AGENTS_END -->

### Available Skills
<!-- SKILLS_START -->
- `contract-first` — Write OpenAPI/AsyncAPI spec before implementation
- `bdd-scenario-write` — Write Gherkin scenarios and stub step definitions
- `langgraph-review` — Review/design LangGraph workflow graphs
- `db-migration-review` — Review Prisma schema changes and migrations
- `api-contract-review` — Review API endpoint contract compliance
- `security-check` — Pre-implementation security checklist
- `security-scan` — Run full security scan suite
- `architecture-diagram-update` — Update Mermaid architecture diagrams
- `enterprise-standards-check` — Full enterprise standards gate (pre-PR)
- `policy-check` — Review policy implications of new features
- `cost-tracking-check` — Review LLM cost implications
- `create-adr` — Create Architectural Decision Record
- `session-handoff` — End-of-session handoff (updates 6 docs)
- `phase-closeout` — Phase completion verification and git tag
- `repo-scaffold` — Initialize or verify directory structure
- `evaluation-run` — LangSmith evaluation suite
- `ui-smoke-test` — Playwright smoke tests
<!-- SKILLS_END -->

### Available Hooks
<!-- HOOKS_START -->
- `action-logger.py` — PostToolCall: logs every action to EXECUTION_LOG.md
- `pre-write-check.py` — PreToolCall: checks for missing docstrings, any types
- `contract-guard.py` — PreToolCall: blocks routes without OpenAPI spec
- `tdd-guard.py` — PreToolCall: warns when implementation written without tests
- `schema-changed.py` — PostToolCall: triggers db-migration-review reminder
- `post-migration.py` — PostToolCall: runs prisma generate, updates ER diagram
- `post-test.py` — PostToolCall: logs test results, flags coverage drops
- `diagram-changed.py` — PostToolCall: validates Mermaid syntax
- `pre-pr-gate.py` — PreToolCall(gh pr create): full enterprise standards gate
- `sync-orchestrator.py` — PostToolCall(Write .claude/**): syncs orchestrator manifest
<!-- HOOKS_END -->

---

## Usage Examples

```
/orchestrate Add a new API endpoint to list all artifacts for a workspace

/orchestrate Fix the bug where approvals can be resolved twice concurrently

/orchestrate Refactor the auth middleware to extract the Redis blocklist check into a separate service

/orchestrate Add OpenAI Whisper transcription support to the orchestrator

/orchestrate We need to decide whether to add rate limiting at the API gateway or in middleware — create an ADR

/orchestrate Add a Gherkin scenario for the case where a user tries to start a workflow but has exceeded their budget

/orchestrate The ER diagram needs to reflect the new refresh_tokens table

/orchestrate Run the full enterprise standards check on the current code
```

---

*This command manifest is automatically synced by `.claude/hooks/sync-orchestrator.py`*
*Last updated: 2026-04-06*
