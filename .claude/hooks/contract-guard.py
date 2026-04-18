#!/usr/bin/env python3
"""
Contract Guard Hook — PreToolCall
Enforces contract-first development (ADR-0013).
Runs before: Write to **/routes/** or **/endpoints/**
Warns if no corresponding OpenAPI spec exists.
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent


def get_file_path() -> str:
    """Extract file_path from Claude Code hook JSON stdin."""
    try:
        raw = sys.stdin.read()
        if raw.strip():
            data = json.loads(raw)
            ti = data.get("tool_input", data)
            return ti.get("file_path", "")
    except (json.JSONDecodeError, EOFError):
        pass
    return ""


def main() -> None:
    file_path = get_file_path()
    if not file_path:
        sys.exit(0)

    p = Path(file_path)

    # Only check routes and endpoint files
    parts_str = str(p)
    if not any(d in parts_str for d in ("routes/", "endpoints/", "routers/")):
        sys.exit(0)
    if p.suffix not in (".py", ".ts"):
        sys.exit(0)

    # Extract resource name from file name
    basename = p.stem  # e.g. "approvals" from "approvals.py"
    for suffix in ("_router", "_endpoint", "_routes"):
        if basename.endswith(suffix):
            basename = basename[: -len(suffix)]
    basename = basename.replace("_", "-")

    # Check for OpenAPI spec
    specs_dir = REPO_ROOT / "docs" / "specs" / "openapi" / "v1"
    spec_file = specs_dir / f"{basename}.yaml"
    spec_file_plural = specs_dir / f"{basename}s.yaml"

    if not spec_file.exists() and not spec_file_plural.exists():
        print(f"""
\u26a0\ufe0f  CONTRACT-FIRST REMINDER (ADR-0013)
   Writing to: {file_path}
   Expected spec: docs/specs/openapi/v1/{basename}.yaml

   No OpenAPI contract spec found for '{basename}'.
   Per ADR-0013, the contract must be written and committed BEFORE implementation.

   To proceed:
   1. Invoke 'contract-first' skill
   2. Write docs/specs/openapi/v1/{basename}.yaml
   3. Commit the spec: git commit -m 'docs(contracts): add OpenAPI spec for {basename}'
   4. Then continue with implementation

   (Proceeding with write — this is a warning, not a block)
""")

    sys.exit(0)


if __name__ == "__main__":
    main()
