# Skill: session-handoff

**MANDATORY at the end of every working session. Non-negotiable.**
The docs are the memory. Chat history is not. If it isn't in the docs, it doesn't exist next session.

## Trigger
- End of any session (whether planned or forced)
- Before switching context to a different major task
- After completing a phase (follow with phase-closeout skill)

## Step-by-Step Execution

### 1. docs/EXECUTION_LOG.md (APPEND — never overwrite)
Add a new session entry:
```markdown
---
## Session {N} — {YYYY-MM-DD}
**Agent:** {agent-name}
**Phase:** {current phase}
**Duration:** {estimate}

### Completed
- {Specific task completed with file paths}
- {Another task}

### Files Created or Modified
- {path/to/file.py} — {one-line description of what changed}

### Tests Run
- pytest: {X} passed, {Y} failed, {Z} skipped
- vitest: {X} passed, {Y} failed
- behave: {X} passed, {Y} failed

### Decisions Made
- {Decision 1 — reference ADR or DECISIONS.md entry}
---
```

### 2. docs/SESSION_HANDOFF.md (OVERWRITE — this is a living document)
```markdown
# Session Handoff

**Date:** {YYYY-MM-DD}
**Current Phase:** {N} — {phase name}
**Current Step:** {specific step within phase}
**Lead Agent:** {agent-name}

## What Works Right Now
- {Service or feature that is fully operational}
- {Test suite that passes}

## What Is Stubbed / Incomplete
- {Feature X} — stub in {file path}, needs {what}
- {Feature Y} — skeleton only, tests written but not passing

## Active Branches
- `{branch-name}`: {what it contains}

## Environment Setup for Next Session
```bash
# Start local services (already running? check first)
docker ps | grep -E "postgres|minio"
# If not running:
docker-compose up -d

# Start dev servers
make dev
```

## What NOT to Touch
- {File or system that is deliberately in a specific state}
```

### 3. docs/NEXT_STEPS.md (OVERWRITE)
```markdown
# Next Steps

## First Thing Next Session
{Single most important action — be specific}

## Then (in priority order)
1. {Action} — Agent: {agent-name} — Skill: {skill if applicable}
2. {Action} — Agent: {agent-name}
3. {Action} — Agent: {agent-name}
4. {Action} — Agent: {agent-name}
5. {Action} — Agent: {agent-name}

## Upcoming Phase Gates
- Phase {N} exits when: {specific exit criteria}
- Phase {N+1} starts when: {specific entry criteria}
```

### 4. docs/BLOCKERS.md (UPDATE — don't overwrite, manage list)
For each NEW blocker discovered this session:
```markdown
| B-{NNN} | {description} | {impact on work} | {what is needed to unblock} | {date added} |
```
For each RESOLVED blocker: mark as Resolved with date.

### 5. docs/DECISIONS.md (APPEND new decisions)
Add session-level decisions that don't warrant a full ADR:
```markdown
| {date} | {decision} | {reason} | {agent} |
```

### 6. docs/AGENT_MEMORY.md (UPDATE if phase or major context changed)
Update the Current State section if:
- Phase changed
- New ADR was accepted
- Active blockers changed
- Tech stack changed

## Git Commit After Handoff
```bash
git add docs/
git commit -m "chore(docs): session {N} handoff - {one-line summary of what was accomplished}"
```

## Verification
Confirm before closing session:
```
[ ] EXECUTION_LOG.md has a new entry for this session
[ ] SESSION_HANDOFF.md reflects current state accurately
[ ] NEXT_STEPS.md has clear first action for next session
[ ] BLOCKERS.md is current (new blockers added, resolved blockers marked)
[ ] AGENT_MEMORY.md phase and blockers are current
[ ] All changes committed to git
```
