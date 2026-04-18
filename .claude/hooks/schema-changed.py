#!/usr/bin/env python3
"""
Schema Changed Hook — PostToolCall
Runs after: Write to **/schema.prisma
Checks for workspace_id on new tables, reminds about migration review.
"""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
SCHEMA_FILE = REPO_ROOT / "packages" / "db" / "prisma" / "schema.prisma"

# Platform-scoped models that don't need workspace_id
PLATFORM_SCOPED = {
    "WorkflowDefinition", "ToolDefinition", "ModelDefinition", "PlanTier",
}


def main() -> None:
    if not SCHEMA_FILE.exists():
        sys.exit(0)

    print("=== Schema Change Detected ===\n")
    print("Checking for new models missing workspace_id...")

    content = SCHEMA_FILE.read_text()
    lines = content.splitlines()

    missing = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("model "):
            model_name = line.split()[1]
            if model_name in PLATFORM_SCOPED:
                i += 1
                continue

            # Scan the model block for workspace_id
            has_workspace_id = False
            j = i + 1
            while j < len(lines):
                block_line = lines[j].strip()
                if block_line == "}":
                    break
                if "workspace_id" in block_line:
                    has_workspace_id = True
                    break
                j += 1

            if not has_workspace_id:
                missing.append(model_name)
        i += 1

    if missing:
        print(f"\n\u26a0\ufe0f  SECURITY WARNING: The following models appear to be missing workspace_id:")
        for model in missing:
            print(f"   \u2192 {model}")
        print()
        print("If these models contain user/creator data, workspace_id is REQUIRED.")
        print("See CLAUDE.md Section 7 (Multi-Tenancy Invariant) and ADR-0005.")
        print()
        print("If these are platform-scoped models (shared across all tenants),")
        print("add them to PLATFORM_SCOPED in .claude/hooks/schema-changed.py")
    else:
        print("  \u2713 All new models appear to have workspace_id")

    print("\n=== Required Actions ===")
    print("1. Invoke 'db-migration-review' skill before running prisma migrate")
    print("2. Update docs/architecture/er-diagram.md to reflect schema changes")
    print("3. Update docs/specs/DOMAIN_MODEL.md if new entities were added")
    print("4. Run: npx prisma migrate dev --name {descriptive_name}")
    print()


if __name__ == "__main__":
    main()
