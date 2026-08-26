# Phase 1 — 6 implementers, parallel (2026-08-26-prose-standards)

**Plan:** `plan.md` · **Starts from:** the branch head after the rebase onto post-#4 `main`
(SHA in `plan.md` → Orchestrator work)
**Magnet files this phase touches:** none shared — each item owns a distinct file family under
`template/`, except 1.6 which owns `.github/workflows/ci.yml` and the root `CLAUDE.md`. Nobody
touches the generated root `.claude/`, the root `docs/guides/agent-workflow.md`, the lock, or
README (phase 2 and 3).

**Common to every item.** Read `plan.md` → **Canonical wording** first; the terms there are
fixed. PR #4 (the small path, SKILL §11) is already in your base — keep its text; add nothing to
§11. Prose only: no `.ts` changes. Wrap at ~95 columns like the surrounding text, LF endings.
Your status block's **Tests** line reads "none: no logic" — these items add prose, and the
acceptance is a grep that must exit 1 if the change is reverted. Scoped validation for every
item: `pnpm lint && pnpm typecheck` (they do not read `.md`, but they prove you broke nothing
else), plus the item's own greps.

### Item 1.1 — `process.md`: voice and code standards, always loaded
**Files:** `template/.claude/rules/process.md`
**Approach:** Two new short sections after **Three habits** and before **Roles**: `## Voice` —
W1 and W2 in three or four lines, all four prefixes named; `## Code` — W3–W7 as five terse
bullets (one each), ending with the sentence that duplicates are found at investigation and
locked in by the plan (W4, first half). In **Roles**, add to the orchestrator bullet "briefs
investigators for the functions a change will need and their copies" and to the sub-agents
bullet "writes tests for the logic it adds". Keep the file short — it is loaded into every
session; if a sentence can go, it goes.
**Conventions that will fail your lint:** none for `.md`; keep LF and the ~95-column wrap.
**Scoped validation:** `pnpm lint && pnpm typecheck`; `grep -c 'Orchestrator:' template/.claude/rules/process.md`
**Acceptance:** `grep -q 'I-<n.m>:' template/.claude/rules/process.md && grep -q 'Investigator-<topic>:' template/.claude/rules/process.md && grep -q 'I-r<cycle>.<k>:' template/.claude/rules/process.md && grep -q 'one concern per file' template/.claude/rules/process.md` exits 0; on `git stash` of your change it exits 1. The file's first eight lines (PR #4's small-path sentence) are unchanged.
#### Status — item 1.1
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.2 — the two agent definitions
**Files:** `template/.claude/agents/implementer.md`, `template/.claude/agents/investigator.md`
**Approach:** `implementer.md`: a new `## Voice` section right after the opening paragraph
("You are implementing **one item**…") with W1 (your name is `I-<n.m>:`; on an inline brief the
brief names you `I-r<cycle>.<k>:`) and W2; a new `## Code` section after **Scope** with W3–W7
in full, including the Blocked rule of W4 in the same bullet style as the existing rule-zero
bullet; in **Validation**, first bullet becomes the tests obligation (W7, "a test that fails when
the change is reverted"), the existing "Verify the checker" bullet follows it; in the status
block template add `- **Tests:** <files added or changed — or "none: no logic", with the reason>`
between **Validation** and **Blocked on**. `investigator.md`: a `## Voice` section after the
opening paragraph with W1 (`Investigator-<topic>:`, the stem of your report file) and W2; under
**Rules**, a new bullet — *When the brief concerns code to be written, list the functions it
will need that already exist, with `file:line`, and every copy of each; the plan locks in the
generalization from your list* — and in the report shape a Facts row hint
`| existing function the change needs / its copies | <name> at <file:line>; copy at <file:line> | <grep> |`.
The "Your final message…" sentences in both files stay; the prefix applies to that message too.
**Conventions that will fail your lint:** the frontmatter of both files is load-bearing
(`hooks:` in `investigator.md`, `isolation: worktree` in `implementer.md`) — do not touch it.
**Scoped validation:** `pnpm lint && pnpm typecheck`; `head -12 template/.claude/agents/investigator.md` unchanged from base (`git diff --stat` shows only body hunks)
**Acceptance:** `grep -q '^## Voice' template/.claude/agents/implementer.md && grep -q '^## Code' template/.claude/agents/implementer.md && grep -q 'I-r<cycle>.<k>:' template/.claude/agents/implementer.md && grep -q '\*\*Tests:\*\*' template/.claude/agents/implementer.md && grep -q 'Investigator-<topic>:' template/.claude/agents/investigator.md && grep -q 'its copies' template/.claude/agents/investigator.md` exits 0; on stash exits 1. `git diff -U0 <base> -- template/.claude/agents/ | grep -c '^[-+]\(name\|model\|tools\|hooks\|isolation\):'` prints 0.
#### Status — item 1.2
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.3 — the guide: the reasoning
**Files:** `template/docs/guides/agent-workflow.md`
**Approach:** (a) In §0.2, one clause per role: orchestrator "— every text block it writes
begins `Orchestrator:`"; sub-agents "… each names itself (`I-<n.m>:`, `Investigator-<topic>:`)".
(b) New **§0.5 How agents write** after §0.4: W1 and W2 with the why — a transcript with several
agents in it is unreadable without names; a sub-agent's running text reaches the owner only
through `/tasks` and its final message, so the name matters most on the final message and the
narration is for whoever opens the transcript; then W3–W7 with the why in a sentence each, and
W4's three cases (generalize / same name different contract stays / build boundary stays,
named in a comment) — cite the kit's own `isRecord`, `git` and `parseOptions` as the examples,
without file:line. Say plainly that these are prose by the owner's choice: the guide's principle
prefers mechanisms, the prefix on a final message could be one (`last_assistant_message` in the
stop payload, per the docs), and it is not one today. (c) §2 tier two: a brief also asks for
"the functions the change will need and their existing copies". (d) §5 items: "**Files** — and,
when the item generalizes a function, the shared module". (e) §6 verify: "`git grep` the names
of functions the phase added for a second definition". (f) §8 inline briefs: "each opens with
'You are `I-r<cycle>.<k>`'". (g) Appendix C: the Investigate line gains "copies listed"; the
Orchestrate line gains "duplicates grepped". (h) Appendix D: the row from `plan.md`. (i) §1:
the branch is created with no upstream — `git switch -c <branch> --no-track origin/main` —
with the why in a clause: a branch tracking `origin/main` is pushed *to* `main` by an IDE
sync, and the loop's record commits must land with the PR, never before it (mid-loop decision
in `plan.md`).
**Conventions that will fail your lint:** none for `.md`; PR #4's §11 and its appendix rows
are in your base — leave them.
**Scoped validation:** `pnpm lint && pnpm typecheck`; `grep -n '^## \|^### ' template/docs/guides/agent-workflow.md` shows §0.5 between §0.4 and §1
**Acceptance:** `grep -q '^### 0.5 How agents write' template/docs/guides/agent-workflow.md && grep -q 'I-r<cycle>.<k>' template/docs/guides/agent-workflow.md && grep -q 'last_assistant_message' template/docs/guides/agent-workflow.md && grep -q 'second definition' template/docs/guides/agent-workflow.md && grep -c '^| ' template/docs/guides/agent-workflow.md` exits 0 and the Appendix D row count is base + 1; on stash exits 1.
#### Status — item 1.3
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.4 — `SKILL.md`: the orchestrator's own rules and duties
**Files:** `template/.claude/skills/contribute/SKILL.md`
**Approach:** At the top, after "You are the orchestrator…": W1 and W2 for the orchestrator in
two sentences ("Every text block you write begins `Orchestrator:` …"). §2 tier two: the brief
also names "the functions the change will need and their existing copies". §5 rules: the
**Files** bullet gains "— including the shared module when the item generalizes a function; the
investigation's copies list says which". §6 **Verify**: add "`git grep` the names of functions
the phase added for a second definition" to the list. §8: "Each inline brief opens with 'You
are `I-r<cycle>.<k>`' (review cycle, brief number); the implementer signs with it." §1: the
branch-creation bullet becomes `git switch -c <branch> --no-track origin/main`, then
`git config --get branch.<branch>.merge` must print nothing — one sentence of why (an IDE sync
pushes a tracking branch to `main`; mid-loop decision in `plan.md`). Nothing in §11. The
dispatch line in §6 is unchanged — the agent definition carries the identity.
**Conventions that will fail your lint:** the frontmatter `description:` is what Claude Code
shows; PR #4 extended it — leave it.
**Scoped validation:** `pnpm lint && pnpm typecheck`; `git diff -U0 <base> -- template/.claude/skills/contribute/SKILL.md | grep -c '^[-+]description:'` prints 0
**Acceptance:** `grep -q 'begins .Orchestrator:' template/.claude/skills/contribute/SKILL.md && grep -q 'I-r<cycle>.<k>' template/.claude/skills/contribute/SKILL.md && grep -q 'second definition' template/.claude/skills/contribute/SKILL.md && grep -q 'existing copies' template/.claude/skills/contribute/SKILL.md` exits 0; on stash exits 1.
#### Status — item 1.4
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.5 — templates and the owned `CLAUDE.md` skeleton
**Files:** `template/.claude/skills/contribute/templates/investigation.md`,
`template/.claude/skills/contribute/templates/phase.md`, `template/CLAUDE.md`
**Approach:** `investigation.md`: one Facts row after the live-count row —
`| existing function the change needs / its copies | <name> at <file:line>; copy at <file:line> | <the grep> |`.
`phase.md`: `**Files:** <exact list the agent owns — including the shared module when this item generalizes a function>`
and in the Status placeholder line nothing (the block shape lives in `implementer.md`).
`template/CLAUDE.md`: the E2E line becomes W8 exactly. Nothing else in the skeleton.
**Conventions that will fail your lint:** none; keep the placeholders' `<angle>` style.
**Scoped validation:** `pnpm lint && pnpm typecheck`; `git diff --stat <base>` shows exactly these three files
**Acceptance:** `grep -q 'its copies' template/.claude/skills/contribute/templates/investigation.md && grep -q 'shared module' template/.claude/skills/contribute/templates/phase.md && grep -q 'Playwright' template/CLAUDE.md` exits 0; on stash exits 1; `grep -c Playwright template/CLAUDE.md` prints 1.
#### Status — item 1.5
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.6 — the drift gate sees the guide
**Files:** `.github/workflows/ci.yml`, `CLAUDE.md` (repo root)
**Approach:** In the "Generated .claude/ drift gate" step, the pathspec becomes
`-- .claude/ docs/guides/` and the step's comment says why: `docs/guides/agent-workflow.md` is a
managed payload file `update` rewrites at the root. Rename the step "Generated copy drift
gate". Root `CLAUDE.md` → **Commands** → the "generated-copy gate" sentence quotes the new
pathspec. Not `docs/` — `docs/history/` and `docs/plans/` legitimately differ from the
payload's scaffolding here.
**Conventions that will fail your lint:** YAML indentation inside `run: |`; LF.
**Scoped validation:** `pnpm lint && pnpm typecheck && pnpm build && git diff --exit-code dist/`;
then the gate itself: `node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/ docs/guides/` prints nothing in your worktree — it holds only your own change and `template/` is untouched there, so the root copy still matches; if anything prints, read it and report it rather than fixing it. **Verify the checker:** append a line to the root `docs/guides/agent-workflow.md`, run `update`, confirm `git status --porcelain --untracked-files=all -- docs/guides/` lists a `.new` (or the modified file) and `-- .claude/` alone lists nothing; then `git checkout -- docs/guides/agent-workflow.md` and delete the `.new`. Record both outputs.
**Acceptance:** `grep -q -- '-- .claude/ docs/guides/' .github/workflows/ci.yml && grep -q 'docs/guides/' CLAUDE.md` exits 0; on stash exits 1. `git status --porcelain` clean at the end apart from your commits.
#### Status — item 1.6
**Done** (implementer, 2026-08-26).
- **Files touched:** `.github/workflows/ci.yml` — the drift-gate pathspec becomes
  `-- .claude/ docs/guides/`, the step is renamed "Generated copy drift gate", and its comment
  says why (`docs/guides/agent-workflow.md` is a managed payload file `update` rewrites at the
  root; the rest of `docs/` stays out because `docs/history/` and `docs/plans/` are this repo's
  own records); `CLAUDE.md` (root) — the **Commands** generated-copy-gate sentence quotes the new
  pathspec and carries the same one-clause reason.
- **Commits:** on `worktree-agent-a777a40ce3eec879c`; shas in the merge-back record.
- **Deviation:** none in the change itself. During the checker verification the restore command
  the item prescribes (`git checkout` with a `--` pathspec) was denied by rule zero — see
  **Blocked on**. The guide was restored instead by deleting the bytes I had appended;
  `git diff -- docs/guides/` is empty, so the file is byte-identical to `HEAD`.
- **Tests:** none: no logic — the change is a CI pathspec and a sentence of prose. The gate is
  its own checker, and it was made to fail and then pass (below).
- **Verified against the installed package before writing:** no npm package is load-bearing here;
  verified against the repo instead — `docs/guides/agent-workflow.md` is absent from the CLI's
  `OWNED` list (`src/cli.ts:31-41`), so it is managed and rewritten at the root by `update`, which
  is the premise of the widened pathspec. Confirmed live: `update` over a hand-edited root guide
  printed `warn docs/guides/agent-workflow.md has local edits — wrote
  docs/guides/agent-workflow.md.new beside it, yours untouched`.
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm lint` — exit 0, no problems (`pnpm install --frozen-lockfile` was needed first: the
    worktree had no `node_modules`)
  - `pnpm typecheck` — exit 0
  - `pnpm build && git diff --exit-code dist/` — exit 0, `dist/` unmoved
  - The gate in this worktree: `node dist/cli.js update .` → `0 refreshed, 24 already current,
    0 left beside as .new, 0 removed, 9 owned files untouched`; then
    `git status --porcelain --untracked-files=all -- .claude/ docs/guides/` → **no output**
    (0 bytes, exit 0), as the item predicted.
  - `.github/workflows/ci.yml` parses (PyYAML): the step's `run` is exactly the three expected
    lines — `node dist/cli.js update .`, the `status=` line carrying the new pathspec, the `if`
    guard — with `shell: bash` and the name `Generated copy drift gate`.
  - **Checker verified:** appended a line to the root `docs/guides/agent-workflow.md` and ran
    `update`. Under the new pathspec, `git status --porcelain --untracked-files=all --
    .claude/ docs/guides/` printed two lines — ` M docs/guides/agent-workflow.md` and
    `?? docs/guides/agent-workflow.md.new` — while `-- .claude/` alone printed **nothing**: the
    old pathspec is blind to exactly this drift. The step body run verbatim under bash exited
    **1** on that state. After the guide was restored and the `.new` deleted, the same step body
    exited **0** with no output, and `git status --porcelain` showed only my three modified files.
  - **Acceptance:** `grep -q -- '-- .claude/ docs/guides/' .github/workflows/ci.yml && grep -q
    'docs/guides/' CLAUDE.md` → exit **0**; the same pair run against the base copies extracted
    with `git show HEAD:<file>` (used in place of `git stash`, to leave the worktree state alone)
    → exit **1**.
- **Blocked on:** nothing left unfinished, but one command was denied and the orchestrator should
  see it: the item's restore step — `git checkout` with a `--` pathspec on
  `docs/guides/agent-workflow.md` — is guarded at `rule-zero.conf:36`
  (`guard git checkout (-- |\.( |$))`), so a sub-agent cannot run it, grant or no grant. Worth
  noting because the item text instructs the implementer to run exactly that; the restore was
  completed another way and verified with `git diff`.
- **Orchestrator should verify:** the full check including `pnpm selftest` (62/62) and the CLI
  smoke, neither of which this item ran; and that the widened gate still prints nothing after
  phase 2 regenerates the root copy — in this worktree `template/` is untouched, so the root copy
  matched trivially.

## Merge-back record (orchestrator)
<Per item: worktree branch, commits merged, conflicts and how resolved, worktree removed.>

## Verification (orchestrator, after this phase merged)
<What was run, counts, checkers verified, findings → phase 1.5 items.>
