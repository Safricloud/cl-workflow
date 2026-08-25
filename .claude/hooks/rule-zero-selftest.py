#!/usr/bin/env python3
"""
.claude/hooks/rule-zero-selftest.py — proves the rule-zero gate fires, and only when it should.

Run it after editing rule-zero.conf, and in CI. A hook that is misconfigured fails open
(Claude Code treats a hook that cannot start as a non-blocking error), so this is the only
thing standing between "the gate exists" and "the gate works".

Usage:  python3 .claude/hooks/rule-zero-selftest.py [--conf path] [--verbose]
Exit 0 when every case passes, 1 otherwise.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
HOOK = os.path.join(HERE, "rule-zero.py")
DEFAULT_CONF = os.path.join(HERE, "..", "rule-zero.conf")

SILENT, DENY = "silent", "deny"

# (label, tool, tool_input, context, expected)
#   context: "orch" | "agent" | ("orch", grant_regex)
CASES = [
    # --- everyday work must be silent -------------------------------------------------
    ("tests run", "Bash", {"command": "npm test"}, "orch", SILENT),
    ("commit in worktree", "Bash", {"command": "git add -A && git commit -m 'item 1.1'"}, "agent", SILENT),
    ("plain push", "Bash", {"command": "git push -u origin feat/x"}, "orch", SILENT),
    ("new branch", "Bash", {"command": "git checkout -b feat/x"}, "orch", SILENT),
    ("merge worktree branch", "Bash", {"command": "git merge --no-edit worktree-agent-1"}, "orch", SILENT),
    ("worktree cleanup, merged", "Bash", {"command": "git worktree remove .claude/worktrees/a && git branch -d worktree-agent-1"}, "orch", SILENT),
    ("unstage", "Bash", {"command": "git restore --staged src/a.ts"}, "orch", SILENT),
    ("open PR", "Bash", {"command": "gh pr create --fill"}, "orch", SILENT),
    ("PR comment", "Bash", {"command": "gh pr comment 12 --body 'done'"}, "orch", SILENT),
    ("gh api read", "Bash", {"command": "gh api repos/o/r/pulls/12/comments"}, "orch", SILENT),
    ("blocked issue", "Bash", {"command": "gh issue create --title 'Rotate vendor key' --label blocked-on-owner --label credentials --body-file -"}, "orch", SILENT),
    ("label create", "Bash", {"command": "gh label create blocked-on-owner --color D93F0B --force"}, "orch", SILENT),
    ("cancel own CI run", "Bash", {"command": "gh run cancel 987654"}, "orch", SILENT),
    ("admin merge without grant", "Bash", {"command": "gh pr merge 12 --squash --admin --delete-branch"}, "orch", DENY),
    ("admin merge with bundle", "Bash", {"command": "gh pr merge 12 --squash --admin --delete-branch"}, ("orch", "BUNDLE 12 feat/x"), SILENT),
    ("curl GET remote", "Bash", {"command": "curl -s https://api.example.com/v1/things"}, "orch", SILENT),
    ("curl POST localhost", "Bash", {"command": "curl -X POST localhost:3000/api/seed -d '{}'"}, "orch", SILENT),
    ("edit inside repo", "Edit", {"file_path": "src/a.ts"}, "orch", SILENT),
    ("edit inside worktree", "Edit", {"file_path": ".claude/worktrees/agent-1/src/a.ts"}, "agent", SILENT),
    ("write to /tmp", "Write", {"file_path": "/tmp/scratch.txt"}, "orch", SILENT),
    ("rm inside repo", "Bash", {"command": "rm -rf node_modules"}, "orch", SILENT),
    ("mcp read tool", "mcp__vendor__list_items", {"q": "x"}, "orch", SILENT),

    # --- rule zero: orchestrator without a grant is denied -----------------------------
    ("force push", "Bash", {"command": "git push --force origin feat/x"}, "orch", DENY),
    ("force push hidden in chain", "Bash", {"command": "git add . && git push --force origin feat/x"}, "orch", DENY),
    ("delete remote branch", "Bash", {"command": "git push origin --delete feat/x"}, "orch", DENY),
    ("delete local branch -D", "Bash", {"command": "git branch -D feat/x"}, "orch", DENY),
    ("delete local branch -d (not worktree-*)", "Bash", {"command": "git branch -d feat/x"}, "orch", DENY),
    ("reset hard", "Bash", {"command": "git reset --hard HEAD~1"}, "orch", DENY),
    ("discard file", "Bash", {"command": "git restore src/a.ts"}, "orch", DENY),
    ("checkout dot", "Bash", {"command": "git checkout ."}, "orch", DENY),
    ("clean", "Bash", {"command": "git clean -fd"}, "orch", DENY),
    ("worktree remove force", "Bash", {"command": "git worktree remove --force .claude/worktrees/a"}, "orch", DENY),
    ("PR merge", "Bash", {"command": "gh pr merge 12 --squash"}, "orch", DENY),
    ("issue close", "Bash", {"command": "gh issue close 7"}, "orch", DENY),
    ("gh api POST", "Bash", {"command": "gh api -X POST repos/o/r/issues -f title=x"}, "orch", DENY),
    ("curl POST remote", "Bash", {"command": "curl -X POST https://api.example.com/v1/things -d '{}'"}, "orch", DENY),
    ("curl data remote", "Bash", {"command": "curl https://api.example.com/v1/things --data-binary @f.json"}, "orch", DENY),
    ("httpie DELETE", "Bash", {"command": "https DELETE api.example.com/v1/things/1"}, "orch", DENY),
    ("docker volume rm", "Bash", {"command": "docker volume rm app_pgdata"}, "orch", DENY),
    ("edit outside repo", "Edit", {"file_path": "~/.zshrc"}, "orch", DENY),
    ("write outside repo", "Write", {"file_path": "/etc/hosts"}, "orch", DENY),

    # --- rule zero: a single-use grant lets the orchestrator through, once ---------------
    ("force push with grant", "Bash", {"command": "git push --force origin feat/x"}, ("orch", r"^git push --force origin feat/x$"), SILENT),
    ("delete remote with grant", "Bash", {"command": "git push origin --delete feat/x"}, ("orch", r"^git push origin --delete feat/x$"), SILENT),
    ("PR merge with grant", "Bash", {"command": "gh pr merge 12 --squash"}, ("orch", r"^gh pr merge 12"), SILENT),
    ("grant for a different command does not apply", "Bash", {"command": "git branch -D feat/y"}, ("orch", r"^git branch -D feat/x$"), DENY),

    # --- Gate B bundle: one owner yes → merge + remote delete + local delete, once each -------
    ("bundle: merge", "Bash", {"command": "gh pr merge 12 --squash"}, ("orch", "BUNDLE 12 feat/x"), SILENT),
    ("bundle: delete remote", "Bash", {"command": "git push origin --delete feat/x"}, ("orch", "BUNDLE 12 feat/x"), SILENT),
    ("bundle: delete local after squash", "Bash", {"command": "git branch -D feat/x"}, ("orch", "BUNDLE 12 feat/x"), SILENT),
    ("bundle: other branch not covered", "Bash", {"command": "git branch -D feat/y"}, ("orch", "BUNDLE 12 feat/x"), DENY),
    ("bundle: other PR not covered", "Bash", {"command": "gh pr merge 13 --squash"}, ("orch", "BUNDLE 12 feat/x"), DENY),

    # --- rule zero: sub-agents are denied even with a grant on file ----------------------
    ("agent force push", "Bash", {"command": "git push --force origin worktree-agent-1"}, "agent", DENY),
    ("agent force push, grant present", "Bash", {"command": "git push --force origin worktree-agent-1"}, ("agent", r".*"), DENY),
    ("agent reset hard", "Bash", {"command": "git reset --hard"}, "agent", DENY),
    ("agent edit outside repo", "Edit", {"file_path": "/home/user/.bashrc"}, "agent", DENY),

    # --- never: denied even with a grant --------------------------------------------------
    ("rm -rf home", "Bash", {"command": "rm -rf ~"}, ("orch", r".*"), DENY),
    ("rm -rf root", "Bash", {"command": "rm -rf /"}, ("orch", r".*"), DENY),
    ("force push main", "Bash", {"command": "git push -f origin main"}, ("orch", r".*"), DENY),
]


def run_case(project, tool, tool_input, context):
    is_agent = (context == "agent") or (isinstance(context, tuple) and context[0] == "agent")
    grant = context[1] if isinstance(context, tuple) else None
    grants_path = os.path.join(project, ".claude", "rule-zero.grants")
    # every case starts with an empty grants file; a grant applies to this case only
    open(grants_path, "w", encoding="utf-8").close()
    if grant is not None and grant.startswith("BUNDLE "):
        _, pr, branch = grant.split()
        subprocess.run([sys.executable, HOOK, "--bundle", "merge-cleanup", pr, branch],
                       capture_output=True, text=True, env=dict(os.environ, CLAUDE_PROJECT_DIR=project), check=True)
    elif grant is not None:
        with open(grants_path, "w", encoding="utf-8") as f:
            f.write(grant + "\n")
    payload = {
        "session_id": "selftest", "cwd": project, "hook_event_name": "PreToolUse",
        "permission_mode": "bypassPermissions", "tool_name": tool, "tool_input": tool_input,
        "tool_use_id": "toolu_selftest",
    }
    if is_agent:
        payload["agent_id"] = "agent_selftest"
        payload["agent_type"] = "implementer"
    env = dict(os.environ, CLAUDE_PROJECT_DIR=project)
    r = subprocess.run([sys.executable, HOOK], input=json.dumps(payload), capture_output=True,
                       text=True, env=env, cwd=project, timeout=10)
    if r.returncode not in (0, 2):
        return "error", f"exit {r.returncode}: {r.stderr.strip()[:200]}"
    out = r.stdout.strip()
    if not out:
        # silent + a grant was on file → it must have been consumed (single use)
        if grant is not None and not is_agent:
            left = open(grants_path, encoding="utf-8").read().strip().splitlines()
            expected_left = 2 if grant.startswith("BUNDLE ") else 0
            if len(left) != expected_left:
                return "error", f"grant not consumed; still on file: {left!r}"
        return SILENT, ""
    try:
        d = json.loads(out)["hookSpecificOutput"]
        return d["permissionDecision"], d.get("permissionDecisionReason", "")
    except Exception:  # noqa: BLE001
        return "error", f"unparseable stdout: {out[:200]}"


def main():
    args = sys.argv[1:]
    verbose = "--verbose" in args
    conf = DEFAULT_CONF
    if "--conf" in args:
        conf = args[args.index("--conf") + 1]
    project = tempfile.mkdtemp(prefix="rule-zero-selftest-")
    try:
        os.makedirs(os.path.join(project, ".claude", "worktrees", "agent-1", "src"))
        os.makedirs(os.path.join(project, "src"))
        shutil.copy(conf, os.path.join(project, ".claude", "rule-zero.conf"))
        failures = 0
        for label, tool, tool_input, context, expected in CASES:
            verdict, reason = run_case(project, tool, tool_input, context)
            ok = verdict == expected
            failures += 0 if ok else 1
            mark = "PASS" if ok else "FAIL"
            if verbose or not ok:
                print(f"{mark}  {label:45s} expected={expected:6s} got={verdict:6s}  {reason[:110]}")
        log = os.path.join(project, ".claude", "rule-zero.log")
        n_log = sum(1 for _ in open(log, encoding="utf-8")) if os.path.exists(log) else 0
        print(f"\n{len(CASES) - failures}/{len(CASES)} cases passed; {n_log} lines logged to rule-zero.log")
        # negative control: prove the hook can fail, so a green run is evidence
        bad = run_case(project, "Bash", {"command": "git push --force origin feat/x"}, "orch")[0]
        if bad != DENY:
            print("NEGATIVE CONTROL FAILED: force push was not denied")
            failures += 1
        sys.exit(1 if failures else 0)
    finally:
        shutil.rmtree(project, ignore_errors=True)


if __name__ == "__main__":
    main()
