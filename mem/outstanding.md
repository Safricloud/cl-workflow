# Outstanding — the live ledger

## Open — owner follow-ups
<!-- dated; content/product decisions, not engineering; nothing in code blocked on these -->

## Blocked on the owner
<!-- one line per GitHub issue: #n — what the owner has to do — which contribution waits -->
<!-- #1 resolved 2026-08-25: owner delegated, MIT chosen; lands with 2026-08-25-npx-ts-kit -->

## Open — engineering follow-ups
- 2026-08-25 — Measure on this install: (a) a hook `deny` holds under `bypassPermissions`;
  (b) `worktree.baseRef: "head"` is honoured by subagent worktrees (spawn one implementer from
  a feature branch and check `git -C .claude/worktrees/<slug> merge-base HEAD <branch>`);
  (c) `claude --version` ≥ 2.1.218. Reopen if any fails; record the results in
  `docs/guides/agent-workflow.md` §5.
- 2026-08-25 — Measure Copilot's latency, trigger and suppressed-section location on the first
  PR; fill in §10 "Know your reviewer".
- 2026-08-25 — Watch npm upstream: 11.12.0's git-install regression (breaks every `npx
  github:` consumer on that version) and npm 12's `allow-git=none` default. Revisit the README
  install caveats when either moves; `pnpm dlx` is the measured always-works path today.
- 2026-08-25 — `pr-watch.ts` has run only against a fake `gh` (news/quiet/head-change all
  measured); real-PR pagination remains unmeasured until the first PR review cycle.
- 2026-08-25 — Confirm on the first loop after `2026-08-25-static-analysis` merges that an
  implementer's `Edit`/`Write` work inside its worktree (the spelling fix in `pyRealpath` /
  `isWithin` was verified by probe and self-test, never by a live sub-agent — the live session
  ran the stale root copy throughout that loop). If a `path:outside-repo` denial on a worktree
  path still appears in `.claude/rule-zero.log`, reopen: the next suspect is the form of
  `CLAUDE_PROJECT_DIR` the sub-agent receives.
- 2026-08-25 — `isWithin`'s case-insensitive win32 branch has no self-test case of its own
  (`realpathSync.native` already canonicalises the drive letter); it only matters for
  `pyRealpath`'s no-ancestor fallback. Add a case if that fallback ever bites.
- 2026-08-25 — Kit ergonomics seen this loop, not fixed: (a) `git worktree remove` fails with
  "Directory not empty" when the implementer ran `pnpm install` in its worktree — delete the
  worktree's `node_modules` first, then remove; (b) the gate judges every *line* of a Bash
  command as a segment, so a heredoc or `git commit -m` whose text quotes a guarded shape
  (`path:outside-repo …`, a hard-reset command) is denied — write such text through the file
  tools or from a variable; (c) an `allow` line like `^git branch -d worktree-` needs the
  literal name — `git branch -d "$BR"` is judged on the variable and denied; (d) Claude Code's
  own worktree-isolation check for sub-agents (not the kit's hook) refuses `git -C <path
  outside the worktree>`, `cd <absolute path>` before `git`, and any Bash text containing a
  bare `<` (a heredoc with `i < n` is read as a redirect) — implementers needing a scratch
  clone make it inside their worktree and delete it; the kit cannot change this.

## Settled — do not re-open, do not "fix"
- 2026-08-25 — ESLint sits beside `tsc`, it does not replace it: ESLint 10 + typescript-eslint 8
  on `recommendedTypeChecked`, config in `eslint.config.mjs` (flag-free; the owner chose it over
  `eslint.config.ts`), `pnpm lint` = `eslint --max-warnings 0 .` and a CI step. The `node:`-only
  import convention is a rule (`no-restricted-imports`, regex form) plus `eslint-plugin-n`.
  (owner, 2026-08-25-static-analysis, decisions 1–4, 10)
- 2026-08-25 — `tsconfig.json` carries all eight extra strictness flags (`noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `noImplicitReturns`,
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`)
  and includes the generated root `.claude/hooks`; CI gates root-copy drift by re-running
  `node dist/cli.js update .` and requiring an empty `git status --porcelain
  --untracked-files=all -- .claude/`. (owner, 2026-08-25-static-analysis, decisions 5–6)
- 2026-08-25 — `@typescript-eslint/no-unnecessary-condition` stays off if the strict presets are
  ever adopted: it calls the hooks' `(r.stdout ?? "")` after `spawnSync` dead, but Node returns
  `null` there when the spawn itself fails. Deleting that guard makes the gate fail open.
  (measured, 2026-08-25-static-analysis investigation-eslint.md)
- 2026-08-25 — The kit installs via `npx github:Safricloud/cl-workflow` only; it is never
  published to the npm registry. (owner)
- 2026-08-25 — Node floor is 24; hooks ship as erasable `.ts` run natively; TypeScript 6 with
  `tsc` is the checker; pnpm is the kit repo's package manager. (owner)
- 2026-08-25 — The CLI is authored in `.ts` and compiled by tsc into a committed
  `dist/cli.mjs`; CI fails when dist drifts from src. Node cannot strip types under
  `node_modules`, so the shipped bin must be JS. (owner, 2026-08-25-npx-ts-kit Q1)
- 2026-08-25 — CI runs on pull_request into main only — never on push to main. Merging is
  gated by a `main` ruleset requiring check `ci-ok`, with repository-admin bypass. (owner)
- 2026-08-25 — Licence is MIT, copyright "Safricloud". Owner delegated the choice: "I don't
  mind what people do with this repo." Do not re-ask. (owner, issue #1)
- 2026-08-25 — Sub-agents are Opus, not "the strongest model available". (owner)
- 2026-08-25 — Sub-agents commit to their own worktree branch; only the orchestrator pushes,
  opens PRs, and — with the owner's yes — merges and deletes feature branches. (owner)
- 2026-08-25 — The kit is permissive: no permission prompts, no `ask` rules; rule-zero denials
  only on the shapes in `.claude/rule-zero.conf`; owner questions only at Gate A and Gate B.
  (owner: "if I get asked too many things I will throw the kit away")
- 2026-08-25 — The owner is prompted in the Questions phase only; more questions there, none
  elsewhere. Mid-loop the orchestrator decides, sub-agents implement everything, decisions are
  recorded for veto. Nothing is deferred except what the owner must personally do. (owner)
- 2026-08-25 — The orchestrator edits documents only; every code change goes through an
  implementer. (owner)
- 2026-08-25 — Naming: one id `<yyyy-mm-dd>-<descriptive-slug>` for branch, review dir, plan
  file, history dir. Issue number and PR number are recorded inside the documents, never in
  the id. (owner)
- 2026-08-25 — The plan is a directory: `plan.md` overview + one `phase-<n>.md` per phase, so
  phases can be worked concurrently. (owner)
- 2026-08-25 — No record commits after `gh pr create`: review cycles are PR comments; merge and
  deploy are reported in the conversation. Otherwise the loop triggers its own reviews. (owner)
- 2026-08-25 — Anything blocked on the owner becomes a GitHub issue labelled `blocked-on-owner`
  + kind + area, created before the archive. (owner)
- 2026-08-25 — Standing merge approval: a docs/comments-only PR (measured by `docs-only.py`)
  is merged by the orchestrator after the review loop is silent, CI cancelled. (owner)
- 2026-08-25 — `gh pr merge --admin` is always used; branch protection is not the gate. (owner)
- 2026-08-25 — PR review quiet window is 5 minutes, restarting on every push. (owner)
- 2026-08-25 — An ask may name several GitHub issues; one PR or split is decided at Questions. (owner)
