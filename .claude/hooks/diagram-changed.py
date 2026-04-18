#!/usr/bin/env python3
"""
Diagram Changed Hook — PostToolCall
Runs after: Write to docs/architecture/**
Validates Mermaid syntax, reminds about accuracy.
"""

import json
import re
import subprocess
import sys
import tempfile
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
        # Fallback: find most recently modified architecture doc
        arch_dir = REPO_ROOT / "docs" / "architecture"
        if arch_dir.exists():
            md_files = sorted(arch_dir.glob("*.md"), key=lambda f: f.stat().st_mtime, reverse=True)
            if md_files:
                file_path = str(md_files[0])

    if not file_path or not Path(file_path).exists():
        sys.exit(0)

    p = Path(file_path)
    print(f"=== Architecture Diagram Updated: {p.name} ===\n")

    content = p.read_text()
    blocks = re.findall(r"```mermaid\n(.*?)```", content, re.DOTALL)

    if blocks:
        print(f"Found {len(blocks)} Mermaid diagram(s) — validating syntax...")

        # Try mermaid-cli validation
        try:
            subprocess.run(
                ["npx", "--yes", "@mermaid-js/mermaid-cli", "--version"],
                capture_output=True, check=True,
            )
            errors = []
            for i, block in enumerate(blocks, 1):
                with tempfile.NamedTemporaryFile(mode="w", suffix=".mmd", delete=False) as tmp:
                    tmp.write(block)
                    tmp_path = tmp.name

                result = subprocess.run(
                    ["npx", "--yes", "@mermaid-js/mermaid-cli", "-i", tmp_path, "-o", "/dev/null"],
                    capture_output=True, text=True,
                )
                Path(tmp_path).unlink(missing_ok=True)

                if result.returncode != 0:
                    errors.append(f"Block {i}: {result.stderr[:200]}")

            if errors:
                print("  \u2717 Mermaid validation errors:")
                for e in errors:
                    print(f"    {e}")
            else:
                print(f"  \u2713 All {len(blocks)} Mermaid diagram(s) validated successfully")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("  (mermaid-cli not available — skipping syntax validation)")

    print("\nDiagram accuracy checklist:")
    print("  [ ] Diagram reflects current code (not aspirational future state)")
    print("  [ ] All service/package names match actual directory names")
    print("  [ ] Relationships are labelled with protocol (HTTP, SQL, events, etc.)")
    print("  [ ] Async flows use dashed arrows (---->)")
    print("  [ ] Last-updated date comment updated in the file")
    print()


if __name__ == "__main__":
    main()
