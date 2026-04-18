# Command: status

**Usage:** `/status`

Quick project status report. Run at the start of every session.

## What This Command Does

1. Reads `docs/AGENT_MEMORY.md` (current phase, tech stack summary)
2. Reads `docs/SESSION_HANDOFF.md` (last session state)
3. Reads `docs/BLOCKERS.md` (active blockers)
4. Reads `docs/NEXT_STEPS.md` (what to do next)
5. Runs: `git status` and `git log --oneline -5`
6. Outputs a structured status report

## Status Report Format
```
=== Creator OS — Project Status ===
Date: {YYYY-MM-DD HH:MM UTC}

PHASE:
  Current: Phase {N} — {phase name}
  Step:    {specific step within phase}
  Lead:    {agent-name} ({model})

PROGRESS (last 5 commits):
  {git log --oneline -5 output}

ACTIVE BLOCKERS:
  B-{NNN}: {description} — {impact}
  (none if no active blockers)

NEXT ACTION:
  {first action from NEXT_STEPS.md}
  Agent: {agent-name}

GIT STATUS:
  Branch: {current branch}
  Staged:   {N} files
  Modified: {N} files  
  Untracked: {N} files

LAST SESSION:
  {last entry from SESSION_HANDOFF.md}

QUICK COMMANDS:
  /new-phase {N+1}     → Start next phase
  /check-phase         → Verify current phase progress
  /review-pr {branch}  → Run PR review
  /security-report     → Run security scan and show findings
```

## When to Use
- At the start of every new Claude Code session
- After context switches (coming back to the project)
- When unsure what to work on next
- To confirm current branch and git state before major operations
