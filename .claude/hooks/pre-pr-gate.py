#!/usr/bin/env python3
"""
Pre-PR Gate Hook — PreToolCall
Enterprise standards gate executed before any PR submission.

Trigger: PreToolCall — runs when Claude attempts gh pr create
This hook BLOCKS the PR if any mandatory gate fails.

Tailored for bendro (Next.js 16 / TypeScript / Drizzle / NextAuth / Stripe).
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


def run(cmd: str) -> tuple[int, str]:
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    return result.returncode, result.stdout + result.stderr


def has_cmd(name: str) -> bool:
    return subprocess.run(["which", name], capture_output=True).returncode == 0


def gate_lint() -> None:
    section("Gate 1: Lint & Typecheck")

    if (REPO_ROOT / "pnpm-lock.yaml").exists() and has_cmd("pnpm"):
        rc, _ = run("pnpm lint --silent 2>/dev/null")
        ok("ESLint") if rc == 0 else fail("ESLint — run: pnpm lint")

        rc, _ = run("pnpm typecheck --silent 2>/dev/null")
        ok("TypeScript (tsc --noEmit)") if rc == 0 else fail("TypeScript — run: pnpm typecheck")
    else:
        warn("pnpm not available — skipping lint & typecheck")


def gate_security() -> None:
    section("Gate 2: Security Scan")

    if has_cmd("detect-secrets") and (REPO_ROOT / ".secrets.baseline").exists():
        rc, _ = run("detect-secrets scan --baseline .secrets.baseline 2>/dev/null")
        ok("detect-secrets — no new secrets") if rc == 0 else fail("detect-secrets — new secrets detected")
    else:
        warn("detect-secrets not configured — skipping")

    if has_cmd("pnpm"):
        rc, out = run("pnpm audit --prod --audit-level=high --json 2>/dev/null")
        # pnpm audit exits non-zero on findings; parse output lightly
        if rc == 0:
            ok("pnpm audit — 0 high/critical")
        else:
            high = out.count('"severity":"high"') + out.count('"severity":"critical"')
            if high:
                fail(f"pnpm audit — {high} high/critical findings")
            else:
                ok("pnpm audit — 0 high/critical (non-zero exit ignored)")

    rc, out = run(
        'grep -rnE "sk-ant-|sk-proj-|AKIA[0-9A-Z]{16}|whsec_live_" '
        "src/ --include='*.ts' --include='*.tsx' 2>/dev/null "
        "| grep -v 'example\\|\\.test\\.\\|\\.spec\\.' | head -5"
    )
    if rc == 0 and out.strip():
        fail("Potential hardcoded credentials detected — review src/")
    else:
        ok("No hardcoded credential patterns in src/")


def gate_architecture() -> None:
    section("Gate 3: Architecture Invariants")

    # Drizzle ORM only in src/services/ and src/db/
    rc, out = run(
        'grep -rnE "from \\"drizzle-orm|from \\"@neondatabase" '
        "src/ --include='*.ts' --include='*.tsx' 2>/dev/null "
        "| grep -vE 'src/services/|src/db/|src/lib/data\\.ts|\\.test\\.|\\.spec\\.' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("Drizzle imported only in src/services/ and src/db/")
    else:
        fail(f"Drizzle imported outside services/db ({count} violations)")

    # MediaPipe only in src/lib/pose and camera components
    rc, out = run(
        'grep -rnE "from \\"@mediapipe" '
        "src/ --include='*.ts' --include='*.tsx' 2>/dev/null "
        "| grep -vE 'src/lib/pose/|src/app/player/|src/components/.*camera' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("MediaPipe imported only in pose/camera modules")
    else:
        fail(f"MediaPipe imported outside pose/camera modules ({count} violations)")

    # Stripe only in src/services/billing.ts and src/app/api/webhooks/stripe
    rc, out = run(
        'grep -rnE "from \\"stripe" '
        "src/ --include='*.ts' --include='*.tsx' 2>/dev/null "
        "| grep -vE 'src/services/billing\\.ts|src/app/api/webhooks/stripe|\\.test\\.|\\.spec\\.' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("Stripe SDK contained in billing.ts / webhook route")
    else:
        fail(f"Stripe imported outside billing.ts ({count} violations)")

    # Drizzle must not appear directly in routes
    rc, out = run(
        'grep -rnE "drizzle-orm|@neondatabase" '
        "src/app/api/ --include='*.ts' 2>/dev/null | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("Route handlers do not touch Drizzle directly")
    else:
        fail(f"Route handler imports Drizzle directly ({count} violations)")


def gate_security_invariants() -> None:
    section("Gate 4: Security Invariants")

    # userId from NextAuth session only, never from body
    rc, out = run(
        'grep -rnE "body\\.userId|req\\.body\\.userId|data\\.userId" '
        "src/app/api/ --include='*.ts' 2>/dev/null "
        "| grep -v '\\.test\\.\\|\\.spec\\.' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("userId never read from request body")
    else:
        fail(f"userId read from request body ({count} occurrences) — must come from NextAuth session")

    # No PII in console.log
    rc, out = run(
        'grep -rnE "console\\.log\\([^)]*\\b(email|password|token)\\b" '
        "src/ --include='*.ts' --include='*.tsx' 2>/dev/null "
        "| grep -v '\\.test\\.\\|\\.spec\\.' | wc -l"
    )
    count = int(out.strip() or "0")
    if count == 0:
        ok("No PII/secret names in console.log")
    else:
        fail(f"PII detected in console.log ({count} occurrences)")


def gate_contracts() -> None:
    section("Gate 5: Contract-First (OpenAPI)")

    spec = REPO_ROOT / "docs" / "specs" / "openapi" / "v1" / "bendro.yaml"
    if not spec.exists():
        fail("docs/specs/openapi/v1/bendro.yaml missing — write contract before routes")
        return

    spec_text = spec.read_text(encoding="utf-8")
    routes_dir = REPO_ROOT / "src" / "app" / "api"
    if not routes_dir.exists():
        ok("No API routes yet")
        return

    resources = set()
    for route in routes_dir.rglob("route.ts"):
        rel = route.relative_to(REPO_ROOT)
        parts = [p for p in rel.parts if not (p.startswith("[") and p.endswith("]"))]
        try:
            i = parts.index("api")
            after = parts[i + 1 : -1]
            if after:
                resources.add(after[0])
        except ValueError:
            continue

    missing = [r for r in sorted(resources) if f"/{r}" not in spec_text]
    if not missing:
        ok(f"OpenAPI spec covers all {len(resources)} resource(s)")
    else:
        fail(f"OpenAPI spec missing paths: {', '.join(missing)}")


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
    section("Gate 7: Code Size Limits (≤ 300 lines)")

    large_files = []
    search_dir = REPO_ROOT / "src"
    if search_dir.exists():
        for f in search_dir.rglob("*.ts"):
            if any(x in str(f) for x in ("node_modules", ".test.", ".spec.")):
                continue
            try:
                line_count = len(f.read_text().splitlines())
                if line_count > 300:
                    large_files.append((f.relative_to(REPO_ROOT), line_count))
            except (OSError, UnicodeDecodeError):
                pass
        for f in search_dir.rglob("*.tsx"):
            if any(x in str(f) for x in ("node_modules", ".test.", ".spec.")):
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
    print("\u2551        BENDRO \u2014 ENTERPRISE STANDARDS PRE-PR GATE           \u2551")
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
