# Phase 1 — 1 implementer, serial (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** branch head (review + decisions committed)
**Magnet files this phase touches:** all of them (root manifest, payload move, README) — which
is exactly why this phase is one serial item.

### Item 1.1 — Package skeleton and payload move
**Files:** `package.json` (new), `tsconfig.json` (new), `tsconfig.build.json` (new),
`.gitattributes` (new), `pnpm-lock.yaml` (generated), `.gitignore` (new, root),
`template/**` (moved/copied payload), `README.md` (rewritten), deletions: root `SKILL.md`,
`agent-workflow.md`, `docs-only.py`, `pr-watch.py`.
**Approach:**
- `git rm` the four byte-identical root duplicates (facts table).
- Create `template/` and **copy** (not move) the payload into it: `.claude/**` →
  `template/.claude/**` (with `.claude/.gitignore` renamed to `template/.claude/gitignore` —
  npm-pack drop workaround, patterns rewritten unanchored: `rule-zero.grants`,
  `rule-zero.log`, `worktrees/`), `CLAUDE.md` → `template/CLAUDE.md`,
  `docs/guides/agent-workflow.md` → `template/docs/guides/agent-workflow.md`, empty
  scaffolding `template/docs/{plans,reviews,history,reports}/.gitkeep`,
  `template/docs/history/index.md`, `mem/index.md` + `mem/outstanding.md` →
  `template/mem/` — **the template `mem/outstanding.md` is the pristine seed** (as at
  `dc189da`), not this repo's live ledger. Root working copies stay in place and live until
  phase 4's self-init replaces them.
- Do NOT copy this contribution's own records (`docs/reviews/2026-08-25-npx-ts-kit/`,
  `docs/plans/2026-08-25-npx-ts-kit/`) into `template/`.
- `package.json`: name `@safricloud/cl-workflow`, private false, version `0.6.0`,
  `"type": "module"`, `bin: {"cl-workflow": "dist/cli.js"}`, `files: ["dist", "template"]`,
  `engines: {"node": ">=24"}`, `packageManager` pinned to current pnpm,
  devDependencies `typescript@^6.0.0` (if unresolvable: STOP, mark Blocked — plan decision),
  scripts: `build` = `tsc -p tsconfig.build.json`, `typecheck` = `tsc --noEmit`,
  `selftest` = `node template/.claude/hooks/rule-zero-selftest.ts` (target lands phase 2).
- `tsconfig.json` (checking): `module: nodenext`, `target: esnext`, `strict`,
  `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`,
  include `src` + `template/.claude/hooks`. `tsconfig.build.json`: extends it, emit only
  `src/cli.ts` → `dist/`, `rewriteRelativeImportExtensions` on.
- Root `.gitattributes`: `* text=auto eol=lf`. Also add `template/.claude/.gitattributes`
  scoped `* text=auto eol=lf` (structure investigation recommends `.claude`-scoped in payload).
- Root `.gitignore`: `node_modules/`, `__pycache__/`.
- `pnpm install` to generate and commit `pnpm-lock.yaml`.
- `README.md`: rewrite kit-facing — what the kit is, install
  (`npx github:Safricloud/cl-workflow init`), the three CLI commands, repo layout
  (`src/`, `dist/`, `template/`), CI + ruleset (`ci-ok`, admin bypass), development
  (pnpm, tsc 6, Node ≥ 24), and fix every stale claim: selftest prints **57/57** not 52/52;
  requirement is Node ≥ 24, not `python3`.
**Conventions that will fail your lint:** LF endings everywhere (the new `.gitattributes`
enforces); JSON files two-space indented; no `python3` mention may survive in README.
**Scoped validation:** `pnpm install` exits 0; `git status --short` clean after commit;
`node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`;
`grep -r "python3" README.md` → no matches; on a temp `npm pack --dry-run`:
`template/.claude/gitignore` listed, no `.py` surprises at root.
**Acceptance:** repo has `template/` payload complete (diff `template/.claude` vs `.claude`
shows only the gitignore rename and gitattributes addition); four duplicates gone; reverting
the change removes `package.json` → `npm pack --dry-run` fails, and restores the duplicates.
#### Status — item 1.1
**Done** — 2026-08-25. Branch `worktree-agent-a8ad969402ea80eae`, 6 commits (`4e5f287`…`a17c8c5`).

**Not Blocked:** `typescript@^6.0.0` resolves to stable **6.0.3** (registry `latest` is `7.0.2`).
Installed 6.0.3.

**Scoped validation — actual outputs**
| Check | Result |
| --- | --- |
| `pnpm install` | exit **0**; `+ typescript 6.0.3`, `+ @types/node 24.13.3`; `pnpm install --frozen-lockfile` → "Lockfile is up to date", exit **0** |
| `git status --short` after commit | **clean** (only this phase file, committed last) |
| `node -e "JSON.parse(…package.json…)"` | exit **0**, "package.json parses OK" |
| `grep -r "python3" README.md` | **no matches**. Also `52/52` → no matches, `\.py\b` → no matches |
| `npm pack --dry-run` | exit **0**, **33 files**. `template/.claude/gitignore` (65B) **listed**; `template/.claude/.gitattributes` (19B) listed. Root-level tarball entries are exactly `README.md` + `package.json` — **no `.py` at root**. (The 7 `.py` under `template/.claude/hooks/` are payload until 3.3 deletes them.) |

**Acceptance — evidence**
- `template/` complete: **31 files** = the 30-file payload inventory + the new
  `template/.claude/.gitattributes`.
- Blob-level diff of root `.claude` vs `template/.claude` (`git ls-files -s`, paths normalised)
  shows **exactly two** differences, both intended: `.gitignore`→`gitignore` (rename + rewrite)
  and the added `.gitattributes`. Every other blob id is **identical**.
- `CLAUDE.md`, `docs/guides/agent-workflow.md`, `docs/history/index.md`, `mem/index.md` are
  byte-identical to their root originals. `template/mem/outstanding.md` is `81cfb92` = the
  pristine `dc189da` seed, **not** the live ledger (`e7d333f`) — as the plan requires.
- Four duplicates gone; blob identity re-verified in the index before deleting
  (`0cd3a0a`, `5c14931`, `cd70e47`, `0046dcf` each matched its canonical copy).
- This contribution's own `docs/reviews/…` and `docs/plans/…` records are **not** in `template/`.

**Deviations (all deliberate; veto in the PR)**
1. **Added `@types/node@^24.0.0` to devDependencies** — not named in the item. Phase 2's scoped
   validation runs `pnpm typecheck` over hooks importing `node:` builtins, which cannot resolve
   without ambient Node types; `package.json` is in no later phase's Files list except 4.1
   ("only if a script needs correcting"), so phase 1 is the only place it fits.
2. **`template/.claude/gitignore` carries five patterns**, not the three the item text lists:
   `rule-zero.grants`, `rule-zero.log`, `worktrees/`, `pr-watch/`, `__pycache__/`. The three
   named are an abbreviation of the four originals; `pr-watch/` is the fourth
   (investigation §1(d)) and `__pycache__/` is the addition the investigation explicitly
   recommends ("currently untracked-and-unignored"). All rewritten unanchored.
3. **`package.json` also carries `description` and `repository`** (conventional, factual).
   **`license` is deliberately absent** — the repo has no LICENSE file and no owner decision
   records a licence; asserting MIT would invent one. **Owner call needed.** npm's
   missing-license warning is cosmetic since the kit never reaches the registry.
4. **tsconfig files carry mechanically-required extras** beyond the item's list:
   `moduleResolution: nodenext`, `lib`, `types: ["node"]`, `skipLibCheck`,
   `forceConsistentCasingInFileNames`; and in `tsconfig.build.json` `outDir`/`rootDir`/
   `declaration: false`/`sourceMap: false` — without these "emit only `src/cli.ts` → `dist/`"
   is not expressible.
5. **README names the hooks as `.ts`, including `lib.ts`** (the finished state). No later phase
   edits `README.md`, so writing it to the pre-phase-2 state would leave it permanently stale.

**Observations for the orchestrator**
- **`pnpm typecheck` currently exits 1 with TS18003** ("No inputs were found in config file") —
  both of its inputs (`src/`, and `.ts` under `template/.claude/hooks/`) land in later phases.
  Not part of this item's scoped validation; goes green at phase 2. Same for `pnpm build`.
- **Skill discovery under `template/` — measured, partially answers investigation-structure's
  open "Not done" item.** After the copy, Claude Code did surface
  `template/.claude/skills/contribute/SKILL.md`, but as a **directory-scoped** skill named
  `<worktree>/template:contribute`, disambiguated from the unscoped `contribute` — not a
  colliding duplicate. Agent-definition discovery under `template/.claude/agents/` was not
  re-measured (the agent roster is fixed at session start).
- **Re-verifying the rewritten ignore patterns with `git check-ignore` was refused** by the
  worktree-isolation guard (it blocks git operations outside this worktree, and the test needs
  a scratch repo). Relying on investigation-structure Observation B, which measured exactly
  this unanchored rewrite in a sandbox: `git check-ignore -v` names the matching line for each.
- **This worktree's on-disk files are still CRLF** (they were checked out before
  `.gitattributes` existed). The **index is LF** for every entry and `git ls-files --eol`
  reports `attr/text=auto eol=lf` throughout, so every future checkout — CI, and the phase 2–4
  worktrees — gets LF. Forcing a re-checkout here would mean deleting every tracked file, which
  is not worth the risk for zero effect on committed bytes.
- `docs-only.py`'s `DOC_DIRS = ("docs/", "mem/")` prefix match does not cover `template/docs/`
  or `template/mem/` (investigation §3 class 5). Harmless today; phase 3.2 owns the fix and
  already has it in scope.

## Merge-back record (orchestrator)
- Item 1.1: branch `worktree-agent-a8ad969402ea80eae`, worktree clean, 7 commits
  (`4e5f287`…`92b23cb`) merged fast-forward to `92b23cb`. No conflicts.
- Worktree removal needed a two-step: the implementer's `pnpm install` left `node_modules/`
  in the worktree, `git worktree remove` refused ("Directory not empty") while unregistering
  the worktree anyway; deleted the directory, `git worktree prune`, `git branch -d` succeeded
  (plain `-d`, post-merge). The guarded `remove --force` was not used.

## Verification (orchestrator, after this phase merged)
- `pnpm install --frozen-lockfile` clean on pnpm 10.27.0; `npm pack --dry-run` → 33 files,
  `template/.claude/gitignore` (65B) and `template/.claude/.gitattributes` (19B) present, no
  root `.py` (the seven payload `.py` remain until 3.3, as planned).
- `git grep python3 -- README.md` and `52/52` → zero matches; `git ls-files template/` → 31.
- Read in full: `package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `template/.claude/gitignore` (five unanchored patterns), both `.gitattributes`, README head —
  all as planned incl. the five recorded deviations, accepted.
- Findings → none needing a phase 1.5. License gap → issue #1 (blocked-on-owner).
