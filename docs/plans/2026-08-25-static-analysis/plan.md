# Plan — Every TypeScript file through the compiler, and ESLint beside it (2026-08-25-static-analysis)

**Date:** 2026-08-25 22:10 SAST
**Review:** `docs/reviews/2026-08-25-static-analysis/review.md` — direction **B**, decisions 1–11
**Issue:** none
**Branch:** `chore/2026-08-25-static-analysis` off `main` (`f684e35`); seed `1bed394` (devDependency floors)
**Owner go-ahead:** 2026-08-25 at the Questions phase — "B — TS config, conventions as rules,
drift gate"; "recommendedTypeChecked"; "eslint.config.mjs"; "Both: regex rule + eslint-plugin-n";
"All eight"; drift gate "Yes"; "Merge when the review loop is silent — squash, --admin"
**Phases:** `phase-1.md` (1 item, serial: toolchain + CLI) · `phase-2.md` (3 items, parallel: the
hooks) · `phase-3.md` (1 item, serial: regenerate the root copy, README) · `phase-<n>.5.md` added
if verification finds anything

## Measured facts (from the investigations; do not re-derive)
| Fact | Value | Where measured |
| --- | --- | --- |
| `.ts` files in the repo | 17: `src/cli.ts`, 8 under `template/.claude/hooks/`, 8 under `.claude/hooks/` | investigation-coverage.md |
| Files `tsc` checks today | 9 — the root `.claude/hooks/` copy is in no program | investigation-coverage.md (`tsc --listFilesOnly`) |
| Root copy vs template | byte-identical, all 24 tracked files; lock hashes agree | investigation-coverage.md, -callsites.md |
| Widened `include` (`src`, `template/.claude/hooks`, `.claude/hooks`) | exit 0, 17 files, ≈ +1 s | investigation-coverage.md (probe) |
| `tsconfig.build.json` | its own `include: ["src"]` **replaces** the base's; `pnpm build` reproduces `dist/cli.js` byte for byte under a wide base | investigation-coverage.md |
| All eight flags together, on the 9 files | **69 errors**: 44 × TS4111; 25 unchecked-index (TS2532 6, TS2345 8, TS2322 6, TS18048 4, TS2769 1). Per file: cli.ts 3, docs-only 9, lib 2, path-fence 5, pr-watch 19, reload-plan 9, rule-zero-selftest 7, rule-zero 12, status-block 3 | orchestrator, `npx tsc --noEmit --<all eight>`, 2026-08-25 |
| Six of the flags alone | 0 errors each (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `noImplicitReturns`, `exactOptionalPropertyTypes`) | orchestrator, per flag |
| Drift gate that works | `node dist/cli.js update .` then `git status --porcelain --untracked-files=all -- .claude/` empty. Green today; fires on template-ahead (tracked change) and on a committed hand edit (untracked `*.new`) | investigation-coverage.md, gate cases 0–2 |
| `git diff --exit-code -- .claude/` alone | misses the hand-edit case (`update` writes `.new`, changes nothing tracked) | investigation-coverage.md |
| `doctor` | compares disk to the lock, not to `template/`; drift is a warn, exit 0 | investigation-coverage.md, `src/cli.ts:675-686` |
| ESLint / @eslint/js / typescript-eslint / eslint-plugin-n | 10.9.1 / 10.0.1 / 8.68.0 / 18.3.0; typescript-eslint peer `>=4.8.4 <6.1.0` admits 6.0.3; no pnpm peer warnings | investigation-eslint.md (installed package.json files) |
| `eslint.config.mjs` | loads with no flag and no `jiti`; identical results to `.ts` + flag | investigation-eslint.md |
| `tseslint.config()` | deprecated in 8.68; use `defineConfig` from `eslint/config` | investigation-eslint.md |
| `recommendedTypeChecked` on the 9 files | **7 errors**: `no-useless-assignment` ×5 (`src/cli.ts` 195/247/615/658, `rule-zero.ts` 198), `no-unsafe-argument` ×1 (`src/cli.ts:301`), `no-base-to-string` ×1 (`pr-watch.ts:114`) | investigation-eslint.md |
| Typed linting of the config file | needs `allowDefaultProject` or the file in a tsconfig; simplest is to keep typed configs on `**/*.ts` only | investigation-eslint.md fact 4 |
| `no-restricted-imports` | regex form `^(?![.]\|node:)` → 0 on the 9 files, catches `"fs"`/`"typescript"` in import and re-export; the `group:` glob form false-positives ×8 — do not use it | investigation-eslint.md |
| `eslint-plugin-n` | `prefer-node-protocol` (autofix), `no-extraneous-import` (publish-aware), `no-missing-import`, `no-unpublished-import` → 0 on the 9 files | investigation-eslint.md |
| Default flat-config ignores | `**/node_modules/`, `.git/` only; dot-folders are linted; `dist/cli.js` → 15 errors and `.claude/worktrees/**` are picked up without `ignores` | investigation-eslint.md |
| `linebreak-style` / `eol-last` | absent from every preset | investigation-eslint.md |
| `erasableSyntaxOnly` | already gated by tsc and by Node; ESLint adds nothing — no duplicate rule | investigation-eslint.md |
| `(r.stdout ?? "")` after `spawnSync` | correct: Node returns `null` when the spawn fails; `@types/node` says non-null. Keep the guard | investigation-eslint.md |
| Call sites of the check commands | executed: `package.json` scripts, `ci.yml:30-48`; prose: `CLAUDE.md:14-18`, `README.md:158-164`, `README.md:174-178` | investigation-callsites.md |
| README says "five hooks" | seven ship (`README.md:4` vs `:71-77`) | investigation-callsites.md |
| `docs-only.ts` on this PR | code, exit 3 — merge on the owner's word (given: decision 11) | investigation-callsites.md |
| Lock file | `lockfileVersion '9.0'`, 3 packages, pnpm 10.27.0 pinned and installed | investigation-callsites.md |

## Owner decisions this plan rests on
Review → Decisions, 2026-08-25: 1 direction **B** · 2 **`recommendedTypeChecked`** · 3
**`eslint.config.mjs`** · 4 **regex rule + `eslint-plugin-n`** · 5 **all eight compiler flags**
· 6 **drift gate in CI** · 7 bump committed as seed (`1bed394`, done) · 8 stash dropped under a
single-use grant (done, grant consumed) · 9 README housekeeping **yes** · 10
**`eslint --max-warnings 0 .`** · 11 **merge on silence, squash, `--admin`**.

## Decisions made by this plan — veto here or in the PR
- **Config shape.** `eslint.config.mjs` uses `defineConfig` from `eslint/config` (not the
  deprecated `tseslint.config`). `js.configs.recommended` applies everywhere;
  `tseslint.configs.recommendedTypeChecked` and the plugin-n rules are scoped with
  `files: ["**/*.ts"]` so the config file itself is linted by core rules only and typed linting
  never has to see a `.mjs`. `languageOptions.parserOptions` = `{ projectService: true,
  tsconfigRootDir: import.meta.dirname }`.
- **Ignores.** `ignores: ["dist/", ".claude/worktrees/"]` — the compiled bin and every
  implementer worktree. Nothing else; both hook copies are linted on purpose.
- **Convention rules.** `no-restricted-imports`: `patterns: [{ regex: "^(?![.]|node:)",
  message: "node: builtins and relative .ts imports only — the kit has zero runtime
  dependencies" }]`. `eslint-plugin-n`: `n/prefer-node-protocol`, `n/no-extraneous-import`,
  `n/no-missing-import`, `n/no-unpublished-import` at `error`. No `no-restricted-syntax`
  duplicate of `erasableSyntaxOnly`.
- **`@typescript-eslint/no-non-null-assertion: error`** added explicitly (it is in strict, not
  recommended). The 25 unchecked-index errors are fixed with real guards, not `!` — a `!` would
  turn a fail-closed hook into a crash. Every guard preserves the current fail-closed behaviour
  (a missing value denies / exits non-zero exactly as the code does today).
- **TS4111 fixes are bracket access** (`process.env["X"]`, `record["id"]`) — the style
  `src/cli.ts` already uses; no `declare` augmentations of `ProcessEnv`.
- **Lint script** `"lint": "eslint --max-warnings 0 ."` — no `--cache`, no `--fix` in the
  script; the CI step is `pnpm lint` between `pnpm install` and `pnpm typecheck` so the cheapest
  gate runs first.
- **Drift gate step** after the `dist/` drift gate, `shell: bash`, on both OS legs:
  `node dist/cli.js update .` then fail if `git status --porcelain --untracked-files=all --
  .claude/` prints anything (printing what it found first).
- **`tsconfig.json` `include`** becomes `["src", "template/.claude/hooks", ".claude/hooks"]`;
  the eight flags go in `compilerOptions` beside `strict`. `tsconfig.build.json` is untouched.
- **Phase 1 leaves `pnpm typecheck` and `pnpm lint` red on the hooks by design** — the flags are
  in, the hooks are fixed in phase 2, the root copy regenerated in phase 3. The branch is green
  only at the end of phase 3; every scoped validation says which files must be clean.
- **Behavioural smoke for hooks without a test suite.** `rule-zero.ts` and `lib.ts` have the
  60-case self-test; the other five hooks have none. Each phase-2 item records, for every hook
  it touches, one representative stdin invocation run before and after its change with
  identical stdout/exit — not proof, but the regression check the repo can afford today.
- **`.claude/cl-workflow.lock` is regenerated by `update` in phase 3** and committed with the
  root copy; the known 32-vs-33 entry difference (`mem/outstanding.md` is owned and never
  back-filled) is left alone — it is by design (investigation-coverage.md).
- **Root `CLAUDE.md` and `mem/`** are updated by the orchestrator at archive time (documents);
  README edits are an implementer's (item 3.1) because they travel with the regenerated copy.

## Decisions made mid-loop — implemented; veto in the PR
- 2026-08-25 — Accepted item 1.1's deviation: `plugins: { n }` registered in the `**/*.ts`
  block (ESLint aborts otherwise; the four rules are as specified).
- 2026-08-25 — **Phase 1.5** added from phase-1 verification: the config header names
  `--experimental-strip-types` as the reason for `.mjs`; the measured reason is ESLint's
  `--flag unstable_native_nodejs_ts_config`. Comment-only fix, item 1.5.1, dispatched beside
  phase 2 (disjoint file).
- 2026-08-25 — A finished worktree's `node_modules` (created by the implementer's own
  `pnpm install`) blocks `git worktree remove` on Windows; it is deleted by hand before the
  remove. Not work, reproducible from the lock; recorded so the next loop expects it.
- 2026-08-25 — The rule-zero path fence denied the implementer's Write tool on a file inside
  its **own worktree** (`path:outside-repo …/.claude/worktrees/<id>/eslint.config.mjs`); the
  implementer wrote through Bash instead. Not fixed in this contribution (out of the ask);
  recorded in `mem/outstanding.md` → engineering follow-ups at archive time.

## Phasing
Phase 1 is one serial item: it touches every magnet at once — `package.json`, the lock,
`tsconfig.json`, `ci.yml`, the new config — plus `src/cli.ts` and its committed `dist/`, so
nothing can run in parallel with it and everything after it needs its flags installed. Phase 2
fans out three ways on disjoint hook files under `template/.claude/hooks/` (the gate trio;
pr-watch + status-block; docs-only + reload-plan + path-fence); each item edits only its own
section of `phase-2.md`. Phase 3 is one serial item on the merged, verified result of phase 2:
regenerate the root copy with the CLI, README, and the full check green.

## Orchestrator work (documents only)
This plan directory (committed before dispatch); merge-back and verification records per phase;
`CLAUDE.md` (full check, conventions) and `mem/` at archive time; archive, PR, review cycles,
merge on decision 11, deploy report (`none yet`).

## Orchestrator validation (after each phase merge, and at the end)
After phase 1: `pnpm lint` and `pnpm typecheck` run and their findings are confined to the two
hook directories (0 in `src/`); `pnpm build` then `git diff --exit-code dist/` clean;
`pnpm selftest` 60/60; the checker verified — an unprefixed `import * as fs from "fs"` in a
scratch copy of `src/cli.ts` makes `pnpm lint` red; an unused local makes `pnpm typecheck` red.
After phase 2: `npx tsc --noEmit` reports 0 errors under `template/`; `npx eslint
--max-warnings 0 template/` clean; `pnpm selftest` 60/60; the before/after smoke records read.
After phase 3, the full check: `pnpm lint && pnpm typecheck && pnpm build && git diff
--exit-code dist/ && pnpm selftest`, then `node dist/cli.js update .` + empty porcelain status;
`node dist/cli.js init <scratch>/smoke && node dist/cli.js doctor <scratch>/smoke`; both copies'
self-tests 60/60; the drift gate verified in a scratch clone (hand-edit a root hook, commit,
gate red); `.claude/rule-zero.log` read for implementer denials; the diff of every hook re-read
for a guard that changed behaviour; every sentence in README/CLAUDE.md the change made true or
false re-read.

## Blocked on the owner
None.
