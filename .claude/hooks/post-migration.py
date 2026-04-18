#!/usr/bin/env python3
"""
Post-Migration Hook — PostToolCall
Runs after: pnpm db:generate / pnpm db:migrate (drizzle-kit).
Actions: verify drizzle output exists, log migration event.
"""

import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
LOG_FILE = REPO_ROOT / "docs" / "EXECUTION_LOG.md"
SCHEMA = REPO_ROOT / "src" / "db" / "schema.ts"
MIGRATIONS_DIR = REPO_ROOT / "src" / "db" / "migrations"


def run(cmd: list[str], label: str) -> bool:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(REPO_ROOT))
    if result.returncode != 0:
        print(f"ERROR: {label} failed")
        if result.stderr:
            print(result.stderr[:500])
        return False
    return True


def main() -> None:
    print("=== Post-Migration Hook Running ===")

    if not SCHEMA.exists():
        print(f"WARNING: {SCHEMA.relative_to(REPO_ROOT)} not found — skipping")
        sys.exit(0)

    print("[1/2] Checking Drizzle migrations output...")
    if MIGRATIONS_DIR.exists():
        sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"), reverse=True)
        if sql_files:
            print(f"  \u2713 Migrations dir has {len(sql_files)} SQL file(s); latest: {sql_files[0].name}")
            latest = sql_files[0].stem
        else:
            print("  WARNING: No .sql files found in src/db/migrations/")
            latest = "unknown"
    else:
        print("  NOTE: src/db/migrations/ not yet created (run `pnpm db:generate`)")
        latest = "none"

    print("[2/2] Logging migration event...")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if LOG_FILE.exists():
        with LOG_FILE.open("a") as f:
            f.write(
                f"[{timestamp}] Agent: backend-lead | Tool: Bash(pnpm db:generate/migrate) | Migration: {latest}\n"
            )
    print("  \u2713 Migration logged")

    print("\n=== Post-Migration Hook Complete ===\n")
    print("REMINDER: Update docs/architecture/er-diagram.md if the schema shape changed.")
    print("REMINDER: Invoke db-migration-review skill if not already done.")
    print("REMINDER: Run `pnpm test` to verify integration still passes.")


if __name__ == "__main__":
    main()
