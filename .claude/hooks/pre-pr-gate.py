#!/usr/bin/env python3
"""
Pre-PR Gate Hook — PreToolCall
Enterprise standards gate executed before any PR submission.

Trigger: PreToolCall — runs when Claude attempts gh pr create
This hook BLOCKS the PR if any mandatory gate fails.
"""

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent

RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
NC = "\033[0m"

FAILURES: list[str] = []
WARNINGS: list[str] = []


def ok(msg: str) -> None:
    print(f"  {GREEN}\u2713{NC} {msg}")


def fail(msg: str) -> None:
    print(f"  {RED}\u2717{NC} {msg}")
    FAILURES.append(msg)


def warn(msg: str) -> None:
    print(f"  {YELLOW}\u26a0{NC} {msg}")
    WARNINGS.append(msg)


def section(msg: str) -> None:
    print(f"\n{BLUE}\u25b6 {msg}{NC}")


def run(cmd: str, quiet: bool = True) -> tuple[int, str]:
    """Run a shell command and return (returncode, output)."""
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    return result.returncode, result.stdout + result.stderr


def has_cmd(name: str) -> bool:
    return subprocess.run(["which", name], capture_output=True).returncode == 0


def gate_lint() -> None:
    section("Gate 1: Lint")

    if has_cmd("ruff"):
        rc, _ = run("ruff check services/ packages/ --quiet 2>/dev/null")
        ok("Ruff Python lint") if rc == 0 else fail("Ruff Python lint — run: ruff check services/ packages/")

        rc, _ = run("ruff format --check services/ packages/ --quiet 2>/dev/null")
        ok("Ruff Python format") if rc == 0 else fail("Ruff Python format — run: ruff format services/ packages/")
    else:
        warn("Ruff not installed — skipping Python lint")

    if has_cmd("mypy"):
        rc, _ = run("mypy services/orchestrator/src services/api/src --strict --quiet 2>/dev/null")
        ok("mypy type check") if rc == 0 else fail("mypy type check — run: mypy services/")
    else:
        warn("mypy not installed — skipping Python type check")

    if Path(REPO_ROOT / "pnpm-lock.yaml").exists() and has_cmd("pnpm"):
        rc, _ = run("pnpm lint --silent 2>/dev/null")
        ok("ESLint TypeScript lint") if rc == 0 else fail("ESLint TypeScript lint — run: pnpm lint")
    else:
        warn("pnpm not available — skipping TypeScript lint")


def gate_security() -> None:
    section("Gate 2: Security Scan")

    if has_cmd("bandit"):
        rc, out = run("bandit -r services/orchestrator/src services/api/src -ll --format text 2>/dev/null")
        high_count = out.count("Severity: High") + out.count("Severity: Critical")
        if high_count == 0:
            ok("Bandit SAST — 0 HIGH/CRITICAL findings")
        else:
            fail(f"Bandit SAST — {high_count} HIGH/CRITICAL findings. Run: bandit -r services/ -ll")
    else:
        warn("Bandit not installed — skipping Python SAST")

    if has_cmd("detect-secrets") and (REPO_ROOT / ".secrets.baseline").exists():
        rc, _ = run("detect-secrets scan --baseline .secrets.baseline --only-allowlisted 2>/dev/null")
        ok("detect-secrets — no new secrets detected") if rc == 0 else fail("detect-secrets — new secrets detected!")
    else:
        warn("detect-secrets not configured — skipping secret detection")

    # Check for hardcoded secrets patterns
    rc, out = run(
        'grep -rn "sk-ant-\\|sk-proj-\\|AKIA[0-9A-Z]\\|password.*=.*[\x27\\"][^\x27\\"]{8}" '
        "services/ packages/ apps/ --include='*.py' --include='*.ts' 2>/dev/null "
        "| grep -v '.example\\|test_\\|spec.\\|#' | head -5"
    )
    if rc == 0 and out.strip():
        fail("Potential hardcoded credentials detected — review output above")
    else:
        ok("No hardcoded credential patterns detected")


def gate_architecture() -> None:
    section("Gate 3: Architecture Invariants")

    # LangGraph only in orchestrator
    rc, out = run(
        'grep -rn "from langgraph\\|import langgraph\\|StateGraph\\|CompiledGraph" '
        "services/api/ apps/ packages/ --include='*.py' 2>/dev/null | grep -v test_ | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("LangGraph only in services/orchestrator")
    else:
        fail(f"LangGraph imported outside services/orchestrator ({count} violations)")

    # No direct LLM SDK calls outside adapters
    rc, out = run(
        'grep -rn "from anthropic import\\|import anthropic" '
        "services/orchestrator/src/nodes/ services/orchestrator/src/graphs/ "
        "services/orchestrator/src/validators/ services/api/ apps/ packages/ "
        "--include='*.py' 2>/dev/null | grep -v 'anthropic_adapter\\|test_' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("No direct Anthropic SDK calls outside anthropic_adapter.py")
    else:
        fail(f"Direct Anthropic SDK calls found outside adapter ({count} violations)")

    # No raw DB calls in routes
    rc, out = run(
        'grep -rn "db\\.execute\\|AsyncSession\\|\\.query(" '
        "services/api/src/routes/ services/api/src/services/ "
        "--include='*.py' 2>/dev/null | grep -v 'Depends\\|test_\\|# OK:' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("Repository pattern — no raw DB calls in routes/services")
    else:
        fail(f"Raw DB calls found in routes/services ({count} violations)")


def gate_security_invariants() -> None:
    section("Gate 4: Security Invariants")

    repo_dir = REPO_ROOT / "services" / "api" / "src" / "repositories"
    if repo_dir.exists():
        repo_files = [
            f for f in repo_dir.glob("*.py")
            if "__pycache__" not in str(f) and "test_" not in f.name and f.name != "__init__.py"
        ]
        missing = [f.name for f in repo_files if "workspace_id" not in f.read_text()]
        if not missing:
            ok("workspace_id filter present in all repository files")
        else:
            fail(f"Repository files missing workspace_id: {', '.join(missing)}")
    else:
        warn("No repository files found — workspace_id check skipped")

    # No PII in logs
    rc, out = run(
        'grep -rn "logger.*\\bemail\\b\\|logger.*\\bpassword\\b\\|structlog.*\\bpassword\\b" '
        "services/ --include='*.py' 2>/dev/null | grep -v 'test_\\|signin_unknown\\|# OK:' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("No PII in log statements")
    else:
        fail(f"PII detected in log statements ({count} occurrences)")


def gate_contracts() -> None:
    section("Gate 5: Contract-First (OpenAPI)")

    specs_dir = REPO_ROOT / "docs" / "specs" / "openapi" / "v1"
    if specs_dir.exists():
        specs = list(specs_dir.glob("*.yaml"))
        routes_dir = REPO_ROOT / "services" / "api" / "src" / "routes"
        routes = [
            f for f in routes_dir.glob("*.py")
            if "__init__" not in f.name and "test_" not in f.name
        ] if routes_dir.exists() else []

        if specs:
            ok(f"OpenAPI specs directory has {len(specs)} spec(s) for {len(routes)} route file(s)")
        else:
            warn("No OpenAPI specs in docs/specs/openapi/v1/")
    else:
        warn("docs/specs/openapi/v1/ not found — skipping contract check")


def gate_docs() -> None:
    section("Gate 6: Documentation")

    changelog = REPO_ROOT / "CHANGELOG.md"
    if changelog.exists():
        content = changelog.read_text()
        if "## [Unreleased]" in content:
            ok("CHANGELOG.md has [Unreleased] section")
        else:
            fail("CHANGELOG.md missing [Unreleased] section")
    else:
        fail("CHANGELOG.md not found")


def gate_file_size() -> None:
    section("Gate 7: Code Size Limits")

    large_files = []
    for ext in ("*.py", "*.ts", "*.tsx"):
        for d in ("services", "packages", "apps"):
            search_dir = REPO_ROOT / d
            if not search_dir.exists():
                continue
            for f in search_dir.rglob(ext):
                if "node_modules" in str(f) or "__pycache__" in str(f):
                    continue
                if ".min." in f.name or "test_" in f.name or ".spec." in f.name:
                    continue
                try:
                    line_count = len(f.read_text().splitlines())
                    if line_count > 300:
                        large_files.append((f.relative_to(REPO_ROOT), line_count))
                except (OSError, UnicodeDecodeError):
                    pass

    if not large_files:
        ok("All files under 300 lines")
    else:
        details = "\n".join(f"    {path} ({lines} lines)" for path, lines in large_files[:10])
        fail(f"Files over 300 lines (split into submodules):\n{details}")


def main() -> None:
    os.chdir(str(REPO_ROOT))

    print()
    print("\u2554" + "\u2550" * 62 + "\u2557")
    print("\u2551        CREATOR OS \u2014 ENTERPRISE STANDARDS PRE-PR GATE        \u2551")
    print("\u255a" + "\u2550" * 62 + "\u255d")
    print()

    gate_lint()
    gate_security()
    gate_architecture()
    gate_security_invariants()
    gate_contracts()
    gate_docs()
    gate_file_size()

    print()
    print("\u2550" * 64)

    if not FAILURES:
        print(f"{GREEN}\u2705 ALL GATES PASSED \u2014 PR may be submitted{NC}")
        if WARNINGS:
            print(f"{YELLOW}\u26a0  Warnings (non-blocking): {len(WARNINGS)}{NC}")
            for w in WARNINGS:
                print(f"  - {w}")
        sys.exit(0)
    else:
        print(f"{RED}\u274c {len(FAILURES)} GATE(S) FAILED \u2014 PR BLOCKED{NC}")
        print()
        print("Failed gates:")
        for f in FAILURES:
            print(f"  {RED}\u2717{NC} {f}")
        print()
        print("Fix all failures before submitting the PR.")
        sys.exit(1)


if __name__ == "__main__":
    main()
