# Outstanding — the live ledger

## Open — owner follow-ups
<!-- dated; content/product decisions, not engineering; nothing in code blocked on these -->

## Blocked on the owner
<!-- one line per GitHub issue: #n — what the owner has to do — which contribution waits -->
- #1 — choose a licence for the kit — nothing waits in code; LICENSE + manifest field follow
  as docs-only once chosen (2026-08-25-npx-ts-kit)

## Open — engineering follow-ups
- 2026-08-25 — Measure on this install: (a) a hook `deny` holds under `bypassPermissions`;
  (b) `worktree.baseRef: "head"` is honoured by subagent worktrees (spawn one implementer from
  a feature branch and check `git -C .claude/worktrees/<slug> merge-base HEAD <branch>`);
  (c) `claude --version` ≥ 2.1.218. Reopen if any fails; record the results in
  `docs/guides/agent-workflow.md` §5.
- 2026-08-25 — Measure Copilot's latency, trigger and suppressed-section location on the first
  PR; fill in §10 "Know your reviewer".

## Settled — do not re-open, do not "fix"
- 2026-08-25 — The kit installs via `npx github:Safricloud/cl-workflow` only; it is never
  published to the npm registry. (owner)
- 2026-08-25 — Node floor is 24; hooks ship as erasable `.ts` run natively; TypeScript 6 with
  `tsc` is the checker; pnpm is the kit repo's package manager. (owner)
- 2026-08-25 — The CLI is authored in `.ts` and compiled by tsc into a committed
  `dist/cli.mjs`; CI fails when dist drifts from src. Node cannot strip types under
  `node_modules`, so the shipped bin must be JS. (owner, 2026-08-25-npx-ts-kit Q1)
- 2026-08-25 — CI runs on pull_request into main only — never on push to main. Merging is
  gated by a `main` ruleset requiring check `ci-ok`, with repository-admin bypass. (owner)
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
