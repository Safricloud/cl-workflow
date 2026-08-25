#!/usr/bin/env python3
"""
.claude/hooks/status-block.py — SubagentStop hook, matcher: implementer

An implementer is not done until it has written its status block. This hook checks that
something under docs/plans/ in the implementer's worktree differs from the base branch (either
uncommitted or committed — implementers commit to their worktree branch). If nothing changed,
exit 2 refuses to let the subagent stop and tells it why.

The plan is a directory, docs/plans/<id>/, holding plan.md (overview) and phase-<n>.md files;
status blocks live in the phase files. If docs/plans/ holds no plan (after the archive, during
the PR review loop), implementers run from inline briefs and this hook stays silent.

Base branch, in order: the `**Branch:**` line of any plan.md, then `main`, then `master`.
If none resolves, the hook allows the stop — this is a process nudge, not a safety gate, and a
permissive kit fails open here.

Loop guard: if Claude Code reports it is already continuing because of this hook
(`stop_hook_active`), allow the stop rather than spin.
"""
import glob
import json
import os
import re
import subprocess
import sys


def git(cwd, *args):
    r = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, timeout=20)
    return r.returncode, r.stdout.strip()


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:  # noqa: BLE001
        return
    if payload.get("stop_hook_active"):
        return
    cwd = payload.get("cwd") or os.getcwd()
    plans = sorted(glob.glob(os.path.join(cwd, "docs", "plans", "*", "plan.md")))
    if not plans:
        return  # no plan in this checkout (archived, or inline brief): nothing to enforce

    bases = []
    for p in plans:
        try:
            m = re.search(r"\*\*Branch:\*\*\s*`([^`]+)`", open(p, encoding="utf-8").read())
            if m:
                bases.append(m.group(1))
        except OSError:
            pass
    bases += ["main", "master"]

    base = None
    for b in bases:
        code, _ = git(cwd, "rev-parse", "--verify", "--quiet", b)
        if code == 0:
            base = b
            break
    if base is None:
        return  # cannot tell; fail open

    code, diff = git(cwd, "diff", "--stat", base, "--", "docs/plans/")
    if code == 0 and diff.strip():
        return  # the plan file changed since base: status block present (or at least attempted)

    sys.stderr.write(
        "Not finished: no status block has been written. Write your block under your item's "
        "`#### Status — item n.m` heading in docs/plans/<id>/phase-<n>.md, replacing the "
        "placeholder line, with Done|Blocked, files touched, commits, deviations, validation "
        "and checker-verified results. Commit it to your worktree branch. Then finish.\n"
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
