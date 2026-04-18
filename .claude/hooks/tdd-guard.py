#!/usr/bin/env python3
"""
TDD Guard Hook — PreToolCall
Enforces test-driven development for bendro.
Warns when implementation files under src/services/, src/app/api/**/route.ts,
src/lib/ (non-UI helpers), or src/db/ are written without a corresponding
test file.

Test conventions (bendro):
  - Unit tests for src/services/<x>.ts      → tests/unit/services/<x>.test.ts
                                          or src/services/<x>.test.ts (colocated)
  - Unit tests for src/lib/<x>.ts           → tests/unit/lib/<x>.test.ts
                                          or src/lib/<x>.test.ts
  - Integration tests for API route.ts       → tests/integration/api/<resource>.test.ts
  - BDD features (cross-cutting flows)       → tests/features/<domain>/<feature>.feature
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent


def get_file_path() -> str:
    try:
        raw = sys.stdin.read()
        if raw.strip():
            data = json.loads(raw)
            ti = data.get("tool_input", data)
            return ti.get("file_path", "")
    except (json.JSONDecodeError, EOFError):
        pass
    return ""


def is_skippable(file_path: str) -> bool:
    low = file_path.lower()
    skip_tokens = (
        "/tests/", "/test/", ".test.", ".spec.", ".feature",
        "__pycache__", ".md", ".yaml", ".yml", ".json", ".toml",
        ".sh", "/migrations/", "/drizzle/", "/seed",
        "/public/", "node_modules/",
        # component / page files — UI TDD tracked via Playwright, not this hook
        "src/app/(", "src/components/",
    )
    return any(t in low for t in skip_tokens)


def infer_resource_for_route(p: Path) -> str:
    rel = p.relative_to(REPO_ROOT) if str(p).startswith(str(REPO_ROOT)) else p
    parts = [x for x in rel.parts if not (x.startswith("[") and x.endswith("]"))]
    try:
        api_idx = parts.index("api")
    except ValueError:
        return ""
    after = parts[api_idx + 1 : -1]
    return after[0] if after else ""


def candidate_test_files(p: Path) -> list[Path]:
    """Return plausible test file locations for the given bendro source file."""
    rel = p.relative_to(REPO_ROOT) if str(p).startswith(str(REPO_ROOT)) else p
    stem = p.stem

    # API route: src/app/api/<resource>/route.ts or .../[id]/route.ts
    if re.search(r"src/app/api/.*/route\.ts$", str(rel)):
        resource = infer_resource_for_route(p)
        if not resource:
            return []
        return [
            REPO_ROOT / "tests" / "integration" / "api" / f"{resource}.test.ts",
            REPO_ROOT / "tests" / "api" / f"{resource}.test.ts",
            p.parent / "route.test.ts",
        ]

    # services or lib or db — colocated OR mirrored under tests/unit/
    for root in ("src/services", "src/lib", "src/db"):
        if str(rel).startswith(root + "/"):
            sub = str(rel)[len(root) + 1 :]
            sub_dir = Path(sub).parent
            mirrored_dir = REPO_ROOT / "tests" / "unit" / root.split("/", 1)[1] / sub_dir
            return [
                p.parent / f"{stem}.test.ts",
                p.parent / f"{stem}.spec.ts",
                p.parent / "__tests__" / f"{stem}.test.ts",
                mirrored_dir / f"{stem}.test.ts",
            ]

    return []


def main() -> None:
    file_path = get_file_path()
    if not file_path or is_skippable(file_path):
        sys.exit(0)

    p = Path(file_path)
    if p.suffix not in (".ts", ".tsx"):
        sys.exit(0)

    # Only check files under src/
    try:
        rel = p.relative_to(REPO_ROOT)
    except ValueError:
        sys.exit(0)
    if not str(rel).startswith("src/"):
        sys.exit(0)

    candidates = candidate_test_files(p)
    if not candidates:
        sys.exit(0)

    if any(c.exists() for c in candidates):
        sys.exit(0)

    primary = candidates[0]
    primary_rel = primary.relative_to(REPO_ROOT)
    print(f"""
\u26a0\ufe0f  TDD REMINDER
   Writing implementation: {rel}
   No test file found. First candidate: {primary_rel}

   Per bendro TDD policy, failing tests must be committed BEFORE implementation.

   To proceed correctly:
   1. Write the test file first (pick one of: colocated .test.ts, or tests/unit/...)
   2. Run: pnpm test — confirm it FAILS (RED)
   3. Commit failing test(s)
   4. Then write this implementation (GREEN)

   (Proceeding with write — this is a warning. pr-reviewer checks git log order.)
""")

    sys.exit(0)


if __name__ == "__main__":
    main()
