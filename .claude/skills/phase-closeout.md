---
name: phase-closeout
description: >
  End-of-phase ritual for bendro. Runs typecheck/lint/test/audit, confirms
  every deliverable in docs/PHASES.md is checked off, updates CHANGELOG
  and AGENT_MEMORY to the next phase, clears or carries forward blockers,
  and commits a single phase-closeout commit.
---

# Skill: phase-closeout

Invoke when a phase (from the 16-phase model in CLAUDE.md §12) is complete.
All items in the checklist must be ✓ before the phase is considered done.

## Pre-Conditions
- `session-handoff` skill was invoked at the end of the last session
- All phase deliverables listed in `docs/PHASES.md` for this phase are implemented and tested

## Step 1: Verify Deliverables
For each deliverable listed in `docs/PHASES.md` for this phase:
```
[ ] Confirmed implemented (not just stubbed)
[ ] Has unit tests (Vitest, ≥ 85% for business logic in src/services/*)
[ ] Has Gherkin .feature file for user-facing behavior
[ ] Has JSDoc on exported functions, types, and components
[ ] Architecture diagrams updated if module boundaries changed (architecture-diagram-update skill)
```

## Step 2: Quality Gate
```bash
pnpm typecheck              # tsc --noEmit
pnpm lint                   # eslint
pnpm test                   # vitest run
pnpm audit --audit-level=high   # dependency audit (fail on high/critical)
# Phase 14+: pnpm exec playwright test
```

All commands must exit with code 0.
If any fail, the phase is NOT complete — fix before proceeding.

## Step 3: Documentation Completeness
```
[ ] docs/PHASES.md — phase deliverables marked as complete (✓)
[ ] docs/EXECUTION_LOG.md — phase summary entry added
[ ] docs/architecture/*.md — Mermaid diagrams reflect current state
[ ] docs/ADR/*.md — any decisions made during the phase are filed
[ ] CHANGELOG.md — ## [Unreleased] section lists the phase work, grouped by type
[ ] docs/BLOCKERS.md — all phase blockers resolved OR explicitly carried forward with new deadline
[ ] docs/AGENT_MEMORY.md — phase field updated to N+1, blockers current, current step reset
[ ] docs/SESSION_HANDOFF.md — reflects the "just-finished" state so the next session opens cleanly
```

## Step 4: Next Phase Entry Criteria
Explicitly document in `docs/NEXT_STEPS.md`:
- What must exist (files, routes, schema, env vars) before the next phase can start
- Which agent leads the next phase (from CLAUDE.md §12 table)
- Which skill to invoke first at the start of the next phase

## Step 5: Git Tag
```bash
git tag -a phase/{N}-complete -m "Phase {N} complete: {one-line summary of what was built}"
git push origin phase/{N}-complete
```

## Step 6: Update AGENT_MEMORY.md
```yaml
current_state:
  phase: {N+1}-{phase-name}
  step: "Phase {N+1} kickoff"
  lead_agent: {next-phase-lead}
  last_session: {YYYY-MM-DD}
```

## Step 7: Commit Everything
```bash
git add docs/ CHANGELOG.md
git commit -m "chore(docs): phase {N} closeout - {summary}"
```

## Phase Completion Certificate (append to EXECUTION_LOG.md)
```markdown
## Phase {N} Complete — {date}
Deliverables: {N}/{N} complete
Tests: vitest {X} passed, gherkin {X} features passing, (Phase 14+) playwright {X} passed
Quality gates: typecheck OK, lint OK, audit 0 high/critical
Coverage: src/services/ {X}%, src/lib/ {X}%
Duration: {sessions} sessions, ~{hours} hours
Blockers resolved: {N}
ADRs written: {list ADR numbers}
Tag: phase/{N}-complete
Entry criteria for Phase {N+1}: {description}
```
