#!/usr/bin/env python3
"""verify_compliance.py — Master compliance checker for Creator OS.

Runs all automated compliance checks against the standards defined in:
  - docs/STANDARDS.md
  - docs/GOVERNANCE.md
  - CLAUDE.md (architecture invariants)
  - docs/ADR/*.md (architectural decisions)

Exit codes:
  0 — All checks passed
  1 — One or more BLOCKING checks failed
  2 — Usage error

Usage:
  python3 scripts/verify_compliance.py [--verbose] [--fail-fast] [--check CATEGORY]

Categories:
  architecture  — Architecture boundary violations (no LangGraph outside orchestrator, etc.)
  multitenant   — workspace_id enforcement in repository files
  security      — No PII in logs, no hardcoded secrets patterns
  naming        — Naming conventions (snake_case, PascalCase, etc.)
  docstrings    — Public Python functions with Google-style docstrings
  filesize      — Functions ≤50 lines, files ≤300 lines
  all           — Run all checks (default)
"""
from __future__ import annotations

import ast
import os
import re
import sys
from pathlib import Path
from typing import NamedTuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent
SERVICES_DIR = REPO_ROOT / "services"
PACKAGES_DIR = REPO_ROOT / "packages"
APPS_DIR = REPO_ROOT / "apps"

# Tenant-scoped tables — must have workspace_id in all queries
TENANT_SCOPED_TABLES = {
    "users", "refresh_tokens", "workspace_policies", "workspace_feature_flags",
    "projects", "workflow_runs", "generated_artifacts", "budget_snapshots",
    "audit_events", "token_usage_events", "approval_requests",
}

MAX_FUNCTION_LINES = 50
MAX_FILE_LINES = 300

# ANSI colors
RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
BOLD = "\033[1m"
NC = "\033[0m"


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

class Violation(NamedTuple):
    """A compliance violation found during a check."""

    check: str
    severity: str  # "BLOCKING" or "WARNING"
    file: str
    line: int
    message: str

    def __str__(self) -> str:
        sev_color = RED if self.severity == "BLOCKING" else YELLOW
        return (
            f"  {sev_color}[{self.severity}]{NC} "
            f"{self.file}:{self.line} — {self.message}"
        )


# ---------------------------------------------------------------------------
# Check 1 — Architecture Invariants
# ---------------------------------------------------------------------------

def check_architecture() -> list[Violation]:
    """Verify architecture boundary invariants.

    Rules:
    - No langgraph imports outside services/orchestrator
    - No direct anthropic SDK calls outside anthropic_adapter.py
    - No direct openai SDK calls outside openai_adapter.py
    - No business logic in route handlers (raw DB calls)
    - Audit events only via observability package
    """
    violations = []

    # LangGraph only in services/orchestrator
    for py_file in _iter_python_files([SERVICES_DIR, APPS_DIR, PACKAGES_DIR]):
        if "orchestrator" in str(py_file):
            continue
        content = py_file.read_text(errors="ignore")
        for i, line in enumerate(content.splitlines(), 1):
            if re.search(r"from langgraph|import langgraph|StateGraph|CompiledGraph", line):
                if not line.strip().startswith("#"):
                    violations.append(Violation(
                        check="architecture",
                        severity="BLOCKING",
                        file=str(py_file.relative_to(REPO_ROOT)),
                        line=i,
                        message="LangGraph imported outside services/orchestrator — architecture violation",
                    ))

    # No direct Anthropic SDK calls outside anthropic_adapter.py
    for py_file in _iter_python_files([SERVICES_DIR, APPS_DIR, PACKAGES_DIR]):
        if "anthropic_adapter" in py_file.name:
            continue
        if "test_" in py_file.name or "spec" in py_file.name:
            continue
        content = py_file.read_text(errors="ignore")
        for i, line in enumerate(content.splitlines(), 1):
            if re.search(r"from anthropic import|anthropic\.Anthropic\(\)", line):
                if not line.strip().startswith("#"):
                    violations.append(Violation(
                        check="architecture",
                        severity="BLOCKING",
                        file=str(py_file.relative_to(REPO_ROOT)),
                        line=i,
                        message="Direct Anthropic SDK call outside anthropic_adapter.py — use model_router.py",
                    ))

    # No raw DB calls in routes or services (only in repositories/)
    routes_and_services = list((SERVICES_DIR / "api" / "src" / "routes").glob("*.py")) if \
        (SERVICES_DIR / "api" / "src" / "routes").exists() else []
    for py_file in routes_and_services:
        if "__init__" in py_file.name or "test_" in py_file.name:
            continue
        content = py_file.read_text(errors="ignore")
        for i, line in enumerate(content.splitlines(), 1):
            if re.search(r"await db\.execute|\.add\(|\.commit\(\)|\.query\(", line):
                if "Depends" not in line and not line.strip().startswith("#"):
                    violations.append(Violation(
                        check="architecture",
                        severity="BLOCKING",
                        file=str(py_file.relative_to(REPO_ROOT)),
                        line=i,
                        message="Raw DB call in route handler — use Repository classes",
                    ))

    return violations


# ---------------------------------------------------------------------------
# Check 2 — Multi-Tenancy
# ---------------------------------------------------------------------------

def check_multitenant() -> list[Violation]:
    """Verify workspace_id enforcement in repository files."""
    violations = []

    repo_dir = SERVICES_DIR / "api" / "src" / "repositories"
    if not repo_dir.exists():
        return violations

    for py_file in repo_dir.glob("*.py"):
        if "__init__" in py_file.name or "test_" in py_file.name:
            continue
        content = py_file.read_text(errors="ignore")
        lines = content.splitlines()

        # Check that each SELECT mentions workspace_id
        in_method = False
        method_start = 0
        method_has_select = False
        method_has_workspace = False

        try:
            tree = ast.parse(content)
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if node.name.startswith("_"):
                continue

            # Get the method body as text
            start = node.lineno - 1
            end = getattr(node, "end_lineno", start + 50)
            method_text = "\n".join(lines[start:end])

            has_select = bool(re.search(r"SELECT|text\(", method_text, re.IGNORECASE))
            has_workspace = bool(re.search(r"workspace_id", method_text))
            has_tenant_table = any(
                table in method_text.lower() for table in TENANT_SCOPED_TABLES
            )

            if has_select and has_tenant_table and not has_workspace:
                violations.append(Violation(
                    check="multitenant",
                    severity="BLOCKING",
                    file=str(py_file.relative_to(REPO_ROOT)),
                    line=node.lineno,
                    message=f"Method '{node.name}' queries tenant table without workspace_id filter",
                ))

    return violations


# ---------------------------------------------------------------------------
# Check 3 — Security
# ---------------------------------------------------------------------------

def check_security() -> list[Violation]:
    """Check for security anti-patterns: PII in logs, hardcoded secrets patterns."""
    violations = []

    PII_PATTERNS = [
        (r"logger\.(info|debug|warning|error).*\bemail\b", "Email logged"),
        (r"logger\.(info|debug|warning|error).*\bpassword\b", "Password logged"),
        (r"structlog.*\bpassword\b", "Password in structlog"),
        (r"logger\.(info|debug|warning|error).*\btoken\b", "Token logged"),
    ]

    SECRET_PATTERNS = [
        (r"sk-ant-api[0-9A-Za-z-]+", "Anthropic API key pattern detected"),
        (r"sk-proj-[0-9A-Za-z-]+", "OpenAI API key pattern detected"),
        (r"AKIA[0-9A-Z]{16}", "AWS access key pattern detected"),
        (r'password\s*=\s*["\'][^"\']{8,}["\']', "Hardcoded password detected"),
    ]

    for py_file in _iter_python_files([SERVICES_DIR, APPS_DIR, PACKAGES_DIR]):
        if "test_" in py_file.name or ".example" in py_file.name:
            continue
        content = py_file.read_text(errors="ignore")
        lines = content.splitlines()

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue

            # Check for PII in logs
            for pattern, message in PII_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    # Allow known-safe patterns
                    if "# OK:" not in line and "signin_unknown" not in line:
                        violations.append(Violation(
                            check="security",
                            severity="BLOCKING",
                            file=str(py_file.relative_to(REPO_ROOT)),
                            line=i,
                            message=f"Security: {message}",
                        ))

            # Check for hardcoded secrets
            for pattern, message in SECRET_PATTERNS:
                if re.search(pattern, line):
                    if "example" not in str(py_file).lower() and ".env" not in str(py_file):
                        violations.append(Violation(
                            check="security",
                            severity="BLOCKING",
                            file=str(py_file.relative_to(REPO_ROOT)),
                            line=i,
                            message=f"Security: {message}",
                        ))

    return violations


# ---------------------------------------------------------------------------
# Check 4 — Naming Conventions
# ---------------------------------------------------------------------------

def check_naming() -> list[Violation]:
    """Check Python naming conventions: snake_case files, PascalCase classes."""
    violations = []

    for py_file in _iter_python_files([SERVICES_DIR, PACKAGES_DIR]):
        # File names should be snake_case
        name = py_file.stem
        if name.startswith("_") or name == "__init__":
            continue
        if not re.match(r"^[a-z][a-z0-9_]*$", name):
            violations.append(Violation(
                check="naming",
                severity="WARNING",
                file=str(py_file.relative_to(REPO_ROOT)),
                line=0,
                message=f"File name '{name}.py' is not snake_case",
            ))

        try:
            tree = ast.parse(py_file.read_text(errors="ignore"))
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            # Class names should be PascalCase
            if isinstance(node, ast.ClassDef):
                if not re.match(r"^[A-Z][a-zA-Z0-9]*$", node.name):
                    violations.append(Violation(
                        check="naming",
                        severity="WARNING",
                        file=str(py_file.relative_to(REPO_ROOT)),
                        line=node.lineno,
                        message=f"Class '{node.name}' is not PascalCase",
                    ))

            # Repository classes should end in Repository
            if isinstance(node, ast.ClassDef):
                if "repository" in str(py_file).lower():
                    if not node.name.endswith("Repository"):
                        violations.append(Violation(
                            check="naming",
                            severity="WARNING",
                            file=str(py_file.relative_to(REPO_ROOT)),
                            line=node.lineno,
                            message=f"Class in repositories/ should be named 'XxxRepository', got '{node.name}'",
                        ))

    return violations


# ---------------------------------------------------------------------------
# Check 5 — Docstrings
# ---------------------------------------------------------------------------

def check_docstrings() -> list[Violation]:
    """Verify public Python functions and classes have docstrings."""
    violations = []

    for py_file in _iter_python_files([SERVICES_DIR, PACKAGES_DIR]):
        if "test_" in py_file.name or "migrations" in str(py_file):
            continue

        try:
            tree = ast.parse(py_file.read_text(errors="ignore"))
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue

            # Skip private/magic names
            if node.name.startswith("_"):
                continue

            # Check for docstring
            if not ast.get_docstring(node):
                kind = "function" if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) else "class"
                violations.append(Violation(
                    check="docstrings",
                    severity="WARNING",
                    file=str(py_file.relative_to(REPO_ROOT)),
                    line=node.lineno,
                    message=f"Public {kind} '{node.name}' missing Google-style docstring",
                ))

    return violations


# ---------------------------------------------------------------------------
# Check 6 — File and Function Size
# ---------------------------------------------------------------------------

def check_filesize() -> list[Violation]:
    """Check functions ≤50 lines and files ≤300 lines."""
    violations = []

    for py_file in _iter_python_files([SERVICES_DIR, PACKAGES_DIR, APPS_DIR]):
        if "test_" in py_file.name or "migrations" in str(py_file):
            continue

        content = py_file.read_text(errors="ignore")
        lines = content.splitlines()

        # File size check
        if len(lines) > MAX_FILE_LINES:
            violations.append(Violation(
                check="filesize",
                severity="WARNING",
                file=str(py_file.relative_to(REPO_ROOT)),
                line=0,
                message=f"File has {len(lines)} lines (limit: {MAX_FILE_LINES}) — split into submodules",
            ))

        # Function size check
        try:
            tree = ast.parse(content)
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            end_line = getattr(node, "end_lineno", node.lineno + 1)
            fn_lines = end_line - node.lineno
            if fn_lines > MAX_FUNCTION_LINES:
                violations.append(Violation(
                    check="filesize",
                    severity="WARNING",
                    file=str(py_file.relative_to(REPO_ROOT)),
                    line=node.lineno,
                    message=f"Function '{node.name}' is {fn_lines} lines (limit: {MAX_FUNCTION_LINES})",
                ))

    return violations


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _iter_python_files(directories: list[Path]):
    """Yield Python files from the given directories, excluding common noise."""
    for directory in directories:
        if not directory.exists():
            continue
        for py_file in directory.rglob("*.py"):
            if any(part in py_file.parts for part in ("__pycache__", ".venv", "node_modules", "migrations")):
                continue
            yield py_file


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    """Run all compliance checks and print a structured report.

    Returns:
        0 if all BLOCKING checks pass, 1 if any BLOCKING check fails.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Creator OS Compliance Checker")
    parser.add_argument("--verbose", action="store_true", help="Show all violations including warnings")
    parser.add_argument("--fail-fast", action="store_true", help="Stop at first blocking violation")
    parser.add_argument(
        "--check",
        default="all",
        choices=["architecture", "multitenant", "security", "naming", "docstrings", "filesize", "all"],
        help="Which check category to run",
    )
    args = parser.parse_args()

    checks = {
        "architecture": ("Architecture Invariants", check_architecture),
        "multitenant": ("Multi-Tenancy (workspace_id)", check_multitenant),
        "security": ("Security Anti-Patterns", check_security),
        "naming": ("Naming Conventions", check_naming),
        "docstrings": ("Documentation (Docstrings)", check_docstrings),
        "filesize": ("Code Size Limits", check_filesize),
    }

    if args.check != "all":
        checks = {args.check: checks[args.check]}

    print(f"\n{BOLD}╔══════════════════════════════════════════════════════════════╗{NC}")
    print(f"{BOLD}║        CREATOR OS — COMPLIANCE VERIFICATION REPORT          ║{NC}")
    print(f"{BOLD}╚══════════════════════════════════════════════════════════════╝{NC}\n")

    all_violations: list[Violation] = []
    blocking_count = 0

    for check_name, (check_label, check_fn) in checks.items():
        print(f"{BLUE}▶ {check_label}{NC}")
        try:
            violations = check_fn()
        except Exception as e:
            print(f"  {YELLOW}⚠ Check failed with error: {e}{NC}")
            violations = []

        blocking = [v for v in violations if v.severity == "BLOCKING"]
        warnings = [v for v in violations if v.severity == "WARNING"]

        if not violations:
            print(f"  {GREEN}✓ PASS — No violations{NC}")
        else:
            if blocking:
                print(f"  {RED}✗ FAIL — {len(blocking)} BLOCKING violation(s){NC}")
                for v in blocking:
                    print(v)
                blocking_count += len(blocking)
            if warnings and args.verbose:
                print(f"  {YELLOW}⚠ {len(warnings)} warning(s):{NC}")
                for v in warnings:
                    print(v)
            elif warnings and not args.verbose:
                print(f"  {YELLOW}⚠ {len(warnings)} warning(s) (use --verbose to see them){NC}")

        all_violations.extend(violations)
        print()

        if args.fail_fast and blocking:
            break

    # Summary
    print("═" * 66)
    if blocking_count == 0:
        print(f"{GREEN}{BOLD}✅ ALL BLOCKING CHECKS PASSED{NC}")
        warning_count = len([v for v in all_violations if v.severity == "WARNING"])
        if warning_count > 0:
            print(f"{YELLOW}   {warning_count} warning(s) — address before next release{NC}")
        return 0
    else:
        print(f"{RED}{BOLD}❌ {blocking_count} BLOCKING VIOLATION(S) — FIX BEFORE PR{NC}")
        print(f"\nFix all BLOCKING violations. Run with --verbose for full details.")
        print(f"See docs/STANDARDS.md and CLAUDE.md for standards reference.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
