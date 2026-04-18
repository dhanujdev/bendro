#!/usr/bin/env python3
"""Autonomous multi-agent phase orchestration engine for Creator OS.

Runs phases 13–21 (or a subset) by invoking lead agents, QA, and PR reviewer
in a loop until all sign off or the maximum iteration count is reached.

Usage:
    python3 .claude/scripts/phase_orchestrator.py --from-phase 13
    python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --to-phase 15
    python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --resume
    python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --dry-run
    python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --verbose

Exit codes:
    0  All phases completed and approved
    1  One or more phases escalated to human (see .claude/checkpoints/BLOCKED/)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKPOINTS = REPO_ROOT / ".claude" / "checkpoints"
AGENT_OUTPUTS = CHECKPOINTS / "agent_outputs"
SUMMARIES = CHECKPOINTS / "summaries"
BLOCKED_DIR = CHECKPOINTS / "BLOCKED"
STATE_FILE = CHECKPOINTS / "orchestration_state.json"
DECISIONS_LOG = CHECKPOINTS / "orchestration_decisions.md"
DEVIATIONS_LOG = CHECKPOINTS / "deviations.md"
ACTIVE_CHECKPOINT = CHECKPOINTS / "ACTIVE.md"
EXECUTION_LOG = REPO_ROOT / "docs" / "EXECUTION_LOG.md"
AGENT_MEMORY = REPO_ROOT / "docs" / "AGENT_MEMORY.md"

# Ensure all checkpoint dirs exist
for _d in [CHECKPOINTS, AGENT_OUTPUTS, SUMMARIES, BLOCKED_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Phase configuration registry
# ---------------------------------------------------------------------------

PHASE_CONFIG: dict[int, dict[str, Any]] = {
    13: {
        "name": "Content Moderation",
        "slug": "content-moderation",
        "strategy": "SEQUENTIAL",
        "primary_agent": "security-lead",
        "secondary_agent": "orchestration-lead",
        "model": "opus",
        "timeout": 1800,
        "expected_files": [
            "services/orchestrator/src/moderation/content_moderation_service.py",
            "services/orchestrator/src/moderation/__init__.py",
            "services/orchestrator/src/nodes/moderation_node.py",
            "packages/policy-engine/src/moderation.py",
            "tests/unit/python/test_content_moderation.py",
        ],
    },
    14: {
        "name": "Evaluation & Quality Gates",
        "slug": "evaluation-quality-gates",
        "strategy": "SEQUENTIAL",
        "primary_agent": "qa-lead",
        "secondary_agent": "orchestration-lead",
        "model": "haiku",
        "timeout": 1800,
        "expected_files": [
            "services/orchestrator/src/validators/quality_gate.py",
            "services/orchestrator/src/nodes/quality_gate_node.py",
            "tests/unit/python/test_quality_gates.py",
        ],
    },
    15: {
        "name": "Video Pipeline",
        "slug": "video-pipeline",
        "strategy": "SINGLE",
        "primary_agent": "devops-lead",
        "secondary_agent": None,
        "model": "haiku",
        "timeout": 1800,
        "expected_files": [
            "services/orchestrator/src/providers/transcription_adapter.py",
            "services/orchestrator/src/nodes/video_intake_node.py",
            "tests/unit/python/test_video_pipeline.py",
        ],
    },
    16: {
        "name": "Content Packaging",
        "slug": "content-packaging",
        "strategy": "SINGLE",
        "primary_agent": "orchestration-lead",
        "secondary_agent": None,
        "model": "opus",
        "timeout": 1800,
        "expected_files": [
            "services/orchestrator/src/nodes/packaging_node.py",
            "services/orchestrator/src/packaging/__init__.py",
            "tests/unit/python/test_content_packaging.py",
        ],
    },
    17: {
        "name": "Publishing Workflow",
        "slug": "publishing-workflow",
        "strategy": "SEQUENTIAL",
        "primary_agent": "backend-lead",
        "secondary_agent": "orchestration-lead",
        "model": "haiku",
        "timeout": 1800,
        "expected_files": [
            "services/api/src/routes/publishing.py",
            "services/orchestrator/src/nodes/publish_node.py",
            "services/orchestrator/src/providers/publishing_adapter.py",
            "tests/unit/python/test_publishing.py",
        ],
    },
    18: {
        "name": "Analytics Ingestion",
        "slug": "analytics-ingestion",
        "strategy": "SINGLE",
        "primary_agent": "backend-lead",
        "secondary_agent": None,
        "model": "haiku",
        "timeout": 1800,
        "expected_files": [
            "services/api/src/routes/analytics.py",
            "services/api/src/repositories/analytics_repository.py",
            "tests/unit/python/test_analytics.py",
        ],
    },
    19: {
        "name": "Self-Learning & Recommendations",
        "slug": "self-learning-recommendations",
        "strategy": "SINGLE",
        "primary_agent": "orchestration-lead",
        "secondary_agent": None,
        "model": "opus",
        "timeout": 1800,
        "expected_files": [
            "services/orchestrator/src/nodes/recommendation_node.py",
            "services/orchestrator/src/recommendations/__init__.py",
            "tests/unit/python/test_recommendations.py",
        ],
    },
    20: {
        "name": "CI/CD & Environment Promotion",
        "slug": "cicd-environment-promotion",
        "strategy": "SINGLE",
        "primary_agent": "devops-lead",
        "secondary_agent": None,
        "model": "haiku",
        "timeout": 1800,
        "expected_files": [
            ".github/workflows/ci.yml",
            ".github/workflows/deploy-staging.yml",
            "Makefile",
        ],
    },
    21: {
        "name": "Workflow Catalog Expansion",
        "slug": "workflow-catalog-expansion",
        "strategy": "SEQUENTIAL",
        "primary_agent": "orchestration-lead",
        "secondary_agent": "planner",
        "model": "opus",
        "timeout": 1800,
        "expected_files": [
            "services/orchestrator/src/graphs/social_calendar_graph.py",
            "services/orchestrator/src/graphs/video_script_graph.py",
            "docs/specs/workflows/social-calendar.yaml",
            "tests/unit/python/test_workflow_catalog.py",
        ],
    },
}

# ---------------------------------------------------------------------------
# Verbose flag (set by parse_args)
# ---------------------------------------------------------------------------

_VERBOSE = False


def _log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{ts}] {msg}"
    print(line, flush=True)


def _vlog(msg: str) -> None:
    if _VERBOSE:
        _log(f"  [verbose] {msg}")


# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------


def _default_state(from_phase: int, to_phase: int, max_iterations: int, run_id: str) -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "run_id": run_id,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "from_phase": from_phase,
        "to_phase": to_phase,
        "current_phase": from_phase,
        "phase_state": "IMPLEMENTING",
        "iteration": 1,
        "max_iterations": max_iterations,
        "last_agent_called": None,
        "last_decision": None,
        "review_feedback": None,
        "qa_feedback": None,
        "implement_feedback_history": [],
        "phase_start_time": datetime.now(timezone.utc).isoformat(),
        "phase_git_branch": None,
        "completed_phases": list(range(0, from_phase)),
        "escalation_reason": None,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }


def load_state() -> dict[str, Any] | None:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return None


def write_state(state: dict[str, Any]) -> None:
    """Atomic write: write to .tmp then rename."""
    state["last_updated"] = datetime.now(timezone.utc).isoformat()
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, default=str))
    os.replace(tmp, STATE_FILE)


def initialize_state(from_phase: int, to_phase: int, max_iterations: int) -> dict[str, Any]:
    run_id = str(uuid.uuid4())[:8]
    state = _default_state(from_phase, to_phase, max_iterations, run_id)
    write_state(state)
    return state


# ---------------------------------------------------------------------------
# Execution log
# ---------------------------------------------------------------------------


def log_execution(message: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{ts}] Orchestrator | {message}\n"
    with EXECUTION_LOG.open("a") as f:
        f.write(line)
    _vlog(f"exec-log: {message}")


# ---------------------------------------------------------------------------
# Decision log
# ---------------------------------------------------------------------------


def log_decision(
    phase_num: int,
    iteration: int,
    agent: str,
    action: str,
    details: str,
    files_modified: list[str] | None = None,
) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    files_section = ""
    if files_modified:
        files_section = "\n**Files modified**:\n" + "\n".join(f"  - {f}" for f in files_modified)

    entry = (
        f"\n## [{ts}] Phase {phase_num} — Iteration {iteration} — Decision: {action}\n\n"
        f"**Agent**: {agent}\n"
        f"**Action**: {action}\n"
        f"{files_section}\n"
        f"**Details**:\n{details}\n"
        f"\n---\n"
    )
    with DECISIONS_LOG.open("a") as f:
        f.write(entry)


# ---------------------------------------------------------------------------
# Agent output archive
# ---------------------------------------------------------------------------


def save_agent_output(phase_num: int, iteration: int, agent_name: str, output: str) -> Path:
    filename = f"phase-{phase_num}-iter-{iteration}-{agent_name}.txt"
    path = AGENT_OUTPUTS / filename
    path.write_text(output)
    _vlog(f"saved agent output → {path}")
    return path


# ---------------------------------------------------------------------------
# Checkpoint (ACTIVE.md)
# ---------------------------------------------------------------------------


def write_checkpoint(state: dict[str, Any], currently_running: str = "") -> None:
    phase_num = state["current_phase"]
    cfg = PHASE_CONFIG.get(phase_num, {})
    phase_name = cfg.get("name", "Unknown")

    # Get files modified in this phase branch
    files_stat = _git_diff_stat_current_branch()

    content = f"""# Orchestration Checkpoint — Active

**Run ID**: {state['run_id']}
**As of**: {datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
**Current phase**: {phase_num} — {phase_name}
**Phase state**: {state['phase_state']}
**Iteration**: {state['iteration']} / {state['max_iterations']}

## What was done in this iteration
- Phase started at: {state.get('phase_start_time', 'unknown')}
- Last agent called: {state.get('last_agent_called', 'none')}
- Last decision: {state.get('last_decision', 'none')}

## Currently running
{currently_running or '(idle)'}

## Files modified this phase
{files_stat or '(none yet)'}

## To resume if interrupted
```
python3 .claude/scripts/phase_orchestrator.py --from-phase {phase_num} --resume
```

## Completed phases
{', '.join(str(p) for p in state.get('completed_phases', [])) or 'none'}

## Pending decisions for human review
{state.get('escalation_reason') or '(none so far)'}
"""
    ACTIVE_CHECKPOINT.write_text(content)


# ---------------------------------------------------------------------------
# Deviation detection
# ---------------------------------------------------------------------------


def _git_diff_stat_current_branch() -> str:
    try:
        result = subprocess.run(
            ["git", "diff", "--stat", "HEAD~1..HEAD"],
            capture_output=True, text=True, cwd=REPO_ROOT, timeout=30
        )
        return result.stdout.strip()
    except Exception:
        return ""


def detect_deviations(phase_num: int, agent_name: str, iteration: int) -> list[str]:
    """Compare actual changed files to expected files for the phase."""
    cfg = PHASE_CONFIG.get(phase_num, {})
    expected = cfg.get("expected_files", [])
    if not expected:
        return []

    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1..HEAD"],
            capture_output=True, text=True, cwd=REPO_ROOT, timeout=30
        )
        actual_files = set(result.stdout.strip().splitlines())
    except Exception:
        return []

    deviations = []
    for exp in expected:
        if not any(exp in af for af in actual_files):
            deviations.append(f"MISSING_EXPECTED_FILE: {exp}")

    for af in actual_files:
        if af and not any(exp in af for exp in expected):
            # Only flag as deviation if it's a source file (not docs/tests)
            if "/tests/" not in af and "docs/" not in af and ".md" not in af:
                deviations.append(f"UNEXPECTED_FILE: {af}")

    if deviations:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        lines = [
            f"\n## [{ts}] Phase {phase_num} — Deviation Detected\n",
            f"**Agent**: {agent_name}",
            f"**Iteration**: {iteration}",
            "",
        ]
        for d in deviations:
            dtype, _, path = d.partition(": ")
            if dtype == "MISSING_EXPECTED_FILE":
                lines.append(f"- **MISSING**: `{path}` — expected but not created")
            else:
                lines.append(f"- **UNEXPECTED**: `{path}` — created but not in expected list")
        lines.append("\n**Action**: Deviations injected into next agent prompt.\n\n---\n")
        with DEVIATIONS_LOG.open("a") as f:
            f.write("\n".join(lines))

    return deviations


# ---------------------------------------------------------------------------
# Escalation
# ---------------------------------------------------------------------------


def write_escalation_file(phase_num: int, state: dict[str, Any], reason: str) -> None:
    cfg = PHASE_CONFIG.get(phase_num, {})
    phase_name = cfg.get("name", "Unknown")
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    filename = f"phase-{phase_num}-escalation.md"
    path = BLOCKED_DIR / filename

    qa_feedback = state.get("qa_feedback") or "(none)"
    review_feedback = state.get("review_feedback") or "(none)"
    history = state.get("implement_feedback_history", [])
    history_text = "\n\n".join(f"### Iteration {i+1}\n{fb}" for i, fb in enumerate(history)) or "(none)"

    content = f"""# Escalation: Phase {phase_num} — {phase_name}

**Escalated at**: {ts}
**Run ID**: {state['run_id']}
**Reason**: {reason}
**Iterations attempted**: {state['iteration']} / {state['max_iterations']}

## Last QA Feedback
{qa_feedback}

## Last PR Review Feedback
{review_feedback}

## Full Iteration History
{history_text}

## Resume Command
```bash
python3 .claude/scripts/phase_orchestrator.py --from-phase {phase_num} --resume
```

## Next Steps for Human
1. Review the feedback above
2. Manually resolve the blocking issue
3. Run the resume command above
"""
    path.write_text(content)
    _log(f"  Escalation file written: {path}")


# ---------------------------------------------------------------------------
# Phase summary
# ---------------------------------------------------------------------------


def write_phase_summary(
    phase_num: int,
    state: dict[str, Any],
    result: str,
    qa_output: str = "",
    pr_output: str = "",
) -> None:
    cfg = PHASE_CONFIG.get(phase_num, {})
    phase_name = cfg.get("name", "Unknown")
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    files_stat = _git_diff_stat_current_branch()
    agents = [cfg.get("primary_agent", "unknown")]
    if cfg.get("secondary_agent"):
        agents.append(cfg["secondary_agent"])
    agents += ["qa-lead", "pr-reviewer"]

    content = f"""# Phase {phase_num} — {phase_name} — Summary

**Result**: {result}
**Completed at**: {ts}
**Iterations needed**: {state['iteration']}
**Agents involved**: {', '.join(agents)}

## What was built
{files_stat or '(see git log)'}

## QA sign-off
{qa_output[-2000:] if qa_output else '(skipped or not available)'}

## PR reviewer sign-off
{pr_output[-2000:] if pr_output else '(skipped or not available)'}
"""
    path = SUMMARIES / f"phase-{phase_num}-summary.md"
    path.write_text(content)


# ---------------------------------------------------------------------------
# Core: invoke_agent
# ---------------------------------------------------------------------------


def invoke_agent(agent_name: str, prompt: str, timeout: int = 1800, dry_run: bool = False) -> str:
    """Call claude --print --agent {agent_name} non-interactively.

    Returns the agent's text output (result field from JSON, or raw stdout).
    """
    if dry_run:
        _log(f"  [DRY-RUN] Would invoke agent: {agent_name}")
        _log(f"  [DRY-RUN] Prompt (first 200 chars): {prompt[:200]}...")
        return f"DRY_RUN_OUTPUT for {agent_name}"

    cmd = [
        "claude",
        "--print",
        "--agent", agent_name,
        "--output-format", "json",
        "--dangerously-skip-permissions",
        "--no-session-persistence",
        "--add-dir", str(REPO_ROOT),
        prompt,
    ]
    _vlog(f"invoking: claude --print --agent {agent_name} (timeout={timeout}s)")

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(REPO_ROOT),
            stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        return f"AGENT_TIMEOUT: {agent_name} did not complete within {timeout}s"
    except FileNotFoundError:
        return f"AGENT_NOT_FOUND: 'claude' CLI not found in PATH"

    if proc.returncode != 0 and not proc.stdout:
        return f"AGENT_ERROR: exit={proc.returncode}\nstderr={proc.stderr[:1000]}"

    # Try to parse JSON output
    try:
        parsed = json.loads(proc.stdout)
        return parsed.get("result", proc.stdout)
    except json.JSONDecodeError:
        return proc.stdout


# ---------------------------------------------------------------------------
# Sign-off parsers
# ---------------------------------------------------------------------------


def parse_qa_verdict(output: str) -> str:
    """Extract QA_VERDICT from the last 30 lines of agent output.

    Returns: 'PASS', 'FAIL', or 'BLOCKED'
    """
    lines = output.strip().splitlines()[-30:]
    for line in reversed(lines):
        m = re.search(r"QA_VERDICT:\s*(PASS|FAIL|BLOCKED)", line, re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return "FAIL"  # default to fail if no verdict found


def parse_pr_verdict(output: str) -> str:
    """Extract Verdict from pr-reviewer output.

    Returns: 'APPROVED', 'CHANGES_REQUESTED', or 'BLOCKED'
    """
    lines = output.strip().splitlines()[-30:]
    for line in reversed(lines):
        m = re.search(r"Verdict:\s*(APPROVED|CHANGES\s+REQUESTED|BLOCKED)", line, re.IGNORECASE)
        if m:
            verdict = m.group(1).upper()
            if "CHANGES" in verdict:
                return "CHANGES_REQUESTED"
            return verdict
    return "CHANGES_REQUESTED"  # default to changes requested if no verdict found


def parse_implementation_signal(output: str, phase_num: int) -> bool:
    """Check if agent signalled IMPLEMENTATION_COMPLETE."""
    lines = output.strip().splitlines()[-20:]
    for line in lines:
        if f"IMPLEMENTATION_COMPLETE" in line and f"Phase {phase_num}" in line:
            return True
        # Also accept bare IMPLEMENTATION_COMPLETE
        if re.search(r"IMPLEMENTATION_COMPLETE", line):
            return True
    return False


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------


def _git(args: list[str], check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args,
        capture_output=True, text=True, cwd=str(REPO_ROOT), check=check
    )


def ensure_phase_branch(phase_num: int, slug: str) -> str:
    branch = f"feat/phase-{phase_num}-{slug}"
    result = _git(["rev-parse", "--verify", branch])
    if result.returncode != 0:
        # Branch doesn't exist — create it
        _git(["checkout", "-b", branch])
        _log(f"  Created branch: {branch}")
    else:
        _git(["checkout", branch])
        _log(f"  Checked out branch: {branch}")
    return branch


# ---------------------------------------------------------------------------
# Agent prompt imports
# ---------------------------------------------------------------------------

# Import build_prompt from phase_prompts.py
_PROMPTS_PATH = REPO_ROOT / ".claude" / "context" / "phase_prompts.py"

def _load_phase_prompts():
    import importlib.util
    spec = importlib.util.spec_from_file_location("phase_prompts", _PROMPTS_PATH)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


# ---------------------------------------------------------------------------
# Core per-phase runners
# ---------------------------------------------------------------------------


def run_implementation(
    phase_num: int,
    state: dict[str, Any],
    prompts_mod: Any,
    dry_run: bool = False,
) -> str:
    """Run the implementation agent(s) for the phase. Returns combined output."""
    cfg = PHASE_CONFIG[phase_num]
    strategy = cfg["strategy"]
    primary = cfg["primary_agent"]
    secondary = cfg.get("secondary_agent")
    timeout = cfg.get("timeout", 1800)
    iteration = state["iteration"]
    deviations = state.get("_last_deviations", [])

    _log(f"  [{strategy}] Running primary agent: {primary}")
    log_execution(f"Agent: {primary} | Phase {phase_num} iter {iteration} START | Branch: {state.get('phase_git_branch', '?')}")

    # Inject deviations into state so build_prompt can access them
    state["_deviations"] = deviations
    primary_prompt = prompts_mod.build_prompt("primary", phase_num, state)
    primary_output = invoke_agent(primary, primary_prompt, timeout=timeout, dry_run=dry_run)

    save_agent_output(phase_num, iteration, primary, primary_output)
    log_execution(f"Agent: {primary} | Phase {phase_num} iter {iteration} COMPLETE | Signal: {parse_implementation_signal(primary_output, phase_num)}")

    # Detect deviations after primary
    new_devs = detect_deviations(phase_num, primary, iteration)
    state["_last_deviations"] = new_devs

    log_decision(
        phase_num, iteration, primary,
        "PRIMARY_IMPLEMENTATION_COMPLETE" if parse_implementation_signal(primary_output, phase_num) else "PRIMARY_IMPLEMENTATION_DONE",
        primary_output[-500:],
        files_modified=new_devs,
    )

    combined_output = primary_output

    if strategy == "SEQUENTIAL" and secondary:
        _log(f"  [SEQUENTIAL] Running secondary agent: {secondary}")
        log_execution(f"Agent: {secondary} | Phase {phase_num} iter {iteration} START")

        state["_deviations"] = new_devs
        secondary_prompt = prompts_mod.build_prompt("secondary", phase_num, state, primary_output=primary_output)
        secondary_output = invoke_agent(secondary, secondary_prompt, timeout=timeout, dry_run=dry_run)

        save_agent_output(phase_num, iteration, secondary, secondary_output)
        log_execution(f"Agent: {secondary} | Phase {phase_num} iter {iteration} COMPLETE")

        secondary_devs = detect_deviations(phase_num, secondary, iteration)
        state["_last_deviations"] = secondary_devs

        log_decision(
            phase_num, iteration, secondary,
            "SECONDARY_IMPLEMENTATION_COMPLETE",
            secondary_output[-500:],
        )
        combined_output = primary_output + "\n\n---\n\n" + secondary_output

    state["last_agent_called"] = secondary if (strategy == "SEQUENTIAL" and secondary) else primary
    write_state(state)
    return combined_output


def run_qa_validation(
    phase_num: int,
    state: dict[str, Any],
    prompts_mod: Any,
    dry_run: bool = False,
) -> tuple[str, str]:
    """Run qa-lead. Returns (verdict, full_output)."""
    iteration = state["iteration"]
    _log(f"  Running qa-lead (iteration {iteration})")
    log_execution(f"Agent: qa-lead | Phase {phase_num} iter {iteration} QA_VALIDATING START")

    prompt = prompts_mod.build_prompt("qa", phase_num, state)
    output = invoke_agent("qa-lead", prompt, timeout=1800, dry_run=dry_run)

    save_agent_output(phase_num, iteration, "qa-lead", output)
    verdict = parse_qa_verdict(output)

    log_execution(f"Agent: qa-lead | Phase {phase_num} iter {iteration} QA_VERDICT: {verdict}")
    log_decision(phase_num, iteration, "qa-lead", f"QA_VERDICT_{verdict}", output[-500:])

    state["qa_feedback"] = output
    state["last_agent_called"] = "qa-lead"
    state["last_decision"] = f"QA_{verdict}"
    write_state(state)
    return verdict, output


def run_pr_review(
    phase_num: int,
    state: dict[str, Any],
    prompts_mod: Any,
    dry_run: bool = False,
) -> tuple[str, str]:
    """Run pr-reviewer. Returns (verdict, full_output)."""
    iteration = state["iteration"]
    _log(f"  Running pr-reviewer (iteration {iteration})")
    log_execution(f"Agent: pr-reviewer | Phase {phase_num} iter {iteration} PR_REVIEWING START")

    prompt = prompts_mod.build_prompt("pr", phase_num, state)
    output = invoke_agent("pr-reviewer", prompt, timeout=1800, dry_run=dry_run)

    save_agent_output(phase_num, iteration, "pr-reviewer", output)
    verdict = parse_pr_verdict(output)

    log_execution(f"Agent: pr-reviewer | Phase {phase_num} iter {iteration} Verdict: {verdict}")
    log_decision(phase_num, iteration, "pr-reviewer", f"PR_VERDICT_{verdict}", output[-500:])

    state["review_feedback"] = output
    state["last_agent_called"] = "pr-reviewer"
    state["last_decision"] = verdict
    write_state(state)
    return verdict, output


# ---------------------------------------------------------------------------
# Phase closeout
# ---------------------------------------------------------------------------


def run_phase_closeout(phase_num: int, state: dict[str, Any], dry_run: bool = False) -> bool:
    """Run make check + make security-scan, then commit and tag.

    Returns True on success, False on failure.
    """
    cfg = PHASE_CONFIG[phase_num]
    phase_name = cfg["name"]
    _log(f"  Phase {phase_num} closeout: running make check...")

    if not dry_run:
        check_result = subprocess.run(
            ["make", "check"],
            capture_output=True, text=True, cwd=str(REPO_ROOT), timeout=300
        )
        if check_result.returncode != 0:
            _log(f"  make check FAILED:\n{check_result.stdout[-1000:]}\n{check_result.stderr[-500:]}")
            log_execution(f"Phase {phase_num} CLOSEOUT FAILED | make check: FAIL")
            return False
        _log(f"  make check PASSED")

        _log(f"  Phase {phase_num} closeout: running make security-scan...")
        sec_result = subprocess.run(
            ["make", "security-scan"],
            capture_output=True, text=True, cwd=str(REPO_ROOT), timeout=300
        )
        if sec_result.returncode != 0:
            _log(f"  make security-scan FAILED:\n{sec_result.stdout[-1000:]}")
            log_execution(f"Phase {phase_num} CLOSEOUT FAILED | make security-scan: FAIL")
            return False
        _log(f"  make security-scan PASSED")

    # Git commit
    _log(f"  Committing phase {phase_num}...")
    if not dry_run:
        _git(["add", "-A"])
        commit_msg = f"feat: Phase {phase_num} — {phase_name} complete\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
        commit_result = _git(["commit", "-m", commit_msg])
        if commit_result.returncode != 0 and "nothing to commit" not in commit_result.stdout:
            _log(f"  git commit failed: {commit_result.stderr}")
            # Not fatal — may have been committed during implementation
        _log(f"  git commit done")

        # Git tag
        tag = f"phase/{phase_num}-complete"
        tag_result = _git(["tag", "-a", tag, "-m", f"Phase {phase_num}: {phase_name}"])
        if tag_result.returncode != 0:
            _log(f"  git tag warning (may already exist): {tag_result.stderr}")
        else:
            _log(f"  git tag created: {tag}")

    # Update AGENT_MEMORY.md current phase field
    if not dry_run:
        _update_agent_memory(phase_num)

    log_execution(
        f"Phase {phase_num} CLOSEOUT | make check: {'SKIP(dry)' if dry_run else 'PASS'} | "
        f"make security-scan: {'SKIP(dry)' if dry_run else 'PASS'} | "
        f"Tag: {'(dry-run)' if dry_run else f'phase/{phase_num}-complete'}"
    )
    return True


def _update_agent_memory(phase_num: int) -> None:
    """Update the Current Phase field in docs/AGENT_MEMORY.md."""
    if not AGENT_MEMORY.exists():
        return
    content = AGENT_MEMORY.read_text()
    # Replace pattern like "Current Phase: 13" with next phase
    updated = re.sub(
        r"(Current Phase:\s*)\d+",
        f"\\g<1>{phase_num + 1}",
        content,
        count=1,
    )
    if updated != content:
        AGENT_MEMORY.write_text(updated)
        _vlog(f"Updated AGENT_MEMORY.md: Current Phase → {phase_num + 1}")


# ---------------------------------------------------------------------------
# Main per-phase loop
# ---------------------------------------------------------------------------


def run_phase(
    phase_num: int,
    state: dict[str, Any],
    prompts_mod: Any,
    dry_run: bool = False,
) -> str:
    """Run a single phase through its full iteration loop.

    Returns: 'APPROVED', 'ESCALATED', or 'BLOCKED'
    """
    cfg = PHASE_CONFIG[phase_num]
    phase_name = cfg["name"]
    slug = cfg["slug"]
    max_iter = state["max_iterations"]

    _log(f"\n{'='*60}")
    _log(f"PHASE {phase_num}: {phase_name}")
    _log(f"{'='*60}")

    # Set up git branch
    if not dry_run:
        branch = ensure_phase_branch(phase_num, slug)
        state["phase_git_branch"] = branch

    state["phase_start_time"] = datetime.now(timezone.utc).isoformat()
    state["phase_state"] = "IMPLEMENTING"
    write_state(state)
    write_checkpoint(state, f"Starting Phase {phase_num} — {phase_name}")

    qa_output = ""
    pr_output = ""

    while state["iteration"] <= max_iter:
        iter_num = state["iteration"]
        _log(f"\n--- Phase {phase_num} | Iteration {iter_num}/{max_iter} ---")

        # ── IMPLEMENTING ─────────────────────────────────────────────────
        state["phase_state"] = "IMPLEMENTING"
        write_state(state)
        write_checkpoint(state, f"Phase {phase_num} iter {iter_num}: IMPLEMENTING")

        impl_output = run_implementation(phase_num, state, prompts_mod, dry_run=dry_run)

        # Inject any feedback from previous iterations
        if iter_num > 1:
            state["implement_feedback_history"].append(
                f"Iteration {iter_num} re-implementation triggered by:\n"
                + (state.get("qa_feedback") or state.get("review_feedback") or "")
            )
            write_state(state)

        # ── QA_VALIDATING ─────────────────────────────────────────────────
        state["phase_state"] = "QA_VALIDATING"
        write_state(state)
        write_checkpoint(state, f"Phase {phase_num} iter {iter_num}: QA_VALIDATING")

        qa_verdict, qa_output = run_qa_validation(phase_num, state, prompts_mod, dry_run=dry_run)

        if qa_verdict == "BLOCKED":
            _log(f"  QA returned BLOCKED — escalating phase {phase_num}")
            reason = f"QA BLOCKED on iteration {iter_num}: " + (qa_output[-300:] if qa_output else "no output")
            state["phase_state"] = "BLOCKED"
            state["escalation_reason"] = reason
            write_state(state)
            write_escalation_file(phase_num, state, reason)
            write_phase_summary(phase_num, state, "BLOCKED", qa_output, "")
            return "BLOCKED"

        if qa_verdict == "FAIL":
            _log(f"  QA FAILED — injecting feedback and retrying")
            state["iteration"] += 1
            write_state(state)
            if state["iteration"] > max_iter:
                break
            continue

        # QA passed — move to PR review
        _log(f"  QA PASSED")

        # ── PR_REVIEWING ─────────────────────────────────────────────────
        state["phase_state"] = "PR_REVIEWING"
        write_state(state)
        write_checkpoint(state, f"Phase {phase_num} iter {iter_num}: PR_REVIEWING")

        pr_verdict, pr_output = run_pr_review(phase_num, state, prompts_mod, dry_run=dry_run)

        if pr_verdict == "BLOCKED":
            _log(f"  PR reviewer returned BLOCKED — escalating phase {phase_num}")
            reason = f"PR reviewer BLOCKED on iteration {iter_num}: " + (pr_output[-300:] if pr_output else "no output")
            state["phase_state"] = "BLOCKED"
            state["escalation_reason"] = reason
            write_state(state)
            write_escalation_file(phase_num, state, reason)
            write_phase_summary(phase_num, state, "BLOCKED", qa_output, pr_output)
            return "BLOCKED"

        if pr_verdict == "APPROVED":
            _log(f"  PR APPROVED")
            state["phase_state"] = "APPROVED"
            write_state(state)

            # ── CLOSEOUT ──────────────────────────────────────────────────
            _log(f"  Running phase closeout...")
            closeout_ok = run_phase_closeout(phase_num, state, dry_run=dry_run)
            if not closeout_ok:
                _log(f"  Closeout checks failed — escalating")
                reason = "Closeout make check or security-scan failed"
                state["phase_state"] = "ESCALATED"
                state["escalation_reason"] = reason
                write_state(state)
                write_escalation_file(phase_num, state, reason)
                write_phase_summary(phase_num, state, "ESCALATED", qa_output, pr_output)
                return "ESCALATED"

            state["completed_phases"].append(phase_num)
            state["current_phase"] = phase_num + 1
            state["iteration"] = 1
            state["review_feedback"] = None
            state["qa_feedback"] = None
            state["implement_feedback_history"] = []
            state["phase_git_branch"] = None
            write_state(state)

            write_phase_summary(phase_num, state, "APPROVED", qa_output, pr_output)
            _log(f"  Phase {phase_num} COMPLETE ✓")
            log_execution(f"Phase {phase_num} COMPLETE | Tag: phase/{phase_num}-complete")
            return "APPROVED"

        # CHANGES_REQUESTED — inject feedback and retry
        _log(f"  PR reviewer requested changes — iteration {iter_num + 1} coming")
        state["iteration"] += 1
        write_state(state)
        if state["iteration"] > max_iter:
            break

    # Max iterations exceeded
    _log(f"  Max iterations ({max_iter}) reached for phase {phase_num} — escalating")
    reason = (
        f"Max iterations ({max_iter}) exceeded.\n"
        f"Last QA verdict: {parse_qa_verdict(qa_output) if qa_output else 'N/A'}\n"
        f"Last PR verdict: {parse_pr_verdict(pr_output) if pr_output else 'N/A'}"
    )
    state["phase_state"] = "ESCALATED"
    state["escalation_reason"] = reason
    write_state(state)
    write_escalation_file(phase_num, state, reason)
    write_phase_summary(phase_num, state, "ESCALATED", qa_output, pr_output)
    return "ESCALATED"


# ---------------------------------------------------------------------------
# AGENT_MEMORY reader
# ---------------------------------------------------------------------------


def read_current_phase_from_memory() -> int:
    """Parse 'Current Phase: N' from docs/AGENT_MEMORY.md. Defaults to 13."""
    if not AGENT_MEMORY.exists():
        return 13
    content = AGENT_MEMORY.read_text()
    m = re.search(r"Current Phase:\s*(\d+)", content)
    if m:
        return int(m.group(1))
    return 13


# ---------------------------------------------------------------------------
# Dry-run: print all prompts
# ---------------------------------------------------------------------------


def dry_run_print_prompts(from_phase: int, to_phase: int, max_iterations: int) -> None:
    prompts_mod = _load_phase_prompts()
    run_id = "dry-run"
    state = _default_state(from_phase, to_phase, max_iterations, run_id)
    state["phase_git_branch"] = f"feat/phase-{from_phase}-dry-run"
    write_state(state)

    for phase_num in range(from_phase, to_phase + 1):
        if phase_num not in PHASE_CONFIG:
            continue
        cfg = PHASE_CONFIG[phase_num]
        print(f"\n{'='*70}")
        print(f"PHASE {phase_num}: {cfg['name']} — PROMPTS (DRY RUN)")
        print(f"{'='*70}")

        for role in ["primary", "secondary", "qa", "pr"]:
            if role == "secondary" and not cfg.get("secondary_agent"):
                continue
            print(f"\n--- {role.upper()} PROMPT ---")
            try:
                prompt = prompts_mod.build_prompt(role, phase_num, state)
                print(prompt[:1000] + ("..." if len(prompt) > 1000 else ""))
            except Exception as e:
                print(f"[ERROR building {role} prompt: {e}]")


# ---------------------------------------------------------------------------
# Main orchestration entry point
# ---------------------------------------------------------------------------


def main() -> int:
    args = parse_args()

    global _VERBOSE
    _VERBOSE = args.verbose

    # ── Dry run ──────────────────────────────────────────────────────────
    if args.dry_run:
        from_phase = args.from_phase or read_current_phase_from_memory()
        to_phase = args.to_phase or 21
        _log(f"DRY RUN: phases {from_phase}–{to_phase}")
        dry_run_print_prompts(from_phase, to_phase, args.max_iterations)
        return 0

    # ── Resume ────────────────────────────────────────────────────────────
    if args.resume:
        state = load_state()
        if state is None:
            _log("ERROR: --resume specified but no state file found")
            return 1
        from_phase = state["current_phase"]
        to_phase = state["to_phase"]
        _log(f"RESUMING from phase {from_phase} (state: {state['phase_state']}, iter: {state['iteration']})")
    else:
        from_phase = args.from_phase or read_current_phase_from_memory()
        to_phase = args.to_phase or 21
        state = initialize_state(from_phase, to_phase, args.max_iterations)
        _log(f"STARTING orchestration: phases {from_phase}–{to_phase}")

    # ── Load prompt templates ─────────────────────────────────────────────
    try:
        prompts_mod = _load_phase_prompts()
    except Exception as e:
        _log(f"ERROR: Failed to load phase_prompts.py: {e}")
        return 1

    log_execution(f"Orchestration START | Run: {state['run_id']} | Phases: {from_phase}–{to_phase}")

    # ── Phase loop ────────────────────────────────────────────────────────
    escalated_phases = []

    for phase_num in range(from_phase, to_phase + 1):
        if phase_num not in PHASE_CONFIG:
            _log(f"Phase {phase_num} not in PHASE_CONFIG — skipping")
            continue

        if phase_num in state.get("completed_phases", []):
            _log(f"Phase {phase_num} already completed — skipping")
            continue

        state["current_phase"] = phase_num
        write_state(state)

        result = run_phase(phase_num, state, prompts_mod, dry_run=False)

        if result in ("ESCALATED", "BLOCKED"):
            escalated_phases.append(phase_num)
            _log(f"\nPhase {phase_num} {result} — stopping orchestration")
            _log(f"See escalation file: {BLOCKED_DIR}/phase-{phase_num}-escalation.md")
            break

    # ── Final report ─────────────────────────────────────────────────────
    completed = state.get("completed_phases", [])
    in_range = [p for p in range(from_phase, to_phase + 1) if p in PHASE_CONFIG]
    done_in_range = [p for p in in_range if p in completed]

    log_execution(
        f"Orchestration END | Run: {state['run_id']} | "
        f"Completed: {done_in_range} | Escalated: {escalated_phases}"
    )

    if escalated_phases:
        _log(f"\nORCHESTRATION INCOMPLETE — {len(escalated_phases)} phase(s) need human attention: {escalated_phases}")
        _log(f"Escalation files in: {BLOCKED_DIR}/")
        return 1

    _log(f"\nORCHESTRATION COMPLETE — all phases {from_phase}–{to_phase} approved")
    _log(f"Summary files in: {SUMMARIES}/")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Autonomous multi-agent phase orchestrator for Creator OS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 .claude/scripts/phase_orchestrator.py --from-phase 13
  python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --to-phase 15
  python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --resume
  python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --to-phase 13 --dry-run
  python3 .claude/scripts/phase_orchestrator.py --from-phase 13 --verbose
        """,
    )
    parser.add_argument("--from-phase", type=int, default=None,
                        help="Phase to start from (default: read from AGENT_MEMORY.md)")
    parser.add_argument("--to-phase", type=int, default=None,
                        help="Phase to end at inclusive (default: 21)")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from orchestration_state.json checkpoint")
    parser.add_argument("--max-iterations", type=int, default=3,
                        help="Max implement→QA→PR iterations per phase (default: 3)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print all prompts without invoking agents")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable verbose logging")
    return parser.parse_args()


if __name__ == "__main__":
    sys.exit(main())
