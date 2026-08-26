# Outstanding — the live ledger

## Open — owner follow-ups

<!-- dated; content/product decisions, not engineering; nothing in code blocked on these -->

## Blocked on the owner

<!-- one line per GitHub issue: #n — what the owner has to do — which contribution waits -->
<!-- #1 resolved 2026-08-25: owner delegated, MIT chosen; lands with 2026-08-25-npx-ts-kit -->

## Open — engineering follow-ups

- 2026-08-25 — `rule-zero.ts` spends a single-use grant while _judging_, segment by segment, so
  when a later segment of the same Bash command is denied the whole command does not run but
  the earlier grant is already consumed (measured at the merge of PR #3: log shows `grant-used
gh pr merge 3 …` then the deny of `git branch -D … 2>&1`, PR still OPEN; re-bundled to
  proceed). Fix: consume grants only after every segment is allowed. Until then, write merge
  sequences as exact segments — no trailing `2>&1`, no variables.
- 2026-08-26 — **Kit conformance** (one future contribution; owner chose these three at the
  `2026-08-26-prose-standards` Questions phase, decision 8): (a) split `src/cli.ts` by concern
  (579 effective lines, `cmdDoctor` at complexity 41, nesting depth 8) and add ESLint
  `max-lines` 300 / `max-lines-per-function` 80 / `complexity` 20 at error — measured to fail
  today on `cli.ts` alone; the root `.claude/hooks/` copy doubles every hook finding under
  `eslint .`, decide the ignore then; (b) a `node:test` suite (`*.test.ts`, discovered by
  `node --test` on Node 24 with no package; assert a minimum count — `node --test` exits 0 on
  zero tests) with an `import.meta.main` guard in every hook so its functions can be imported —
  85 of 86 top-level functions have no direct test; `docs-only.ts` (`commentOnly`, `isDocPath`)
  first; a test under `src/` lands in `dist/` unless `tsconfig.build.json` excludes it —
  location settled 2026-08-26: `test/`, run by `pnpm test` (2026-08-26-prettier, decision 10);
  (c) generalize `parseOptions` (`docs-only.ts` / `pr-watch.ts`, same `parseArgs` skeleton) into
  `lib.ts`. Not in scope: `isRecord` (deliberate build boundary between `dist/` and the payload)
  and the two `git` helpers (different contracts). Measurements in
  `docs/history/2026-08-26-prose-standards/investigation-{mechanisms,tests}.md`.
- 2026-08-25 — Measure on this install: (a) a hook `deny` holds under `bypassPermissions` —
  **measured 2026-08-26**: `.claude/rule-zero.log` carries `deny … bypassPermissions` rows for
  the orchestrator and for `agent:implementer`, each of which stopped the command; (b)
  `worktree.baseRef: "head"` is honoured — **measured 2026-08-26**: six implementer worktrees
  dispatched from `feat/2026-08-26-prose-standards` each had `git merge-base <worktree-branch>
HEAD` = the feature branch head `05c8ae7`, not `main`; (c) `claude --version` ≥ 2.1.218 —
  **measured 2026-08-26: 2.1.246** (the `version` field stamped on this session's transcript
  records; the `claude` binary is not on this machine's PATH — the VS Code extension runs it).
  All three hold; record them in `docs/guides/agent-workflow.md` §5 on the next edit of that
  file, then delete this entry.
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
  worktree's `node_modules` first, then remove; (b) the gate judges every _line_ of a Bash
  command as a segment, so a heredoc or `git commit -m` whose text quotes a guarded shape
  (`path:outside-repo …`, a hard-reset command) is denied — write such text through the file
  tools or from a variable; (c) an `allow` line like `^git branch -d worktree-` needs the
  literal name — `git branch -d "$BR"` is judged on the variable and denied; (d) Claude Code's
  own worktree-isolation check for sub-agents (not the kit's hook) refuses `git -C <path
outside the worktree>`, `cd <absolute path>` before `git`, and any Bash text containing a
  bare `<` (a heredoc with `i < n` is read as a redirect) — implementers needing a scratch
  clone make it inside their worktree and delete it; the kit cannot change this.
- 2026-08-26 — Narration is half-adopted under prose alone. First implementer under the new
  `implementer.md` (item 3.1 of `2026-08-26-prose-standards`, transcript measured by grouping
  blocks on `message.id`): 22/23 text blocks prefixed `I-3.1:` (96%), but only 22/45
  tool-calling turns had a line before the first tool call (49%) — tool calls that follow a
  tool call in the same turn get no line. The name rule took; the narration rule did not fully.
  If that matters, the candidates are the mechanism the review's direction B described
  (`SubagentStop` reading `last_assistant_message`, which cannot see mid-turn narration) or a
  stronger sentence in the definitions; the owner chose prose (decision 1). Re-measure on the
  next loop before changing anything.
- 2026-08-26 — `.claude/cl-workflow.lock` in this repo has 32 entries and omits
  `mem/outstanding.md` although `OWNED` lists it (`src/cli.ts:31-41`): `cmdUpdate` skips owned
  files with `continue` before `recorded[file.rel]` is set (`src/cli.ts:483-485`) and seeds
  `recorded` from the previous lock (`:466`), so an owned path absent at `init` can never
  reappear on `update`. Harmless today (`update` never touches owned files); `doctor`'s
  disk-vs-lock check simply does not see that file. Fix with the kit-conformance work or on
  its own; measured by item 2.1 of `2026-08-26-prose-standards`.
- 2026-08-26 — Kit ergonomics seen in `2026-08-26-prose-standards`, not fixed: (e) **`git stash`
  is shared across worktrees** — `refs/stash` lives in the common git dir, so two implementers
  stashing at the same moment swap entries (measured: items 1.1 and 1.4 popped each other's
  WIP; nothing lost, both rebuilt); never write "git stash" into an item's validation — the
  safe revert check is `git show HEAD:<path> > <scratchpad>/base` and grep both copies;
  (f) a sub-agent writing to the session scratchpad (`%LOCALAPPDATA%\Temp\claude\…`) is
  denied `path:outside-repo` — implementers keep scratch files inside their worktree;
  (g) `git checkout -- <path>` is a guarded shape (`rule-zero.conf:36`) for sub-agents too — an
  item that tells an implementer to "restore" a file must say how (delete the appended bytes,
  or copy back from `git show HEAD:<path>`); (h) an implementer worktree inherits no
  `node_modules` — every item that runs lint/typecheck pays a `pnpm install --frozen-lockfile`.

## Settled — do not re-open, do not "fix"

- 2026-08-26 — Prettier (`^3.9.6`, devDependency of the kit repo only) formats code, the payload
  and the root owned documents at `printWidth: 100`, `proseWrap: preserve`,
  `embeddedLanguageFormatting: off`; `pnpm format` writes, `pnpm format:check` is the first step
  of the full check and of CI. Ignored (`.prettierignore`): `dist/`, `pnpm-lock.yaml`, the
  generated root `.claude/` and `docs/guides/agent-workflow.md`, `template/.claude/settings.json`
  (the CLI serializes it), and every process record (`docs/history/`, `docs/reviews/`,
  `docs/plans/`, `docs/reports/`) — records stay as written. The two dense literal tables
  (`CASES` in `rule-zero-selftest.ts`, the extension `Set`s in `docs-only.ts`) carry
  `// prettier-ignore`. No `eslint-config-prettier` (measured unnecessary). Nothing ships to
  target projects; the payload names the tool only in the owned `template/CLAUDE.md` `Format:`
  line (the Playwright pattern). (owner, 2026-08-26-prettier, decisions 1, 3–8)
- 2026-08-26 — **The orchestrator runs the formatter.** The "edits documents only — never code"
  rule gains one exception beside the small path: before the final Orchestrate commit the
  orchestrator runs the formatter named by the Format line in `CLAUDE.md` over the repo (then the
  build and the generated-copy regeneration where `CLAUDE.md` names them) and commits — a
  deterministic tool run, not an edit. Implementers still format the files they own. (owner,
  2026-08-26-prettier, decision 2 — chose (iii) over implementers-only)
- 2026-08-26 — Hook tests live in `test/` (`*.test.ts`, `node:test`, `pnpm test` =
  `node --test test/`, in CI and the full check) — outside the payload and outside `dist/`. The
  kit-conformance suite goes there too. (owner, 2026-08-26-prettier, decision 10)
- 2026-08-26 — No `.git-blame-ignore-revs` for the one-off reformat. (owner, 2026-08-26-prettier,
  decision 11)
- 2026-08-26 — Every agent names itself at the start of each text block and says in one line
  what it is about to do before a tool call: the orchestrator as `Orchestrator:`, an
  implementer as `I-<n.m>:` (its plan item — the kit's noun is "item", never "task"), an
  implementer on an inline brief in the PR-review loop as `I-r<cycle>.<k>:` minted by the
  orchestrator in the brief, an investigator as `Investigator-<topic>:`. Prose only — no hook
  checks the prefix (owner chose direction A over B). (owner, 2026-08-26-prose-standards,
  decisions 1–5)
- 2026-08-26 — Duplicate code is found at investigation and locked into the plan: investigator
  briefs ask for the functions a change will need and their existing copies; the review and
  the plan carry any generalization as items whose **Files** include the shared module. The
  ownership fence stands; an implementer that still meets a duplicate outside its files
  reports **Blocked** naming the function. (owner: "Duplicate code detection needs to come from the
  investigation - the plan needs the direction already locked in.", decision 6)
- 2026-08-26 — Implementer code standards are prose, threshold-free: modular and reusable, one
  concern per file, pure functions where possible, every implementation paired with tests for
  its logic. Numbers (ESLint size rules) arrive with the kit-conformance refactor, not before.
  (owner, decisions 7–8)
- 2026-08-26 — Playwright is named only in the owned `template/CLAUDE.md` skeleton (E2E line,
  default for browser-based visual tests). The managed prose stays tool-agnostic: "the suite
  named by the E2E line in `CLAUDE.md`". The kit repo itself never depends on Playwright — its
  import fails the `node:`-only rule. (owner, decision 9)
- 2026-08-26 — Rule-zero prose is not extended to outside-the-repo tool writes (browser
  downloads, `--with-deps`, global installs); the shipped conf stays silent on them and a
  project tunes its own conf. (owner, decision 10)
- 2026-08-26 — `docs-only.ts` keeps classifying `.claude/cl-workflow.lock` as code, so every
  prose change to the payload is a code PR needing the owner's merge word. Owner declined to
  record a follow-up. (owner, decision 12)
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
  implementer — except on the small path, below. (owner)
- 2026-08-26 — The small path (SKILL §11): a change of a few lines, no new dependency, no gate
  or hook logic, declared small by the owner or proposed by the orchestrator and accepted. The
  orchestrator edits directly; the full check is the gate; the record is the PR plus one
  `docs/history/index.md` entry; it merges under a standing approval once the review loop is
  silent and `ci-ok` is green on the head; anything more escalates to the full loop. Four decisions asked and
  answered in conversation, 2026-08-26. (owner: "One liners should not need to go through the
  full contribute loop. We need a lighter loop for that kind of thing.")
- 2026-08-25 — Naming: one id `<yyyy-mm-dd>-<descriptive-slug>` for branch, review dir, plan
  file, history dir. Issue number and PR number are recorded inside the documents, never in
  the id. (owner)
- 2026-08-25 — The plan is a directory: `plan.md` overview + one `phase-<n>.md` per phase, so
  phases can be worked concurrently. (owner)
- 2026-08-25 — No record commits after `gh pr create`: review cycles are PR comments; merge and
  deploy are reported in the conversation. Otherwise the loop triggers its own reviews. (owner)
- 2026-08-25 — Anything blocked on the owner becomes a GitHub issue labelled
  `blocked-on-owner` + kind + area, created before the archive. (owner)
- 2026-08-25 — Standing merge approval: a docs/comments-only PR (measured by `docs-only.ts`)
  is merged by the orchestrator after the review loop is silent, CI cancelled. (owner)
- 2026-08-26 — Second standing merge approval: a small-path PR is merged by the orchestrator
  after the review loop is silent and `ci-ok` is green on the head. (owner)
- 2026-08-26 — Investigator reports are retained and archived under `docs/history/<id>/`,
  never removed from the repo — on the small path as much as in the full loop. (owner:
  "Investigator reports should be retained and archived, not removed from the repo")
- 2026-08-25 — `gh pr merge --admin` is always used; branch protection is not the gate. (owner)
- 2026-08-25 — PR review quiet window is 5 minutes, restarting on every push. (owner)
- 2026-08-25 — An ask may name several GitHub issues; one PR or split is decided at Questions. (owner)
