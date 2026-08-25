#!/usr/bin/env python3
"""
.claude/hooks/rule-zero.py — PreToolUse hook (Bash, Edit, Write, MultiEdit, NotebookEdit).

Permissive by design. This hook is silent on everything except the shapes listed in
.claude/rule-zero.conf. It never returns "allow" (silence leaves the normal flow alone) and
never returns "ask" (no prompts — the kit is meant to run in bypass mode).

Verdicts, in order of evaluation:
  deny   — never by an agent, grant or not. The owner runs it by hand.
  allow  — short-circuit: a standing approval or a known-safe shape.
  guard  — rule zero. Orchestrator: allowed only with a single-use grant in
           .claude/rule-zero.grants (consumed on use). Sub-agent: always denied.

Bash commands are split on && || ; | and newlines and each segment is judged separately, so
`git add . && git push --force` cannot ride through on the allow for `git add`. Splitting is
best-effort (quotes are not parsed), the same limitation Claude Code's own `if` filter has.

Every deny and every grant use is appended to .claude/rule-zero.log (tsv). Silent allows are
not logged.

Fail-closed: if the input cannot be parsed or the config is missing, deny with a reason that
says what to fix. The self-test (rule-zero-selftest.py) catches that before any session does.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

TOOL_FILE = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
SPLIT_RE = re.compile(r"\s*(?:&&|\|\||;|\||\n)\s*")


def out_deny(reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def load_conf(path: str):
    rules = []  # (verb, regex, source_line)
    with open(path, encoding="utf-8") as f:
        for n, raw in enumerate(f, 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            verb, _, pattern = line.partition(" ")
            pattern = pattern.strip()
            if verb not in ("deny", "allow", "guard") or not pattern:
                continue
            try:
                rules.append((verb, re.compile(pattern), f"{os.path.basename(path)}:{n} {verb} {pattern}"))
            except re.error as e:
                out_deny(f"rule-zero.conf line {n} is not a valid regex ({e}). Fix the config.")
    return rules


def main() -> None:
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    conf_path = os.path.join(root, ".claude", "rule-zero.conf")
    grants_path = os.path.join(root, ".claude", "rule-zero.grants")
    log_path = os.path.join(root, ".claude", "rule-zero.log")

    try:
        payload = json.load(sys.stdin)
    except Exception as e:  # noqa: BLE001
        out_deny(f"rule-zero hook could not parse its input ({e}). Fix the hook before continuing.")

    tool = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    mode = payload.get("permission_mode", "unknown")
    agent_id = payload.get("agent_id")
    agent_type = payload.get("agent_type") or "unknown-agent"
    is_subagent = bool(agent_id)
    who = f"agent:{agent_type}" if is_subagent else "orchestrator"

    # --- what are we judging? -------------------------------------------------------------
    subjects = []
    if tool == "Bash":
        cmd = tool_input.get("command") or ""
        subjects = [s for s in SPLIT_RE.split(cmd) if s]
    elif tool in TOOL_FILE:
        path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
        if path:
            resolved = os.path.realpath(os.path.join(payload.get("cwd") or root, os.path.expanduser(path)))
            inside = resolved.startswith(os.path.realpath(root) + os.sep)
            tmp = resolved.startswith(("/tmp/", os.path.realpath(os.environ.get("TMPDIR", "/tmp")) + os.sep))
            if not inside and not tmp:
                subjects = [f"path:outside-repo {resolved}"]
    elif tool.startswith("mcp__"):
        # MCP tools: judged by name plus a compact dump of their input, so a conf line like
        # `guard ^tool:mcp__vendor__(create|update|delete)` can name a vendor's write tools.
        subjects = [f"tool:{tool} {json.dumps(tool_input, separators=(',', ':'))[:500]}"]
    if not subjects:
        return  # silent: normal flow

    if not os.path.exists(conf_path):
        out_deny(f"rule-zero.conf not found at {conf_path}. Create it (see the kit) or remove the hook.")
    rules = load_conf(conf_path)

    def log(verdict: str, subject: str, note: str = "") -> None:
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write("\t".join([
                    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    verdict, who, mode, subject[:200].replace("\t", " "), note,
                ]) + "\n")
        except OSError:
            pass

    # --- judge each segment ---------------------------------------------------------------
    def first(verb_wanted: str, subject: str):
        for verb, rx, src in rules:
            if verb == verb_wanted and rx.search(subject):
                return src
        return None

    for subject in subjects:
        # precedence: deny > allow > guard, independent of line order in the conf
        src = first("deny", subject)
        if src:
            verb = "deny"
        elif first("allow", subject):
            continue
        else:
            src = first("guard", subject)
            if not src:
                continue  # silent: normal flow
            verb = "guard"
        if verb == "deny":
            log("deny", subject, src)
            out_deny(f"Rule zero — never by an agent ({src}). The owner runs this by hand. Command: {subject}")
        # guard
        if is_subagent:
            log("deny", subject, f"sub-agent; {src}")
            out_deny(
                "Rule zero — sub-agents cannot take this action, with or without a grant "
                f"({src}). Report **Blocked** in your status block with the exact command; "
                f"the orchestrator will ask the owner. Command: {subject}"
            )
        # orchestrator: look for a single-use grant
        grants = []
        if os.path.exists(grants_path):
            with open(grants_path, encoding="utf-8") as f:
                grants = [ln.rstrip("\n") for ln in f]
        used = None
        for g in grants:
            gs = g.strip()
            if not gs or gs.startswith("#"):
                continue
            try:
                if re.search(gs, subject):
                    used = g
                    break
            except re.error:
                continue
        if used is not None:
            remaining = [g for g in grants if g != used]
            with open(grants_path, "w", encoding="utf-8") as f:
                f.write("\n".join(remaining) + ("\n" if remaining else ""))
            log("grant-used", subject, used.strip())
            continue  # allowed, grant consumed
        log("deny", subject, f"no grant; {src}")
        out_deny(
            f"Rule zero ({src}) — this needs the owner's explicit yes. Ask in the conversation. "
            "Once given: quote it under the plan's Owner decisions, then add one line to "
            ".claude/rule-zero.grants — a regex matching exactly this command (single use) — "
            f"and retry. In bypass mode this deny is the only thing that fires. Command: {subject}"
        )


def grants_cli(argv) -> int:
    """
    Grant management, used by the orchestrator after an owner yes:
      rule-zero.py --grant '<regex>' [...]          one single-use grant per regex
      rule-zero.py --bundle merge-cleanup <pr-number> <branch>
                                                    Gate B: merge the PR, delete remote + local branch
      rule-zero.py --list                            show unused grants
      rule-zero.py --clear                           remove all unused grants (never needs a yes)
    """
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    path = os.path.join(root, ".claude", "rule-zero.grants")
    existing = []
    if os.path.exists(path):
        existing = [ln.rstrip("\n") for ln in open(path, encoding="utf-8") if ln.strip()]
    cmd = argv[0] if argv else ""
    if cmd == "--list":
        print("\n".join(existing) if existing else "(no unused grants)")
        return 0
    if cmd == "--clear":
        open(path, "w", encoding="utf-8").close()
        print(f"cleared {len(existing)} grant(s)")
        return 0
    new = []
    if cmd == "--grant":
        new = [g for g in argv[1:] if g.strip()]
        for g in new:
            re.compile(g)  # raise early on a bad regex
    elif cmd == "--bundle" and len(argv) == 4 and argv[1] == "merge-cleanup":
        pr, branch = argv[2], re.escape(argv[3])
        new = [
            rf"^gh pr merge {re.escape(pr)}\b",
            rf"^git push origin --delete {branch}$",
            rf"^git branch -D {branch}$",   # -d refuses after a squash merge
        ]
    else:
        print(grants_cli.__doc__, file=sys.stderr)
        return 2
    if not new:
        print("nothing to grant", file=sys.stderr)
        return 2
    with open(path, "a", encoding="utf-8") as f:
        for g in new:
            f.write(g + "\n")
    print("granted (single use each):\n  " + "\n  ".join(new))
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        sys.exit(grants_cli(sys.argv[1:]))
    main()
