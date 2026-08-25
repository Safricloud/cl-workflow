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

**The CLI.** One file, 746 lines of source → 692 emitted, zero runtime dependencies, `node:` builtins only,
erasable syntax only. `dist/cli.js` is exactly `tsc -p tsconfig.build.json`'s output — the
shebang survives the emit, so the `bin` shim works on POSIX too.

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
- `npm pack --dry-run` → 37 files, including `dist/cli.js` (29.2kB),
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
*(implementer keeps this current: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
