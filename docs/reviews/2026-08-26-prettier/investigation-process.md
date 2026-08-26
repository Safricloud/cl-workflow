# Investigation — process (2026-08-26-prettier)

**Brief:** Where, exactly, does a "format before the PR" step belong in the kit's process
documents — every anchor, by `file:line` — and what could *enforce* it (CI, the full check, a
hook), given what the kit's hooks and gates can do today? Also: how has the kit previously named
a tool-specific step in tool-agnostic payload prose (the Playwright / "E2E line in `CLAUDE.md`"
precedent), so the format step can follow the same pattern?

**Scope:** `template/.claude/skills/contribute/SKILL.md`, `template/.claude/skills/contribute/templates/{plan,phase,pr-body}.md`,
`template/.claude/agents/implementer.md`, `template/.claude/rules/process.md`,
`template/docs/guides/agent-workflow.md`, `template/CLAUDE.md`, `template/mem/outstanding.md`,
`CLAUDE.md`, `README.md`, `.github/workflows/ci.yml`, `template/.claude/hooks/{rule-zero,docs-only,path-fence,status-block}.ts`,
`template/.claude/rule-zero.conf`, `template/.claude/settings.json`, `src/cli.ts`,
`docs/history/2026-08-26-prose-standards/{review,plan}.md`, `mem/outstanding.md`

**Checkout:** `8a9690ed3f052ab03fe02c4cd8b1830e719950b8` (branch `main`, clean at start)

## Answer

A format step has **26 prose anchors in the payload and 6 in this repo** (tables below); the
load-bearing five are `SKILL.md:146` (Verify — "full check and build"), `SKILL.md:283-284`
(§11 step 4), `implementer.md:83` (scoped validation) with its status-block lines `:109-111`,
`plan.md:33-35` / `pr-body.md:12-15` (validation sections), and `template/CLAUDE.md:7` (the
`Full check` line the whole kit points at). The **format run must land before the archive
commit**, because `SKILL.md:181-182` and `:39-42` make the archive the last commit that touches
`docs/` or `mem/` and nothing in the repo changes after `gh pr create` — but a reformat touches
code, not `docs/`, so the true constraint is "before the final Orchestrate commit at
`SKILL.md:176-177`", with the archive commit after it. **Enforcement the code supports today
is CI plus the full-check line and nothing else**: a `- run: pnpm format:check` step slots in at
`.github/workflows/ci.yml:31` under the "Cheapest gate first." comment at `:30`, needs no
`shell: bash` (every single-line `run:` at `:31,:33,:35,:39,:56` already passes on
`windows-latest`), and appending `&& pnpm format:check` to `CLAUDE.md:14` makes it part of the
gate the small path and Verify both name. A hook cannot do it: `rule-zero.conf` has exactly
three verbs — `deny`/`allow`/`guard` — each a **regex matched against command text**
(`rule-zero.conf:3-13`, `rule-zero.ts:129-165`); no conf line executes anything or reads an exit
code, and no shipped hook runs a check before permitting a tool call (`docs-only.ts` is an
on-demand CLI, `status-block.ts` is `SubagentStop`), so gating `gh pr create` on
`prettier --check` means a **new hook file plus a `settings.json` matcher plus the assumption
that the target project has a formatter** — which the payload cannot make. **Of the two "who
runs it" shapes, (i) is the one the roles as written allow**: `process.md:82-83`, guide `:59-62`
and `mem/outstanding.md:159-160` all say the orchestrator "edits documents only — never code",
so a whole-repo `prettier --write .` by the orchestrator outside the small path breaks that
rule; each implementer formatting its own listed files under **Scoped validation** and the
orchestrator only *checking* in Verify breaks nothing. The **Playwright precedent is exact and
reusable**: `mem/outstanding.md:114-117` settles that the tool is named **only** in the owned
`template/CLAUDE.md` skeleton (`:9`) while managed prose says "the suite named by the E2E line in
`CLAUDE.md`" (`implementer.md:65-66`, `process.md:68-69`, guide `:158-159`) — and `CLAUDE.md` is
in `OWNED` at `src/cli.ts:33`, so a new `Format:` line reaches new installs only and is never
rewritten. **No `.git-blame-ignore-revs` and no `blame.ignoreRevsFile` exist** (measured), and
because merges are squashes (`SKILL.md:245`) whose SHA nothing in the repo records
(`SKILL.md:252`), a blame-ignore file can only be written by a *later* contribution. Ledger
lines to cite: `mem/outstanding.md:161-167` (small path — "**no new dependency**", so this ask is
full-loop), `:159-160`, `:114-117`, `:124-128`, `:17-30`, `:93-94`, `:121-123`.

---

## Facts

### 1. Anchors — payload (edit `template/`, regenerate the root copy with the CLI)

Root copies are byte-identical to `template/` today (measured: `diff -q` on all six files in
scope returned no differences), so every anchor below exists twice and only the `template/` side
is edited.

| # | Anchor | Quoted line(s) |
| --- | --- | --- |
| A1 | `template/.claude/skills/contribute/SKILL.md:146` | `**Verify** on the merged branch, yourself: full check and build; read the diff of every` |
| A2 | `…/SKILL.md:149` | `the gates the package check does not cover; **verify the checker** (revert the fix, see red,` |
| A3 | `…/SKILL.md:176-177` | `When every item is Done and the final verification is green, commit: what, why, the decision` / `it rests on, the validation run, any lockfile diff explained.` — **the last commit that may touch code** |
| A4 | `…/SKILL.md:181-182` | `Archive **first**, so the records land with the PR — and this is the **last** commit that` / `touches `docs/` or `mem/`:` |
| A5 | `…/SKILL.md:39-42` | `**The archive commit is the last process-record commit.** Nothing under `docs/` or `mem/` is` / `touched after `gh pr create`…` |
| A6 | `…/SKILL.md:194-197` | ``gh pr create` with `templates/pr-body.md`: … validation with counts and what was seen to fail, records, blocked-on-owner` |
| A7 | `…/SKILL.md:283-284` | `4. **Verify** with the full check from `CLAUDE.md`, and verify the checker where a test` / `   exists: revert, see red, restore.` — §11 step 4 |
| A8 | `…/SKILL.md:269` | `For a change of a few lines in a few files that adds no dependency and touches no gate or hook` — **this ask adds a dependency ⇒ full loop** |
| A9 | `…/SKILL.md:118-120` | `- Every item: **Files** … **Conventions` / `  that will fail your lint**, **Scoped validation**, **Acceptance including tests**…` |
| A10 | `template/.claude/agents/implementer.md:83` | `- Run the **scoped** commands named in your item (siblings share the phase; the orchestrator runs` |
| A11 | `…/implementer.md:109-111` | `- **Validation (scoped; full check left to the orchestrator):**` / `  - `<command>` — <n> pass, 0 fail` / `  - **Checker verified:** …` — the status-block template |
| A12 | `…/implementer.md:64-66` | `- **Tests with the logic.** … Browser-based visual tests use the suite named by the E2E line in `CLAUDE.md`; the orchestrator still` / `appraises the screenshots that suite produces.` — the tool-agnostic pattern to copy |
| A13 | `…/templates/plan.md:33-35` | `## Orchestrator validation (after each phase merge, and at the end)` / `<Full check, build, E2E for the touched surfaces, screenshots at which viewports, container` / `run if touched, checker-verified for each new test.>` |
| A14 | `…/templates/phase.md:11` | `**Scoped validation:** <exact commands>` |
| A15 | `…/templates/pr-body.md:12-14` | `## Validation` / `- <full check with counts>; <E2E suites and results>; <new tests seen to fail against a` / `  pre-change build>; …` |
| A16 | `template/.claude/rules/process.md:8` | `(SKILL §11): the orchestrator edits directly, the full check is the gate, the record is the PR` — **the only place `process.md` names a check sequence** (grep for "lint\|typecheck\|full check" in `process.md` returns only this line) |
| A17 | `template/.claude/rules/process.md:67-69` | `- **Tests with the logic.** … Browser-based visual tests use the suite named by the E2E` / `  line in `CLAUDE.md`.` |
| A18 | `template/docs/guides/agent-workflow.md:336-337` | `**Verify — after each phase merge and again at the end, on the merged branch, yourself.** Believe` / `nothing until you have seen it. Full check and build. …` |
| A19 | `…/agent-workflow.md:341-343` | ``.claude/rule-zero.log` for any denial an implementer hit. The gates the package check does` / `**not** cover — root config, scripts, **formatting**, the container build — CI gates them` / `separately, so find out here.` — **the sentence that already names formatting as a CI-gated concern** |
| A20 | `…/agent-workflow.md:374-376` | `**Commit** when every item is Done and the final verification is green…` |
| A21 | `…/agent-workflow.md:384-394` | §7 archive-first block; `:391` `After this commit nothing under `docs/` or `mem/` is touched again for this contribution.` |
| A22 | `…/agent-workflow.md:396-399` | `**Open the PR** … validation with` / `counts and what was seen to fail; records; …` |
| A23 | `…/agent-workflow.md:504` / `:508-512` | `**What qualifies.** A few lines in a few files, no new dependency, no gate or hook logic.` / `**What stays.** Rule zero and its hook; the three habits; the full check from `CLAUDE.md` as` / `the gate…` |
| A24 | `…/agent-workflow.md:292-299` | `- **Items** … **Scoped validation** commands, **Acceptance` / `  including tests**…` and `- **Orchestrator work** — documents only: seeds, plan, ledger, `CLAUDE.md`, blocked issues, archive, PR.` |
| A25 | `…/agent-workflow.md:572-579`, `:588-592` | Appendix C: `- [ ] **Orchestrate**: … verified by the orchestrator on the merged branch;` (`:573`); `- [ ] **PR**: archived into `docs/history/<id>/` … pushed — **last record commit**` (`:577-578`); `- [ ] **Small path** … full check + checker verified;` (`:590`) |
| A26 | `…/agent-workflow.md:594-617` | Appendix D table — a new row belongs here only if the *process* changes (e.g. a new gate), not for a tool choice |
| A27 | `template/CLAUDE.md:5-10` | `## Commands` / `- Install: `<cmd>`` / `- Full check (lint + typecheck + unit): `<cmd>`` / `- Build: `<cmd>`` / ``- E2E: `<cmd>` (`<which suites cover which surfaces>`; browser-based visual tests: Playwright — `<playwright cmd>`)`` / `- Container: `<cmd>`` — **where a `Format:` line goes** |
| A28 | `template/mem/outstanding.md:30-35` | the small-path settled entry, payload copy — carries "no new dependency" |

### 2. Anchors — this repo (its own `CLAUDE.md`, README, CI)

| # | Anchor | Quoted |
| --- | --- | --- |
| B1 | `CLAUDE.md:14` | ``- Full check (lint + typecheck + unit): `pnpm lint && pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm selftest`,`` — character for character (the trailing comma is on the line; `:15-19` continue the sentence with the generated-copy gate) |
| B2 | `CLAUDE.md:20-32` | the `Lint:` / `Typecheck:` / `Build:` / `E2E:` / `Container:` bullets — a `Format:` bullet would sit beside them |
| B3 | `CLAUDE.md:34-45` | `## Conventions that will fail your lint` — three bullets today (`erasableSyntaxOnly`, zero runtime deps, `noUncheckedIndexedAccess`) |
| B4 | `README.md:179-187` | the fenced dev-command block: `pnpm install` / `pnpm lint …` / `pnpm typecheck …` / `pnpm build …` / `git diff --exit-code dist/ …` / `pnpm selftest …` / `node dist/cli.js update . && git status …` |
| B5 | `README.md:202-207` | `The `test` job is a matrix of `ubuntu-latest` and `windows-latest` on Node 24:` / `install, lint, typecheck, build, the **dist/ drift gate**, the **generated copy drift gate**` / `(`-- .claude/ docs/guides/`), the self-test, and a CLI smoke test…` |
| B6 | `.github/workflows/ci.yml:30-31` | `      # Cheapest gate first.` / `      - run: pnpm lint` |
| B7 | `package.json:23-28` | `"scripts": { "build", "lint", "typecheck", "selftest" }` — no `format` script exists |

### 3. The Playwright precedent — how a tool is named without the prose depending on it

| Fact | Value | Where measured |
| --- | --- | --- |
| The decision | `9. Where Playwright is named → **`template/CLAUDE.md` only** — "template/CLAUDE.md only". The` / `managed prose stays tool-agnostic: browser-based visual tests are "the suite named by the` / `E2E line in `CLAUDE.md`"; the owned skeleton names Playwright as the default.` | `docs/history/2026-08-26-prose-standards/review.md:263-265` |
| The question as asked | `9. **Where Playwright is named.** (a) The managed prose: … and (b) the owned `template/CLAUDE.md` E2E line names it as the default for new installs. **Recommend both.**` | same file `:194-198` |
| Ledger form | `2026-08-26 — Playwright is named only in the owned `template/CLAUDE.md` skeleton (E2E line,` / `default for browser-based visual tests). The managed prose stays tool-agnostic: "the suite` / `named by the E2E line in `CLAUDE.md`". The kit repo itself never depends on Playwright — its` / `import fails the `node:`-only rule. (owner, decision 9)` | `mem/outstanding.md:114-117` |
| The canonical wordings the plan fixed | `- **W7 Tests.** *… Browser-based visual tests use the suite named by the E2E line in `CLAUDE.md`; the orchestrator still appraises the screenshots that suite produces.*` and `- **W8 Playwright (owned `template/CLAUDE.md` only).**` / `  `- E2E: \`<cmd>\` (\`<which suites cover which surfaces>\`; browser-based visual tests: Playwright — \`<cmd>\`)`` | `docs/history/2026-08-26-prose-standards/plan.md:76-80` |
| Terms declared fixed across implementers | `"one concern per file", "the suite named by the E2E line in `CLAUDE.md`") are fixed.` | same `plan.md:52` |
| The three managed copies of that wording | `implementer.md:64-66`; `process.md:67-69`; `agent-workflow.md:157-161` | `grep -n "E2E line" template/` |
| Why the skeleton can name a tool | `CLAUDE.md` is in `OWNED` — seeded once, never rewritten by `update` | `src/cli.ts:31-41`, comment at `:26-30`: *"Payload paths … the kit seeds once and then never rewrites"* |
| Any new `template/` file is **managed** by default | `function classify(src)` → `OWNED.indexOf(src) >= 0 ? "owned" : "managed"`; the manifest is `walk(templateDir…)`, "derived from `template/` on every run. Never a hand-kept list." | `src/cli.ts:153-165` |

**Read-across for a formatter:** a `Format:` line in `template/CLAUDE.md`'s Commands block
(beside `:7`–`:10`) may name Prettier; managed prose (SKILL, `implementer.md`, `process.md`, the
guide) says "the formatter named by the Format line in `CLAUDE.md`, if the project has one".
A `template/.prettierrc` would be **managed** by `classify` (`src/cli.ts:155`) and land at every
target project's root on every `update` — a design choice, not a default.

### 4. Enforcement, measured against the code

**(a) CI.** The step belongs at `.github/workflows/ci.yml:31`, immediately under the comment
`# Cheapest gate first.` at `:30` and before/beside `- run: pnpm lint`.

| Fact | Value | Where measured |
| --- | --- | --- |
| Matrix | `os: [ubuntu-latest, windows-latest]`, `fail-fast: false` | `ci.yml:15-17` |
| Windows leg needs `shell: bash`? | **No, for a single-command `run:`.** Only the two multi-line script steps carry `shell: bash` (`:49`, `:59`). `- run: pnpm lint` (`:31`), `pnpm typecheck` (`:33`), `pnpm build` (`:35`), `git diff --exit-code -- dist/` (`:39`) and `pnpm selftest` (`:56`) run under the default shell on both legs today | `ci.yml:28-56` |
| Required check | job `ci-ok`, `needs: test`, `if: always()`, asserting `needs.test.result == success` | `ci.yml:67-78` |
| Trigger | `on: pull_request: branches: [main]` — nothing runs post-merge | `ci.yml:3-6` |

**(b) The full-check line.** `CLAUDE.md:14`, verbatim in fact B1 above. The payload skeleton's
version is `- Full check (lint + typecheck + unit): `<cmd>`` at `template/CLAUDE.md:7`. Both the
small path (`SKILL.md:283`, `process.md:8`, guide `:508`) and Verify (`SKILL.md:146`) resolve
"the full check" through this line, so appending to it is the single highest-leverage edit.

**(c) A hook that refuses `gh pr create` while `prettier --check` fails — what it would take.**

| Fact | Value | Where measured |
| --- | --- | --- |
| Conf grammar | `# One rule per line:  <verb> <extended regex>   (JavaScript RegExp, compiled without the u flag; searched, not anchored…)` | `template/.claude/rule-zero.conf:3-5` |
| The three verbs, all pattern-only | `deny   never by an agent, grant or not` / `allow  short-circuit: a standing approval or a known-safe shape` / `guard  rule zero — orchestrator needs a single-use grant; sub-agents are always denied` | `rule-zero.conf:9-11` |
| What a rule is matched against | `Matched against each Bash command segment (split on && \|\| ; \| newline), or against "path:outside-repo <resolved path>" for file-editing tools.` | `rule-zero.conf:6-7` |
| The evaluation loop — **no execution anywhere** | `const denySrc = firstMatch(rules, "deny", subject); … if (firstMatch(rules, "allow", subject) !== null) continue; const src = firstMatch(rules, "guard", subject);` — the only side effects are `appendLogLine` and `consumeGrant` | `rule-zero.ts:129-165` |
| Can a conf line run a command and gate on its exit code? | **No.** `rule-zero.ts` imports only `node:fs` and `node:path` (`:29-30`) — no `child_process`; the entire hook body is regex matching plus grant bookkeeping | `rule-zero.ts:29-55`, `:129-165` |
| Is `gh pr create` even guarded today? | No — it is an **allow**: `allow ^gh (pr (create\|view\|list\|comment\|checks\|diff\|status)\|issue …)` | `rule-zero.conf:29` |
| Any existing hook that runs a check before permitting a tool call? | **No.** Wired hooks are `rule-zero.ts` (`PreToolUse`, matcher `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit\|mcp__.*`), `status-block.ts` (`SubagentStop`, matcher `implementer`), `reload-plan.ts` (`SessionStart`, matcher `compact\|resume`) | `template/.claude/settings.json:5-52` |
| The per-agent hook precedent (a fence *can* be added in agent frontmatter) | `hooks:` / `  PreToolUse:` / `    - matcher: "Edit\|Write\|MultiEdit\|NotebookEdit"` / `      hooks:` / `        - type: command` / `          command: "node"` / `          args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/path-fence.ts", "docs/reviews"]` | `template/.claude/agents/investigator.md:7-13` |
| `docs-only.ts` is on-demand, not wired | `.claude/hooks/docs-only.ts --base <ref> [--pr <n> --branch <name> --grant]` … `Exit 0 if docs-only, 3 if not, 1 on git error, 2 on bad arguments.` — invoked from `SKILL.md:227` | `docs-only.ts:3`, `:31`; `SKILL.md:227` |
| It *does* spawn git, so spawning is not itself forbidden | `import { spawnSync } from "node:child_process";` | `docs-only.ts:35` |

**Plainly, what a `gh pr create` gate would require:** (1) a **new hook file** under
`template/.claude/hooks/` that spawns the formatter and emits the deny JSON line at exit 0 the
way `path-fence.ts:18-20` describes; (2) a **new `PreToolUse` matcher** in
`template/.claude/settings.json` (Bash-matched, then string-matching the command — the existing
`rule-zero` matcher cannot be reused because the conf grammar has no "run this" verb); (3) the
assumption that **the target project has a formatter installed**, which the payload cannot make —
the kit ships with zero runtime dependencies and `node:` builtins only (`CLAUDE.md:38-41`;
enforced by `no-restricted-imports` regex `^(?![.]|node:)`), and the payload lands in projects
that install nothing. It would also fail *open* on any project without the formatter, or fail
*closed* on every one of them, and both are the failure mode `rule-zero.conf:15-17` warns about:
`KEEP THIS TIGHT. … A false positive costs the owner a question, and that is the failure mode
that gets the kit thrown away.`

**(d) A git pre-commit hook (husky / lint-staged).**

| Fact | Value | Where measured |
| --- | --- | --- |
| Any git-hook machinery today? | **None.** `git config --get core.hooksPath` → exit 1 (unset); `.husky` does not exist; `.git/hooks` contains only `*.sample` files | `git config --get core.hooksPath`; `ls -d .husky`; `ls .git/hooks \| grep -v ".sample$"` → no output |
| Any `prepare` script? | No — scripts are `build`, `lint`, `typecheck`, `selftest` only | `package.json:23-28` |
| What it would add | `husky` + `lint-staged` as **devDependencies** (today: 6 devDeps at `package.json:29-36`) | `package.json:29-36` |
| Does the zero-dependency rule forbid devDeps? | **No — it is about runtime.** `Zero runtime dependencies, `node:` builtins only — a target project installs nothing, and the CLI must keep running from inside `node_modules` where nothing was built for it.` ESLint/TypeScript are already devDeps | `CLAUDE.md:38-41`; `package.json:29-36` |
| Would an implementer worktree run it? | It would **not have the tooling**: `(h) an implementer worktree inherits no `node_modules` — every item that runs lint/typecheck pays a `pnpm install --frozen-lockfile`.` A husky hook whose binary is missing either fails the commit or is skipped | `mem/outstanding.md:93-94` |
| And commits are how implementer work reaches the orchestrator | `Commits are how your work reaches the orchestrator, so uncommitted work at the end is work that may be lost.` — a pre-commit hook that fails in a worktree costs the transport | `implementer.md:68-71` |
| Payload reach | Nothing in `template/` ships git hooks; the kit's payload is `.claude/`, `docs/`, `mem/`, `CLAUDE.md` (walked at `src/cli.ts:159-165`) | `ls template/` |

### 5. Who runs it — the roles as written

| Fact | Value | Where measured |
| --- | --- | --- |
| The rule, in `process.md` | `deploys per `CLAUDE.md`. Edits documents only — never code — except on the small path` / `  (SKILL §11), where it makes the change itself.` | `template/.claude/rules/process.md:82-83` |
| The rule, in the guide | `owner's word, deploys per `CLAUDE.md`. **Edits documents only — never code.** Every code` / `change goes through an implementer — except on the small path (§11), where the orchestrator` / `makes the few-line change itself and the full check is the gate.` | `template/docs/guides/agent-workflow.md:59-62` |
| The rule, in the ledger (settled) | `2026-08-25 — The orchestrator edits documents only; every code change goes through an` / `implementer — except on the small path, below. (owner)` | `mem/outstanding.md:159-160` (payload copy `template/mem/outstanding.md:28-29`) |
| Reinforced in Verify | `**Fix through sub-agents, always.** Every finding from verification becomes an item in `phase-<n>.5.md` … implemented by a fresh implementer — you do not edit code.` | `SKILL.md:154-155` |
| And in Appendix D | `Trivial fixes applied by the orchestrator \| Every code change through an implementer; orchestrator edits documents only \| Owner's rule` | guide `:606` |
| Plan template says the same | `## Orchestrator work (documents only)` | `templates/plan.md:30` |
| Who else edits code | Implementers, each owning exactly its listed files: `- You own exactly the files listed under **Files** for your item. If the work needs another file, stop and report **Blocked**…` | `implementer.md:43-44` |
| Where a per-item command would go | `**Scoped validation:** <exact commands>` (`templates/phase.md:11`); dispatch line `Implement item <n.m> … Scoped validation: <exact commands>.` (`SKILL.md:135`) | as cited |

**Shape (i) — each implementer formats its own files; the orchestrator only checks.**
Consistent with every line above. It uses the existing **Scoped validation** slot
(`phase.md:11`, `SKILL.md:120`, guide `:294`), the implementer's own validation section
(`implementer.md:83`) and its status-block validation lines (`:109-111`); the orchestrator's
Verify (`SKILL.md:146`) gains a `format:check`, which is a read. Cost: every item that runs a
formatter pays the worktree `pnpm install` already noted at `mem/outstanding.md:93-94`.

**Shape (ii) — a final "format the repo" implementer item per contribution.** Also consistent
with the roles, and it is how the kit already handles a cross-cutting mechanical change (the one
code file in the prose-standards PR "goes through an implementer" —
`docs/history/2026-08-26-prose-standards/review.md:270`). But it collides with the ownership
fence: an item whose **Files** is "the repo" contradicts `implementer.md:43-44`, and it must be
its own phase because it touches every magnet file (`SKILL.md:121-124`).

**Shape (iii) — the orchestrator runs `prettier --write .` before the archive.** This is the one
shape the roles as written **forbid** outside the small path, per `process.md:82-83` /
guide `:59-62` / `mem/outstanding.md:159-160`. It is not a defensible reading of "documents
only": a reformat rewrites `.ts` files.

**Ordering constraint, measured.** The archive is the last commit touching `docs/`/`mem/`
(`SKILL.md:181-182`, `:39-42`, guide `:391`) — but a reformat touches **code**, and the last
commit permitted to touch code is the Orchestrate close-out at `SKILL.md:176-177` / guide
`:374-376`. So "format before the PR" means *before the final Orchestrate commit*, with the
archive commit after it; the format run is not a step of §7 at all.

### 6. The one-off mass reformat and `git blame`

| Fact | Value | Where measured |
| --- | --- | --- |
| `.git-blame-ignore-revs` in the repo | **Does not exist**: `ls -la .git-blame-ignore-revs` → `No such file or directory`; `find . -name "*blame*"` (excluding `.git/`, `node_modules/`) → no files | measured at repo root |
| `blame.ignoreRevsFile` configured | **Unset**: `git config --get blame.ignoreRevsFile` → exit 1, no output | measured |
| "blame" anywhere in repo prose | Two mentions, both incidental archive prose: `docs/history/2026-08-26-prose-standards/phase-2.md:44`, `…/plan.md:147` | `grep -rn "blame" --include=*.md .` |
| Merges are squashes | `gh pr merge <n> --<squash\|merge as the owner said, or squash> --admin --delete-branch` | `SKILL.md:245` |
| And the merge SHA is never recorded in the repo | `Nothing in the repo records the merge.` | `SKILL.md:252` |
| Markdown a whole-repo run would touch | 62 tracked `*.md`, of which **30 are under `docs/history/`** — archived reviews, plans and investigation reports | `git ls-files "*.md" \| wc -l`; `find docs/history -name "*.md" \| wc -l` |
| Investigator reports are records | `2026-08-26 — Investigator reports are retained and archived under `docs/history/<id>/`, never removed from the repo…` | `mem/outstanding.md:181-183` |

**Consequence:** the ignore-revs SHA only exists *after* the squash merge, and the process
writes nothing to the repo after `gh pr create` and records nothing at merge — so a
`.git-blame-ignore-revs` entry for this contribution can only be added by a **later**
contribution (a small-path one would fit: a few lines, no dependency, no gate logic —
`SKILL.md:269`). Separately, a whole-repo `prettier --write .` rewrites 30 archived record
files; a `.prettierignore` covering `docs/history/` is the mechanism, and the decision belongs
to the owner at Questions.

### 7. Ledger crossings

| Entry | Quoted | Where |
| --- | --- | --- |
| Small path — **the disqualifier for this ask** | `2026-08-26 — The small path (SKILL §11): a change of a few lines, **no new dependency**, no gate or hook logic, declared small by the owner or proposed by the orchestrator and accepted. The orchestrator edits directly; the full check is the gate…` | `mem/outstanding.md:161-167` |
| Same, in the payload | identical wording | `template/mem/outstanding.md:30-35` |
| Same, in SKILL/guide | `For a change of a few lines in a few files that adds no dependency and touches no gate or hook logic` / `**What qualifies.** A few lines in a few files, no new dependency, no gate or hook logic.` | `SKILL.md:269`; guide `:504` |
| Orchestrator edits documents only | `2026-08-25 — The orchestrator edits documents only; every code change goes through an implementer — except on the small path, below. (owner)` | `mem/outstanding.md:159-160` |
| ESLint sits beside `tsc` — the precedent for adding a checker | `2026-08-25 — ESLint sits beside `tsc`, it does not replace it: ESLint 10 + typescript-eslint 8 on `recommendedTypeChecked`, config in `eslint.config.mjs` (flag-free; the owner chose it over `eslint.config.ts`), `pnpm lint` = `eslint --max-warnings 0 .` **and a CI step**. …` | `mem/outstanding.md:124-128` |
| Playwright / tool-agnostic prose | quoted in §3 above | `mem/outstanding.md:114-117` |
| Kit conformance follow-up (ESLint size rules, `node:test` suite, `parseOptions`) — a formatter contribution should say whether it merges into this or stays separate | `2026-08-26 — **Kit conformance** (one future contribution; owner chose these three at the `2026-08-26-prose-standards` Questions phase, decision 8): (a) split `src/cli.ts` … and add ESLint `max-lines` 300 / `max-lines-per-function` 80 / `complexity` 20 at error … the root `.claude/hooks/` copy doubles every hook finding under `eslint .`, decide the ignore then; (b) a `node:test` suite …; (c) generalize `parseOptions` …` | `mem/outstanding.md:17-30` |
| Worktrees inherit no `node_modules` — bites shape (i) | `(h) an implementer worktree inherits no `node_modules` — every item that runs lint/typecheck pays a `pnpm install --frozen-lockfile`.` | `mem/outstanding.md:93-94` |
| `docs-only.ts` classifies the lock as code, so a payload change is a code PR | `2026-08-26 — `docs-only.ts` keeps classifying `.claude/cl-workflow.lock` as code, so every prose change to the payload is a code PR needing the owner's merge word. Owner declined to record a follow-up. (owner, decision 12)` | `mem/outstanding.md:121-123` |
| ESLint has no Prettier integration today | `grep -n "prettier\|stylistic" eslint.config.mjs` → exit 1, no matches | measured |
| Prettier appears nowhere in the repo or `node_modules` | `grep -rn -i "prettier" . --exclude-dir=node_modules --exclude-dir=.git` → exit 1; `ls node_modules \| grep -i prettier` → exit 1 (`node_modules` present) | measured |
| "formatting" already appears in the guide once | `**not** cover — root config, scripts, formatting, the container build — CI gates them` | `docs/guides/agent-workflow.md:342` and `template/docs/guides/agent-workflow.md:342` — the only two hits repo-wide outside `docs/history/` |

---

## Observations

- **The guide already promises what this ask asks for.** `agent-workflow.md:342` names
  *formatting* among "the gates the package check does **not** cover — root config, scripts,
  formatting, the container build — **CI gates them separately**". Today that sentence is
  aspirational: there is no formatter and no CI step (measured, §7). Wiring Prettier into
  `ci.yml:31` and `CLAUDE.md:14` makes that sentence true rather than requiring new prose — and
  if the formatter joins the *full check*, the sentence at `:342` becomes **false** (formatting
  would then be covered by the package check) and needs re-reading, exactly as
  `SKILL.md:151` demands: `re-read every sentence the change made true or false`.

- **The generated-copy drift gate is the real constraint on formatting the payload.** `.claude/`
  and `docs/guides/agent-workflow.md` at the root are generated from `template/`
  (`ci.yml:41-53`); they are byte-identical today (measured). A formatter that rewrites both
  copies identically leaves the gate green — but only if the run covers `template/` and the root
  copy in the same pass, and `.prettierignore` treats them the same. Formatting one and not the
  other is an immediate CI failure at `ci.yml:48-53`.

- **`dist/cli.js` must not be formatted.** `dist/cli.js` must be byte-exactly what `pnpm build`
  emits (`CLAUDE.md:45-49` region; gate at `ci.yml:38-39`). It is already ESLint-ignored
  (`CLAUDE.md:23`: "`dist/` and `.claude/worktrees/` ignored"); a `.prettierignore` must do the
  same or the drift gate goes red.

- **The kit ships `template/` in the npm payload** (`package.json:15-18`: `"files": ["dist",
  "template"]`), and `payload()` walks `template/` with no allowlist (`src/cli.ts:159-165`). Any
  `template/.prettierrc` therefore lands in every target project's root as a *managed* file
  overwritten on every `update` — a substantive decision, not a detail.

- **Two shapes of "who runs it" both survive the roles; a third does not.** Recorded in §5
  without a recommendation, per the brief. Worth the review noting that shape (i) multiplies the
  worktree `pnpm install` cost (`mem/outstanding.md:93-94`) across every item, while shape (ii)
  concentrates it in one item but strains the ownership fence (`implementer.md:43-44`).

- **The PR will not be docs-only.** `docs-only.ts` classifies `.claude/cl-workflow.lock` and any
  unknown-extension file as code (`docs-only.ts:10-24`), and this ask touches `package.json`,
  `ci.yml` and a formatter config regardless — so the owner's merge word is needed
  (`SKILL.md:230-232`), unless the contribution qualifies for the small path, which
  `SKILL.md:269` says it does not ("adds no dependency").

- **A trap in the ordering prose.** Several readers will place a format step in §7 because the
  ask says "before a PR is created". §7 forbids it: `SKILL.md:181-182` and guide `:391` fence
  `docs/`/`mem/` — but the *code* fence is earlier, at the Orchestrate close-out
  (`SKILL.md:176-177`). Prose added to §7 would tell an orchestrator to edit code at the one
  point in the loop where nothing but records may change.

## Not done / could not measure

- **Did not run Prettier, install it, or count the lines it would rewrite** — the brief assigns
  that to the tooling and markdown investigators. Every "would reformat" statement here is about
  *where in the process* a run belongs, not about its output.
- **Did not measure whether Prettier's markdown output changes the payload's meaning** (table
  reflow, hard wraps at 100 columns) — the markdown investigator's brief.
- **Did not test the hypothetical `format:check` CI step**; the Windows-leg conclusion is
  inferred from the five single-line `run:` steps that pass on `windows-latest` today
  (`ci.yml:31,33,35,39,56`), not from a run of a step that does not exist.
- **Did not write or prototype a `PreToolUse` formatter gate**; the "what it would require" list
  is read off `settings.json:5-52`, `investigator.md:7-13` and `rule-zero.ts:29-165`.
- **Did not check the live GitHub ruleset or any PR**; no live reads were requested and none
  were taken.
- **Did not inspect `docs/history/2026-08-25-*` records** beyond the two `grep` hits for "blame";
  the ESLint-adoption precedent is cited from the ledger entry (`mem/outstanding.md:124-128`),
  not from that contribution's full archive.
- **Did not decide** which "who runs it" shape to adopt, nor whether `docs/history/` should be
  `.prettierignore`d — both are laid out as evidence for the review.

## Live reads taken

None.
