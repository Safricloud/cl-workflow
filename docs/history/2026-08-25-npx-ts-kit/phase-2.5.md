# Phase 2.5 — 1 implementer, serial (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 2 (`6468b39`)
**Magnet files this phase touches:** `README.md` (count lines only — no other phase edits it
again).

### Item 2.5.1 — Self-test cases 58–60: defend the dialect choices inside the suite
**Files:** `template/.claude/hooks/rule-zero-selftest.ts`, `README.md` (the two `57/57`
count references only).
**Approach:** Add the three cases `investigation-hooks.md` §3 "New cases to add" specifies —
the suite currently proves nothing about the port's single most load-bearing choice (compiling
conf/grant patterns without the `u` flag); phase 2 proved it only with throwaway out-of-band
harnesses:
1. **Dialect guard:** a grant written by `pyEscape` containing `\-` and `\ ` (e.g. from
   `--bundle` on a branch with a hyphen) must compile and match — this case FAILS if anyone
   ever adds the `u` flag to pattern compilation.
2. **`(?i)` conf line:** a conf line using a Python-only inline flag must produce the
   fail-closed "not a valid regex" deny at exit 0 — never a crash, never an allow.
3. **`\Z` line:** locks the JS interpretation (literal `Z`) so the silent dialect hazard is
   documented by a passing test rather than folklore.
Renumber nothing; append as cases 58–60 in the existing tuple format. Update the suite's
expected total and final print to `60/60`; update README's two count references (`57/57` in
Install and in the doctor row) to `60/60`. Do not touch the Python selftest — it dies in 3.3.
**Conventions that will fail your lint:** erasableSyntaxOnly; LF; the case tuples stay data
(no bespoke logic per case).
**Scoped validation:** `pnpm typecheck`; `node template/.claude/hooks/rule-zero-selftest.ts`
→ `60/60`, exit 0, in Git Bash AND PowerShell; temporarily add the `u` flag to the lib's
pattern compile → case 58 goes red (then restore); `git grep -n "57/57"` → no matches.
**Acceptance:** 60/60 green on this Windows machine; the u-flag inversion demonstrably turns
the suite red; reverting this item returns the suite to 57 cases and the grep finds README
stale — the count is load-bearing in `doctor` (phase 4 expects 60/60).
#### Status — item 2.5.1
**Done** — 2026-08-25. Cases 58–60 appended to
`template/.claude/hooks/rule-zero-selftest.ts`; README's count references updated. Commit
`d262f1b`, plus this status commit. Node v24.4.1, TypeScript 6.0.3, Windows 11, pnpm 10.27.0.
`template/.claude/hooks/lib.ts` and the Python selftest were not touched.

**The three cases, as they read in the table**
- `grant written by pyEscape (\- and \ )` — Bash `git push --force origin feat/npx-ts-kit`
  (guard, conf:31) with the grant `^git\ push\ \-\-force\ origin\ feat/npx\-ts\-kit$` — exactly
  `pyEscape("git push --force origin feat/npx-ts-kit")`, verified against the lib's own
  `pyEscape`. Expect **silent** (grant matches and is consumed).
- `conf line with (?i) fails closed` — Bash `npm test` (silent under the stock conf) plus one
  extra conf line `guard (?i)^npm test`. Expect **deny**: `loadConf` stops on the bad line and
  the hook denies at exit 0, naming it (measured text below). `npm test` matches nothing else
  in the conf, so a deny on this case can only be the fail-closed path.
- `conf line with \Z matches a literal Z` — Bash `npm run deployZ` plus `guard ^npm run deploy\Z`.
  Expect **deny**: JS reads `\Z` as a literal `Z`, so the pattern matches; under Python's
  end-of-string anchor it never would. The JS reading is now locked by a passing test.

**Scoped validation — actual outputs**
- `pnpm typecheck` → `tsc --noEmit`, no diagnostics, **exit 0**.
- `node template/.claude/hooks/rule-zero-selftest.ts` → `60/60 cases passed; 39 lines logged to
  rule-zero.log`, **exit 0** — identical in **Git Bash** and **PowerShell**. (37 log lines
  before; case 58 adds a `grant-used`, case 60 a `deny`, case 59 none — it returns before the
  logger is built, which is correct for a broken conf.)
- `--verbose`, last three rows, verbatim — the reasons are what the item asked for, not just the
  verdicts:
  ```
  PASS  grant written by pyEscape (\- and \ )         expected=silent got=silent
  PASS  conf line with (?i) fails closed              expected=deny   got=deny    rule-zero.conf line 58 is not a valid regex (Invalid regular expression: /(?i)^npm test/: Invalid group). Fix
  PASS  conf line with \Z matches a literal Z         expected=deny   got=deny    Rule zero (rule-zero.conf:58 guard ^npm run deploy\Z) — this needs the owner's explicit yes. Ask in the conver
  ```
- **u-flag inversion.** `lib.ts:110` `new RegExp(pattern)` → `new RegExp(pattern, "u")`, nothing
  else; rerun → exactly one red case and **exit 1**:
  `FAIL  grant written by pyEscape (\- and \ )   expected=silent got=deny   Rule zero
  (rule-zero.conf:31 guard git push .*(--force|-f |--force-with-lease|--delete|-d |:refs/| :[A-Za-z]))`
  → `59/60 cases passed; 38 lines logged`. The other 59 stay green: no shipped conf pattern and
  no other grant in the table uses an escape that `u` rejects, so case 58 is the whole sentinel.
  Restored by hand (not `git checkout --`, which rule zero guards): `sha256` of `lib.ts`
  `0165132e5fa9221c80a6bd1c813a2c3f573a35f8a013e2bb6e4be3261f480c8f` before **and** after,
  `git status --porcelain` never listed it, `git diff -- template/.claude/hooks/lib.ts` empty,
  and the rerun is back to `60/60 … 39 lines`, **exit 0**.
- `git grep -n "57/57"` → see deviation 3. Outside the loop's own documents:
  `git grep -n "57/57" -- ':!docs/plans' ':!docs/reviews'` → **no matches** (exit 1), as does
  `git grep -n "57 cases"` with the same exclusions. `git diff --check` → clean; no CR bytes.

**Deviations**
1. **`Context` gained an optional third element** `[role, grant, extra_conf_line]` (the tuple
   itself is unchanged — still the 5-field `(label, tool, tool_input, context, expected)`).
   Cases 59 and 60 are about *conf* lines, and the case table had no channel for one: a bad
   **grant** is skipped rather than denied (`lib.ts findGrant`, deliberately), so it cannot
   produce the "not a valid regex" deny the item asks for. `runCase` now rewrites the sandbox
   conf per case — the shipped conf plus that one line — the same shape as the per-case grants
   rewrite it already did. One generic mechanism, no per-case logic; `""` in the grant slot
   means "no grant". `main` reads the conf once and passes the text down.
2. **README had four count references, not the two the item names**: `57/57` at `:20` (Install),
   `:33` (doctor row) and `:155` (Development, `pnpm selftest`), and `57 cases` at `:64` (the
   payload file listing). All four now read 60 — the scoped grep demands zero `57/57` in the
   shipped tree, and leaving `:64` would have been stale on the same fact.
3. **`git grep -n "57/57"` cannot reach zero repo-wide.** The loop's own plan and review
   documents quote the old number as historical record — `phase-2.md` (8×), the investigations,
   `review.md`, and this file itself (its own contract lines plus this status block). Ran with
   `':!docs/plans' ':!docs/reviews'` instead; no matches.

**For the orchestrator (outside this item's Files).** Two live instructions still say 57/57 and
will misfire after this merge: `plan.md:102` (end-to-end orchestrator validation) and
`phase-4.md:38` (the self-init smoke test). Both mean the current count, now 60/60.

## Merge-back record (orchestrator)
- Item 2.5.1: branch `worktree-agent-a2c1102b1206b4430`, worktree clean, 2 commits
  (`d262f1b`, `96af6f6`) merged fast-forward. No conflicts. Worktree removed, branch `-d`.

## Verification (orchestrator, after this phase merged)
- Orchestrator's own run: `pnpm typecheck` clean; selftest **60/60, exit 0**;
  `git grep "57/57"` excluding `docs/plans`/`docs/reviews` → empty.
- Deviations 1–3 accepted (the `Context` third element is one generic mechanism; the two
  extra README counts were the same fact; historical documents keep the old number).
- The two stale live instructions it flagged (`plan.md` validation, `phase-4.md` 4.1) fixed
  to 60/60 in this commit.
