#!/usr/bin/env python3
"""
Contract Guard Hook — PreToolCall
Enforces contract-first development (ADR-0001 Contract-First, bendro edition).
Runs before: Write to src/app/api/**/route.ts.
Warns if the OpenAPI spec (docs/specs/openapi/v1/bendro.yaml) does not cover
the resource inferred from the route's parent directory.
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
SPEC_FILE = REPO_ROOT / "docs" / "specs" / "openapi" / "v1" / "bendro.yaml"


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


def infer_resource(route_path: Path) -> str:
    """For src/app/api/<resource>/route.ts or .../<resource>/[id]/route.ts,
    return <resource>. Strips dynamic segments like [id]."""
    rel = route_path.relative_to(REPO_ROOT) if str(route_path).startswith(str(REPO_ROOT)) else route_path
    parts = [p for p in rel.parts if not (p.startswith("[") and p.endswith("]"))]
    try:
        api_idx = parts.index("api")
    except ValueError:
        return ""
    after = parts[api_idx + 1 : -1]  # drop trailing route.ts
    return after[0] if after else ""


def main() -> None:
    file_path = get_file_path()
    if not file_path:
        sys.exit(0)

    if not re.search(r"src/app/api/.*/route\.ts$", file_path):
        sys.exit(0)

    p = Path(file_path)
    resource = infer_resource(p)
    if not resource:
        sys.exit(0)

    spec_exists = SPEC_FILE.exists()
    spec_covers = False
    if spec_exists:
        try:
            spec_text = SPEC_FILE.read_text(encoding="utf-8")
            spec_covers = f"/{resource}" in spec_text
        except OSError:
            spec_covers = False

    if not spec_exists or not spec_covers:
        print(f"""
\u26a0\ufe0f  CONTRACT-FIRST REMINDER
   Writing to: {file_path}
   Resource: {resource}
   Expected spec: docs/specs/openapi/v1/bendro.yaml (path /{resource})

   {"The OpenAPI spec does not yet document this resource." if spec_exists else "No OpenAPI spec exists yet."}
   Per contract-first policy, the contract must be written and committed
   BEFORE route implementation.

   To proceed:
   1. Invoke 'contract-first' skill
   2. Update docs/specs/openapi/v1/bendro.yaml with the /{resource} path
   3. Commit the spec update
   4. Then continue with the route handler

   (Proceeding with write — this is a warning, not a block.)
""")

    sys.exit(0)


if __name__ == "__main__":
    main()
