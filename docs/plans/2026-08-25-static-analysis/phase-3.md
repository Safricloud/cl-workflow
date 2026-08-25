# Phase 3 — 1 implementer, serial (2026-08-25-static-analysis)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 2 (`template/` clean under
`tsc` and ESLint; the root `.claude/hooks/` copy still carries the old text and is the only
red left)
**Magnet files this phase touches:** the generated root copy (`.claude/hooks/*.ts`,
`.claude/cl-workflow.lock`) and `README.md` — one item, nothing beside it.

### Item 3.1 — Regenerate the root copy with the CLI; README; the full check green
**Files:** `.claude/hooks/*.ts` (all eight, regenerated — never hand-edited),
`.claude/cl-workflow.lock` (regenerated), `README.md`
**Approach:**
1. `node dist/cli.js update .` from the repo root. Expect `update` lines for the hooks phase 2
   changed and the lock rewritten; expect **no** `.new` files (`git status --porcelain
   --untracked-files=all -- .claude/` after committing shows nothing). If a `.new` appears, the
   root copy had drifted from what the lock recorded — stop and report Blocked with the file
   name; do not hand-merge.
2. `README.md`: in *Development* (`README.md:158-164`) add `pnpm lint  # eslint --max-warnings
   0 . — both hook copies, src/, the config` and the drift-gate line `node dist/cli.js update .
   && git status --porcelain --untracked-files=all -- .claude/   # prints nothing`; extend the
   `pnpm typecheck` comment to say it covers the generated root copy too; in *CI and the branch
   ruleset* (`README.md:174-178`) the ordered enumeration becomes "install, lint, typecheck,
   build, `dist/` drift check, generated-`.claude/` drift check, self-test, and a CLI smoke
   test…"; line 4 "five hooks" → "seven hooks". Nothing else in the README changes.
3. Run the full check and the gate; commit the regenerated files with the README.
**Conventions that will fail your lint:** the root `.claude/` is generated — edit `template/`
and re-run `update`, never the root copy; LF everywhere; `dist/cli.js` untouched (phase 1 built
it; `git diff --exit-code dist/` must stay clean).
**Scoped validation (this is the full check, because this item closes the branch):**
- `pnpm lint` — 0 problems (say how many files it linted: `pnpm lint -- -f json | node -e
  '…length'` or `--debug`; expect 18 — 17 `.ts` + the config)
- `pnpm typecheck` — exit 0, 17 repo files in the program (`npx tsc --listFilesOnly | grep -v
  node_modules | grep -c '\.ts$'`)
- `pnpm build && git diff --exit-code dist/` — clean
- `pnpm selftest` — 60/60; and `node .claude/hooks/rule-zero-selftest.ts` — 60/60 (the root copy)
- `node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/` —
  prints nothing after your commit
- `node dist/cli.js init <scratchpad>/smoke && node dist/cli.js doctor <scratchpad>/smoke` —
  6 passed, 0 failed
- `diff -r .claude/hooks template/.claude/hooks` — identical
**Acceptance:** every validation above green; **must FAIL if reverted / checker verified:** in
a scratch clone of your worktree (`git clone <wt> <scratch>/gate`), append a comment line to
`<scratch>/gate/.claude/hooks/lib.ts`, commit it there, run the gate command in that clone —
it must print a `?? .claude/hooks/lib.ts.new` line (the hand-edit case); then in the same clone
`git revert` that commit, append the same line to `template/.claude/hooks/lib.ts`, commit, run
the gate — it must print ` M .claude/hooks/lib.ts` (the template-ahead case). Record both
outputs verbatim.
#### Status — item 3.1
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- the full check, the gate, both self-tests, the scratch-clone gate cases, the diff re-read -->
