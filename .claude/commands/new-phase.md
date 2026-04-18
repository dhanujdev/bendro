# Command: new-phase

**Usage:** `/new-phase {N}`

Start a new phase mega-session. Loads phase-specific context and spawns the lead agent.

## What This Command Does

1. Reads `docs/SESSION_HANDOFF.md` — understand where the last session ended
2. Reads `docs/AGENT_MEMORY.md` — shared context
3. Reads `docs/BLOCKERS.md` — confirm no active P0 blockers blocking this phase
4. Reads `docs/PHASE_TEMPLATES.md` Phase {N} definition — entry criteria, deliverables, exit criteria
5. Verifies entry criteria are met (phase cannot start if prior phase has unmet deliverables)
6. Identifies the lead agent for Phase {N} and invokes it with full context
7. Creates a new entry in `docs/EXECUTION_LOG.md` for this phase session
8. Prints the phase kickoff brief

## Phase Kickoff Brief Format
```
=== Phase {N}: {Phase Name} ===
Lead Agent: {agent-name} (claude-opus-4-6 | default)
Entry Criteria: [STATUS: MET / NOT MET]
  ✓ {criterion 1}
  ✓ {criterion 2}
  ✗ {criterion 3 — BLOCKER}

Deliverables This Phase:
  [ ] {deliverable 1}
  [ ] {deliverable 2}
  [ ] {deliverable 3}

First Action: {specific first task to do}
Skills to Invoke: {list of skills needed for this phase}

Exit Criteria:
  [ ] {criterion 1}
  [ ] {criterion 2}
```

## Session Start Protocol (Every Phase)
After displaying the kickoff brief:
1. Read CLAUDE.md
2. Read docs/AGENT_MEMORY.md
3. Invoke `repo-scaffold` skill to verify directory structure
4. Begin first deliverable following the CLAUDE.md development order:
   contract-first → bdd-scenario-write → TDD → implement → document

## Error Cases
- If entry criteria are NOT met: display blockers and stop (do not begin phase work)
- If Phase {N} template not found in PHASE_TEMPLATES.md: display error and ask for clarification
- If Phase {N} is already tagged as complete (`git tag phase/{N}-complete`): confirm intent to re-open
