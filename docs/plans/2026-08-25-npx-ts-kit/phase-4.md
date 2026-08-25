# Phase 4 — 2 implementers, parallel (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 3
**Magnet files this phase touches:** none shared — 4.1 owns `src/`, `dist/`, and the root
working copy; 4.2 owns `.github/` only. `package.json` is owned by 4.1 (4.2 must not edit it;
the script names it calls were fixed in phase 1).

### Item 4.1 — CLI (init/update/doctor), committed dist, self-init of this repo
**Files:** `src/cli.ts` (new), `dist/cli.js` (built, committed), root working copy refresh:
`.claude/**` (managed files replaced by the template's `.ts` kit, `.py` hooks deleted,
`.gitignore` restored from `gitignore`), root `CLAUDE.md` (filled in for the kit repo),
`.claude/cl-workflow.lock` (new), `LICENSE` (new: standard MIT text, "Copyright (c) 2026
Safricloud" — owner decision 9, resolves #1), `package.json` (`"license": "MIT"`; scripts
only if one needs correcting).
**Approach:** One-file CLI, zero runtime deps, erasable TS, compiled by `tsc -p
tsconfig.build.json` to committed `dist/cli.js`.
- `init [dir]`: copy `template/**` → target; rename `gitignore` → `.gitignore`; never clobber
  (existing file → write `<name>.new` only if content differs, else skip silently); write
  `.claude/cl-workflow.lock` `{kitVersion: {version, sha|null}, files: {path: sha256}}` —
  sha256 over LF-normalised bytes; recover the git SHA from the parent install's
  `package-lock.json` `resolved` field when present (facts table), else null.
- `update [dir]`: managed list (const in `cli.ts`, from investigation-structure's 20/9/1
  split): hash matches any shipped version → overwrite; edited → `<name>.new` + warn; owned →
  never touched; `settings.json` → deep-merge only `worktree.baseRef` + the kit's three hook
  entries. **The manifest is derived from `template/` as it exists at build time, not from the
  investigation's stale list**: it must carry the seven `.ts` hook files AND
  `.claude/hooks/package.json` (the ESM shim — a stale manifest here means every hook fails
  open on a `"type":"commonjs"` project), and no `.py` name. Simplest correct form: walk
  `template/` at runtime and classify by the owned-list (the 9 owned + settings.json); managed
  = everything else.
- `doctor [dir]`: Node ≥ 24; lock present and parseable; settings.json hook commands point at
  files that exist; selftest run and **60/60** (phase 2.5 grew the suite) — say loudly that a
  hook with a broken path fails OPEN (the README's own warning, now mechanised).
- Self-init: run the built CLI's `init` on this repo root. Expected effect: root
  `.claude/hooks/*.py` deleted first (they are not in template), `.ts` kit + fixed
  `.gitignore` + settings.json land, `mem/` and live `docs/` records untouched (owned/absent
  from template), lock written. Then fill root `CLAUDE.md` with real kit facts: stack (TS 6,
  Node ≥ 24, pnpm), commands (`pnpm typecheck`, `pnpm build`, `pnpm selftest`), deploy
  `none yet`, process pointer unchanged.
**Conventions that will fail your lint:** erasableSyntaxOnly; `dist/` must be exactly what
`pnpm build` emits (CI diffs it); no `console.log` debugging left in dist; LF.
**Scoped validation:** `pnpm typecheck && pnpm build && git diff --exit-code dist/`;
`node dist/cli.js init "$TMP/smoke"` then `node dist/cli.js doctor "$TMP/smoke"` green and
re-running `init` reports all-skips (idempotent); edit one managed file in the smoke dir,
`update` writes `.new` and warns; root: `node .claude/hooks/rule-zero-selftest.ts` → 60/60,
`git grep -l "python3" -- .claude` empty.
**Acceptance:** smoke init+doctor green on this Windows machine; self-inited root gates
actually fire: piping a guarded command into root `.claude/hooks/rule-zero.ts` denies at
exit 0; reverting this item leaves no `dist/` → `npx` path dead.
#### Status — item 4.1
**Done** — 2026-08-25, branch `worktree-agent-a71fbc820d586eb51`, from `2d8f41c`.

**Files touched:** `src/cli.ts` (new), `dist/cli.js` (built, committed), `LICENSE` (new),
`package.json` (`"license": "MIT"` only), root working copy per self-init
(`.claude/**` incl. `.claude/cl-workflow.lock`, `docs/guides/agent-workflow.md`), root
`CLAUDE.md`, and this status block. `.github/` untouched (4.2's).

**The CLI.** One file, 746 lines of source → 692 emitted, zero runtime dependencies, `node:`
builtins only, erasable syntax only. `dist/cli.js` is exactly `tsc -p tsconfig.build.json`'s
output — the shebang survives the emit, so the `bin` shim works on POSIX too.

- **Manifest derived from `template/` at run time**, never a list. `walk(template/)` →
  classify by the 9-entry `OWNED` const plus `settings.json` → everything else managed. The
  measured effect: 33 payload files, **23 managed / 9 owned / 1 merged**, and the seven `.ts`
  hooks, `lib.ts` and the ESM shim `.claude/hooks/package.json` all land (verified by name in
  the init output and by `doctor`'s explicit `{"type":"module"}` check).
- **`gitignore` → `.gitignore`** on the way out, by basename, so the npm-pack drop is worked
  around for whatever the payload ships under that name.
- **Hashes are `sha256-lf`** — sha256 over `readFileSync(p,'utf8').replace(/\r\n/g,'\n')`,
  and the algorithm name is written into the lock so the choice is self-describing.
- **`kitVersion` SHA recovery** implemented per investigation-packaging §3: walk `../../` then
  `../../../` from the package root for `package-lock.json`, find the `packages` key ending in
  `node_modules/<name>`, split `resolved` on `#`, accept only a 40-hex SHA, else `null`.
- **`update` conflict policy**: managed file matching the template → no-op; matching the hash
  the lock says the kit installed → overwritten; anything else → `<name>.new` + warn, original
  untouched, lock not advanced. Owned → not read, not written. A path in the lock that the
  template no longer ships → deleted **only** if it still hashes to what the kit installed,
  otherwise warned about and left.
- **`settings.json` merge** touches `worktree.baseRef` and, inside only the matcher groups the
  template ships, only the entries whose `command`/`args` name a `.claude/hooks/<stem>` in the
  kit's own hook manifest. Ownership is structural (no marker key — the hook-entry schema is a
  closed set). The stem comparison ignores the extension, which is what retires a legacy
  `python3 …/rule-zero.py` entry instead of leaving it beside its replacement.
- **`doctor`** runs six checks: Node ≥ 24 (`engines` is advisory, so it is checked here); lock
  present and parseable; `settings.json` parses and every kit hook command resolves to a file
  that exists; the ESM shim is `{"type":"module"}`; all seven hook scripts on disk (four are
  wired from agent frontmatter and the skill, not from `settings.json`); self-test **60/60**.
  Every wiring failure prints the fail-OPEN warning verbatim. Managed-file drift is reported as
  a `warn`, not a failure — a local edit is legal, it just means `update` hands you a `.new`.

**Self-init of this repo — how the stale files were removed.** `init`/`update` cannot delete
what no lock records, and this repo had never been installed, so the pre-clean was explicit and
is its own line in commit `0f906a3`: `git rm` of the seven `.claude/hooks/*.py` (not in
`template/`), the broken `.claude/.gitignore` (superseded by the renamed `gitignore`), and five
managed copies that had diverged **only** by phase 3's own rewrites — verified before deleting:
`rules/process.md` 2 lines, `agents/investigator.md` 2, `SKILL.md` 8, `agent-workflow.md` 8,
`rule-zero.conf` 4/2 (header dialect note), all of them `python3`→`node` / `.py`→`.ts`. Then
`node dist/cli.js init .`: **17 written, 15 skipped, 1 left beside as .new**. `settings.json`
went through the merge path and its three `python3` entries were retired in place. The one
`.new` was `mem/outstanding.md.new` — this repo's ledger has legitimately diverged from the
seed; it was deleted, and `mem/`, `docs/history/`, `docs/plans/` and `docs/reviews/` were never
written. The CLI never touches `.claude/rule-zero.grants` or `.claude/rule-zero.log`; the log
does now exist at the root because the deny check below appended to it, and the fixed
`.claude/.gitignore` correctly keeps it out of the index. Root `CLAUDE.md` then
replaced the placeholder with real kit facts in the template's shape (stack, the four command
lines, the three conventions, Deploy `none yet`, Process section verbatim from the template).

**Validation — actual output:**
- `pnpm typecheck && pnpm build && git diff --exit-code dist/` → no diagnostics, no drift,
  **exit 0**.
- `node dist/cli.js init "$TEMP/cl-smoke"` → `init: 33 written, 0 skipped, 0 left beside as
  .new`, exit 0.
- `node dist/cli.js doctor "$TEMP/cl-smoke"` → six `ok` lines ending
  `ok self-test 60/60` / `doctor: 6 passed, 0 failed`, **exit 0**.
- re-run `init` → `init: 0 written, 33 skipped, 0 left beside as .new`, exit 0 (idempotent).
- appended a line to `.claude/hooks/status-block.ts`, then `update` →
  `warn .claude/hooks/status-block.ts has local edits — wrote …status-block.ts.new beside it,
  yours untouched`; `update: 0 refreshed, 23 already current, 1 left beside as .new, 0 removed,
  9 owned files untouched`; `.new` present, original still edited. `doctor` then adds
  `warn 1 managed file(s) locally edited: .claude/hooks/status-block.ts` and still exits 0.
- smoke dir has `.claude/.gitignore` (True) and no `.claude/gitignore` (False); its
  `.claude/hooks/package.json` is `{"type":"module"}`.
- Root: `node .claude/hooks/rule-zero-selftest.ts` → `60/60 cases passed; 39 lines logged`,
  exit 0. `pnpm selftest` (template copy) → same.
- Root: `git grep -l "python3" -- .claude` → no output, **exit 1 (empty)**.
- Root: `echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin feat/x"}}'
  | node .claude/hooks/rule-zero.ts` → one `permissionDecision":"deny"` JSON line naming
  `rule-zero.conf:33 guard git push …`, **exit 0** (deny channel intact).
- Root: `git check-ignore -v` now names a matching line for all four runtime paths
  (`rule-zero.grants`, `rule-zero.log`, `worktrees/x`, `pr-watch/1.json`) — the broken-anchor
  defect is gone from this repo's own install.
- `npm pack --dry-run` → 37 files, including `dist/cli.js` (29.5kB),
  `template/.claude/gitignore` (65B), `template/.claude/hooks/package.json` (18B), `LICENSE`.
- Blob identity check: `git ls-files -s .claude/hooks/rule-zero.ts template/.claude/hooks/rule-zero.ts`
  → same SHA, same mode. The generated root copy is byte-identical to the template.

**Extra verification (npx layout simulated, since the branch is unpushed).** Copied
`dist/ template/ package.json` to `<tmp>/node_modules/@safricloud/cl-workflow/` with a
`package-lock.json` two levels up whose `resolved` ends `#1e85979…`. `init` reported
`cl-workflow 0.6.0+1e85979` and wrote `"sha": "1e85979befb21d25eca6ee9c3de1f3ff2adb0070"`;
`doctor` from inside `node_modules` passed 6/6 with the self-test at 60/60 — so the CLI runs
where npx puts it and the `.ts` hooks run once copied out, which is the whole premise.

**Update-path verification (a second kit version, simulated).** Copied the package to a scratch
kit, inited a target, then edited `template/.claude/rules/process.md` and deleted
`template/.claude/hooks/pr-watch.ts` in the scratch kit. `update` → `update .claude/rules/process.md`
(overwritten in place, no `.new`) and `remove .claude/hooks/pr-watch.ts (no longer shipped)`;
target file gone. Both branches of the conflict policy are exercised, not just the safe one.

**Merge verification.** Against a hand-written `settings.json` carrying `permissions`, `model`,
`worktree.other`, a foreign `Stop` event, a foreign hook entry inside the kit's own matcher
group, and a legacy `python3 …/rule-zero.py` entry: everything foreign survived byte-stable,
`worktree.baseRef` became `head`, and the legacy entry was replaced in place by the `node …
rule-zero.ts` entry — the foreign sibling kept its position.

**Deviations / judgement calls (veto in the PR):**
1. **`init` merges `settings.json` rather than writing `settings.json.new`.** The literal
   contract line is "existing file → `<name>.new` if content differs". Applied to
   `settings.json` that would leave the gate unwired in every project that already has a
   settings file — the exact fail-open the kit exists to prevent — and the merge is
   non-destructive by construction. Every other file follows the literal rule.
2. **Lock carries two constant fields beyond the contract's `{kitVersion, files}`:**
   `hashAlgo: "sha256-lf"` (investigation-packaging §3 asks for it) and `hooksManifest`
   (`update` needs it to recognise and retire entries for hooks a newer kit drops). No
   `generatedAt`: the lock is a pure function of kit + install state, so re-running `update`
   produces no diff churn.
3. **"Matches any shipped version" is implemented as "matches the template, or matches the hash
   the lock records".** The investigation's full `known-hashes.json` history needs released
   versions to have a history; there is one release. The degradation is safe in the right
   direction (a lost lock produces `.new` files, never a silent overwrite) and the warning says
   so.
4. **`doctor` asserts the self-test's case count is exactly 60** (`EXPECTED_SELFTEST_CASES`),
   per the contract. That deliberately couples CLI to payload: a target whose hooks are from a
   different kit version fails with "run `cl-workflow update`". Bump the const with the suite.
5. **Explicit pre-clean before the self-init** (above) rather than making `init` clobber. The
   deleted files are all in git history; the deletion is one reviewable commit.
6. **EPIPE fix found during validation** (`43832c4`): `node dist/cli.js init | head -3` closed
   stdout and killed the process partway through the install. `process.stdout.on("error")`
   swallows it — an async stream event no try/catch around the write can see.

**Conflicts between README.md and reality (recorded, not fixed — README is not this item's
file):** README §"Managed, owned, merged" still says **"Managed (20 files)"**. The template now
ships 23 managed files — `lib.ts`, `.claude/hooks/package.json` and `.claude/.gitattributes`
were added after the investigation counted. The owned count (9) and merged count (1) are
correct. Nothing in the CLI reads those numbers; a one-line README edit would fix it.
No other README/phase-4 conflict was found — `init`'s never-clobber rule, the `gitignore`
rename, the lock path, `update`'s three-way policy, the `settings.json` merge scope and
`doctor`'s 60/60 all match phase-4 as implemented.

### Item 4.2 — CI workflow
**Files:** `.github/workflows/ci.yml` (new).
**Approach:** Trigger: `on: pull_request: branches: [main]` — nothing else; no push triggers,
so nothing runs after a merge (owner decision 2). Jobs: `test` — matrix
`os: [ubuntu-latest, windows-latest]`, Node 24 (`actions/setup-node@v4`),
`pnpm/action-setup@v4` reading the `packageManager` pin, then: `pnpm install --frozen-lockfile`,
`pnpm typecheck`, `pnpm build`, `git diff --exit-code dist/` (dist drift gate),
`pnpm selftest` (must print 60/60), CLI smoke (`node dist/cli.js init` into a temp dir +
`doctor`). Aggregate job `ci-ok`: `needs: test`, ubuntu-latest, one no-op step — **the job id
and name must be exactly `ci-ok`**; the live ruleset (id 21458765) already requires that
check name, so a mismatch makes every PR unmergeable without bypass.
**Conventions that will fail your lint:** valid YAML; bash-only syntax in `run:` steps must
set `shell: bash` explicitly so Windows legs don't fall to PowerShell parsing; LF.
**Scoped validation:** `node -e` YAML sanity is unavailable without deps — instead
`gh api repos/Safricloud/cl-workflow/actions/workflows` after push will list it (orchestrator
runs this at PR time); locally: run each `run:` line by hand once on this Windows machine.
**Acceptance:** on the PR (opened in §7), both matrix legs and `ci-ok` appear and pass;
`ci-ok` is the reported check name in `gh pr checks`; reverting the workflow leaves the PR
blocked by the ruleset's required check (missing check = not mergeable) — the gate is proven
by its absence.
#### Status — item 4.2
**Done** — 2026-08-25, worktree `agent-a9ceadf814f64dcd1`, branch
`worktree-agent-a9ceadf814f64dcd1`.

**What changed**
- `.github/workflows/ci.yml` (new, 1518 bytes, LF-only, no tabs). The only other edit in this
  branch is this status block. `package.json` untouched, as the phase header requires.
- Shape as shipped: `on: pull_request: branches: [main]` and **nothing else** — no push
  trigger, no schedule, nothing that runs after a merge. Job `test`, matrix
  `os: [ubuntu-latest, windows-latest]`: `actions/checkout@v4` → `pnpm/action-setup@v4` (**no
  `version` input** — it reads the `packageManager` pin `pnpm@10.27.0` from `package.json`, so
  there is no second copy of the version) → `actions/setup-node@v4` with `node-version: '24'`
  → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm build` →
  `git diff --exit-code -- dist/` → `pnpm selftest` → CLI smoke (`shell: bash`: fresh
  `$RUNNER_TEMP/cl-workflow-smoke`, `node dist/cli.js init` then `doctor` on it).
  Job **`ci-ok`**: job id `ci-ok` **and** explicit `name: ci-ok`, `needs: test`,
  `runs-on: ubuntu-latest`, one step.
- Only the smoke step mixes bash syntax, and it carries `shell: bash`; every other `run:` is a
  single bare command that behaves identically under the Windows leg's default pwsh (the pwsh
  wrapper propagates a native command's non-zero exit).

**Validation — actual outputs (this Windows machine, Node v24.4.1, pnpm 10.27.0)**
- **YAML parses.** `pnpm dlx js-yaml .github/workflows/ci.yml` (network fetch, ~2s) dumped the
  whole document. Keys land as intended: `jobs.ci-ok.name = "ci-ok"`,
  `jobs.ci-ok.needs = "test"`, `node-version` survives as the **string** `"24"` (not `24`),
  `on.pull_request.branches = ["main"]`, both `run:` blocks intact.
- `pnpm install --frozen-lockfile` → `Lockfile is up to date, resolution step is skipped` /
  `Already up to date` / `Done in 270ms using pnpm v10.27.0`, exit 0.
- `pnpm typecheck` → no output, **exit 0**.
- `pnpm selftest` → `60/60 cases passed; 39 lines logged to rule-zero.log`, **exit 0**.
- `pnpm build` → **fails today**: `error TS18003: No inputs were found in config file
  'tsconfig.build.json'. Specified 'include' paths were '["src"]'`, exit 2. Expected and left
  alone — `src/` and `dist/` arrive with item 4.1; the workflow is written to the plan's
  contract, not to today's tree. Nothing was weakened to make today's tree green.
- `git diff --exit-code -- dist/` → **exit 0** today (no tracked `dist/` yet).
- CLI smoke step, run under GitHub's own invocation (`bash --noprofile --norc -eo pipefail`)
  with `RUNNER_TEMP` set to a Windows-style path and `node -e` standing in for the not-yet-built
  `dist/cli.js`: `rm -rf` / `mkdir -p` / argument passing all clean, node resolved the argument
  to `C:\…\runner-temp-sim\cl-workflow-smoke` with `existsSync` true, exit 0.
- `ci-ok` step body: `needs.test.result = success` → exit 0; `= failure` → **exit 1**.
- `node -e` byte check on the file: 0 CRLF, 0 tabs, trailing newline present.
  `git diff --check` clean.

**Deviations / recorded additions** (small, each revertible on its own)
1. **`ci-ok` has `if: always()` and its one step asserts
   `[ "${{ needs.test.result }}" = "success" ]`** rather than being a bare no-op. With a plain
   `needs: test` and no `if`, a failing matrix leg leaves `ci-ok` **skipped** — and GitHub
   documents a skipped job as reporting status *success*, which "will not prevent a pull
   request from merging, even if it is a required check". The required check would then pass on
   every PR, red legs included. Still one job, one step, same id and name; the assert turns the
   check red instead of making it disappear. Revert to `run: echo ok` if the orchestrator
   confirms the ruleset treats a skipped check as blocking.
2. **`git diff --exit-code -- dist/`** — added the `--` pathspec separator. Measured today:
   without it, `git diff --exit-code dist/` exits **128** with `fatal: ambiguous argument
   'dist/': unknown revision or path not in the working tree` whenever no tracked `dist/`
   matches (also immunises it against a ref named `dist`). Behaviour once 4.1 lands is
   identical. Note the gate as specified catches **modified tracked** files only — a brand-new
   untracked emit under `dist/` would slip past `git diff`; kept the plan's command rather than
   widening it unasked.
3. **`permissions: contents: read`** at workflow level — nothing in the run needs write.
4. **`fail-fast: false`** on the matrix — in a repo whose whole point is cross-platform gates
   (`path-fence.py` denied every Windows write for months), a Windows failure must not be
   cancelled away by a Linux one.
5. **Smoke dir is `$RUNNER_TEMP/cl-workflow-smoke`, not `mktemp -d`.** Both work under Git Bash
   on Windows (measured: MSYS converts `/tmp/tmp.X` to `C:/Users/…/Temp/tmp.X` before node sees
   it), but `$RUNNER_TEMP` needs no translation and keeps the workspace clean.

**Not provable locally — orchestrator owns it at PR time**
- That both matrix legs and `ci-ok` appear and pass on the PR, and that `gh pr checks` reports
  the check name literally `ci-ok`.
- The full `test` job cannot be green anywhere until 4.1 merges (`pnpm build` needs `src/`, the
  smoke step needs `dist/cli.js`). If the PR is opened before 4.1 lands, expect both legs red at
  `pnpm build` and `ci-ok` red — that is the workflow working, not a defect in it.
- `pnpm dlx` fetched `js-yaml` from the network for the parse check (recorded per the item's
  validation note); nothing was added to `package.json` or the lockfile — `git status` shows
  only `.github/` and this file.

## Merge-back record (orchestrator)
- Item 4.2 first: worktree clean, 1 commit (`4b91a6b`), merge commit `b5005e7`. No conflicts.
- Item 4.1: first merge attempt **aborted** — the main checkout carried uncommitted local
  modifications to `package.json`/`pnpm-lock.yaml` (devDependency ranges narrowed to installed
  versions by some tool during verification; origin not identified). Resolved by `git stash`
  (kept, not dropped — `restore`/`checkout --` are rule-zero-guarded); second merge clean,
  merge commit `e0f03b9`. **Orchestrator error recorded:** the first attempt's command chain
  ran the worktree cleanup even though the merge failed, deleting the worktree directory
  prematurely — the branch preserved all five commits and nothing was lost, but cleanup must
  never be chained behind an unverified merge again.
- Both worktrees removed, branches `-d` deleted after their merges.

## Verification (orchestrator, after this phase merged)
- `pnpm install --frozen-lockfile && pnpm typecheck && pnpm build && git diff --exit-code
  dist/` → clean. Root selftest **60/60**; template selftest 60/60; root gate live: guarded
  command → deny JSON naming `rule-zero.conf:35` at exit 0, `deny` line appended to
  `.claude/rule-zero.log`; `git grep python3 -- .claude` empty.
- CLI load-bearing regions read: `OWNED` = the investigation's 9; `sha256-lf` normalisation;
  `EXPECTED_SELFTEST_CASES = 60`; `hooksManifest` in the lock. All as specced.
- **Real consumer path measured, three ways** (branch pushed, genuine network fetches):
  `pnpm dlx github:…#feat/…` → init 33 written, doctor **6/6** incl. self-test 60/60;
  `npx` on local npm **11.12.0** → fails before our code runs (upstream git-dep preparation
  regression, contradictory internal flags; no consumer-side workaround);
  `npm@12` → git deps **disabled by default** (`EALLOWGIT`, config `allow-git = "none"`),
  works with `--allow-git=all` (37-file tarball packed from the branch).
- 4.1's six deviations and 4.2's five accepted — notably the `settings.json` merge-on-init
  (the literal `.new` rule would ship a fail-open) and the skip-proof `ci-ok`
  (`if: always()` + result assert; a skipped required check reports success).
- 4.2's remaining acceptance (both matrix legs + `ci-ok` green, check name literal in
  `gh pr checks`) transfers to PR time, §7–§8.
