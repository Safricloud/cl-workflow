# Phase 2 — 1 implementer, serial (2026-08-26-prose-standards)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 1
**Magnet files this phase touches:** the generated root `.claude/` and `docs/guides/`, and
`.claude/cl-workflow.lock` — nobody else runs in this phase.

### Item 2.1 — regenerate the root copy and the lock
**Files:** `.claude/**` (generated), `docs/guides/agent-workflow.md` (generated),
`.claude/cl-workflow.lock`
**Approach:** `pnpm build` (must reproduce `dist/cli.js` byte for byte — no `src/` change in
this contribution), then `node dist/cli.js update .`. Read its summary: the managed `.md` files
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
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<worktree branch, commits merged, conflicts, worktree removed.>

## Verification (orchestrator, after this phase merged)
<Full check; gate with the new pathspec; checker verified by hand-editing the root guide;
parity; the lock diff read.>
