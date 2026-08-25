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
*(implementer keeps this current: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
