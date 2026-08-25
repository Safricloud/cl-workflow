# Plan — The kit as a GitHub-installed package (2026-08-25-npx-ts-kit)

**Date:** 2026-08-25 19:25 SAST
**Review:** `docs/reviews/2026-08-25-npx-ts-kit/review.md` — direction **A**, decisions 1–8
**Issue:** none
**Branch:** `feat/2026-08-25-npx-ts-kit` off `main` (`dc189da`)
**Owner go-ahead:** 2026-08-25 at the Questions phase — CLI as ".ts source, committed dist";
repo-settings writes "Yes, all three"; "One PR, phased"
**Phases:** `phase-1.md` (1 item, serial) · `phase-2.md` (1 item, serial) · `phase-2.5.md`
(1 item, from phase-2 verification) · `phase-3.md` (3 items, parallel) · `phase-4.md`
(2 items, parallel)

## Measured facts (from the investigations; do not re-derive)
| Fact | Value | Where measured |
| --- | --- | --- |
| Node refuses type stripping under `node_modules` | `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, no flag overrides it | investigation-packaging.md, Node 24.4.1 |
| Hook `.ts` outside `node_modules` | runs natively, zero stderr, Node 22.18/24.4 | investigation-packaging.md |
| npm git installs with `prepare` script | broken outright in npm 11.12.0 (npm/cli#9133) | investigation-packaging.md |
| conf regexes under JS `RegExp` (no `u` flag) | 26 patterns × 50 subjects: zero behavioural diffs | investigation-hooks.md |
| `re.escape` output (`\-` `\ ` `\#`) under JS `u` flag | hard SyntaxError; fine without `u` | investigation-hooks.md |
| `RegExp.escape` (Node 24) | emits `\x66eat\/x` for `feat/x` — unusable for readable grants | investigation-hooks.md |
| rule-zero deny channel | stdout JSON at **exit 0** — non-zero exit = fail-open | investigation-hooks.md |
| Self-test | **57** cases (README claims 52), invokes hook by subprocess | investigation-hooks.md |
| `path-fence.py` on Windows | denies every write incl. its allowed prefix (`os.path.join` keeps `/`) | investigation-hooks.md |
| `python3` on this machine | MS Store stub, exit 49 — all gates inert | investigation-hooks.md/-structure.md |
| `.claude/.gitignore` | all 4 patterns anchored wrong, match nothing | investigation-structure.md |
| `npm pack` | silently drops `.gitignore` from the package; `gitignore` (renamed) survives | investigation-structure.md |
| Fresh Windows clone | CRLF-rewrites every file → every byte-hash changes | investigation-structure.md |
| Payload cross-references | none break under the `template/` move | investigation-structure.md |
| Payload split | 20 managed / 9 owned / 1 merge-carefully (`settings.json`: kit owns `worktree.baseRef` + 3 hook entries) | investigation-structure.md |
| Root duplicates | `SKILL.md`, `agent-workflow.md`, `docs-only.py`, `pr-watch.py` byte-identical to canonical copies | investigation-structure.md |
| kitVersion for a git install | npm writes no `gitHead`; SHA recoverable from parent `package-lock.json` `resolved` | investigation-packaging.md |
| Ruleset `main-pr-gate` | live: id 21458765, requires check `ci-ok`, admin bypass `always` | created this loop, API response |
| Symlink self-hosting | unavailable (`core.symlinks=false`, `mklink` needs admin) | investigation-structure.md |

## Owner decisions this plan rests on
1–5 (conversation) and 6–8 (Questions) as recorded in the review's **Decisions** section:
npx-from-GitHub only · PR-gated CI, none post-merge, admin bypass · Node ≥ 24 ·
TypeScript 6 + `tsc` · pnpm · `.ts` CLI source with committed `dist/` and CI drift check ·
repo-settings writes executed (done: `main` pushed, default, ruleset live) · one phased PR.

## Decisions made by this plan — veto here or in the PR
- **Package name `@safricloud/cl-workflow`.** Cosmetic for `github:` installs; scoped avoids
  future registry collisions.
- **CI shape:** `.github/workflows/ci.yml`, trigger `pull_request` → `main` only; job `test`
  = matrix {ubuntu-latest, windows-latest} × Node 24; aggregate job **`ci-ok`** (`needs: test`)
  is the single required-check name — already wired into the live ruleset.
- **Payload ships `.claude/gitignore` (no dot)**; `init` renames it to `.claude/.gitignore` —
  the npm-pack drop workaround. Patterns rewritten unanchored so they actually match.
- **Line endings:** `* text=auto eol=lf` `.gitattributes` in the kit repo; the payload carries
  a `.claude/.gitattributes` scoped to the kit's own files; the `update` manifest hashes
  LF-normalised content (sha256).
- **Self-hosting by `init` on the kit repo itself** (phase 4): `template/` is the single
  source of truth; the root working copy is produced by the CLI, not hand-maintained —
  hand-copies are how the four root duplicates arose. Root `CLAUDE.md` gets filled with real
  kit-repo facts (it is currently the unfilled placeholder template).
- **`update` conflict policy:** owned files never touched; managed file whose hash matches any
  shipped version → overwrite; locally edited → write `<name>.new` + warn; `settings.json` →
  merge only the kit-owned keys.
- **CLI is one file** `src/cli.ts` → `tsc` → committed `dist/cli.js` (`"type": "module"` makes
  `.js` ESM; the review said `.mjs` — same artifact, conventional extension under type:module).
  Managed/owned manifest lives as a const in the CLI source.
- **Conf dialect note, not migration:** `rule-zero.conf` header text updated to say patterns
  are compiled as JS `RegExp` without the `u` flag; existing owner conf files remain valid
  verbatim (measured).
- **Grant-writing commands in docs** change from `python3 …` to `node …`; the grants/log file
  formats are unchanged.
- **TypeScript `^6.0.0`:** implementer installs it; if the registry cannot resolve a stable 6,
  the item goes Blocked rather than silently pinning 5.x (owner named TS 6 explicitly).

## Decisions made mid-loop — implemented; veto in the PR
- 2026-08-25 — Accepted phase 1's five recorded deviations (see `phase-1.md` status block):
  `@types/node` devDependency; five-pattern payload gitignore; `description`/`repository` in
  the manifest with **no `license` field** (→ issue #1); mechanically-required tsconfig
  extras; README written to the finished state.
- 2026-08-25 — TypeScript pinned `^6.0.0` resolves to 6.0.3 while the registry's latest is
  7.0.2; staying on 6 per the owner's explicit decision. Revisit only on the owner's word.
- 2026-08-25 — Accepted phase 2's deviations 1–5 (fail-closed where Python failed open;
  cosmetic JSON/EOL/CLI-text differences; four Python-only regex features fail closed and
  loud). Deviation 6 became **phase 2.5**: self-test grows cases 58–60 so the no-`u`-flag
  choice is defended inside the suite; every "57/57" claim becomes "60/60".
- 2026-08-25 — Phase 2's ESM finding: a consumer project with `"type": "commonjs"` silently
  breaks `node .claude/hooks/*.ts` (gate fails open). Fix shipped via item 3.3:
  `template/.claude/hooks/package.json` = `{"type":"module"}` (measured working, measured
  shipping via `npm pack`).
- 2026-08-25 — Orchestrator document edits after 3.3's merge: README payload listing gained
  the `hooks/package.json` line (one-line documentation of a shipped file); phase-4.1's
  manifest spec now derives managed files from `template/` at runtime rather than a static
  list, so the shim and the seven `.ts` files cannot be silently omitted.
- 2026-08-25 — 3.3's vestigial `__pycache__/` ignore pattern left in place (harmless in
  consumer repos; pruning it is not worth a diff line now).

## Phasing
Phase 1 is one serial item: it touches every magnet at once (root manifest, payload move,
README) and everything later branches from its merged result. Phase 2 is the hooks' shared
library plus the load-bearing gate and its self-test — one implementer because lib, hook and
57-case test co-evolve. Phase 3 fans out three ways on disjoint files (new `.ts` hooks ×2,
payload doc/config call-sites). Phase 4 fans out two ways (CLI + self-init vs CI workflow,
disjoint: `src/`+`dist/`+root working copy vs `.github/`).

## Orchestrator work (documents only)
This plan directory (committed before dispatch); merge-back and verification records per
phase; `mem/` and `CLAUDE.md` ledger updates at archive time; archive + PR + cycles + merge
report per SKILL §7–§10.

## Orchestrator validation (after each phase merge, and at the end)
Per phase: the phase file's scoped validations re-run on the merged branch. End-to-end:
`pnpm typecheck` (tsc 6, `--noEmit`, covers hooks `.ts` and CLI src); `pnpm build` + clean
`git diff --exit-code dist/`; selftest 60/60 on this Windows machine; checker verification —
break the deny path in `rule-zero.ts`, watch the selftest go red, restore; `init` smoke test
into a scratch dir + `doctor` green; `npx "github:Safricloud/cl-workflow#feat/2026-08-25-npx-ts-kit" init`
into a scratch dir as the real consumer path; read the diff of every load-bearing file;
`.claude/rule-zero.log` reviewed for denials implementers hit.

## Blocked on the owner
- ~~**#1 — Choose a licence for the kit**~~ **Resolved mid-loop** — owner delegated a
  permissive choice ("I don't mind what people do with this repo", 2026-08-25); **MIT**
  selected, copyright "Safricloud". Lands via item 4.1; PR carries `Fixes #1`.
