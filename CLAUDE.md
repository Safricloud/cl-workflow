# cl-workflow — the contribution kit

The `/contribute` loop packaged as an npm package installed straight from GitHub
(`npx --yes github:Safricloud/cl-workflow init`) and never published to the registry.
`template/` is the payload exactly as it lands in a target project — the permission gate,
seven TypeScript hooks, two sub-agent definitions, the skill and the process guide; `src/cli.ts`
is the installer that copies it in and keeps it current. TypeScript 6 compiled by `tsc`,
Node >= 24, pnpm; default branch `main`. This repo runs the kit on itself and its root
`.claude/` is **generated** by the CLI — edit `template/.claude/**` and re-run `update`, never
the root copy.

## Commands
- Install: `pnpm install`
- Full check (lint + typecheck + unit): `pnpm lint && pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm selftest`,
  then the generated-copy gate: `node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/`
  must print nothing (a tracked change means `template/` moved ahead; a `*.new` means someone
  hand-edited the generated root copy)
- Lint: `pnpm lint` — `eslint --max-warnings 0 .` from `eslint.config.mjs`: `@eslint/js`
  recommended everywhere, typescript-eslint `recommendedTypeChecked` + `eslint-plugin-n` on
  every `.ts` (`src/`, `template/.claude/hooks/`, and the generated `.claude/hooks/` copy);
  `dist/` and `.claude/worktrees/` ignored
- Typecheck: `pnpm typecheck` — `tsc --noEmit` over the same 17 files, `strict` plus
  `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`,
  `noImplicitReturns`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`
- Build: `pnpm build` — `tsc -p tsconfig.build.json` → `dist/cli.js`, which is committed
- E2E: `node dist/cli.js init <tmp>/smoke` then `node dist/cli.js doctor <tmp>/smoke` (the CLI
  smoke: `doctor` checks Node, the lock, the hook wiring and the ESM shim, then runs the gate's
  own self-test to 62/62)
- Container: none

## Conventions that will fail your lint
- `erasableSyntaxOnly` — no enums, no runtime `namespace`, no parameter properties, no
  decorators, in `src/` or in `template/.claude/hooks/`. Node strips these types, it does not
  compile them; sibling imports carry the explicit `.ts` extension.
- Zero runtime dependencies, `node:` builtins only — a target project installs nothing, and
  the CLI must keep running from inside `node_modules` where nothing was built for it.
  Enforced: `no-restricted-imports` (regex `^(?![.]|node:)`) and `n/prefer-node-protocol`
  fail on `"fs"`, `"typescript"` or any package import; only `node:*` and relative `./x.ts`.
- `noUncheckedIndexedAccess` — every `array[i]` / `record[key]` read is `T | undefined`; guard
  it the way the surrounding code handles a missing value (deny, exit non-zero, skip). Never
  `!` — `@typescript-eslint/no-non-null-assertion` is on. `noPropertyAccessFromIndexSignature`
  — `process.env["X"]`, `payload["tool_name"]`, bracket access on every index signature.
- Unused locals and parameters fail (`noUnusedLocals`, `noUnusedParameters`); a `let x = …`
  whose value is always overwritten before use fails `no-useless-assignment`.
- LF everywhere (`* text=auto eol=lf`), and `dist/cli.js` must be byte-exactly what
  `pnpm build` emits: CI runs `git diff --exit-code dist/` and fails on drift. The root
  `.claude/` is generated the same way: CI re-runs `update` and fails on any drift.

## Deploy
Mode: `none yet`
- Nothing is deployed and nothing runs after a merge: `.github/workflows/ci.yml` triggers on
  `pull_request` into `main` and on nothing else. A release is a git tag, which is what makes
  `npx github:Safricloud/cl-workflow#vX.Y.Z` resolvable — there is no publish step.

## Process
Every contribution runs `/contribute` (`.claude/skills/contribute/SKILL.md`). Rule zero, the
two owner gates and the three habits are in `.claude/rules/process.md`; the reasoning is in
`docs/guides/agent-workflow.md`, which wins over this file on conflict. Durable facts live in
`mem/` (start at `mem/index.md`); open work and settled decisions in `mem/outstanding.md`.
This file is repo facts and conventions only — not a ledger.
