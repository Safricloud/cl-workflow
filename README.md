# The contribution kit (v0.5)

Files that back the process document with mechanisms. Permissive by design: nothing here
prompts, and nothing fires on ordinary work. The only things that ever block are the shapes in
`rule-zero.conf`, and for the orchestrator those are unlocked by a single-use grant that records
the owner's "yes".

```
.claude/
  settings.json                 wires the three hooks; sets worktree.baseRef = head
  rule-zero.conf                the ONLY file you should need to tune
  rules/process.md              always loaded: rule zero, the two gates, the three habits, roles
  skills/contribute/SKILL.md    /contribute — the loop as an operating checklist
  skills/contribute/templates/  review, investigation, plan, phase, blocked-issue, pr-body, issue-comment
  hooks/rule-zero.py            PreToolUse — deny > allow > guard; grants (--grant, --bundle, --list, --clear); log
  hooks/rule-zero-selftest.py   proves the gate fires and only when it should (52 cases + negative control)
  hooks/status-block.py         SubagentStop (implementer) — no status block, no finishing
  hooks/reload-plan.py          SessionStart (compact|resume) — live plan, owner decisions, unused grants back in context
  hooks/path-fence.py           PreToolUse (investigator frontmatter) — writes only under docs/reviews/
  hooks/pr-watch.py             the PR-reviews wait: polls every minute, returns news or "new": [] after 5 quiet min (window restarts on push)
  hooks/docs-only.py            measures whether a branch diff is docs/comments only; if so writes the merge grant under the standing rule
  agents/implementer.md         Opus, worktree-isolated, commits to its branch, never pushes, status block kept current
  agents/investigator.md        Opus, read-only on the code, writes one report under docs/reviews/<id>/
  .gitignore                    grants, log, worktrees
docs/guides/agent-workflow.md   the process guide (baseline revised; Appendix D = what changed)
docs/{plans,reviews,history,reports}/ + docs/history/index.md (the changelog)
mem/index.md, mem/outstanding.md  the ledger, seeded with what this build settled and what you still need to measure
CLAUDE.md                       template: repo facts + commands + pointer to the process
```

## Install

Copy `.claude/` into the repo root. Requires `python3` on PATH (no other dependency). Then:

```
python3 .claude/hooks/rule-zero-selftest.py        # must print 52/52 and exit 0
```

Put that line in CI. A hook whose script path is wrong is reported by Claude Code as a
non-blocking error and the tool call proceeds — the self-test is the only thing that proves the
gate is live.

## How a rule-zero action flows

1. The orchestrator tries it (or a sub-agent does). The hook denies with a reason naming the
   conf line.
2. Sub-agent: it records the exact command under **Blocked** in its status block. Done.
3. Orchestrator: it asks you in the conversation. You say yes.
4. It quotes your yes under the plan's **Owner decisions**, appends one regex line matching that
   command to `.claude/rule-zero.grants`, and retries. The hook allows it, deletes the grant,
   and appends a `grant-used` line to `.claude/rule-zero.log`.
5. Approval for one action is not approval for the next: the grant is gone.

Three verbs in the conf, precedence `deny > allow > guard` regardless of line order. Bash
commands are judged per segment (`&&`, `||`, `;`, `|`), so a destructive command cannot hide
behind an allowed one. MCP tools are judged as `tool:<name> <input>` so a vendor's write tools
can be named in the project-specific section.

## Standing approvals

The `allow` lines are the process's own recorded "yes": commits, plain pushes, `gh pr create`,
PR and issue comments, `gh api` reads, and any HTTP call to a local host. Add to them freely;
that is cheaper than a question.

## Verify on your install (measured here where possible; the rest is yours)

| Claim | Status |
| --- | --- |
| Two worktree branches editing adjacent status sections of one plan file merge cleanly | Measured, sandbox git |
| `git branch -d` refuses while the worktree is attached; remove the worktree first | Measured |
| Hook denies in a sub-agent, allows once with a grant, consumes it, never honours a grant for `deny` lines | Measured, self-test |
| A missing guard line makes the self-test go red | Measured |
| `docs-only.py` accepts docs paths and whole-line-comment diffs, rejects trailing comments, new code files, unknown extensions, shebangs, and anything under `.claude/` that is not markdown | Measured, sandbox git, 10 diff shapes |
| `pr-watch.py` returns on news, goes quiet after the window, and restarts the window when the head changes | Measured, fake `gh` |
| Hooks from `.claude/settings.json` fire inside subagents with `agent_id` / `agent_type` | Official hooks reference |
| A hook `deny` holds in `bypassPermissions` mode | Official SDK docs; confirm once on your install |
| `worktree.baseRef: "head"` is the settings key, and subagent worktrees then branch from the orchestrator's HEAD | Official worktrees page names the setting; confirm the key placement |
| Claude Code ≥ 2.1.218 — before that a subagent's `git -C` / `GIT_DIR` could reach the parent checkout | Third-party changelog report; check `claude --version` and the changelog |
| Sub-agents inherit the main session's permission mode when `permissionMode` is unset | Official sub-agents page; the agent files leave it unset on purpose |
| `model: opus` resolves to the Opus you want; pin the full model id in both agent files if not | Yours |

## The ten phases, and the one place you are prompted

ask → investigate (orchestrator briefly, then investigators thoroughly) → review (plain
English, directions, decisions needed) → **questions** (the question tool; as many as needed,
each with a recommendation; the only prompt) → plan → orchestrate (implementers in
worktrees; orchestrator verifies, decides mid-loop, records for veto; every fix by an
implementer) → PR (archive first into `docs/history/<id>/`, then `gh pr create`) → PR reviews
(`pr-watch.py` until `"new": []`; cycles recorded as PR comments; report and stop) → merge (on
your word — or unasked when `docs-only.py` says the diff is docs/comments only; `--admin`
always; one bundle grant covers merge + remote + local delete) → deploy (per `CLAUDE.md`: watch
the Action, or rebuild the containers and check them). The archive commit before the PR is the
last record commit; anything blocked on you becomes a labelled GitHub issue.

One id per contribution — `<yyyy-mm-dd>-<descriptive-slug>` — names the branch,
the review directory, the plan directory (`plan.md` + one `phase-<n>.md` per phase) and the
history directory.

## Ergonomics

- Anything the hook denies that you consider routine → one `allow` line in the conf.
- Anything it lets through that touches a live system → one `guard` line naming the exact
  script and flag, in the project-specific section.
- `.claude/rule-zero.log` shows every denial and grant use; read it if the loop felt slow.
