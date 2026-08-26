# The contribution pattern — Claude Code edition

Every contribution — a feature request, a bug report, one or more GitHub issues, owner feedback
in conversation, a post-merge reviewer comment — goes through the same loop, with one deliberate
exception: a change of a few lines that the owner declares small — or that the orchestrator
proposes as small and the owner accepts — takes the **small path** (§11), which keeps the rules
and the verification and drops the ceremony. Project-specific values are `<placeholders>`;
`.claude/rule-zero.conf` and the *Deploy* section of `CLAUDE.md` are the dials each project turns.

The pattern, in one line:

**ask → investigate → review → questions → plan → orchestrate → PR → PR reviews → merge → deploy**

One principle runs through this edition: **where a rule can be a mechanism, it is one.** Rule
zero is a hook. "Investigators write only under `docs/reviews/`" is a hook. "Implementers keep a
status block" is a stop hook. "Check every five minutes" is a script. The prose explains; the
files in `.claude/` enforce. Appendix D lists what changed from the portable baseline.

---

## 0. Layout, naming, roles, rule zero

### 0.1 One id for everything

A contribution gets one id when the ask arrives: `<yyyy-mm-dd>-<descriptive-slug>` —
`2026-08-25-login-timeout`. The issue number, when there is one, is recorded inside the review,
the plan and the PR body (`Fixes #n`), not in the id. The id is the branch name's tail,
the review directory, the plan file, and the archive directory. Sorting any of those directories
by name gives chronology; grepping the id finds everything about the contribution in the repo,
in git, and on GitHub.

| Thing | Where it lives | Notes |
| --- | --- | --- |
| Branch | `feat/<id>` \| `fix/<id>` \| `chore/<id>` | Created at the ask, off the default branch's remote head |
| Review + investigations | `docs/reviews/<id>/review.md`, `investigation-<topic>.md` | Live until archived |
| Plan | `docs/plans/<id>/plan.md` + `phase-<n>.md` | One file per phase so phases can be worked concurrently. **`docs/plans/` is empty when nothing is pending** |
| Archive | `docs/history/<id>/` — `review.md`, `investigation-*.md`, `plan.md`, `phase-*.md` | Moved, unchanged, before the PR is opened; lands with the PR. **The last record commit** |
| Changelog | `docs/history/index.md` | One line per contribution, written at archive time: date · id · outcome · blocked issues |
| Blocked on the owner | GitHub issues, `blocked-on-owner` + kind + area | Created before the archive; the only kind of deferral |
| Reports to third parties | `docs/reports/` | Drafted here, sent (or not) by the owner, never by an agent |
| Process guide | `docs/guides/agent-workflow.md` | This document. Wins over `CLAUDE.md` on conflict |
| The loop, as a checklist | `.claude/skills/contribute/SKILL.md` + `templates/` | `/contribute` |
| Always-on rules | `.claude/rules/process.md` | Short: rule zero, the one prompt phase, habits, roles, naming |
| Instructions file | `CLAUDE.md` | Repo facts, commands, conventions, **Deploy** section — not a ledger, not the process |
| Enforcement | `.claude/settings.json`, `.claude/hooks/`, `.claude/rule-zero.conf` | §0.3 |
| Agent definitions | `.claude/agents/investigator.md`, `.claude/agents/implementer.md` | The invariant half of every sub-agent prompt |
| Durable project facts | `mem/<topic>.md`, indexed by `mem/index.md` | Read the relevant one before touching that area |
| The ledger | `mem/outstanding.md` | Owner follow-ups, blocked-on-owner issue numbers, settled decisions |

### 0.2 Three roles, and no step vouches for itself

- **Owner** — answers the questions (one phase, as many as needed), reserves the merge, may
  delegate it with a word. Never an agent. Has given two standing merge approvals: docs-only
  PRs (§9) and small-path PRs (§11).
- **Orchestrator** — the agent in the conversation. Orients, briefs investigators, writes the
  review and the plan, asks the questions, dispatches implementers, merges their worktree
  branches, verifies everything itself, decides mid-loop and records it, opens a GitHub issue for
  anything blocked on the owner, archives, opens the PR, runs the review loop, merges on the
  owner's word, deploys per `CLAUDE.md`. **Edits documents only — never code.** Every code
  change goes through an implementer — except on the small path (§11), where the orchestrator
  makes the few-line change itself and the full check is the gate. Every text block it writes
  begins `Orchestrator:` (§0.5).
- **Sub-agents** — **Opus**, whatever the orchestrator runs on. `investigator`: one brief, one
  report under `docs/reviews/<id>/`, nothing else writable. `implementer`: one plan item, its own
  worktree, commits to its own branch, never pushes, never takes a rule-zero action, keeps its
  status block in the plan current from *In progress* to *Done* or *Blocked*. Each names itself
  in every text block it writes (`I-<n.m>:`, `Investigator-<topic>:` — §0.5).

### 0.3 Rule zero (overrides everything below)

An explicit "yes" from the owner before any action that changes state outside the repo or
discards work: non-`GET` calls to live services, migrations against a shared database,
`git reset --hard`, force-push, branch deletion, editing a file outside the repo, dropping a
volume. Holds under bypassed permission prompts and under "work autonomously". Approval for one
action is not approval for the next; delegation is not approval. Reads are unrestricted.

**The mechanism.** A `PreToolUse` hook (`.claude/hooks/rule-zero.ts`) judges every Bash
command, file edit and MCP call against `.claude/rule-zero.conf`. It is silent on everything
except the configured shapes and it never prompts — the kit runs in bypass mode. Three verbs:

- `deny` — never by an agent, grant or not; the owner runs it by hand.
- `allow` — standing approvals: commits, plain pushes, `gh pr create`, PR and issue comments,
  `gh api` reads, `gh run` watching, HTTP to a local host. These are the process's own "yes",
  written where a machine reads them.
- `guard` — rule zero. A sub-agent is denied outright and records **Blocked**. The orchestrator is
  denied unless `.claude/rule-zero.grants` holds a single-use grant matching the command; the
  grant is consumed on use and the use is logged to `.claude/rule-zero.log`.

**How the "yes" reaches the hook.** At the Questions phase the orchestrator asks for every
rule-zero action the plan can foresee; on yes it writes the grant
(`node .claude/hooks/rule-zero.ts --grant '<regex>'`) before any code that performs it.
At merge time one command writes the whole cleanup bundle
(`--bundle merge-cleanup <pr> <branch>`). An unforeseen rule-zero need mid-loop is not a
prompt: it becomes a `blocked-on-owner` issue and the loop continues with everything else.

The kit is permissive on purpose. A false positive costs the owner a question outside the one
phase where questions belong, and that is the failure mode that gets the kit thrown away. Name
exact scripts and flags in the project-specific section of the conf rather than guarding
general shapes. `node .claude/hooks/rule-zero-selftest.ts` proves the gate is live; run it
after every conf edit and in CI.

### 0.4 The three working habits every phase depends on

1. **Claims are not evidence.** An agent's report, a reviewer's comment, a green checker you have
   never seen fail — all are claims until verified against the code or the running system.
2. **Measure, don't assume.** Versions, counts, defaults, what a grep returned, which commit you
   are on. Record the measurement and where it was taken so the next reader can re-run it.
3. **Say what you did not do.** Scope left out, gates not run, claims adopted on argument rather
   than reproduction — all written down, flagged.

### 0.5 How agents write, and what implementers are held to

**Every text block begins with the writer's name.** The orchestrator writes `Orchestrator:`; an
implementer writes `I-<n.m>:` — its plan item, `I-2.3:` — and an implementer working an inline
brief in the PR-review loop writes `I-r<cycle>.<k>:`, minted for it by the brief (`I-r2.1:`);
an investigator writes `Investigator-<topic>:`, the stem of its report file
(`Investigator-mechanisms:`). A transcript holding an orchestrator and four sub-agents is
unreadable without names: scrolling back, there is no other way to tell who claimed what. A
sub-agent's running text reaches the owner only through `/tasks` and through its final message,
so the name matters most on that final message — the one block the owner is certain to read —
and the narration below is for whoever opens the transcript afterwards.

**One line before each tool call, prefixed like every other block**, saying what is about to
happen and why: "Orchestrator: reading the drift gate in `ci.yml` to see which paths it
inspects." Not what was done — the result says that. This is what makes a long transcript
skimmable, and an agent that cannot write the line has not yet decided what it is doing.

Both of these are prose, by the owner's choice. The principle at the top of this guide prefers a
mechanism, and one exists in outline: a `SubagentStop` payload carries `last_assistant_message`
(per the Claude Code hooks documentation), so a hook could refuse a final message that does not
begin with the agent's name. It is not built. The standard is carried by the definitions the
agents read, and conformance is measured by reading transcripts, not by a gate.

**What implementers are held to when they write code:**

- **Modular and reusable.** Small functions with one job each, composed. The piece needed next
  week should be liftable without the piece beside it; reuse is a property of size, not of
  intention.
- **No duplicate functions.** Never implement a function that already exists. Finding the copies
  is investigation work — an investigator lists the functions a change will need and every
  existing copy of each — and the plan locks the direction in before dispatch: the shared module
  is named under **Files** in the item that generalizes it, so the ownership fence and the
  generalization never contradict each other. An implementer that meets a duplicate the plan did
  not foresee, in a file that is not its own, reports **Blocked** naming the function; it does
  not copy it and it does not edit outside its files. Three cases, and only the first is a
  defect: a real duplicate is generalized into the shared module (this kit's `parseOptions`,
  the same skeleton in two hooks, is one and is on the ledger); the same name with a different
  contract stays two functions (its two `git` helpers); a copy across a build boundary stays,
  with the boundary named in a comment (`isRecord`, once in the compiled CLI and once in the
  payload's hooks — each side has to stand alone).
- **One concern per file.** A file you cannot summarize in one sentence is two files. No number
  is given here; the project's lint carries one if it wants one, and a threshold invented in
  prose is a threshold nobody measured.
- **Pure functions where the work allows.** Inputs to outputs, no hidden state, no I/O inside,
  I/O kept at the edges — so the logic can be tested by calling it instead of by staging the
  world around it.
- **Every implementation pairs with tests for its logic** — a test that fails when the change is
  reverted; that is the standard §6 applies to a checker. Browser-based visual tests use the
  suite named by the E2E line in `CLAUDE.md`, and the orchestrator still appraises the
  screenshots that suite produces: a green visual test says the pixels did not move, not that
  they are right. An item that adds no logic says so, with the reason, in its status block.

---

## 1. The ask

**Purpose:** fix what the loop is for, in one sentence, before anything is investigated.

The owner asks — in conversation, by pointing at a reviewer comment on merged code, or by
naming one or more issues (`#12 #15 #19` is one ask). The orchestrator restates the ask in one
sentence with its source; that sentence heads the review and is what the finished work is
judged against. Several issues travel together through investigation, review and questions;
whether they ship as one PR with a `Fixes` line each, or split into one contribution per issue,
is a Questions-phase decision the review recommends on — one PR when they touch the same area,
split when they do not. Then: confirm the checkout
(`git fetch && git status` — default branch, remote head, clean; record the SHA), mint the id,
create the branch with no upstream (`git switch -c <branch> --no-track origin/main`; then
`git config --get branch.<branch>.merge` must print nothing — a branch that tracks `origin/main`
is pushed *to* `main` by an IDE "Sync Changes", and the loop's record commits must land with the
PR, never before it), create `docs/reviews/<id>/`. From here everything is committed on the
branch as it is written: the documents are the state of record, and compaction can happen at any
time.

---

## 2. Investigate — two tiers

**Purpose:** establish ground truth before forming an opinion, without spending the
orchestrator's context on it.

**Tier one — the orchestrator, brief.** Enough to dispatch correctly and no more: `CLAUDE.md`,
`mem/index.md` and the area's `mem/<area>.md`, `mem/outstanding.md` (a recorded deferral or a
do-not-re-open decision may already cover the ask — a "fix" of one is a regression), the issue
and its comments, whether a linked PR is already open (join that loop; do not start a rival
branch), where the code lives. This tier ends when the orchestrator can write investigator
briefs. It does not end with a view.

**Tier two — investigators, thorough, parallel.** One `investigator` per brief. A brief is: the
id, one question, the paths in scope, the facts wanted and where to measure them, and whether
the owner has asked for live reads. When the brief concerns code that will be written, the facts
wanted include the functions the change will need and their existing copies, with `file:line` —
that list is what lets the plan lock the generalization in (§0.5). Each investigator writes
`docs/reviews/<id>/investigation-<topic>.md` — a hook in its definition fences every write to
`docs/reviews/` — and returns only its *Answer* paragraph. The orchestrator reads the files it
needs. Investigation reports are part of the record and archive with the review.

**Method rules:**

- Investigation is read-only on the code. Live reads happen only if the owner asked, are
  GET-equivalent, and are **labelled where they appear** with the system's actual response.
- A fact carries *where measured* (file:line, command, installed package version). A fact
  without a source is an assumption wearing a costume.
- For UI: the real rendered app at each relevant viewport, screenshots, appraised by the
  orchestrator itself. Code-reading cannot validate layout.

---

## 3. Review — `docs/reviews/<id>/review.md`

**Purpose:** give the owner a document they can read in five minutes and decide from.

The review is written by the orchestrator for the owner: plain English, high level, no
file:line in the prose — that lives in the investigation files, linked. Its shape
(`templates/review.md`):

- **The ask**, restated.
- **Short answer** — two to five sentences a non-engineer could follow.
- **What we found** — ranked by impact to real users, not by discovery order. A finding already
  fixed upstream stays, marked FIXED UPSTREAM: deleting it hides that it was once true.
- **What is right, and should not be changed** — deliberate designs, with the decision record.
- **Directions we could take** — two or more, each with what it means in practice, what it
  costs, what it forecloses, who else it touches; then a recommendation. This section is the
  point of the document.
- **Decisions we need from you** — the numbered list that becomes the questions: the direction,
  scope, each open decision, every rule-zero action the plan would need (exact command shape),
  anything the orchestrator is unsure about. More is better here.
- **What this review did not do.**

If the review discovers its own premise was wrong, it gets a dated **Correction** section at the
top, not a silent rewrite — a document that repeats a false premise is worse than the bug.

---

## 4. Questions — the last prompt

**Purpose:** aim the plan, once, with everything the orchestrator would otherwise guess.

The orchestrator uses the question tool, in as many rounds as it needs, asking everything it is
unsure about — the owner prefers more questions to fewer. Each question carries the recommended
answer. Included: the direction; scope; each decision from the review; each foreseeable
rule-zero action; anything vague about what "done" looks like.

When answered, the orchestrator:

- appends a dated **Decisions** section to the review — quoted, not paraphrased; the review above
  that line is not rewritten;
- writes a grant for each rule-zero yes, **before** any code that performs it;
- records settled decisions in `mem/outstanding.md` → *Settled — do not re-open*;
- records anything only the owner can do (accounts, content, licensing, third-party filings) in
  `mem/outstanding.md` → *Open — owner follow-ups* — the only kind of thing that ever waits;
- commits.

**This is the one phase in which the owner is prompted.** After it the orchestrator decides.

---

## 5. Plan — `docs/plans/<id>/`

**Purpose:** decide, in writing, what will be built, by whom, in what order, and what "done" means
— so that doing and believing are separate steps, and so the work can be handed to several
implementers at once.

The plan is a directory: `plan.md` is the overview, and each phase is its own file,
`phase-<n>.md`, holding that phase's items with their status blocks, a merge-back record and a
verification record. One file per phase means the implementers of a phase share one small file
and edit only their own item's section, while the overview — facts, decisions, phasing — is not
touched by anyone but the orchestrator. Findings from verification go into `phase-<n>.5.md`.

Built from the review, the investigations and the recorded decisions (`templates/plan.md`,
`templates/phase.md`):

- **Measured facts** — from the investigations; implementers inherit them, never re-derive.
- **Owner decisions this plan rests on** — copied from the review's Decisions section, dated.
- **Decisions made by this plan — veto here or in the PR** — every recommended default the
  orchestrator is implementing without asking, with grounds. One list, one place.
- **Phasing by expected merge cleanliness.** Implementers work in their own worktrees branched
  from the orchestrator's HEAD (`worktree.baseRef: head` in `.claude/settings.json`; without it
  they branch from the default branch and phase 2 never sees phase 1). Items that both touch a
  magnet file — lockfile, root manifest, `CLAUDE.md`, a shared client, the same region of a
  module — conflict on merge: different phases, or the shared edit is committed as a seed before
  the phase. Everything else runs in parallel.
- **Items** (in the phase files) — each with **Files** it owns — and, when the item generalizes
  a function, the shared module it moves into — **Approach** citing the facts,
  **Conventions that will fail your lint**, **Scoped validation** commands, **Acceptance
  including tests** (what must FAIL if the change is reverted). An item without a test in its
  acceptance is not done when the agent says it is. Under each item, a **Status** heading the
  implementer keeps current.
- **Orchestrator work** — documents only: seeds, plan, ledger, `CLAUDE.md`, blocked issues,
  archive, PR.
- **Blocked on the owner** — the only deferral there is; each entry is a GitHub issue number.

The plan directory is committed before anything is dispatched.

---

## 6. Orchestrate

**Purpose:** do the work through implementers, in parallel where merges allow; verify all of it
yourself; decide what comes up; defer nothing.

**Dispatch.** One `implementer` per item, phase-mates in parallel. The invocation is one line
(`Implement item <n.m> of docs/plans/<id>/phase-<n>.md. Scoped validation: <commands>.`); the agent
definition carries the invariants — read the guide and the area memory, inherit the facts, own
only your files, scoped validation, verify the checker, rule zero, no push, the status block.

**What the implementer does.** Works in `.claude/worktrees/<slug>` on `worktree-<slug>`; writes an
*In progress* status block under its item in the phase file as soon as it has read it and keeps it current —
deviations the moment they are decided, a blocked command the moment the hook denies it;
commits as it goes (commits are the transport; uncommitted work may be lost); finishes the block
as *Done* or *Blocked*; commits the phase file; returns a short summary and its worktree path. A
`SubagentStop` hook refuses to let it finish while nothing under `docs/plans/` has changed.

**Merging a phase back — the measured sequence:**

1. `git -C <wt> status --short` — clean, because implementers commit. If not, read what is
   uncommitted and decide; never `--force`.
2. `git -C <wt> log --oneline <branch>..HEAD` — read the commits.
3. `git merge --no-edit worktree-<slug>` into the plan branch. Status blocks under different
   headings in the same phase file merge cleanly (measured: adjacent sections auto-merged).
4. A conflict that is not mechanical (a lockfile, adjacent lines) becomes a `phase-<n>.5.md`
   item run on the merged base — the orchestrator does not resolve code by hand.
5. `git worktree remove <wt>`, then `git branch -d worktree-<slug>` — in that order; `-d` refuses
   while the worktree is attached and refuses an unmerged branch. The hook allows `-d` on
   `worktree-*` and treats `-D` as rule zero everywhere.

**Verify — after each phase merge and again at the end, on the merged branch, yourself.** Believe
nothing until you have seen it. Full check and build. The diff of every load-bearing file, not
the agent's summary of it. Grep for the conventions the area breaks. `git grep` the names of the
functions the phase added, looking for a second definition — parallel implementers cannot see
each other's worktrees, so a duplicate the plan did not foresee first exists here.
`.claude/rule-zero.log` for any denial an implementer hit. The gates the package check does
**not** cover — root config, scripts, formatting, the container build — CI gates them
separately, so find out here. **Verify the checker**: a new test is evidence only once seen to
fail — revert the fix, watch it go red, restore. **Distrust convenient results**: zero tests
run, an empty grep, an unchanged lockfile.
UI at each viewport, screenshots before and after, appraised by you. Containers: run it — user
id, migrations applied, server bound, nothing in stderr; a green build is not validation. Docs:
re-read every sentence the change made true or false; nothing mechanical checks prose, and that
is what Copilot finds.

**Fix through implementers, always.** Every finding from verification becomes an item in
`phase-<n>.5.md` with the finding as its spec and its own status block, implemented by a fresh
implementer. Fix
the **pattern everywhere** (`git grep` the construct), not the flagged line — a fix applied only
where a reviewer pointed is how a review loop gets spent re-finding one defect. A fix that
changes something marked as verified is re-run before the marker is kept. Re-verify.

**Decide, don't defer.** After the Questions phase the orchestrator has the power to choose the
best course: a wrong premise, an adjacent problem found on the way, a trade-off the plan did
not foresee. It decides, records the decision in `plan.md` under **Decisions made mid-loop —
implemented; veto in the PR** with its grounds, and has it implemented. A wrong premise gets a
dated `### Correction` section, not a rewrite.

**Blocked on the owner becomes a GitHub issue.** The only thing that waits is something the
owner must personally do — a rule-zero action nobody granted, a credential, an account,
content, a licence. For each, before the archive, the orchestrator opens an issue
(`templates/blocked-issue.md`) labelled `blocked-on-owner`, a kind (`rule-zero`,
`credentials`, `account`, `content`, `licensing`, `decision`) and the repo's area label,
creating labels that are missing; records the number under *Blocked on the owner* in `plan.md`
and in `mem/outstanding.md`; ships everything that does not depend on it; and says in the issue
how the shipped code behaves meanwhile. A well-labelled issue is findable by kind when the
owner sits down to clear them.

**Commit** when every item is Done and the final verification is green: what and why, the
decision it rests on, the validation run, any lockfile diff explained. Committing needs no
approval — history is additive; the owner reviews after the fact.

---

## 7. PR

**Purpose:** land the work and its records together.

**Archive first — and this is the last record commit.** `git mv` the review directory's
contents and the plan directory's contents into `docs/history/<id>/`, unchanged. Add one line
to `docs/history/index.md` (date · id · outcome · blocked issues). Update `mem/` and
`CLAUDE.md` to reflect the code as it lands — a stale count or a claim about a construct the
code refuses is a finding the next reviewer will raise. Commit ("Archive <id>; <what the
ledger now says>"), push. `docs/plans/` and `docs/reviews/` now read as empty.

After this commit nothing under `docs/` or `mem/` is touched again for this contribution. Every
record commit after the PR opens is a potential review trigger, and a loop that records its
own cycles in the repo can feed itself indefinitely. Review cycles are recorded as PR comments;
merge and deploy are reported in the conversation.

**Open the PR** with `gh pr create` and `templates/pr-body.md`: the ask and its source; what
changed, user-visible first; **Decisions to veto** — the Questions-phase decisions by reference,
the plan's decisions, and the mid-loop decisions, each with one line of grounds; validation with
counts and what was seen to fail; records; the blocked-on-owner issues; `Fixes #<n>`. Comment on
each blocked issue with the PR link. One issue per branch, one branch per PR. The PR number is
not written into the repo; `gh pr list --search <id>` finds it.

---

## 8. PR reviews — to silence

**Purpose:** treat Copilot exactly as §6 treats implementers — claims, verified before acted on —
and stop only when a cycle returns nothing.

**The waiting is a script.** `node .claude/hooks/pr-watch.ts --pr <n>` polls the PR head,
the inline comments and the review bodies every minute and returns as soon as there is
something new since it last reported, or `"new": []` after **five quiet minutes** — and the
quiet window restarts whenever the head changes, so every push gets its full five minutes of
reviewer time. Review bodies come back raw with any
collapsed low-confidence section extracted separately: a review that says "no comments" while
that section is non-empty is not silence. An empty Copilot review is returned once, so "Copilot
posted nothing" and "Copilot never arrived" are distinguishable states, and both are reported.

**One cycle:**

1. Run the watcher (`--reset` on the first cycle only).
2. Verify each returned item against the code. Verdict per item: *correct → fixed*; *correct in
   part → what was adopted and on which argument*; *not a finding → the verified reason*.
3. Legitimate ones go to implementers as **inline briefs** — files, approach, scoped
   validation, acceptance, in the message — because the plan is archived and is not reopened.
   Each brief opens with "You are `I-r<cycle>.<k>`" (the review cycle, then the brief's number
   within it), since there is no item number to name the implementer by; it signs its text with
   that name. Each returns its status block in its message. Verify, commit the fix, push.
4. Reply to each comment with what was done or the verified reason.
5. Post one **cycle comment** on the PR — head SHA, items returned, verdicts, the implementers'
   status blocks. That comment is the cycle record; nothing in the repo is updated.
6. Run the watcher again.

**The loop closes when a cycle returns `"new": []`.** The orchestrator then runs the docs-only
check (§9). If the PR changes code, it reports the final state — PR, head SHA, CI, cycles run,
anything blocked on the owner — comments on each issue (`templates/issue-comment.md`), and
**stops**. It does not ask whether to merge. If the PR is docs-only, it merges.

**Know your reviewer — measure once, record here:** trigger `<…>`; latency `<n> min` measured
`<date>`; how it treats generated files; where the low-confidence section appears; failure
modes (a retry that errors, a re-request that reviews a subset — a subset cycle that raises
nothing still counts). Expect it to catch documentation accuracy disproportionately.

---

## 9. Merge — on the owner's word, or docs-only

**Purpose:** the owner keeps the merge; the orchestrator can do it on a word, and can do it
unasked when nothing but documentation changed.

**On the owner's word.** The owner merges, or says "merge and clean up". On that word the
orchestrator writes the bundle grant (`rule-zero.ts --bundle merge-cleanup <pr> <branch>` —
merge, delete the remote branch, `-D` the local branch, since `-d` refuses after a squash
merge), runs `gh pr merge <n> --<method> --admin --delete-branch`, switches to the default
branch and pulls, deletes the local branch, clears any unused grants, and quotes the owner's
words in its report. No further question is asked, and nothing in the repo records the merge.

**The docs-only standing rule.** A PR whose changes are documentation or comments only — no
code — is merged by the orchestrator once the review loop is silent, without the owner's word,
and its CI is cancelled first because it proves nothing. The decision is a measurement, not a
judgement: `.claude/hooks/docs-only.ts` classifies every changed file against the default
branch — documentation paths (`*.md`, `*.rst`, `*.txt`, `docs/`, `mem/`), or code files whose
added and removed lines are all blank or whole-line comments — and writes the merge-cleanup
grant itself only when every file passes. Anything it cannot classify is code. `.claude/` is
deliberately not a documentation path: the kit cannot self-merge changes to its own gates. The
grant use is logged with the rule as the "yes".

**The admin bypass is always used.** Most repositories protect the default branch, so both
ways in merge with `--admin`. The rule-zero gate, not branch protection, is what keeps the
merge behind the owner's word. If the PR was merged
before a review cycle ran, the owed cycle is worked post-merge through the whole loop as a new
contribution — ask, investigate, review, questions, plan — not as a quiet fix.

---

## 10. Deploy — per `CLAUDE.md`

**Purpose:** close the loop on the running system, not on the merge.

`CLAUDE.md` declares the mode under a *Deploy* heading:

- **production-ci** — a merge to the default branch triggers the deploy Action. The
  orchestrator watches that run to completion (`gh run list --workflow <name> --branch
  <default> -L1`, `gh run watch <id>`) and records its final status. "It fired" is a claim; the
  run's result is the evidence.
- **local-containers** — the app lives in containers on the dev machine. The orchestrator
  rebuilds them with the merged code using the command in `CLAUDE.md`, runs the container checks
  from §6 (user id, migrations applied, server bound, nothing in stderr), and records the result.
- **none yet** — recorded as such.

The orchestrator reports in one paragraph in the conversation — merge method and SHA, deploy
result, open blocked-on-owner issues. No commit. The loop is over.

---

## 11. The small path

**Purpose:** scale the ceremony to the risk without scaling down the rules. A conf line, a doc
fix, a version pin or a one-line bug does not need three investigators, a review document, a
plan directory, a worktree and an archive to be done well — it needs the change, the full
check, a record, a reviewer and a merge. The full loop applied to a one-liner was measured as
the thing that made the loop feel heavier than the change (owner, 2026-08-26).

**What qualifies.** A few lines in a few files, no new dependency, no gate or hook logic. The
owner declares it (`/contribute --small <ask>`, or "small" in the ask), or the orchestrator
proposes it when restating the ask and the owner accepts. Nobody else decides.

**What stays.** Rule zero and its hook; the three habits; the full check from `CLAUDE.md` as
the gate, with the checker verified where a test exists; the review loop (`pr-watch.ts` to
silence, every item verified before it is acted on, a cycle comment per cycle); the record —
one entry in `docs/history/index.md`, committed with the change; `mem/` if a decision was
settled; the deploy step.

**What goes.** The review document, the Questions phase, the plan directory, implementers and
worktrees, the archive directory — and, usually, investigators. If the one measurement that
decides whether the change is small needs an investigator, run one; its report is then part of
the record and is archived under `docs/history/<id>/` with the change, exactly as in the full
loop. Investigation reports are never deleted (owner, 2026-08-26).

The orchestrator makes the change itself — the one place the "documents only" rule is lifted —
and in a kit repo edits `template/` and regenerates the root copy with the CLI. The PR body is
short: ask and source, why small and who declared it, what changed, validation with counts and
what was seen to fail.

**How it merges.** Under a standing approval, the second after docs-only: once the review loop
is silent and `ci-ok` is green on the head, the orchestrator writes the bundle grant and
merges (squash, `--admin`) without a word. The report names the way in — "small path,
declared by the owner" or "small path, proposed and accepted".

**Escalation is the safety.** The moment orientation or verification shows more than the
change — a test that pins the old behaviour, a second file family, a hook or gate touched, a
decision the owner would want to make — the orchestrator stops, says so, and runs the full
loop from §1. The small path never widens silently; a small change that turns out not to be
small is exactly what the full loop is for.

---

## Appendix A — the ledger (`mem/outstanding.md`)

Three sections, each entry dated:

- **Open — owner follow-ups.** Things only the owner can do; nothing in code is blocked on them.
- **Blocked on the owner.** The one kind of deferral, one line per GitHub issue: `#n` — what the
  owner has to do — which contribution is waiting.
- **Settled — do not re-open, do not "fix".** Owner decisions with date and grounds. A review that
  recommends against one flags it (⚑) and says so; it does not silently re-argue it.

An entry moves between sections; it is deleted only when it is no longer true.

## Appendix B — issue closing comment

```markdown
**Root cause:** <one or two sentences, with file:line>
**What changed:** <bullets>
**PR:** #<n> — review loop closed <date>, CI green on `<sha>`.
**Blocked on the owner:** <list, with where each lives — or none>
```

## Appendix C — the loop in checklist form

- [ ] **Ask** restated with source; checkout at remote default head, clean; id minted; branch and
      `docs/reviews/<id>/` created
- [ ] **Investigate**: tier one brief; investigators briefed, one report each under
      `docs/reviews/<id>/`; the functions any new code will need and their copies listed;
      nothing changed
- [ ] **Review** written for the owner: short answer, what we found, what not to change,
      directions with a recommendation, decisions we need, not done; committed
- [ ] **Questions** asked with the question tool, all of them, each with a recommendation;
      Decisions section appended to the review; grants written; ledger updated; committed
- [ ] **Plan** directory written and committed: `plan.md` (facts, owner decisions, plan decisions
      for veto, phasing) + `phase-<n>.md` (items with files/approach/validation/acceptance+tests)
- [ ] **Orchestrate**: implementers dispatched; phases merged back (status clean → read commits →
      merge → worktree remove → branch -d); verified by the orchestrator on the merged branch;
      the phase's new function names grepped for a second definition; findings fixed by
      implementers via `phase-<n>.5.md`; mid-loop decisions recorded;
      blocked-on-owner issues created and labelled; final commit
- [ ] **PR**: archived into `docs/history/<id>/` with an index line; `mem/` and `CLAUDE.md`
      reflect the code; pushed — **last record commit**; `gh pr create` with decisions-to-veto,
      validation, blocked issues, `Fixes #n`
- [ ] **PR reviews**: pr-watch (5-minute quiet window, restarts on push) → verify → fix via
      implementers (inline briefs) → reply → cycle comment on the PR → repeat until `"new": []`;
      docs-only check run; if code changed: final state reported, issues commented, **stopped
      without asking to merge**
- [ ] **Merge** on the owner's word (bundle grant) or docs-only (grant written by the check, CI
      cancelled): `--admin --delete-branch` → local `-D` → grants cleared; no commit
- [ ] **Deploy** per `CLAUDE.md`: run watched to completion, or containers rebuilt and checked;
      one-paragraph report; no commit
- [ ] **Small path** (§11), when declared or accepted: ask restated with why it is small; area
      read, the one thing that could make it not small measured; change made by the
      orchestrator; full check + checker verified; one `docs/history/index.md` line committed
      with the change; short PR; pr-watch to silence; merged when silent and `ci-ok` green;
      escalated to the full loop the moment it is more than the change

## Appendix D — what changed from the portable baseline, and why

| Baseline | This edition | Why |
| --- | --- | --- |
| Ten unnamed stages | Ten named phases: ask, investigate, review, questions, plan, orchestrate, PR, PR reviews, merge, deploy | The owner's description of the loop |
| Rule zero backed by "a mechanism" in the abstract | `PreToolUse` hook + `rule-zero.conf` + single-use grants + log + self-test; no prompts | Runs inside sub-agents too and holds under bypassed prompts; the grant is the recorded yes |
| Questions "together, once" | **One prompt phase.** Rule-zero yeses collected there; mid-loop the orchestrator decides and records for veto | The owner accepts prompts in exactly one place and prefers more questions there, none elsewhere |
| Investigation by the orchestrator, read-only | Two tiers: orchestrator orients; investigators (Opus) write reports under `docs/reviews/<id>/`, fenced by a hook | Keeps the orchestrator's context for orchestrating; reports become part of the record |
| Review = findings + ranked recommendations | Review = plain-English document for the owner, with **directions** and **decisions we need** | The review's job is to make the questions answerable |
| "Strongest model available" | **Opus** for all sub-agents | Owner correction |
| Sub-agents never commit | Implementers commit to their own `worktree-*` branch; never push | Worktrees make commits the transport |
| Status block appended at the end | Kept current from *In progress*; `SubagentStop` hook enforces presence | Feedback lands in the plan as the work happens |
| Trivial fixes applied by the orchestrator | Every code change through an implementer; orchestrator edits documents only | Owner's rule |
| Deferred findings to the ledger | **Nothing deferred** except what the owner must personally do; mid-loop decisions implemented and listed for veto | Owner's rule |
| Phasing by file contention | Phasing by expected merge cleanliness; magnet files seeded or serialised | Each implementer has its own checkout |
| Archive after commit, before push | Archive **before the PR is opened**, into `docs/history/<id>/` with an index line; **no record commits after the PR opens** | Records land with the PR; a loop that records its own cycles in the repo triggers its own reviews |
| Review/plan named by date(+time) and slug, flat history | One id per contribution; plan split into `plan.md` + `phase-<n>.md`; directory per contribution in history; `index.md` changelog | The name is the same everywhere it appears; phases can be worked concurrently |
| Deferred findings in the ledger | Anything blocked on the owner is a **GitHub issue**, labelled `blocked-on-owner` + kind + area, created before the archive | Findable and clearable by kind; the ledger holds the number |
| "Wait for the reviewer's latency" | `pr-watch.ts`: one-minute polling, returns on news or after five quiet minutes, window restarts on push, extracts collapsed sections | Waiting is a script, not an agent counting minutes |
| Merge only on the owner's explicit ask | + the **docs-only standing rule**: `docs-only.ts` measures the diff and writes the grant itself; CI cancelled; `--admin` always | One standing approval, made mechanical and conservative |
| One issue per branch | An ask may name several issues; one PR or split is a Questions-phase decision | The owner's asks come in batches |
| Loop ends at "report and stop" | + **Merge** on the owner's word (bundle grant) + **Deploy** per `CLAUDE.md` | The loop closes on the running system |
| No small-change path; small changes produce short documents | The **small path** (§11): declared or accepted, orchestrator edits directly, full check, PR + one index entry, merged when silent and `ci-ok` green, escalates when it is more than the change | Owner, 2026-08-26: one-liners should not need the full loop |
| Agents unnamed; no code-structure rules | Every agent prefixes its text with its name and narrates before tool calls; implementer code standards and tests-with-logic in the definition; duplicates found at investigation | Owner's standard, 2026-08-26; prose by the owner's choice (direction A) |
