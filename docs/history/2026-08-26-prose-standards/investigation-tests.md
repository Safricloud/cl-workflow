# Investigation — tests (2026-08-26-prose-standards)

**Brief:** The owner wants the process to say "implementations always pair with tests for their
logic; visual browser-based tests use Playwright." What does the kit repo itself do for tests
today, what does the shipped process prose promise target projects about tests, and what would
the two obvious mechanisms (`node:test` for logic in this zero-dependency repo; `@playwright/test`
for a target project's browser tests) cost?

**Scope:** `package.json`, `.github/workflows/ci.yml`, `template/.claude/hooks/rule-zero-selftest.ts`,
`src/cli.ts`, `template/CLAUDE.md`, `CLAUDE.md`, `README.md`,
`template/.claude/skills/contribute/templates/{phase,plan,pr-body}.md`,
`template/docs/guides/agent-workflow.md` (§2, §5, §6), `node_modules` (read-only).

**Checkout:** `8a8aada5239a5071d3ccee761f14b98d9bc94843` (branch `feat/2026-08-26-prose-standards`,
tree clean before and after this investigation).

## Answer

The kit has **one test and it is not a unit test**: `rule-zero-selftest.ts`, 62 subprocess cases
that spawn `rule-zero.ts` end-to-end plus a negative control (measured: `62/62`, exit 0). It
covers exactly one of the seven hooks. `src/cli.ts` — 749 lines, 29 top-level functions, zero
exports — has **no test at all**; CI exercises it only as a black box (`init` then `doctor` into a
temp dir, and one no-op `update .` for the drift gate), which never touches the `.new` path or
`mergeSettings`' merge branches. The proposed prose "pair implementations with tests for their
logic" is **already violated by the kit's own shipped code**: measured by importing each file,
every hook except `lib.ts` and `src/cli.ts` itself runs its `main()` at module top level, so
nothing but `lib.ts`'s 25 exported functions is importable to test — importing `src/cli.ts`
printed the usage banner and set `process.exitCode = 2`.

Mechanically, `node:test` costs nothing here: Node v24.4.1 runs `node --test x.test.ts` with
type-stripping, imports a sibling `./sum.ts`, discovers `**/*.test.ts` with no args, and exits 1
on failure — all measured. `tsconfig.json`'s `include` (`src`, `template/.claude/hooks`,
`.claude/hooks`) picks up a `*.test.ts` dropped in any of those three directories automatically;
a root `test/` directory would need adding. `@playwright/test@1.62.1` is a different matter: it
would break this repo's own `no-restricted-imports` regex (measured — `@playwright/test` matches
the restricted pattern, `node:test` does not), so it can only be a **target-project** instruction,
never something the kit repo uses. And `npx playwright install` — which downloads browser binaries
to a per-user cache outside the repo — is judged **silent** by the shipped `rule-zero.conf`
(measured: no deny, exit 0, for orchestrator *and* sub-agent). The conf contains no `npx`,
`install` or `playwright` line at all. If the owner considers a browser download an "edit outside
the repo", the gate does not currently agree.

The word **Playwright appears nowhere in the repo** (measured, grep exit 1 with a positive
control), and neither does `node:test`.

## Facts

### 1a — the kit's own test surface

| Fact | Value | Where measured |
| --- | --- | --- |
| The only test script | `"selftest": "node template/.claude/hooks/rule-zero-selftest.ts"` — the sole entry in `scripts` that runs anything test-shaped | `package.json:36` |
| `pnpm selftest` result | `62/62 cases passed; 39 lines logged to rule-zero.log`, `EXIT=0` | `pnpm selftest; echo "EXIT=$?"` at repo root |
| Selftest purpose (its own header) | "proves the rule-zero gate fires, and only when it should… A hook that is misconfigured fails open… so this is the only thing standing between 'the gate exists' and 'the gate works'." | `template/.claude/hooks/rule-zero-selftest.ts:3-7` |
| Case count | 62 case tuples | `grep -c '^  \["' template/.claude/hooks/rule-zero-selftest.ts` → `62` |
| Cases by tool | Bash 53, Edit 6, Write 2, `mcp__*` 1 (= 62) | `grep -c '^  \["[^]]*", "Bash"'` etc. on the same file |
| Cases by expectation | 32 expect `deny`, 30 expect `silent` | `grep -c ', DENY\],$'` → 32; `grep -c ', SILENT\],$'` → 30 |
| Bundle cases | 6 additionally spawn `rule-zero.ts --bundle merge-cleanup <pr> <branch>` | `grep -c 'BUNDLE 12 feat/x'` → 6; spawn at `rule-zero-selftest.ts:189-192` |
| Negative control | after the 62, one extra ungranted force-push must come back `deny`, else `NEGATIVE CONTROL FAILED` and exit 1 | `rule-zero-selftest.ts:288-297` |
| Test style | subprocess/black-box: `spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload) })` — nothing is imported and called | `rule-zero-selftest.ts:220-225` |
| Files it *does* import | only `asRecord, asString, errText, readLines` from `./lib.ts`, used as harness helpers, not as subjects | `rule-zero-selftest.ts:17` |

**The seven hooks + `lib.ts`, tested or not.** (`template/.claude/hooks/` holds 8 `.ts` files;
`lib.ts` is the shared library and `rule-zero-selftest.ts` is the test itself.)

| File | Lines | Top-level fns | Exercised by a test? | Evidence |
| --- | --- | --- | --- | --- |
| `rule-zero.ts` | 252 | 2 (`judge`, `grantsCli`) | **YES** — end-to-end, 62 cases + `--bundle` | `HOOK = path.join(HERE, "rule-zero.ts")`, `rule-zero-selftest.ts:19` |
| `lib.ts` | 345 | 25, **all exported** | **indirectly only** — reached through `rule-zero.ts`; no direct call of `compilePattern`, `pyRealpath`, `isWithin`, `splitBashSegments`, `pyEscape`, `expandUser`, … | `grep '^export ' lib.ts` → 29 lines; no test file imports it as a subject |
| `docs-only.ts` | 304 | 9 | **NO** | no file in the repo references it as a test subject |
| `path-fence.ts` | 79 | 2 | **NO** | as above |
| `pr-watch.ts` | 298 | 9 | **NO** | as above |
| `reload-plan.ts` | 131 | 4 | **NO** | as above |
| `status-block.ts` | 118 | 2 | **NO** | as above |
| `rule-zero-selftest.ts` | 305 | 4 | (is the test) | — |

Line counts: `wc -l template/.claude/hooks/*.ts src/cli.ts`. Function counts:
`grep -cE '^(export )?(async )?function ' <file>`.

`docs-only.ts` is the one that most wants a test it does not have: it is the mechanism that lets
the orchestrator **self-merge without the owner** (`.claude/rules/process.md`, "one standing
exception"), and it has 9 untested functions including `commentOnly` and `isDocPath`.

### 1b — is `src/cli.ts` covered

| Fact | Value | Where measured |
| --- | --- | --- |
| Any file importing the CLI | none | `grep -rn "cli\.ts\|cli\.js\|from ['\"].*cli" --include=*.ts --include=*.mjs --include=*.js . --exclude-dir={node_modules,dist,.git}` → only two matches, both **comments inside `src/cli.ts` itself** (`src/cli.ts:3`, `src/cli.ts:6`) |
| Any `*.test.*` file in the repo | none | `find . -path ./node_modules -prune -o -path ./.git -prune -o -name "*test*" -print` → `./.claude/hooks/rule-zero-selftest.ts`, `./.claude/hooks/__pycache__/rule-zero-selftest.cpython-313.pyc`, `./template/.claude/hooks/rule-zero-selftest.ts` and nothing else |
| Any use of `node:test` | none | `grep -rn "node:test" . --exclude-dir=node_modules --exclude-dir=.git` → grep exit 1 (positive control with the same flags on `selftest` returned 5+ files) |
| `node --test` at repo root today | `ℹ tests 0 … ℹ fail 0`, `EXIT=0` | `node --test` run at repo root |

**What CI actually runs against the CLI**, quoted from `.github/workflows/ci.yml`:

```yaml
      # The root .claude/ copy is generated by the CLI from template/. Re-running
      # update must change nothing -- neither a tracked file (template ahead) nor an
      # untracked *.new (a hand edit to the generated copy).
      - name: Generated .claude/ drift gate
        shell: bash
        run: |
          node dist/cli.js update .
          status="$(git status --porcelain --untracked-files=all -- .claude/)"
          if [ -n "$status" ]; then printf '%s\n' "$status"; exit 1; fi

      - name: Self-test (must print 62/62)
        run: pnpm selftest

      - name: CLI smoke (init + doctor)
        shell: bash
        run: |
          SMOKE="$RUNNER_TEMP/cl-workflow-smoke"
          rm -rf "$SMOKE"
          mkdir -p "$SMOKE"
          node dist/cli.js init "$SMOKE"
          node dist/cli.js doctor "$SMOKE"
```
(`.github/workflows/ci.yml:35-58`)

What those steps do **not** check, measured against the code:

| Uncovered CLI path | Where it lives | Why the smoke misses it |
| --- | --- | --- |
| `init` writing a `.new` beside a differing file | `src/cli.ts:441-442`, summary `:453-454` | `init` runs into an empty temp dir, so `beside` is always 0 |
| `update` writing a `.new` for a locally edited file | `src/cli.ts:529-530`, summary `:561-564` | the drift gate runs `update .` on a repo whose `.claude/` is already byte-identical, and **fails** if a `.new` ever appears — so the `.new` branch is asserted *never to run*, never asserted to work |
| `mergeSettings` merge branches: existing `hooks` group found by matcher, retiring an old kit entry, preserving a non-kit entry | `src/cli.ts:330-385`, in particular `:356` (`findIndex` on `matcher`), `:366-373` (`isKitHookEntry` → retire), `:375` | `init` calls it with `currentText === null` (the fresh-install branch, `:332`); the drift-gate `update` calls it with a `settings.json` the kit itself wrote, so no third-party entry is ever present |
| `update` on a *stale* installation (lock version behind, hook renamed/removed) | `cmdUpdate`, `src/cli.ts:460-570`; `loadLock`/`writeLock` `:244-299` | nothing in CI installs an old version first |
| `doctor`'s failure branches (17 `fail(...)` call sites) | `src/cli.ts:595-711` | the smoke runs `doctor` on a just-`init`ed tree, so only the `pass` branches execute; a non-zero `doctor` would fail the job, which means the fail branches are asserted absent, not asserted correct |

`doctor` does re-run the gate: it spawns the selftest and parses `<n>/<m>`
(`src/cli.ts:695-711`), so CI runs `62/62` twice — once via `pnpm selftest`, once inside the smoke.

### 1c — top-level function count vs direct test coverage

| File | Top-level functions | With a **direct** (import-and-call) test |
| --- | --- | --- |
| `src/cli.ts` | 29 | 0 |
| `docs-only.ts` | 9 | 0 |
| `lib.ts` | 25 | 0 (all 25 exported, none called by a test) |
| `path-fence.ts` | 2 | 0 |
| `pr-watch.ts` | 9 | 0 |
| `reload-plan.ts` | 4 | 0 |
| `rule-zero-selftest.ts` | 4 | n/a |
| `rule-zero.ts` | 2 | 0 — `judge()` is exercised **as a subprocess**, never imported |
| `status-block.ts` | 2 | 0 |
| **Total** | **86** | **0 direct; 1 function (`judge`) covered end-to-end** |

Measured: `grep -nE '^(export )?(async )?function ' <file>` per file. The brief's expectation
("only rule-zero's judgement via the selftest") is confirmed — with the refinement that even that
one is covered through a spawned process, not a call.

### 2 — is any of it testable as it stands

| Fact | Value | Where measured |
| --- | --- | --- |
| `src/cli.ts` exports | **zero** | `grep -c '^export ' src/cli.ts` → 0 |
| Every hook's exports | `lib.ts` 29 lines of `export`; `docs-only.ts`, `path-fence.ts`, `pr-watch.ts`, `reload-plan.ts`, `rule-zero.ts`, `rule-zero-selftest.ts`, `status-block.ts` — **all zero** | `grep -c '^export ' template/.claude/hooks/*.ts` |

`src/cli.ts`, last 3 lines of the file (`src/cli.ts:747-749`):

```ts
  say(USAGE);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
```

No `import.meta.main` guard, no `if (process.argv[1] === …)`. **Measured**: a scratchpad script
that did `await import("file:///…/src/cli.ts")` printed

```
BEFORE IMPORT
cl-workflow — the contribution kit's installer
  cl-workflow init   [dir]   copy the payload in (default "."); never clobbers
  …
AFTER IMPORT, exitCode = 2
```

i.e. importing the CLI **runs** the CLI.

**Top-level side effects per hook, measured** by importing each one with a scratchpad ESM script
(`node importhooks.mjs <hook> </dev/null`):

| Hook | Import behaviour | Top-level statement |
| --- | --- | --- |
| `lib.ts` | clean — nothing ran, `exitCode = undefined` | (declarations only) |
| `rule-zero.ts` | **ran** — printed the grants usage, `exitCode = 2` | `const args = process.argv.slice(2); if (args.length > 0) { … grantsCli(args) } else { … judge() … }`, `rule-zero.ts:234-252` |
| `status-block.ts` | **ran** `mayStop()` (silent, allowed) — brief's guess confirmed | `let allowed: boolean; try { allowed = mayStop(); }`, `status-block.ts:109-111` |
| `path-fence.ts` | **ran** `fence(process.argv.slice(2))`, set `exitCode = 0` | `status-block`-shaped, `path-fence.ts:70-79` |
| `reload-plan.ts` | **ran** `report()` and wrote to stdout | `let lines: string[]; try { lines = report(); }` … `process.stdout.write(...)`, `reload-plan.ts:122-131` |
| `docs-only.ts` | **ran** `main()`, printed a usage error, `exitCode = 2` | `try { process.exitCode = main(process.argv.slice(2)); }`, `docs-only.ts:299-304` |
| `pr-watch.ts` | (not imported — top-level `await`; same shape) | `try { process.exitCode = await main(process.argv.slice(2)); }`, `pr-watch.ts:291-298` |

**Conclusion for the review:** "pure testable functions" is not the kit's current shape. Only
`lib.ts` is importable without side effects. Adding logic tests to the kit means either (a)
testing everything as a subprocess the way the selftest already does, or (b) refactoring seven
files to add an `import.meta.main` guard so their internals can be imported. Both are real work,
and the second changes shipped hooks.

### 3 — `node:test` on the installed Node

| Fact | Value | Where measured |
| --- | --- | --- |
| Node | `v24.4.1` | `node --version` |
| npm / pnpm | `11.12.0` / `10.27.0` | `npm --version`, `pnpm --version` |
| `node --test <file.test.ts>` importing a sibling `.ts` | works with **no flag** — type stripping is on by default; no `ExperimentalWarning` printed | scratchpad `.../scratchpad/nodetest/`: `x.test.ts` imports `./sum.ts`; `node --test x.test.ts` |
| Output format | TAP-ish reporter: `✔ sum adds (1.0632ms)` / `✖ deliberate failure (0.7369ms)`, then `ℹ tests 2 / ℹ pass 1 / ℹ fail 1 / ℹ duration_ms 103.622`, then a `✖ failing tests:` block with the full `AssertionError` and stack | same run |
| Exit code on failure | **1** | `node --test x.test.ts; echo "EXIT=$?"` → `EXIT=1` |
| Exit code on pass | **0** | after removing the failing case, `EXIT=0` |
| Default discovery of `**/*.test.ts` | **yes** — `node --test` with no args in a dir holding `pass.test.ts` and `sum.ts` ran the one test and did not treat `sum.ts` as a test | `cd <scratchpad>/nodetest && node --test` → `ℹ tests 1 / ℹ pass 1`, `EXIT=0` |
| Discovery at this repo's root today | `ℹ tests 0 … EXIT=0` — `rule-zero-selftest.ts` is **not** matched by the default patterns (`selftest` has no hyphen before `test`) | `node --test` at repo root |
| Runtime cost | zero new packages; `node:test` and `node:assert/strict` are builtins, so the `no-restricted-imports` regex `^(?![.]\|node:)` does not fire | see §6 |

### 4 — what the shipped prose promises target projects about tests

| # | Quote | file:line |
| --- | --- | --- |
| 1 | `- E2E: \`<cmd>\` (\`<which suites cover which surfaces>\`)` | `template/CLAUDE.md:9` |
| 2 | `- Full check (lint + typecheck + unit): \`<cmd>\`` | `template/CLAUDE.md:7` |
| 3 | `**Acceptance:** <checks that must be green; the tests that must exist; what must FAIL if the change is reverted>` | `template/.claude/skills/contribute/templates/phase.md:11-12` |
| 4 | `<What was run, counts, checkers verified, screenshots appraised, findings → phase <n>.5 items.>` | `phase.md:25` |
| 5 | `<Full check, build, E2E for the touched surfaces, screenshots at which viewports, container run if touched, checker-verified for each new test.>` | `plan.md:34-35` |
| 6 | `- <full check with counts>; <E2E suites and results>; <new tests seen to fail against a pre-change build>; <screenshots appraised at which viewports>; <container run if touched>` | `pr-body.md:13-14` |
| 7 | §2, investigation method: `- For UI: the real rendered app at each relevant viewport, screenshots, appraised by the orchestrator itself. Code-reading cannot validate layout.` | `template/docs/guides/agent-workflow.md:150-151` |
| 8 | §5, plan items: `**Acceptance including tests** (what must FAIL if the change is reverted). An item without a test in its acceptance is not done when the agent says it is.` | `template/docs/guides/agent-workflow.md:230-232` |
| 9 | §6, verify: `**Verify the checker**: a new test is evidence only once seen to fail — revert the fix, watch it go red, restore. **Distrust convenient results**: zero tests run, an empty grep, an unchanged lockfile. UI at each viewport, screenshots before and after, appraised by you.` | `template/docs/guides/agent-workflow.md:276-279` |

Adjacent (not in the brief's path list, but the same promise, and it would need to move in step):

| # | Quote | file:line |
| --- | --- | --- |
| 10 | `**Acceptance including tests** (what must FAIL if reverted).` | `template/.claude/skills/contribute/SKILL.md:102` |
| 11 | `viewport, screenshots appraised by you; run the container if touched` | `template/.claude/skills/contribute/SKILL.md:132` |
| 12 | `- **Verify the checker**: make your new test fail on purpose (revert the change or break the assertion), see it fail, restore it, see it pass. Record both results.` | `template/.claude/agents/implementer.md:52-53` |
| 13 | `- **Checker verified:** reverted <X>, tests failed (\`<actual vs expected>\`); restored, green` | `template/.claude/agents/implementer.md:81` |

**What the prose does and does not say.** The strongest existing promise is #8 — *"An item without
a test in its acceptance is not done when the agent says it is."* That is already close to
"implementations always pair with tests for their logic"; what is missing is the word *always*
and the words *for their logic*. On the visual side the prose is entirely tool-agnostic: it says
"the real rendered app at each relevant viewport, screenshots, appraised by the orchestrator" (#7,
#9) and names no tool, no runner and no mechanism for producing those screenshots. The gap the
owner wants filled is real.

| Fact | Value | Where measured |
| --- | --- | --- |
| Occurrences of "Playwright" (any case) in the repo | **zero** | `grep -rni "playwright" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git` → grep exit 1. Positive control, same flags, pattern `selftest` → 5+ files including `./.github/workflows/ci.yml`. cwd verified as `/c/Users/Keaton Forrest/Documents/GitHub/cl-workflow` via `pwd`. |

### 5 — Playwright's cost (live reads)

Registry metadata, all **live reads** (GET-equivalent), taken 2026-08-26:

| Command | Response, verbatim |
| --- | --- |
| `npm view @playwright/test version dist-tags.latest engines` | `version = '1.62.1'` / `dist-tags.latest = '1.62.1'` / `engines = { node: '>=20' }` |
| `npm view playwright version` | `1.62.1` |
| `npm view @playwright/test dependencies` | `{ playwright: '1.62.1' }` |
| `npm view playwright dependencies` | `{ 'playwright-core': '1.62.1' }` |
| `npm view playwright-core version` | `1.62.1` |
| `npm view playwright optionalDependencies scripts` | `{ fsevents: '2.3.2' }` — the `scripts` field printed **nothing** |
| `npm view playwright scripts` (alone) | *(empty output, exit 0)*. Positive control with the same command shape: `npm view playwright bin` → `{ playwright: 'cli.js' }` |
| `npm view playwright engines` | `{ node: '>=20' }` |
| `npm view playwright-core dependencies scripts bin` | `{ 'playwright-core': 'cli.js' }` (only the `bin` field printed) |
| `npm view @playwright/test dist.unpackedSize dist.tarball` | `dist.unpackedSize = 28544` / `dist.tarball = 'https://registry.npmjs.org/@playwright/test/-/test-1.62.1.tgz'` |
| `npm view playwright dist.unpackedSize` | `5074152` |
| `npm view playwright-core dist.unpackedSize` | `13442086` |
| `pnpm view @playwright/test version` | `1.62.1` |

| Fact | Value | Where measured |
| --- | --- | --- |
| Dependency chain | `@playwright/test` → `playwright` → `playwright-core`; plus optional `fsevents` on macOS. Three packages, no transitive third-party tree. | the four `npm view … dependencies` reads above |
| npm-side install size | 28 544 + 5 074 152 + 13 442 086 = **≈ 18.5 MB unpacked**, browsers excluded | the three `dist.unpackedSize` reads |
| Node floor | `>=20` — compatible with this kit's `"engines": { "node": ">=24" }` (`package.json:24-26`) | `npm view … engines` |
| Postinstall | none in the published manifest — browsers are **not** downloaded by `pnpm add`; a separate explicit `npx playwright install` is required | `npm view playwright scripts` empty with a working positive control |
| Installed in this repo? | **no** | `ls node_modules/@playwright` → `No such file or directory`; `ls node_modules/playwright*` → same. `ls node_modules` → `@eslint @types eslint eslint-plugin-n typescript typescript-eslint` (6 entries) |

**From my knowledge, not measured** (I did not install anything): `npx playwright install`
downloads browser builds — Chromium, Firefox and WebKit, plus an FFMPEG build — totalling several
hundred MB, into a **per-user cache outside the project**: `%LOCALAPPDATA%\ms-playwright` on
Windows, `~/.cache/ms-playwright` on Linux, `~/Library/Caches/ms-playwright` on macOS (overridable
via `PLAYWRIGHT_BROWSERS_PATH`). `npx playwright install --with-deps` additionally runs a
**privileged system package install** (`apt-get install` under `sudo`) on Linux. Under rule zero
as written in `.claude/rules/process.md` — *"No action that discards work or changes state outside
the repo without the owner's explicit 'yes': … edits outside the repo"* — a several-hundred-MB
write to a per-user cache is at minimum a question for the owner, and `--with-deps` is
unambiguously state outside the repo.

**What the gate actually says today.**

| Fact | Value | Where measured |
| --- | --- | --- |
| `npx`, `install` or `playwright` in the shipped conf | **none of the three appears** | `grep -n -i "npx\|install\|playwright" template/.claude/rule-zero.conf` → grep exit 1; the whole 59-line file was read to confirm |
| Verdict on `npx playwright install`, orchestrator | **silent** — no stdout, exit 0, nothing logged | the real hook, run against a temp project holding a copy of the shipped conf and an empty grants file: `printf '%s' '<PreToolUse payload>' \| CLAUDE_PROJECT_DIR=<tmp> node template/.claude/hooks/rule-zero.ts` |
| Verdict on `npx playwright install --with-deps chromium` | **silent**, exit 0 | same probe |
| Verdict for a **sub-agent** running `npx playwright install` | **silent**, exit 0 | same probe with `agent_id`/`agent_type: implementer` in the payload |
| Verdict on `pnpm add -D @playwright/test` | **silent**, exit 0 | same probe |
| Verdict on `node --test` | **silent**, exit 0 | same probe |
| `rule-zero.log` after all five probes | not created — a silent verdict logs nothing | `cat <tmp>/.claude/rule-zero.log` → `(no log)` |

The only conf line that speaks to "outside the repo" is:

```
guard ^path:outside-repo
```
(`template/.claude/rule-zero.conf:49`)

and per the hook's own header that subject string is built **only for file-editing tools** — *"Matched
against each Bash command segment (split on `&& || ; | newline`), or against `"path:outside-repo
<resolved path>"` for file-editing tools"* (`template/.claude/rule-zero.conf:6-7`). A Bash command
that writes outside the repo is never given that subject. The conf's own guidance is explicit that
this is deliberate:

```
## Project-specific — this is where the real protection for live credentials lives.
## Name the scripts that can write to a third-party system, and the flag that makes them write.
…
# guard npm run (deploy|release|publish)
```
(`template/.claude/rule-zero.conf:51-57` — all five project-specific lines are commented-out examples)

So: if the owner decides a browser download is a rule-zero action, it needs a **new conf line**
(shape: `guard playwright install` or `guard ^npx playwright install`), because nothing in the
shipped conf catches it. If the owner decides it is not, that is also a decision worth recording —
the prose currently implies it would be caught.

### 6 — would tests be typechecked and linted where they'd naturally go

**tsconfig.json** (`tsconfig.json:28-32`):

```json
  "include": [
    "src",
    "template/.claude/hooks",
    ".claude/hooks"
  ]
```

There is **no `exclude`** key. `tsconfig.build.json` narrows to `"include": ["src"]`
(`tsconfig.build.json:11-13`) with `"rootDir": "src"`.

| Fact | Value | Where measured |
| --- | --- | --- |
| Files in the typecheck program today | **17** non-`node_modules` files: `src/cli.ts` + 8 under `template/.claude/hooks/` + 8 under `.claude/hooks/` | `npx tsc --noEmit --listFiles \| grep -vc node_modules` → 17 |
| Would a `src/cli.test.ts` be typechecked? | **yes, automatically** — a bare directory in `include` expands to all supported extensions recursively, and `src` is already listed with no `exclude` | `tsconfig.json:28-32`; the 17-file list above shows every `.ts` under each included directory is in the program |
| Would a `template/.claude/hooks/lib.test.ts` be typechecked? | **yes, automatically** — and it would also be **shipped to target projects** and **copied into the root `.claude/hooks/`** by `update`, since `template/` is a `files` entry (`package.json:16-19`) and the whole hooks dir is the payload |
| Would a root `test/*.test.ts` be typechecked? | **no** — `test` is not in `include`; it would need adding | same |
| Would a `*.test.ts` be caught by `tsc -p tsconfig.build.json`? | **yes if under `src/`** — and it would then be **emitted into `dist/`**, which CI byte-compares (`git diff --exit-code -- dist/`, `ci.yml:38-40`). A test file in `src/` therefore forces a `dist/` change or an `exclude` in `tsconfig.build.json`. | `tsconfig.build.json:11-13`; `ci.yml:38-40` |

**eslint.config.mjs** (`eslint.config.mjs:11-26`):

```js
export default defineConfig([
  // dist/ is the committed build output; the worktrees dir holds implementer checkouts.
  { ignores: ["dist/", ".claude/worktrees/"] },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked],
    plugins: { n },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
```

| Fact | Value | Where measured |
| --- | --- | --- |
| Lint glob | `files: ["**/*.ts"]` — any `.ts` anywhere except `dist/` and `.claude/worktrees/` is linted with the full type-checked ruleset | `eslint.config.mjs:13, 18-19` |
| Type-aware linting requires project membership | `projectService: true` (`eslint.config.mjs:23`) — a `.ts` outside every tsconfig `include` is a **parsing error**, not a skip: `Parsing error: … was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProject` | `printf '%s' "<test src>" \| npx eslint --stdin --stdin-filename test/probe.test.ts` |
| `import { test } from "node:test"` under `no-restricted-imports` | **allowed** — the regex `^(?![.]\|node:)` does not match | `node -e` evaluating `new RegExp("^(?![.]\|node:)")` against each specifier |
| `import … from "@playwright/test"` under the same rule | **RESTRICTED — lint error**, message *"node: builtins and relative .ts imports only — the kit has zero runtime dependencies"* | same regex probe; rule at `eslint.config.mjs:30-41` |
| Same for `"playwright"`, `"typescript"` | both RESTRICTED | same probe |

So: adding `node:test` tests to this repo needs **no config change at all** if the files go beside
`src/` or the hooks — except for the `dist/` interaction noted above. Adding `@playwright/test` to
**this repo** would need the `no-restricted-imports` rule relaxed, which is a deliberate invariant
(`CLAUDE.md`, "Zero runtime dependencies, `node:` builtins only… Enforced: `no-restricted-imports`").
That is a strong argument for keeping Playwright as an instruction the kit *gives target projects*
and never a dependency the kit *takes*.

## Observations

**1. The prose already promises more than the kit delivers, and CI does not notice.** Guide §8:
*"An item without a test in its acceptance is not done when the agent says it is"*
(`agent-workflow.md:231-232`). Measured against the kit's own 86 top-level functions: one is
covered, end-to-end, and 85 are not. Whatever the owner's new sentence says, the honest move is to
say what the kit itself does — either the kit adopts logic tests, or the sentence is scoped to
target projects and the kit says so.

**2. `node --test` exits 0 when it finds nothing.** Measured at repo root: `ℹ tests 0 … EXIT=0`.
If a `pnpm test` script is added, a typo in a path or a rename that stops matching `*.test.ts`
produces a **green CI run with zero tests**. This is precisely the "distrust convenient results —
zero tests run" trap the guide names at `agent-workflow.md:278`, and it would be self-inflicted.
Any test script added here should assert a minimum count (the selftest already does this well: it
prints `62/62` and CI's step is literally named `Self-test (must print 62/62)`).

**3. The selftest is a good model and a bad name.** It is a black-box integration test with a
negative control — arguably a stronger design than unit tests for a fail-open security hook. But
because it is called `rule-zero-selftest.ts`, Node's default `--test` discovery skips it (measured),
so it will not be swept up by a future `node --test` script. Whatever is added has to run it too,
or `pnpm selftest` stays a separate step.

**4. `docs-only.ts` is the untested code with the highest blast radius.** It is the mechanism that
lets the orchestrator merge without the owner (`.claude/rules/process.md`: *"a PR whose diff is
documentation or comments only (`docs-only.ts` says so) is merged by the orchestrator"*). Its own
header states the design intent — *"Anything this script is not sure about is 'not docs-only'"*
(`docs-only.ts:8`) — which is a conservative-failure claim with no test behind it. If the new prose
adds "tests for their logic", `commentOnly` and `isDocPath` are the first two functions that should
get them, and both are pure enough to test today if the file gained an `import.meta.main` guard.

**5. There is an untracked-but-ignored artefact from the Python era.**
`.claude/hooks/__pycache__/rule-zero-selftest.cpython-313.pyc` exists on disk
(`find` output above) while `git status --porcelain` is empty — so it is gitignored. Harmless, but
it means the generated-`.claude/` drift gate's `--untracked-files=all` is relying on `.gitignore`
to stay quiet. Not in scope; flagging it because I tripped over it.

**6. The `--with-deps` variant deserves separate treatment from the plain install.**
`npx playwright install` writes to a user cache; `npx playwright install --with-deps` invokes the
system package manager under `sudo` on Linux. Both are currently silent to the gate (measured).
If the review adds one conf line, the `--with-deps` form is the one that most clearly meets the
"changes state outside the repo" bar.

**7. Playwright's own runner would sit beside `node:test`, not replace it.** `@playwright/test`
brings its own runner, config file (`playwright.config.ts`), reporters and `test.describe` API — a
target project adopting both ends up with two test runners and two commands. The `template/CLAUDE.md`
skeleton already anticipates this shape with two separate lines: `Full check (lint + typecheck +
unit)` at `:7` and `E2E: <cmd> (<which suites cover which surfaces>)` at `:9`. So the prose has a
natural slot for "logic → unit line, browser → E2E line" without restructuring the template.

## Not done / could not measure

- **I did not install anything.** No `pnpm add`, no `npx playwright install`, no browser download.
  All Playwright figures above are registry metadata (measured, labelled live reads) or my own
  knowledge (labelled as such). I have **not** measured the on-disk browser cache size, the
  download time, or the CI wall-clock cost of `npx playwright install` on the
  `ubuntu-latest` × `windows-latest` matrix.
- **I did not write any file into the repo** outside `docs/reviews/2026-08-26-prose-standards/`.
  Consequently I could **not** measure ESLint's behaviour on a real `src/*.test.ts`: the
  `--stdin --stdin-filename src/probe.test.ts` probe returned the same "not found by the project
  service" parsing error as the `test/` probe, but that is an artefact of the file not existing on
  disk, not evidence about `include`. My claim that a real `src/foo.test.ts` **would** be in the
  program rests on `tsconfig.json` having `"include": ["src"]` with no `exclude`, plus the measured
  17-file program showing every `.ts` under each included directory present. Someone should confirm
  by actually creating the file.
- **I did not run `pnpm lint`, `pnpm typecheck` or `pnpm build`** end to end — only
  `npx tsc --noEmit --listFiles` (for the program membership) and `npx eslint --stdin` probes.
  I did not verify the CI workflow by triggering it.
- **I did not import `pr-watch.ts`** in the side-effect probe (it has a top-level `await` and would
  have made `gh api` calls). Its top-level entry statement is quoted from source
  (`pr-watch.ts:291`) and is the same `try { process.exitCode = await main(...) }` shape as
  `docs-only.ts`, which I did measure.
- **I did not read guide sections other than §2, §5 and §6** as the brief scoped, beyond a
  whole-file grep for test vocabulary (which surfaced `:94`, `:99`, `:459`, `:481` — none of which
  add a promise the table above misses).
- **I did not measure `mergeSettings` behaviour** on a settings file containing a third-party hook
  entry; I read the code (`src/cli.ts:330-385`) and reasoned about which branches the CI smoke
  reaches. That reasoning is a reading, not a measurement.
- **I did not check whether GitHub Actions runners ship browsers preinstalled**, which would change
  the CI cost estimate materially.
- `git status --porcelain` was **empty before and after** every command above (verified twice), and
  the only file I created in the repo is this report.

## Live reads taken

Thirteen registry metadata reads against `registry.npmjs.org`, all GET-equivalent, all listed
verbatim with their responses in **§5** above:

- `npm view @playwright/test version dist-tags.latest engines`
- `npm view playwright version`
- `npm view @playwright/test dependencies`
- `npm view playwright dependencies`
- `npm view playwright-core version`
- `npm view playwright optionalDependencies scripts`
- `npm view playwright scripts`
- `npm view playwright bin` (positive control for the empty `scripts` result)
- `npm view playwright engines`
- `npm view playwright-core dependencies scripts bin`
- `npm view @playwright/test dist.unpackedSize dist.tarball`
- `npm view playwright dist.unpackedSize`
- `npm view playwright-core dist.unpackedSize`
- `pnpm view @playwright/test version`

No other network access. No writes to any live system. No hook fired against me during this
investigation.
