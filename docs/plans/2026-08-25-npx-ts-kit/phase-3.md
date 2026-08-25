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

### Item 3.3 — Call sites, conf header, gitignore, and retiring the .py files
**Files:** `template/.claude/settings.json`, `template/.claude/agents/investigator.md`,
`template/.claude/agents/implementer.md` (read; touch only if a `.py` reference exists),
`template/.claude/skills/contribute/SKILL.md`, `template/.claude/rules/process.md`,
`template/.claude/rule-zero.conf` (header comment only),
`template/docs/guides/agent-workflow.md`, `template/mem/outstanding.md` (line 39 docs-only
reference only), `template/.claude/gitignore`; deletions: `template/.claude/hooks/*.py`.
**Approach:** Every `python3 …/<hook>.py` becomes `node …/<hook>.ts` (exec form in
settings.json: `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<hook>.ts"]`,
timeouts preserved). investigator.md frontmatter: path-fence wiring → `.ts`. SKILL.md: all
command examples (`--grant`, `pr-watch`, `docs-only`, bundle/clear in §4, §8, §9). process.md
and agent-workflow.md: command examples only — no reasoning rewrites. rule-zero.conf header:
"Python re" → "JavaScript RegExp, compiled without the u flag; existing patterns keep their
meaning". Fix remaining 52→57 claims outside README (grep the tree). Verify
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
*(implementer keeps this current: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
