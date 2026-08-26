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
**Done** (implementer, 2026-08-26).
- **Files touched:** `template/.claude/rules/process.md` — `## Voice` (W1 + W2, all four
  prefixes) and `## Code` (W3–W7 as five bullets, closing with W4's investigation/plan
  sentence) spliced between **Three habits** and **Roles**; the **Roles** orchestrator bullet
  gains "briefs investigators — for the functions a change will need and their copies among
  the rest" and the sub-agents bullet "writes tests for the logic it adds". +35/−5 lines; the
  file grows 62 → 92 lines.
- **Commits:** `88504a2` on `worktree-agent-ade9f5e0e4ce4cce7`, plus one follow-up commit
  recording that sha here
- **Deviation:** the canonical W5 sentence is spelled "Keep to one concern per file; a file you
  cannot summarize in one sentence is two files" rather than opening with "One concern per
  file." — the acceptance grep is case-sensitive and the sentence-initial capital made it exit
  1. Term unchanged, capitalization only. W7's second half (the orchestrator appraises the
  screenshots) is dropped here — it is the orchestrator's duty, not the implementer's, and this
  file is loaded into every session; it survives in full in `implementer.md` (item 1.2).
- **Tests:** none: no logic — prose only. Acceptance is the grep below.
- **Verified against the installed package before writing:** n/a — no package API used; the
  base text was read from `template/.claude/rules/process.md` at `8e29e80`+plan commit, and
  PR #4's small-path text was preserved (first 8 lines sha256 `da8b0db…` identical before and
  after; the diff is a single hunk at line 44).
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm lint` — exit 0 (needed `pnpm install --frozen-lockfile` first: the worktree had no
    `node_modules`)
  - `pnpm typecheck` — exit 0
  - `grep -c 'Orchestrator:' template/.claude/rules/process.md` — **2** (base: 0)
  - Acceptance (four greps, `&&`-chained) — exit **0**
  - **Checker verified:** with the file restored to its `HEAD` content the same chain exits
    **1** and `grep -c 'Orchestrator:'` prints **0**; restored, exit 0 and 2 again. Done twice
    — once via `git stash` (see below) and once by copying `git show HEAD:<path>` over the file
    and back, which is the run recorded here.
- **Blocked on:** nothing denied by the hook. **But:** `git stash push`/`git stash pop` is
  unsafe in this repo while siblings run — `refs/stash` is shared by all worktrees. My
  `git stash pop` popped item 1.4's entry (`14cbd83 WIP on worktree-agent-ad3daf37e9486284b`,
  `template/.claude/skills/contribute/SKILL.md`, +31/−15) into *this* worktree and dropped it
  from the stack; my own entry was taken by that agent's pop. I did not discard either: item
  1.4's hunks are saved as a patch at
  `C:/Users/KEATON~1/AppData/Local/Temp/claude/c--Users-Keaton-Forrest-Documents-GitHub-cl-workflow/324b5e61-1fc3-4cf0-a391-940a1fd78cb1/scratchpad/item-1.4-SKILL.md.patch` and the file is left modified-but-uncommitted here
  (my commit adds explicit paths only, so it does not ride along); its stash commit `14cbd83`
  is still reachable via `git fsck --unreachable`. My own change was rebuilt from my draft, not
  recovered from git.
- **Orchestrator should verify:** the full check; that item 1.4's SKILL.md work survived in its
  own worktree (it lost its stash to this race — the patch above is the backup); and that no
  other phase-1 item used `git stash`.

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
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<Per item: worktree branch, commits merged, conflicts and how resolved, worktree removed.>

## Verification (orchestrator, after this phase merged)
<What was run, counts, checkers verified, findings → phase 1.5 items.>
