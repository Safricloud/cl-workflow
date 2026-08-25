# Investigation — coverage (2026-08-25-static-analysis)

**Brief:** Which TypeScript in this repo does `tsc` check today, which does it not, and what
would make every `.ts` file — including the generated root `.claude/hooks/` copy and any future
`eslint.config.ts` — go through the compiler with a gate that fails when the root copy drifts
from `template/`?

**Scope:** `tsconfig.json`, `tsconfig.build.json`, `package.json`, `src/cli.ts`,
`template/.claude/hooks/*.ts`, `.claude/hooks/*.ts`, `.claude/cl-workflow.lock`,
`.github/workflows/ci.yml`, `dist/cli.js`

**Checkout:** `f684e35015d49c9d3c39ff60bb4cc26e1ba94406` (branch `chore/2026-08-25-static-analysis`),
Node v24.4.1, tsc 6.0.3

## Answer

Your measurement is confirmed: of the 17 `.ts` files in the repo, `tsc` checks 9 —
`src/cli.ts` plus the 8 under `template/.claude/hooks/` — and the 8 generated files under
`.claude/hooks/` are in no compiler program at all. They are byte-identical to `template/`
today (raw sha256, all 8, and the lock agrees), so nothing is broken right now; but nothing
would notice if they stopped being identical. Adding `.claude/hooks` to `include` typechecks
clean at exit 0 with all 17 files for roughly +1s wall time, and `tsconfig.build.json` is
unaffected because its own `include: ["src"]` **replaces** the base's rather than merging with
it — I proved that with a probe and confirmed `pnpm build` still reproduces `dist/cli.js` byte
for byte. The drift gate that works is `node dist/cli.js update .` followed by a check that
`.claude/` is untouched — but `git diff --exit-code -- .claude/` alone is **not enough**: a
hand-edit committed into the generated copy makes `update` write an untracked `*.new` beside it
and change nothing tracked, so the gate must be `git status --porcelain --untracked-files=all --
.claude/` being empty. That gate is green today and fires on template drift. `doctor`'s check 6
does not help: it compares disk against the *lock*, never against `template/`, and it only
`warn`s — `doctor` still exits 0.

## Facts

| Fact | Value | Where measured |
| --- | --- | --- |
| `.ts` files in repo outside `node_modules` | 17 (8 in `.claude/hooks/`, 8 in `template/.claude/hooks/`, 1 `src/cli.ts`); identical list from `git ls-files '*.ts'` — all 17 tracked | `find . -name '*.ts' -not -path './node_modules/*' -not -path './.git/*'` and `git ls-files '*.ts'` |
| Files `tsc` includes today | 9: `src/cli.ts` + the 8 under `template/.claude/hooks/`. The 8 under `.claude/hooks/` are **absent** | `npx tsc --listFilesOnly -p tsconfig.json` → 204 lines, 195 in `node_modules`, 9 repo files |
| `pnpm typecheck` result today | exit 0 | `npx tsc --noEmit` (the script is `tsc --noEmit`, package.json:25) |
| Root vs template hooks, raw sha256 | All 8 **IDENTICAL** (e.g. `docs-only.ts` = `5dc8f6c78399d887c893fa944a132886f44963f44dad699d333a9e1521a0cf60` both sides) | `sha256sum .claude/hooks/X.ts template/.claude/hooks/X.ts` for all 8 |
| Root vs template hooks, LF-normalised | Identical, and equal to the raw hash — the files contain **zero** CR bytes | `tr -d '\r' < f \| sha256sum` (unchanged from raw); `tr -dc '\r' < f \| wc -c` → `0`; `file` reports "Unicode text, UTF-8 text" with no CRLF note |
| Lock hashes vs both copies | All 8 `.claude/hooks/*.ts` entries match root **and** template. `hashAlgo: "sha256-lf"` | Node script hashing `readFileSync(...).replace(/\r\n/g,'\n')` against `.claude/cl-workflow.lock` → `ALL 8 MATCH LOCK AND EACH OTHER: true` |
| Every shared tracked file, root vs template | All 24 **SAME** byte for byte (agents, hooks, rules, settings, skill, templates, `.gitattributes`, `gitignore`) | `cmp -s` loop over `git ls-files template/.claude` |
| Tracked non-`.ts` inventory difference | Root has 25 files, template 24. Root-only: `.claude/.gitignore`, `.claude/cl-workflow.lock`. Template-only: `gitignore` (dotless). Contents of `gitignore` and `.gitignore` are identical | `diff` of `git ls-files .claude` vs `git ls-files template/.claude` (prefixes stripped); `cat` both |
| Reason for the `gitignore` rename | `npm pack` drops files literally named `.gitignore`; the payload ships it dotless and `targetRel()` renames on install | `src/cli.ts:143-151` |
| Repo lock is stale by one entry | Repo lock has 32 files; a fresh `init` writes 33. Missing key: `mem/outstanding.md`. No key has a differing hash | `diff` of fresh lock vs repo lock; Node key-set comparison → `in fresh not repo: [ 'mem/outstanding.md' ]`, `same key different hash: []` |
| Why that entry is missing and stays missing | `cmdUpdate` `continue`s on `owned` files before recording a hash, so `update` never adds an owned entry the lock lacks | `src/cli.ts:481-483` (`if (file.cls === "owned") { owned++; continue; }`); `mem/outstanding.md` is in `OWNED`, `src/cli.ts:31-42` |
| Standalone tsc on each **root** hook | 7 of 8 → `error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.`, exit 2. `lib.ts` alone → exit 0 (it imports nothing local). Positions: `docs-only.ts(39,88)`, `path-fence.ts(24,95)`, `pr-watch.ts(42,58)`, `reload-plan.ts(22,85)`, `rule-zero-selftest.ts(17,56)`, `rule-zero.ts(54,8)`, `status-block.ts(29,51)` | `npx tsc --noEmit --ignoreConfig --module nodenext --target esnext --strict --types node .claude/hooks/<f>.ts`, all 8 |
| Standalone tsc on each **template** hook | **Identical** — same error code, same line:col, same exit codes, file by file | same command against `template/.claude/hooks/<f>.ts`, all 8 |
| Consequence | TS5097 is the *only* distinct diagnostic. Neither copy is intrinsically "green"; both are green only because a tsconfig sets `allowImportingTsExtensions` and claims them. Today only the template copy is claimed | comparison of the two runs above; `tsconfig.json:15,20-23` |
| Probe tsconfig (`src` + `template/.claude/hooks` + `.claude/hooks`) | **exit 0**, 17 repo files in the program, no diagnostics | `npx tsc --noEmit -p <scratch>/coverage-probe/tsconfig.json`; `--listFilesOnly \| grep -v node_modules \| grep -c '\.ts$'` → `17` |
| Probe needed `typeRoots` | First run failed `TS2688: Cannot find type definition file for 'node'` because the probe config sits outside the repo. Adding `"typeRoots": ["<repo>/node_modules/@types"]` fixed it. **Probe artefact only** — a config at the repo root resolves `@types/node` normally | both probe runs |
| Wall time | baseline (9 files) 2120ms / 2450ms; probe (17 files) 4720ms / 3235ms. Roughly +1s | two `npx tsc --noEmit -p ...` runs each, timed with `date +%s%N` |
| `extends` does not merge `include` | A probe extending the **wide** base but declaring `include: ["<repo>/src"]` yields exactly one file: `src/cli.ts` | `npx tsc --listFilesOnly -p <scratch>/coverage-probe/tsconfig.buildlike.json` |
| `tsconfig.build.json` file set | `src/cli.ts` only | `npx tsc --listFilesOnly -p tsconfig.build.json` |
| `pnpm build` reproducibility | `dist/cli.js` sha256 `bb513f88…13758` before **and** after; `git diff --stat -- dist/` empty; `git diff --exit-code -- dist/` → 0 | `sha256sum dist/cli.js`, `pnpm build`, `git diff` |
| Fresh `init` vs repo `.claude/` | Only **one** difference: `cl-workflow.lock`. Every other file identical | `diff -r -q <fresh>/.claude .claude -x rule-zero.grants -x rule-zero.log -x worktrees -x pr-watch -x __pycache__` → single "differ" line, exit 1 |
| Fresh init vs repo OWNED files | `CLAUDE.md` DIFFER (25 vs 41 lines), `mem/` DIFFER (`mem/outstanding.md` 43 vs 60 lines; `mem/index.md` same), `docs/history/index.md` DIFFER (4 vs 9). Expected — these are seeded once then owned (`src/cli.ts:31-42`) | `diff -r -q` per path; `wc -l` both sides |
| `docs/guides/agent-workflow.md` | **SAME** (497 lines both) — it is *managed*, not owned (absent from `OWNED`) | `diff -r -q`; `src/cli.ts:31-42` |
| `node dist/cli.js doctor .` on repo root | **6 passed, 0 failed**, exit 0. Checks: node v24.4.1; lock (32 files, sha256-lf); settings.json 3 kit hook commands; hooks `package.json` `{"type":"module"}`; 7 hook scripts present; self-test 60/60 | direct run |
| doctor check 6 compares disk to the **lock** | `const installed = lock.files[file.rel]` then `if (hashText(readLf(dest)) !== installed) drifted.push(...)`. `template/` content is never read in this check | `src/cli.ts:675-686` (681, 684) |
| doctor check 6 is a warning, not a failure | Emitted via `say("  warn ...")`, not `fail()`; `doctor` still returns 0 | `src/cli.ts:686`; and Experiment B below returned exit 0 with the warn present |
| **Experiment A** — template drifts, installed copy + lock untouched | doctor: `6 passed, 0 failed`, exit 0, **no warn, no mention of the drifted file**. Template→root drift is invisible to `doctor` | cloned kit into scratch, appended a comment to `<kit>/template/.claude/hooks/status-block.ts`, ran `node <kit>/dist/cli.js doctor <fresh>`; grep for `warn\|status-block` found nothing |
| **Experiment B** — installed copy drifts, lock untouched | doctor prints `warn   1 managed file(s) locally edited: .claude/hooks/status-block.ts` but still `6 passed, 0 failed`, **exit 0** | appended a comment to `<fresh>/.claude/hooks/status-block.ts`, ran doctor |
| **Experiment C** — does `update` see template→root drift? | Yes: `update .claude/hooks/status-block.ts` / `1 refreshed, 23 already current`. But it **writes**; it does not gate, and returns 0 regardless | `node <kit>/dist/cli.js update <fresh>` with drifted template |
| `cmdUpdate` compares template source to disk | `const onDisk = readLf(dest)`; `if (onDisk === source)` current; else if `installed === hashText(onDisk)` overwrite from template; else write `dest + ".new"` and leave the edit | `src/cli.ts:508`, `518`, `526-527` |
| **Gate case 0** (no drift, today) | `update` → `0 refreshed, 24 already current, 0 left beside as .new`. `git diff --exit-code -- .claude/` → **0**. Untracked new files: **0**. Gate is green today | `git archive HEAD \| tar -x` into scratch, `git init`+commit, `node <clone>/dist/cli.js update <clone>` |
| **Gate case 1** (template edited, root copy stale) | `update .claude/hooks/status-block.ts`; diff shows `.claude/cl-workflow.lock` and `.claude/hooks/status-block.ts` changed; `git diff --exit-code -- .claude/` → **1**. Gate **fires** | same clone harness with a template-side edit committed first |
| **Gate case 2** (root copy hand-edited **and committed**, template untouched) | `update` prints `warn ... has local edits — wrote .claude/hooks/status-block.ts.new beside it`; `git diff --exit-code -- .claude/` → **0** (gate does **not** fire); the only trace is untracked `?? .claude/hooks/status-block.ts.new` | same clone harness with a root-copy edit committed first |
| Gate that catches case 2 as well | `git status --porcelain --untracked-files=all -- .claude/` → `?? .claude/hooks/status-block.ts.new` (non-empty ⇒ fires); empty in case 0 | run in the case-2 and case-0 clones |
| `*.new` is not gitignored | `.claude/.gitignore` lists only `rule-zero.grants`, `rule-zero.log`, `worktrees/`, `pr-watch/`, `__pycache__/` | `cat .claude/.gitignore` |
| The gate needs no install | `update` reads its template from `path.dirname(import.meta.dirname)` and `dist/cli.js` is committed with zero runtime deps, so it runs straight after checkout | `src/cli.ts:220-236`; package.json has no `dependencies` |
| Line endings cannot cause false positives | `readLf`, `writeLf` and `hashText` all normalise `\r\n` → `\n` | `src/cli.ts:113,118-121,123-125` |
| CI steps today, in order | 1 `actions/checkout@v4`; 2 `pnpm/action-setup@v4`; 3 `actions/setup-node@v4` (node 24); 4 `pnpm install --frozen-lockfile`; 5 `pnpm typecheck`; 6 `pnpm build`; 7 `git diff --exit-code -- dist/`; 8 `pnpm selftest`; 9 CLI smoke `init`+`doctor` into `$RUNNER_TEMP/cl-workflow-smoke`. Then the `ci-ok` gate job | `.github/workflows/ci.yml:18-48` and `:50-61` |
| Which CI step would catch root-copy drift or a type error in the root copy | **None.** Step 5 typechecks 9 files that exclude `.claude/hooks/`; step 7 is scoped `-- dist/`; step 8 runs `template/.claude/hooks/rule-zero-selftest.ts`; step 9 runs `init`/`doctor` against a **fresh temp dir**, never the repo's `.claude/` | `tsc --listFilesOnly` (9 files); `ci.yml:36`; `package.json:26`; `ci.yml:41-48` |
| The repo's own root hooks are never executed in CI either | `pnpm selftest` = `node template/.claude/hooks/rule-zero-selftest.ts`. Run by hand, both copies give `60/60 cases passed` | `package.json:26`; `node template/.claude/hooks/rule-zero-selftest.ts` and `node .claude/hooks/rule-zero-selftest.ts` |
| Is there an `eslint.config.ts` today? | **No.** No `eslint.config.*` and no `.eslintrc*` anywhere outside `node_modules`. Root-level tracked files are `.gitattributes`, `.gitignore`, `CLAUDE.md`, `LICENSE`, `README.md`, `package.json`, `pnpm-lock.yaml`, `tsconfig.build.json`, `tsconfig.json` | `ls`, `find . -name 'eslint.config.*' -not -path './node_modules/*'`, `git ls-files \| grep -v '/'` |
| Would the current `include` cover a root-level `eslint.config.ts`? | **No.** Probe with `include: ["src"]` and a root `eslint.config.ts` containing `const broken: number = "definitely not a number"` → program contains only `src/a.ts`, typecheck **exit 0**, error never reported | scratch `mini` project under the repo's exact compilerOptions |
| `include` entries that do cover it | `"eslint.config.ts"`, `"*.ts"`, and `"./*.ts"` all work — each pulls the file in and surfaces `eslint.config.ts(1,7): error TS2322`, exit 2. Note `*.ts` is non-recursive (tsconfig dir only) | same probe, three `include` variants |
| Do the repo's compiler options constrain a flat config's *shape*? | **No.** A config using `import type`, a typed array literal and `export default` typechecks at exit 0 under `module: nodenext` + `verbatimModuleSyntax` + `erasableSyntaxOnly` + `strict`. Flat configs are object literals, which contain none of the erasable-syntax offenders (enum, namespace, parameter properties, decorators) | same probe |
| Do they constrain its *imports*? | **Yes, hard.** `import tseslint from "typescript-eslint"` → `eslint.config.ts(1,22): error TS2307: Cannot find module 'typescript-eslint' or its corresponding type declarations.` The package must be a real installed devDependency before the file can be in the program | same probe. `node_modules` contains no eslint package (`ls node_modules \| grep -i eslint` → nothing); `node_modules/@types` contains only `node`; devDeps are `{"@types/node":"^24.13.3","typescript":"^6.0.3"}` |
| Repo left unmodified | `git status --porcelain` → only the pre-existing ` M package.json`, ` M pnpm-lock.yaml`, and `?? docs/reviews/2026-08-25-static-analysis/`. `dist/cli.js` sha unchanged; `tsc` still lists 9 files | final `git status --porcelain`, `sha256sum dist/cli.js`, `tsc --listFilesOnly` |

## Observations

**The generated copy is in a blind spot on three axes at once, not one.** It is not compiled
(`tsc` excludes it), not executed (`pnpm selftest` runs the template copy), and not diffed
(`git diff --exit-code` is scoped `-- dist/`). The CLI smoke in `ci.yml:41-48` looks like it
covers the kit, but it installs into `$RUNNER_TEMP` and runs `doctor` there — it validates a
*fresh* install and is blind to the repo's own `.claude/`. So today's CI would pass a PR that
broke all eight root hooks.

**`doctor` check 6 is weak twice over.** It compares disk to `lock.files[rel]`
(`src/cli.ts:681,684`), which answers "has anyone edited the installed file since install?" —
not "does the installed file still match `template/`?". Experiment A is the proof: I drifted the
template, left the install and lock untouched, and `doctor` printed nothing at all. And even the
drift it *does* see is `say("  warn ...")` at `src/cli.ts:686`, outside the pass/fail tally, so
Experiment B still exited 0. Anything built on `doctor` as a gate inherits both weaknesses.

**The `.new` trap is the non-obvious part of the gate design.** The intuitive gate —
`node dist/cli.js update . && git diff --exit-code -- .claude/` — is green today and does fire
when `template/` moves ahead (case 1). But it silently passes case 2, someone hand-editing the
generated copy and committing it: `cmdUpdate` takes the `writeLf(dest + ".new", source)` branch
at `src/cli.ts:526`, deliberately leaving the human's edit alone, and an untracked `.new` file
is invisible to `git diff`. Since `.claude/.gitignore` does not list `*.new`, the file does show
as `??`, so `git status --porcelain --untracked-files=all -- .claude/` being empty is the check
that covers both cases. This matters precisely because CLAUDE.md tells contributors to edit
`template/**` and re-run `update` — case 2 is exactly the mistake the gate exists to catch.

**A wider `include` is genuinely free for the build.** I was careful not to take TypeScript's
`extends` semantics on trust: the probe at
`<scratch>/coverage-probe/tsconfig.buildlike.json` extends the *wide* config yet declares
`include: ["<repo>/src"]`, and its program is exactly one file. `include` is replaced, never
merged, so widening the base cannot leak into `dist/`. `pnpm build` confirmed it empirically —
same sha256 before and after, `git diff --exit-code -- dist/` → 0.

**Two copies of the same eight modules in one program is fine.** The probe compiled all 17
files clean at exit 0. Each directory carries its own `.claude/hooks/package.json`
(`{"type":"module"}` in both), so `nodenext` resolution treats them as two independent ESM
graphs; there is no duplicate-identifier or shared-scope problem. The cost is about a second of
wall time.

**Adjacent, minor:** the repo's `.claude/cl-workflow.lock` is missing the `mem/outstanding.md`
entry a fresh `init` writes (32 keys vs 33). It is harmless — the file is `OWNED`, so check 6
skips it and `cmdUpdate` will never backfill it (`src/cli.ts:481-483`) — but it means the repo's
lock is not what `init` would produce today, so any future gate phrased as "the lock equals a
fresh init's lock" would fail for this cosmetic reason. The `update`-based gate is unaffected: I
verified `update` against a pristine `git archive HEAD` export changes nothing, lock included.

**On `eslint.config.ts`:** the ordering constraint is worth flagging to the plan. The file
cannot be added to `include` before `typescript-eslint` (or whatever it imports) is a real
installed devDependency — otherwise `pnpm typecheck` fails with TS2307 in CI. Config-file
coverage and lint-dependency installation have to land in the same change. I answered the import
question by measurement (a probe importing an uninstalled package under the repo's exact
options), not from the compiler options alone, but I could not verify that
`typescript-eslint`'s *own* shipped types satisfy `verbatimModuleSyntax` and `nodenext` exports
resolution, because installing it was out of scope.

## Not done / could not measure

- **Did not edit any repo file.** In particular I did not add `.claude/hooks` to the real
  `tsconfig.json`, did not create an `eslint.config.ts`, and did not modify `.github/workflows/ci.yml`.
  Every "what if" above was measured in the scratchpad at
  `C:\Users\KEATON~1\AppData\Local\Temp\claude\c--Users-Keaton-Forrest-Documents-GitHub-cl-workflow\d0073c7c-be36-4f41-a307-e455885e4bb7\scratchpad\coverage-probe`
  (`tsconfig.json`, `tsconfig.buildlike.json`, `mini/`, `fresh/`, `kit/`, `gate/`, `repoclone/`,
  `pristine/`).
- **Did not inject a type error into a root hook in the repo** to watch `pnpm typecheck` ignore
  it. The `--listFilesOnly` result is dispositive — a file absent from the program cannot
  produce a diagnostic — and I demonstrated the same mechanism directly in the `mini` probe,
  where a blatant `TS2322` in an unincluded root-level file gave exit 0.
- **Did not install `eslint`, `typescript-eslint`, or anything else**; no `pnpm add`, no
  `pnpm install`. The TS2307 finding therefore shows *that* an uninstalled import fails, not how
  `typescript-eslint`'s real types behave under these options.
- **Did not run CI**, and did not test the Windows leg's behaviour separately — all measurements
  are from the local Windows checkout, Node v24.4.1, tsc 6.0.3. The `readLf`/`writeLf`/`hashText`
  LF normalisation (`src/cli.ts:113,118-121,123-125`) is the code-level reason I expect the
  ubuntu and windows legs to agree, but I did not observe both.
- **Timings are two runs each, on a warm cache, on a developer machine** — good enough to say
  "about a second more", not a benchmark.
- **Did not evaluate lint rule content**, tool choice, or whether `tsc` coverage is the right
  mechanism versus a separate check. The brief asked what is covered and what would close the
  gap; the choice is the orchestrator's.
- **Did not examine** `.claude/settings.json` hook wiring beyond what `doctor` reported
  (3 kit hook commands, every script present), nor the other four hooks invoked from agent
  frontmatter.

## Live reads taken

None. The brief states the owner has not asked for live reads, and nothing here required one —
every measurement is local. No rule-zero hook fired during this investigation; the only writes
were to the scratchpad and to this file under `docs/reviews/`.
