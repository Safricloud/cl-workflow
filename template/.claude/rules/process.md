# Process rules (always loaded)

Every contribution — feature, bug, one or more issues, owner feedback, post-merge reviewer
comment — runs the
`/contribute` loop: ask → investigate → review → questions → plan → orchestrate → PR →
PR reviews → merge → deploy. There is no small-change path; small changes produce short
documents. The loop: `.claude/skills/contribute/SKILL.md`. The why: `docs/guides/agent-workflow.md`.

## Rule zero

No action that discards work or changes state outside the repo without the owner's explicit
"yes": non-GET calls to live services, migrations against a shared database, force-push, branch
deletion, `reset --hard`, edits outside the repo, dropping a volume. Reads are unrestricted.
Approval for one action is not approval for the next. Delegation is not approval.

A hook enforces this, silently, with no prompts. When it denies: a sub-agent records the
command under **Blocked** and moves on; the orchestrator either had the yes at the Questions
phase (grant already written) or records the need under *Blocked on the owner* and continues
with everything else. Grants: `node .claude/hooks/rule-zero.ts --grant '<regex>'` /
`--bundle merge-cleanup <pr> <branch>`.

## One prompt phase

The owner is prompted in the **Questions** phase only — as many questions as needed, each with
a recommendation. Before it, orient. After it, decide and record: every decision the
orchestrator makes after Questions is implemented and listed for veto in the plan and the PR.
Nothing is deferred except what the owner must personally do — and that becomes a GitHub
issue labelled `blocked-on-owner`. The archive commit before the PR is the last record commit;
after `gh pr create` nothing under `docs/` or `mem/` changes. At the end, report and stop; the
owner initiates the merge — with one standing exception: a PR whose diff is documentation or
comments only (`docs-only.ts` says so) is merged by the orchestrator once the review loop is
silent, CI cancelled, `--admin` bypass. The admin bypass is used for every merge; the rule-zero
grant, not branch protection, is the gate.

## Three habits

1. **Claims are not evidence.** An agent's report, a reviewer's comment, a green checker never
   seen failing — all claims until verified against the code or the running system.
2. **Measure, don't assume.** Record the measurement and where it was taken.
3. **Say what you did not do.**

## Roles

- **Owner** answers the questions, reserves the merge, may delegate it.
- **Orchestrator** (this session) orients, briefs investigators, writes the review and the plan,
  asks the questions, dispatches implementers, merges their worktree branches, verifies,
  decides mid-loop, archives, opens the PR, runs the review loop, merges on the owner's word,
  deploys per `CLAUDE.md`. Edits documents only — never code.
- **Sub-agents** (Opus): `investigator` writes reports under `docs/reviews/<id>/` and nothing
  else; `implementer` works in its own worktree, commits to its branch, never pushes, never
  takes a rule-zero action, keeps its status block in the plan current.

## Naming

One id per contribution, `<yyyy-mm-dd>-<descriptive-slug>`: the branch, the review directory,
the plan directory (`plan.md` + `phase-<n>.md`), and the archive directory all carry it. The issue number lives inside the documents.
