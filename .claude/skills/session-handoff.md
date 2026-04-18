---
name: session-handoff
description: >
  End-of-session ritual for bendro. MANDATORY. Updates SESSION_HANDOFF,
  AGENT_MEMORY, BLOCKERS, DECISIONS, EXECUTION_LOG, and the [Unreleased]
  section of CHANGELOG. Closes with a single commit:
  `chore(docs): session N handoff - <summary>`.
---

# Skill: session-handoff

**MANDATORY at the end of every working session. Non-negotiable.**
The docs are the memory. Chat history is not. If it isn't in the docs, it doesn't exist next session.

## Trigger
- End of any session (planned or forced)
- Before switching context to a different major task
- After completing a phase (follow with the `phase-closeout` skill)

## Step-by-Step Execution

### 1. docs/EXECUTION_LOG.md (APPEND — never overwrite)
Add a new session entry:
```markdown
---
## Session {N} — {YYYY-MM-DD}
**Agent:** {agent-name}
**Phase:** {current phase from CLAUDE.md §12}
**Duration:** {estimate}

### Completed
- {Specific task completed with file paths}
- {Another task}

### Files Created or Modified
- {src/path/to/file.ts} — {one-line description of what changed}

### Tests Run
- vitest: {X} passed, {Y} failed, {Z} skipped
- gherkin features: {X} passing
- (Phase 14+) playwright: {X} passed, {Y} failed

### Decisions Made
- {Decision 1 — reference ADR-NNNN or DECISIONS.md entry}
---
```

### 2. docs/SESSION_HANDOFF.md (OVERWRITE — living document)
```markdown
# Session Handoff

**Date:** {YYYY-MM-DD}
**Current Phase:** {N} — {phase name}
**Current Step:** {specific step within the phase}
**Lead Agent:** {agent-name}

## What Works Right Now
- {Route, service, or component that is fully operational}
- {Test suite that passes}

## What Is Stubbed / Incomplete
- {Feature X} — stub in {src/path}, needs {what}
- {Feature Y} — Gherkin + failing test written, implementation pending

## Active Branches
- `{branch-name}`: {what it contains}

## Environment Setup for Next Session
\`\`\`bash
# Node + pnpm
node --version   # 20+
pnpm --version   # 9+

# Install (only if dependencies changed)
pnpm install

# DB path (one of):
# (a) mock — leave DATABASE_URL unset; src/lib/data.ts uses the in-memory mock
# (b) local or Neon — set DATABASE_URL in .env.local, then:
pnpm db:migrate
pnpm db:seed

# Dev server
pnpm dev
\`\`\`

## What NOT to Touch
- {File or system that is deliberately in a specific state}
```

### 3. docs/NEXT_STEPS.md (OVERWRITE)
```markdown
# Next Steps

## First Thing Next Session
{Single most important action — be specific: file path, what to change, which skill to invoke}

## Then (in priority order)
1. {Action} — Agent: {agent-name} — Skill: {skill if applicable}
2. {Action} — Agent: {agent-name}
3. {Action} — Agent: {agent-name}
4. {Action} — Agent: {agent-name}
5. {Action} — Agent: {agent-name}

## Upcoming Phase Gates
- Phase {N} exits when: {specific exit criteria from docs/PHASES.md}
- Phase {N+1} starts when: {specific entry criteria}
```

### 4. docs/BLOCKERS.md (UPDATE — manage the list, don't overwrite)
For each NEW blocker discovered this session, add a row:
```markdown
| B-{NNN} | {description} | {impact} | {what unblocks it} | {date added} |
```
For each RESOLVED blocker, update the status to Resolved with a date.

### 5. docs/DECISIONS.md (APPEND)
Add session-level decisions that don't warrant a full ADR:
```markdown
| {date} | {decision} | {reason} | {agent} |
```

### 6. docs/AGENT_MEMORY.md (UPDATE if phase or major context changed)
Update the Current State section when:
- Phase changed
- A new ADR was accepted
- The active blocker list changed
- A stack piece was added/removed (e.g., NextAuth wired up, Stripe added)

### 7. CHANGELOG.md (APPEND to ## [Unreleased])
Under Keep-a-Changelog groupings (Added / Changed / Fixed / Security / Deprecated / Removed):
```markdown
### Added
- {One-line user-visible change} — {short scope}

### Fixed
- {Bug or regression that was addressed}
```

## Git Commit After Handoff
```bash
git add docs/ CHANGELOG.md
git commit -m "chore(docs): session {N} handoff - {one-line summary}"
```

## Verification
Confirm before closing the session:
```
[ ] EXECUTION_LOG.md has a new entry for this session
[ ] SESSION_HANDOFF.md reflects the current state accurately
[ ] NEXT_STEPS.md has a concrete first action for the next session
[ ] BLOCKERS.md is current (new added, resolved marked)
[ ] AGENT_MEMORY.md phase + blockers are current
[ ] CHANGELOG.md [Unreleased] has the session's user-visible changes
[ ] All doc changes committed to git
```
