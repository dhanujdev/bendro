#!/usr/bin/env python3
"""sync-orchestrator.py — Keeps the /orchestrate command manifest in sync.

Trigger: PostToolCall for Write operations on any file in .claude/

When a new agent, skill, hook, or command is added/removed:
1. Scans .claude/agents/, .claude/skills/, .claude/hooks/, .claude/commands/
2. Extracts name and description from each file's YAML frontmatter
3. Updates the manifest sections in .claude/commands/orchestrate.md
4. Logs the sync to docs/EXECUTION_LOG.md

This ensures the /orchestrate command always knows about every available capability.
"""
from __future__ import annotations

import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(os.environ.get("REPO_ROOT", "."))
ORCHESTRATE_CMD = REPO_ROOT / ".claude" / "commands" / "orchestrate.md"
EXECUTION_LOG = REPO_ROOT / "docs" / "EXECUTION_LOG.md"


def read_frontmatter(file_path: Path) -> dict:
    """Extract YAML frontmatter from a markdown file.

    Args:
        file_path: Path to the markdown file.

    Returns:
        Dict with 'name' and 'description' keys if frontmatter found, empty dict otherwise.
    """
    try:
        content = file_path.read_text()
        if not content.startswith("---"):
            # No frontmatter — derive name from filename
            return {"name": file_path.stem, "description": ""}

        end = content.find("---", 3)
        if end == -1:
            return {"name": file_path.stem, "description": ""}

        front = content[3:end].strip()
        result = {}
        for line in front.split("\n"):
            if ":" in line:
                key, _, value = line.partition(":")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key in ("name", "description"):
                    result[key] = value

        if "name" not in result:
            result["name"] = file_path.stem

        # Handle multi-line description (>)
        if result.get("description", "").startswith(">"):
            # Strip the > and trim
            result["description"] = result["description"][1:].strip()

        return result
    except (OSError, UnicodeDecodeError):
        return {"name": file_path.stem, "description": ""}


def scan_directory(directory: Path, extension: str = ".md") -> list[dict]:
    """Scan a directory for agent/skill/hook files and extract metadata.

    Args:
        directory: Directory to scan.
        extension: File extension to look for.

    Returns:
        List of dicts with 'name', 'description', 'file' keys.
    """
    if not directory.exists():
        return []

    results = []
    for f in sorted(directory.glob(f"*{extension}")):
        if f.name.startswith("_") or f.name.startswith("."):
            continue
        meta = read_frontmatter(f)
        meta["file"] = f.name
        results.append(meta)
    return results


def build_section(items: list[dict], prefix: str = "-") -> str:
    """Build a markdown list section from items.

    Args:
        items: List of dicts with 'name' and 'description'.
        prefix: List item prefix.

    Returns:
        Formatted markdown list string.
    """
    lines = []
    for item in items:
        name = item.get("name", item.get("file", "unknown"))
        desc = item.get("description", "")
        if desc:
            lines.append(f"- `{name}` — {desc}")
        else:
            lines.append(f"- `{name}`")
    return "\n".join(lines) if lines else "- (none yet)"


def update_section(content: str, section_name: str, new_content: str) -> str:
    """Replace a tagged section in the orchestrate.md content.

    Args:
        content: Full file content.
        section_name: Tag name (e.g., 'AGENTS', 'SKILLS', 'HOOKS').
        new_content: New content to place between the tags.

    Returns:
        Updated content string.
    """
    start_tag = f"<!-- {section_name}_START -->"
    end_tag = f"<!-- {section_name}_END -->"

    start_idx = content.find(start_tag)
    end_idx = content.find(end_tag)

    if start_idx == -1 or end_idx == -1:
        return content

    before = content[:start_idx + len(start_tag)]
    after = content[end_idx:]
    return f"{before}\n{new_content}\n{after}"


def main() -> None:
    """Scan all .claude/ subdirectories and update the orchestrator manifest."""
    if not ORCHESTRATE_CMD.exists():
        print(f"sync-orchestrator: {ORCHESTRATE_CMD} not found — skipping")
        return

    claude_dir = REPO_ROOT / ".claude"

    agents = scan_directory(claude_dir / "agents")
    skills = scan_directory(claude_dir / "skills")
    hooks_md = scan_directory(claude_dir / "hooks")
    hooks_sh = scan_directory(claude_dir / "hooks", extension=".sh")
    hooks_py = scan_directory(claude_dir / "hooks", extension=".py")
    all_hooks = hooks_md + hooks_sh + hooks_py

    content = ORCHESTRATE_CMD.read_text()
    content = update_section(content, "AGENTS", build_section(agents))
    content = update_section(content, "SKILLS", build_section(skills))
    content = update_section(content, "HOOKS", build_section(all_hooks))

    # Update timestamp
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    content = re.sub(
        r"\*Last updated: \d{4}-\d{2}-\d{2}\*",
        f"*Last updated: {now}*",
        content,
    )

    ORCHESTRATE_CMD.write_text(content)

    # Log the sync
    if EXECUTION_LOG.exists():
        timestamp = datetime.now(timezone.utc).isoformat()
        log_entry = (
            f"\n[{timestamp}] Hook: sync-orchestrator | "
            f"Action: Synced orchestrator manifest — "
            f"{len(agents)} agents, {len(skills)} skills, {len(all_hooks)} hooks\n"
        )
        with EXECUTION_LOG.open("a") as f:
            f.write(log_entry)

    print(
        f"sync-orchestrator: Updated orchestrate.md — "
        f"{len(agents)} agents, {len(skills)} skills, {len(all_hooks)} hooks"
    )


if __name__ == "__main__":
    main()
