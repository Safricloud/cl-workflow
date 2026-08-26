# Investigation — mechanisms (2026-08-26-prose-standards)

**Brief:** The kit's guide says "where a rule can be a mechanism, it is one." The owner wants
these standards added as prose: implementers write modular reusable code, never implement the
same function twice (generalize into a shared space), keep files short with separation of
concerns, write pure testable functions, and every agent prefixes its text with an identity
("Orchestrator:" / "I-<plan item>:") and narrates one line before each tool call. Which of these
can be measured or enforced by a mechanism already available to this repo, and what would each
mechanism report on the code as it stands today?

**Scope:** `eslint.config.mjs`, `tsconfig.json`, `package.json`, `node_modules/` (read-only),
`src/cli.ts`, `template/.claude/hooks/*.ts`, `.claude/hooks/*.ts`, `.claude/settings.json`,
`template/.claude/settings.json`, `template/.claude/hooks/status-block.ts`, Claude Code
transcript JSONL under `C:/Users/Keaton Forrest/.claude/projects/`

**Checkout:** `8a8aada5239a5071d3ccee761f14b98d9bc94843` (branch `feat/2026-08-26-prose-standards`)

## Answer

Four of the six standards have a mechanism already sitting in `node_modules`; two do not. **File
length, function length and function complexity** are directly enforceable by six ESLint core
rules that are all present in the installed eslint 10.9.1 and that I ran against the code — they
report between 0 and 16 findings depending on threshold, and `src/cli.ts` is the outlier on every
one of them (579 effective lines, `cmdDoctor` at complexity 41). **"Never implement the same
function twice" has no rule** — neither core nor typescript-eslint ships copy-paste detection, and
`jscpd` is not installed; measuring it by hand found exactly one genuine cross-file duplicate
(`isRecord`, byte-identical in `src/cli.ts:95` and `template/.claude/hooks/lib.ts:22`) plus two
same-name-different-body pairs. **"Pure functions" has no rule at all** in any installed preset —
it is prose-only, though `node:test` is available built-in on Node v24.4.1 to make "testable"
checkable. **The identity prefix and the narration line are mechanically checkable**, and this is
the strongest finding: sub-agent transcripts are separate files (`agent-<id>.jsonl` +
`agent-<id>.meta.json` carrying `agentType`) under the session directory, and the repo's own
`.claude/rule-zero.log` proves live hook payloads carry `agent_id`/`agent_type` (18
`agent:implementer`, 2 `agent:investigator` entries). Today the orchestrator prefixes 6/6 of its
text blocks correctly and every sub-agent prefixes 0; narration-before-tool-call ranges 16%–78%.

One trap dominates any transcript-reading mechanism: **each content block is its own JSONL
record**, so a naive "text block before tool_use in the same record" check reports 0% everywhere
and is wrong. Blocks must be grouped by `message.id` first.

## Facts

### 1. Line and function counts

| Fact | Value | Where measured |
| --- | --- | --- |
| Tracked `.ts` files | 17 | `git ls-files '*.ts' \| wc -l` gives `17` |
| The 8 root `.claude/hooks/*.ts` are byte-identical to `template/` | all 8 `IDENTICAL` | `diff -q template/.claude/hooks/$f.ts .claude/hooks/$f.ts` for each of the 8, 8x `IDENTICAL` |
| Unique source files | 9 (`src/cli.ts` + 8 hooks) | derived from the diff above |
| `eslint.config.mjs` raw lines | 51 | `wc -l eslint.config.mjs` |

Raw `wc -l` (all 17; the generated copies repeat the template numbers exactly):

| File | raw lines |
| --- | --- |
| `src/cli.ts` | 749 |
| `template/.claude/hooks/lib.ts` (= `.claude/hooks/lib.ts`) | 345 |
| `template/.claude/hooks/rule-zero-selftest.ts` | 305 |
| `template/.claude/hooks/docs-only.ts` | 304 |
| `template/.claude/hooks/pr-watch.ts` | 298 |
| `template/.claude/hooks/rule-zero.ts` | 252 |
| `template/.claude/hooks/reload-plan.ts` | 131 |
| `template/.claude/hooks/status-block.ts` | 118 |
| `template/.claude/hooks/path-fence.ts` | 79 |
| **total, all 17 + eslint.config.mjs** | **4464** |

Command: `wc -l $(git ls-files '*.ts' | sort) eslint.config.mjs`

**Function counts.** Grep used for declarations:
`grep -cE '^[[:space:]]*(export )?(async )?function [A-Za-z_]' <file>`.
Grep used for arrow-assigned consts (corrected — see Observations; my first regex false-positived
on parenthesised expressions):
`grep -nE '^[[:space:]]*(export )?(const|let) [A-Za-z_][A-Za-z0-9_]* *(:[^=]*)?= *(async )?\([^)]*\)( *: *[^=]+)? *=>' <file>`

| File | `function` decls | arrow consts | named total | **all function nodes (ESLint)** |
| --- | --- | --- | --- | --- |
| `src/cli.ts` | 29 | 0 | 29 | 42 |
| `template/.claude/hooks/lib.ts` | 25 | 0 | 25 | 27 |
| `template/.claude/hooks/pr-watch.ts` | 9 | 2 (`asInt`:208, `now`:254) | 11 | 13 |
| `template/.claude/hooks/docs-only.ts` | 9 | 0 | 9 | 11 |
| `template/.claude/hooks/reload-plan.ts` | 4 | 0 | 4 | 7 |
| `template/.claude/hooks/rule-zero-selftest.ts` | 4 | 0 | 4 | 4 |
| `template/.claude/hooks/rule-zero.ts` | 2 | 1 (`log`:117) | 3 | 5 |
| `template/.claude/hooks/path-fence.ts` | 2 | 0 | 2 | 4 |
| `template/.claude/hooks/status-block.ts` | 2 | 0 | 2 | 2 |
| **total** | **86** | **3** | **89** | **115** |

The "all function nodes" column is ESLint's own count (it includes inline callbacks), measured with
`eslint -c eslint.config.mjs --rule "max-lines-per-function: [error, {max: 0, IIFEs: true}]"` and
tallying findings per file. The 86 declarations cross-check against the 86-line name dump.

### 2. ESLint size/complexity rules — availability and what they report today

| Rule | Present? | Path |
| --- | --- | --- |
| `max-lines` | yes | `node_modules/eslint/lib/rules/max-lines.js` |
| `max-lines-per-function` | yes | `node_modules/eslint/lib/rules/max-lines-per-function.js` |
| `max-statements` | yes | `node_modules/eslint/lib/rules/max-statements.js` |
| `complexity` | yes | `node_modules/eslint/lib/rules/complexity.js` |
| `max-params` | yes | `node_modules/eslint/lib/rules/max-params.js` |
| `max-depth` | yes | `node_modules/eslint/lib/rules/max-depth.js` |

Installed versions (read from the installed packages, not the manifest):
`eslint 10.9.1`, `typescript-eslint 8.68.0`, `@typescript-eslint/eslint-plugin 8.68.0`
(at `node_modules/.pnpm/@typescript-eslint+eslint-p_b3613577eda5d2e1eebec7f75d5d066b/node_modules/@typescript-eslint/eslint-plugin`),
`typescript 6.0.3`, `node v24.4.1`. Core rule count: 293 (`ls node_modules/eslint/lib/rules/*.js | wc -l`).

**Invocation that works.** `--no-config-lookup` was not needed and not used; layering on the real
config keeps the typed parser:

```
./node_modules/.bin/eslint -c eslint.config.mjs \
  --rule "max-lines: [error, {max: 300, skipBlankLines: true, skipComments: true}]" \
  --format json <files>
```

None of these six rules is configured in `eslint.config.mjs` today (that file sets only
`no-restricted-imports`, four `n/` rules and `@typescript-eslint/no-non-null-assertion`;
`eslint.config.mjs:27-49`).

**Effective lines per file** (`skipBlankLines: true, skipComments: true`), measured with `max: 1`
so every file reports:

| File | effective lines | over 200 | over 300 | over 400 | over 500 |
| --- | --- | --- | --- | --- | --- |
| `src/cli.ts` | 579 | FAIL | FAIL | FAIL | FAIL |
| `rule-zero-selftest.ts` | 222 | FAIL | ok | ok | ok |
| `docs-only.ts` | 215 | FAIL | ok | ok | ok |
| `pr-watch.ts` | 210 | FAIL | ok | ok | ok |
| `rule-zero.ts` | 190 | ok | ok | ok | ok |
| `lib.ts` | 174 | ok | ok | ok | ok |
| `reload-plan.ts` | 96 | ok | ok | ok | ok |
| `status-block.ts` | 67 | ok | ok | ok | ok |
| `path-fence.ts` | 41 | ok | ok | ok | ok |
| **files over threshold** | | **4** | **1** | **1** | **1** |

**`max-lines-per-function`** (same skips), findings over the 9 unique files:

| max | findings | which |
| --- | --- | --- |
| 50 | **9** | `cmdDoctor` 115, `cmdUpdate` 93, `judge` 88, `runCase` 80, `report` 75, `docs-only main` 71, `cmdInit` 60, `pr-watch main` 53, `mergeSettings` 52 |
| 80 | **3** | `cmdDoctor` 115 (`src/cli.ts:583`), `cmdUpdate` 93 (`src/cli.ts:460`), `judge` 88 (`rule-zero.ts:63`) |
| 120 | **0** | — |

**`complexity`**, findings over the 9 unique files:

| max | findings |
| --- | --- |
| 10 | **16** |
| 15 | **9** |
| 20 | **5** |

At `max: 20` the five are: `cmdDoctor` 41 (`src/cli.ts:583`), `runCase` 30
(`rule-zero-selftest.ts:169`), `report` 27 (`reload-plan.ts:41`), `judge` 24 (`rule-zero.ts:63`),
`mergeSettings` 21 (`src/cli.ts:330`). At `max: 15` add `cmdUpdate` 18, `docs-only main` 18,
`pr-watch main` 16, `mayStop` 16 (`status-block.ts:59`). At `max: 10` add `installedSha` 13,
`loadConf` 12, `cli main` 14, `commentOnly` 14, `fence` 11, `grantsCli` 14, `selftest main` 11.

**The other three rules**, measured at illustrative thresholds:

| Rule | Findings (9 unique files) | Detail |
| --- | --- | --- |
| `max-params` max 4 | 1 | `runCase` has 5 (`rule-zero-selftest.ts:169`) |
| `max-depth` max 4 | 10 | all in `src/cli.ts` — lines 366, 367, 632-642; deepest is **8** at `src/cli.ts:642` |
| `max-statements` max 30 | 9 | `cmdDoctor` 72, `cmdUpdate` 70, `judge` 56, `report` 47, `cmdInit` 46, `mergeSettings` 42, `docs-only main` 41, `runCase` 39, `pr-watch main` 39 |

**Doubling caveat.** `pnpm lint` runs `eslint .` over all 17 files, so every hook finding is
reported twice — once in `template/`, once in the generated `.claude/` copy. Measured:
`complexity max=15` over `.` gives **15 findings** vs 9 over the 9 unique files
(6 hook findings x 2 + 3 `src/cli.ts` findings).

### 3. Duplicate-function detection

| Fact | Value | Where measured |
| --- | --- | --- |
| typescript-eslint copy-paste rule | **none** | `ls <plugin>/dist/rules \| grep -iE 'duplicate\|identical\|dupe\|copy\|clone'` gives only `no-dupe-class-members`, `no-duplicate-enum-values`, `no-duplicate-type-constituents` |
| core ESLint copy-paste rule | **none** | same grep on `node_modules/eslint/lib/rules` gives only `no-dupe-args`, `no-dupe-class-members`, `no-dupe-else-if`, `no-dupe-keys`, `no-duplicate-case`, `no-duplicate-imports` |
| `jscpd` installed | **no** | `ls node_modules \| grep -iE 'jscpd\|jest\|vitest\|...'` exit 1; `ls node_modules/.pnpm \| grep -i jscpd` exit 1 |

What the existing rules do **not** cover: `no-dupe-class-members` catches two members of the *same
class* with the same name; `no-redeclare` catches two bindings of the same name in the *same
scope*. Neither can see across files, and neither compares *bodies* — two identical functions in
two different modules are invisible to both.

**Hand measurement.** 86 function names dumped with
`grep -oE '^[[:space:]]*(export )?(async )?function [A-Za-z_][A-Za-z0-9_]*'` over `src/cli.ts` +
the 8 template hooks, then `cut -f1 | sort | uniq -d`. Four names occur in more than one file:

| Name | Files | Verdict |
| --- | --- | --- |
| `isRecord` | `src/cli.ts:95`, `template/.claude/hooks/lib.ts:22` | **genuine duplicate** — bodies byte-identical modulo the `export` keyword (verified by `sed`-extract + string compare, result `IDENTICAL BODY`) |
| `parseOptions` | `docs-only.ts:177`, `pr-watch.ts:184` | same *shape* (`parseArgs`, `strict: true`, `allowPositionals: false`, try/catch), different option sets — structural duplication, not identical |
| `git` | `docs-only.ts:77`, `status-block.ts:44` | same concept, **different contracts** — `docs-only` throws on failure and returns `string`; `status-block` takes a `cwd`, returns `GitResult \| null`, timeout 20s vs 60s |
| `main` | `src/cli.ts`, `docs-only.ts`, `pr-watch.ts`, `rule-zero-selftest.ts` | per-file entrypoint — not duplication |

**The existing shared space** is `template/.claude/hooks/lib.ts`: 25 exported functions + 1 type +
3 interfaces. Importer map (from the `import { ... } from "./lib.ts"` statement in each of the 7
sibling hooks):

| Export | # importers | Importing hooks |
| --- | --- | --- |
| `isRecord` | 5 | path-fence, pr-watch, reload-plan, rule-zero, status-block |
| `asString` | 5 | path-fence, reload-plan, rule-zero-selftest, rule-zero, status-block |
| `errText` | 5 | docs-only, pr-watch, reload-plan, rule-zero-selftest, rule-zero |
| `asRecord` | 4 | path-fence, pr-watch, rule-zero-selftest, rule-zero |
| `readStdinJson` | 4 | path-fence, reload-plan, rule-zero, status-block |
| `projectRoot` | 3 | docs-only, pr-watch, rule-zero |
| `readLines` | 3 | docs-only, rule-zero-selftest, rule-zero |
| `pyEscape` | 3 | docs-only, reload-plan, rule-zero |
| `emitDeny` | 2 | path-fence, rule-zero |
| `expandUser` | 2 | path-fence, rule-zero |
| `pyRealpath` | 2 | path-fence, rule-zero |
| `isWithin` | 2 | path-fence, rule-zero |
| `appendGrants` | 2 | docs-only, rule-zero |
| `appendLogLine` | 2 | docs-only, rule-zero |
| `readFileLines` | 1 | reload-plan |
| `compilePattern`, `loadConf`, `firstMatch`, `splitBashSegments`, `readGrants`, `findGrant`, `consumeGrant`, `utcStamp` | 1 each | rule-zero |
| `denyJson` | 0 external | used internally at `lib.ts:67` by `emitDeny` |
| `writeGrants` | 0 external | used internally at `lib.ts:327` by `consumeGrant` |
| `ConfVerb`, `ConfRule`, `ConfBadLine`, `ConfLoad` | 0 external | used internally at `lib.ts:133-189` |

No export is dead. `rule-zero.ts` imports 24 of them — it is the shared space's main consumer.

### 4. The identity-prefix / narration mechanism

**Transcript layout** (`ls -la "C:/Users/Keaton Forrest/.claude/projects/c--Users-Keaton-Forrest-Documents-GitHub-cl-workflow"`):

| Fact | Value |
| --- | --- |
| One `<session-uuid>.jsonl` per session, plus a `<session-uuid>/` directory | 3 sessions present |
| Sub-agent transcripts are **separate files** | `<session>/subagents/agent-<id>.jsonl` — 4 in the current session, 20+ in session `d0073c7c...` |
| Each has a sidecar | `agent-<id>.meta.json`, e.g. `{"agentType":"investigator","description":"Investigate prose map","toolUseId":"toolu_0154...","spawnDepth":1}` |
| No `agent-*.jsonl` at the project root | `ls <project> \| grep -i agent` exit 1 |

**Record shape.** Top-level keys of the first `assistant` record in a sub-agent file:
`parentUuid`, `isSidechain`, `agentId`, `message`, `requestId`, `attributionAgent`,
`attributionSkill`, `type`, `uuid`, `timestamp`, `effort`, `userType`, `entrypoint`, `cwd`,
`sessionId`, `version`, `gitBranch`. `isSidechain` is `true` in sub-agent files.
`message` keys: `model`, `id`, `type`, `role`, `content`, `stop_reason`, `stop_sequence`,
`stop_details`, `usage`, `diagnostics`. Record `type` values seen: `user`, `assistant` only.

**One content block per record** — the load-bearing structural fact. First records of one file:

```
user      msg=-        blocks=string       uuid=b2ad1efe parent=null
assistant msg=3S4ZcxgT blocks=text         uuid=10741fde parent=b2ad1efe
assistant msg=3S4ZcxgT blocks=tool_use     uuid=00e39c87 parent=10741fde
user      msg=-        blocks=tool_result  uuid=ead34f06 parent=00e39c87
assistant msg=3S4ZcxgT blocks=tool_use     uuid=86fd6011 parent=ead34f06
assistant msg=ngEc5zBN blocks=thinking     uuid=3117a325 parent=48b27fa7
assistant msg=ngEc5zBN blocks=text         uuid=77ac52fd parent=3117a325
assistant msg=ngEc5zBN blocks=tool_use     uuid=f282d585 parent=77ac52fd
```

Blocks of one assistant turn share `message.id` and chain by `parentUuid`. `thinking` blocks also
appear as their own records.

**Conformance today.** Grouping consecutive assistant records by `message.id`, then testing
(a) a non-empty `text` block before the first `tool_use` of the turn, and (b) text matching
`/^(Orchestrator:|I-[^:]{1,40}:)/`:

| Transcript | turns | turns with a tool_use | narrated | text blocks | prefix-matching |
| --- | --- | --- | --- | --- | --- |
| `324b5e61....jsonl` (main / orchestrator) | 14 | 12 | 4 (**33%**) | 6 | **6 (100%)** |
| `agent-a85ed02cbdcc55bb3` (investigator) | 36 | 36 | 28 (**78%**) | 28 | 0 (**0%**) |
| `agent-a563fefd1e601d3da` (claude-code-guide) | 5 | 4 | 2 (**50%**) | 3 | 0 (**0%**) |
| `agent-a6d5cd7ab6d9e5eeb` (investigator) | 25 | 24 | 4 (**17%**) | 5 | 0 (**0%**) |
| `agent-ada2d8fe69f5eb744` (investigator) | 38 | 38 | 6 (**16%**) | 6 | 0 (**0%**) |

The orchestrator already prefixes every one of its text blocks; no sub-agent prefixes any.

**Hook payload fields.** What the hooks read today:

| Field | Read at | Note |
| --- | --- | --- |
| `stop_hook_active` | `template/.claude/hooks/status-block.ts:68` | SubagentStop; `if (payload["stop_hook_active"]) return true;` |
| `cwd` | `template/.claude/hooks/status-block.ts:70` | `asString(payload["cwd"]) \|\| process.cwd()` |
| `agent_id` | `template/.claude/hooks/rule-zero.ts:82` | `const isSubagent = Boolean(payload["agent_id"]);` |
| `agent_type` | `template/.claude/hooks/rule-zero.ts:81` | `asString(payload["agent_type"]) \|\| "unknown-agent"` |
| `tool_name`, `tool_input`, `permission_mode` | `rule-zero.ts:78-80` | |
| **`transcript_path`** | **nowhere** | `grep -rnE 'transcript_path\|transcript\|agent_id\|session_id' template/.claude/hooks/ .claude/hooks/ src/` gives no `transcript` match in any `.ts` |

**`agent_id`/`agent_type` are populated in real payloads** — measured, not assumed, from this
repo's own ledger `.claude/rule-zero.log` (36 lines):
`grep -oE 'agent:[a-z-]+|orchestrator' .claude/rule-zero.log | sort | uniq -c` gives
`18 agent:implementer`, `2 agent:investigator`, `16 orchestrator`. `rule-zero.ts:83` derives
`who` from `agent_id`/`agent_type`, so those 20 agent-attributed rows could only have been written
if the live payload carried both fields. (`rule-zero-selftest.ts:217` also sets
`payload["agent_id"] = "agent_selftest"`, but that is a synthetic payload and proves only the
kit's assumption; the log is the real evidence.)

**Hook wiring** (`.claude/settings.json`): `PreToolUse` matcher
`Bash|Edit|Write|MultiEdit|NotebookEdit|mcp__.*` gives `rule-zero.ts` (timeout 10);
**`SubagentStop` matcher `implementer` gives `status-block.ts` (timeout 30)**;
`SessionStart` matcher `compact|resume` gives `reload-plan.ts` (timeout 10). There is no `Stop`
hook and no `PostToolUse` hook.

**Could a SubagentStop/Stop hook read the transcript to check the prefix?** Based only on what I
measured: yes, the data is on disk in a parseable form — the sub-agent's own file is
`<project>/<session>/subagents/agent-<id>.jsonl`, its last non-empty assistant `text` block is
recoverable by grouping on `message.id`, and I recovered it for all four files above (e.g. the
last text of `agent-a6d5cd7ab6d9e5eeb` begins `"All measurements taken. Writing the report."`).
**Unmeasured:** whether Claude Code's SubagentStop payload actually contains `transcript_path`
(or any field pointing at the sub-agent's own file rather than the parent session's). That comes
from the docs, not from this repo — nothing in this checkout reads it, so I have no local
evidence either way. A hook could alternatively locate the file from `agent_id` + `cwd` if the
payload carries `agent_id` at SubagentStop the way it does at PreToolUse — also unmeasured, since
the ledger only proves it for PreToolUse.

### 5. Purity / side-effect rules

| Source | Rules matching `functional`, `pure`, `side-effect` | Where measured |
| --- | --- | --- |
| ESLint core (293 rules) | **none** | `ls node_modules/eslint/lib/rules \| grep -iE 'functional\|pure\|side-effect'` exit 1 |
| typescript-eslint plugin (273 rule files) | only `no-import-type-side-effects` | `ls <plugin>/dist/rules \| grep -iE 'functional\|pure\|side-effect'` |
| `eslint-plugin-n` | **none** | `ls node_modules/eslint-plugin-n/lib/rules/ \| grep -iE 'pure\|functional\|side-effect'` exit 1 |

`no-import-type-side-effects` is about `import type` elision, unrelated to function purity.
Grep sanity-checked against a known-present pattern: `grep -c 'no-unused'` on the core rules dir
gives `4`. There is no purity mechanism available. `eslint-plugin-functional` is not installed.

### 6. Test tooling

| Fact | Value | Where measured |
| --- | --- | --- |
| Node version | `v24.4.1` | `node --version` |
| `node:test` available | yes | `node -e "import('node:test').then(m=>console.log(Object.keys(m).slice(0,8)))"` gives `after, afterEach, assert, before, beforeEach, default, describe, it` |
| `node:assert` strict | present | `node -e "console.log(typeof require('node:assert').strict)"` gives `function` |
| `node_modules/.bin` contents | `eslint`, `tsc`, `tsserver` (+ `.CMD`/`.ps1`) — **no test runner** | `ls node_modules/.bin` |
| Playwright | **not installed** | `ls node_modules/@playwright` gives `No such file or directory` |
| jest / vitest / mocha / tap / ava / cypress / jscpd | **none** | `ls node_modules \| grep -iE 'jest\|vitest\|mocha\|tap\|ava\|playwright\|cypress\|jscpd'` exit 1 |
| Existing test entrypoint | `"selftest": "node template/.claude/hooks/rule-zero-selftest.ts"` | `package.json` scripts; there is no `test` script |
| devDependencies | `@eslint/js`, `@types/node`, `eslint`, `eslint-plugin-n`, `typescript`, `typescript-eslint` — 6, no runtime deps | `package.json` |

`tsconfig.json` `include` is `["src", "template/.claude/hooks", ".claude/hooks"]` — the same 17
files ESLint sees.

## Observations

- **The generated-copy doubling is a real cost for any new ESLint rule.** Because `.claude/hooks/`
  is a byte-identical generated copy inside the lint scope, every hook violation is reported
  twice (measured: 15 findings repo-wide vs 9 unique at `complexity: 15`). Any threshold chosen
  from the "9 unique files" table will produce roughly 1.7x that number in `pnpm lint` output. An
  `ignores` entry for `.claude/hooks/` would fix the noise but would also stop linting the copy
  that actually runs — a trade-off worth naming explicitly rather than discovering later.

- **`src/cli.ts` is the single file that fails every size mechanism**, and it fails them by a wide
  margin: 579 effective lines (next largest is 222), 42 function nodes, `cmdDoctor` at complexity
  41 / 115 lines / 72 statements, and nesting depth 8 at line 642. Any "keep files short"
  threshold between 250 and 500 lands on `src/cli.ts` alone. Its own header comment
  (`src/cli.ts:3`) says "One file, zero runtime dependencies", so the prose standard and the
  file's stated design intent are in direct tension, and that tension is a decision for the plan,
  not something a threshold settles.

- **The one true duplicate is `isRecord`, and it may be unfixable by the obvious route.**
  `src/cli.ts:95` and `template/.claude/hooks/lib.ts:22` are byte-identical. But `src/` compiles to
  `dist/cli.js` while `template/.claude/hooks/` is a payload copied verbatim into target projects;
  an `import` from `src/cli.ts` into `template/` would drag a hook file into the CLI's build graph
  and, per the same header comment, `dist/` must stand alone. "Generalize into a shared space" has
  a boundary here that prose should acknowledge — the duplication may be deliberate.

- **The narration measurement is a trap for the unwary.** Testing "text block before tool_use
  within one assistant record" returns **0% on every transcript**, which looks like a damning
  finding and is simply an artifact of one-block-per-record storage. Only after grouping by
  `message.id` do the real numbers appear (16%–78%). Any implementer told to build this check will
  hit the same wall; the plan should carry the grouping requirement explicitly.

- **`parseOptions` is the better generalization target than `isRecord`.** Both copies
  (`docs-only.ts:177`, `pr-watch.ts:184`) are the same 14-line `parseArgs` + try/catch skeleton
  differing only in the `options` object — a single `parseFlags(argv, options)` in `lib.ts` would
  absorb both, and both files already import from `lib.ts`. No cross-build-target boundary in the
  way. A copy-paste detector would likely flag this pair and miss nothing else.

- **`git` in `docs-only.ts` vs `status-block.ts` is a same-name/different-contract pair** —
  throws-vs-returns-null, 60s-vs-20s timeout, no-cwd-vs-cwd. Merging them would be a behaviour
  change to a fail-closed hook, not a refactor. This is the case where "never implement the same
  function twice" would do harm if applied mechanically.

- **The orchestrator is already at 100% prefix conformance and sub-agents at 0%.** The prefix
  standard is, today, an orchestrator-only habit. Whatever mechanism is chosen, the gap it must
  close is entirely on the sub-agent side — and sub-agent definitions live in `.claude/agents/`,
  which is generated from `template/.claude/agents/` like everything else.

- **`.claude/hooks/__pycache__/` exists** with a `rule-zero-selftest.cpython-313.pyc` (surfaced by
  a recursive grep; it is gitignored, so `git status` stays clean). A leftover from the Python
  originals the comments reference. Harmless, but it means recursive greps over `.claude/hooks/`
  hit a binary file.

- **`SubagentStop` is wired only for `implementer`** (`.claude/settings.json`), so a prefix check
  installed there would never see an `investigator` — including this one. Extending the matcher is
  a separate decision from writing the check.

## Not done / could not measure

- **Did not determine what Claude Code's hook payload actually contains** for `SubagentStop` or
  `Stop` — specifically whether `transcript_path`, `agent_id` or `agent_type` are present at those
  events. I measured `agent_id`/`agent_type` presence at **PreToolUse only**, via the ledger. The
  rest is documentation, which is outside what I can measure from this checkout.
- **Did not run `pnpm lint`, `pnpm typecheck`, `pnpm build` or `pnpm selftest`.** All ESLint runs
  were read-only measurements layering `--rule` onto the existing config; none wrote anything.
- **Did not edit `eslint.config.mjs`** or any tracked file. Thresholds were passed on the command
  line. Throwaway scripts (`parse.mjs`, `imports.mjs`, `shape.mjs`, `narrate.mjs`, `seq.mjs`,
  `turns.mjs`, `fns.txt`) live in the scratchpad outside the repo. Final
  `git status --porcelain` shows only `?? docs/reviews/2026-08-26-prose-standards/` — this
  report's own directory.
- **Did not install anything.** No `pnpm add`, no `pnpm dlx`, no `npx` of an absent package. All
  ESLint invocations used `./node_modules/.bin/eslint`.
- **Did not evaluate `jscpd` or `eslint-plugin-functional` behaviour** — neither is installed and I
  was instructed not to install. Their absence is measured; their usefulness is not.
- **Did not measure "modular reusable code" or "separation of concerns"** as such. No mechanism in
  the installed toolchain expresses either; the size and complexity rules above are proxies, and
  I have reported them as proxies rather than as measurements of the standard.
- **Did not sample transcripts from other projects** under `.claude/projects/` — only the
  `cl-workflow` project directory, 5 files (1 main session + 4 sub-agents of the current session).
  The prefix/narration percentages are therefore from one session's worth of agents.
- **Did not quote transcript content** beyond field names, one 8-line structural skeleton with
  block types and truncated uuids, and two sub-60-character text openings used to identify files.
- **Did not verify `template/.claude/settings.json`** against `.claude/settings.json` — I read the
  generated root copy only. The CI gate re-runs `update` and fails on drift, so they should match,
  but I did not diff them.

## Live reads taken

None. The brief did not ask for any, and none were taken. Every command in this report ran against
the local checkout, the local `node_modules`, or local transcript files on this machine; all were
reads. No network call was made and nothing outside `docs/reviews/` was written.
