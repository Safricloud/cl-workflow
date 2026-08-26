---
name: contribute
description: Run one contribution through the loop — ask → investigate (two tiers) → review → questions (the last prompt) → plan → orchestrate → PR → PR reviews → merge → deploy. Invoke for any feature request, bug report, one or more GitHub issues, owner feedback, or post-merge reviewer comment. Use /contribute <issue number(s) | one-line ask>, or /contribute --small <ask> for a change of a few lines (the small path, §11).
---

# /contribute — $ARGUMENTS

You are the orchestrator. Ten phases, in order — or, for a change of a few lines that the owner
has declared small, the **small path** in §11. Templates: `.claude/skills/contribute/templates/`.
The reasoning behind each phase: `docs/guides/agent-workflow.md`.

**The owner is prompted in exactly one phase — Questions.** Before it, you are orienting. After
it, you decide, sub-agents implement, and every decision you make is recorded for veto. At the
end you report and stop; the owner initiates the merge — unless the PR is docs-only (§9) or on
the small path (§11).

## Naming — one id for everything

`<id>` = `<yyyy-mm-dd>-<descriptive-slug>` — e.g. `2026-08-25-login-timeout`. The issue number, when
there is one, goes inside the documents (review and plan headers, `Fixes #n` in the PR body), not in
the id. Then:

| Thing | Path |
| --- | --- |
| Branch | `feat/<id>` \| `fix/<id>` \| `chore/<id>` |
| Review + investigations | `docs/reviews/<id>/review.md`, `docs/reviews/<id>/investigation-<topic>.md` |
| Plan | `docs/plans/<id>/plan.md` (overview) + `phase-<n>.md` (items and their status blocks) |
| Archive | `docs/history/<id>/` — `review.md`, `investigation-*.md`, `plan.md`, `phase-*.md` |
| Changelog | `docs/history/index.md` — one line per entry, written at archive time |
| Blocked on the owner | GitHub issues, labelled `blocked-on-owner` + kind + area |

**The archive commit is the last process-record commit.** Nothing under `docs/` or `mem/` is
touched after `gh pr create`: review cycles are PR comments, merge and deploy are reported in
the conversation. Otherwise every record commit is a new review trigger and the loop feeds
itself.

## 1. The ask

- Restate the ask in one sentence and name its source (the conversation, a reviewer comment,
  or one or more issues — `#12 #15 #19` is one ask). This sentence heads the review; the loop
  is judged against it.
- Several issues: they travel together through investigate, review and questions. Whether
  they ship as one PR (`Fixes #n` per issue) or are split into one contribution each is a
  question at the Questions phase; the review recommends. Default: one PR when they touch the
  same area, split when they do not.
- `git fetch && git status` — default branch, remote head, clean. Record the SHA.
- Mint the id, create the branch, `mkdir docs/reviews/<id>`. Everything from here is committed
  on the branch as it is written; the plan is the state of record and compaction can happen
  at any time.

## 2. Investigate — two tiers

**Tier one, you, brief.** `CLAUDE.md`, `mem/index.md`, the `mem/<area>.md` for the area,
`mem/outstanding.md` (a deferral or a do-not-re-open decision may already cover the ask), the
issue and its comments, an open linked PR (join that loop, don't start a rival branch). Locate
the code. Stop when you can write investigator briefs — not when you have a view.

**Tier two, investigators, thorough, parallel.** One brief per `investigator`: the id, one
question, the paths in scope, the facts wanted and where to measure them, whether the owner
has asked for live reads. Each writes `docs/reviews/<id>/investigation-<topic>.md` (a hook
fences them to `docs/reviews/`) and returns its Answer paragraph. Read the files you need.
Investigation is read-only; no code changes.

## 3. Review — `docs/reviews/<id>/review.md`

Use `templates/review.md`. This document is for the owner: plain English, high level, readable
in five minutes. What we found, ranked by user impact, with the evidence linked to the
investigation files rather than repeated. **Directions we could take**, each with what it
means, what it costs, what it forecloses, and a recommendation. **Decisions we need from you**
— the list that becomes the questions, including any rule-zero action the plan would need,
with its exact command shape. What the review did not do. Commit it.

## 4. Questions — the last prompt

Use the question tool. Ask everything you are unsure about — the owner prefers more questions
to fewer — in as many rounds as it takes, each question carrying your recommended answer.
Include: the direction; scope; each decision from the review; every foreseeable rule-zero
action; anything vague about what "done" looks like.

When answered:
- Append a dated **Decisions** section to the review (do not rewrite what is above it).
- For each rule-zero yes: `node .claude/hooks/rule-zero.ts --grant '<regex matching the
  exact command>'` — written now, before any code that performs it.
- Settled decisions → `mem/outstanding.md` → *Settled — do not re-open*.
- Anything only the owner can do (accounts, content, filings) → `mem/outstanding.md` →
  *Open — owner follow-ups*. That is the only thing that ever waits.
- Commit.

**After this phase you do not prompt the owner again.**

## 5. Plan — `docs/plans/<id>/`

One directory, several files, so phases can be worked on concurrently:

- `plan.md` (`templates/plan.md`) — the overview: facts, owner decisions, plan decisions for
  veto, mid-loop decisions, phasing, orchestrator work, validation, blocked on the owner.
- `phase-<n>.md` (`templates/phase.md`) — the items of one phase with their status blocks, a
  merge-back record and a verification record. Implementers edit only their own item's
  section; phase-mates share the file and their sections merge cleanly.

Rules:
- Every item: **Files**, **Approach** citing the facts, **Conventions that will fail your
  lint**, **Scoped validation**, **Acceptance including tests** (what must FAIL if reverted).
- **Phase by expected merge cleanliness.** Implementers work in their own worktrees branched
  from your HEAD. Two items that touch the same magnet file (lockfile, root manifest,
  `CLAUDE.md`, a shared client, the same region of a module) go in different phases, or you
  commit the shared edit as a seed before the phase. Parallel wherever merges will be clean.
- **Decisions made by this plan — veto here or in the PR**: every recommended default you
  are implementing without asking, with grounds.
- Commit the plan directory before dispatching anything.

## 6. Orchestrate

**Dispatch** one `implementer` per item, phase-mates in parallel. The invocation is one line;
the agent definition carries the rest:

```
Implement item <n.m> of docs/plans/<id>/phase-<n>.md. Scoped validation: <exact commands>.
```

Implementers keep their status block current as they work (In progress → Done | Blocked, with
deviations), commit to their `worktree-*` branch, never push, and return the worktree path.

**Merge a phase back** (measured sequence): `git -C <wt> status --short` is clean → read
`git -C <wt> log --oneline <branch>..HEAD` → `git merge --no-edit worktree-<slug>` → on a
conflict that is not mechanical, a Phase N.5 item on the merged base → `git worktree remove
<wt>` then `git branch -d worktree-<slug>` (never `-D`).

**Verify** on the merged branch, yourself: full check and build; read the diff of every
load-bearing file; grep for the area's known conventions; `.claude/rule-zero.log` for any
denial an implementer hit; the gates the package check does not cover; **verify the checker**
(revert the fix, see red, restore); distrust convenient results; real rendered UI at each
viewport, screenshots appraised by you; run the container if touched; re-read every sentence
the change made true or false.

**Fix through sub-agents, always.** Every finding from verification becomes an item in
`phase-<n>.5.md` with its own status block, implemented by a fresh implementer — you do not
edit code. Fix the pattern everywhere (`git grep`), not the flagged line. Re-verify.

**Decide, don't defer.** Mid-loop you have the power to choose the best course — a wrong
premise, an adjacent problem, a trade-off the plan did not foresee. Decide, record it in
`plan.md` under **Decisions made mid-loop — implemented; veto in the PR**, and have it
implemented. If the plan's premise was wrong, add a dated `### Correction` section; do not
rewrite.

**Blocked on the owner → a GitHub issue.** The only thing that waits is something the owner
must personally do: a rule-zero action nobody granted, a credential, an account, content, a
licence. For each, before the archive:

```
gh label list | grep -q blocked-on-owner || gh label create blocked-on-owner --color D93F0B --description "Needs an action only the owner can take"
gh issue create --title "<short imperative>" --label blocked-on-owner --label <kind> --label <area> --body-file <templates/blocked-issue.md, filled>
```
Kind labels: `rule-zero`, `credentials`, `account`, `content`, `licensing`, `decision` (create
missing ones the same way). Area labels: the repo's own. Record the issue number in
`plan.md` → *Blocked on the owner* and in `mem/outstanding.md`. Ship everything that does not
depend on it, and say in the issue how the shipped code behaves meanwhile.

When every item is Done and the final verification is green, commit: what, why, the decision
it rests on, the validation run, any lockfile diff explained.

## 7. PR

Archive **first**, so the records land with the PR — and this is the **last** commit that
touches `docs/` or `mem/`:

```
mkdir -p docs/history/<id>
git mv docs/reviews/<id>/* docs/history/<id>/   && rmdir docs/reviews/<id>
git mv docs/plans/<id>/*   docs/history/<id>/   && rmdir docs/plans/<id>
```
Add one line to `docs/history/index.md` (`<date> · <id> · <one-line outcome> · blocked: #n, #m
| none`), update `mem/` and `CLAUDE.md` to reflect the code as it lands, commit
("Archive <id>; <what the ledger now says>"), push. `docs/plans/` and `docs/reviews/` now read
as empty.

`gh pr create` with `templates/pr-body.md`: the ask and source, what changed (user-visible
first), **Decisions to veto** (Questions-phase decisions by reference; plan decisions;
mid-loop decisions), validation with counts and what was seen to fail, records, blocked-on-owner
issues, `Fixes #<n>`. Comment on each blocked-on-owner issue with the PR link. One issue per
branch, one branch per PR. The PR number is not written into the repo — `gh pr list --search
<id>` finds it.

## 8. PR reviews — to silence

The reviewer is GitHub Copilot. Its output is a claim, verified before acted on.

```
node .claude/hooks/pr-watch.ts --pr <n> --reset      # first cycle; polls every minute
```
It returns as soon as something new appears (inline comments and review bodies, with any
collapsed low-confidence section extracted), or with `"new": []` after **5 quiet minutes** —
and the quiet window restarts whenever the PR head changes, so a push always gets its five
minutes. Run it in the foreground with a long timeout, or in the background and read the
result.

Per item returned: verify against the code → verdict (correct → fix; correct in part → what
was adopted and on which argument; not a finding → the verified reason). Legitimate ones go to
implementers as **inline briefs** (files, approach, scoped validation, acceptance — the plan is
archived and is not reopened); each returns its status block in its message. Verify, commit
the fix, push. Reply to each comment with the verdict. Post one **cycle comment** on the PR —
head SHA, items returned, verdicts, the implementers' status blocks — that is the cycle record;
nothing in the repo is updated. Run `pr-watch.ts --pr <n>` again (no `--reset`).

**Silence — `"new": []` after a cycle with nothing new — closes the loop.** Then:

```
node .claude/hooks/docs-only.ts --base origin/<default> --pr <n> --branch <branch> --grant
```
- **Exit 0 (docs-only):** the standing rule applies — go to §9 and merge now, without asking.
- **Exit 3 (code changed):** report — PR, head SHA, CI, cycles, blocked-on-owner issues —
  comment on each issue with `templates/issue-comment.md`, and **stop. Do not ask whether to
  merge.**

## 9. Merge — on the owner's word, or docs-only

Two ways in. **The owner says merge** → write the bundle grant. **The PR is docs-only** (the
`docs-only.ts` check above passed and wrote the grant itself under the standing rule) → no
word needed. Either way, most repos protect the default branch, so the admin bypass is always
used:

```
node .claude/hooks/rule-zero.ts --bundle merge-cleanup <n> <branch>   # owner's yes only; docs-only already granted
# docs-only only: CI is pointless, cancel it
gh run list --branch <branch> --status in_progress --json databaseId -q '.[].databaseId' | xargs -r -n1 gh run cancel
gh pr merge <n> --<squash|merge as the owner said, or squash> --admin --delete-branch
git switch <default> && git pull
git branch -D <branch>                                                    # -d refuses after a squash merge
node .claude/hooks/rule-zero.ts --clear
```
Report in the conversation: which way in (the owner's words, quoted — or "docs-only standing
rule, `docs-only.ts` at `<head>`"), method, SHA. Nothing in the repo records the merge. If the
PR was merged before a cycle ran, the owed cycle is worked post-merge through the whole loop
as a new contribution.

## 10. Deploy — per `CLAUDE.md` → Deploy

- **production-ci**: the merge triggered the deploy Action. Watch it: `gh run list --workflow
  <name> --branch <default> -L1` → `gh run watch <run-id>`. "It fired" is a claim; the run's
  final status is the evidence.
- **local-containers**: rebuild with the merged code (`<command from CLAUDE.md>`), then the
  container checks from Verify — user id, migrations applied, server bound, nothing in stderr.
- **none yet**: say so.

Report in one paragraph in the conversation: merge method and SHA, deploy result, open
blocked-on-owner issues, each issue closed by the merge. No commit. The loop is over.

## 11. The small path — `/contribute --small <ask>`

For a change of a few lines in a few files that adds no dependency and touches no gate or hook
logic: a conf line, a doc fix, a version pin, a one-line bug. The owner declares it (`--small`,
or "small" in the ask), or you propose it in your restatement of the ask and the owner accepts.
Rule zero and the three habits apply unchanged; what shrinks is the ceremony.

1. **Ask.** Restate it in one sentence with its source, and say in one more why it is small.
   Mint the id and the branch as usual (`chore/<id>` unless it is a fix).
2. **Orient, don't investigate.** Read the area yourself — the file, its tests, `CLAUDE.md`'s
   conventions, `mem/outstanding.md` for a settled decision the change would cross — and
   measure the one thing that could make it not small: a test that pins the old behaviour, a
   second copy of the file, a string the change makes false elsewhere (`git grep`). No
   investigators, no review document, no plan directory.
3. **Change it yourself.** You edit directly — no worktree, no implementer. In a kit repo, edit
   `template/` and regenerate the root copy with the CLI; never the root copy.
4. **Verify** with the full check from `CLAUDE.md`, and verify the checker where a test
   exists: revert, see red, restore.
5. **Record** one line in `docs/history/index.md` — `<date> · <id> · small: <what> · blocked:
   none` — committed with the change. No review document and no plan directory; `mem/` only
   if a decision was settled. If an investigator *was* run (step 2 needed a measurement you
   could not make yourself), its report is part of the record: `git mv` it from
   `docs/reviews/<id>/` to `docs/history/<id>/` and commit it with the change. Investigation
   reports are never deleted.
6. **PR** with a short body: the ask and its source, why it is small and who declared it, what
   changed, validation with counts and what was seen to fail. Push; `gh pr create`.
7. **PR reviews** as §8 — `pr-watch.ts` to silence; each item verified; fixes made by you
   directly; one cycle comment per cycle.
8. **Merge under the small-path standing approval:** once the loop is silent and `ci-ok` is
   green on the head, write the bundle grant and merge as §9 (squash, `--admin`) — no word
   needed. Report which way in: "small path, declared by the owner" or "small path, proposed
   and accepted". Deploy per §10.

**Escalation.** The moment orientation or verification shows more than the change — a failing
test, a second file family, a hook or gate touched, a decision the owner would want to make —
stop, say so, and run the full loop from §1. The small path never widens silently.
