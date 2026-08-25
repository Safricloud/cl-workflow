#!/usr/bin/env python3
"""
.claude/hooks/reload-plan.py — SessionStart hook, matcher: compact|resume

After compaction or on resume, the orchestrator's context has been rebuilt from a summary. The
plan file is the state of record, so put the parts of it that decisions rest on back in front
of the model as facts: which plan is live, its branch, the owner decisions it rests on, and
which items still lack a status block. Also lists any unused rule-zero grants, since a grant is
a recorded owner "yes" that a summary may have dropped.

Output is plain text on stdout, which SessionStart adds to context. Written as statements of
fact, not instructions.
"""
import glob
import json
import os
import re
import sys


def section(text, heading_re):
    m = re.search(heading_re + r"[^\n]*\n(.*?)(?=\n## |\Z)", text, re.S)
    return m.group(1).strip() if m else ""


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:  # noqa: BLE001
        payload = {}
    root = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd()
    plans = sorted(glob.glob(os.path.join(root, "docs", "plans", "*", "plan.md")))
    out = []
    if not plans:
        out.append("docs/plans/ is empty: no plan is in flight (either nothing is pending, or the "
                   "plan has been archived to docs/history/ and the contribution is in its PR review loop).")
    for p in plans:
        text = open(p, encoding="utf-8").read()
        pdir = os.path.dirname(p)
        rel = os.path.relpath(pdir, root)
        title = text.splitlines()[0].lstrip("# ").strip() if text else rel
        out.append(f"Live plan: `{rel}/` — {title}")
        for key in ("Source review", "Branch", "Owner go-ahead"):
            m = re.search(r"\*\*" + key + r":\*\*\s*([^\n]+)", text)
            if m:
                out.append(f"  {key}: {m.group(1).strip()}")
        decisions = section(text, r"\n## Owner decisions")
        if decisions:
            out.append("  Owner decisions this plan rests on:")
            out.extend("    " + ln for ln in decisions.splitlines() if ln.strip())
        pending = []
        for ph in sorted(glob.glob(os.path.join(pdir, "phase-*.md"))):
            ptext = open(ph, encoding="utf-8").read()
            for num, name in re.findall(r"### Item (\d+\.\d+) — ([^\n]+)", ptext):
                m = re.search(r"#### Status — item " + re.escape(num) + r"\n(.*?)(?=\n### |\n## |\Z)", ptext, re.S)
                body = m.group(1).strip() if m else ""
                if not body or body.startswith("*(implement"):
                    pending.append(f"{num} — {name.strip()}")
                elif body.lower().startswith("**in progress"):
                    pending.append(f"{num} — {name.strip()} (in progress)")
        if pending:
            out.append("  Items without a status block: " + "; ".join(pending))
        else:
            out.append("  Every item has a status block.")
    grants = os.path.join(root, ".claude", "rule-zero.grants")
    if os.path.exists(grants):
        live = [g.strip() for g in open(grants, encoding="utf-8") if g.strip() and not g.startswith("#")]
        if live:
            out.append("Unused rule-zero grants on file (each is a recorded owner yes, single use): "
                       + "; ".join(f"`{g}`" for g in live))
    print("\n".join(out))


if __name__ == "__main__":
    main()
