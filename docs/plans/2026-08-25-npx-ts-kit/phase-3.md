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
**Done** — 2026-08-25. `template/.claude/hooks/pr-watch.ts` and `docs-only.ts` added; commits
`2054b9c` (pr-watch), `cb5aebd` (docs-only), plus this status commit. Zero dependencies, `node:`
builtins, erasable syntax, LF; shared helpers imported from `./lib.ts` (`appendGrants`,
`appendLogLine`, `asRecord`, `errText`, `isRecord`, `projectRoot`, `pyEscape`, `readLines`) and
`lib.ts` **not modified**. The wait is `setTimeout` from `node:timers/promises` — no busy loop,
no `Atomics.wait`. The `.py` originals are untouched (3.3 deletes them); they were run read-only
here as the comparison baseline. Node v24.4.1, Windows 11.

**Scoped validation — actual outputs**
- `pnpm typecheck` → `tsc --noEmit`, no diagnostics, **exit 0**.
- **docs-only synthetic-diff suite**: a scratch git repo under `%TEMP%`, one real commit per
  case, each case classified by the port **and** by `docs-only.py` for comparison →
  `ALL 21 CASES PASS`. The two implementations agree on exit code, `docs_only`, every file's
  `class` and every `why` string in **20 of 21** — the only difference is case 17, the deliberate
  new-layout change (deviation 1). The ten shapes the Python version was measured on, plus the
  two new ones and nine more: 1 `*.md` modified → **0** · 2 `docs/asset.png` (doc dir, non-doc
  extension) → **0** · 3 whole-line `#` comments + blanks → **0** · 4 whole-line `//` and block
  `*` lines → **0** · 5 trailing comment on a code line → **3** (`non-comment line changed:
  'export const a = 1;'`) · 6 new code file (A) → **3** · 7 deleted code file (D) → **3** ·
  8 renamed code file (R) → **3** · 9 unknown extension → **3** (`unknown language; cannot
  classify comment lines`) · 10 shebang added → **3** · 11 `.claude/settings.json` → **3** ·
  12 `.claude/rules/process.md` → **0** · 13 new `docs/new.md` (A on a doc path) → **0** ·
  14 empty diff → **3** · **15 `template/.claude/hooks/x.ts` code edit → 3** ·
  **16 `template/docs/guides/x.md` edit → 0** · 17 `template/docs/assets/diagram.png` → **0**
  (Python: 3) · 18 `template/.claude/hooks/x.ts` comment-only edit → **0**, class `comments` ·
  19 `template/.claude/settings.json` → **3** · 20 mixed doc + code → **3** · 21 unknown base ref
  → **1**, `docs-only: fatal: ambiguous argument 'no-such-ref-here...HEAD': unknown revision …`.
- **`--grant` writes a grant rule-zero reads.** Exit **0**, and the grants file is exactly
  `^gh pr merge 7\b` / `^git push origin --delete feat/npx\-ts\-kit$` / `^git branch -D
  feat/npx\-ts\-kit$`, LF-terminated, **no CR** — and byte-identical to what `rule-zero.ts
  --bundle merge-cleanup 7 feat/npx-ts-kit` writes (compared as bytes, `identical: true`). Fed
  back to `rule-zero.ts` in hook mode all three commands pass **silently at exit 0**, the grants
  file is left empty, and a fourth `git branch -D feat/npx-ts-kit` denies (`no grant;
  rule-zero.conf:32 guard git branch .*(-D|--delete|-d )`). Log line written:
  `standing-rule<TAB>docs-only<TAB>orchestrator<TAB>-<TAB>PR 7 feat/npx-ts-kit @ 48c2739a3e3e<TAB>grant written`.
- **pr-watch against a fake `gh` on PATH** (a compiled `gh.exe` shim — Node's `spawnSync` with
  `shell:false` ignores a `.cmd` and falls through to the real CLI, measured): 30 checks,
  `ALL PR-WATCH CHECKS PASS`.
  - *news returns*: first poll has one comment + one review → **exit 0 in 0.4 s**, both items in
    `new`, the full ten-key item shape (`kind,id,author,state,path,line,body,collapsed_sections,
    url,created_at`), `<details>` → `collapsed_sections: ["suppressed finding"]`, state file
    `{"seen":["c1001","r2001"],"head":"aaa111","checked_at":…}`.
  - *quiet-window expiry*: `--interval 1 --quiet-after 3`, head steady, nothing new →
    `{"head":"aaa111","quiet_for":3,"new":[]}`, **4 polls, 4.0 s**, exit 0.
  - *window restart on head change*: identical flags, head changes on poll 3 →
    `{"head":"bbb222","quiet_for":3,"new":[]}`, **6 polls, 6.4 s** — two seconds and two polls
    longer than the steady-head run, i.e. the window demonstrably restarted at the push.
  - also measured: `--once`; `--reset` forgets and re-reports; an already-seen id stays out of
    `new`; `gh` failure → **exit 1** + `pr-watch: gh: could not determine base repo` on stderr;
    missing `--pr`, `--interval soon`, unknown flag → **exit 2** + usage on stderr; `line` falls
    back to `original_line`; a null `user` gives `author: null`; a missing `path` stays `null`
    rather than being dropped from the JSON.
- **pr-watch differential vs `pr-watch.py`** on the identical fake-`gh` timeline (news, quiet
  expiry, head change): stdout **identical in all three**, modulo line endings only (Python's
  `print` emits CRLF on Windows); same exit codes, same wall times (0.4/4.0/6.5 s vs 0.3/4.0/6.4 s).
- Both scripts also run under `bash` on this machine with the same exit codes (`docs-only` → 1 on
  a bad base, `pr-watch` → 2 with no `--pr`).

**Deviations / decisions — veto here or in the PR**
1. **New-layout doc dirs (the one measured behaviour change).** The payload prefix `template/` is
   stripped before the doc-dir test, so `template/docs/**` and `template/mem/**` are documentation
   paths exactly as `docs/**` and `mem/**` are. Nothing else under `template/` changes: it is
   judged by the same extension rules as any other code/config, so `template/.claude/hooks/*.ts`
   and `template/.claude/settings.json` can never be "docs" (cases 15, 19). Case 17
   (`template/docs/assets/diagram.png`) is the difference: **0** here, **3** in Python — this
   closes the gap investigation-structure.md flagged as "Class 5 … worth a one-line note".
2. **Comment-only edits to a shipped hook stay mergeable** (case 18: class `comments`, not
   `docs`). `docs-only.py` behaves the same for `.claude/hooks/*.py`, and investigation-hooks.md
   expects it ("TS hook files classify exactly as the `.py` ones do today"). Only a *code* line
   in a hook forces exit 3. If the standing rule should never unlock a hook change at all, that
   is a rule change, not a port change — say so and it is one line.
3. **No test-only interval override was added.** Checked first, per the contract: the Python
   original already had `--interval` and `--quiet-after`, and the suite drives the windows with
   those two flags. No new flag, no env var.
4. **LF, not CRLF.** Both scripts write LF where Python's text mode wrote CRLF on Windows — the
   stdout payloads and the grants file. The grants file is the load-bearing one, LF is what
   `lib.ts`'s writer already uses, and `rule-zero.ts` reads it back verbatim (measured above).
5. **Bad arguments exit 2** with a usage block on stderr, hand-rolled over `util.parseArgs` to
   reproduce argparse's behaviour (argparse exited 2 the same way). `docs-only` therefore has a
   fourth exit code alongside 0/3/1; nothing in the loop passes bad arguments on purpose.
6. **Cosmetic.** `pr-watch` writes its own `.claude/pr-watch/<n>.json` compact (`json.dump` used
   spaced separators); non-ASCII in a comment body is emitted raw rather than `\uXXXX`-escaped
   (`ensure_ascii=True`); a JSON `null` comment body reads as `""` (GitHub always sends a string);
   `docs-only`'s `why` uses a hand-rolled Python `repr` — byte-identical to Python's in every
   case measured.

**Not done.** No call site was touched: `SKILL.md`, `settings.json`, `process.md` and
`agent-workflow.md` still say `python3 …/pr-watch.py` and `…/docs-only.py` — that is item 3.3,
running in parallel. `pr-watch.ts` has still never been run against a real PR (no PR exists yet);
the fake `gh` covers the contract, GitHub's real pagination does not.

**Incident (read-only, no harm).** While probing how Node resolves a fake `gh` on PATH, a `.cmd`
shim was silently ignored and the real GitHub CLI answered instead — one unintended read-only
live call, `gh repo view` on this repo. Every suite since runs the compiled `gh.exe` shim first on
PATH **and** points `GH_CONFIG_DIR` at an empty scratch directory, so a bypass fails loudly rather
than reaching GitHub.

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
