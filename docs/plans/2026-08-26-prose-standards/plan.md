# Plan — How the agents speak, and how implementers write code (2026-08-26-prose-standards)

**Date:** 2026-08-26 SAST
**Review:** `docs/reviews/2026-08-26-prose-standards/review.md` — direction **A** (prose only)
plus the one-line CI fix (decision 11), decisions 1–15
**Issue:** none
**Branch:** `feat/2026-08-26-prose-standards` off `main` (`8a8aada`); **rebased onto `main`
after PR #4 merges, before phase 1 is dispatched** (decision 13) — the post-rebase base SHA is
recorded under *Orchestrator work* below when it happens
**Owner go-ahead:** 2026-08-26 at the Questions phase — "A — prose only"; "I-<n.m>:"; "Yes,
I-r<cycle>.<k>:"; "Yes, Investigator-<topic>:"; "Duplicate code needs to come from the
investigation - the plan needs the direction already locked in."; "template/CLAUDE.md only";
"No — leave rule zero prose as is"; "Include the one-line fix after all"; "Merge #4 first; I
rebase before dispatch"; "Merge when silent — squash, --admin"
**Phases:** `phase-1.md` (6 items, parallel: one payload file family each, plus the CI line) ·
`phase-2.md` (1 item, serial: regenerate the root copy and the lock) · `phase-3.md` (1 item,
serial: README — run under the regenerated `implementer.md`, which is the live measurement of
the identity and narration standards) · `phase-<n>.5.md` added if verification finds anything

## Measured facts (from the investigations; do not re-derive)
| Fact | Value | Where measured |
| --- | --- | --- |
| Existing text on identity, narration, code structure | **none** — zero matches for identify/prefix/one-liner/narrat/modular/reuse/separation of concerns/pure/duplicate across the payload | investigation-prose-map.md §A |
| Tests as acceptance today | plan-side only: guide §5 "An item without a test in its acceptance is not done when the agent says it is"; `implementer.md` never requires writing one, only verifying one | investigation-prose-map.md §A row 9, observation 7 |
| The ownership fence | `implementer.md` "You own exactly the files listed under **Files** … stop and report **Blocked**"; guide §6 "own only your files"; phasing by magnet files in SKILL §5, guide §5, `templates/plan.md` | investigation-prose-map.md §B1 |
| The kit's noun | "item", 40+ occurrences; "task" zero | investigation-prose-map.md observation 2 |
| Where `n.m` reaches an implementer | the one-line dispatch (`Implement item <n.m> of …`) and the status heading `#### Status — item n.m` | investigation-prose-map.md §B2 |
| PR-review loop implementers | inline briefs, no plan, no item number; `status-block.ts` stands down when `docs/plans/` is empty | investigation-prose-map.md §B3 |
| Sub-agent intermediate text | not shown to the user by default; final message only; transcript via `/tasks` | Claude Code docs (sub-agents page) — a documented claim |
| Managed vs owned | `process.md`, `SKILL.md`, templates, both agent definitions, the guide are **managed** (reach installed projects on `update`); `CLAUDE.md`, `mem/*`, `docs/history/index.md`, `rule-zero.conf` are **owned** (new installs only); README is not in the payload | investigation-prose-map.md §D; `src/cli.ts:31-41` |
| Root copy parity today | all 25 comparable files byte-identical to `template/` | investigation-prose-map.md §E |
| CI drift gate pathspec | `git status --porcelain --untracked-files=all -- .claude/` — `docs/guides/agent-workflow.md` is managed, rewritten by `update`, and outside the pathspec | `.github/workflows/ci.yml:44-49`; investigation-prose-map.md observation 8 |
| The lock | `.claude/cl-workflow.lock` holds a sha256 per managed file; any prose change to the payload changes it; `docs-only.ts` classifies it as code (no doc extension, not under `docs/`/`mem/`) | `docs-only.ts:41-49`; orchestrator, PR #4's lock diff |
| Duplicate functions in the kit | `isRecord` byte-identical in `src/cli.ts:95` and `lib.ts:22` (build boundary, keep); `parseOptions` structural duplicate in `docs-only.ts`/`pr-watch.ts` (follow-up); `git` same name, different contracts (keep) | investigation-mechanisms.md §3 |
| Kit's own conformance | `src/cli.ts` 579 effective lines, `cmdDoctor` complexity 41; 85 of 86 functions with no direct test; every hook but `lib.ts` runs `main()` at import | investigation-mechanisms.md §1–2; investigation-tests.md §1–2 |
| Playwright | named nowhere; `@playwright/test` 1.62.1 fails the kit's `node:`-only import rule; `npx playwright install` silent to the gate | investigation-tests.md §5–6 |
| PR #4 hunks in the same files | `process.md` lines 6, 30, 32, 48; `SKILL.md` 3, 8, 14, +§11 at 245; guide 4, 51, 58, +§11 at 426, appendices at 474/497; `template/CLAUDE.md` 21 | orchestrator, `git diff -U0 origin/main...origin/chore/2026-08-26-small-path` |
| Prefix conformance this session | orchestrator 6/6 text blocks; sub-agents 0; narration before a tool call 16–78% | investigation-mechanisms.md §4 |

## Owner decisions this plan rests on
Review → Decisions, 2026-08-26: 1 direction **A** · 2 **`I-<n.m>:`** · 3 **`I-r<cycle>.<k>:`**
in the review loop · 4 **`Investigator-<topic>:`** · 5 no hook check · 6 **duplicates found at
investigation, locked in by the plan** · 7 words now, numbers with the refactor · 8 three
follow-ups in the ledger (done) · 9 **Playwright in `template/CLAUDE.md` only** · 10 rule-zero
prose unchanged · 11 **CI pathspec fix included** · 12 not recorded · 13 **#4 first, rebase
before dispatch** · 14 `parseOptions` follow-up · 15 **merge when silent, squash, `--admin`**.

## Canonical wording — every item copies these; adapt only the surrounding sentence
Six implementers write the same rules into six files. To keep one voice, the rule text is fixed
here. An item may shorten a wording for a bullet list or expand it with the reasoning the guide
gives, but the terms (`Orchestrator:`, `I-<n.m>:`, `I-r<cycle>.<k>:`, `Investigator-<topic>:`,
"one concern per file", "the suite named by the E2E line in `CLAUDE.md`") are fixed.

- **W1 Identity.** *Every text block you write begins with your name: the orchestrator writes
  `Orchestrator:`, an implementer `I-<n.m>:` (its plan item — `I-2.3:`), an implementer on an
  inline brief in the PR-review loop `I-r<cycle>.<k>:` (the brief names it — `I-r2.1:`), an
  investigator `Investigator-<topic>:` (the stem of its report file — `Investigator-mechanisms:`).*
- **W2 Narration.** *Before each tool call, one line — prefixed like every other — saying what
  you are about to do and why: "Orchestrator: reading the drift gate in `ci.yml` to see which
  paths it inspects." Not what you did; the result says that.*
- **W3 Modular.** *Write modular, reusable code: small functions with one job each, composed;
  the piece you need next week should be liftable without the piece beside it.*
- **W4 No duplicate functions.** *Never implement a function that already exists. Finding the
  copies is investigation work — an investigator lists the functions a change will need and
  their existing copies — and the plan locks in the generalization: the shared module is in the
  **Files** of the item that generalizes it. If you meet a duplicate the plan did not foresee and
  its file is not yours, report **Blocked** naming the function; do not copy it and do not edit
  outside your files.* (The guide adds the three cases: a real duplicate is generalized into the
  shared module; same name with a different contract stays two functions; a copy across a build
  boundary — `dist/` and the payload must each stand alone — stays, with the boundary named in a
  comment.)
- **W5 Short files.** *One concern per file. A file you cannot summarize in one sentence is two
  files. Keep files short; no number is given — the project's lint carries one if it wants one.*
- **W6 Pure functions.** *Prefer pure functions — inputs to outputs, no hidden state, no I/O
  inside — and keep I/O at the edges, so the logic can be tested by calling it.*
- **W7 Tests.** *Every implementation pairs with tests for its logic — a test that fails when the
  change is reverted. Browser-based visual tests use the suite named by the E2E line in
  `CLAUDE.md`; the orchestrator still appraises the screenshots that suite produces.*
- **W8 Playwright (owned `template/CLAUDE.md` only).**
  `- E2E: \`<cmd>\` (\`<which suites cover which surfaces>\`; browser-based visual tests: Playwright — \`<cmd>\`)`
- **W9 The orchestrator's duties that follow.** *Investigator briefs ask for the functions a
  change will need and their existing copies. Plan items that generalize a function list the
  shared module under **Files**. After each phase merge, `git grep` the names of functions the
  phase added for a second definition. Each inline brief in the PR-review loop opens with "You
  are `I-r<cycle>.<k>`."*

## Decisions made by this plan — veto here or in the PR
- **Where each standard lives.** `process.md` (always loaded) carries W1, W2 and a five-line
  code section (W3–W7) — short, the way it carries rule zero. `implementer.md` carries W1–W7 in
  full plus the Blocked rule. `investigator.md` carries W1, W2 and the copies duty (W4's first
  half). `SKILL.md` carries the orchestrator's own W1/W2 at the top and W9 in §2, §5, §6, §8.
  The guide carries the reasoning: a new **§0.5 How agents write** after the habits, and one
  sentence each in §2, §5, §6, §8, Appendix C and Appendix D. Templates get the slots
  (`investigation.md` a facts row for copies; `phase.md` a **Files** hint; `plan.md` nothing new).
- **The status block gains one line** — `**Tests:** <files added or changed — or "none: no
  logic" with the reason>` — between **Validation** and **Blocked on**. The `SubagentStop` hook
  is unchanged (direction A); the line is prose the orchestrator reads.
- **The small path (PR #4, SKILL §11) is covered by the top-of-skill rule**, not by its own
  sentence: the orchestrator narrates and prefixes on every path because the rule is stated
  where the role is assigned. Items touching `SKILL.md`/`process.md`/the guide preserve #4's
  text after the rebase and add nothing to §11.
- **Prose items have no tests and say so.** W7 binds code; each prose item's acceptance is a
  grep that exits 0 with the change and 1 without it — the "what must fail if reverted" for
  prose — and its status block's **Tests** line reads "none: no logic".
- **The CI line (item 1.6)** is `.claude/ docs/guides/`, not `.claude/ docs/` — `docs/history/`
  and `docs/plans/` legitimately differ from the payload's empty scaffolding in this repo.
  The two prose descriptions of the gate (root `CLAUDE.md` Commands, README "Full check")
  change in step; the README change rides in phase 3 with the rest of the README work.
- **README gains one short paragraph** on how the agents speak and what implementers are held
  to (phase 3), placed under the process description; the file is not in the payload, so this
  is for the human reading the kit's front page.
- **Root `CLAUDE.md` Process section is unchanged** beyond the gate command: it already points
  at `process.md`, which now carries the standards.
- **Appendix D gets one row**: "Agents unnamed; no code-structure rules" → "Every agent
  prefixes its text with its name and narrates before tool calls; implementer code standards
  and tests-with-logic in the definition; duplicates found at investigation" → "Owner's
  standard, 2026-08-26; prose by the owner's choice (direction A)".
- **Phase 3 is the live measurement.** Item 3.1 is dispatched only after phase 2 has
  regenerated the root `.claude/agents/implementer.md`; the orchestrator records in the
  verification whether that implementer's final message began with `I-3.1:` and whether its
  transcript narrated before tool calls — the first measurement of the standard on a live
  sub-agent, replacing the 0% baseline.

## Decisions made mid-loop — implemented; veto in the PR
<!-- appended as the loop runs, dated -->

## Phasing
Phase 1 — six items in parallel, one file family each, no magnet file shared: `process.md` /
the two agent definitions / the guide / `SKILL.md` / templates + `template/CLAUDE.md` /
`ci.yml` + root `CLAUDE.md`. All under `template/` except 1.6; nobody touches the generated root
`.claude/` or `docs/guides/` root copy, the lock, or README.
Phase 2 — one item, serial, on the merged and verified phase 1: `node dist/cli.js update .`
regenerates the root copy and the lock; the gate with the widened pathspec is the acceptance.
Phase 3 — one item, serial, after phase 2 has regenerated `implementer.md`: README.

## Orchestrator work (documents only)
- After PR #4 merges: `git fetch`, `git rebase origin/main`, resolve any overlap in documents
  (the review directory and ledger only — nothing under `template/` has been touched yet),
  record the new base SHA here: **base after rebase: `<sha>`** — then commit the plan and
  dispatch phase 1.
- Plan directory committed before dispatch; ledger already updated at Questions.
- Per phase: merge-back sequence, verification record in the phase file, `phase-<n>.5.md` for
  findings.
- Archive; `docs/history/index.md` line; `mem/` and `CLAUDE.md` re-read; PR with
  `templates/pr-body.md`; review loop; merge on decision 15.

## Orchestrator validation (after each phase merge, and at the end)
- Full check: `pnpm lint && pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm
  selftest` (62/62) — `dist/` must not move (no `src/` change in this plan).
- The gate, widened: `node dist/cli.js update . && git status --porcelain --untracked-files=all
  -- .claude/ docs/guides/` prints nothing after phase 2; **checker verified** by hand-editing
  the root guide, seeing the `.new` appear under the new pathspec and *not* under the old one,
  then restoring.
- Read the full diff of every prose file; grep every canonical term across all changed files
  for a divergent spelling (`I-<n.m>` vs `I-n.m`, `Investigator-` vs `Investigator:`); re-read
  every sentence the change made true or false, including PR #4's §11 after the rebase.
- Root copy parity: `diff -q` of all 25 template/root pairs after phase 2; lock hashes changed
  for exactly the managed `.md` files phase 1 touched.
- `.claude/rule-zero.log` for any denial an implementer hit.
- Phase 3: the live prefix/narration measurement recorded in `phase-3.md`.
- `docs-only.ts --base origin/main` on the final branch: expected **exit 3** (the lock and
  `ci.yml`); recorded, not acted on — decision 15 governs the merge.

## Blocked on the owner
None. Merging PR #4 is the owner's, recorded under *Open — owner follow-ups* in the ledger and
removed at archive; it is a sequencing wait the owner chose, not a blocked item.
