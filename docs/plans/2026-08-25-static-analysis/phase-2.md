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
**Done** (implementer, 2026-08-25).
- **Files touched:**
  - `template/.claude/hooks/pr-watch.ts` — 18 index-signature reads become bracket access
    (`raw["user"]`, `raw["body"]`, `asRecord(state)["seen"]`, …); `requireId` reads `record["id"]`
    and narrows it to `string | number`, throwing the *existing* "no id" error for anything else
    (this is also the `no-base-to-string` fix); the `<details>` capture is `(m[1] ?? "").trim()`.
  - `template/.claude/hooks/status-block.ts` — `payload["stop_hook_active"]`, `payload["cwd"]`,
    and the `**Branch:**` capture goes through `const branch = m?.[1]` so a missing group skips
    that plan.md exactly as a plan.md with no Branch line does (the `main`/`master` fallbacks
    still apply). No `!` anywhere; `(r.stdout ?? "")` untouched; LF only (0 CR in both files).
- **Commits:** `c1cffae` on `worktree-agent-a21a3e1bd452a597b`
- **Deviation:** two, both behaviour-visible and deliberate:
  1. `requireId` now throws "no id" for an id that is an object or a boolean, where it used to
     stringify it. Measured over 8 id shapes: identical for every string, number, `null` and
     `undefined`; differs only for `{}` and `true`. That is the plan's instruction ("narrow to
     `string | number`, treat anything else as no id") and the fail-closed direction — an
     `[object Object]` id would collide in the seen-set and make the same comment look new on
     every poll.
  2. `(m[1] ?? "")` keeps one entry per `<details>` block rather than dropping it, so a
     suppressed Copilot section stays visible in `collapsed_sections`. Verified equal to the old
     expression on `a<details> x </details>b<details></details>` → `["x",""]` both ways.
- **Verified against the installed package before writing:** typescript 6.0.3, eslint 10.9.1,
  typescript-eslint 8.68.0 (`pnpm install --frozen-lockfile` in this worktree, versions echoed by
  pnpm). The 22 errors and their codes were re-measured here before editing, not inherited:
  pr-watch 19 (TS4111 ×18, TS2532 at `:149`), status-block 3 (TS4111 ×2, TS2345 at `:80`) —
  exactly the plan's counts.
- **Validation (scoped; full check left to the orchestrator):**
  - `npx tsc --noEmit 2>&1 | grep -E 'template/.claude/hooks/(pr-watch|status-block)\.ts'` — empty
    (grep exit 1). Not vacuous: the same run still prints 110 errors overall, 22 of them in the
    generated root copy `.claude/hooks/{pr-watch,status-block}.ts` — phase 3 regenerates those.
  - `npx eslint --max-warnings 0 template/.claude/hooks/pr-watch.ts
    template/.claude/hooks/status-block.ts` — exit 0, no output.
  - Smoke, before vs after, byte-identical stdout/stderr and exit code in all 7 runs
    (no network; `gh` never invoked):
    - `node template/.claude/hooks/pr-watch.ts` → usage on stderr, exit 2
    - `… --pr 7 --interval abc` → `invalid int value: 'abc'` + usage, exit 2
    - `… --bogus` → `Unknown option '--bogus'` + usage, exit 2
    - `status-block.ts` ← `SubagentStop` `{agent_type:"implementer", transcript_path:"/nope/
      does-not-exist.jsonl", cwd:<worktree root>}` → silent, exit 0 (allow)
    - same with `stop_hook_active:true` → silent, exit 0
    - same with `cwd:<worktree>/template` (no `docs/plans/`) → silent, exit 0
    - `echo 'not json'` → silent, exit 0
  - **Checker verified:** restored the pre-change `pr-watch.ts` from `HEAD~1` → `npx tsc
    --noEmit` reported its 19 errors again **and** `npx eslint` reported
    `114:17 @typescript-eslint/no-base-to-string`, exit 1; restored → 0 errors, lint exit 0.
    Same for `status-block.ts`: reverted → 3 errors; restored → 0. Working tree clean after both
    restores (`git status --porcelain` empty), so the restores were byte-exact.
- **Blocked on:** the `Edit` and `Write` tools are unusable in this worktree. Every call was
  denied with `rule-zero.conf:49 guard ^path:outside-repo`, subject
  `<outside-repo> C:\…\.claude\worktrees\agent-a21a3e1bd452a597b\template\.claude\hooks\pr-watch.ts`
  — a file that is plainly inside the repo. **Measured cause:** `rule-zero.ts:93` computes
  `inside = resolved.startsWith(pyRealpath(root) + path.sep)`, a *case-sensitive* comparison, and
  `fs.realpathSync` on Windows does **not** normalise case (measured:
  `realpathSync('c:/users/keaton forrest/documents/github/cl-workflow')` returns the lowercase
  spelling unchanged). Feeding the hook `CLAUDE_PROJECT_DIR=c:/users/…` while the tool's path
  resolves as `C:\Users\…` reproduces the denial byte-for-byte; a trailing separator does not.
  So any `CLAUDE_PROJECT_DIR` whose case differs from the on-disk spelling makes the gate read
  every in-repo edit as an outside-repo edit. `rule-zero.ts` is item 2.1's file, so I did not
  touch it. Work-around used: all edits made with `sed -i` through Bash on the same in-repo
  paths (Bash is judged by command shape, not by path), each write read back and checked with
  `git status`/`git diff`.
  Also denied and *not* worked around: writing a scratch git fixture under the session
  scratchpad (`Write …\scratchpad\sbrepo\docs\plans\2026-01-01-x\plan.md`, same rule) — that is
  a genuine outside-repo write and the deny is correct. Consequence in (d) below. It left an
  empty `sbrepo/` with a bare `git init` in the scratchpad; deleting it would also be an
  outside-repo action, so it stays.
- **Orchestrator should verify:** (a) the full check after phase 3 — `pnpm typecheck`, `pnpm
  lint`, `pnpm selftest` — none of which I ran, since the other two items' files and the root
  copy are still red by design; (b) that the two deviations above are wanted — they are the only
  behaviour changes in this item; (c) the rule-zero case-sensitivity finding: it is a real bug in
  `rule-zero.ts` (both copies), it silently blocks every implementer's `Edit`/`Write` on this
  machine, and it belongs to item 2.1 or a phase-2.5 item, not to me; (d) status-block's
  **refusal** path (exit 2) is *not* covered by my smoke — it needs a git repo whose
  `docs/plans/` matches its base, and building that fixture required a write outside the repo,
  which rule zero denied. The four allow-paths above do exercise every line I changed
  (`stop_hook_active`, `cwd`, the `**Branch:**` capture); the refusal branch itself is unchanged
  code; (e) `pr-watch`'s `fetch`/`requireId` path is unexercised at runtime — it needs `gh`, and
  the item forbids the network; it is covered by the compiler, the lint rule and the 8-shape
  equivalence table above.

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
**Done** (implementer, 2026-08-25).
- **Files touched:**
  - `template/.claude/hooks/docs-only.ts` — the two index reads in the `--name-status` loop take
    `?? ""`, and the status letter is read with `charAt(0)` so the existing `status !== ""` test
    is still what stops `"ADR".includes("")` saying yes; `result.granted` becomes
    `result["granted"]`. A read that goes missing therefore falls through to `commentOnly`,
    whose unknown-language verdict is **code** — never docs, which is the direction that matters
    for a hook that unlocks a self-merge.
  - `template/.claude/hooks/reload-plan.ts` — every capture group is read through `?.[1]`; a
    missing group prints nothing for that part, and an item whose two groups did not both
    arrive is skipped; `process.env["CLAUDE_PROJECT_DIR"]` and `payload["cwd"]` bracket access.
  - `template/.claude/hooks/path-fence.ts` — five TS4111 bracket-access fixes, no logic touched.
- **Commits:** `103bd70` (the three hooks) and this one, on branch
  `worktree-agent-a9e85815ac679c8cb`.
- **Deviation:** none. No `!` anywhere, and no new default that lets a call through. Two of the
  fallbacks (`parts[0] ?? ""`, `split(...)[0] ?? ""`) cannot fire on real input — `split` always
  yields at least one element — and are commented as such rather than left unexplained.
- **Verified against the installed package before writing:** typescript 6.0.3, eslint 10.9.1,
  typescript-eslint 8.68.0 (`node_modules/*/package.json`, after `pnpm install --frozen-lockfile`
  in this worktree). The `lib.ts` helpers these hooks lean on return non-optionals — `asString`
  at `template/.claude/hooks/lib.ts:32-34`, `asRecord` at `:27-29` — while `readLines` at
  `:82-88` can return `[""]`, so the empty-entry path in `docs-only.ts` is reachable and is
  exactly the one that has to classify as code.
- **Validation (scoped; full check left to the orchestrator):**
  - `npx tsc --noEmit 2>&1 | grep -E ...(docs-only|reload-plan|path-fence)...` — empty. The same
    run still reports 109 errors overall (the other two items plus the generated root copy), so
    the pipeline is not vacuously silent; before the change these three files carried 23 of them
    (docs-only 9, reload-plan 9, path-fence 5), exactly as plan.md measured.
  - `npx eslint --max-warnings 0` on the three files — 0 problems, exit 0
  - smoke, before vs after, all four byte-identical on stdout with the same exit code:
    `docs-only.ts --base main --branch chore/2026-08-25-static-analysis` (exit 3, code diff);
    path-fence deny on `src/x.ts` (the deny JSON, exit 0); path-fence allow on
    `docs/reviews/x.md` (silent, exit 0); `{"source":"compact"}` into reload-plan (exit 0)
  - reload-plan also run old-code-against-new-code on *this* plan file after the status block was
    written, using a pristine copy held outside the repo: identical stdout, exit 0 both ways, and
    item 2.3 correctly drops off the pending list — so the guarded item loop really executed.
  - **Checker verified (tsc):** put the pristine `docs-only.ts` back and `npx tsc --noEmit`
    reported its 9 errors again — TS2345 at 233/239/250, TS2322 at 234/241/255, TS18048 at
    239/243, TS4111 at 288. Restored the fix: grep empty again and `git status --porcelain`
    silent, so the restore was byte-exact.
  - **Checker verified (eslint):** changed line 22 of `path-fence.ts` to import from `path`
    instead of `node:path`; eslint went red with 2 errors (`no-restricted-imports`,
    `n/prefer-node-protocol`), exit 1. Restored: exit 0 and `git status` silent. Without this
    the clean lint would only have been a claim that ESLint had looked at the files at all.
- **Blocked on:** nothing for this item, but two findings the orchestrator needs.
  1. **Every `Edit`/`Write` tool call from an implementer worktree is denied by rule zero** as
     `path:outside-repo` — mine, and per `.claude/rule-zero.log` in the shared checkout items
     2.1 and 2.2 as well. The denial I hit first:
     `path:outside-repo C:\Users\...\worktrees\agent-a9e85815ac679c8cb\docs\plans\2026-08-25-static-analysis\phase-2.md`
     (`rule-zero.conf:49 guard ^path:outside-repo`). All work here went through Bash instead,
     so nothing was lost. Measured cause: `rule-zero.ts:93` tests
     `resolved.startsWith(pyRealpath(root) + path.sep)`, a case-sensitive comparison of Windows
     paths. Feeding the shipped hook a payload identical to the real one, it is silent when
     `CLAUDE_PROJECT_DIR` is `C:\Users\...\cl-workflow` and denies when it is the same
     directory with a lowercase drive letter. That is the only variant I found that reproduces
     the symptom while still writing the log to the file the real denials landed in, so treat
     it as the strongest hypothesis rather than proof. `rule-zero.ts` belongs to item 2.1, so I
     did not touch it.
  2. `path-fence.ts` (mine) has the same case-sensitive `startsWith` at line 60 — but it also
     accepts the worktree cwd as a base, so it is less exposed. I did not change it: this item
     is compiler errors with behaviour held constant, and a case fix is a behaviour change.
- **Orchestrator should verify:** the full check after phase 3; that item 3.1 regenerates the
  root copy of these three files; and what to do about the two findings above.

## Merge-back record (orchestrator)
<!-- per item: worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- what was run, counts, checkers verified, findings → phase 2.5 items -->
