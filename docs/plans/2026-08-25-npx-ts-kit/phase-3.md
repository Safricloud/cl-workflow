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
**Done** — 2026-08-25.

**Files touched (only these):** `template/.claude/hooks/path-fence.ts`,
`template/.claude/hooks/status-block.ts`, `template/.claude/hooks/reload-plan.ts` (all new),
plus this status block. No `.py` file, no `lib.ts`, nothing outside the list.

**Commits (worktree branch `worktree-agent-adceeda7103e42de3`, never pushed):**
`92058a4` the three ports; this status block is the commit on top of it.

**What the ports do.** Literal translations of the `.py` contracts in
`investigation-hooks.md` §1, importing `asRecord`/`asString`/`emitDeny`/`errText`/`expandUser`/
`isRecord`/`pyEscape`/`pyRealpath`/`readFileLines`/`readStdinJson` from `./lib.ts`. Deny
channels per the contract table: path-fence writes deny JSON to **stdout at exit 0**;
status-block refuses a stop with **exit 2** + the paragraph on stderr; reload-plan prints its
context block on **stdout at exit 0**. All three use `process.exitCode` rather than
`process.exit()` so the pipe flushes, and each wraps its body in a try/catch that fails **open**
(silent / allow-stop) — matching Python, where an uncaught traceback exits non-zero and Claude
Code lets the call through anyway.

**The Windows fix (the point of the item).** `path-fence.ts` builds both sides of the
comparison with `node:path`: `path.join(base, prefix) + path.sep` against
`pyRealpath(path.resolve(cwd, expandUser(target)))`. The Python original built
`os.path.join(base, "docs/reviews") + os.sep` → `C:\repo\docs/reviews\`, which no resolved
Windows path can ever start with, so it denied **everything**, its own allowed prefix included.
Measured side by side below. Prefix arguments are stripped of leading/trailing `/` **and** `\`
(Python stripped only `/`), so `docs\reviews` and `/docs/reviews/` fence the same directory.

**Realpath strategy.** Both hooks judge paths that do not exist yet (a `Write` to a new file),
and `fs.realpathSync` throws `ENOENT` there while Python's `os.path.realpath` does not. Both use
lib's `pyRealpath`, which resolves, walks up to the nearest existing ancestor, canonicalises
that, and re-joins the tail. Fixture "allow path that does not exist yet" covers it.

**Deviations (all deliberate, all recorded):**
1. **Deny-JSON bytes differ cosmetically.** `JSON.stringify` emits no space after `:`/`,`;
   Python's `json.dumps` does. Same object, same decision. Consistent with phase 2's accepted
   deviation 2.
2. **Line endings.** Python's `print` translates `\n`→`\r\n` on Windows; Node writes LF. The
   reload-plan diff below is byte-identical after `tr -d '\r'`.
3. **Python's piped stdout is cp1252 on this machine**, which mangles reload-plan's em-dashes;
   Node writes UTF-8. The equivalence diff forces `PYTHONIOENCODING=utf-8` to compare content.
   The port is the correct side of this difference.
4. **`git` that cannot run at all** (missing binary, or the 20 s timeout) makes status-block
   return silently instead of raising. Python raised and exited non-zero, which Claude Code
   treats as a non-blocking error and allows the stop — the same fail-open outcome, reached
   deliberately rather than by traceback.
5. **`reload-plan` reports its own failure** on stdout (`reload-plan could not read the plan
   (…)`) instead of dying, so the orchestrator learns the plan was *not* reloaded.
6. **`\Z` → `$` with the `s` flag and no `m` flag** in reload-plan's three section regexes.
   `\Z` is a literal `Z` in JS (investigation §2); `$` without `m` is exactly Python's `\Z`.
7. **Not `projectRoot()`** in path-fence/reload-plan: those two fall back to the *payload's*
   `cwd` between `CLAUDE_PROJECT_DIR` and the process cwd. Written out explicitly, commented.
8. **Case-sensitivity left as Python had it** — `startsWith` is case-sensitive on Windows too.
   `pyRealpath` canonicalises the existing ancestor's casing on both sides, so the shipped
   `docs/reviews` wiring is unaffected; "fixing" it could only widen the fence.

**Validation — actually run, outputs recorded.**
- `pnpm typecheck` (tsc 6.0.3, `--noEmit`, `erasableSyntaxOnly`) → clean, no output.
- `pnpm selftest` → `60/60 cases passed; 39 lines logged to rule-zero.log` (unchanged by this
  item; proves the new files do not disturb `lib.ts`'s consumers).
- **Git Bash fixture run (Windows, MSYS shell): `35 passed, 0 failed`.**
- **PowerShell 7 fixture run (native Windows paths, backslashes in the payloads):
  `24 passed, 0 failed`** — the bash-equivalence half of the acceptance. Both shells drive the
  same scratch projects under `%TEMP%\claude\…\scratchpad\` (`proj/`, `repo/`, `noplan/`);
  nothing ran against the worktree's live `.claude/`.
- Fixtures cover, per hook: path-fence — allow under `docs/reviews/x/`, deny under `src/`,
  allow a path that does not exist yet, `notebook_path` both ways, an absolute path outside the
  repo, the prefix-boundary sibling `docs/reviews-notes/`, a `..\` escape, no-prefix silence,
  unparseable stdin, empty `tool_input`, the worktree case (`CLAUDE_PROJECT_DIR` ≠ `cwd`), and
  prefixes written with `/`, `\`, leading and trailing separators; status-block — exit 2 clean,
  exit 0 with an uncommitted plan edit, exit 0 with a committed one, `stop_hook_active`,
  no-plan checkout, malformed stdin; reload-plan — the full compact-payload context block,
  empty `docs/plans/`, unparseable stdin.
- The two exact deny/refusal payloads, verbatim:
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"This agent may write only under docs/reviews/. Refused: src/main.ts. Return findings in your report instead."}}`
  and, on stderr at exit 2, `Not finished: no status block has been written. Write your block
  under your item's ...  Then finish.`
- reload-plan's compact-payload output on the fixture project:
  ```
  Live plan: `docs\plans\2026-01-01-demo/` — Plan — Demo contribution (2026-01-01-demo)
    Source review: `docs/reviews/2026-01-01-demo/review.md`
    Branch: `feat/demo`
    Owner go-ahead: 2026-01-01 at the Questions phase
    Owner decisions this plan rests on:
      1. Ship the demo.
      2. No registry publish.
    Items without a status block: 1.1 — First thing; 1.2 — Second thing (in progress)
  Unused rule-zero grants on file (each is a recorded owner yes, single use): `^gh pr merge 12\b`; `^git branch -D feat/demo$`
  ```

**Checker-verified (the fixtures were proven capable of failing):**
- **The Windows bug, measured on the original.** The same allow fixture piped through
  `python .claude/hooks/path-fence.py docs/reviews` → `{"hookSpecificOutput": {… "This agent
  may write only under docs/reviews/. Refused: docs/reviews/x/report.md …"}}` — the `.py`
  version denies the investigator's own report directory on this machine. `path-fence.ts` is
  silent on that input and denies `src/main.ts`. The acceptance criterion, demonstrated.
- Three mutants, run from scratch copies (the worktree files were never edited for this):
  restoring `base + "/" + prefix + path.sep` in path-fence → the allow fixture goes red (deny
  JSON printed); `return true` for status-block's diff check → exit 0 where the port exits 2;
  disabling the `*(implement` pending rule in reload-plan → item 1.1 vanishes from
  `Items without a status block`. All three went red, then the mutants were deleted.
- reload-plan vs `reload-plan.py` on the same fixture project: **byte-identical** after CRLF
  normalisation and `PYTHONIOENCODING=utf-8` (`diff -u` clean).

**Blockers:** none. **Note for 3.3:** the wiring these files expect is
`"command": "node"`, args `[…/path-fence.ts, "docs/reviews"]` in `investigator.md`, and
`node …/status-block.ts` / `node …/reload-plan.ts` in `settings.json`.

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
*(implementer keeps this current: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
