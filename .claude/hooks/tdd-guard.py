#!/usr/bin/env python3
"""
TDD Guard Hook — PreToolCall
Enforces test-driven development (ADR-0014).
Warns when implementation files are written without corresponding test files.
"""

import json
import re
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

    # Skip non-source files
    skip_patterns = (
        "test", "spec", "feature", "__pycache__",
        ".md", ".yaml", ".json", ".toml", ".sh", "migration",
    )
    if any(pat in file_path.lower() for pat in skip_patterns):
        sys.exit(0)

    p = Path(file_path)

    # Python source files in services
    if re.search(r"services/.*/src/.*\.py$", file_path):
        filename = p.stem
        # Derive test directory
        rel = str(p.relative_to(REPO_ROOT)) if file_path.startswith(str(REPO_ROOT)) else file_path
        parts = rel.split("/src/")
        if len(parts) >= 2:
            test_dir = REPO_ROOT / parts[0] / "tests"
        else:
            test_dir = p.parent.parent / "tests"

        test_file = test_dir / f"test_{filename}.py"
        test_file_alt = test_dir / "unit" / f"test_{filename}.py"

        if not test_file.exists() and not test_file_alt.exists():
            print(f"""
\u26a0\ufe0f  TDD REMINDER (ADR-0014)
   Writing implementation: {rel}
   Expected test file: {test_dir.relative_to(REPO_ROOT)}/test_{filename}.py

   Per ADR-0014, failing tests must be committed BEFORE implementation.
   The test file does not exist yet.

   To proceed correctly:
   1. Write the test file first
   2. Run tests to confirm they FAIL (RED phase)
   3. Commit failing tests
   4. Then write this implementation (GREEN phase)

   (Proceeding with write — this is a warning. PR reviewer will check git log order.)
""")

    # TypeScript source files
    if re.search(r"(services|packages|apps)/.*/src/.*\.(ts|tsx)$", file_path):
        if not re.search(r"\.(test|spec)\.(ts|tsx)$", file_path):
            filename = p.stem
            dirname = p.parent

            candidates = [
                dirname / "__tests__" / f"{filename}.test.ts",
                dirname / f"{filename}.test.ts",
                dirname / f"{filename}.spec.ts",
            ]

            if not any(c.exists() for c in candidates):
                print(f"""
\u26a0\ufe0f  TDD REMINDER (ADR-0014)
   Writing implementation: {p.name}
   No test file found (checked: .test.ts, .spec.ts, __tests__/)

   Write failing tests BEFORE this implementation.
   (Proceeding — PR reviewer will check git log order.)
""")

    sys.exit(0)


if __name__ == "__main__":
    main()
