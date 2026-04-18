#!/usr/bin/env python3
"""
Schema Changed Hook — PostToolCall
Runs after: Write to src/db/schema.ts

Checks that user-scoped tables include a userId column (required because
service-layer logic must always filter by the authenticated user). Reminds
about running drizzle-kit generate + migrate.
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
SCHEMA_FILE = REPO_ROOT / "src" / "db" / "schema.ts"

# Platform-scoped tables (shared catalog — no per-user filtering).
PLATFORM_SCOPED = {"stretches", "routines", "routineStretches"}

# User table itself and the NextAuth session/account tables are ownership roots
# — they don't need a userId column of their own.
OWNERSHIP_ROOT = {"users", "accounts", "verificationTokens"}


def main() -> None:
    if not SCHEMA_FILE.exists():
        sys.exit(0)

    print("=== Schema Change Detected (src/db/schema.ts) ===\n")

    content = SCHEMA_FILE.read_text()

    # Parse table declarations:  export const <name> = pgTable(
    decls = re.findall(
        r'export const (\w+)\s*=\s*pgTable\(\s*"([^"]+)"',
        content,
    )

    missing = []
    for var_name, _sql_name in decls:
        if var_name in PLATFORM_SCOPED or var_name in OWNERSHIP_ROOT:
            continue

        # Find the body of this pgTable declaration — from "pgTable(" to the
        # matching closing paren. A cheap heuristic: scan until the next
        # `export const ` or end of file.
        start = content.find(f"export const {var_name}")
        next_export = content.find("export const ", start + 1)
        block = content[start : next_export if next_export != -1 else len(content)]

        has_user_fk = bool(
            re.search(r'userId:\s*uuid\("user_id"\)\s*[\s\S]*?references\(\s*\(\)\s*=>\s*users\.id',
                      block)
        )
        if not has_user_fk:
            missing.append(var_name)

    if missing:
        print("\u26a0\ufe0f  OWNERSHIP WARNING — tables appear to be missing userId FK:")
        for t in missing:
            print(f"   \u2192 {t}")
        print()
        print("User-scoped tables MUST have a userId column referencing users(id).")
        print("See .claude/rules/SECURITY_RULES.md (Data Rules — ownership filter).")
        print()
        print("If these are platform-scoped (shared catalog), add to PLATFORM_SCOPED")
        print("in .claude/hooks/schema-changed.py.")
    else:
        print("  \u2713 All user-scoped tables have a userId FK")

    print()
    print("=== Required Actions ===")
    print("1. Invoke 'db-migration-review' skill before generating migrations")
    print("2. Run: pnpm db:generate   # creates SQL migration")
    print("3. Run: pnpm db:migrate    # applies migration to Neon/local")
    print("4. Update docs/architecture/er-diagram.md if new tables/relations added")
    print()


if __name__ == "__main__":
    main()
