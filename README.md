# The contribution kit (v0.6)

A Claude Code process — the ten-phase `/contribute` loop — plus the mechanisms that hold it up:
a permission gate, five hooks, two sub-agent definitions, and the guide they all refer to.
Permissive by design: nothing here prompts, and nothing fires on ordinary work. The only things
that ever block are the shapes in `rule-zero.conf`, and for the orchestrator those are unlocked
by a single-use grant that records the owner's "yes".

The kit installs itself into a project with one command and keeps itself up to date with
another. It is installed from GitHub; it is never published to the npm registry.

## Install

Requires **Node ≥ 24** and nothing else. The hooks are TypeScript run natively by Node's type
stripping — there is no build step and no runtime dependency in a target project.

```
cd your-project
npx github:Safricloud/cl-workflow init
node .claude/hooks/rule-zero-selftest.ts     # must print 57/57 and exit 0
```

Put that self-test in CI. A hook whose script path is wrong is reported by Claude Code as a
**non-blocking** error and the tool call proceeds — the self-test is the only thing that proves
the gate is live. `doctor` runs it for you.

## The three commands

| Command | What it does |
| --- | --- |
| `cl-workflow init [dir]` | Copies the payload into `dir` (default `.`). Never clobbers: an existing file with different content is written beside it as `<name>.new`; identical content is skipped silently. Renames the shipped `gitignore` to `.claude/.gitignore`. Writes `.claude/cl-workflow.lock`. |
| `cl-workflow update [dir]` | Refreshes the **managed** files only. A managed file still matching a shipped version is overwritten; one you have edited gets a `<name>.new` beside it and a warning. **Owned** files are never touched. `settings.json` is merged, not replaced — only `worktree.baseRef` and the kit's three hook entries. |
| `cl-workflow doctor [dir]` | Checks Node ≥ 24, that the lock file is present and parseable, that every hook command in `settings.json` points at a file that exists, and runs the self-test to 57/57. |

Run them through `npx github:Safricloud/cl-workflow <command>`, or install the package and use
the `cl-workflow` bin.

### Managed, owned, merged

`update` only works because the payload is classified up front.

- **Managed** (20 files) — the mechanism: the hooks, the rules, the skill and its templates, the
  two agent definitions, the process guide. Yours to read, not to edit; `update` replaces them.
- **Owned** (9 files) — seeded once and then yours: `rule-zero.conf`, `CLAUDE.md`, `mem/index.md`,
  `mem/outstanding.md`, `docs/history/index.md`, and the empty `docs/` scaffolding.
  `update` never touches these.
- **Merged** (1 file) — `.claude/settings.json`. The kit occupies `worktree.baseRef` and three
  `hooks` entries; `permissions`, `env`, `model` and every other hook event are your project's
  and survive an update untouched.

`rule-zero.conf` is the only file you should need to tune.

## What lands in your project

```
.claude/
  settings.json                 wires the three event hooks; sets worktree.baseRef = head
  rule-zero.conf                the ONLY file you should need to tune
  rules/process.md              always loaded: rule zero, the two gates, the three habits, roles
  skills/contribute/SKILL.md    /contribute — the loop as an operating checklist
  skills/contribute/templates/  review, investigation, plan, phase, blocked-issue, pr-body, issue-comment
  hooks/lib.ts                  shared: stdin JSON, conf parsing, pattern compilation, grants, log
  hooks/rule-zero.ts            PreToolUse — deny > allow > guard; grants (--grant, --bundle, --list, --clear); log
  hooks/rule-zero-selftest.ts   proves the gate fires and only when it should (57 cases + negative control)
  hooks/status-block.ts         SubagentStop (implementer) — no status block, no finishing
  hooks/reload-plan.ts          SessionStart (compact|resume) — live plan, owner decisions, unused grants back in context
  hooks/path-fence.ts           PreToolUse (investigator frontmatter) — writes only under docs/reviews/
  hooks/pr-watch.ts             the PR-reviews wait: polls every minute, returns news or "new": [] after 5 quiet min (window restarts on push)
  hooks/docs-only.ts            measures whether a branch diff is docs/comments only; if so writes the merge grant under the standing rule
  agents/implementer.md         Opus, worktree-isolated, commits to its branch, never pushes, status block kept current
  agents/investigator.md        Opus, read-only on the code, writes one report under docs/reviews/<id>/
  .gitattributes                keeps the kit's own files LF inside your project
  .gitignore                    grants, log, worktrees, pr-watch state, __pycache__
docs/guides/agent-workflow.md   the process guide (baseline revised; Appendix D = what changed)
docs/{plans,reviews,history,reports}/ + docs/history/index.md (the changelog)
mem/index.md, mem/outstanding.md  the ledger, seeded with what this build settled and what you still need to measure
CLAUDE.md                       template: repo facts + commands + pointer to the process
```

The `.claude/.gitignore` is shipped as `gitignore` (no dot) and renamed by `init`, because
`npm pack` silently drops any file literally named `.gitignore` from a package — without the
rename, every install would commit its own grants and log.

## How a rule-zero action flows

1. The orchestrator tries it (or a sub-agent does). The hook denies with a reason naming the
   conf line.
2. Sub-agent: it records the exact command under **Blocked** in its status block. Done.
3. Orchestrator: it asks you in the conversation. You say yes.
4. It quotes your yes under the plan's **Owner decisions**, appends one regex line matching that
   command to `.claude/rule-zero.grants`, and retries. The hook allows it, deletes the grant,
   and appends a `grant-used` line to `.claude/rule-zero.log`.
5. Approval for one action is not approval for the next: the grant is gone.

Three verbs in the conf, precedence `deny > allow > guard` regardless of line order. Bash
commands are judged per segment (`&&`, `||`, `;`, `|`), so a destructive command cannot hide
behind an allowed one. MCP tools are judged as `tool:<name> <input>` so a vendor's write tools
can be named in the project-specific section.

Conf patterns are compiled as JavaScript `RegExp` without the `u` flag. Existing conf files
written for the previous engine keep their meaning verbatim — measured across every pattern the
shipped conf contains.

## Standing approvals

The `allow` lines are the process's own recorded "yes": commits, plain pushes, `gh pr create`,
PR and issue comments, `gh api` reads, and any HTTP call to a local host. Add to them freely;
that is cheaper than a question.

## The ten phases, and the one place you are prompted

ask → investigate (orchestrator briefly, then investigators thoroughly) → review (plain
English, directions, decisions needed) → **questions** (the question tool; as many as needed,
each with a recommendation; the only prompt) → plan → orchestrate (implementers in
worktrees; orchestrator verifies, decides mid-loop, records for veto; every fix by an
implementer) → PR (archive first into `docs/history/<id>/`, then `gh pr create`) → PR reviews
(`pr-watch.ts` until `"new": []`; cycles recorded as PR comments; report and stop) → merge (on
your word — or unasked when `docs-only.ts` says the diff is docs/comments only; `--admin`
always; one bundle grant covers merge + remote + local delete) → deploy (per `CLAUDE.md`: watch
the Action, or rebuild the containers and check them). The archive commit before the PR is the
last record commit; anything blocked on you becomes a labelled GitHub issue.

One id per contribution — `<yyyy-mm-dd>-<descriptive-slug>` — names the branch,
the review directory, the plan directory (`plan.md` + one `phase-<n>.md` per phase) and the
history directory.

## This repo

```
src/cli.ts        the whole CLI: init, update, doctor. One file, no runtime dependencies.
dist/cli.js       the built CLI — committed, because Node refuses to strip types under node_modules
template/         the payload, exactly as it lands in a target project
.github/workflows/ci.yml
```

`template/` is the single source of truth for the payload. This repo also runs the kit on
itself, and its root `.claude/` is **generated** — produced by running this CLI's `init`, not
hand-maintained. Edit `template/.claude/**` and re-run `update`; hand-copying is how four
byte-identical duplicates came to sit at this repo's root before v0.6 deleted them.

`dist/` is committed on purpose. Node will not strip types from a file under `node_modules`
(`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, and no flag overrides it), and npm's `prepare`
script is broken for git installs, so an `npx github:` consumer can only ever run plain
JavaScript. CI diffs `dist/` against a fresh build and fails on drift.

## Development

Node ≥ 24, pnpm, TypeScript 6.

```
pnpm install
pnpm typecheck                   # tsc --noEmit over src/ and the payload's hooks
pnpm build                       # tsc -p tsconfig.build.json → dist/cli.js
git diff --exit-code dist/       # the drift gate CI enforces
pnpm selftest                    # must print 57/57 and exit 0
```

Line endings are LF everywhere, enforced by the root `.gitattributes` (`* text=auto eol=lf`).
Without it a fresh clone on Windows rewrites every file to CRLF and changes every hash, which
would make `update` report the entire payload as locally modified. The payload carries its own
`.claude`-scoped `.gitattributes` for the same reason inside your project, and the lock file
hashes LF-normalised content so `update` is correct either way.

## CI and the branch ruleset

`.github/workflows/ci.yml` runs on `pull_request` into `main` and on nothing else — there is no
post-merge run. The `test` job is a matrix of `ubuntu-latest` and `windows-latest` on Node 24:
install, typecheck, build, `dist/` drift check, self-test, and a CLI smoke test that inits into
a temp directory and runs `doctor`. An aggregate job **`ci-ok`** (`needs: test`) is the single
required check.

The `main` ruleset requires exactly that check name and grants **repository admins bypass**, so
a merge is never hard-blocked — but an unbypassed PR does not merge until `ci-ok` is green.

## Verify on your install (measured here where possible; the rest is yours)

| Claim | Status |
| --- | --- |
| Two worktree branches editing adjacent status sections of one plan file merge cleanly | Measured, sandbox git |
| `git branch -d` refuses while the worktree is attached; remove the worktree first | Measured |
| Hook denies in a sub-agent, allows once with a grant, consumes it, never honours a grant for `deny` lines | Measured, self-test |
| A missing guard line makes the self-test go red | Measured |
| Conf patterns keep their meaning compiled as JS `RegExp` without the `u` flag | Measured, every shipped pattern |
| `docs-only.ts` accepts docs paths and whole-line-comment diffs, rejects trailing comments, new code files, unknown extensions, shebangs, and anything under `.claude/` that is not markdown | Measured, sandbox git, 10 diff shapes |
| `pr-watch.ts` returns on news, goes quiet after the window, and restarts the window when the head changes | Measured, fake `gh` |
| Node ≥ 24 strips types from a hook `.ts` outside `node_modules` with zero stderr | Measured, Node 22.18 and 24.4 |
| Hooks from `.claude/settings.json` fire inside subagents with `agent_id` / `agent_type` | Official hooks reference |
| A hook `deny` holds in `bypassPermissions` mode | Official SDK docs; confirm once on your install |
| `worktree.baseRef: "head"` is the settings key, and subagent worktrees then branch from the orchestrator's HEAD | Official worktrees page names the setting; confirm the key placement |
| Claude Code ≥ 2.1.218 — before that a subagent's `git -C` / `GIT_DIR` could reach the parent checkout | Third-party changelog report; check `claude --version` and the changelog |
| Sub-agents inherit the main session's permission mode when `permissionMode` is unset | Official sub-agents page; the agent files leave it unset on purpose |
| `model: opus` resolves to the Opus you want; pin the full model id in both agent files if not | Yours |

## Ergonomics

- Anything the hook denies that you consider routine → one `allow` line in the conf.
- Anything it lets through that touches a live system → one `guard` line naming the exact
  script and flag, in the project-specific section.
- `.claude/rule-zero.log` shows every denial and grant use; read it if the loop felt slow.
- `cl-workflow doctor` before you trust a fresh install: a hook that cannot start fails **open**.
