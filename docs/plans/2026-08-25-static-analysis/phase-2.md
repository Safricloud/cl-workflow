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
**In progress** (implementer, 2026-08-25). Item read, facts inherited, before-smoke captured.

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
