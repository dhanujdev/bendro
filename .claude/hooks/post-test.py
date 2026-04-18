#!/usr/bin/env python3
"""
Post-Test Hook — PostToolCall
Runs after: pytest or pnpm test commands.
Parses test output, logs results, flags coverage drops.
"""

import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).parent.parent.parent
LOG_FILE = REPO_ROOT / "docs" / "EXECUTION_LOG.md"


def get_tool_output() -> str:
    """Extract tool_output from Claude Code hook JSON stdin."""
    try:
        raw = sys.stdin.read()
        if raw.strip():
            data = json.loads(raw)
            return data.get("tool_output", "")
    except (json.JSONDecodeError, EOFError):
        pass
    return ""


def parse_test_results(output: str) -> dict:
    """Parse pass/fail/skip counts from test runner output."""
    passed = 0
    failed = 0
    skipped = 0

    # pytest style: "3 passed, 1 failed, 2 skipped"
    m = re.search(r"(\d+) passed", output)
    if m:
        passed = int(m.group(1))
    m = re.search(r"(\d+) failed", output)
    if m:
        failed = int(m.group(1))
    m = re.search(r"(\d+) skipped", output)
    if m:
        skipped = int(m.group(1))

    status = "FAIL" if failed > 0 or re.search(r"FAILED|ERROR|failures", output, re.I) else "PASS"
    return {"status": status, "passed": passed, "failed": failed, "skipped": skipped}


def main() -> None:
    output = get_tool_output()
    results = parse_test_results(output)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Append to execution log
    if LOG_FILE.exists():
        entry = (
            f"[{timestamp}] Agent: qa-lead | Tool: test-runner | "
            f"Result: {results['status']} | "
            f"Passed: {results['passed']}, Failed: {results['failed']}, Skipped: {results['skipped']}\n"
        )
        with LOG_FILE.open("a") as f:
            f.write(entry)

    # Coverage check
    coverage_file = REPO_ROOT / "coverage" / "coverage-summary.json"
    if coverage_file.exists():
        try:
            data = json.loads(coverage_file.read_text())
            pct = data.get("total", {}).get("lines", {}).get("pct", 0)
            if pct < 85:
                print(f"\n\u26a0\ufe0f  COVERAGE WARNING: Line coverage is {pct:.1f}% (threshold: 85%)")
                print("   Business logic coverage must be >= 85%. Please add tests before proceeding.")
        except (json.JSONDecodeError, KeyError):
            pass

    # Final status
    if results["status"] == "FAIL":
        print(f"\n\u274c Tests failed: {results['failed']} failure(s)")
        print("   Fix failing tests before committing or invoking session-handoff.")
    else:
        print(f"\u2713 All {results['passed']} tests passed")


if __name__ == "__main__":
    main()
