#!/usr/bin/env python3
"""
Action Logger Hook — PostToolCall

Logs every Claude Code tool call to docs/EXECUTION_LOG.md.
This hook runs after every tool execution and appends a structured log entry.

Triggered by: PostToolCall (all tools)
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
LOG_FILE = REPO_ROOT / "docs" / "EXECUTION_LOG.md"


def get_tool_info() -> dict:
    """Parse tool call information from stdin (passed by Claude Code hook system)."""
    try:
        raw = sys.stdin.read()
        if raw.strip():
            return json.loads(raw)
    except (json.JSONDecodeError, EOFError):
        pass
    return {}


def format_log_entry(tool_info: dict) -> str:
    """Format a single log entry for EXECUTION_LOG.md."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tool_name = tool_info.get("tool_name", tool_info.get("tool", "Unknown"))
    agent = os.environ.get("CLAUDE_AGENT_NAME", "claude")

    # Extract relevant detail based on tool type
    detail = ""
    params = tool_info.get("tool_input", tool_info.get("params", {}))

    if tool_name == "Write":
        file_path = params.get("file_path", "")
        content = params.get("content", "")
        lines = len(content.splitlines()) if content else 0
        try:
            rel_path = str(Path(file_path).relative_to(REPO_ROOT))
        except ValueError:
            rel_path = file_path
        detail = f"File: {rel_path} | Lines: {lines}"

    elif tool_name == "Edit":
        file_path = params.get("file_path", "")
        try:
            rel_path = str(Path(file_path).relative_to(REPO_ROOT))
        except ValueError:
            rel_path = file_path
        detail = f"File: {rel_path}"

    elif tool_name == "Bash":
        command = params.get("command", "")
        # Truncate long commands
        detail = f"Command: {command[:120]}{'...' if len(command) > 120 else ''}"

    elif tool_name in ("Read", "Glob", "Grep"):
        path = params.get("file_path", params.get("pattern", params.get("pattern", "")))
        detail = f"Path: {path}"

    elif tool_name == "Agent":
        agent_type = params.get("subagent_type", "general-purpose")
        desc = params.get("description", "")
        detail = f"Subagent: {agent_type} | {desc}"

    entry = f"[{timestamp}] Agent: {agent} | Tool: {tool_name}"
    if detail:
        entry += f" | {detail}"

    return entry + "\n"


def ensure_log_file_exists() -> None:
    """Create EXECUTION_LOG.md with header if it doesn't exist."""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not LOG_FILE.exists():
        LOG_FILE.write_text(
            "# Execution Log\n\n"
            "> Append-only log of all agent actions. Maintained automatically by action-logger hook.\n"
            "> Do not manually edit this file. Use session-handoff skill to add session summaries.\n\n"
            "---\n\n"
        )


def append_log_entry(entry: str) -> None:
    """Append a log entry to EXECUTION_LOG.md."""
    ensure_log_file_exists()
    with LOG_FILE.open("a") as f:
        f.write(entry)


def main() -> None:
    tool_info = get_tool_info()

    # Skip logging the logger itself to avoid infinite loops
    tool_name = tool_info.get("tool_name", tool_info.get("tool", ""))
    params = tool_info.get("tool_input", tool_info.get("params", {}))
    if tool_name == "Write" and "EXECUTION_LOG" in str(params.get("file_path", "")):
        return
    if tool_name == "Bash" and "EXECUTION_LOG" in str(params.get("command", "")):
        return

    entry = format_log_entry(tool_info)
    append_log_entry(entry)


if __name__ == "__main__":
    main()
