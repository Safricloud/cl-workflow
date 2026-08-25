# Phase 3 — 3 implementers, parallel (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 2
**Magnet files this phase touches:** none shared — 3.1 and 3.2 create disjoint new `.ts`
files; 3.3 edits payload docs/config and deletes the `.py` files, which 3.1/3.2 never touch.

### Item 3.1 — Small hooks: path-fence, status-block, reload-plan
**Files:** `template/.claude/hooks/path-fence.ts`, `template/.claude/hooks/status-block.ts`,
`template/.claude/hooks/reload-plan.ts` (all new).
**Approach:** Port from the `.py` originals per `investigation-hooks.md` contracts, importing
shared helpers from `./lib.ts`. path-fence: **fix the Windows bug while porting** — use
`node:path` `join`/`resolve`/`sep` consistently so the allowed `docs/reviews` prefix matches
on both OSes (the Python `os.path.join(base, "docs/reviews")` keeps the forward slash and
denies everything on Windows); note `fs.realpathSync` throws `ENOENT` where Python's
`realpath` tolerates missing paths — both these hooks resolve paths that usually don't exist
yet, so resolve manually (`path.resolve` + walk up for the nearest existing ancestor's
realpath) as the investigation prescribes. status-block: exit-2 protocol preserved.
reload-plan: SessionStart matcher payload → context injection stdout, exit 0.
**Conventions that will fail your lint:** erasableSyntaxOnly (no enums etc.); `./lib.ts`
extension imports; LF.
**Scoped validation:** `pnpm typecheck`; per-hook stdin fixtures (take the shapes from the
`.py` originals' parsing) piped through `node template/.claude/hooks/<hook>.ts` on Windows:
path-fence allows a write under `docs/reviews/x/`, denies one under `src/`; status-block
exits 2 on a transcript without a status block, 0 with; reload-plan emits the plan/decisions
context block for a `compact` payload.
**Acceptance:** the three fixtures above green on Windows AND under `bash`; reverting
`path-fence.ts` restores nothing at the call site (settings/agent wiring points at `.ts` after
3.3) — the fence must demonstrably deny `src/` writes on this machine, which the `.py` version
cannot do.
#### Status — item 3.1
*(implementer keeps this current: In progress → Done | Blocked)*

### Item 3.2 — Long-poll hooks: pr-watch, docs-only
**Files:** `template/.claude/hooks/pr-watch.ts`, `template/.claude/hooks/docs-only.ts` (new).
**Approach:** Port per `investigation-hooks.md`, `./lib.ts` imports. pr-watch: `gh` polling
loop with `await setTimeout` (`node:timers/promises`); flags `--pr <n>` `[--reset]`; returns
JSON on news or `{"new": []}` after 5 quiet minutes; quiet window restarts when the PR head
changes. docs-only: `--base <ref> --pr <n> --branch <b> [--grant]`; exit 0 docs-only / 3 code
changed / 1 error; accepts docs paths + whole-line-comment diffs, rejects trailing comments,
new code files, unknown extensions, shebangs, anything under `.claude/` that is not markdown —
**update the path logic for the new layout**: `template/**` counts as code/config by the same
extension rules (a hook edit inside `template/` must NOT be mergeable as "docs"); when
`--grant` fires it writes the merge grant via the same lib grant-writer rule-zero reads.
**Conventions that will fail your lint:** erasableSyntaxOnly; LF; no busy-wait loops —
`timers/promises` only.
**Scoped validation:** `pnpm typecheck`; docs-only against synthetic diffs in a scratch git
repo covering the 10 shapes the Python version was measured on (see investigation-structure
table reference) plus two new ones: `template/.claude/hooks/x.ts` edit → exit 3,
`template/docs/guides/x.md` edit → exit 0; pr-watch against a fake `gh` shim on PATH
(the Python original was validated exactly this way): returns on news, quiet-window expiry,
window restart on head change.
**Acceptance:** the synthetic-diff suite green on Windows; reverting `docs-only.ts` makes the
docs-only merge path in SKILL §8 point at a missing file (grep proves the call site moved to
`.ts` in 3.3).
#### Status — item 3.2
*(implementer keeps this current: In progress → Done | Blocked)*

### Item 3.3 — Call sites, conf header, gitignore, ESM shim, and retiring the .py files
**Files:** `template/.claude/settings.json`, `template/.claude/agents/investigator.md`,
`template/.claude/agents/implementer.md` (read; touch only if a `.py` reference exists),
`template/.claude/skills/contribute/SKILL.md`, `template/.claude/rules/process.md`,
`template/.claude/rule-zero.conf` (header comment only),
`template/docs/guides/agent-workflow.md`, `template/mem/outstanding.md` (line 39 docs-only
reference only), `template/.claude/gitignore`,
`template/.claude/hooks/package.json` (new: exactly `{"type":"module"}` — the ESM shim from
phase 2's finding; a consumer project with `"type": "commonjs"` otherwise breaks every hook,
fail-open); deletions: `template/.claude/hooks/*.py`.
**Approach:** Every `python3 …/<hook>.py` becomes `node …/<hook>.ts` (exec form in
settings.json: `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<hook>.ts"]`,
timeouts preserved). investigator.md frontmatter: path-fence wiring → `.ts`. SKILL.md: all
command examples (`--grant`, `pr-watch`, `docs-only`, bundle/clear in §4, §8, §9). process.md
and agent-workflow.md: command examples only — no reasoning rewrites. rule-zero.conf header:
"Python re" → "JavaScript RegExp, compiled without the u flag; existing patterns keep their
meaning". Fix stale selftest-count claims outside README to **60/60** — phase 2.5 grew the
suite; grep the tree for `52/52` and `57/57`. Verify
`template/.claude/gitignore` patterns are the unanchored set from phase 1 (fix if not).
Delete the seven `.py` files from `template/` — the working root copies stay until phase 4.
**Conventions that will fail your lint:** JSON valid after every settings.json edit; no
`python3` or `.py` reference may survive anywhere under `template/` (grep is the check); LF.
**Scoped validation:** `git grep -nE "python3|\.py\b" -- template/` → empty;
`node -e "JSON.parse(...)"` on settings.json; `pnpm typecheck` still green (deletions must
not break lib imports).
**Acceptance:** grep-empty above; settings.json parses; reverting this item reintroduces
`python3` call sites under `template/` (grep catches it).
#### Status — item 3.3
**Done** — 2026-08-25, worktree `agent-a61e5cc93892fb92e`, branch
`worktree-agent-a61e5cc93892fb92e`.

**What changed**
- `template/.claude/settings.json` — three hook entries to exec form `"command": "node"`,
  args `${CLAUDE_PROJECT_DIR}/.claude/hooks/{rule-zero,status-block,reload-plan}.ts`.
  Timeouts, matchers and `statusMessage` untouched (10 / 30 / 10).
- `template/.claude/agents/investigator.md` — path-fence frontmatter wiring → `node` +
  `path-fence.ts`; the `"docs/reviews"` argument unchanged.
- `template/.claude/skills/contribute/SKILL.md` — all eight call sites (`:81` `--grant`,
  `:188` `pr-watch --reset`, `:202` prose, `:207` `docs-only --grant`, `:217` prose,
  `:222` `--bundle merge-cleanup`, `:228` `--clear`, `:231` prose). Commands and file names
  only; no reasoning rewritten.
- `template/.claude/rules/process.md` — `:19` grant command, `:31` `docs-only.ts` prose.
- `template/docs/guides/agent-workflow.md` — `:72`, `:86`, `:94`, `:343`, `:383`, `:392`,
  `:494`, `:495`. Commands and file names only.
- `template/mem/outstanding.md:39` — settled decision now cites `docs-only.ts`.
- `template/.claude/rule-zero.conf` header — `rule-zero.py` → `rule-zero.ts`, and
  "(Python re, searched, not anchored)" → "(JavaScript RegExp, compiled without the u flag;
  searched, not anchored — existing patterns keep their meaning)". Three lines where there was
  one; **no rule line touched** (the 60/60 selftest below is the proof).
- `template/.claude/hooks/package.json` (new) — exactly `{"type":"module"}` + LF. 18 bytes.
- **Deleted** (`git rm`) the seven `template/.claude/hooks/*.py`: `docs-only`, `path-fence`,
  `pr-watch`, `reload-plan`, `rule-zero-selftest`, `rule-zero`, `status-block`.

**Validation — actual outputs**
- `git grep -nE "python3|\.py\b" -- template/` → **no output, exit 1**. Same pattern via
  `grep -rnE … template/` (catches the untracked shim too) → **no output, exit 1**.
- `node -e` `JSON.parse` on `template/.claude/settings.json` → parses; the three hook objects
  print as
  `{"type":"command","command":"node","args":["${CLAUDE_PROJECT_DIR}/.claude/hooks/rule-zero.ts"],"timeout":10,"statusMessage":"rule zero"}`,
  `…status-block.ts"],"timeout":30}`, `…reload-plan.ts"],"timeout":10}`.
- `node -e` `JSON.parse` on `template/.claude/hooks/package.json` → `{"type":"module"}`.
  `od -c` → `{ " t y p e " : " m o d u l e " } \n`, 0o22 = 18 bytes, no CR.
- `pnpm install --frozen-lockfile` → typescript 6.0.3, @types/node 24.13.3.
  **`pnpm typecheck` → clean, exit 0** (`tsc --noEmit`). The deletions break no import: `lib.ts`
  and `rule-zero.ts` reference no `.py`-adjacent path, and `tsconfig.json` includes
  `template/.claude/hooks` as a directory, so the not-yet-written 3.1/3.2 hooks cost nothing.
- `node template/.claude/hooks/rule-zero-selftest.ts` (Node **v24.4.1**) →
  `60/60 cases passed; 39 lines logged to rule-zero.log`, exit 0 — the conf header rewrite
  left every rule intact.
- **ESM shim measured, before and after.** Scratch consumer project with
  `package.json` = `{"type":"commonjs"}`, `lib.ts` + `rule-zero.ts` + `rule-zero.conf` copied
  in, a `git push --force origin main` PreToolUse payload on stdin:
  - *without* `hooks/package.json`: `SyntaxError: Cannot use import statement outside a module`
    (plus `Warning: Failed to load the ES module`), **exit 1** — i.e. the gate fails open,
    exactly the phase-2 finding.
  - *with* the shim copied in: the deny JSON on stdout at **exit 0** —
    `"permissionDecision":"deny"`, reason `rule-zero.conf:19 deny git push .*(--force|…)`.
- `npm pack --dry-run --json` → 30 files, and `template/.claude/hooks/package.json` **is
  listed** — the shim actually ships (nested manifests outside `node_modules` are ordinary
  files to npm-packlist).
- `git diff --check` / `git diff --cached --check` → clean; no CR bytes introduced.
- `git grep -nE "52/52|57/57" -- template/` → **no output, exit 1**, before and after this item:
  phase 2.5 had already fixed the four README counts, and no file under `template/` ever
  carried a count claim. Nothing to change.
- `template/.claude/gitignore` **verified unchanged and correct**: the phase-1 five-pattern
  unanchored set (`rule-zero.grants`, `rule-zero.log`, `worktrees/`, `pr-watch/`,
  `__pycache__/`). Not touched.

**Deviations**
1. **`template/.claude/agents/implementer.md` not touched.** Read as the Files list directs;
   `grep -nE "python|\.py\b|hooks/"` → zero matches. The conditional in the Files list
   ("touch only if a `.py` reference exists") did not fire.
2. **The conf header note is three lines, not one.** The replacement text does not fit the
   original line inside the file's 100-column comment block, so the parenthetical wraps under
   the `<verb> <extended regex>` column. Content is exactly what the item specifies.

**For the orchestrator (outside this item's Files)**
- **Phase 4.1's managed manifest must list `template/.claude/hooks/package.json`** — a new
  managed payload file — and must drop the seven `.py` names and carry the five `.ts` hooks
  3.1/3.2 add. If the manifest is written from a stale list the shim never reaches consumers
  and every hook fails open on a `"type": "commonjs"` project.
- **`README.md:62-69`'s payload file listing does not mention `hooks/package.json`.** README is
  in no phase-3 Files list; it is one line to add wherever the orchestrator prefers.
- **`__pycache__/` in `template/.claude/gitignore` is now vestigial** — the kit ships zero
  Python after this item. Left in place deliberately: plan.md accepts phase 1's five-pattern
  set as a mid-loop decision, the pattern is scoped to `.claude/` in a *consumer's* repo where
  it stays harmless, and the item's instruction was to verify the anchoring, not to prune.
  One-line removal if the orchestrator wants it gone.
- Settings and investigator frontmatter now point at `status-block.ts`, `reload-plan.ts` and
  `path-fence.ts`, which **items 3.1/3.2 create**. Between this merge and theirs those three
  gates are inert (missing file → Claude Code treats it as a non-blocking hook error).
  `rule-zero.ts` — the load-bearing one — is live now.

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
