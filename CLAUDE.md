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
- Full check (lint + typecheck + unit): `pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm selftest`
- Build: `pnpm build` — `tsc -p tsconfig.build.json` → `dist/cli.js`, which is committed
- E2E: `node dist/cli.js init <tmp>/smoke` then `node dist/cli.js doctor <tmp>/smoke` (the CLI
  smoke: `doctor` checks Node, the lock, the hook wiring and the ESM shim, then runs the gate's
  own self-test to 60/60)
- Container: none

## Conventions that will fail your lint
- `erasableSyntaxOnly` — no enums, no runtime `namespace`, no parameter properties, no
  decorators, in `src/` or in `template/.claude/hooks/`. Node strips these types, it does not
  compile them; sibling imports carry the explicit `.ts` extension.
- Zero runtime dependencies, `node:` builtins only — a target project installs nothing, and
  the CLI must keep running from inside `node_modules` where nothing was built for it.
- LF everywhere (`* text=auto eol=lf`), and `dist/cli.js` must be byte-exactly what
  `pnpm build` emits: CI runs `git diff --exit-code dist/` and fails on drift.

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
