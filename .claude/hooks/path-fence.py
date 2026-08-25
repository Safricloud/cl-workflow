#!/usr/bin/env python3
"""
.claude/hooks/path-fence.py <allowed-prefix> [<allowed-prefix> ...]

PreToolUse hook for Edit/Write/MultiEdit/NotebookEdit, attached in a subagent's frontmatter.
Denies any edit whose resolved path is not under one of the allowed prefixes (relative to the
project root, or to the worktree root when the agent is in one). Silent otherwise.

Used by `investigator`, which may write only under docs/reviews/<id>/ — investigation reports
are part of the record, but nothing else in the repo is the investigator's to touch.
"""
import json
import os
import sys


def main():
    prefixes = [p.strip("/") for p in sys.argv[1:] if p.strip()]
    if not prefixes:
        return
    try:
        payload = json.load(sys.stdin)
    except Exception:  # noqa: BLE001
        return
    tool_input = payload.get("tool_input") or {}
    path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
    if not path:
        return
    cwd = payload.get("cwd") or os.getcwd()
    root = os.environ.get("CLAUDE_PROJECT_DIR") or cwd
    resolved = os.path.realpath(os.path.join(cwd, os.path.expanduser(path)))
    # accept the path under either the project root or the current worktree root
    for base in {os.path.realpath(root), os.path.realpath(cwd)}:
        for p in prefixes:
            allowed = os.path.join(base, p) + os.sep
            if resolved.startswith(allowed):
                return
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"This agent may write only under {', '.join(prefixes)}/. "
                f"Refused: {path}. Return findings in your report instead."
            ),
        }
    }))


if __name__ == "__main__":
    main()
