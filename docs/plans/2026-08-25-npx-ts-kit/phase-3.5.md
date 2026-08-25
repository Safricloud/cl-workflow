# Phase 3.5 — 1 implementer, serial (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** merged phase 3 (`024648e`)
**Magnet files this phase touches:** none.

### Item 3.5.1 — Strip dead-file provenance from the hook headers
**Files:** `template/.claude/hooks/docs-only.ts`, `path-fence.ts`, `pr-watch.ts`,
`reload-plan.ts`, `status-block.ts` (header comments only — no executable line changes).
**Approach:** Five doc comments say "Ported from `<hook>.py`" — files deleted in 3.3; the
references are dead on arrival for any reader of the shipped kit. Remove the provenance
phrasing while KEEPING every constraint the comments carry (the Windows-defect explanation in
path-fence, the `\Z`→`$`+`s` dialect note in reload-plan, the exit-code contracts): the
comment should state the constraint, not the file it came from. `docs-only.ts:53`'s `.py` in
the comment-syntax extension map is domain data — do not touch it.
**Conventions that will fail your lint:** comments state constraints, not history; LF;
`pnpm typecheck` unchanged.
**Scoped validation:** `git grep -nE "python3" -- template/` → empty;
`git grep -nE "(rule-zero|rule-zero-selftest|docs-only|pr-watch|path-fence|reload-plan|status-block)\.py" -- template/`
→ empty (this is the refined invariant — `.py` as a classified extension stays legal);
`pnpm typecheck` clean; `pnpm selftest` → 60/60; `git diff --stat` shows comment-only line
counts, no hook's executable lines changed (verify: `git diff -G"^(?!\s*[/*])" ` or by eye —
the diff must be entirely inside comment blocks).
**Acceptance:** both greps empty; 60/60; reverting reintroduces references to nonexistent
files (grep catches it).
#### Status — item 3.5.1
**Done** — 2026-08-25, branch `worktree-agent-a03c5d524f0a63a38`, from `58680b2`.

**Files touched** (comment lines only; no executable line changed in any hook):
`template/.claude/hooks/docs-only.ts`, `path-fence.ts`, `pr-watch.ts`, `reload-plan.ts`,
`status-block.ts` — each file's header block only — plus this status block.

**What changed.** Each header's "Ported from `<hook>.py`" clause is gone, and every constraint
that sentence was carrying is restated as a constraint:
- **docs-only, pr-watch** — the zero-dependency rule kept: "Zero dependencies: `node:` builtins
  only, erasable syntax only." pr-watch's exit-code contract (0 printed payload / 1 `gh` failure
  / 2 bad arguments) and the "`setTimeout`, never a busy loop" note are untouched.
- **path-fence** — the Windows defect now leads with the rule ("Both sides of the prefix test
  must be built the same way, through `path.join`") and keeps the whole explanation: the
  surviving forward slash on Windows, both example paths (`C:\repo\docs/reviews\` vs
  `C:\repo\docs\reviews\x.md`), the consequence (False for *every* path, the fence denies the
  investigator its own report) and the `investigation-hooks.md §1, §5` reference. `startswith`
  → `startsWith`, which is the call the file actually makes (`path-fence.ts:61`). The separate
  exit-0-deny-channel paragraph below it was not touched.
- **reload-plan** — both dialect notes kept in substance: a Python `\Z` anchor is a *literal Z*
  in JavaScript, so every end-of-string anchor here is `$` with the `s` flag and no `m` flag;
  and two-group `re.findall` becomes `matchAll` with `g`. The `§2` reference is kept.
- **status-block** — the exit-2 contract kept whole: **2** with the paragraph on stderr is the
  only refusal channel, every other path exits 0, `process.exitCode` rather than
  `process.exit()` so stderr flushes.

`docs-only.ts:53`'s `".py"` in the comment-syntax extension map is untouched, as the item
requires — it is still there and still classified under `#`.

**Validation — actual output:**
- `git grep -nE "python3" -- template/` → no output, exit 1 (**empty**).
- `git grep -nE "(rule-zero|rule-zero-selftest|docs-only|pr-watch|path-fence|reload-plan|status-block)\.py" -- template/`
  → no output, exit 1 (**empty**). Run before the edit, the same grep printed exactly the five
  header lines (`docs-only.ts:33`, `path-fence.ts:12`, `pr-watch.ts:32`, `reload-plan.ts:14`,
  `status-block.ts:21`) — so reverting reintroduces them and the grep catches it.
- `pnpm typecheck` (`tsc --noEmit`) → no diagnostics, **exit 0**.
- `pnpm selftest` → `60/60 cases passed; 39 lines logged to rule-zero.log`.
- `git diff --stat` → `5 files changed, 16 insertions(+), 17 deletions(-)`: docs-only 2,
  path-fence 11, pr-watch 6, reload-plan 8, status-block 6.
- Comment-only proof. The item's `git diff -G"^(?!\s*[/*])"` needs a PCRE lookahead git's regex
  engine does not have, so two equivalent checks were run instead:
  `git diff -U0 -- template/ | grep -E "^[+-]" | grep -vE "^(\+\+\+|---)" | grep -vcE "^[+-] \*"`
  → `0` (not one changed line falls outside a ` * ` comment line), and
  `git diff -G"^[^ ]|^ [^*]" -- template/` → empty. Confirmed by eye against the full diff.
- Runtime smoke (a comment-only diff cannot change behaviour, but this proves the five files
  still strip and run under Node): `docs-only.ts --nope` → usage, **exit 2**; `pr-watch.ts
  --nope` → usage, **exit 2**; `path-fence.ts docs/reviews` with an in-fence path → silent
  **exit 0**, with `README.md` → the deny JSON line at **exit 0**; `reload-plan.ts` on `{}` →
  the live-plan report, **exit 0** (its `\Z`→`$` section regexes still match); `status-block.ts`
  on `{"stop_hook_active":true}` → silent **exit 0**.
- Comment wrap and LF unchanged: longest ` * ` line per file is the same before and after
  (docs-only 98, path-fence 98, pr-watch 111, reload-plan 98, status-block 99);
  `git ls-files --eol` reports `i/lf w/lf` for all five.

**Deviations:** none from the item as written.

**Judgement recorded.** Generic port notes that name no deleted file — "same as the Python
original" (`path-fence.ts:42`), "the line the Python version got wrong" (`:59`), "as the Python
version's bare `except` paths did" (`:76`), and ~30 more across `lib.ts`, `pr-watch.ts`,
`rule-zero-selftest.ts` — were deliberately left alone. They reference no nonexistent file,
neither scoped grep targets them (the refined invariant is `<hook>.py`, not the word "Python"),
they are behaviour-equivalence constraints rather than history, and they are a port-wide
convention: stripping only path-fence's three would have made these five files inconsistent
with `lib.ts` and `rule-zero-selftest.ts` and gone outside this item's "header comments only"
scope. Flagging for the orchestrator in case a later item wants that sweep deliberately.

**Commits** (worktree branch `worktree-agent-a03c5d524f0a63a38`; not pushed):
- `3e042c6` Hook headers state their constraints, not their provenance
- `<this commit>` Record item 3.5.1 status

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
