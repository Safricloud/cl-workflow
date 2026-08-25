# Review — Every TypeScript file through the compiler, and ESLint beside it (2026-08-25-static-analysis)

**The ask:** All TypeScript in this repo goes through the compiler, and ESLint is installed — proper static analysis tooling — owner, in conversation, 2026-08-25.
**Issue:** none · **Checkout:** `main` @ `f684e35` · **Branch:** `chore/2026-08-25-static-analysis`
**Investigations:** `investigation-coverage.md`, `investigation-eslint.md`, `investigation-callsites.md` (this directory)

## Short answer

Today `tsc` checks 9 of the repo's 17 TypeScript files. The 8 it skips are the generated root
`.claude/hooks/` copy — byte-identical to `template/` right now, but in no compiler program, not
executed by CI, and not covered by any drift gate; that is also why your editor shows an error on
`.claude/hooks/docs-only.ts`. Closing that gap is cheap: one `include` line (+1 s, the build is
unaffected) and a CI step that re-runs the kit's own `update` and fails if anything moved.
ESLint installs cleanly against TypeScript 6.0.3 (ESLint 10.9.1 + typescript-eslint 8.68.0, no
peer warnings) and, with type-aware linting, reports exactly seven things on this code — five
dead initialisers and two real `unknown`-narrowing slips that `tsc` cannot see. The "strict"
preset adds ~94 more, two-thirds of which are one option flip each, and one of its rules would
push the hooks toward deleting real defensive code. We recommend type-aware "recommended" now,
with the repo's own conventions (`node:`-only imports) encoded as rules.

## What we found

**1. The generated copy is in a blind spot on three axes.** `tsconfig.json` includes `src` and
`template/.claude/hooks` only; `pnpm selftest` runs the template copy; the CI drift gate is
scoped to `dist/`; the CI smoke test inits into a temp directory. A PR that broke all eight root
hooks would pass CI today. Standing alone, every hook file (root or template) fails `tsc` with
TS5097 on its `./lib.ts` import — a file is only green when a tsconfig claims it, and only the
template copy is claimed. ([investigation-coverage.md](investigation-coverage.md))

**2. Widening `include` is free.** A probe with all 17 files typechecks clean at exit 0 in
about one extra second. `tsconfig.build.json` declares its own `include: ["src"]`, and `extends`
replaces `include` rather than merging it — measured, and `pnpm build` reproduced `dist/cli.js`
byte for byte. ([investigation-coverage.md](investigation-coverage.md))

**3. The right drift gate is `update` plus an empty status, not a bare diff.** `node dist/cli.js
update .` followed by `git diff --exit-code -- .claude/` fires when `template/` moves ahead — but
it silently passes the other mistake, a hand edit committed into the generated copy: `update`
leaves the edit alone and writes an untracked `*.new` beside it, invisible to `git diff`. The
check that covers both cases is `git status --porcelain --untracked-files=all -- .claude/`
being empty. `doctor` cannot serve as this gate: its drift check compares disk to the lock, not
to `template/`, and it only warns. ([investigation-coverage.md](investigation-coverage.md))

**4. ESLint on this code: seven findings that matter, ninety-four that are taste.** Measured on
the nine files: `recommended` → 5, `recommendedTypeChecked` → 7, `strictTypeChecked` +
`stylisticTypeChecked` → 100. The five `no-useless-assignment` hits are dead `= null` / `= []`
initialisers before a `try`. The two typed findings are real: `Array.isArray` on an `unknown`
narrows to `any[]` and is spread into a typed array (`src/cli.ts`), and `String(id)` on an
`unknown` would print `[object Object]` (`pr-watch.ts`). Of the strict preset's extra 94: 37
are `dot-notation` on `Record<string, unknown>` reads, 27 are `${someNumber}` in template
strings (strict flips `allowNumber` to false), and **11 `no-unnecessary-condition` hits are the
rule being wrong** — the hooks write `(r.stdout ?? "")` after `spawnSync` because Node returns
`null` there when the spawn itself fails, while `@types/node` types it non-nullable. Obeying
that rule deletes a fail-open defence. ([investigation-eslint.md](investigation-eslint.md))

**5. The config file: TypeScript needs an unstable flag; JavaScript needs nothing.** A native
`eslint.config.ts` fails to load on Node 24 unless `--flag unstable_native_nodejs_ts_config` (or
`ESLINT_FLAGS=…`) is passed — ESLint otherwise demands `jiti`. An `eslint.config.mjs` loads with
no flag and no extra dependency and gave identical results. `tseslint.config()` is already
deprecated in 8.68; `defineConfig` from `eslint/config` is the current form.
([investigation-eslint.md](investigation-eslint.md))

**6. The repo's conventions can be rules — some of them.** `no-restricted-imports` with a regex
pattern (`^(?![.]|node:)`) reports 0 on the nine files and catches `"fs"` and `"typescript"` in
`import` and `export … from` form; the glob form is unusable (8 false positives on `./lib.ts`
and `node:timers/promises`). `eslint-plugin-n` adds an auto-fix (`"fs"` → `"node:fs"`) and a
publish-aware check that distinguishes `template/` (shipped) from `src/` (bundled). Neither
sees dynamic `import()`, which the code does not use. `erasableSyntaxOnly` is already gated
three times (tsc, `pnpm typecheck`, Node itself); an ESLint duplicate buys nothing.
([investigation-eslint.md](investigation-eslint.md))

**7. Ignores are mandatory here.** Flat config lints dot-folders by default. Without
`ignores: ["dist/", ".claude/worktrees/"]`, `eslint .` lints the compiled `dist/cli.js` (15
errors) and every implementer worktree — N+1 copies of every finding.
([investigation-eslint.md](investigation-eslint.md))

**8. Stricter compiler flags: five are free, two are not.** Measured on the nine files:
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`,
`noImplicitReturns`, `exactOptionalPropertyTypes` each add **0** errors today; they would only
ever catch new mistakes. `noUncheckedIndexedAccess` adds 25 and `noPropertyAccessFromIndexSignature`
adds 44 — both fight the `Record<string, unknown>` style the CLI and hooks are written in.
(Measured by the orchestrator: `npx tsc --noEmit --<flag>` per flag, repo root, 2026-08-25.)

**9. Every call site is known, and the manifest is already dirty.** Check commands are executed
in two places (`package.json` scripts, `ci.yml`) and described in four (`CLAUDE.md`, two README
blocks, the generic guide/skill prose). Root `CLAUDE.md` already says "Full check (lint +
typecheck + unit)" over a command with no lint in it; the README's ordered CI enumeration is the
one sentence a lint step falsifies; the README also says "five hooks" where seven ship. The
working tree carries an uncommitted, self-consistent devDependency bump (`^24.0.0` → `^24.13.3`,
`^6.0.0` → `^6.0.3`; `pnpm install --frozen-lockfile` passes on it), and `stash@{0}` from the
previous loop holds the same change. A lint PR is code to `docs-only.ts` (exit 3) — the merge
will need your word. ([investigation-callsites.md](investigation-callsites.md))

## What is right, and should not be changed

`tsc` stays the checker and TypeScript stays at 6 (`mem/outstanding.md`, settled 2026-08-25);
ESLint sits beside it. Zero runtime dependencies and `node:` builtins only — ESLint is a
devDependency of this repo and ships nothing to a target project (`package.json` `files` is
`dist` + `template`; the kit promises target projects no lint). The root `.claude/` stays
generated by the CLI — the drift gate enforces that, it does not replace it. The committed
`dist/` and its byte-exact gate. PR-only CI with the `ci-ok` check. The defensive
`(r.stdout ?? "")` pattern in the hooks stays, whatever a lint rule says.

## Directions we could take

### A — Coverage plus a plain ESLint
Widen `include` to the root hooks; `eslint.config.mjs` (no flag, no extra dependency) with
`js.recommended` + `tseslint.recommendedTypeChecked`; `ignores`; a `lint` script; a CI step; fix
the seven findings; update the docs. Costs: half a day of implementer time; the config file
itself is JavaScript, so "all TypeScript goes through the compiler" is true only because the
config is not TypeScript. Forecloses nothing.

### B — A as above, config in TypeScript, conventions as rules, root drift gated *(recommended)*
`eslint.config.ts` in the tsconfig `include` (typechecked like everything else) and loaded with
`ESLINT_FLAGS=unstable_native_nodejs_ts_config` baked into the `lint` script; the `node:`-only
import rule (regex form) plus `eslint-plugin-n`'s protocol autofix and publish-aware import
check; the six free compiler flags from finding 8; the `update` + porcelain-status drift gate in
CI; `no-unnecessary-condition` left off with the reason recorded in the config. Costs: an
`unstable`-named flag that ESLint may rename (the script is the one place it lives; the editor
extension needs it too — `eslint.options.flags` in VS Code settings); one more devDependency
(`eslint-plugin-n`). Forecloses nothing — the strict preset can be switched on later as its own
contribution.

### C — B, on the strict presets
`strictTypeChecked` + `stylisticTypeChecked` with `allowNumber: true`,
`allowIndexSignaturePropertyAccess: true` and `no-unnecessary-condition` off, then fix the ~25
remaining findings (nullish coalescing, optional chains, `includes`, `type` → `interface`, …)
across the shipped hooks and the CLI. Costs: a style-driven diff through the gate code and the
60-case self-test, and `update` re-run on the root copy; the findings are mechanical but they
touch every hook. Forecloses nothing; adds churn to code that is working.

**Recommendation:** B. It delivers the literal ask — every `.ts` file, the config included,
through `tsc` — and the seven ESLint findings worth fixing, without a taste-driven rewrite of
the hooks. C is a fresh contribution once B has been on `main` for a while, if the strict
presets still look worth it.

## Decisions we need from you

1. **Direction:** A, B or C. **Recommend B.**
2. **ESLint preset:** `recommendedTypeChecked` (7 findings, all fixed in this PR) or
   strict + stylistic with the three overrides (~25 more, mostly in shipped hooks).
   **Recommend `recommendedTypeChecked`.**
3. **Config file language:** `eslint.config.ts` (typechecked; needs `ESLINT_FLAGS` in the
   script and in the editor) or `eslint.config.mjs` (plain, no flag). **Recommend `.ts`.**
4. **Convention rules:** `no-restricted-imports` regex (`node:` and relative `.ts` only) — yes;
   `eslint-plugin-n` (autofix + publish-aware) — yes or no. **Recommend both.**
5. **Compiler flags:** add the six that cost nothing today (`noUnusedLocals`,
   `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `noImplicitReturns`,
   `exactOptionalPropertyTypes`)? `noUncheckedIndexedAccess` (25 errors) and
   `noPropertyAccessFromIndexSignature` (44)? **Recommend the six; not the two.**
6. **Root drift gate in CI:** `node dist/cli.js update . && [ -z "$(git status --porcelain
   --untracked-files=all -- .claude/)" ]` as a step after the build. **Recommend yes.**
7. **The uncommitted devDependency bump** (`package.json` + `pnpm-lock.yaml`, matched pair):
   commit it as the first seed on this branch, or leave it out of this PR (it stays in your
   working tree). **Recommend commit it as a seed** — the manifest is touched anyway.
8. **`stash@{0}`** holds the same bump. Dropping it is a rule-zero action (`git stash drop
   stash@{0}`); it would need a grant now. **Recommend leave it** — it is harmless, and you can
   drop it by hand.
9. **README housekeeping** while the file is open: "five hooks" → "seven"; the ordered CI
   enumeration gains "lint". **Recommend yes.**
10. **`lint` script shape:** `eslint --max-warnings 0 .` (warnings fail) — yes.
    **Recommend yes.**
11. **Merge:** this PR is code (exit 3 from `docs-only.ts`); when the review loop is silent I
    report and stop, and merge only on your word with `--squash --admin`. If you want to give
    that word now — "merge when silent" — say so and I will write the bundle grant at that
    point; otherwise I stop. **Recommend deciding now.**

## What this review did not do

Did not run ESLint inside the repo checkout itself (only on a probe with the nine files copied
in and a simulated `.claude/` tree); did not measure `eslint --fix` yield; did not measure the
strict preset with the three overrides applied (the ~25 is arithmetic on the per-rule counts);
did not test the Windows CI leg — everything was measured on this Windows machine, Node 24.4.1,
tsc 6.0.3, with LF normalisation in the CLI as the reason to expect both legs to agree; did not
touch GitHub; did not measure the VS Code ESLint extension's handling of the native-TS flag —
that is a claim from its settings schema, not a measurement.

---
<!-- Appended at the Questions phase; the review is not rewritten above this line. -->
