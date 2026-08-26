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
**Done** (implementer, 2026-08-26).
- **Files touched:** `template/.claude/agents/implementer.md` — new `## Voice` (W1 with the
  `I-r<cycle>.<k>:` inline-brief case, W2) after the opening block, new `## Code` (W3–W7 as five
  bullets, W4's Blocked rule in the rule-zero bullet style) after **Scope**, the tests obligation
  as the first **Validation** bullet with **Verify the checker** immediately after it, and
  `- **Tests:** …` in the status-block template between **Validation** and **Blocked on**;
  `template/.claude/agents/investigator.md` — new `## Voice` (W1 `Investigator-<topic>:`, W2)
  before **Rules**, a **Functions that already exist** bullet under **Rules** (W4's first half),
  and the copies row in the report shape's Facts table.
- **Commits:** `632420f` on `worktree-agent-ab0825153965e6556` (both agent definitions + this
  status block), plus a follow-up commit recording this sha.
- **Deviation:** two, both small. (a) The item says the **Validation** first bullet "becomes" the
  tests obligation with **Verify the checker** following it; the existing "Run the **scoped**
  commands" bullet was not dropped — it moved to third, so the section now reads tests → verify
  the checker → scoped commands → convenient results. (b) `investigator.md`'s `## Voice` sits
  after *both* opening paragraphs (before `## Rules`) rather than after the first, which would
  have orphaned the "The orchestrator's message gives you…" paragraph under the new heading.
- **Verified against the installed package before writing:** n/a — prose only, no library
  behaviour relied on. Frontmatter of both files verified untouched by diff (first `implementer.md`
  hunk at line 19, first `investigator.md` hunk at line 23; `head -12` of each is base text).
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm lint` — clean, 0 problems (needed `pnpm install --frozen-lockfile` first; this worktree
    had no `node_modules`)
  - `pnpm typecheck` — clean, 0 errors (neither command reads `.md`; they prove nothing else broke)
  - `git diff -U0 HEAD -- template/.claude/agents/ | grep -c '^[-+]\(name\|model\|tools\|hooks\|isolation\):'`
    — prints `0`
  - Acceptance grep chain (six greps) — exit 0
  - **Checker verified:** `git stash push -- template/.claude/agents/`, the same chain exited **1**
    (first failure `grep -q '^## Voice' implementer.md`); `git stash pop`, exit **0** again
- **Tests:** none: no logic — this item is prose in two agent definitions. The acceptance grep
  chain is the "fails when reverted" check, and it was seen failing on the stash.
- **Blocked on:** nothing denied by the hook in the repo. Outside it, two attempts to put a helper
  script in the session scratchpad were refused — `Write C:\Users\Keaton
  Forrest\AppData\Local\Temp\claude\…\scratchpad\status12.py` (rule-zero.conf:49
  `^path:outside-repo`) and a `cat > "$TMPDIR/../status12.py"` heredoc (worktree-isolation guard,
  "too complex to verify"). Neither was needed; the edits were made in place.
- **Orchestrator should verify:** the full check plus the generated-copy gate — this item changes
  two **managed** payload files, so `.claude/cl-workflow.lock` and the root
  `.claude/agents/*.md` are stale until phase 2 regenerates them; the wording against
  `plan.md` → Canonical wording (I shortened W3–W7 for bullets but kept every fixed term); and
  the two deviations above.

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
**Done** (implementer, 2026-08-26).
- **Files touched:** `template/.claude/skills/contribute/SKILL.md` — six prose edits: W1/W2 for
  the orchestrator as a new paragraph after the role sentence; §1 gains a `git switch -c
  <branch> --no-track origin/main` bullet with the `branch.<branch>.merge` check and one
  sentence of why; §2 tier two asks the brief for the functions the change will need and their
  existing copies with `file:line`; §5's item rule names the shared module under **Files**;
  §6 **Verify** adds the `git grep` for a second definition; §8 names inline briefs
  `I-r<cycle>.<k>`. Frontmatter, the §6 dispatch line and §11 untouched.
- **Commits:** on branch `worktree-agent-ad3daf37e9486284b`
- **Deviation:** none in the prose. Two mechanical notes: the §6 **Verify** and §8 paragraphs
  were re-wrapped so the inserted clauses sit inside the ~95-column flow, so their diffs are
  larger than the sentences added; `pnpm install --frozen-lockfile` was run in the worktree
  because it had no `node_modules` (gitignored, nothing committed).
- **Tests:** none: no logic — prose only. The acceptance grep is the "must fail if reverted".
- **Verified before writing:** no package API is involved, so nothing in `node_modules` bears on
  it. Facts inherited from `plan.md` (canonical wording W1, W2, W9; the mid-loop no-track
  decision) and checked against the file: PR #4's §11 and its `description:` line are in the
  base and are unchanged — the `description:` diff count prints 0, the §11 hunk count 0.
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm lint` — exit 0, no output (`eslint --max-warnings 0 .`)
  - `pnpm typecheck` — exit 0, no output; neither reads `.md`, they prove nothing else broke
  - `git diff -U0 -- template/.claude/skills/contribute/SKILL.md | grep -c '^[-+]description:'`
    — prints **0**
  - the item's four-grep acceptance chain, with the change — exit **0**, each term count 1
  - **Checker verified:** the same chain against the unchanged file — all four counts **0**,
    chain exit **1**. Run twice: first via `git stash push`/`pop` (which collided across
    worktrees — see **Blocked on**), then safely via
    `git show HEAD:...SKILL.md > <scratchpad copy>` — 284 lines, all four terms 0.
- **Blocked on:** `git checkout -- template/.claude/rules/process.md` — denied by rule zero
  (`rule-zero.conf:36 guard git checkout (-- |\.( |$))`). It was needed because **`git stash` is
  shared across worktrees**: `refs/stash` is one repository-wide ref, so the stash this item
  pushed for its revert check was popped by the item 1.1 worktree
  (`worktree-agent-ade9f5e0e4ce4cce7`), and this worktree's `git stash pop` took *their*
  `process.md` stash instead. Consequences — all recorded, nothing destroyed:
  - item 1.1's `process.md` change is sitting **uncommitted in this worktree** and is *not* in
    this item's commits (committed by path). It is also preserved in the dropped stash commit
    `45d1c157c480b1a99e4f5c38f0e7d31e1e1c16e7` (`git stash apply 45d1c15`, or
    `git show 45d1c15:template/.claude/rules/process.md`) and copied to the session scratchpad
    as `process.md.leaked-from-ade9f5e0.txt`;
  - this item's own SKILL.md stash was popped into the item 1.1 worktree by the same mechanism;
    the edits here were re-applied deterministically from the edit script, so nothing is lost.
- **Orchestrator should verify:** (a) `git -C <this worktree> status --short` shows
  `template/.claude/rules/process.md` modified — that is item 1.1's leaked work, not this
  item's, deliberately left uncommitted; decide whether item 1.1 needs `45d1c15` recovered
  before this worktree is removed. (b) The full check and the generated-copy gate. (c) Whether
  any other phase-1 item verified its acceptance with `git stash` — the shared `refs/stash`
  makes stash unsafe while worktrees run in parallel; `git show HEAD:<path>` into a temp file
  is the safe form and is worth a line in the guide.

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
**Done** (implementer, 2026-08-26).
- **Files touched:**
  `template/.claude/skills/contribute/templates/investigation.md` — one Facts row added after the
  live-count row, for the functions a change needs and their existing copies (W4's first half);
  `template/.claude/skills/contribute/templates/phase.md` — the **Files** placeholder now says
  "including the shared module when this item generalizes a function"; the Status placeholder is
  untouched (the block shape lives in `implementer.md`);
  `template/CLAUDE.md` — the E2E line is now W8 verbatim, naming Playwright for browser-based
  visual tests. Nothing else in the skeleton.
- **Commits:** `e80fc2a` on `worktree-agent-adad9a662e3bc94ee` — the whole item (three payload
  files + this block); followed by one small commit that writes this sha into the line you are
  reading, since a commit cannot name itself.
- **Deviation:** two wrap deviations, both deliberate. (a) The new E2E line is 103 columns, past
  the ~95 wrap — W8 is fixed one-line wording and breaking it would split the `<cmd>` placeholder
  out of the parenthetical. (b) In `phase.md` the **Files** placeholder wraps onto a second line
  (`…generalizes a` / `function>`) to stay inside ~95, the way the real phase files wrap their
  own **Files** lines; "shared module" stays whole on the first line so the acceptance grep sees
  it.
- **Tests:** none: no logic — prose only. The acceptance greps below are the "what must fail if
  reverted" for this item.
- **Verified against the installed package before writing:** not applicable — prose only, no
  library behaviour relied on. Confirmed the scoped checks really ran against the installed
  toolchain: eslint 10.9.1 and typescript 6.0.3 from `pnpm install --frozen-lockfile` in this
  worktree (`node_modules` was absent until then, so the commands would otherwise have failed
  loudly, not silently passed).
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm lint` — clean, `eslint --max-warnings 0 .`, 0 problems
  - `pnpm typecheck` — clean, `tsc --noEmit`, 0 errors
  - `git diff --stat` — exactly the three files this item owns (1 +, 3 ++-, 2 +-), plus this
    phase file in the same commit
  - `grep -c Playwright template/CLAUDE.md` — prints `1`
  - **Checker verified:** with the change, the item's acceptance chain exits 0 and `grep -c
    Playwright` prints 1; after `git stash push -- template/` the same chain exits **1** and
    `grep -c Playwright` prints **0**; `git stash pop` restored all three files and the chain
    exits 0 again with the count back to 1.
  - Line endings: `file` reports all three as UTF-8 text with no CRLF terminators; `git diff`
    shows no `^M` on any added line.
- **Blocked on:** nothing. Two Bash commands were refused by the worktree-isolation check for
  being too complex to verify (a `sed -e '15r …' > tmp && cp` pipeline writing through the
  scratchpad, and `grep -c $'\r' <three files>`); both were replaced with in-worktree
  equivalents (the edit tool, and `file`). No rule-zero denial — `.claude/rule-zero.log` was not
  written to by this item.
- **Orchestrator should verify:** the full check and the phase-2 regeneration — this item changes
  three managed payload files, so the lock and the generated root copies of
  `templates/investigation.md` and `templates/phase.md` move with it (`template/CLAUDE.md` is
  **owned**: new installs only, so no root-copy drift from that one). Also worth a look: whether
  the 103-column E2E line is acceptable house style before it ships to every new install. I ran
  `pnpm install --frozen-lockfile` in this worktree, so `node_modules/` exists here — delete it
  before `git worktree remove` (ledger, 2026-08-25 ergonomics (a)).

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
