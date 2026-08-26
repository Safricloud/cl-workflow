# Phase 1 — 6 implementers, parallel (2026-08-26-prettier)

**Plan:** `plan.md` · **Starts from:** branch head `de5994a` (`main` `050b765` + review + decisions)
**Magnet files this phase touches:** `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`,
`README.md` (item 1.1 only) and `tsconfig.json` (item 1.2 only) — no two items share a file, so
every merge is clean by construction. Nobody edits the root `.claude/`, `docs/guides/`, `dist/`
or the root `CLAUDE.md`.

**Every implementer:** your worktree has no `node_modules` — run `pnpm install --frozen-lockfile`
first (item 1.1 runs `pnpm install` unfrozen, it changes the lockfile). No `git stash` (shared
across worktrees), no `git checkout -- <path>` (guarded); to see a file's committed text use
`git show HEAD:<path>`. Scratch files stay inside your worktree and are deleted before you
finish. Prettier is not installed until 1.1 lands; where an item needs it, run
`pnpm dlx prettier@3.9.6 --print-width 100 --embedded-language-formatting off <file>` (prints
the formatted text to stdout; `--check`/`--write` as stated). Format the files you own before
each commit (plan decision P3) — for a Markdown file that means `--prose-wrap preserve` (the
default) — and put the result on your status block's first validation line.

### Item 1.1 — Prettier as a devDependency: config, ignore list, scripts, CI, README
**Files:** `package.json`, `pnpm-lock.yaml`, `.prettierrc`, `.prettierignore`,
`.github/workflows/ci.yml`, `README.md`
**Approach:**
- `pnpm add -D prettier@^3.9.6` (decision 6; facts: 3.9.6 is `latest`, zero dependencies). Verify
  the installed version from `node_modules/prettier/package.json`, not the manifest.
- Scripts exactly as plan decision P4: `format`, `format:check`, `test`. Keep the existing four.
- `.prettierrc` (JSON, plan decision P1):
  ```json
  { "printWidth": 100, "embeddedLanguageFormatting": "off" }
  ```
- `.prettierignore` (plan decision P2; owner decision 3), with the comments — each line is a
  measured hazard, see the facts table:
  ```
  # tsc output — CI rebuilds it and diffs (dist/ drift gate)
  dist/
  # pnpm's own serialization
  pnpm-lock.yaml
  # Generated root copies of template/ — format template/, then `node dist/cli.js update .`.
  # Also covers .claude/settings.json (serialized by the CLI), worktrees/ and pr-watch/ (live
  # state Prettier would otherwise reach: it reads only the root .gitignore).
  /.claude/
  /docs/guides/agent-workflow.md
  # Serialized by mergeSettings (src/cli.ts) in JSON.stringify shape; stays byte-identical
  template/.claude/settings.json
  # Process records stay as written (owner, 2026-08-26-prettier, decision 3)
  /docs/history/
  /docs/reviews/
  /docs/plans/
  /docs/reports/
  ```
- `ci.yml`: `- run: pnpm format:check` as the first step under the `# Cheapest gate first.`
  comment (before `pnpm lint`); `- run: pnpm test` after the self-test step, before the CLI
  smoke. Single-line `run:` steps need no `shell: bash` (fact). Keep the comment style of the
  file. Do not touch the job names — `ci-ok` is the required check.
- `README.md`: the Development block gains `pnpm format:check` as its first command line
  (comment: `# prettier --check . — first step of the full check; pnpm format writes`) and
  `pnpm test` after `pnpm selftest` (comment: `# node --test over test/**/*.test.ts`); the "CI and
  the branch ruleset" paragraph's step list gains "format check" first and "the `node:test` suite"
  after the self-test. Nothing else in the README.
- Do **not** run `pnpm format` / `prettier --write .` over the repo — that is the orchestrator's
  close-out (owner decision 2, plan P7). Format only the files you own that Prettier covers
  (`package.json`, `.prettierrc`, `README.md`, `ci.yml`): `pnpm exec prettier --write <those>`.
**Conventions that will fail your lint:** the lockfile must be the one `pnpm add` writes (CI
installs `--frozen-lockfile`); LF everywhere; `eslint.config.mjs` is untouched (no
`eslint-config-prettier` — measured unnecessary).
**Scoped validation:** `pnpm install` (unfrozen, once, for the add) → `pnpm exec prettier
--version` prints `3.9.6` → `pnpm format:check` **exits non-zero** and its list includes
`src/cli.ts`, `template/.claude/hooks/rule-zero.ts`, `CLAUDE.md`, `template/CLAUDE.md` and does
**not** include `dist/cli.js`, `pnpm-lock.yaml`, `.claude/settings.json`,
`template/.claude/settings.json`, `.claude/pr-watch/`, anything under `docs/history/`,
`docs/reviews/` or `docs/plans/` (record the list length and the checked paths) →
`pnpm exec prettier --check package.json .prettierrc README.md .github/workflows/ci.yml` clean →
`pnpm lint && pnpm typecheck` green → `pnpm install --frozen-lockfile` succeeds on the new lock.
**Acceptance:** the four scripts present with the exact strings of P4; `pnpm format:check`
red-with-the-right-list on the unformatted tree (the checker, seen failing); `.prettierignore`
excludes exactly the paths above (measure with `pnpm exec prettier --file-info <path>` for one
path of each family: `"ignored": true`); CI has the two new steps in the stated positions. Tests:
none — configuration; say so.
#### Status — item 1.1
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.2 — `reload-plan.ts`: accept the underscore placeholder, read `**Review:**`; tests in `test/`
**Files:** `template/.claude/hooks/reload-plan.ts`, `test/reload-plan.test.ts`, `tsconfig.json`
**Approach:**
- `reload-plan.ts:93`: pending when the body is empty **or** starts with `*(implement` **or**
  `_(implement` (Prettier prints `*x*` as `_x_`; fact). Keep the shape of the line; one comment
  saying why both markers.
- `reload-plan.ts:67`: the key list becomes `["Review", "Branch", "Owner go-ahead"]` — the plan
  template writes `**Review:**` (`templates/plan.md:4`); `Source review` has never matched
  (fact). The printed label follows the key (`  Review: …`).
- `tsconfig.json`: add `"test"` to `include` so `pnpm typecheck` and ESLint (`projectService`)
  cover the test.
- `test/reload-plan.test.ts` — `node:test` + `node:assert/strict`, black-box (plan decision P5):
  build a fixture root with `fs.mkdtempSync(path.join(os.tmpdir(), "reload-plan-"))` at run time
  (runtime writes to the OS temp dir are not tool calls; the hook does not see them), containing
  `docs/plans/2026-01-01-fixture/plan.md` (`# Plan — fixture`, `**Review:** docs/reviews/x/review.md`,
  `**Branch:** \`feat/x\``, `**Owner go-ahead:** 2026-01-01 — "yes"`, an `## Owner decisions this
  plan rests on` section with one line) and `phase-1.md` with four items: 1.1 whose status body is
  `*(implementer keeps this current as it works: In progress → Done | Blocked)*`, 1.2 whose body is
  the underscore form `_(implementer keeps this current as it works: In progress → Done | Blocked)_`,
  1.3 whose body starts `**In progress**`, 1.4 whose body starts `**Done**`. Spawn the hook:
  `spawnSync(process.execPath, [hookPath], { input: JSON.stringify({ cwd: root }), env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: "utf8" })`
  where `hookPath` resolves `template/.claude/hooks/reload-plan.ts` from `import.meta.dirname`.
  Assert: exit 0; stdout contains `Review: docs/reviews/x/review.md`; contains
  `Items without a status block: 1.1 — ` and `1.2 — ` and `1.3 — … (in progress)`; does **not**
  contain `1.4 —` in that line; does not contain `Every item has a status block`. A second test:
  an empty fixture (no `docs/plans/`) prints the `docs/plans/ is empty` sentence. Clean the temp
  dir in `after`.
- The tests must **fail against the unfixed hook**: with `:93` reverted, `1.2 —` is absent from
  the pending list; with `:67` reverted, `Review:` is absent. Verify both (revert one line at a
  time — `git show HEAD:template/.claude/hooks/reload-plan.ts` gives the pre-change text; restore
  by re-applying your edit, never `git checkout --`), record both results.
**Conventions that will fail your lint:** `node:` imports only, relative imports carry `.ts`;
`noPropertyAccessFromIndexSignature` (`process.env["CLAUDE_PROJECT_DIR"]`);
`noUncheckedIndexedAccess`; no `!`; `@typescript-eslint/no-floating-promises` — `test()` returns
a promise: `await test(…)` at top level or `void test(…)`; `spawnSync` with `encoding: "utf8"` so
`stdout` is a string (and `?? ""` it — a failed spawn yields `null`, ledger); no unused locals.
`erasableSyntaxOnly`: no enums/namespaces.
**Scoped validation:** `pnpm install --frozen-lockfile` → `node --test "test/**/*.test.ts"`
(the `test` script lands with item 1.1; run the command directly) → `pnpm lint && pnpm
typecheck` → `pnpm selftest` still 62/62 → format `reload-plan.ts` and the test with
`pnpm dlx prettier@3.9.6 --print-width 100 --write <files>` and re-run the three.
**Acceptance:** `node --test` reports ≥ 3 tests, 0 failures; each fix seen to fail its test when
reverted, then pass; `pnpm typecheck` covers `test/` (a deliberate type error in the test file
fails it — try it, restore); lint clean.
#### Status — item 1.2
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.3 — SKILL §6/§11, plan and PR-body templates, the owned `CLAUDE.md` skeleton
**Files:** `template/.claude/skills/contribute/SKILL.md`,
`template/.claude/skills/contribute/templates/plan.md`,
`template/.claude/skills/contribute/templates/pr-body.md`, `template/CLAUDE.md`
**Approach:** apply plan decision P6 verbatim at the anchors measured in
`docs/reviews/2026-08-26-prettier/investigation-process.md` §1 (line numbers at `050b765`; read
the file, do not trust the number blindly):
- **W2** replaces the SKILL §6 close-out paragraph (`SKILL.md:176-177`, "When every item is Done
  … lockfile diff explained.").
- **W5** at the §6 Verify sentence (`:146`, "full check and build") and at §11 step 4
  (`:283-284`). §11 step 3 gains, after "never the root copy.": *Format the files you changed with
  the formatter named in `CLAUDE.md`, if there is one.*
- **W7** in `templates/plan.md` (`:33-35`) and `templates/pr-body.md` (`:12-14`).
- **W1** in `template/CLAUDE.md` Commands (`:5-10`): the `Full check` line re-labelled, the
  `Format:` line inserted directly after it.
- Nothing else changes; §7 is not touched (the format run is not a §7 step — fact). Re-read every
  sentence you changed for the one-line-before-a-tool-call voice rule; the SKILL's opening
  paragraph and §1 are unchanged.
**Conventions that will fail your lint:** prose only — but the root copies are generated: never
edit `.claude/skills/…`; the orchestrator regenerates them. Keep lines ≤ ~100 columns like their
neighbours. Format each file before committing (`pnpm dlx prettier@3.9.6 --print-width 100
--embedded-language-formatting off --write <file>`) — the `<placeholder>` convention survives
(fact: 1,094 → 1,094).
**Scoped validation:** `git grep -n "full check and build" template/` → no hit in your files;
`git grep -n "Format line" template/` → your four files carry the wording; `pnpm dlx
prettier@3.9.6 --print-width 100 --embedded-language-formatting off --check <your four files>` clean.
**Acceptance:** the four anchors carry W1/W2/W5/W7 verbatim; no other line of the four files
changes except what formatting moved; the naming table and the §9 merge block in SKILL are intact
(`git diff` read). Tests: none — prose; say so.
#### Status — item 1.3
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.4 — The guide: roles, Verify, the CI sentence, commit, small path, appendices
**Files:** `template/docs/guides/agent-workflow.md`
**Approach:** apply plan decision P6 verbatim at the anchors in `investigation-process.md` §1
(line numbers at `050b765`; read the file):
- **W3** at §0.2 roles (`:59-62`, "**Edits documents only — never code.** Every code change goes
  through an implementer — except on the small path…") — keep the bold on the rule, add the second
  exception; and the Appendix D row at `:606` ("Trivial fixes applied by the orchestrator | …")
  gains the same exception in its right-hand cell.
- **W5** at the §6 Verify paragraph (`:336-337`, "Full check and build.") and at §11 "What stays"
  (`:508-512`).
- **W6** replaces `:341-343`.
- **W2** at the §6 "Commit" paragraph (`:374-376`), guide voice (the guide explains why: one
  sentence on why the orchestrator, not an implementer, runs it — it is deterministic, and the
  check in CI is the evidence).
- **W8**: Appendix C lines `:573` and `:590`; Appendix D new row appended to the table.
- §7 untouched. Nothing else.
**Conventions that will fail your lint:** prose; lines ≤ ~100 columns; the root copy
`docs/guides/agent-workflow.md` is generated — do not edit it. Format before committing
(`pnpm dlx prettier@3.9.6 --print-width 100 --embedded-language-formatting off --write <file>`);
tables will be re-padded (fact: bytes only).
**Scoped validation:** `git grep -n "CI gates them separately" template/docs` → shows W6's form;
`git grep -n "Full check and build" template/docs` → none; `pnpm dlx prettier@3.9.6 --print-width
100 --embedded-language-formatting off --check template/docs/guides/agent-workflow.md` clean.
**Acceptance:** the six anchors carry the wording; the Appendix D table has one new row and one
amended cell; `git diff` read in full — only those hunks plus formatting. Tests: none — prose.
#### Status — item 1.4
*(implementer keeps this current as it works: In progress → Done | Blocked)*

### Item 1.5 — `implementer.md`, `process.md`, the payload ledger stub
**Files:** `template/.claude/agents/implementer.md`, `template/.claude/rules/process.md`,
`template/mem/outstanding.md`
**Approach:** plan decision P6:
- **W4** in `implementer.md`: a new first bullet under `## Validation` (`:75`), and the status
  block's Validation sub-lines (`:109-111`) gain the new first sub-line. Keep the `E2E line`
  sentence at `:64-66` — it is the pattern being copied.
- **W3** in `process.md` Roles (`:82-83`).
- **W3** in `template/mem/outstanding.md` — the settled line at `:28-29` ("The orchestrator edits
  documents only; every code change goes through an implementer — except on the small path,
  below.") gains the second exception with the attribution *(owner, 2026-08-26-prettier,
  decision 2)*.
- Nothing else.
**Conventions that will fail your lint:** prose; root copies (`.claude/agents/`, `.claude/rules/`)
are generated — do not edit them; `template/mem/outstanding.md` is owned, edit it in `template/`
only. Format before committing (`pnpm dlx prettier@3.9.6 --print-width 100
--embedded-language-formatting off --write <file>`); the agent's YAML front matter is untouched by
that option (fact).
**Scoped validation:** `git grep -n "Format line" template/.claude/agents template/.claude/rules
template/mem` → three files hit; the front matter of `implementer.md` is byte-identical to `git
show HEAD:template/.claude/agents/implementer.md | head -9`; prettier `--check` clean on the three.
**Acceptance:** W3 in two places and W4 in two places, verbatim; front matter unchanged. Tests:
none — prose.
#### Status — item 1.5
**Done** (implementer, 2026-08-26).
- **Files touched:** `template/.claude/agents/implementer.md` — W4 as the new first `## Validation`
  bullet (`:77-79`) and as the new first status-block validation sub-line (`:113`);
  `template/.claude/rules/process.md` — W3 in the Orchestrator role (`:82-84`), plus the formatter's
  own `*Blocked on the owner*` → `_…_` at `:22`; `template/mem/outstanding.md` — W3 on the settled
  line (`:32-35`) with the attribution, one reflow (see Deviation), plus the formatter's blank lines
  after four headings.
- **Commits:** see the worktree branch `worktree-agent-a6677e42912c115ce` (this commit).
- **Deviation:** two, both measured, neither changes a word.
  (a) **Prettier rewrites a settled ledger line.** `template/mem/outstanding.md` carried
  `` labelled `blocked-on-owner` `` / `  + kind + area, created before the archive. (owner)` — a
  continuation line starting with `+ `, which CommonMark (and Prettier) read as a **nested list
  marker**; `--write` turned it into `  - kind + area, …`. I reflowed the line instead (moved
  `` `blocked-on-owner` `` down so the `+` is no longer line-initial); Prettier then leaves it
  alone. No word changed. The markdown investigation's bucket table reports "List markers `*` →
  `-`: **0** — the corpus uses `-` throughout"; that is true of `*`, but the `+` continuation was
  not surfaced (the mdast is unchanged, so the AST comparison could not see it).
  **The root twin `mem/outstanding.md:197-198` still has it** and is not my file — the close-out
  `pnpm format` (P7) will rewrite it to a `-` bullet unless the orchestrator reflows it the same way.
  (b) W4 is applied **verbatim, without a bold lead-in**, so it does not match the `- **Write the
  tests**` shape of its sibling bullets. Grounds: the plan fixes the wording and W2 carries its own
  emphasis where it wants it, so I did not add bytes to W4.
- **Fact to correct:** the item's scoped validation says `git grep -n "Format line" template/.claude/agents
  template/.claude/rules template/mem` → "three files hit". It hits **one file, one line**
  (`implementer.md:77`): W4 is the only canonical wording containing the phrase "Format line";
  W3 says "the formatter run before the final Orchestrate commit". The three-file check is
  `git grep -n "formatter" …` → 4 hits in 3 files, run below.
- **Verified against the installed package before writing:** prettier 3.9.6 via `pnpm dlx`
  (no `node_modules` in this worktree; `pnpm install --frozen-lockfile` not needed — no lint,
  typecheck or test in this item's scoped validation).
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm dlx prettier@3.9.6 --print-width 100 --embedded-language-formatting off --check` over the
    three files — **clean** (`All matched files use Prettier code style!`, exit 0)
  - **Checker verified:** the same `--check` before the `--write` was **red** — exit 1, two files
    listed (`process.md`, `outstanding.md`); `implementer.md` was already clean, i.e. W4 needed no
    reformatting. After `--write`, green. (No unit test: no logic — prose.)
  - `git grep -n "formatter" template/.claude/agents template/.claude/rules template/mem` — 4 hits
    in **3 files** (`implementer.md:77,113`, `process.md:83`, `outstanding.md:33`)
  - `git grep -n "Format line" …` — 1 hit, `implementer.md:77` (see Fact to correct)
  - front matter: `head -9` of the file `cmp`-equal to `head -9` of
    `git show HEAD:template/.claude/agents/implementer.md` — byte-identical, before and after the
    format run
  - `git grep -n "except on the small path"` over my three areas — no hit (no stale copy left)
  - `git status --porcelain --untracked-files=all` — only my four files; no scratch files left
- **Tests:** none — prose only (three managed/owned Markdown documents; no logic to test). The
  formatter check above is the mechanical checker for this item, and it was seen failing.
- **Blocked on:** nothing. One hook denial, on a *read-only* compound command: `git grep … && diff
  <(git show HEAD:…) <(head -9 …)` was refused as "too complex to verify that it stays inside the
  worktree"; re-run as separate plain commands, same result.
- **Orchestrator should verify:** the root `mem/outstanding.md:197-198` `+ kind + area` line before
  the close-out `pnpm format` (Deviation (a)); the regenerated root copies of `implementer.md` and
  `process.md` after `node dist/cli.js update .`; the full check.

### Item 1.6 — `// prettier-ignore` on the two literal tables
**Files:** `template/.claude/hooks/rule-zero-selftest.ts`, `template/.claude/hooks/docs-only.ts`
**Approach:** a `// prettier-ignore` line directly above `const CASES: readonly Case[] = [`
(`rule-zero-selftest.ts:50`) and directly above `const COMMENT: ReadonlyArray<…> = [`
(`docs-only.ts:52`), each followed by a short comment saying why (a truth table read as a table;
a lookup read as a table — owner decision 5). Prettier honours the comment for the whole
statement. Nothing else in either file; the rest of each file is formatted by the orchestrator's
close-out run (owner decision 2).
**Conventions that will fail your lint:** none new; `pnpm selftest` must still print 62/62.
**Scoped validation:** `pnpm install --frozen-lockfile` → `pnpm dlx prettier@3.9.6 --print-width
100 <file> | diff <file> -` for each file: the diff contains **no** line from inside the two
literals (`CASES` `:50-142`, `COMMENT` `:52-58`) — record the diff line count with and without
the comment (the "without" measurement is `git show HEAD:<file> | pnpm dlx prettier@3.9.6
--print-width 100 --stdin-filepath <file> | diff - <(git show HEAD:<file>)` or an equivalent
inside your worktree — no scratch outside it) → `pnpm lint && pnpm typecheck && pnpm selftest`.
**Acceptance:** two `// prettier-ignore` lines, each with its reason; measured: the literals are
left alone by Prettier at width 100 and the churn in those two files drops (report the numbers —
the investigation predicted 283 → ~0 and 54 → ~0 inside the literals); 62/62. Tests: none —
comments; say so.
#### Status — item 1.6
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<!-- per item: worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- what was run, counts, checkers verified, findings → phase 1.5 items -->
