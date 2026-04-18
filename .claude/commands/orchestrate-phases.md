# Command: orchestrate-phases

**Usage:** `/orchestrate-phases [from_phase] [to_phase]`

**Examples:**
```
/orchestrate-phases           # runs from current phase to 21
/orchestrate-phases 13        # runs phase 13 through 21
/orchestrate-phases 13 15     # runs phases 13, 14, 15 only
/orchestrate-phases 13 13     # runs only phase 13
```

---

## What This Command Does

Runs the autonomous multi-agent phase orchestration loop. For each phase:
1. **Leads implement** — the defined lead agent(s) build the phase deliverables
2. **QA validates** — qa-lead runs tests, coverage, and BDD checks
3. **PR reviewer signs off** — pr-reviewer runs the full 24-item checklist
4. **Loop if needed** — if QA fails or PR reviewer requests changes, leads refine and we repeat (max 3 iterations)
5. **Phase closes out** — git commit, phase tag created, AGENT_MEMORY.md updated

No git push. All commits and tags stay local for your review.

---

## Instructions for Claude

When this command is invoked:

1. Parse the arguments:
   - `from_phase`: integer or read from `docs/AGENT_MEMORY.md` if not supplied
   - `to_phase`: integer, default 21

2. Run the orchestrator script:
   ```bash
   cd /Users/dhanujgumpella/creatorOS
   python3 .claude/scripts/phase_orchestrator.py --from-phase {from_phase} --to-phase {to_phase}
   ```

3. Stream output to the user as it runs. The script logs to stdout with timestamps.

4. When the script exits:
   - Exit code 0: report the completion summary from `.claude/checkpoints/summaries/`
   - Exit code 1: read `.claude/checkpoints/BLOCKED/` for the escalation file, report what needs human attention

5. After completion, run:
   ```bash
   cat docs/EXECUTION_LOG.md | tail -50
   ```
   to show the user the execution summary.

---

## Resuming After Escalation or Interruption

If the script was interrupted or escalated to human:
```bash
python3 .claude/scripts/phase_orchestrator.py --from-phase {N} --resume
```
The `--resume` flag reads `.claude/checkpoints/orchestration_state.json` and picks up exactly where it left off.

## Dry Run (see prompts without invoking agents)
```bash
python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --to-phase 13 --dry-run
```

## Verbose mode (detailed logging)
```bash
python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --verbose
```
