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
*(implementer keeps this current: In progress → Done | Blocked)*

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

## Verification (orchestrator, after this phase merged)
