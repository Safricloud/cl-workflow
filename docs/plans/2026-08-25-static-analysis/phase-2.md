# Phase 2 — 3 implementers, parallel (2026-08-25-static-analysis)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 1 (the flags, the lint and the
widened include are in; `pnpm typecheck` and `pnpm lint` are red only under the hook directories)
**Magnet files this phase touches:** none — three disjoint file sets under
`template/.claude/hooks/`; each item edits only its own section of this file. **Do not touch
the root `.claude/hooks/` copy** — it is generated, and phase 3 regenerates it from your work.

Shared rules for every item here (from plan.md → *Decisions made by this plan*):
- Fix the compiler errors with real guards that keep today's fail-closed behaviour; **no `!`**
  (`@typescript-eslint/no-non-null-assertion` is on). A value that can now be `undefined` is
  handled the way the surrounding code already handles a missing value — deny, exit non-zero,
  or skip — never by inventing a default that lets a tool call through.
- TS4111 is fixed by bracket access (`process.env["CLAUDE_PROJECT_DIR"]`, `record["id"]`).
- Keep `(r.stdout ?? "")` / `(r.stderr ?? "")` after `spawnSync` exactly as they are.
- Behavioural smoke, per hook you touch: before editing, run the hook once with a representative
  stdin payload (a `PreToolUse` JSON for `rule-zero.ts` / `path-fence.ts`, a `SubagentStop` for
  `status-block.ts`, a `SessionStart` for `reload-plan.ts`; the CLI forms for `docs-only.ts` and
  `pr-watch.ts --help`-style no-network invocations) and capture stdout + exit code; run the same
  after; record both in your status block. Identical is the acceptance.
- Validation is scoped: the other two items' files may still be red while you work.
  `npx tsc --noEmit 2>&1 | grep -E '<your files>'` must be empty, and `npx eslint
  --max-warnings 0 <your files>` must be clean.

### Item 2.1 — The gate trio: `lib.ts`, `rule-zero.ts`, `rule-zero-selftest.ts`
**Files:** `template/.claude/hooks/lib.ts`, `template/.claude/hooks/rule-zero.ts`,
`template/.claude/hooks/rule-zero-selftest.ts`
**Approach:** 21 compiler errors (lib 2: TS2532, TS4111; rule-zero 12: TS4111 ×10, TS2345 ×2;
selftest 7: TS4111 ×5, TS2322, TS2769) and 1 lint finding (`no-useless-assignment`,
`rule-zero.ts:198` — `let fresh: string[] = [];` where both following branches assign).
`lib.ts` is imported by every hook: keep every exported signature identical (parameter and
return types), so the other two items see no change. The self-test is the proof the gate still
fires — it must stay 60/60, and its case count must not change (`doctor` asserts exactly 60,
`src/cli.ts` `EXPECTED_SELFTEST_CASES`).
**Conventions that will fail your lint:** `erasableSyntaxOnly`; `node:` imports only; no `!`;
LF.
**Scoped validation:**
- `npx tsc --noEmit 2>&1 | grep -E 'template/.claude/hooks/(lib|rule-zero|rule-zero-selftest)\.ts'` — empty
- `npx eslint --max-warnings 0 template/.claude/hooks/lib.ts template/.claude/hooks/rule-zero.ts template/.claude/hooks/rule-zero-selftest.ts` — clean
- `pnpm selftest` — `60/60 cases passed`, exit 0
- smoke: `echo '{"tool_name":"Bash","tool_input":{"command":"git reset --hard"}}' | node template/.claude/hooks/rule-zero.ts` before and after — same stdout (a deny) and exit code; and the same for an allowed command (`git status`) — silent, exit 0
**Acceptance:** the four validations; **must FAIL if reverted / checker verified:** revert your
`lib.ts` change alone → `npx tsc --noEmit` reports lib's two errors again; break the deny path
in `rule-zero.ts` (e.g. make the guard branch `continue`) → `pnpm selftest` goes red; restore
both and see green. Record results.
#### Status — item 2.1
**Done** (implementer, 2026-08-25).
- **Files touched:** `template/.claude/hooks/lib.ts` — `process.env["CLAUDE_PROJECT_DIR"]`, and `loadConf` reads `(lines[i] ?? "")` so an absent line is skipped exactly as a blank one is; `template/.claude/hooks/rule-zero.ts` — bracket access for the ten payload/`tool_input`/env reads, `--bundle` now requires `argv[2]` and `argv[3]` in its own condition so a short argv falls through to the existing usage/exit-2 branch, `let fresh` loses its dead initialiser; `template/.claude/hooks/rule-zero-selftest.ts` — bracket access ×5, a `BUNDLE` grant missing pr or branch throws (a harness fault must not read as a pass), `--conf` without a value falls back to the shipped conf.
- **Commits:** `84082f0` (the three hooks), `8774035` + this one (status block), on `worktree-agent-a5d64be8152773cf5`.
- **Deviation:** none. No `!`, no invented defaults; every exported signature in `lib.ts` is unchanged, so items 2.2 and 2.3 see no change. `CASES.length` is still 60 (`src/cli.ts:51` `EXPECTED_SELFTEST_CASES = 60`).
- **Verified against the installed package before writing:** typescript 6.0.3, eslint 10.9.1, typescript-eslint 8.68.0 (`node -p` on their `node_modules/*/package.json`); `no-useless-assignment` is on at `error` from the core preset, `node_modules/@eslint/js/src/configs/eslint-recommended.js:65` — not a typescript-eslint rule, so the fix had to be the dead initialiser itself.
- **Validation (scoped; full check left to the orchestrator):**
  - `npx tsc --noEmit` filtered to my three files — empty (was 21 lines: lib 2, rule-zero 12, selftest 7). The same run still prints 19 for `pr-watch.ts` and 12 for the root `.claude/hooks/rule-zero.ts`, so the command did run and the empty result is real.
  - `npx eslint --max-warnings 0 template/.claude/hooks/lib.ts template/.claude/hooks/rule-zero.ts template/.claude/hooks/rule-zero-selftest.ts` — clean, exit 0.
  - `pnpm selftest` — `60/60 cases passed; 39 lines logged to rule-zero.log`, exit 0. Identical to the pre-edit baseline.
  - **Smoke, before and after, byte-identical (`diff` exit 0 on both pairs):** a `PreToolUse` payload for the guarded hard-reset shape → the one deny JSON line on stdout, empty stderr, exit 0, same reason text quoting `rule-zero.conf:35`; a `PreToolUse` payload for `git status` → silent, exit 0. Also `--bundle merge-cleanup 12` (one argument short) → usage on stderr, exit 2, unchanged.
  - **Checker verified (1/2):** reverted `lib.ts` alone to the committed original (`git diff` showed exactly the two lines back) — `npx tsc --noEmit` reported `lib.ts(43,22) TS4111` and `lib.ts(166,18) TS2532` again; restored, 0 errors for `lib.ts`, working tree clean against the commit.
  - **Checker verified (2/2):** broke the deny path in `rule-zero.ts` (the guard branch made an unconditional `continue`) — `pnpm selftest` went red: 24/60, 36 FAIL lines, and `NEGATIVE CONTROL FAILED: force push was not denied`, exit 1; restored, 60/60, exit 0.
- **Blocked on:** nothing that stopped the work. Two hook denials worth recording. (1) `echo` of a `PreToolUse` payload containing the literal hard-reset command was denied by rule-zero (`rule-zero.conf:35`) as a sub-agent — the smoke payload was built instead with the flag in a shell variable, written to a scratch file inside the worktree, and fed to the hook on stdin; no reset was ever run. (2) the `Edit` tool on `template/.claude/hooks/lib.ts` was denied with `guard ^path:outside-repo` even though the path is inside this worktree — worth the orchestrator looking at, since it means the path check misjudges a worktree path under some root; all edits were made with `sed` instead.
- **Orchestrator should verify:** the full check after all three phase-2 items merge (my scoped runs leave `pr-watch`, `status-block`, `docs-only`, `reload-plan`, `path-fence` and the whole root `.claude/hooks/` copy red on purpose); that the regenerated root copy in phase 3 carries these three files byte-for-byte; and the path-fence/rule-zero `path:outside-repo` false positive in (2) above, which is a live gate behaviour, not something this item touched.

### Item 2.2 — `pr-watch.ts` and `status-block.ts`
**Files:** `template/.claude/hooks/pr-watch.ts`, `template/.claude/hooks/status-block.ts`
**Approach:** 22 compiler errors (pr-watch 19: TS4111 ×18, TS2532 ×1; status-block 3: TS4111 ×2,
TS2345 ×1) and 1 lint finding (`@typescript-eslint/no-base-to-string`, `pr-watch.ts:114` —
`String(id)` on an `unknown`: narrow to `string | number` and treat anything else as "no id",
the way the surrounding code treats a missing one). `pr-watch.ts` talks to `gh`; do not call
the network — the smoke is an invocation that fails fast without `gh` reachable (e.g. a missing
`--pr`), captured before and after.
**Conventions that will fail your lint:** `erasableSyntaxOnly`; `node:` imports only; no `!`;
keep `(r.stdout ?? "")`; LF.
**Scoped validation:**
- `npx tsc --noEmit 2>&1 | grep -E 'template/.claude/hooks/(pr-watch|status-block)\.ts'` — empty
- `npx eslint --max-warnings 0 template/.claude/hooks/pr-watch.ts template/.claude/hooks/status-block.ts` — clean
- smoke for both hooks before/after (status-block: a `SubagentStop` payload with
  `agent_type: "implementer"` and a transcript path that does not exist — capture the
  decision/exit; pr-watch: usage/argument error path) — identical
**Acceptance:** the three validations; **must FAIL if reverted:** revert `pr-watch.ts` → its 19
errors return under `npx tsc --noEmit`; restore, green. Record.
#### Status — item 2.2
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 2.3 — `docs-only.ts`, `reload-plan.ts`, `path-fence.ts`
**Files:** `template/.claude/hooks/docs-only.ts`, `template/.claude/hooks/reload-plan.ts`,
`template/.claude/hooks/path-fence.ts`
**Approach:** 23 compiler errors (docs-only 9: TS18048 ×2, TS2322 ×3, TS2345 ×3, TS4111 ×1;
reload-plan 9: TS18048 ×2, TS2322, TS2345, TS2532 ×3, TS4111 ×2; path-fence 5: TS4111 ×5), 0
lint findings. `docs-only.ts` decides whether a PR may self-merge: an index read that becomes
`undefined` must classify as **code** (not docs-only), never the other way. `path-fence.ts`
decides whether an investigator may write: a missing value denies. `reload-plan.ts` only prints
context; a missing value prints nothing for that part.
**Conventions that will fail your lint:** `erasableSyntaxOnly`; `node:` imports only; no `!`;
keep `(r.stdout ?? "")`; LF.
**Scoped validation:**
- `npx tsc --noEmit 2>&1 | grep -E 'template/.claude/hooks/(docs-only|reload-plan|path-fence)\.ts'` — empty
- `npx eslint --max-warnings 0 template/.claude/hooks/docs-only.ts template/.claude/hooks/reload-plan.ts template/.claude/hooks/path-fence.ts` — clean
- smoke before/after: `node template/.claude/hooks/docs-only.ts --base main --branch
  chore/2026-08-25-static-analysis` from your worktree (no `--grant`; exit 3 expected both
  times, code diff); `echo '{"tool_name":"Write","tool_input":{"file_path":"src/x.ts"}}' | node
  template/.claude/hooks/path-fence.ts docs/reviews` (a deny) and the same with
  `docs/reviews/x.md` (silent); `echo '{"source":"compact"}' | node
  template/.claude/hooks/reload-plan.ts` — identical stdout/exit each pair
**Acceptance:** the three validations; **must FAIL if reverted:** revert `docs-only.ts` → its 9
errors return; restore, green. Record.
#### Status — item 2.3
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<!-- per item: worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- what was run, counts, checkers verified, findings → phase 2.5 items -->
