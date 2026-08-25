# Review — One repo, one npx command: the kit as a GitHub-installed package (2026-08-25-npx-ts-kit)

**The ask:** Reshape cl-workflow into an npm package installed via `npx github:Safricloud/cl-workflow` (no npm registry), port the seven Python hooks to TypeScript, and gate merges to `main` with PR-only CI plus admin override — owner, in conversation, 2026-08-25.
**Issue:** none · **Checkout:** `main` @ `dc189da` · **Branch:** `feat/2026-08-25-npx-ts-kit`
**Investigations:** `investigation-hooks.md`, `investigation-structure.md`, `investigation-packaging.md` (this directory)

## Short answer

The reshape is feasible and the port is safe: every conf regex you have written survives the
Python→JavaScript move (measured, 1,300 pattern×subject cells, zero differences), and every
hook's contract maps onto Node builtins with no dependencies. More importantly, the port is
not cosmetic — on this Windows machine the kit's gates are **inert today** (`python3` is the
Microsoft Store stub), so the protection the kit promises does not currently exist here.
Two facts change the design details: the CLI itself cannot ship as `.ts` (Node refuses to
strip types inside `node_modules` — hooks are unaffected because they are copied out into
projects), and `main` has never actually been pushed to GitHub, so today `npx` would serve
the feature branch and branch protection has nothing to attach to.

## What we found

**1. The gates are dead on Windows right now.** `python3` resolves to the Store alias stub
(exit 49), so rule-zero, status-block and reload-plan never run, and a hook that cannot start
fails *open*. Separately, `path-fence.py` has a path-separator bug that denies *every* write
on Windows, including its own allowed prefix. ([investigation-hooks.md](investigation-hooks.md),
[investigation-structure.md](investigation-structure.md))

**2. `main` is not on GitHub.** The remote's default branch is this feature branch; local
`main` (`dc189da`) was never pushed. A ref-less `npx github:Safricloud/cl-workflow` resolves
the remote HEAD, i.e. the feature branch. Branch protection must be a **ruleset**, not classic
protection: classic 404s on a branch that does not exist and cannot bypass-list on a User
account, while a ruleset targets the pattern and grants repository admins bypass.
([investigation-packaging.md](investigation-packaging.md))

**3. The CLI must be JavaScript; the hooks stay TypeScript.** Node hard-refuses type
stripping for files under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`,
measured on 24.4.1), which is where npx puts the package — so a `.ts` bin dies on every
invocation, and the `prepare`-build alternative rides npm's most fragile path (currently
broken outright in npm 11.12.0 for git installs). The hook templates are unaffected: they are
copied out of the package into each project's `.claude/hooks/`, where `.ts` runs natively with
zero stderr on Node 24. ([investigation-packaging.md](investigation-packaging.md))

**4. Your conf files survive the port.** All 26 active `rule-zero.conf` patterns compile and
behave identically as JavaScript RegExp — provided the port compiles them without the `u`
flag and keeps the existing fail-closed handling for patterns that do not compile. The port
must also reproduce a subtle contract: rule-zero says "deny" via stdout at exit 0, so an
error handler that exits non-zero would silently convert denials into fail-open.
([investigation-hooks.md](investigation-hooks.md))

**5. The audit trail is currently committable.** All four patterns in `.claude/.gitignore`
are anchored wrongly and match nothing — the grants file and log the kit promises to keep out
of history are not ignored. Compounding it, `npm pack` silently drops `.gitignore` files from
packages, so the payload must ship it under another name and `init` must restore it.
([investigation-structure.md](investigation-structure.md))

**6. Windows checkouts would break a naive `update`.** A fresh clone CRLF-rewrites every
file, changing every byte-hash. The kit repo and the payload each need a `.gitattributes`,
and the update manifest must hash LF-normalised content.
([investigation-structure.md](investigation-structure.md))

**7. Housekeeping.** Four byte-identical duplicates sit at the repo root (`SKILL.md`,
`agent-workflow.md`, `docs-only.py`, `pr-watch.py`); the README claims the selftest prints
52/52 when it prints 57/57. ([investigation-structure.md](investigation-structure.md))

**8. The move itself is clean.** No payload cross-reference breaks under `template/` — every
path is target-project-relative or resolved from `${CLAUDE_PROJECT_DIR}`. The payload splits
20 managed / 9 owned / 1 merge-carefully (`settings.json`, where the kit owns only
`worktree.baseRef` and its three hook entries).
([investigation-structure.md](investigation-structure.md))

## What is right, and should not be changed

The grants/log file formats and the conf dialect (owner-authored conf files must remain valid
verbatim); `deny > allow > guard` precedence and per-segment Bash judgement; the permissive
posture, one-id naming, and everything under *Settled* in `mem/outstanding.md`; the
process documents' content (only their command examples change from `python3 …` to `node …`).

## Directions we could take

### A — Full reshape in one contribution
Move the payload under `template/`, port all seven hooks to erasable `.ts`, add the `.mjs`
CLI (`init`/`update`/`doctor`), fix the defects found (gitignore, path-fence, CRLF, docs),
add PR-only CI (ubuntu + windows, Node 24), push `main`, set it default, attach the ruleset.
Costs: the largest single PR this repo will see; phased internally so hooks, CLI and repo
plumbing land as separate reviewable phases.

### B — Port the hooks in place first, reshape second
Two contributions: hooks to `.ts` in the current layout, then the package reshape. Lower
per-PR risk, but the repo stays un-installable via npx in between, and every call site is
touched twice.

### C — Claude Code plugin distribution
Foreclosed by your decision for npx-from-GitHub; recorded only so the road not taken is named.

**Recommendation:** A. The pieces are interlocked (the port changes the very files the
reshape moves), the repo has no consumers yet, and CI plus the selftest give the PR a real
gate on both OSes.

## Decisions we need from you

Already decided by you in conversation (recorded, not re-asked): npx from GitHub only, no
registry · PR-gated CI with admin bypass, no post-merge CI · Node ≥ 24 · TypeScript 6 with
`tsc` · pnpm as package manager.

1. **CLI authoring shape.** (a) Committed `.mjs` with JSDoc types, checked by
   `tsc --noEmit --checkJs` — single source of truth, nothing built, recommended; or
   (b) `.ts` source compiled by `tsc` into a *committed* `dist/cli.mjs` with a CI job that
   fails when dist drifts from src — closer to "author everything in TS", at the cost of a
   committed build artifact. Hooks are real `.ts` either way. **Recommend (a).**
2. **Repo settings writes** (rule-zero shaped; exact commands): `git push -u origin main`,
   then `gh api -X PATCH repos/Safricloud/cl-workflow -f default_branch=main`, then
   `gh api -X POST repos/Safricloud/cl-workflow/rulesets` creating a ruleset on `main`
   requiring the CI check with repository-admin bypass. **Recommend yes to all three.**
3. **One PR or split.** Direction A as one PR with internal phases, or B's two PRs.
   **Recommend one PR.**

## What this review did not do

Did not run any hook port (no code exists yet); took npm/cli#9133 (prepare-script git-install
regression) from the issue tracker rather than reproducing it; did not measure `npx` cache
staleness across machines; did not design the `update` command's settings-merge edge cases
beyond naming the kit-owned keys; did not touch GitHub settings — all reads.

---
## Decisions (recorded 2026-08-25)

From conversation, before the Questions round:
1. Distribution → **npx from GitHub only; never published to the npm registry** — "I would
   like to use npx directly from the github repo (no NPM registry needed)"
2. Merge gate → **CI gates merging to main via PRs; no CI after merge; admin override
   allowed** — "CI gating merging to main, but no CI after merging to main … allow admin
   override for merging"
3. Node floor → **≥ 24** — "Node version floor is 24"
4. Compiler → **TypeScript 6 with tsc** — "we will need TypeScript 6 and its compiler"
5. Package manager → **pnpm** — "We can use pnpm for the manager"

From the Questions round:
6. CLI shape → **`.ts` source compiled by tsc 6 into a committed `dist/cli.mjs`, with a CI
   job that fails when dist drifts from src**
7. Repo settings writes → **yes to all three**: push `main`, set it as default branch,
   create the ruleset (required check `ci-ok`, repository-admin bypass)
8. PR scope → **one PR, phased internally**

**Rule-zero grants written:**
`^gh api -X PATCH repos/Safricloud/cl-workflow -f default_branch=main$` for the default-branch
change; `^gh api -X POST repos/Safricloud/cl-workflow/rulesets --input .*` for the ruleset.
