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
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- what was run, counts, checkers verified, findings → phase 1.5 items -->
