# Review — Prettier, run before the PR (2026-08-26-prettier)

**The ask:** Install and configure Prettier to format the repo's files, with the formatting step
taking place before a PR is created — the owner, in conversation, 2026-08-26.
**Issue:** none · **Checkout:** `main` @ `050b765` (the branch was cut at `8a9690e`; PR #6 merged
while the investigation ran and the empty branch was fast-forwarded) · **Branch:**
`chore/2026-08-26-prettier`
**Investigations:** `investigation-tooling.md`, `investigation-generated.md`,
`investigation-markdown.md`, `investigation-process.md` (in this directory)

## Short answer

Prettier fits this code almost as it is written: one option (`printWidth: 100`) and nothing else,
because the code is already double-quoted, semicolon-terminated, two-space, trailing-comma. No
ESLint rule contradicts it. What needs care is not the code but the repo's generated surfaces and
its records: the CLI serializes `.claude/settings.json` itself and would fight a formatter forever;
Prettier reads only the root `.gitignore`, so a whole-repo `--write` would reach a live implementer
worktree; and 86% of the Markdown churn is in archived records under `docs/history/`. One hook
breaks — Prettier rewrites `*(implementer keeps this current…)*` as `_(…)_` and `reload-plan.ts:93`
then reports a status block that was never written. We recommend Prettier as a dev dependency of
the kit repo, the generated copies and the process records ignored, `pnpm format:check` in the full
check and in CI, a `Format:` line in the owned `CLAUDE.md` skeleton with tool-agnostic prose in the
payload (the Playwright precedent), and — since the orchestrator writes no code — each implementer
formatting the files it owns while the orchestrator checks. That is what "before a PR is created"
turns into inside this loop.

## What we found

1. **The fit is near-perfect; the churn is in prose, not code.** Prettier 3.9.6 (today's `latest`,
   zero dependencies, Node ≥ 14) at `printWidth: 100` changes 467 lines across the ten `.ts`/`.mjs`
   files — every one a re-wrap; not one quote, semicolon, indent or arrow-paren changes. The default
   width (80) would cost 1,115 lines and shred four hook files that sit at 99–111 columns today.
   337 of the 467 lines are two deliberately dense literal tables (`CASES` in
   `rule-zero-selftest.ts`, the extension `Set`s in `docs-only.ts`); a `// prettier-ignore` on each
   keeps them as tables. `eslint --print-config` shows no formatting rule active, so
   `eslint-config-prettier` would switch off rules that are already off. (`investigation-tooling.md`
   §1, §3, §5)

2. **Three generated surfaces, and one file the CLI serializes itself.** `dist/cli.js` is tsc
   output; the root `.claude/` and `docs/guides/agent-workflow.md` are written by `update`. Every
   managed root file is a byte copy of its template source today (24/24 `cmp` equal), so formatting
   `template/` and running `update` propagates cleanly — **except `.claude/settings.json`**, which
   `mergeSettings` re-serializes on every run (`src/cli.ts:384`, `JSON.stringify(…, null, 2)`, no
   trailing newline, by design at `:383`). Prettier collapses its three one-element `args` arrays
   and adds a newline; the next `update` undoes both; the drift gate goes red either way. Both
   copies must be ignored. Formatting `src/cli.ts` also moves tsc's emit by 12 lines, so the build
   must re-run and `dist/` be committed. Order that leaves every gate green: format → `pnpm build`
   → `node dist/cli.js update .` → commit. (`investigation-generated.md` §1, §3, §5;
   `investigation-tooling.md` §4, §6)

3. **Prettier honours only the `.gitignore` at the root.** `.claude/worktrees/` and
   `.claude/pr-watch/` are ignored by the nested `.claude/.gitignore`, which Prettier does not read
   from the repo root — measured: a root `--check` lists `.claude/pr-watch/2.json`. A root
   `prettier --write .` would therefore reformat a live implementer checkout. Ignoring the whole
   generated `/.claude/` covers worktrees, pr-watch state, the serialized `settings.json` and the 24
   copies in one line; the drift gate already proves the copies equal their sources.
   (`investigation-generated.md` §6, `investigation-tooling.md` §2)

4. **Markdown: a structural no-op, with one hook break and one scope decision.** Under
   `proseWrap: "preserve"` (the default) plus `embeddedLanguageFormatting: "off"`, 61 of 62 files
   come out byte-different but with an identical parsed AST; the `<placeholder>` convention is
   untouched (1,094 tokens in, 1,094 out, zero escapes added); all thirteen shapes the hooks read
   survive. `proseWrap: "always"` costs 3.6× the churn, reflows every archived paragraph and still
   leaves 1,341 lines over 100 columns because tables are never wrapped. **The break:** Prettier
   normalises `*x*` to `_x_`, so the phase template's placeholder becomes `_(implementer…)_` and
   `reload-plan.ts:93` (`body.startsWith("*(implement")`) stops treating it as pending — after a
   compaction the orchestrator would be told every item has a status block when none does. The fix
   is one line in the hook. **The scope:** `docs/history/**` is 3,211 of the 3,731 changed lines
   (86%); excluding it leaves a 520-line pass. (`investigation-markdown.md` §1, §2, §4, §8)

5. **Where the step lives.** 26 anchors in the payload prose and 7 in this repo, all listed with
   line numbers; the load-bearing ones are SKILL §6 Verify, §11 step 4, the implementer's scoped
   validation and status block, the plan and PR-body templates, and the `Full check` line in both
   `CLAUDE.md`s. "Before the PR" means **before the final Orchestrate commit** — the archive commit
   after it may touch only `docs/` and `mem/`, and a reformat touches code. The guide already says
   formatting is something "CI gates separately" (`agent-workflow.md:342`); wiring a CI step makes
   that sentence true, and putting the check in the full check makes it need re-wording.
   (`investigation-process.md` §1, §2, §5)

6. **Enforcement the code supports today is CI plus the full-check line.** `rule-zero.conf` has
   three verbs (`deny`/`allow`/`guard`), each a regex over command text; no conf line runs anything
   or reads an exit code, and no shipped hook runs a check before permitting a tool call. A hook
   that refuses `gh pr create` until `format:check` passes would be a new hook file, a new
   `settings.json` matcher, and the assumption that every target project has a formatter — which
   the payload cannot make. A git pre-commit hook (husky) would not run in implementer worktrees,
   which inherit no `node_modules`. (`investigation-process.md` §4)

7. **Who runs it is constrained by a settled rule.** The orchestrator "edits documents only —
   never code" (`process.md:82-83`, `mem/outstanding.md`). A whole-repo `prettier --write .` by the
   orchestrator outside the small path breaks that rule. Two shapes survive it: each implementer
   formats the files it owns as part of scoped validation and the orchestrator only checks (fits
   every line as written); or one final "format the repo" implementer item per contribution
   (survives, but strains the "you own exactly your listed files" fence and must be its own
   phase). (`investigation-process.md` §5)

8. **The Playwright precedent applies exactly.** A tool is named only in the owned
   `template/CLAUDE.md` skeleton, and the managed prose says "the suite named by the E2E line in
   `CLAUDE.md`". A `Format:` line beside it, and prose that says "the formatter named by the
   Format line in `CLAUDE.md`, if the project has one", ships nothing to target projects and
   changes no dependency there. A `template/.prettierrc` would be a *managed* file landing in every
   target on every `update` — a different product decision. (`investigation-process.md` §3)

9. **A concurrent session shared this checkout.** While the investigators ran, another session
   created, committed and merged PR #6 on the same working tree (reflog measured: two checkouts
   and two commits, one of which briefly swept two of our reports into its index and then removed
   them). All four reports were measured at `8a9690e`; PR #6 touched `README.md`,
   `docs/history/index.md` and the three `.gitignore` files, so those rows may move by a few lines.
   Nothing load-bearing changes; the branch has been fast-forwarded to `050b765`.

10. **Two adjacent bugs Prettier did not cause.** `reload-plan.ts:67` looks for
    `**Source review:**` but the plan template writes `**Review:**` — that line has never been
    injected. And `templates/review.md:41`'s `**Rule-zero grants written:**` is a lazy continuation
    of list item `2.`, which Prettier makes visible by indenting it. (`investigation-markdown.md`
    Observations)

## What is right, and should not be changed

- **ESLint sits beside `tsc`** (`mem/outstanding.md`, 2026-08-25) — Prettier sits beside both, as
  a separate check; no `eslint-plugin-prettier`, and `eslint-config-prettier` is measured
  unnecessary.
- **Zero runtime dependencies.** Prettier is a dev dependency of the kit repo; a target project
  still installs nothing. The rule is about runtime (`CLAUDE.md`), and ESLint/TypeScript are the
  precedent.
- **The orchestrator edits documents only** (settled 2026-08-25). This shapes decision 2 below; the
  review does not propose to change it silently.
- **Generated root copies come only from `update`.** They are never hand-formatted; ignoring them
  keeps that invariant by construction.
- **`settings.json` is written in `JSON.stringify` shape on purpose** (`src/cli.ts:383`). Ignore it;
  do not teach `mergeSettings` Prettier's shape.
- **Playwright is named only in the owned skeleton** (decision 9, 2026-08-26). The formatter follows
  the same pattern.
- **This is not a small-path change.** It adds a dependency and touches a hook (`SKILL §11`:
  "adds no dependency and touches no gate or hook logic").

## Directions we could take

### A — Prettier for the kit repo; tool-agnostic prose in the payload

Prettier 3.9.6 as a dev dependency with `.prettierrc` (`printWidth: 100`,
`embeddedLanguageFormatting: "off"`), a `.prettierignore` for the generated surfaces, `pnpm format`
/ `pnpm format:check` scripts, the check in the full check and in CI. The payload's prose gains the
step in the places listed by the process investigation, worded like the E2E line; the owned
`template/CLAUDE.md` skeleton gains a `Format:` line naming Prettier as the default. `reload-plan.ts`
is fixed to accept both emphasis markers. One-off reformat of code, payload and root owned docs;
`dist/` rebuilt and the root copies regenerated. **Costs:** one dev dependency; a one-off diff of
roughly 800 lines (code 130–470 depending on decision 5, payload prose ~230, root docs ~50);
every implementer item that runs the formatter pays the worktree `pnpm install` it already pays
for lint. **Forecloses:** nothing — B and C both build on it.

### B — A, plus ship Prettier configuration to target projects

Add `template/.prettierrc` and `template/.prettierignore`, which `update` lands and rewrites in
every target project. **Costs:** the kit becomes opinionated about formatting in projects it does
not own; a target's own Prettier config is overwritten on `update` (or hands back a `.new` and
fails its own drift gate if it has one); the payload still cannot run the formatter it configures.
**Forecloses:** the "target installs nothing, kit ships process only" stance.

### C — A, plus a hook that refuses `gh pr create` while `format:check` fails

A new `PreToolUse` hook file and `settings.json` matcher, spawning the formatter named in
`CLAUDE.md`. **Costs:** new gate logic in the payload; it fails open on projects without a
formatter or closed on all of them; it is exactly the false-positive shape `rule-zero.conf` warns
"gets the kit thrown away". **Forecloses:** little, but it buys nothing CI does not already
enforce on the PR itself.

**Recommendation:** A. CI already enforces the outcome on every PR, the full check enforces it on
the orchestrator's own Verify, and the payload prose puts the step where the roles allow it. B and
C each add reach into target projects that the kit's zero-dependency stance rules out.

## Decisions we need from you

1. **Direction.** A, B or C. **Recommend A.**
2. **Who runs the formatter in the full loop.** (i) Each implementer formats the files it owns as
   the first line of its scoped validation (`pnpm exec prettier --write <files>`), the orchestrator
   runs `pnpm format:check` in Verify and formats the documents it writes itself; a failure on code
   becomes a phase N.5 item. (ii) One final "format the repo" implementer item per contribution, in
   its own phase. (iii) The orchestrator runs `pnpm format` itself before the final Orchestrate
   commit — the literal reading of the ask, but it amends the settled "edits documents only — never
   code" rule and would be recorded as such. **Recommend (i):** it fits every line of the roles as
   written, costs nothing new (implementers already install to lint), and the check catches any
   miss. On the small path the orchestrator formats directly, as it edits directly.
3. **Which Markdown is formatted.** (a) Everything, archives included (3,731 lines one-off; the
   archives are then checked forever). (b) Everything except `docs/history/**` (520 lines; archived
   records stay as written). (c) Code, the payload and the root owned documents (`CLAUDE.md`,
   `README.md`, `mem/`) only — every process record (`docs/history/`, `docs/reviews/`,
   `docs/plans/`, `docs/reports/`) is ignored (~300 lines of Markdown). **Recommend (c):** records
   are what was written by whoever wrote them; a live phase file is edited by several implementers
   who own only their section, so a check on it would be noise; and the orchestrator's only
   contact with the formatter stays a read.
4. **Print width.** 100 (467 code lines, matches where the source sits) · 80, the default
   (1,115 lines) · 120 (309 lines, licenses width the code does not use). **Recommend 100.**
5. **The two dense literal tables** (`CASES` in `rule-zero-selftest.ts`, the extension `Set`s in
   `docs-only.ts`). `// prettier-ignore` on each, keeping 337 lines of table as table · let Prettier
   explode them one entry per line. **Recommend the ignore comments.**
6. **Version pin.** Exact `"prettier": "3.9.6"` — formatter output drifts across minors and a
   drifted local install fails `format:check` for reasons unrelated to the change · `^3.9.6`, like
   the other dev dependencies. **Recommend exact**, named as a deliberate deviation.
7. **Enforcement.** `pnpm format:check` in both the full check (`CLAUDE.md`) and CI, first step
   under "cheapest gate first" · CI only · full check only. **Recommend both**; the guide's sentence
   at `agent-workflow.md:342` is re-worded to match.
8. **Naming the tool in the payload.** A `Format:` line in the owned `template/CLAUDE.md` skeleton
   naming Prettier as the default, with managed prose saying "the formatter named by the Format line
   in `CLAUDE.md`, if the project has one" (the Playwright pattern) · managed prose only, no
   default named. **Recommend the Playwright pattern.**
9. **`reload-plan.ts`.** Fix `:93` to accept `_(implement` as well as `*(implement` (required —
   the formatted phase template will carry the underscore form) **and** fix the adjacent `:67`
   `Source review` → `Review` mismatch in the same item · fix `:93` only and ledger `:67`.
   **Recommend both in one item**, each with a test.
10. **Where those tests live.** A `node:test` file under a new `test/` directory, run by
    `pnpm test` = `node --test test/` and added to CI — this pre-decides the location for the
    kit-conformance follow-up's suite (`mem/outstanding.md`, item (b)) · a self-test script in the
    style of `rule-zero-selftest.ts`. **Recommend `test/`:** it is outside the payload (a test under
    `template/.claude/hooks/` would land in every target and change `doctor`'s hook count) and
    outside `dist/`.
11. **`git blame` after the one-off reformat.** A later small-path contribution adds
    `.git-blame-ignore-revs` with the squash SHA once it exists (nothing in the repo can record it
    before the merge) · skip it. **Recommend the follow-up**, recorded in `mem/outstanding.md`.
12. **Merge method** when you give the word: squash (the repo's habit) · merge commit.
    **Recommend squash.**

**Rule-zero actions the plan would need:** none before the merge. The merge itself is the usual
`--bundle merge-cleanup <pr> <branch>` on your word at §9 (this PR is code, not docs-only).

## What this review did not do

- Ran no `prettier --write` anywhere; every number is from `prettier <file> | diff`, never a
  formatted checkout. ESLint and `tsc --noEmit` were not run over formatted output (Node's own
  type-stripper was: 9/9 hooks `node --check` clean). A `no-useless-assignment` surprise on
  formatted code is unverified until the implementer runs the full check.
- Did not render any Markdown; "bytes only" rests on identical parsed ASTs.
- Did not drive `reload-plan.ts` or `status-block.ts` end to end; their regexes were extracted and
  run against real and formatted files.
- Did not re-measure `README.md` and `docs/history/index.md` after PR #6 (a few lines each; not
  load-bearing).
- Did not measure the effect of `// prettier-ignore` on the two literals (the 337-line figure
  assumes the comment suppresses the whole literal).
- Did not evaluate Prettier `overrides` as an alternative to `.prettierignore` for the records.

---
<!-- Appended at the Questions phase; the review is not rewritten above this line. -->
