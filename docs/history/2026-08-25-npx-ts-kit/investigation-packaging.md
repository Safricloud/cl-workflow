# Investigation — packaging, CLI shape, and branch protection (2026-08-25-npx-ts-kit)

**Brief:** What is the correct package + CLI design for npx-from-GitHub-only installation, and the exact branch-protection + CI configuration that gates PRs into main with admin bypass and zero post-merge CI?
**Scope:** repo root packaging (`package.json`, `bin/`, `templates/`), `.claude/settings.json`, `.github/workflows/`, GitHub repo settings for `Safricloud/cl-workflow`
**Checkout:** `dc189daaeee1cd5300713b92916a8c69664c49bb` (branch `feat/2026-08-25-npx-ts-kit`)

## Answer

Ship the CLI as **plain `.mjs` committed to the repo with no build step** — option (a). Option (c) is not a
judgement call, it is hard-blocked: Node refuses to strip types from any file under `node_modules`, which is
exactly where npx installs the package, so a `.ts` bin dies with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
on every invocation, and neither `--experimental-strip-types` nor `--experimental-transform-types` overrides it
(measured on Node 24.4.1). Option (b) works but buys a per-cold-install devDependency fetch and rides npm's
git-dep "prepare" path, which is the single most fragile path in npm — the owner's own npm 11.12.0 has a
regression that makes *any* git install of a package with a `prepare` script fail outright. The kit's TypeScript
ethos survives intact because the **hook templates stay real `.ts`**: they are copied out of `node_modules` into
the target project's `.claude/hooks/`, where type stripping works normally (measured, Node 22.18.0 and 24.4.1,
zero stderr); only the CLI itself must be `.mjs`, and it can keep full type coverage via JSDoc plus
`tsc --noEmit --checkJs` in CI. For branch protection, use a **ruleset, not classic protection**: `main` does not
exist on the remote yet, classic protection is a sub-resource of the branch and 404s, and classic bypass lists are
org-only while `Safricloud` is a User account.

## Facts

| Fact | Value | Where measured |
| --- | --- | --- |
| node version (this machine) | `v24.4.1` | `node --version` |
| npm version (this machine) | `11.12.0` | `npm --version` |
| npm latest on registry | `12.0.2` | `npm view npm version` |
| `.ts` bin under `node_modules` | **fails**, `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` | `npx --package git+file://…/kit cl-test-kit init` |
| …with `--experimental-strip-types` | same error | `node --experimental-strip-types node_modules/cl-test-kit/bin/cli.ts` |
| …with `--experimental-transform-types` | same error | `node --experimental-transform-types node_modules/…/cli.ts` |
| npm docs on the above | "Node.js refuses to handle TypeScript files inside folders under a `node_modules` path" | nodejs.org/api/typescript.html |
| `.ts` file **outside** `node_modules` | runs, exit 0, **0 bytes stderr** | `node .claude/hooks/example.ts` (Node 24.4.1) |
| same on Node 22.18.0 | runs, exit 0, **0 bytes stderr** | `npx --yes node@22.18.0 .claude/hooks/example.ts` |
| type stripping unflagged since | `v22.18.0` (22.x) / `v23.6.0` (23.x) | nodejs.org/api/typescript.html history table |
| ExperimentalWarning removed in | `v24.3.0` and `v22.18.0` | same history table |
| `.mjs` bin via npx-from-git | **works** | `npx --yes git+file://…/kit-mjs cl-mjs-kit init` → `MJS-BIN-OK` |
| git install **with** `prepare`, npm 11.12.0 | **fails**: `git dep preparation failed` / `--prefer-online cannot be provided when using --prefer-offline` | `npm install git+file://…/kit` |
| …not bypassed by `--ignore-scripts` | still fails | `npm install … --ignore-scripts` |
| root cause | npm/cli issue #9133, regression in 11.12.0 (PR #9129), fixed by PR #9148 | github.com/npm/cli/issues/9133 |
| git install with `prepare`, npm 11.12.1 | **works**, `dist/` built and shipped | `npx --yes npm@11.12.1 install git+file://…/kit-prep2` |
| cost of that prepare install | `11s` (vs `4s` for the no-prepare kit) | same two installs |
| npx warm invocation (local git) | `2081 / 2457 / 2667 ms` | 3× `npx --yes --package git+file://…` |
| npx cold invocation (local git) | `5594 ms` | same after `rm -rf _npx/<hash>` |
| npx network clone (real GitHub repo) | `3587 / 3651 ms` | 2× `npx --yes github:Safricloud/cl-workflow doctor` |
| `github:` shorthand resolves + packs | yes | `npm pack github:sindresorhus/is-plain-obj --dry-run` |
| `npx github:Safricloud/cl-workflow` today | ENOENT on `package.json` — clones, finds no manifest | live run, error path quoted below |
| no-ref git specifier resolves to | the repo's **HEAD / default branch**, not literally `main` | `kit-defbr` with `HEAD → feat/somewhere` → `I AM THE FEATURE BRANCH` |
| `#main` / `#v0.2.0` / `#semver:^1.0.0` / `#semver:0.x` | all resolve correctly | 4× npx runs against tagged `kit-mjs` |
| bare form `npx <giturl> init --force` | argv reaches the bin as `["init","--force"]` | `npx --yes git+file://…/kit-cw init --force` |
| `--yes` assumed when stdin is not a TTY | yes (docs + observed) | docs.npmjs.com/cli/v11/commands/npm-exec |
| PowerShell / cmd.exe parity | identical output to Git Bash | same npx commands via PowerShell + `cmd /c` |
| installed `package.json` has `gitHead` | **no** | `cat _npx/<hash>/node_modules/cl-mjs-kit/package.json` |
| installed `package.json` has `_resolved` | **no** | same |
| git SHA **is** recoverable | `<pkgRoot>/../../package-lock.json` → `packages["node_modules/<name>"].resolved` after `#` | measured in all 4 pinning forms |
| shipped tarball line endings | **CRLF** when installed on this Windows box (`core.autocrlf=true`) | `buf.includes('\r\n')` on the extracted template |
| raw sha256 across LF vs CRLF | **differs** (`77379db7…` vs `c290ea60…`) | hash comparison script |
| LF-normalized sha256 | **identical** (`77379db7…` both) | same script |
| `engines` enforcement | advisory only unless `engine-strict` is set | docs.npmjs.com package-json |
| `Safricloud` account type | **User**, not Organization | `gh api users/Safricloud --jq .type` |
| repo default branch | `feat/2026-08-25-npx-ts-kit` | `gh api repos/Safricloud/cl-workflow` |
| `main` on remote | **does not exist** (404 "Branch not found") | `gh api repos/…/branches/main` |
| `main` locally | exists at `dc189da`, never pushed | `git rev-parse main` |
| classic protection state | 404 "Branch not found" (the *branch* 404s, not the protection) | `gh api repos/…/branches/main/protection` |
| rulesets state | `[]` | `gh api repos/Safricloud/cl-workflow/rulesets` |
| rules for a non-existent branch | `200 []` — endpoint works | `gh api repos/…/rules/branches/main` |
| existing workflows / runs | `0` / `0` | `gh api repos/…/actions/workflows`, `.../runs` |
| token scopes | `gist, read:org, repo, workflow` | `gh auth status` |
| token repo permission | `admin: true` | `gh api repos/… --jq .permissions` |
| required-check name format | `<job name>` — **not** workflow name, **not** `workflow / job` | docs.github.com managing-rulesets/troubleshooting-rules |
| `on: pull_request` default types | `opened`, `synchronize`, `reopened` — merge is `closed`, excluded | docs.github.com events-that-trigger-workflows |

## Observations

### 1. npx-from-GitHub semantics

`npx github:Safricloud/cl-workflow <cmd>` shallow-clones the repo into npm's cache, reads the **root**
`package.json`, packs it, installs it under `~/.npm/_npx/<hash>/node_modules/`, and runs the resolved `bin`.
A root `package.json` with a `bin` entry is mandatory. Today the repo has neither, and the live run fails with:

```
npm error path C:\Users\…\npm-cache\_cacache\tmp\git-cloneYvOrp5\package.json
npm error enoent Could not read package.json
```

**Trap — the default branch, not `main`.** A specifier with no `#ref` resolves the remote's HEAD. I proved this
is genuinely the default branch and not a hardcoded `main`: a fixture repo whose HEAD pointed at
`feat/somewhere` served the feature branch's content, while `#main` served main's. Since
`Safricloud/cl-workflow`'s default branch is currently `feat/2026-08-25-npx-ts-kit`, `npx github:Safricloud/cl-workflow`
would today hand users the feature branch. **The default branch must be flipped to `main` before the kit is
usable**, and `main` must be pushed first (it exists locally at `dc189da` but has never been pushed).

**Pinning.** All four forms work and all correctly report their SHA: `#main` (branch tip, re-resolved every run),
`#v0.2.0` (tag), `#<sha>`, and `#semver:^1.0.0` / `#semver:0.x` (npm matches the range against **git tags**, so
tagging releases `vX.Y.Z` is what makes `#semver:` usable).

**Caching is not stale for moving refs.** I ran npx against `#main`, pushed a new commit, and re-ran with no cache
clear: it picked up the new commit and reported the new SHA. npx re-resolves the ref on every invocation — that
re-resolution *is* the ~2.1–2.7 s warm cost. Cold is ~5.6 s locally and a real GitHub clone costs ~3.6 s on its
own, so budget roughly **2–3 s warm, 5–9 s cold** per invocation over the network. `--yes` is assumed when stdin
is not a TTY, but an interactive first run **will** prompt, so document the command as `npx --yes github:…`.

**Windows parity is clean.** Identical results from Git Bash, PowerShell 7, and `cmd.exe`. npm generates three
shims per bin (`<name>`, `<name>.cmd`, `<name>.ps1`), and each ultimately does `node "<pkg>/<bin path>" %*`.

### 2. The CLI shape — (c) is impossible, (b) is fragile, (a) wins

**(c) `.ts` bin is dead on arrival.** The npm side actually works fine — npm happily accepts `"bin": {"x": "bin/cli.ts"}`
and generates all three shims pointing at the `.ts` file. Node is what refuses. Every invocation path fails:

```
Error [ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING]: Stripping types is currently unsupported
for files under node_modules, for ".../_npx/2b37f479ddacb034/node_modules/cl-test-kit/bin/cli.ts"
```

This is deliberate policy, not a gap — nodejs.org states it exists "to discourage package authors from publishing
packages written in TypeScript." There is no override flag; I confirmed both `--experimental-strip-types` and
`--experimental-transform-types` produce the identical error. The only escape hatch is a `.mjs` shim that copies
the `.ts` out of `node_modules` to a temp dir and re-spawns Node on it — which demonstrably works (that is exactly
what my hook-template test did) but adds a copy plus a second process spawn to every invocation for no benefit.
Reject it.

**(b) prepare-time build works, but sits on npm's most brittle path.** With npm 11.12.1 a `prepare` script
correctly installs devDependencies, builds `dist/`, and `files: ["dist"]` ships only the build output — verified
end-to-end. But on the owner's *current* npm 11.12.0 the same install fails outright:

```
npm error git dep preparation failed
npm error   --prefer-online cannot be provided when using --prefer-offline
```

This is npm/cli#9133: a config-exclusivity check added in 11.12.0 broke pacote's own nested install command. It
breaks **any** git install of **any** package with a `prepare` script, is not bypassable with `--ignore-scripts`,
and would have silently bricked the kit for every user on that npm. It is fixed now, but the lesson stands: option
(b) makes the kit's availability depend on a code path that npm itself does not exercise heavily. It also costs a
devDependency download (esbuild/tsup is 10–20 MB) on every cold npx, and my minimal no-dependency prepare already
took 11 s versus 4 s.

**(a) is the recommendation.** A committed `.mjs` CLI has zero install-time cost beyond the clone, no build, no
devDependency fetch, and no dependence on npm's prepare path. It is also the only option that literally satisfies
"source = artifact" — the file that runs is the file in the repo.

**Keeping the TypeScript ethos.** The apparent cost of (a) is losing TS on the CLI. It is avoidable:

- **Hook templates stay real `.ts`.** They ship inside the package as inert template files and `init` copies them
  into the target project's `.claude/hooks/`. Once outside `node_modules` they run natively — I verified a shipped
  template survives the full git → tarball → `node_modules` → copy-out pipeline and executes with exit 0 and zero
  stderr on both Node 22.18.0 and 24.4.1. The `node_modules` restriction never touches them.
- **The CLI gets types without a build** via JSDoc annotations plus `tsc --noEmit --checkJs` as a CI gate. Full
  type checking, zero emit, the shipped file is the authored file. Keep `"type": "module"` and zero runtime deps.

Whatever the CLI language, keep hook templates **erasable-syntax-only** (no enums, no runtime `namespace`, no
parameter properties, no decorators — those throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` or a parser error), set
`erasableSyntaxOnly: true` (TypeScript 5.8+), and use explicit `.ts` extensions on any relative import between
hooks, which Node requires.

### 3. init / update / doctor

**Line-ending normalization is mandatory, not a nicety.** This is the sharpest finding in the section. The bytes
npm ships from a git install depend on the *installing* machine's git config: because this box has
`core.autocrlf=true`, npm's internal clone checked files out as CRLF and the resulting tarball **contains CRLF**.
The same `npx github:…` on Linux yields LF. So raw-byte hashes are not even stable between two users of the same
kit version, let alone across a user's own `git checkout`:

```
raw sha256   LF variant: 77379db7a681c03215a8f4b3044ee717d19daeebeb0df3a37aeaed873606059d
raw sha256 CRLF variant: c290ea6009ca18a05717c673dee5ca5eb68766f617e2a5a828855f6e25c6a775   → differ
LF-normalized, both     : 77379db7a681c03215a8f4b3044ee717d19daeebeb0df3a37aeaed873606059d   → match
```

Hash `readFileSync(p,'utf8').replace(/\r\n/g,'\n')`, record the algorithm in the lockfile as `"sha256-lf"` so the
choice is self-describing, and write files with LF while letting the user's git do what it likes.

**`kitVersion` for a registry-less install.** The installed `package.json` carries **no** `gitHead` and **no**
`_resolved` — I checked, both are absent. But npx writes a `package-lock.json` at the root of its cache dir, two
levels above the package, and its `resolved` field carries the SHA:

```
"node_modules/cl-mjs-kit": {
  "resolved": "git+file:///…/kit-mjs#effb61590767d2b35aa310d6148f8e301636e105"
}
```

So the CLI learns its own SHA by walking up from its package root to `../../package-lock.json` (fall back to
`../../../package-lock.json` for a nested layout), finding the entry whose key ends in `/<its own name>`, and
splitting `resolved` on `#`. I implemented and measured this: it returned the correct SHA under `#main`, `#v0.2.0`,
`#semver:^1.0.0`, and `#semver:0.x`. Define `kitVersion` as `"<package.json version>+<short sha>"`, degrading to
the bare version when the lockfile is absent (a plain `npm install` into a project, or a `git clone` checkout).

**Lockfile shape** at `.claude/cl-workflow.lock`:

```json
{
  "kitVersion": "1.2.0+1e85979",
  "kitSha": "1e85979befb21d25eca6ee9c3de1f3ff2adb0070",
  "kitSource": "github:Safricloud/cl-workflow",
  "hashAlgo": "sha256-lf",
  "generatedAt": "2026-08-25T16:02:00Z",
  "files": { ".claude/hooks/rule-zero.ts": "77379db7…" },
  "hooksManifest": ["rule-zero.ts", "path-fence.ts", "status-block.ts"]
}
```

**Three-way update logic**, per shipped path:

| Project state | Action |
| --- | --- |
| absent | write it, record hash |
| hash == lockfile hash | unmodified → overwrite, update hash |
| hash matches *any* historically shipped hash for that path | unmodified but lock is stale/missing → overwrite |
| hash matches nothing | locally edited → write `<path>.new`, warn, leave original, do not advance lock |
| in project, never shipped by kit | user-owned → never touch, never delete |
| shipped previously, dropped from kit | delete only if hash matches a known shipped hash; otherwise warn and leave |

The "matches any shipped hash" row is what makes `update` safe when the lockfile is lost — it needs a
`known-hashes.json` shipped in the kit mapping each path to its full history of released hashes. Without it, a
missing lockfile forces every file into the "locally edited" branch and buries the user in `.new` files.

**settings.json merge.** Merge only kit-owned hook entries and leave everything else byte-stable. Do **not** stamp
entries with a marker key — the documented hook-entry schema is a closed set (`type`, `if`, `timeout`,
`statusMessage`, `once`, `command`, `args`, `async`, `asyncRewake`, `shell`) and an unknown key risks rejection.
Instead derive ownership structurally: an entry is kit-owned iff its `command` is `node` and some element of `args`
ends with `${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>` where `<name>` is in `hooksManifest`. Persisting the
manifest in the lockfile is what lets `update` find and retire entries for hooks a newer kit version dropped.

The repo's existing `.claude/settings.json` is already in the right shape — exec form, `${CLAUDE_PROJECT_DIR}`,
explicit `timeout` — so the migration is mechanically `python3` → `node` and `.py` → `.ts`.

**`doctor` must check the Node version itself.** `engines` is advisory only unless the user has set
`engine-strict`, so it will not stop anyone. `doctor` should verify `process.version >= 22.18.0`, that each
manifest hook file exists and is erasable (a trial `node --check`-equivalent import), that `settings.json` parses
and its kit-owned entries point at files that exist, and that the lockfile hashes still match.

### 4. Branch protection — use a ruleset

**Classic protection is not usable here, for two independent reasons.** First, the endpoint is a sub-resource of
the branch: `GET /repos/Safricloud/cl-workflow/branches/main/protection` returns 404 `"Branch not found"`, and so
does `GET .../branches/main` — the 404 is the *branch*, not a missing protection record. You cannot protect
`main` until `main` is pushed. Second, classic bypass beyond the coarse `enforce_admins` flag requires
`restrictions`, and GitHub's docs state "Actors may only be added to bypass lists when the repository belongs to
an organization." `Safricloud` is a **User** account, so that door is closed.

Rulesets have neither problem: they target ref-name *patterns* evaluated at merge time, so they can name a branch
that does not exist yet — confirmed live, `GET /repos/Safricloud/cl-workflow/rules/branches/main` returns
`200 []` rather than 404.

**The call.** `POST /repos/Safricloud/cl-workflow/rulesets`:

```json
{
  "name": "main protection",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      } },
    { "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": true,
        "required_status_checks": [ { "context": "ci" } ]
      } }
  ]
}
```

Four things worth flagging in that body:

- **Use the literal `refs/heads/main`, not `~DEFAULT_BRANCH`.** The alias currently resolves to
  `feat/2026-08-25-npx-ts-kit`, which would protect the wrong branch.
- **`do_not_enforce_on_create: true`** — without it, the act of creating `main` can be blocked by a check that
  cannot possibly have run yet.
- **`actor_id: 5` is the one unverified value in this report.** GitHub does not document repository-role IDs
  anywhere (open request: github/rest-api-description#4406); `5` = Repository admin is the consistently observed
  value. Read the ruleset back with `GET /repos/Safricloud/cl-workflow/rulesets/{id}` immediately after creating
  it and confirm, or create the bypass once in the UI and read the real ID out.
- **`bypass_mode: "always"`** lets an admin merge past a red or pending check. `"pull_request"` would restrict the
  bypass to PR merges only, which is arguably the better fit for "admins can override" — but `"always"` matches
  the stated requirement more literally. Worth an owner decision.

**Zero post-merge CI is a property of the workflow, not the ruleset.** A workflow declaring only `on: pull_request`
is not subscribed to `push` at all, and the default activity types are `opened`, `synchronize`, `reopened` —
merging fires `closed`, which is excluded. So merging the PR (which does update `refs/heads/main`) triggers nothing.
The requirement is simply: **do not add a `push:` trigger and do not add `types: [closed]`.**

Token scopes are sufficient — both endpoints document `repo` as the requirement, the token has `repo` plus
`workflow` (needed separately to push `.github/workflows/*`), and it holds `admin: true` on the repo.

**Order of operations:** push `main` → set default branch to `main` → land `.github/workflows/ci.yml` via PR →
create the ruleset → verify `bypass_actors` by reading it back.

### 5. CI workflow

The required-check name is the **job name**, and GitHub's troubleshooting doc is explicit that "required status
checks do not take workflow, matrix, or event trigger types into account." Each matrix leg therefore produces its
own check named `test (ubuntu-latest, 22.18)` and so on — requiring those directly is brittle and re-breaks every
time the matrix changes. Use a **fan-in gate job with a fixed name** as the single required context:

```yaml
name: ci
on:
  pull_request:
    branches: [main]

jobs:
  test:
    name: test (${{ matrix.os }}, node ${{ matrix.node }})
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: ['22.18', '24.x']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node }}' }
      - run: node --version
      - run: node test/selftest.ts          # ported TS selftest
      - run: node bin/cl-workflow.mjs init --dir "${{ runner.temp }}/smoke"
      - run: node bin/cl-workflow.mjs doctor --dir "${{ runner.temp }}/smoke"

  ci:
    name: ci
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[ "${{ needs.test.result }}" = "success" ] || exit 1'
```

The required context is then the single stable string **`ci`**. Notes: `if: always()` is what makes the gate fail
rather than skip when a matrix leg fails — a skipped required check counts as passing, which would silently open
the gate. Job names must be unique across all workflows in the repo, or the checks collide. And per GitHub's own
warning, never add `paths:` filters to a required workflow — a filtered-out run leaves the check pending forever
and permanently blocks the merge. The `branches: [main]` filter is safe because it filters the PR's *base* branch
and the ruleset only applies to `main`.

### 6. Hooks and the engines floor

Exec form is real and is explicitly the cross-platform recommendation. The docs say: "Set `args` whenever the hook
references a path placeholder, since each element is passed as one argument with no quoting… There is no shell, so
each `args` element is one argument exactly as written." And on Windows specifically: the `.cmd`/`.bat` shims npm
installs "are not executables and can't be spawned without a shell… The `node` plus script-path pattern works on
every platform because `node.exe` is a real binary." So the target shape is exactly:

```json
{ "type": "command", "command": "node",
  "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/rule-zero.ts"],
  "timeout": 10, "statusMessage": "rule zero" }
```

`${CLAUDE_PROJECT_DIR}` is substituted into both `command` and each `args` element, and is also exported as an env
var on the spawned process.

**Stderr noise on exit 0 is a non-issue.** The docs are unambiguous: "Stderr from a hook that exits 0 goes to the
debug log only, never the transcript, and Claude never sees it." So even on Node versions that do emit the
ExperimentalWarning, a passing hook produces no user-visible noise. It would only surface on a non-zero, non-2 exit,
where the transcript shows the first line of stderr — and there the warning could mask the real error message.

**Recommend `"engines": {"node": ">=22.18.0"}`.** That is the exact version where two things coincide: type
stripping became unflagged on the 22.x line, and the ExperimentalWarning was removed (backported from v24.3.0). I
measured Node 22.18.0 running a shipped `.ts` hook with **zero bytes on stderr**, confirming the floor is clean.
Requiring `>=24` would buy nothing — 22.18.0 is already warning-free — and would exclude Node 22 LTS, which is the
version most teams are actually on. The only rough edges above the floor are Node 23.x and 24.0–24.2, which do emit
the warning; given that hook stderr on exit 0 is discarded, that is cosmetic. Because `engines` is advisory unless
`engine-strict` is set, `doctor` must enforce the floor itself.

## Not done / could not measure

- **No writes to GitHub.** No ruleset was created, no branch pushed, no default branch changed. The ruleset POST
  body above is assembled from the REST reference and is **not** validated against the live API.
- **`actor_id: 5` for `RepositoryRole` is undocumented by GitHub** and unverified against this repo. It must be
  confirmed by reading the ruleset back after creation.
- **Single platform.** Everything was measured on Windows 11 with Node 24.4.1 / npm 11.12.0 (plus Node 22.18.0 via
  `npx node@22.18.0`). No Linux or macOS measurement; the CI matrix is the place to confirm parity.
- **Node 23.x and 24.0–24.2 ExperimentalWarning behavior is doc-derived, not measured.** The warning *text* is
  sourced from Node's commit history, not from the docs, which never print it.
- **No successful end-to-end `npx github:Safricloud/cl-workflow` run** — the repo has no `package.json`, so only
  the clone step could be timed. All package-level behavior was measured against `git+file://` fixtures, which
  exercise the same pacote code path.
- **npm's fix for #9133 was verified empirically at 11.12.1**, not read from a changelog; the exact patch version
  boundary between 11.12.0 and 11.12.1 was not independently confirmed.
- **CRLF measurement reflects this machine's `core.autocrlf=true`.** A user with `autocrlf=false` or `input` would
  receive LF — which is precisely the cross-user instability the LF-normalized hash is there to absorb.

## Live reads taken

- `node --version` → `v24.4.1`; `npm --version` → `11.12.0`
- `gh auth status` → account `Safricloud`, scopes `gist, read:org, repo, workflow`
- `gh api users/Safricloud --jq .type` → `User`
- `gh api repos/Safricloud/cl-workflow` → `default_branch: feat/2026-08-25-npx-ts-kit`, `visibility: public`,
  `allow_squash_merge: true`, `allow_auto_merge: false`, `delete_branch_on_merge: false`, `permissions.admin: true`
- `gh api repos/Safricloud/cl-workflow/branches` → one branch, `feat/2026-08-25-npx-ts-kit`, `protected: false`
- `gh api repos/Safricloud/cl-workflow/branches/main` → `404 {"message":"Branch not found"}`
- `gh api repos/Safricloud/cl-workflow/branches/main/protection` → `404 {"message":"Branch not found"}`
- `gh api repos/Safricloud/cl-workflow/rules/branches/main` → `200 []`
- `gh api repos/Safricloud/cl-workflow/rulesets` → `[]`
- `gh api repos/Safricloud/cl-workflow/actions/workflows` → `{"total_count":0,"workflows":[]}`
- `gh api repos/Safricloud/cl-workflow/actions/runs` → `total_count: 0`
- `gh pr list --repo Safricloud/cl-workflow --state all` → empty
- `git rev-parse main` → `dc189daaeee1cd5300713b92916a8c69664c49bb` (local only, unpushed)
- `npx --yes github:Safricloud/cl-workflow doctor` → `ENOENT … Could not read package.json` (~3.6 s, ×2)
- `npm pack github:sindresorhus/is-plain-obj --dry-run` → resolved and packed `is-plain-obj-4.1.0.tgz`
- `npm view npm version` → `12.0.2`; versions `11.12.0 … 11.19.0, 12.0.0 … 12.0.2`
- Local fixtures built and installed under the scratchpad: `kit` (`.ts` bin + `prepare`), `kit-noprep`,
  `kit-mjs` (tagged `v0.2.0`/`v0.3.0`/`v1.0.0`/`v1.1.0`), `kit-prep2` (prepare-time build), `kit-defbr`
  (non-`main` HEAD), `kit-cw` (real-world name/bin shape) — all via `git+file://` + `npx` / `npm install`
- WebFetch: docs.npmjs.com `using-npm/scripts`, `commands/npm-exec`, `configuring-npm/package-json`;
  github.com/npm/cli/issues/9133
- Delegated doc research (read-only): docs.github.com branch-protection + rulesets + Actions events;
  code.claude.com/docs/en/hooks; nodejs.org/api/typescript.html
