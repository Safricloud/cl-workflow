# Phase 1 — 1 implementer, serial (2026-08-25-static-analysis)

**Plan:** `plan.md` · **Starts from:** branch head after the Questions commit
**Magnet files this phase touches:** `package.json`, `pnpm-lock.yaml`, `tsconfig.json`,
`.github/workflows/ci.yml`, `src/cli.ts`, `dist/cli.js` — all of them, which is why this phase
is one item and nothing runs beside it.

### Item 1.1 — Toolchain: ESLint, the eight compiler flags, the widened include, CI; the CLI made clean
**Files:** `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs` (new), `tsconfig.json`,
`.github/workflows/ci.yml`, `src/cli.ts`, `dist/cli.js` (rebuilt, committed)
**Approach:**
1. `pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-n` with the repo's pinned pnpm
   (10.27.0). Expect eslint 10.9.1, @eslint/js 10.0.1, typescript-eslint 8.68.0,
   eslint-plugin-n 18.3.0 (facts table); record what actually resolved from the installed
   `package.json` files, not the manifest. No peer warnings are expected — if one appears,
   record it verbatim.
2. `eslint.config.mjs` at the repo root, exactly per plan.md → *Decisions made by this plan*:
   `defineConfig` from `eslint/config`; `ignores: ["dist/", ".claude/worktrees/"]`;
   `js.configs.recommended` for all files; a `files: ["**/*.ts"]` block extending
   `tseslint.configs.recommendedTypeChecked` with `parserOptions: { projectService: true,
   tsconfigRootDir: import.meta.dirname }`, the `no-restricted-imports` regex rule, the four
   `eslint-plugin-n` rules and `@typescript-eslint/no-non-null-assertion` at `error`. Use the
   regex form of `no-restricted-imports` — the glob form is measured broken (facts table).
3. `package.json` scripts: add `"lint": "eslint --max-warnings 0 ."` (keep the others
   verbatim).
4. `tsconfig.json`: `include` → `["src", "template/.claude/hooks", ".claude/hooks"]`; add the
   eight flags to `compilerOptions`: `noUnusedLocals`, `noUnusedParameters`,
   `noFallthroughCasesInSwitch`, `noImplicitOverride`, `noImplicitReturns`,
   `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`.
   Do not touch `tsconfig.build.json`.
5. `.github/workflows/ci.yml`: a `- run: pnpm lint` step between `pnpm install` and
   `pnpm typecheck`; and after the `dist/ drift gate` step, a `Generated .claude/ drift gate`
   step (`shell: bash`): `node dist/cli.js update .`, then
   `status="$(git status --porcelain --untracked-files=all -- .claude/)"; if [ -n "$status" ];
   then printf '%s\n' "$status"; exit 1; fi`. Keep the `ci-ok` job byte-identical.
6. `src/cli.ts`: make it clean under the new flags and the new lint — 3 tsc errors
   (1 × TS2322, 1 × TS2345, 1 × TS2532) and 5 lint findings (`no-useless-assignment` at
   195/247/615/658 — drop the dead initialiser, e.g. `let parsed: unknown;`; `no-unsafe-argument`
   at 301 — narrow the `unknown` before spreading, e.g. `args.filter((a): a is string =>
   typeof a === "string")` or push per element after a `typeof` check, keeping the same set of
   strings reaching `fields`). Guards for the unchecked-index errors preserve today's behaviour
   (a missing value goes the way it goes now); no `!`.
7. `pnpm build`; commit `dist/cli.js` with the source.
**Conventions that will fail your lint:** `erasableSyntaxOnly` (no enums/namespaces/parameter
properties); zero runtime dependencies — everything added is a `devDependency`, `node:` imports
only, and `no-restricted-imports` now enforces it; `dist/cli.js` must be byte-exactly what
`pnpm build` emits; LF everywhere.
**Scoped validation:**
- `pnpm install --frozen-lockfile` — exit 0
- `pnpm lint` — runs; every reported problem is under `template/.claude/hooks/` or
  `.claude/hooks/`; **0 under `src/` and 0 in `eslint.config.mjs`** (`pnpm lint -- -f json`
  and count by file)
- `pnpm typecheck` — runs; every error is under the two hook directories; **0 in `src/`**
- `pnpm build && git diff --exit-code dist/` — clean after your commit of `dist/`
- `pnpm selftest` — 60/60 (hooks untouched in this phase)
- `node dist/cli.js init <scratchpad>/smoke && node dist/cli.js doctor <scratchpad>/smoke` —
  doctor 6 passed, 0 failed
- `node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/` —
  prints nothing (the gate is green on the untouched root copy)
**Acceptance:** the six validations above; `git diff main -- tsconfig.build.json` empty; the
lock diff confined to the four new devDependencies and their transitive closure (say how many
packages it added). **Must FAIL if reverted / checker verified:** (a) with a scratch line
`import * as fs from "fs";` added to `src/cli.ts`, `pnpm lint` reports both
`no-restricted-imports` and `n/prefer-node-protocol` — then remove it; (b) with an unused
`const nothing = 1;` added, `pnpm typecheck` reports TS6133 — then remove it; (c) with the eight
flags removed from `tsconfig.json`, the hook errors vanish (proves the flags are the source) —
then restore. Record all three results in the status block.
#### Status — item 1.1
**Done** (implementer, 2026-08-25). Branch `worktree-agent-a0aba77f99a1abb6e`.
- **Files touched:**
  - `package.json` — four devDependencies added by `pnpm add -D`; `"lint": "eslint
    --max-warnings 0 ."` inserted after `build`, the other scripts byte-identical.
  - `pnpm-lock.yaml` — regenerated by that one `pnpm add`; **3 → 100 packages, +97**, all
    in the four new devDependencies' closure. No field edited by hand.
  - `eslint.config.mjs` (new, 50 lines) — `defineConfig` from `eslint/config`;
    `ignores: ["dist/", ".claude/worktrees/"]`; `js.configs.recommended` everywhere; a
    `files: ["**/*.ts"]` block extending `tseslint.configs.recommendedTypeChecked` with
    `projectService: true` / `tsconfigRootDir: import.meta.dirname`, the regex
    `no-restricted-imports`, the four `n/` rules and `@typescript-eslint/no-non-null-assertion`.
  - `tsconfig.json` — the eight flags after `strict`; `include` now
    `["src", "template/.claude/hooks", ".claude/hooks"]`. `tsconfig.build.json` untouched
    (`git diff main -- tsconfig.build.json` → empty, exit 0).
  - `.github/workflows/ci.yml` — `- run: pnpm lint` between `pnpm install` and
    `pnpm typecheck`; a `Generated .claude/ drift gate` step (`shell: bash`) after the
    `dist/` drift gate. The `ci-ok` job is untouched — the whole diff is +13 lines, 0
    deletions.
  - `src/cli.ts` — 8 fixes, all behaviour-preserving: four dead initialisers dropped
    (195/247/615/658 — each followed by a `try` that assigns and a `catch` that
    continues/returns/assigns); `writeLock` guards `lock.files[key]` (the keys come from
    `Object.keys` of that same object, and `JSON.stringify` drops an `undefined` value
    either way, so the emitted lock is identical); `hookScripts` spreads
    `args.filter((a): a is string => typeof a === "string")` instead of an `any[]` (the
    loop below only ever used strings, so the same set reaches `out`); `isKitHookEntry`
    uses `HOOK_PATH.exec(...)?.[1]` (group 1 is not optional, so a match always has it);
    `main` uses `rest[0] ?? "."` (`??` falls back only on `undefined`, so an explicit
    empty-string argument still resolves to the cwd, as before). **No `!` anywhere.**
  - `dist/cli.js` — rebuilt and committed; the diff is exactly those eight source changes,
    no incidental drift.
- **Commits:** `ea29f5b` (status: In progress), `acf3379` (toolchain), `98fb92c`
  (`src/cli.ts` + `dist/`), plus this status commit.
- **Deviation:** one addition the item did not spell out — `plugins: { n }` in the
  `**/*.ts` block. Without registering the plugin, ESLint fails hard with "Definition for
  rule 'n/prefer-node-protocol' was not found"; the four rules themselves are exactly as
  specified. No lint suppression, no `eslint-disable`, no `@ts-expect-error` in the diff.
- **Verified against the installed package before writing:** the four resolutions read from
  `node_modules/<pkg>/package.json` after the install, not from the manifest — eslint
  **10.9.1**, @eslint/js **10.0.1**, typescript-eslint **8.68.0**, eslint-plugin-n **18.3.0**;
  exactly the facts table. **No peer warnings of any kind** in the `pnpm add` output. The
  regex form of `no-restricted-imports` behaves as measured: 0 findings on the 17 `.ts`
  files, and it fires on `"fs"` (checker (a)).
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm install --frozen-lockfile` — "Lockfile is up to date", exit 0
  - `pnpm lint` — **4 problems, 4 errors**, all four in the two hook directories:
    `no-base-to-string` at `pr-watch.ts:114` and `no-useless-assignment` at
    `rule-zero.ts:198`, once per copy. Counted by file from `-f json`: **18 files linted**
    (17 `.ts` + `eslint.config.mjs`), **0 under `src/`**, **0 in `eslint.config.mjs`**.
    `dist/cli.js` is not among the linted files — the `ignores` entry works.
  - `pnpm typecheck` — **132 errors**, every one under `template/.claude/hooks/` or
    `.claude/hooks/`, **0 in `src/`** (`... | grep -cE '^src/'` → 0). 132 = 66 per copy × 2,
    consistent with the facts table's 69 once `cli.ts`'s 3 are fixed.
  - `pnpm build && git diff --exit-code dist/` — exit 0, no output, after the `dist/` commit
  - `pnpm selftest` — **60/60 cases passed**
  - `node dist/cli.js init <scratch>/smoke` — 33 written, 0 skipped, 0 `.new`;
    `node dist/cli.js doctor <scratch>/smoke` — **6 passed, 0 failed** (its last check is
    the installed copy's own self-test, 60/60)
  - `node dist/cli.js update .` — "0 refreshed, 24 already current, 0 left beside as .new";
    `git status --porcelain --untracked-files=all -- .claude/` → **prints nothing**
  - **Checkers verified (all three required by Acceptance):**
    - (a) added `import * as scratchFs from "fs";` at `src/cli.ts:19` — `pnpm lint` reported
      **`no-restricted-imports`** ("'fs' import is restricted from being used by a pattern.
      node: builtins and relative .ts imports only …") **and `n/prefer-node-protocol`**
      ("Prefer `node:fs` over `fs`"), plus `no-unused-vars`; removed → back to 4 problems.
      The alias is `scratchFs`, not `fs`, only because `fs` already names the `node:fs`
      import in that file; the restricted-import message still names `'fs'`.
    - (b) added `const nothing = 1;` in `writeLock` — `pnpm typecheck` reported
      `src/cli.ts(274,9): error TS6133: 'nothing' is declared but its value is never read.`;
      removed → 0 errors under `src/` again.
    - (c) deleted the eight flags from `tsconfig.json` — `pnpm typecheck` **exit 0, 0
      errors**, so all 132 hook errors are the flags' doing and nothing else; restored → 132
      again, working tree clean.
- **Blocked on:** nothing that stopped the work. One hook denial, recorded per rule zero:
  `git checkout -- tsconfig.json` (rule-zero.conf:36, guard
  `git checkout (-- |\.( |$))`), tried in order to undo checker (c). Restored
  by rewriting the file instead — same result, confirmed with
  `git diff --exit-code -- tsconfig.json`.
- **Orchestrator should verify:** the full check is red by design until phase 3 — `pnpm lint`
  (4) and `pnpm typecheck` (132) fail on the hooks, so **the new `pnpm lint` CI step will fail
  on this branch until phases 2 and 3 land**; the `Generated .claude/ drift gate` step has been
  run locally but never on a GitHub runner (its `shell: bash` is what covers the
  windows-latest leg); the +97 lock entries were counted, not audited package by package;
  `no-non-null-assertion` has no positive test here (no `!` exists in the repo to trip it) —
  it will be exercised in phase 2.

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- what was run, counts, checkers verified, findings → phase 1.5 items -->
