#!/usr/bin/env python3
"""
.claude/hooks/docs-only.py --base <ref> [--pr <n> --branch <name> --grant]

The standing rule: a PR whose changes are documentation or comments only — no code — may be
merged by the orchestrator once the review loop is silent, without the owner's word. Because
that unlocks a merge, the decision is made here, mechanically and conservatively, not by the
orchestrator's judgement. Anything this script is not sure about is "not docs-only".

Docs-only means every changed file (base...HEAD) is either
  - a documentation path: *.md, *.mdx, *.rst, *.txt, or under docs/ or mem/ (renames and
    deletions included). `.claude/` is deliberately NOT a docs path: hooks, settings and
    rule-zero.conf change enforcement, and the kit must not be able to self-merge changes to
    its own gates. Markdown under .claude/ (rules, skills, agents) still counts by extension;
    or
  - a code file whose added and removed lines are ALL blank or comment lines for its language.
    Only whole-line comments are recognised; a trailing comment on a code line, a line inside a
    block comment that does not start with `*`, or an unknown extension → not docs-only.

Prints JSON: {"docs_only": bool, "base": ..., "head": ..., "files": [{"path", "class", "why"}]}

--grant: if docs_only and --pr/--branch are given, write the merge-cleanup bundle grant
(same lines as `rule-zero.py --bundle merge-cleanup`) and log the standing rule as the "yes".
Exit 0 if docs-only, 3 if not, 1 on git error.
"""
import argparse
import json
import os
import re
import subprocess
import sys

DOC_EXT = {".md", ".mdx", ".rst", ".txt", ".adoc"}
DOC_DIRS = ("docs/", "mem/")
COMMENT = {
    "#": {".py", ".sh", ".bash", ".zsh", ".rb", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".pl", ".r", ".ps1", ".dockerfile", ".gitignore", ".env"},
    "//": {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".c", ".h", ".cpp", ".hpp", ".cc", ".cs", ".swift", ".kt", ".kts", ".scala", ".php", ".dart", ".groovy", ".proto"},
    "--": {".sql", ".lua", ".hs", ".elm"},
    "<!--": {".html", ".htm", ".xml", ".svg", ".vue"},
    "/*": {".css", ".scss", ".less"},
}
BLOCK_OK = {"//": ("/*", "*", "*/"), "/*": ("/*", "*", "*/"), "<!--": ("<!--", "-->"), "#": (), "--": ()}
SPECIAL_NAMES = {"Dockerfile": "#", "Makefile": "#", "CLAUDE.md": None}


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git {' '.join(args)} failed")
    return r.stdout


def marker_for(path):
    name = os.path.basename(path)
    if name in SPECIAL_NAMES:
        return SPECIAL_NAMES[name]
    ext = os.path.splitext(name)[1].lower()
    for m, exts in COMMENT.items():
        if ext in exts:
            return m
    return None


def is_doc_path(path):
    ext = os.path.splitext(path)[1].lower()
    return ext in DOC_EXT or any(path.startswith(d) for d in DOC_DIRS)


def comment_only(base, path):
    marker = marker_for(path)
    if marker is None:
        return False, "unknown language; cannot classify comment lines"
    diff = git("diff", "-U0", "--no-color", f"{base}...HEAD", "--", path)
    for line in diff.splitlines():
        if not line or line[0] not in "+-" or line.startswith(("+++", "---")):
            continue
        s = line[1:].strip()
        if not s:
            continue
        ok = s.startswith(marker) or any(s.startswith(b) for b in BLOCK_OK.get(marker, ()))
        if marker == "#" and s.startswith("#!"):
            ok = False  # a shebang is code
        if not ok:
            return False, f"non-comment line changed: {s[:60]!r}"
    return True, "only comment/blank lines changed"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="e.g. origin/main")
    ap.add_argument("--pr")
    ap.add_argument("--branch")
    ap.add_argument("--grant", action="store_true")
    a = ap.parse_args()
    try:
        head = git("rev-parse", "HEAD").strip()
        names = git("diff", "--name-status", f"{a.base}...HEAD").splitlines()
    except RuntimeError as e:
        print(f"docs-only: {e}", file=sys.stderr)
        sys.exit(1)

    files, docs_only = [], True
    for entry in names:
        parts = entry.split("\t")
        status, path = parts[0], parts[-1]
        if is_doc_path(path):
            files.append({"path": path, "class": "docs", "why": "documentation path"})
            continue
        if status[0] in "ADR":  # added/deleted/renamed code file is a code change
            files.append({"path": path, "class": "code", "why": f"{status[0]}: file added/deleted/renamed"})
            docs_only = False
            continue
        ok, why = comment_only(a.base, path)
        files.append({"path": path, "class": "comments" if ok else "code", "why": why})
        docs_only = docs_only and ok
    if not files:
        docs_only = False  # an empty diff is not a docs-only PR; it is nothing

    result = {"docs_only": docs_only, "base": a.base, "head": head, "files": files}
    if docs_only and a.grant and a.pr and a.branch:
        root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
        gpath = os.path.join(root, ".claude", "rule-zero.grants")
        b = re.escape(a.branch)
        lines = [rf"^gh pr merge {re.escape(a.pr)}\b", rf"^git push origin --delete {b}$", rf"^git branch -D {b}$"]
        with open(gpath, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        try:
            with open(os.path.join(root, ".claude", "rule-zero.log"), "a", encoding="utf-8") as f:
                f.write(f"standing-rule\tdocs-only\torchestrator\t-\tPR {a.pr} {a.branch} @ {head[:12]}\tgrant written\n")
        except OSError:
            pass
        result["granted"] = lines
    print(json.dumps(result, indent=1))
    sys.exit(0 if docs_only else 3)


if __name__ == "__main__":
    main()
