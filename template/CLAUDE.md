# <project name>

<One paragraph: what this repo is, the stack, the default branch.>

## Commands
- Install: `<cmd>`
- Full check (lint + typecheck + unit): `<cmd>`
- Build: `<cmd>`
- E2E: `<cmd>` (`<which suites cover which surfaces>`; browser-based visual tests: Playwright — `<playwright cmd>`)
- Container: `<cmd>`

## Conventions that will fail your lint
- <the two or three that bite most>

## Deploy
Mode: `production-ci` | `local-containers` | `none yet`
- production-ci: workflow `<name>`; `gh run list --workflow <name> --branch <default> -L1` then `gh run watch <id>`
- local-containers: rebuild `<cmd>`; checks: `<how to see user id, migrations, bound port, stderr>`

## Process
Every contribution runs `/contribute` (`.claude/skills/contribute/SKILL.md`); a change of a
few lines the owner declares small runs its small path (`/contribute --small`, SKILL §11).
Rule zero, the two owner gates and the three habits are in `.claude/rules/process.md`; the reasoning is in
`docs/guides/agent-workflow.md`, which wins over this file on conflict. Durable facts live in
`mem/` (start at `mem/index.md`); open work and settled decisions in `mem/outstanding.md`.
This file is repo facts and conventions only — not a ledger.
