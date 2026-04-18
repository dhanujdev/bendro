#!/usr/bin/env python3
"""
Post-Migration Hook — PostToolCall
Runs after: prisma migrate dev or prisma migrate deploy.
Actions: regenerate Prisma client, validate format, log migration.
"""

import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
LOG_FILE = REPO_ROOT / "docs" / "EXECUTION_LOG.md"
SCHEMA = REPO_ROOT / "packages" / "db" / "prisma" / "schema.prisma"
MIGRATIONS_DIR = REPO_ROOT / "packages" / "db" / "prisma" / "migrations"


def run(cmd: list[str], label: str) -> bool:
    """Run a command and report success/failure."""
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(REPO_ROOT))
    if result.returncode != 0:
        print(f"ERROR: {label} failed")
        if result.stderr:
            print(result.stderr[:500])
        return False
    return True


def main() -> None:
    print("=== Post-Migration Hook Running ===")

    # Step 1: Regenerate Prisma client
    print("[1/3] Regenerating Prisma client...")
    if run(["npx", "prisma", "generate", f"--schema={SCHEMA}"], "prisma generate"):
        print("  \u2713 Prisma client regenerated")
    else:
        sys.exit(1)

    # Step 2: Validate schema format
    print("[2/3] Validating Prisma schema format...")
    result = subprocess.run(
        ["npx", "prisma", "format", "--check", f"--schema={SCHEMA}"],
        capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    if result.returncode != 0:
        print("WARNING: Schema not formatted — running format...")
        run(["npx", "prisma", "format", f"--schema={SCHEMA}"], "prisma format")
        print("  Schema reformatted. Please review and commit.")
    else:
        print("  \u2713 Schema format validated")

    # Step 3: Log migration event
    print("[3/3] Logging migration event...")
    latest_migration = "unknown"
    if MIGRATIONS_DIR.exists():
        dirs = sorted(MIGRATIONS_DIR.iterdir(), reverse=True)
        if dirs:
            latest_migration = dirs[0].name

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if LOG_FILE.exists():
        with LOG_FILE.open("a") as f:
            f.write(f"[{timestamp}] Agent: data-lead | Tool: Bash(prisma migrate) | Migration: {latest_migration}\n")
    print("  \u2713 Migration logged")

    print("\n=== Post-Migration Hook Complete ===\n")
    print("REMINDER: Update docs/architecture/er-diagram.md to reflect schema changes.")
    print("REMINDER: Invoke db-migration-review skill if not already done.")
    print("REMINDER: Run 'make test-integration' to verify migration works end-to-end.")


if __name__ == "__main__":
    main()
