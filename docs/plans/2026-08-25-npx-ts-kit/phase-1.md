# Phase 1 — 1 implementer, serial (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** branch head (review + decisions committed)
**Magnet files this phase touches:** all of them (root manifest, payload move, README) — which
is exactly why this phase is one serial item.

### Item 1.1 — Package skeleton and payload move
**Files:** `package.json` (new), `tsconfig.json` (new), `tsconfig.build.json` (new),
`.gitattributes` (new), `pnpm-lock.yaml` (generated), `.gitignore` (new, root),
`template/**` (moved/copied payload), `README.md` (rewritten), deletions: root `SKILL.md`,
`agent-workflow.md`, `docs-only.py`, `pr-watch.py`.
**Approach:**
- `git rm` the four byte-identical root duplicates (facts table).
- Create `template/` and **copy** (not move) the payload into it: `.claude/**` →
  `template/.claude/**` (with `.claude/.gitignore` renamed to `template/.claude/gitignore` —
  npm-pack drop workaround, patterns rewritten unanchored: `rule-zero.grants`,
  `rule-zero.log`, `worktrees/`), `CLAUDE.md` → `template/CLAUDE.md`,
  `docs/guides/agent-workflow.md` → `template/docs/guides/agent-workflow.md`, empty
  scaffolding `template/docs/{plans,reviews,history,reports}/.gitkeep`,
  `template/docs/history/index.md`, `mem/index.md` + `mem/outstanding.md` →
  `template/mem/` — **the template `mem/outstanding.md` is the pristine seed** (as at
  `dc189da`), not this repo's live ledger. Root working copies stay in place and live until
  phase 4's self-init replaces them.
- Do NOT copy this contribution's own records (`docs/reviews/2026-08-25-npx-ts-kit/`,
  `docs/plans/2026-08-25-npx-ts-kit/`) into `template/`.
- `package.json`: name `@safricloud/cl-workflow`, private false, version `0.6.0`,
  `"type": "module"`, `bin: {"cl-workflow": "dist/cli.js"}`, `files: ["dist", "template"]`,
  `engines: {"node": ">=24"}`, `packageManager` pinned to current pnpm,
  devDependencies `typescript@^6.0.0` (if unresolvable: STOP, mark Blocked — plan decision),
  scripts: `build` = `tsc -p tsconfig.build.json`, `typecheck` = `tsc --noEmit`,
  `selftest` = `node template/.claude/hooks/rule-zero-selftest.ts` (target lands phase 2).
- `tsconfig.json` (checking): `module: nodenext`, `target: esnext`, `strict`,
  `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`,
  include `src` + `template/.claude/hooks`. `tsconfig.build.json`: extends it, emit only
  `src/cli.ts` → `dist/`, `rewriteRelativeImportExtensions` on.
- Root `.gitattributes`: `* text=auto eol=lf`. Also add `template/.claude/.gitattributes`
  scoped `* text=auto eol=lf` (structure investigation recommends `.claude`-scoped in payload).
- Root `.gitignore`: `node_modules/`, `__pycache__/`.
- `pnpm install` to generate and commit `pnpm-lock.yaml`.
- `README.md`: rewrite kit-facing — what the kit is, install
  (`npx github:Safricloud/cl-workflow init`), the three CLI commands, repo layout
  (`src/`, `dist/`, `template/`), CI + ruleset (`ci-ok`, admin bypass), development
  (pnpm, tsc 6, Node ≥ 24), and fix every stale claim: selftest prints **57/57** not 52/52;
  requirement is Node ≥ 24, not `python3`.
**Conventions that will fail your lint:** LF endings everywhere (the new `.gitattributes`
enforces); JSON files two-space indented; no `python3` mention may survive in README.
**Scoped validation:** `pnpm install` exits 0; `git status --short` clean after commit;
`node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`;
`grep -r "python3" README.md` → no matches; on a temp `npm pack --dry-run`:
`template/.claude/gitignore` listed, no `.py` surprises at root.
**Acceptance:** repo has `template/` payload complete (diff `template/.claude` vs `.claude`
shows only the gitignore rename and gitattributes addition); four duplicates gone; reverting
the change removes `package.json` → `npm pack --dry-run` fails, and restores the duplicates.
#### Status — item 1.1
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
