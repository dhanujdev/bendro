# Skill: phase-closeout

Invoke when a phase (mega-session) is complete.
All items in the checklist must be ✓ before the phase is considered done.

## Pre-Conditions
- session-handoff skill was invoked at the end of the last session
- All phase deliverables from docs/PHASE_TEMPLATES.md are implemented and tested

## Step 1: Verify Deliverables
For each deliverable listed in docs/PHASE_TEMPLATES.md for this phase:
```
[ ] Confirmed implemented (not just stubbed)
[ ] Has unit tests (≥ 85% coverage for business logic)
[ ] Has BDD/integration tests for user-facing behavior
[ ] Has docstrings/JSDoc on public APIs
[ ] Has architecture diagrams updated (if boundaries changed)
```

## Step 2: Quality Gate
```bash
make check              # lint + typecheck + contract-lint + test-unit
make test-bdd           # BDD scenarios pass
make test-integration   # integration tests pass (requires DB)
make security-scan      # all 4 security gates pass
```

All commands must exit with code 0.
If any fail, the phase is NOT complete — fix before proceeding.

## Step 3: Documentation Completeness
```
[ ] docs/IMPLEMENTATION_PLAN.md — phase deliverables marked as complete (✓)
[ ] docs/EXECUTION_LOG.md — phase summary entry added
[ ] docs/ARCHITECTURE.md — updated if architecture changed
[ ] docs/architecture/*.md — all Mermaid diagrams current
[ ] docs/ADR/*.md — any decisions made during phase are documented
[ ] CHANGELOG.md — ## [Unreleased] section has phase work listed
[ ] docs/BLOCKERS.md — all phase blockers resolved or handed off
[ ] docs/AGENT_MEMORY.md — phase updated to N+1, blockers current
```

## Step 4: Next Phase Entry Criteria
Explicitly document in docs/NEXT_STEPS.md:
- What must exist (files, endpoints, schema) before next phase can start
- Which agent leads the next phase
- Which skill to invoke at the start of next phase

## Step 5: Git Tag
```bash
# Create annotated tag for phase completion
git tag -a phase/{N}-complete -m "Phase {N} complete: {one-line summary of what was built}"
git push origin phase/{N}-complete
```

## Step 6: Update AGENT_MEMORY.md
```yaml
## Current State
phase: {N+1}-{phase-name}
step: "Phase {N+1} kickoff"
lead_agent: {next-phase-lead}
last_session: {YYYY-MM-DD}
```

## Step 7: Commit Everything
```bash
git add .
git commit -m "chore(docs): phase {N} closeout - {summary}"
```

## Phase Completion Certificate (output to EXECUTION_LOG.md)
```markdown
## Phase {N} Complete — {date}
Deliverables: {N}/{N} complete
Tests: pytest {X} passed, vitest {X} passed, behave {X} passed
Security: All 4 gates passed
Coverage: business logic {X}%, repositories {X}%
Duration: {sessions} sessions, ~{hours} hours
Blockers resolved: {N}
ADRs written: {list ADR numbers}
Tag: phase/{N}-complete
Entry criteria for Phase {N+1}: [description]
```
