# Phase 2 — 1 implementer, serial (2026-08-26-prose-standards)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 1
**Magnet files this phase touches:** the generated root `.claude/` and `docs/guides/`, and
`.claude/cl-workflow.lock` — nobody else runs in this phase.

### Item 2.1 — regenerate the root copy and the lock
**Files:** `template/.claude/skills/contribute/SKILL.md` (one rewrap, see below), `.claude/**`
(generated), `docs/guides/agent-workflow.md` (generated), `.claude/cl-workflow.lock`
**Approach:** First, the one finding from phase-1 verification: in
`template/.claude/skills/contribute/SKILL.md` §8, the paragraph ending "Run `pr-watch.ts --pr
<n>` again (no `--reset`)." lost its wrap during item 1.4 — one line is 124 columns. Rewrap that
paragraph at ~95 columns, words unchanged; commit it on its own. Then `pnpm build` (must
reproduce `dist/cli.js` byte for byte — no `src/` change in this contribution), then
`node dist/cli.js update .`. Read its summary: the managed `.md` files
phase 1 touched are rewritten, the lock changes for exactly those, nothing lands as `.new`. If a
`.new` appears, the root copy had a hand edit — stop, report it under **Blocked**, do not
resolve it. Confirm with `diff -q` over every template/root pair (the mapping: `template/X` ↔
`X`, and `template/.claude/gitignore` ↔ `.claude/.gitignore`) that all 25 pairs are identical.
Commit the regenerated files with the lock.
**Conventions that will fail your lint:** the regenerated root `.claude/hooks/*.ts` are
identical to the template copies — `pnpm lint` and `pnpm typecheck` still cover 17 files.
**Scoped validation:** `pnpm lint && pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm selftest` (62/62); the gate: `node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/ docs/guides/` prints nothing after your commit. **Verify the checker:** after committing, add a line to `template/.claude/rules/process.md`, run the gate, and see the root `.claude/rules/process.md` appear in `git status` (template ahead of the copy); then `git checkout -- template/.claude/rules/process.md .claude/rules/process.md` and run the gate again to see it print nothing. Record both outputs.
**Acceptance:** all 25 `diff -q` pairs identical; `git diff --stat <base> -- .claude/cl-workflow.lock` shows the lock changed; `git diff <base> -- .claude/cl-workflow.lock | grep -c '^[-+]    "'` equals 2 × the number of managed `.md` files phase 1 changed; the gate prints nothing; no `*.new` anywhere (`git status --porcelain --untracked-files=all` clean after the commit).
#### Status — item 2.1
**Done** (implementer, 2026-08-26).
- **Files touched:**
  - `template/.claude/skills/contribute/SKILL.md` — the §8 paragraph ending "Run
    `pr-watch.ts --pr <n>` again (no `--reset`)." rewrapped; the 124-column line becomes 77 + 44,
    words unchanged, the inline code span kept whole on its own line (a greedy wrap at 95 that
    treats the span as one atom breaks exactly there).
  - `.claude/agents/implementer.md`, `.claude/agents/investigator.md`, `.claude/rules/process.md`,
    `.claude/skills/contribute/SKILL.md`, `.claude/skills/contribute/templates/investigation.md`,
    `.claude/skills/contribute/templates/phase.md`, `docs/guides/agent-workflow.md` — regenerated
    by `node dist/cli.js update .` from phase 1's payload prose; no hand edits.
  - `.claude/cl-workflow.lock` — seven hashes moved, one per regenerated file.
  - this phase file — the status block.
- **Commits:** `cea9790` (the §8 rewrap, on its own, with the status block opened) ·
  `e170ab8` (the regenerated root copy and the lock) · one more for this block.
- **Deviation:** none in the item's scope. Two things left undone deliberately:
  - `template/.claude/skills/contribute/SKILL.md` holds a **second** over-long line — 122
    columns, "…`none`, wrapped like its neighbours — committed with the change. No review
    document and no plan directory; `mem/` only" (line 285 after my edit, 284 before it).
    `git blame` puts it on `8e29e80`, PR #4's squash — it is this plan's base, not phase 1's
    doing. Not rewrapped: this item authorises exactly one rewrap, and the plan's decisions say
    items touching `SKILL.md` preserve #4's text and add nothing to §11. Orchestrator's call.
  - `.claude/cl-workflow.lock` has 32 file entries and `mem/outstanding.md` is **not** among
    them, though `OWNED` lists it (`src/cli.ts:31-41`). Pre-existing and untouched by this item
    (the lock diff moved only the seven managed `.md` hashes). Mechanism, for whoever picks it
    up: `cmdUpdate` skips owned files with `continue` before `recorded[file.rel]` is set
    (`src/cli.ts:483-485`), and `recorded` is seeded from the previous lock (`:466`) — so an
    owned path absent at `init` can never re-appear on `update`.
- **Verified against the built CLI in this worktree before writing:** `dist/cli.js`, kit 0.6.0,
  rebuilt from `src/cli.ts` with `pnpm build` and byte-identical to the committed file
  (`git diff --exit-code dist/` clean — no `src/` change in this contribution). The
  managed/owned split is `src/cli.ts:31-41`; the one remapped pair is
  `template/.claude/gitignore` ↔ `.claude/.gitignore` (`src/cli.ts:148-155`).
- **Tests:** none: no logic — this item regenerates files and changes no code. The equivalent
  "what must fail if reverted" is the drift gate itself, verified below.
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm lint` — clean, `--max-warnings 0` · `pnpm typecheck` — clean · `pnpm build` then
    `git diff --exit-code dist/` — no drift · `pnpm selftest` — **62/62 cases passed**
  - `node dist/cli.js update .` summary: **7 refreshed, 17 already current, 0 left beside as
    `.new`, 0 removed, 9 owned files untouched** — the seven are exactly the managed `.md`
    files phase 1 changed (`template/CLAUDE.md` is owned, so item 1.5's edit to it does not
    regenerate; item 1.6's `ci.yml` and root `CLAUDE.md` are not payload). **No `.new`
    anywhere**, so the root copy carried no hand edit.
  - The gate after the commit: `node dist/cli.js update . && git status --porcelain
    --untracked-files=all -- .claude/ docs/guides/` — second `update` reports *0 refreshed, 24
    already current*, `git status` prints **nothing**. `git status --porcelain
    --untracked-files=all` with no pathspec is also empty.
  - Parity: all **25/25** comparable template/root pairs byte-identical (byte compare, not just
    `diff -q`; the 25 are the investigation's §E list — every `template/` file except the four
    `.gitkeep`s and the four owned files that legitimately diverge in this repo). The wider walk
    over all 33 `template/` files gives 30 identical and 3 differing: root `CLAUDE.md`,
    `docs/history/index.md`, `mem/outstanding.md` — all owned, all outside the 25. Measured
    fact "all 25 comparable files byte-identical" **confirmed, not stale**.
  - Lock: `git diff --stat 97f98f4 -- .claude/cl-workflow.lock` → 7 insertions, 7 deletions;
    `git diff 97f98f4 -- .claude/cl-workflow.lock | grep -c '^[-+]    "'` → **14** = 2 × 7
    regenerated files. Keys changed: exactly those seven, no others.
  - **Checker verified** (without `git checkout --`, a guarded shape, and without `git stash`,
    which shares `refs/stash` across worktrees): appended `CHECKER-PROBE-LINE-DELETE-ME` to
    `template/.claude/rules/process.md`, ran the gate — `update` said *1 refreshed*, the probe
    line was present in the root copy (`grep -c` → 1), and `git status` printed
    `` M .claude/cl-workflow.lock`` and `` M .claude/rules/process.md``, i.e. the checker sees
    a template that has moved ahead of its generated copy. Restored by deleting the appended
    line from the template and re-running `update`; the gate then printed nothing and the whole
    tree was clean. Both outputs seen, in that order.
  - **Second probe — the widened half of the pathspec (item 1.6), measured here so it is not a
    claim:** appended a line to the *generated root* `docs/guides/agent-workflow.md` and ran
    `update`. It warned that the file "has local edits" and wrote
    `docs/guides/agent-workflow.md.new` beside it — *1 left beside as .new*. Then, on the same
    working tree: the **old** pathspec `git status --porcelain --untracked-files=all
    -- .claude/` printed **nothing** — blind, and the lock does not move on a hand edit, so
    nothing leaks into `.claude/` to give it away. The **new** pathspec
    `-- .claude/ docs/guides/` printed the modified guide and the untracked
    `.new`. That is item 1.6's whole reason for existing,
    seen failing and passing side by side. Restored with
    `mv -f docs/guides/agent-workflow.md.new docs/guides/agent-workflow.md` (the `.new` holds
    the template bytes exactly — no `git checkout`, no `git stash`); `update` then reported
    *0 refreshed, 24 already current, 0 … .new* and the gate printed nothing.
- **Blocked on:** nothing — the hook denied no command this item. A correction to something I
  first wrote here and then checked: the selftest's "39 lines logged to rule-zero.log" do **not**
  land in the repo. `rule-zero-selftest.ts:265,282` builds a throwaway project under
  `os.tmpdir()` (`rule-zero-selftest-*`) and counts the log inside it. This worktree's
  `.claude/` has no `rule-zero.log` at all, and the one in the main checkout was last written
  at 10:31, before this item's run. So `.claude/rule-zero.log` is not evidence about my work
  either way.
- **Orchestrator should verify:** the full check on the merged branch, and the second over-long
  `SKILL.md` line described under **Deviation** — rewrap it in a later item or leave it as PR
  #4 wrote it. Both halves of the widened pathspec are measured above, so that one is closed.

## Merge-back record (orchestrator)
`worktree-agent-a132217ad314b5111`, branched from `97f98f4`; status clean (the implementer had
deleted its `node_modules`); commits `cea9790`, `e170ab8`, `3968b19`, `64b2935` read; merged
`eb09764` with no conflict; worktree removed, branch deleted with `-d`.

## Verification (orchestrator, after this phase merged)
On `eb09764`, 2026-08-26, by the orchestrator:
- **Full check:** `pnpm lint` clean, `pnpm typecheck` clean, `pnpm build` reproduces `dist/cli.js`
  (`git diff --exit-code dist/`), `pnpm selftest` 62/62.
- **The gate, widened:** `node dist/cli.js update .` → *0 refreshed, 24 already current, 0
  `.new`, 9 owned untouched*; `git status --porcelain --untracked-files=all -- .claude/
  docs/guides/` printed nothing.
- **Parity:** 26 template/root pairs byte-identical — the investigation's 25 plus
  `mem/index.md` (owned, unchanged here); the only differing payload files are the owned root
  `CLAUDE.md`, `docs/history/index.md`, `mem/outstanding.md`, as expected.
- **Lock:** `git diff 97f98f4 -- .claude/cl-workflow.lock | grep -c '^[-+]    "'` = 14 — the
  seven regenerated managed `.md` files, twice; no other key moved.
- **Checker verified by me, not on 2.1's word:** appended a probe line to the generated root
  `docs/guides/agent-workflow.md`, ran `update` (it wrote the `.new` beside it); the **old**
  pathspec `-- .claude/` printed **nothing**, the **new** `-- .claude/ docs/guides/` printed
  ` M docs/guides/agent-workflow.md` and `?? docs/guides/agent-workflow.md.new`; restored with
  `mv -f` of the `.new` (template bytes), `update` again → 24 current, tree clean, `diff -q`
  guide parity restored. Old gate blind, new gate red then green — both seen.
- **Findings:** (1) a second unwrapped line in `SKILL.md` §11 (122 columns, PR #4's text) —
  same pattern as the §8 line; rewrapped in item 3.1 with a regeneration (mid-loop decision in
  `plan.md`). (2) the lock omits `mem/outstanding.md` — pre-existing CLI behaviour, ledger
  follow-up (mid-loop decision in `plan.md`). No phase 2.5.
- **Live prefix observation:** 2.1's final message began `I-2.1:` — still under the old root
  definition (its worktree branched before it regenerated the copy). Phase 3 is the first
  implementer to run under the regenerated `implementer.md`.
- **Not done:** no UI, no container; `.claude/rule-zero.log` shows no denial for this item.
