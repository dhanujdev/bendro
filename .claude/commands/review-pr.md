# Command: review-pr

**Usage:** `/review-pr {branch-name}`

Invoke the pr-reviewer agent (claude-opus-4-6) to perform a full PR review.
Output is always one of: **APPROVED** | **CHANGES REQUESTED** | **BLOCKED**

## What This Command Does

1. Spawns the pr-reviewer agent (model: claude-opus-4-6)
2. Agent runs:
   ```bash
   git diff main...{branch}     # get all changed files
   git log --oneline main...{branch}  # check commit order for TDD compliance
   ```
3. Agent reads every changed file in full (not just the diff)
4. Agent runs security scan on changed Python files:
   ```bash
   bandit -r {changed-python-files} -ll
   detect-secrets scan --baseline .secrets.baseline
   ```
5. Agent runs the full PR review checklist:
   - Contract compliance (OpenAPI spec exists and matches implementation)
   - BDD/TDD compliance (scenarios + failing tests committed before implementation)
   - Security gates (SAST, secrets, dependency audit)
   - Design patterns (Repository, Adapter, no logic in handlers)
   - Code readability (JSDoc, docstrings, comments)
   - Architecture invariants (LangGraph boundary, model_router, etc.)
   - Documentation (CHANGELOG, diagrams, ADRs)
6. Outputs structured review report (see pr-reviewer.md for format)
7. Appends results to docs/EXECUTION_LOG.md

## Verdict Outcomes
- **APPROVED**: All gates pass. PR can merge after CI checks pass.
- **CHANGES REQUESTED**: Quality/standards issues. Author must address all items and re-request review.
- **BLOCKED**: Security violation or architecture invariant violation. Security-lead or architect must be consulted. PR cannot merge until fully resolved.

## Example
```
/review-pr feat/COS-042-workflow-run-api

→ pr-reviewer agent:
  Reading 12 changed files...
  Checking git log for TDD compliance...
  Running bandit on services/api/src/routes/workflow_runs.py...
  
  ## PR Review: feat/COS-042-workflow-run-api → main
  Verdict: CHANGES REQUESTED

  🔴 BLOCKERS: none

  🟡 CHANGES REQUESTED:
  - [BDD] tests/features/workflows/workflow_run.feature — Missing authorization failure scenario
  - [READABILITY] services/api/src/services/workflow_run_service.py:45 — Missing docstring on WorkflowRunService class
  - [PATTERNS] services/api/src/routes/workflow_runs.py:23 — Business logic found in route handler (move to service layer)

  Required Actions:
  1. Add auth failure scenario to workflow_run.feature
  2. Add class docstring to WorkflowRunService  
  3. Move lines 23-31 of workflow_runs.py to WorkflowRunService.start()
```

## After a BLOCKED Review
1. Notify security-lead or architect agent
2. Do not merge or rebase until the block is resolved
3. Once resolved, run `/review-pr {branch}` again to confirm APPROVED
