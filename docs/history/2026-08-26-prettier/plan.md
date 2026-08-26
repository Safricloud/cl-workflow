# Plan — Prettier, run before the PR (2026-08-26-prettier)

**Date:** 2026-08-26 12:30 SAST
**Review:** `docs/reviews/2026-08-26-prettier/review.md` — direction **A**, decisions 1–12
**Issue:** none
**Branch:** `chore/2026-08-26-prettier` off `main` (`050b765`)
**Owner go-ahead:** 2026-08-26 at the Questions phase — twelve answers via the question tool;
decision 2: "(iii) Orchestrator runs pnpm format"
**Phases:** `phase-1.md` (6 items, parallel) · orchestrator close-out (format → build → update →
full check → commit) · `phase-1.5.md` added if verification finds anything

## Measured facts (from the investigations; do not re-derive)

| Fact | Value | Where measured |
| --- | --- | --- |
| Prettier `latest` today | 3.9.6, `engines.node >= 14`, zero dependencies | `investigation-tooling.md` §1 |
| Node / pnpm here | 24.4.1 / 10.27.0 | same |
| Only non-default option the code needs | `printWidth: 100` — 467 diff lines over the ten `.ts`/`.mjs` files vs 1,115 at 80; zero quote/semicolon/indent/arrow-paren changes | `investigation-tooling.md` §3 |
| Dense literals | `CASES` (`rule-zero-selftest.ts:50-142`) = 283 of those lines; `COMMENT` sets (`docs-only.ts:52-58`) = 54 | same; located by the orchestrator |
| ESLint formatting rules active | none of 98 (`eslint --print-config src/cli.ts`); `eslint-config-prettier` unnecessary | `investigation-tooling.md` §5 |
| Node type-stripping on formatted hooks | 9/9 `node --check` OK; only one import re-wrapped (`path-fence.ts:24`), `.ts` specifier preserved | `investigation-tooling.md` §6 |
| `dist/cli.js` after formatting `src/cli.ts` | changes by 12 lines — `pnpm build` must re-run and `dist/` be committed | same |
| `.claude/settings.json` | serialized by `mergeSettings` (`src/cli.ts:384`, `JSON.stringify(…, null, 2)`, no trailing newline by design `:383`) on every `update`; Prettier collapses three `args` arrays + adds newline → drift gate red either way | `investigation-generated.md` §1, `investigation-tooling.md` §4 |
| Root copies vs template | 24/24 managed files byte-identical; `.claude/settings.json` identical by authorship only | `investigation-generated.md` §4 |
| `update` and the lock | rewrites `.claude/cl-workflow.lock` unconditionally (`src/cli.ts:554`) with hashes of the current template text → format first, `update` last | `investigation-generated.md` §3 |
| Prettier and nested `.gitignore` | reads only the CWD `.gitignore`; a root `--check` lists `.claude/pr-watch/*.json` despite `.claude/.gitignore` | `investigation-generated.md` §6 |
| Markdown under `preserve` + `embeddedLanguageFormatting: off` | 61/62 files structurally identical (parsed AST); `<placeholder>` tokens 1,094 → 1,094; zero escapes added; idempotent 62/62 | `investigation-markdown.md` §2, §3 |
| The hook break | Prettier prints `*(implementer keeps…)*` as `_(implementer…)_`; `reload-plan.ts:93` tests `body.startsWith("*(implement")` → a fresh phase file reports every item as having a status block | `investigation-markdown.md` §4 |
| The adjacent bug | `reload-plan.ts:67` looks for `**Source review:**`; the plan template writes `**Review:**` (`templates/plan.md:4`); never injected | same, Observations |
| Hook shapes that survive formatting | all 13 (`**Branch:**`, `#### Status — item`, `### Item`, `**In progress**`, `**Done**`, …) at unchanged counts | `investigation-markdown.md` §4 |
| Payload prose anchors | 26 in `template/`, listed A1–A28; this repo's B1–B7 | `investigation-process.md` §1, §2 |
| "Before the PR" | = before the final Orchestrate commit (`SKILL.md:176-177`, guide `:374-376`); the archive commit after it touches only `docs/`/`mem/` | `investigation-process.md` §5 |
| Guide sentence made false by the full check | `agent-workflow.md:342` "root config, scripts, formatting, the container build — CI gates them separately" | `investigation-process.md` A19 |
| CI Windows leg | single-line `run:` steps need no `shell: bash` | `investigation-process.md` §4(a) |
| Playwright precedent | tool named only in owned `template/CLAUDE.md:9`; managed prose "the suite named by the E2E line in `CLAUDE.md`" at `implementer.md:64-66`, `process.md:67-69`, guide `:157-161` | `investigation-process.md` §3 |
| Worktrees | inherit no `node_modules`; every item running lint pays `pnpm install --frozen-lockfile` | `mem/outstanding.md` ergonomics (h) |
| Concurrent session | PR #6 was committed and merged on this checkout during investigation; branch fast-forwarded to `050b765`; payload prose line numbers unchanged (PR #6 touched README, history index, `.gitignore`s, lock) | orchestrator, `git reflog` |

## Owner decisions this plan rests on

1. Direction **A** — Prettier for the kit repo only; payload prose tool-agnostic.
2. **The orchestrator runs `pnpm format`** before the final Orchestrate commit — the owner amends
   the settled "edits documents only — never code" rule for this one deterministic tool run.
3. Markdown scope **(c)** — code, the payload, root owned documents; every process record ignored.
4. `printWidth` **100**.
5. `// prettier-ignore` on **both** dense literals.
6. **Caret** `^3.9.6`.
7. **Full check + CI step**; the guide's "CI gates formatting separately" sentence re-worded.
8. **`Format:` line** in the owned `template/CLAUDE.md` naming Prettier as the default; managed
   prose says "the formatter named by the Format line in `CLAUDE.md`, if the project has one".
9. `reload-plan.ts` **`:93` and `:67` fixed in one item**, each with a test.
10. Tests in a new **`test/`** directory; `pnpm test` = `node --test`; in CI and the full check.
11. **No** `.git-blame-ignore-revs`.
12. **Squash** on the owner's word.

## Decisions made by this plan — veto here or in the PR

- **P1 — `.prettierrc` is JSON with two keys**, `printWidth: 100` and
  `embeddedLanguageFormatting: "off"`; `proseWrap: "preserve"` and `endOfLine: "lf"` are the
  defaults and are named in `CLAUDE.md` rather than repeated. Grounds: `embeddedLanguageFormatting:
  off` takes Markdown AST changes from 7 files to 1 for 108 lines of churn and leaves the agents'
  YAML front matter and the ` ```markdown ` status-block sample untouched
  (`investigation-markdown.md` Observations).
- **P2 — the `.prettierignore` ignores the whole generated root** (`/.claude/`,
  `/docs/guides/agent-workflow.md`) rather than checking the copies twice. Grounds: one line covers
  the serialized `settings.json`, live worktrees, `pr-watch/` state and the 24 copies; the CI
  drift gate already proves the copies equal their formatted sources. ESLint and `tsc` keep
  covering the root copy (owner decision 2026-08-25); Prettier is a writer, and a writer must never
  touch a generated file. `template/.claude/settings.json` is ignored on the template side for the
  same serialization reason.
- **P3 — implementers format the files they own** before each commit (the formatter named by
  `CLAUDE.md`'s Format line), so the orchestrator's repo-wide run before the final commit finds
  nothing of theirs to change. Grounds: keeps the mass-format commit small after the first one,
  and gives each implementer's "Validation" line a measured result. Compatible with decision 2.
- **P4 — scripts:** `"format": "prettier --write ."`, `"format:check": "prettier --check ."`,
  `"test": "node --test \"test/**/*.test.ts\""`. The glob is quoted so Node, not the shell, expands
  it on both CI legs. The full check gains `pnpm format:check` first and `pnpm test` last.
- **P5 — the hook test is black-box**: it spawns `reload-plan.ts` with `CLAUDE_PROJECT_DIR`
  pointing at a fixture directory built under `os.tmpdir()` at run time, and asserts on stdout.
  Grounds: no `import.meta.main` guard exists yet (the kit-conformance follow-up adds them); a
  spawn test needs no change to the hook's shape and fails when either fix is reverted.
- **P6 — canonical wording** (fixed here; items 1.3–1.5 apply it verbatim so the three copies of
  each sentence agree):
  - **W1 Format line (owned `template/CLAUDE.md`, Commands):**
    `- Format: \`<write cmd>\` / \`<check cmd>\` (the check is the first step of the full check;
    default for new installs: Prettier — \`prettier --write .\` / \`prettier --check .\`)` and the
    full-check line becomes `- Full check (format check + lint + typecheck + unit): \`<cmd>\``.
  - **W2 The step (SKILL §6 close-out; guide §6 "Commit" paragraph):** *When every item is Done
    and the final verification is green, **format, then commit**: run the formatter named by the
    Format line in `CLAUDE.md`, if the project has one, over the repo; then the build and any
    generated-copy regeneration `CLAUDE.md` names; then the full check once more. This is the one
    code change the orchestrator makes outside the small path — a deterministic tool run, not an
    edit. Commit: what, why, the decision it rests on, the validation run, any lockfile diff
    explained.*
  - **W3 The role (process.md Roles; guide §0.2; `template/mem/outstanding.md` settled line;
    guide Appendix D row):** *Edits documents only — never code — with two exceptions: the small
    path (SKILL §11), where it makes the change itself, and the formatter run before the final
    Orchestrate commit (§6), a tool run over the repo, not an edit.*
  - **W4 Implementer validation (`implementer.md` Validation, first bullet; status block first
    validation sub-line):** *Format the files you own with the formatter named by the Format line
    in `CLAUDE.md`, if the project has one, before each commit — the orchestrator's repo-wide run
    before the final commit should find nothing of yours to change.* Status block:
    `- <formatter check over your files> — clean | "no formatter named in CLAUDE.md"`.
  - **W5 Verify (SKILL §6 Verify sentence; guide §6 Verify paragraph; SKILL §11 step 4; guide
    §11 "What stays"):** "full check and build" → *full check — its first step is the
    formatter's check, when `CLAUDE.md` names one — and build*.
  - **W6 The guide's CI sentence (`agent-workflow.md:341-343`):** *The gates the package check
    does **not** cover — root config, scripts, the container build — CI gates them separately, so
    find out here; formatting is inside the full check now, first.*
  - **W7 Templates:** `templates/plan.md` Orchestrator validation placeholder gains *formatter run
    and its check clean,* first; `templates/pr-body.md` Validation gains `<formatter check clean>;`
    first.
  - **W8 Appendix C (guide):** the Orchestrate line gains "formatter run before the final commit";
    the Small path line gains "formatted". **Appendix D** new row: *No formatter in the loop |
    The formatter named by `CLAUDE.md`'s Format line, run by the orchestrator before the final
    Orchestrate commit; its check first in the full check and in CI | owner, 2026-08-26*.
- **P7 — the one-off reformat is the orchestrator's close-out**, not an implementer phase: after
  phase 1 merges, `pnpm install --frozen-lockfile` → `pnpm format` → `pnpm build` →
  `node dist/cli.js update .` → full check → one commit. Grounds: decision 2 makes exactly this run
  the orchestrator's; a "format the repo" implementer item would contradict it.
- **P8 — root `CLAUDE.md`, `mem/outstanding.md` and `docs/history/index.md`** are the
  orchestrator's documents, edited at the archive step (Commands: Format and Unit lines, the full
  check line, a Conventions bullet on the ignore list and "format `template/`, never the root
  copy"; the kit-conformance ledger entry's test location settled as `test/`).

## Decisions made mid-loop — implemented; veto in the PR

- **M1 (2026-08-26)** — The root `mem/outstanding.md` had a continuation line beginning `+ kind
  + area`, which Prettier reads as a list marker (found by item 1.5 in the payload twin; the
  markdown investigation's AST comparison could not see it). Reflowed by the orchestrator — a
  document edit — so `blocked-on-owner` leads the continuation; no word changed (`bbd0029`).
- **M2 (2026-08-26)** — Three scoped-validation expectations in the phase file were wrong, the
  work was right: 1.3's and 1.5's `git grep "Format line"` counted files the canonical wording
  never puts that phrase in (only W2 and W4 carry it); 1.1's red list named
  `template/.claude/hooks/rule-zero.ts`, which is already clean at width 100 (four of the ten
  code files are: `rule-zero.ts`, `reload-plan.ts`, `status-block.ts`, `eslint.config.mjs`).
  Recorded, nothing changed.
- **M3 (2026-08-26)** — `.prettierrc` is read by Prettier's YAML parser (extensionless rc); the
  P1 JSON text is valid YAML and both options are honoured (measured by 1.1: `rule-zero.ts` is
  clean only at width 100). Left as is; `CLAUDE.md` documents the two options.
- **M4 (2026-08-26)** — Item 1.6 put each `// prettier-ignore` *below* its reason comment (the
  item's two instructions could not both hold); measured to work in either order.
- **M5 (2026-08-26)** — P3 worked as intended: the orchestrator's close-out formatted 14 files
  (130+/62−) rather than the ~800 lines the review forecast, because every implementer
  formatted its own files first.
- **M6 (2026-08-26)** — `pnpm test` exits 0 with zero tests (measured by 1.1); the
  minimum-count assertion stays with the kit-conformance ledger entry, not this contribution.

## Phasing

**Phase 1 — six implementers, parallel** (`phase-1.md`), all on disjoint files:

| Item | Files | Magnet? |
| --- | --- | --- |
| 1.1 Tooling | `package.json`, `pnpm-lock.yaml`, `.prettierrc`, `.prettierignore`, `.github/workflows/ci.yml`, `README.md` | yes — only this item touches them |
| 1.2 Hook fix + tests | `template/.claude/hooks/reload-plan.ts`, `test/reload-plan.test.ts`, `tsconfig.json` | `tsconfig.json` only here |
| 1.3 SKILL + templates + skeleton | `template/.claude/skills/contribute/SKILL.md`, `…/templates/plan.md`, `…/templates/pr-body.md`, `template/CLAUDE.md` | no |
| 1.4 Guide | `template/docs/guides/agent-workflow.md` | no |
| 1.5 Agent + rules + ledger stub | `template/.claude/agents/implementer.md`, `template/.claude/rules/process.md`, `template/mem/outstanding.md` | no |
| 1.6 Ignore comments | `template/.claude/hooks/rule-zero-selftest.ts`, `template/.claude/hooks/docs-only.ts` | no |

Nobody touches the root `.claude/`, `docs/guides/`, `dist/` or the root `CLAUDE.md`: the
generated copies are regenerated by the orchestrator's `update` at close-out (P7), and the root
`CLAUDE.md` is the orchestrator's (P8).

**Close-out (orchestrator, P7)** after phase 1 is merged and verified. Findings → `phase-1.5.md`.

## Orchestrator work (documents only, plus the decision-2 tool run)

- Plan directory committed before dispatch (this commit).
- Merge-back of six worktree branches; verification (below); `phase-1.5.md` if needed.
- Close-out: `pnpm install --frozen-lockfile && pnpm format && pnpm build && node dist/cli.js update .`,
  full check, one commit "Format the repo with Prettier; rebuild dist/, regenerate the root copy".
- Archive: root `CLAUDE.md` (P8), `mem/outstanding.md` (kit-conformance entry: tests in `test/`;
  remove nothing), `docs/history/index.md` line, `git mv` of reviews and plan, commit, push, PR.

## Orchestrator validation (after the phase merge, and at the end)

- Full check as it will read in `CLAUDE.md`: `pnpm format:check && pnpm lint && pnpm typecheck &&
  pnpm build && git diff --exit-code dist/ && pnpm selftest && pnpm test`, then the generated-copy
  gate `node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/
  docs/guides/` printing nothing; `node dist/cli.js doctor .` 6 passed.
- `pnpm format:check` seen **red** on the merged-but-unformatted tree (listing `src/cli.ts`,
  `template/.claude/hooks/rule-zero.ts`, `CLAUDE.md`; not `dist/cli.js`, not
  `.claude/settings.json`, not `.claude/pr-watch/*`, not `docs/history/**`, not `pnpm-lock.yaml`)
  before the close-out makes it green — the checker verified.
- After `pnpm format`: `git diff --stat` read in full; no path under an ignored prefix changed;
  `.claude/worktrees/` untouched; a second `pnpm format` changes nothing (idempotence).
- `pnpm test` prints `# fail 0` with ≥ 3 tests; checker verified by reverting each of the two
  `reload-plan.ts` fixes in turn (`git show <pre-1.2 sha>:template/.claude/hooks/reload-plan.ts >
  …`), seeing the matching test fail, restoring from the merged commit.
- The two `// prettier-ignore` literals unchanged by the close-out run (diff of those line ranges
  empty).
- `git grep` for sentences the change made stale: `full check and build`, `CI gates them
  separately`, `edits documents only`, `Edits documents only`, `62/62`, `Source review`.
- `git grep -n "prettier-ignore"` = exactly two hits in `template/` (plus their root copies).
- Read the diff of `reload-plan.ts`, `ci.yml`, `package.json`, `.prettierignore`, `.prettierrc`
  and every prose file; `.claude/rule-zero.log` for denials.
- CLI smoke: `node dist/cli.js init <scratch>/smoke && node dist/cli.js doctor <scratch>/smoke`.

## Blocked on the owner

None.
