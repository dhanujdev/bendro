#!/usr/bin/env python3
"""
Pre-Write Check Hook — PreToolCall

Validates file writes against coding standards before the write occurs.
Warns on: Python files without type annotations, TypeScript any types, missing JSDoc/docstrings.

Triggered by: PreToolCall (Write tool)
Exit code 0 = allow write, non-zero = block write (use sparingly)
"""

import json
import re
import sys
from pathlib import Path


def get_write_params() -> dict:
    """Parse Write tool parameters from stdin (Claude Code hook format)."""
    try:
        raw = sys.stdin.read()
        if raw.strip():
            data = json.loads(raw)
            # Claude Code passes {tool_name, tool_input} — extract tool_input
            if "tool_input" in data:
                return data["tool_input"]
            return data
    except (json.JSONDecodeError, EOFError):
        pass
    return {}


def check_python_file(file_path: str, content: str) -> list[str]:
    """Check Python file for common standards violations."""
    warnings = []

    # Check for functions without return type annotations
    funcs_without_return = re.findall(
        r'^def ([a-zA-Z_][a-zA-Z0-9_]*)\([^)]*\)\s*:',
        content, re.MULTILINE
    )
    funcs_with_return = re.findall(
        r'^def ([a-zA-Z_][a-zA-Z0-9_]*)\([^)]*\)\s*->',
        content, re.MULTILINE
    )
    missing_return_type = set(funcs_without_return) - set(funcs_with_return)
    # Exclude dunder methods
    missing_return_type = {f for f in missing_return_type if not f.startswith('__')}
    if missing_return_type:
        warnings.append(
            f"STANDARDS: Python functions missing return type annotations: {', '.join(sorted(missing_return_type))}"
        )

    # Check for bare except clauses
    if re.search(r'except\s*:', content):
        warnings.append("STANDARDS: Bare 'except:' clause found — specify exception types")

    # Check for print() statements (use structlog instead)
    if re.search(r'\bprint\s*\(', content) and 'test' not in file_path.lower():
        warnings.append("STANDARDS: print() found in non-test file — use structlog logger instead")

    # Check public functions without docstrings
    public_funcs = re.findall(
        r'^def ([a-zA-Z][a-zA-Z0-9_]*)\([^)]*\).*:\n(?!\s+""")',
        content, re.MULTILINE
    )
    if public_funcs and 'test_' not in file_path:
        warnings.append(
            f"STANDARDS: Public Python functions without docstrings: {', '.join(public_funcs[:3])}"
        )

    return warnings


def check_typescript_file(file_path: str, content: str) -> list[str]:
    """Check TypeScript file for common standards violations."""
    warnings = []

    # Check for any type
    any_usages = re.findall(r':\s*any\b', content)
    if any_usages and 'test' not in file_path.lower() and '.spec.' not in file_path:
        warnings.append(
            f"STANDARDS: {len(any_usages)} usage(s) of 'any' type found — use explicit types"
        )

    # Check for console.log in non-test files
    if re.search(r'console\.log\s*\(', content) and '.spec.' not in file_path and '.test.' not in file_path:
        warnings.append("STANDARDS: console.log() found in non-test file — use Pino logger")

    # Check for @ts-ignore
    if '@ts-ignore' in content:
        warnings.append("STANDARDS: @ts-ignore found — fix the underlying type issue instead")

    # Check public exports without JSDoc
    exported_funcs = re.findall(
        r'^export (?:async )?function ([a-zA-Z][a-zA-Z0-9_]*)',
        content, re.MULTILINE
    )
    jsdoc_covered = re.findall(r'/\*\*[\s\S]*?\*/\s*\nexport', content)
    if exported_funcs and len(jsdoc_covered) < len(exported_funcs):
        warnings.append(
            f"STANDARDS: {len(exported_funcs)} exported function(s) — ensure all have JSDoc comments"
        )

    return warnings


def check_file_size(content: str) -> list[str]:
    """Check file doesn't exceed size limits."""
    warnings = []
    lines = content.splitlines()
    if len(lines) > 300:
        warnings.append(
            f"STANDARDS: File has {len(lines)} lines (limit: 300) — consider splitting into modules"
        )
    return warnings


def main() -> None:
    params = get_write_params()
    file_path = params.get("file_path", "")
    content = params.get("content", "")

    if not file_path or not content:
        sys.exit(0)  # Allow write

    all_warnings = []

    # File size check (all files)
    all_warnings.extend(check_file_size(content))

    # Language-specific checks
    if file_path.endswith('.py') and '/test' not in file_path and 'conftest' not in file_path:
        all_warnings.extend(check_python_file(file_path, content))
    elif file_path.endswith(('.ts', '.tsx')) and '.spec.' not in file_path and '.test.' not in file_path:
        all_warnings.extend(check_typescript_file(file_path, content))

    # Print warnings but don't block (exit 0 = allow)
    if all_warnings:
        print(f"\n⚠️  Pre-write standards check for {Path(file_path).name}:")
        for warning in all_warnings:
            print(f"   {warning}")
        print("   (Proceeding with write — fix these before committing)\n")

    sys.exit(0)  # Always allow the write — warnings only


if __name__ == "__main__":
    main()
