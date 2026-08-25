#!/usr/bin/env python3
"""
.claude/hooks/pr-watch.py --pr <n> [--interval 60] [--quiet-after 300] [--once] [--reset]

The waiting half of the PR review loop, done by a script rather than by the orchestrator
sleeping. Polls the PR's head SHA, inline comments and review bodies through `gh api`,
remembers what it has already reported (.claude/pr-watch/<n>.json), and prints JSON:

  {"head": "<sha>", "quiet_for": <seconds since the head last changed or the watch began>,
   "new": [ ...items... ]}

Returns:
  - as soon as there is at least one new comment or review                     → "new" non-empty
  - after --quiet-after seconds (default 5 min) with nothing new; the quiet
    window RESTARTS whenever the PR head changes (a push)                      → "new": []
  - --once: a single fetch, no waiting
  - gh error (auth, network, no such PR)                                        → exit 1, message on stderr

Each item: {"kind": "comment"|"review", "id", "author", "state", "path", "line", "body",
            "collapsed_sections": [...], "url", "created_at"}

Review bodies are returned raw. Copilot collapses low-confidence findings inside <details>
blocks; those are extracted into `collapsed_sections` so a review that says "no comments" but
carries a suppressed section is visibly not silent. A review with empty state/body and no
comments still appears once, so "Copilot posted an empty review" is distinguishable from
"Copilot never arrived".

Run it in the foreground with a long Bash timeout, or in the background and read its output
when it exits. Both work; neither needs the orchestrator to count minutes.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time

DETAILS_RE = re.compile(r"<details>(.*?)</details>", re.S | re.I)


def gh(*args):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"gh exited {r.returncode}")
    return json.loads(r.stdout) if r.stdout.strip() else []


def repo_slug():
    r = subprocess.run(["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "gh repo view failed")
    return r.stdout.strip()


def head_sha(pr):
    r = subprocess.run(["gh", "pr", "view", str(pr), "--json", "headRefOid", "-q", ".headRefOid"],
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "gh pr view failed")
    return r.stdout.strip()


def fetch(slug, pr):
    items = []
    for c in gh("api", f"repos/{slug}/pulls/{pr}/comments", "--paginate"):
        items.append({
            "kind": "comment", "id": f"c{c['id']}", "author": (c.get("user") or {}).get("login"),
            "state": None, "path": c.get("path"), "line": c.get("line") or c.get("original_line"),
            "body": c.get("body", ""), "collapsed_sections": [], "url": c.get("html_url"),
            "created_at": c.get("created_at"),
        })
    for r in gh("api", f"repos/{slug}/pulls/{pr}/reviews", "--paginate"):
        body = r.get("body", "") or ""
        items.append({
            "kind": "review", "id": f"r{r['id']}", "author": (r.get("user") or {}).get("login"),
            "state": r.get("state"), "path": None, "line": None, "body": body,
            "collapsed_sections": [s.strip() for s in DETAILS_RE.findall(body)],
            "url": r.get("html_url"), "created_at": r.get("submitted_at"),
        })
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pr", required=True)
    ap.add_argument("--interval", type=int, default=60)
    ap.add_argument("--quiet-after", type=int, default=300)
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--reset", action="store_true", help="forget what was seen (new loop)")
    a = ap.parse_args()

    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    state_dir = os.path.join(root, ".claude", "pr-watch")
    os.makedirs(state_dir, exist_ok=True)
    state_path = os.path.join(state_dir, f"{a.pr}.json")
    seen = set()
    if os.path.exists(state_path) and not a.reset:
        seen = set(json.load(open(state_path, encoding="utf-8")).get("seen", []))

    try:
        slug = repo_slug()
        if not slug:
            raise RuntimeError("could not determine repo (gh repo view)")
    except Exception as e:  # noqa: BLE001
        print(f"pr-watch: {e}", file=sys.stderr)
        sys.exit(1)

    quiet_since = time.time()
    last_head = None
    while True:
        try:
            head = head_sha(a.pr)
            items = fetch(slug, a.pr)
        except Exception as e:  # noqa: BLE001
            print(f"pr-watch: {e}", file=sys.stderr)
            sys.exit(1)
        if last_head is not None and head != last_head:
            quiet_since = time.time()  # a push restarts the quiet window
        last_head = head
        new = [i for i in items if i["id"] not in seen]
        quiet_for = int(time.time() - quiet_since)
        if new or a.once or quiet_for >= a.quiet_after:
            seen |= {i["id"] for i in new}
            json.dump({"seen": sorted(seen), "head": head, "checked_at": int(time.time())},
                      open(state_path, "w", encoding="utf-8"))
            print(json.dumps({"head": head, "quiet_for": quiet_for, "new": new}, indent=1))
            return
        time.sleep(a.interval)


if __name__ == "__main__":
    main()
