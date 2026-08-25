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
*(implementer keeps this current: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
