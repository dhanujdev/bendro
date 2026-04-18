# Command: check-phase

**Usage:** `/check-phase`

Runs the phase closeout checklist for the current phase.
**Reports status only — does NOT automatically close the phase.**

## What This Command Does

1. Reads `docs/AGENT_MEMORY.md` to determine current phase
2. Reads `docs/PHASE_TEMPLATES.md` for current phase deliverables and exit criteria
3. For each deliverable: checks if implemented (reads file, checks tests)
4. Runs quality gates:
   ```bash
   make check          # lint + typecheck + test-unit + contract-lint
   make test-bdd       # BDD scenarios
   make security-scan  # security gates
   ```
5. Checks documentation completeness
6. Outputs a structured status report

## Status Report Format
```
=== Phase {N} Progress Report ===
Date: {YYYY-MM-DD}

DELIVERABLES:
  ✓ {deliverable 1} — implemented, tests passing
  ✓ {deliverable 2} — implemented, tests passing
  ✗ {deliverable 3} — NOT complete: {reason}
  ⚠ {deliverable 4} — stubbed only: {file path}

QUALITY GATES:
  ✓ lint: passed
  ✓ typecheck: passed
  ✗ test-bdd: 2 failing scenarios (auth/rbac.feature:45)
  ✓ security-scan: passed (0 high/critical)

DOCUMENTATION:
  ✓ EXECUTION_LOG.md: up to date
  ✗ er-diagram.md: not updated after last schema change
  ✓ CHANGELOG.md: current

PHASE EXIT STATUS: NOT READY
Blocking items:
  1. {deliverable 3} incomplete
  2. BDD scenario failing at auth/rbac.feature:45
  3. er-diagram.md needs update

Run /check-phase again after addressing these items.
When all items show ✓, invoke phase-closeout skill.
```

## Note
This command provides a status snapshot — it does not modify any files.
To officially close a phase, invoke the `phase-closeout` skill.
