# Investigation — eslint (2026-08-25-static-analysis)

**Brief:** What is the current, measured state of ESLint + typescript-eslint against this repo's
TypeScript 6.0.3 / Node 24.4.1 / pnpm 10.27 / ESM (`"type": "module"`) setup, and what does each
candidate config actually report on the repo's nine TypeScript files?

**Scope (read):** `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.build.json`,
`src/cli.ts`, `template/.claude/hooks/*.ts` (8 files), `template/.claude/hooks/package.json`,
`CLAUDE.md`, `.gitattributes`.

**Checkout:** `d89efa54d99947aa74aab7f17996e78c9b1dd341` on `chore/2026-08-25-static-analysis`
(the brief said `f684e35`; `git diff --stat f684e35 -- src template/.claude/hooks` is **empty**,
so the nine TypeScript files are byte-identical at both commits and every finding below holds for
either). Working tree at investigation time: `M package.json`, `M pnpm-lock.yaml` only (the
`^24.0.0`→`^24.13.3` / `^6.0.0`→`^6.0.3` devDependency bump). Nothing was installed or written in
the repo; all measurement happened in a throwaway probe at
`C:\Users\Keaton Forrest\AppData\Local\Temp\claude\c--Users-Keaton-Forrest-Documents-GitHub-cl-workflow\d0073c7c-be36-4f41-a307-e455885e4bb7\scratchpad\eslint-probe`.

## Answer

ESLint 10.9.1 + typescript-eslint 8.68.0 install cleanly against TypeScript 6.0.3 with **no pnpm
peer warning** — typescript-eslint's installed peer range is `>=4.8.4 <6.1.0`, which admits 6.0.3.
A native `eslint.config.ts` does **not** load on Node 24.4.1 by default (ESLint demands `jiti`);
it loads fine with `--flag unstable_native_nodejs_ts_config` or `ESLINT_FLAGS=…`, and an
`eslint.config.mjs` needs neither flag nor jiti and produces identical results. On the nine files
the three candidate configs give **(a) recommended → 5 errors, (b) recommendedTypeChecked → 7,
(c) strictTypeChecked+stylisticTypeChecked → 100** (plus 1 on the config file itself: `tseslint.config()`
is deprecated in 8.68 in favour of `defineConfig()`). The gap is almost entirely style/opinion:
64 of (c)'s 100 are `dot-notation` (37) and `restrict-template-expressions` on plain `${number}` (27,
purely because strict flips `allowNumber` to `false`), and 11 `no-unnecessary-condition` hits are
the *rule* being wrong — the code defensively writes `(r.stdout ?? "")` against `spawnSync`, which
`@types/node` types as non-nullable but which is `null` at runtime when the spawn itself fails.
The genuinely interesting findings across every config are only five `no-useless-assignment`
(dead `= null` / `= []` initialisers), one `no-unsafe-argument` (`Array.isArray(unknown)` narrowing
to `any[]` in `src/cli.ts:301`) and one `no-base-to-string` (`String(record.id)` on `unknown` in
`pr-watch.ts:114`). For the repo's stated conventions: `no-restricted-imports` with
`patterns: [{ regex: "^(?![.]|node:)" }]` reports **0** on the nine files and catches `"fs"` /
`"typescript"` in both `import` and `export … from` form (the `group:` glob form is unusable — it
false-positives 8 times on `./lib.ts` and `node:timers/promises`); it does **not** see dynamic
`import()`. ESLint alone does **not** cover `erasableSyntaxOnly` — only `@typescript-eslint/no-namespace`
overlaps (1 of tsc's 4 errors); a `no-restricted-syntax` triple reproduces tsc exactly, i.e. it
would be pure duplication of a gate tsc already holds. Finally, flat config lints dotfolders by
default — `.claude/worktrees/**` and the committed `dist/cli.js` (15 errors) are both picked up by
`eslint .` and **must** be added to `ignores` (only `**/node_modules/` and `.git/` are ignored by default).

## Facts

| Fact | Value | Where measured |
| --- | --- | --- |
| Repo Node / pnpm | `v24.4.1` / `10.27.0` | `node -v && pnpm -v` in repo root |
| Nine TS files in scope | `src/cli.ts` (746 lines) + 8 hooks (`docs-only` 301, `lib` 315, `path-fence` 79, `pr-watch` 293, `reload-plan` 127, `rule-zero-selftest` 254, `rule-zero` 241, `status-block` 113) = 2469 lines | `wc -l src/cli.ts template/.claude/hooks/*.ts` |
| Baseline `tsc --noEmit` | exit 0 on the nine files with the repo's tsconfig | `npx tsc --noEmit` in probe (tsconfig copied byte-for-byte) |
| eslint installed version | `10.9.1` | `node_modules/eslint/package.json` |
| eslint `engines.node` | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | `node_modules/eslint/package.json` |
| eslint `peerDependencies` | `{ "jiti": "*" }`, `peerDependenciesMeta.jiti.optional = true` | `node_modules/eslint/package.json` |
| @eslint/js installed version | `10.0.1`, peer `eslint: ^10.0.0`, engines same as eslint | `node_modules/@eslint/js/package.json` |
| typescript-eslint installed version | `8.68.0` | `node_modules/typescript-eslint/package.json` |
| typescript-eslint peer on typescript | `>=4.8.4 <6.1.0` — **admits 6.0.3** (confirms the registry read) | `node_modules/typescript-eslint/package.json` |
| typescript-eslint peer on eslint | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | same file |
| typescript-eslint `@typescript-eslint/*` deps | `eslint-plugin`, `parser`, `typescript-estree`, `utils` — all pinned `8.68.0`; store also holds `project-service`, `scope-manager`, `tsconfig-utils`, `type-utils`, `types`, `visitor-keys` at `8.68.0` | `node_modules/typescript-eslint/package.json`; `ls node_modules/.pnpm \| grep @typescript-eslint` |
| pnpm peer warnings on install | **none** — `pnpm add -D typescript@6.0.3 @types/node eslint @eslint/js typescript-eslint` and a later clean `rm -rf node_modules && pnpm install` both printed no `WARN … peer` line | probe install output (full output in Observations) |
| `eslint.config.ts`, Node 24.4.1, no jiti, no flag | **fails**: `Error: The 'jiti' library is required for loading TypeScript configuration files. Make sure to install it.` (thrown at `node_modules/eslint/lib/config/config-loader.js:145`) | `npx eslint .` in probe |
| Governing flag | `unstable_native_nodejs_ts_config` — the only non-test active flag in ESLint 10.9.1 | `node_modules/eslint/lib/shared/flags.js:32` (`activeFlags` map) |
| Native-TS gate condition | `["strip","transform"].includes(process.features.typescript)`; Node 24.4.1 reports `"strip"`, so the gate passes | `node_modules/eslint/lib/config/config-loader.js:126-131`; `node -e "console.log(process.features.typescript)"` → `strip` |
| `eslint.config.ts` **with** the flag | loads and lints normally | `npx eslint . --flag unstable_native_nodejs_ts_config` |
| Flag via env var | `ESLINT_FLAGS=unstable_native_nodejs_ts_config npx eslint .` works identically (comma-separated list) | `node_modules/eslint/lib/eslint/eslint-helpers.js:1321-1330`; measured run |
| `eslint.config.mjs` fallback | works with **no flag and no jiti**: `files: 10, errors: 5` — identical to the `.ts` + flag run | `npx eslint . -f json` with `eslint.config.mjs` in probe |
| **(a)** `js.recommended` + `tseslint.recommended` | **10 files linted** (9 repo + `eslint.config.ts`), **5 errors, 0 warnings**; best-of-3 wall clock **2766 ms** | `npx eslint . --flag … --max-warnings 0 -f json -o out-a.json` |
| (a) per-rule | `no-useless-assignment` × 5 (`src/cli.ts` 195/247/615/658, `rule-zero.ts` 198) | `out-a.json` summarised |
| (a) per-file | `src/cli.ts` 4, `rule-zero.ts` 1, all other 7 hooks + config file 0 | `out-a.json` |
| (a) enabled rules | 91 keys present, **69 enabled** | `npx eslint --print-config src/cli.ts` |
| **(b)** `js.recommended` + `tseslint.recommendedTypeChecked`, `projectService: true`, `tsconfigRootDir` | **8 errors** — the 5 above, plus 1 `no-unsafe-argument`, 1 `no-base-to-string`, **plus 1 fatal parsing error on `eslint.config.ts` itself** | first (b) run, `out-b.json` |
| (b) with `allowDefaultProject: ["eslint.config.ts"]` | **10 files, 7 errors, 0 warnings**; best-of-3 wall clock **4500 ms** | `out-b.json` (canonical run) |
| (b) per-rule | `no-useless-assignment` × 5; `@typescript-eslint/no-unsafe-argument` × 1 (`src/cli.ts:301:40` "Unsafe spread of an `any[]` array type"); `@typescript-eslint/no-base-to-string` × 1 (`pr-watch.ts:114:17`) | `out-b.json` |
| (b) enabled rules | 118 keys present, **92 enabled** | `--print-config src/cli.ts` |
| **(c)** `js.recommended` + `strictTypeChecked` + `stylisticTypeChecked` | **10 files, 101 errors, 0 warnings** (100 on the nine + 1 on `eslint.config.ts`); best-of-3 wall clock **4598 ms** | `out-c.json` |
| (c) per-file | `src/cli.ts` 71, `rule-zero-selftest.ts` 9, `docs-only.ts` 6, `pr-watch.ts` 6, `rule-zero.ts` 3, `lib.ts` 2, `path-fence.ts` 1, `reload-plan.ts` 1, `status-block.ts` 1, `eslint.config.ts` 1 | `out-c.json` |
| (c) enabled rules (**fact 8**) | `npx eslint --flag unstable_native_nodejs_ts_config --print-config src/cli.ts` → 168 rule keys, **138 enabled** (49 core + 89 plugin) | probe |
| Config-file self-lint (**fact 4**) | Yes, `eslint.config.ts` is linted. Under typed linting without a fix: `Parsing error: …\eslint.config.ts was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProject.` | first (b) run, `out-b.json` |
| Minimal fix A | `parserOptions.projectService = { allowDefaultProject: ["eslint.config.ts"] }` → config file drops to 0 errors, total 8→7 | `out-b2.json` |
| Minimal fix B | add `"eslint.config.ts"` to tsconfig `include` and keep `projectService: true` → `files: 10, fatal: 0`, same 7 findings, **and `npx tsc --noEmit` still exits 0** | probe with patched tsconfig, then restored |
| `no-restricted-imports` on the nine (**fact 5**) | `["error", { patterns: [{ regex: "^(?![.]\|node:)", message: … }] }]` → `files linted: 9, no-restricted-imports count: 0` | `npx eslint src template … -f json`, counted from JSON |
| Same rule on violations | flags `import * as fs from "fs"`, `import ts from "typescript"`, `export * from "fs/promises"`, `export { x as y } from "typescript"`; does **not** flag `import * as path from "node:path"` or `import { run } from "./ok.ts"` | probe `scratch/bad-imports.ts` |
| Gap: dynamic import | `return await import("typescript")` → **0 problems, exit 0**. The rule's visitor keys are `ImportDeclaration`, `ExportNamedDeclaration`, `ExportAllDeclaration`, `TSImportEqualsDeclaration` — no `ImportExpression` | `npx eslint scratch/dynamic.ts`; `node_modules/eslint/lib/rules/no-restricted-imports.js:857-866` |
| Repo's actual specifiers | `./lib.ts` ×8, `node:path` ×9, `node:fs` ×7, `node:child_process` ×5, `node:os` ×2, `node:util` ×2, `node:crypto` ×1, `node:timers/promises` ×1. No `require(` and no `await import(` anywhere in the nine files | `grep -o 'from "[^"]*"' … \| sort \| uniq -c`; `grep -rn "await import(\|require(" src/cli.ts template/.claude/hooks/*.ts` → "none found" |
| `eslint-plugin-n` installed | `18.3.0`, peers `eslint >=8.57.1`, `typescript >=5.0.0`, `ts-declaration-location ^1.0.6`; engines `^20.19.0 \|\| ^22.13.0 \|\| >=24` | `node_modules/eslint-plugin-n/package.json` |
| plugin-n on the nine | `n/prefer-node-protocol`, `n/no-unpublished-import`, `n/no-extraneous-import`, `n/no-missing-import` all enabled → **0 findings** on the nine files | `npx eslint src template … -f json` |
| plugin-n adds | `n/prefer-node-protocol` flags `import "fs"` with `Prefer 'node:fs' over 'fs'` and is **auto-fixable**; `n/no-extraneous-import` flags `import ts from "typescript"` from a *published* path (`template/…`, in `package.json` `files`) but **not** from `src/` (not published); `n/no-missing-import` flags an unresolvable `chalk` | probe `_probe.ts` placed in each location |
| tsc vs eslint on erasable syntax | tsc `--erasableSyntaxOnly` raises **4 × TS1294** (enum @1:13, namespace @6:18, two parameter properties @11:15 and @11:42). Config (c) raises **1** (`@typescript-eslint/no-namespace` @6:8) | `npx tsc --ignoreConfig --noEmit --strict --erasableSyntaxOnly … scratch/erasable.ts`; `npx eslint scratch/erasable.ts` |
| Node runtime agrees with tsc | `node scratch/erasable.ts` → `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode` | probe |
| `no-restricted-syntax` equivalent | selectors `TSEnumDeclaration`, `TSModuleDeclaration:not([declare=true])`, `TSParameterProperty` reproduce tsc's 4 errors at the **same 4 lines**, and report **0** on the nine files | probe |
| …and its trap | the naive `TSModuleDeclaration` selector (no `:not([declare=true])`) fires on `declare module "x" {}` and `declare namespace NS {}`, which `erasableSyntaxOnly` **permits** (tsc raises no TS1294 there) | probe `scratch/ambient.ts` |
| Flat-config default ignores (**fact 6**) | `ignores: ["**/node_modules/", ".git/"]` — nothing else | `node_modules/eslint/lib/config/default-config.js:68` |
| Dotfolders | linted by default: with **no** `ignores` block, `eslint .` saw 13 files including `.claude/hooks/lib.ts` and `.claude/worktrees/wt1/src/cli.ts` | probe with simulated `.claude/` tree |
| `dist/cli.js` | **is** picked up by `eslint .` without an ignore: 15 errors (`no-undef` × 11, `no-useless-assignment` × 4) | same run; `npx eslint dist/cli.js -f json` |
| `.claude/worktrees/` | **is** picked up (4 errors from the copied `cli.ts`) — needs an explicit ignore or every implementer worktree gets double-linted | same run |
| Why `.ts` is lintable at all | `tseslint.configs.recommended[1]` (`typescript-eslint/eslint-recommended`) carries `files: ["**/*.ts","**/*.tsx","**/*.mts","**/*.cts"]`; nothing else names `.ts` | `node --input-type=module -e "import tseslint …"` |
| Line endings (**fact 7**) | `linebreak-style` and `eol-last` are **absent from the printed config** under (a), (b) and (c): `grep -o '"…linebreak…"\|"eol-last"' pc-a.json pc-b.json pc-c.json` → no match. (Both rules still ship in `node_modules/eslint/lib/rules/`, deprecated, but no preset enables them.) | `--print-config` for each config; `ls node_modules/eslint/lib/rules/` |

### (c) per-rule counts — full table

| Count | Rule | Representative site |
| --- | --- | --- |
| 37 | `@typescript-eslint/dot-notation` | `src/cli.ts:202` — `const packages = parsed["packages"];` (all 37 are in `src/cli.ts`) |
| 27 | `@typescript-eslint/restrict-template-expressions` | `src/cli.ts:449` — ``say(`  write  ${LOCK_REL} (${Object.keys(recorded).length} files, ${HASH_ALGO})`)`` → *Invalid type "number"* |
| 11 | `@typescript-eslint/no-unnecessary-condition` | `status-block.ts:47` — `return { code: r.status, out: (r.stdout ?? "").trim() };` → *expected left-hand side of `??` to be possibly null or undefined* |
| 5 | `no-useless-assignment` (core) | `src/cli.ts:195` — `let parsed: unknown = null;` followed by `try { parsed = JSON.parse(…) } catch { continue; }` |
| 5 | `@typescript-eslint/prefer-nullish-coalescing` | `lib.ts:43` — `return process.env.CLAUDE_PROJECT_DIR \|\| process.cwd();` |
| 4 | `@typescript-eslint/consistent-type-definitions` | `src/cli.ts:72` — `type PayloadFile = {` → *Use an `interface` instead of a `type`* |
| 2 | `@typescript-eslint/no-dynamic-delete` | `src/cli.ts:538` — `delete recorded[rel];` |
| 2 | `@typescript-eslint/prefer-optional-chain` | `docs-only.ts:116` — `(dir) => target.startsWith(dir) \|\| (withinPayload !== null && withinPayload.startsWith(dir))` |
| 2 | `@typescript-eslint/prefer-string-starts-ends-with` | `docs-only.ts:149` — `if (line === "" \|\| (line[0] !== "+" && line[0] !== "-")) continue;` |
| 1 | `@typescript-eslint/no-deprecated` | `eslint.config.ts:4` — `` `config` is deprecated. ESLint core now provides this functionality via `defineConfig()` `` |
| 1 | `@typescript-eslint/prefer-includes` | `src/cli.ts:155` — `return OWNED.indexOf(src) >= 0 ? "owned" : "managed";` |
| 1 | `@typescript-eslint/no-unsafe-argument` | `src/cli.ts:301` — `if (Array.isArray(args)) fields.push(...args);` → *Unsafe spread of an `any[]` array type* |
| 1 | `@typescript-eslint/no-empty-function` | `src/cli.ts:721` — `process.stdout.on("error", () => {});` |
| 1 | `@typescript-eslint/array-type` | `docs-only.ts:52` — `const COMMENT: ReadonlyArray<readonly [string, ReadonlySet<string>]> = [` |
| 1 | `@typescript-eslint/no-base-to-string` | `pr-watch.ts:114` — `return String(id);` where `const id = record.id` is `unknown` |

## Observations

**The strict/stylistic delta is 94 findings, and 64 of them are one option flip each.**
`--print-config` under (c) shows `@typescript-eslint/restrict-template-expressions` configured as
`[2, {allowAny:false, allowBoolean:false, allowNever:false, allowNullish:false, allowNumber:false, allowRegExp:false}]`.
`strictTypeChecked` is what sets `allowNumber: false`; under (b) the same rule is on with the
default `allowNumber: true` and fires **zero** times. 25 of the 27 are literally `${someNumber}`.
Similarly `@typescript-eslint/dot-notation` is `[2, {allowIndexSignaturePropertyAccess:false, …}]`;
all 37 hits are `parsed["packages"]`-style reads off `Record<string, unknown>` in `src/cli.ts`.
Two option overrides would take (c) from 101 to ~37.

**`no-unnecessary-condition` is wrong here, and it is wrong in a way that would cost the repo
correctness if obeyed.** 8 of the 11 are on `(r.stdout ?? "")` / `(r.stderr ?? "")` after
`spawnSync` (`docs-only.ts:81,83`, `pr-watch.ts:86,88`, `rule-zero-selftest.ts:152,184,186`,
`status-block.ts:47`). `@types/node` types `SpawnSyncReturns<string>.stdout` as non-nullable, so
the rule declares the `??` dead — but Node returns `stdout: null` when the spawn itself fails
(ENOENT, EAGAIN). The hooks fail open on that path. Adopting `strictTypeChecked` without disabling
or `eslint-disable`-ing this rule invites a "cleanup" that deletes real defences. The remaining 3
(`src/cli.ts:683,695`) are `Unnecessary conditional, the types have no overlap` and are worth a
human read.

**`no-useless-assignment` is right and it fires under every config, including the cheapest.**
All 5 are the same shape — `let x: T = <dead initialiser>;` immediately followed by a `try` that
assigns on the success path and `continue`/`throw`s on the catch path. E.g. `src/cli.ts:195-200`
and `rule-zero.ts:198-200` (`let fresh: string[] = [];` where both branches of the following
if/else assign `fresh`). These are 5 one-line deletions (`let parsed: unknown;`), and they are the
only thing config (a) has to say.

**Two genuine typed findings, both about `unknown` narrowing, both only visible with type info.**
`src/cli.ts:301` — `const args = entry["args"]` is `unknown`; `Array.isArray(args)` narrows it to
`any[]`, so `fields.push(...args)` silently pushes `any` into a `unknown[]`. `pr-watch.ts:114` —
`requireId` takes `Record<string, unknown>` and returns `String(id)`, which yields
`"[object Object]"` for an object id. Neither is caught by `tsc --noEmit` (exit 0). These two are
the entire type-aware value proposition over config (a) at this size.

**`tseslint.config()` is already deprecated in 8.68.0.** Config (c) flags it on the config file
itself: `` `config` is deprecated. ESLint core now provides this functionality via `defineConfig()`,
which we now recommend instead ``. Any config written now should use `defineConfig` from
`eslint/config`.

**I got a convenient-looking wrong result and had to unwind it.** My first `no-restricted-imports`
regex was written as `"^(?!node:|\\.{1,2}/)"` inside a heredoc; the harness ate one backslash, the
file on disk held `"^(?!node:|\.{1,2}/)"`, TypeScript resolved `\.` to a bare `.`, and the regex
became `^(?!node:|.{1,2}/)` — which exempts *anything* whose 2nd or 3rd character is `/`. That made
`fs/promises` silently allowed, and I nearly reported "the rule doesn't cover `export … from`" as a
fact. It does. The backslash-free form `^(?![.]|node:)` is what I measured and what I recommend
writing, precisely because it survives quoting.

**The `group:` form of `no-restricted-imports` is a trap; use `regex:`.** Both
`group: ["*", "!node:*", "!./*", "!../*"]` and `group: ["**", "!node:**", "!./**", "!../**"]` give
**8 false positives on the nine files** — the gitignore-style matcher (`ignore` package) does not
let `!node:**` exempt `node:timers/promises` nor `!./**` exempt `./lib.ts`. Exact false positives:
`./lib.ts` in `docs-only.ts:39`, `path-fence.ts:24`, `pr-watch.ts:42`, `reload-plan.ts:22`,
`rule-zero-selftest.ts:17`, `rule-zero.ts:32`, `status-block.ts:29`, and `node:timers/promises`
in `pr-watch.ts:39`. The `regex:` form gives 0.

**On `erasableSyntaxOnly`: ESLint would duplicate a gate tsc already holds, minus one case.**
tsc raises 4 errors on the probe file; typescript-eslint's `strictTypeChecked` raises 1
(`no-namespace`) — enums and parameter properties pass ESLint entirely. A `no-restricted-syntax`
triple reproduces tsc exactly at the same 4 lines, but only after refining the namespace selector
to `TSModuleDeclaration:not([declare=true])`, because the naive selector rejects ambient
`declare module` / `declare namespace`, which `erasableSyntaxOnly` allows. Given `pnpm typecheck`
already runs `tsc --noEmit` with `erasableSyntaxOnly: true` over exactly these files, and Node
itself refuses to run them (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`), there are three gates on this
convention already; a fourth in ESLint buys nothing but a maintenance surface.

**`eslint-plugin-n` genuinely adds two things the `no-restricted-imports` regex does not.**
(1) `n/prefer-node-protocol` is **auto-fixable** — `eslint --fix` rewrites `"fs"` → `"node:fs"`,
where `no-restricted-imports` can only complain. (2) `n/no-extraneous-import` is *publish-aware*:
`import ts from "typescript"` is an error inside `template/**` (which is in `package.json` `files`)
and silent inside `src/**` (which is not) — which is a sharper statement of "the payload installs
nothing" than a blanket import ban, since `src/` is bundled to `dist/cli.js` anyway. Neither adds
dynamic-import coverage. Both report 0 on the nine files.

**Ignores are not optional for this repo specifically.** With no `ignores` block, `eslint .` linted
13 files including `dist/cli.js` (15 errors — it is emitted JS, `no-undef` fires because no
`globals` are configured) and `.claude/worktrees/wt1/src/cli.ts`. `.claude/worktrees/` is where
every implementer sub-agent works per `.claude/rules/process.md`, so without an ignore, CI (and any
local run) would lint N copies of the tree and report each finding N+1 times. Required minimum:
`ignores: ["dist/", ".claude/worktrees/"]`.

**Cost of the flag.** `eslint.config.ts` requires `--flag unstable_native_nodejs_ts_config` on
every invocation (or `ESLINT_FLAGS=unstable_native_nodejs_ts_config` in the environment), and the
flag name says `unstable` — ESLint will print nothing, but the contract can change. The
`eslint.config.mjs` route needs no flag, no jiti, and produced byte-identical results
(10 files / 5 errors) in the measured run; the only thing lost is type-checking the config itself.
Installing `jiti` would violate nothing (it is a devDependency) but adds a runtime loader for
config, which is the opposite of this repo's "zero deps, `node:` only" posture.

**Timings are dominated by process start, not by type-checking.** Best-of-3 wall clock: (a) 2766 ms,
(b) 4500 ms, (c) 4598 ms. Type-aware linting costs ~1.7 s over untyped on 2469 lines. `strictTypeChecked`
costs essentially nothing over `recommendedTypeChecked` in time — only in findings.

## Not done / could not measure

- **Nothing was installed in, or written to, the repo.** Every install, config file and scratch
  file lived under the scratchpad probe. The repo working tree is unchanged (`git status --porcelain`
  still shows only the pre-existing `M package.json`, `M pnpm-lock.yaml`).
- I did **not** run ESLint from inside the actual repo checkout, so I have not proven that
  `.claude/`, `.claude/worktrees/`, `docs/`, `mem/` and `dist/` behave in situ exactly as in the
  simulated probe tree. The probe reproduced `dist/cli.js`, `.claude/hooks/lib.ts` and a
  `.claude/worktrees/wt1/src/cli.ts` from real repo bytes; the rest of the repo's directory shape
  was not reproduced.
- I did **not** measure `eslint --fix` on the nine files — no autofix was applied or counted, so I
  cannot say how many of the 101 (c) findings are mechanically fixable. (`n/prefer-node-protocol`
  reported "1 error … potentially fixable with the `--fix` option" on a scratch file; that is the
  only fixability datum I have.)
- I did **not** measure `jiti` as an installed dependency — the flag route and the `.mjs` route both
  worked, so I never installed it, and I cannot report its version, size or transitive deps.
- I did **not** measure ESLint 9.x, typescript-eslint 7.x, or any older pairing; only the
  latest-at-install versions above.
- I did **not** measure any config combination beyond (a), (b), (c) and the targeted single-rule
  probes — in particular I did not measure `stylisticTypeChecked` alone, nor
  `recommendedTypeChecked` + selected strict rules, nor the effect of the two option overrides
  (`allowNumber: true`, `allowIndexSignaturePropertyAccess: true`) that I predict would drop (c)
  from 101 to ~37. That prediction is arithmetic on the per-rule counts, **not** a measurement.
- I did **not** measure CI behaviour: no run of `.github/workflows/ci.yml`, no timing of eslint
  inside GitHub Actions, no check of whether the workflow's Node version matches 24.4.1.
- `eslint-plugin-n`'s `n/no-unpublished-import` never fired in any of my probes — the finding on
  the published path came from `n/no-extraneous-import`. I did not construct a case that isolates
  `no-unpublished-import`, so I cannot say what it would add on its own.
- I did **not** verify the `@typescript-eslint/*` sub-package versions from their own installed
  `package.json` files — pnpm's isolated layout means they are not at `node_modules/@typescript-eslint/*`.
  I read the pinned versions from `typescript-eslint`'s own `dependencies` and cross-checked the
  directory names under `node_modules/.pnpm`, which agree at `8.68.0`.

## Live reads taken

- **Registry read (GET-equivalent, npm registry metadata):** `npm view typescript-eslint version`
  → `8.68.0`.
- **Registry read (GET-equivalent):** `npm view typescript-eslint peerDependencies --json` →
  `{"eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0"}`. Confirmed
  independently from the installed `node_modules/typescript-eslint/package.json`, which matches.
- **Registry read (GET-equivalent):** `npm view eslint version` → `10.9.1`.
- **Package downloads (GET-equivalent, npm registry tarballs):** `pnpm add -D typescript@6.0.3
  @types/node eslint @eslint/js typescript-eslint` and `pnpm add -D eslint-plugin-n`, both into the
  scratchpad probe only. Responses: `+ @eslint/js 10.0.1, + @types/node 24.13.3, + eslint 10.9.1,
  + typescript 6.0.3, + typescript-eslint 8.68.0` (Done in 10.8s), then `+ eslint-plugin-n 18.3.0`
  (Done in 2.7s). No peer-dependency warnings in either.
- No hook fired on any command. No non-GET call to any live service was made.
