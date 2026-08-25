# Phase 4 — 2 implementers, parallel (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 3
**Magnet files this phase touches:** none shared — 4.1 owns `src/`, `dist/`, and the root
working copy; 4.2 owns `.github/` only. `package.json` is owned by 4.1 (4.2 must not edit it;
the script names it calls were fixed in phase 1).

### Item 4.1 — CLI (init/update/doctor), committed dist, self-init of this repo
**Files:** `src/cli.ts` (new), `dist/cli.js` (built, committed), root working copy refresh:
`.claude/**` (managed files replaced by the template's `.ts` kit, `.py` hooks deleted,
`.gitignore` restored from `gitignore`), root `CLAUDE.md` (filled in for the kit repo),
`.claude/cl-workflow.lock` (new), `package.json` (only if a script needs correcting).
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
  entries.
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
`update` writes `.new` and warns; root: `node .claude/hooks/rule-zero-selftest.ts` → 57/57,
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
*(implementer keeps this current: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
