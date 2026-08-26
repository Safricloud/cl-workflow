# Investigation — prose-map (2026-08-26-prose-standards)

**Brief:** The owner wants nine prose standards added to the kit's process documents. Map every
sentence in the kit's prose that already governs the same ground, with file:line, and every place
the new standards would collide with existing text.
**Scope:** `template/.claude/rules/process.md`, `template/.claude/skills/contribute/SKILL.md`,
`template/.claude/skills/contribute/templates/*.md`, `template/.claude/agents/implementer.md`,
`template/.claude/agents/investigator.md`, `template/docs/guides/agent-workflow.md`,
`template/CLAUDE.md`, `template/mem/*.md`, `README.md`, `CLAUDE.md` (root), `src/cli.ts` (OWNED list only)
**Checkout:** `8a8aada5239a5071d3ccee761f14b98d9bc94843` — branch `feat/2026-08-26-prose-standards`,
working tree clean (`git status --porcelain --untracked-files=all` printed nothing)

## Answer

Four of the nine standards are already said in some form and five are new ground. Standards 1–4
(self-identification, one-liners before tool calls) have **zero** existing text — no match for
`identify`, `prefix`, `one-liner`, `narrat`, `announce`, `preamble`, `before tool` anywhere in
scope — and no mechanism can enforce them, which puts them in tension with the guide's opening
principle "where a rule can be a mechanism, it is one" (`template/docs/guides/agent-workflow.md:12`).
Standards 5–8 (modularity, no duplicate functions, short files, pure functions) are also entirely
absent — `modular`, `reusable`, `reuse`, `DRY`, `separation of concerns`, `pure function`,
`generalise/generalize`, `refactor`, `helper` all return zero matches — and standard 6 **directly
contradicts** the implementer's ownership fence at `template/.claude/agents/implementer.md:33-34`
("You own exactly the files listed under **Files** … If the work needs another file, stop and
report **Blocked**"), because generalising a function into a shared space touches at minimum the
shared file and the original caller. Standard 9's first half is already stated as a
plan-authoring rule (`agent-workflow.md:231-232`, "An item without a test in its acceptance is not
done when the agent says it is") but never as an implementer obligation; Playwright appears
nowhere in any tracked file, and today's UI rule is manual appraisal by the orchestrator
(`agent-workflow.md:150-151`, `:279`), so naming Playwright would be the payload's first mandate
of a specific third-party tool in a **managed** file — every other tool choice in the kit is a
`<placeholder>` in the **owned** `CLAUDE.md`. On the identifier: `n.m` is already the only
identity an implementer receives (`SKILL.md:117`), the kit's word is "item" and **never** "task"
(zero matches for `task` in scope), and during the PR-review loop implementers run from inline
briefs with no plan and therefore no item number at all (`implementer.md:14-15`, `:26`, `:66-68`;
`SKILL.md:198-200`; `agent-workflow.md:357-359`).

## Facts

### A. Standard-by-standard map

| # | Standard (owner's words, abridged) | Existing sentence(s) | file:line | Relationship |
| --- | --- | --- | --- | --- |
| 1 | Orchestrator: always identify yourself — prefix text with "Orchestrator" | `You are the orchestrator. Ten phases, in order…` | `template/.claude/skills/contribute/SKILL.md:8` | **Silent** on output form. Assigns the role; says nothing about how the agent labels its own text. |
| 1 | " | `**Orchestrator** — the agent in the conversation. Orients, briefs investigators…` | `template/docs/guides/agent-workflow.md:53-58` | **Silent** — a duty list, no voice/identity rule. |
| 1 | " | `**Orchestrator** (this session) orients, briefs investigators, writes the review and the plan…` | `template/.claude/rules/process.md:45-48` | **Silent** — same. |
| 1 | " | Grep for `identify`, `prefix` across the whole scope | zero matches (command in Observations) | **Silent** — no existing text on any agent naming itself. |
| 2 | Orchestrator: brief one-liners before tool calls | Grep for `one-liner`, `narrat`, `announce`, `preamble`, `before tool` | zero matches | **Silent** — nothing in the kit governs pre-tool-call narration. |
| 2 | " | `Report in the conversation: which way in (the owner's words, quoted…), method, SHA.` | `SKILL.md:230-232` | **Partly / adjacent** — governs the *end-of-phase report*, not running commentary. |
| 2 | " | `Report in one paragraph in the conversation: merge method and SHA, deploy result…` | `SKILL.md:244-245` | **Partly / adjacent** — same, deploy phase. |
| 2 | " | `The orchestrator reports in one paragraph in the conversation — merge method and SHA…` | `agent-workflow.md:422-423` | **Partly / adjacent**. |
| 3 | Implementers: prefix text with `I-<task number from plan>` | `You are implementing **one item**. The orchestrator's message gives you either` | `implementer.md:10` | **Silent** on output form; establishes the singular-item identity. |
| 3 | " | `a plan item — `item n.m` of `docs/plans/<id>/phase-<n>.md` — and your scoped validation commands; or` | `implementer.md:12-13` | **Partly** — `n.m` is the identifier the implementer is given; no instruction to echo it. |
| 3 | " | `Implement item <n.m> of docs/plans/<id>/phase-<n>.md. Scoped validation: <exact commands>.` | `SKILL.md:117` (fenced block `SKILL.md:116-118`) | **Partly** — the one-line invocation; `n.m` reaches the agent here and nowhere else. |
| 3 | " | `(`Implement item <n.m> of docs/plans/<id>/phase-<n>.md. Scoped validation: <commands>.`)` | `agent-workflow.md:248` | **Partly** — the guide's copy of the same invocation. |
| 3 | " | `#### Status — item n.m` | `implementer.md:60`, `implementer.md:71`; `templates/phase.md:13`, `:18`; `.claude/hooks/status-block.ts:54` | **Partly** — `n.m` also appears as the status heading the implementer must find. |
| 3 | " | Grep for `task` across the whole scope | zero matches | **Contradicts vocabulary** — the kit's noun is "item"; "task number" exists nowhere. |
| 4 | Implementers: brief one-liners before tool calls | Grep for `one-liner`, `narrat`, `announce`, `preamble`, `before tool` | zero matches | **Silent**. |
| 4 | " | `Your final message to the orchestrator is a short summary: Done or Blocked, the worktree branch, and anything that needs a human. The detail lives in the status block, not in the message.` | `implementer.md:86-87` | **Partly / tension** — the only existing instruction about implementer prose pushes toward *less* message text, not more. |
| 5 | Write modular reusable code | Grep for `modular`, `reusable`, `reuse` | zero matches | **Silent**. |
| 5 | " | `**Approach:** <what to build and why this way; cite the facts table in plan.md>` | `templates/phase.md:8` | **Silent** — the slot where such guidance would land per-item today. |
| 5 | " | `**Conventions that will fail your lint:** <the two or three that bite here>` | `templates/phase.md:9` | **Partly** — the kit's existing route for code-style rules is per-project lint, not global prose. |
| 6 | Never implement the same function twice — generalise the existing one and move it to a shared space | Grep for `duplicat`, `DRY`, `generalis`, `generaliz`, `refactor`, `helper` | zero matches in scope (`README.md:147` "byte-identical duplicates" is about files, not functions) | **Silent** on the principle. |
| 6 | " | `You own exactly the files listed under **Files** for your item. If the work needs another file, stop and report **Blocked** in your status block rather than touching it.` | `implementer.md:33-34` | **CONTRADICTS** — see Collisions. |
| 6 | " | `**Items** (in the phase files) — each with **Files** it owns` | `agent-workflow.md:229` | **CONTRADICTS** — same fence, restated. |
| 6 | " | `the agent definition carries the invariants — read the guide and the area memory, inherit the facts, **own only your files**, scoped validation, verify the checker, rule zero, no push, the status block.` | `agent-workflow.md:249-250` | **CONTRADICTS** — "own only your files" listed as an invariant. |
| 6 | " | `**Files:** <exact list the agent owns>` | `templates/phase.md:7` | **CONTRADICTS** — the file list is declared up front, before the duplication is discovered. |
| 6 | " | `Two items that touch the same magnet file (lockfile, root manifest, `CLAUDE.md`, a shared client, the same region of a module) go in different phases, or you commit the shared edit as a seed before the phase.` | `SKILL.md:104-106` | **Partly / collides** — a "shared space" is by definition a magnet file; standard 6 makes magnet-file contention the normal case. |
| 6 | " | `Items that both touch a magnet file — lockfile, root manifest, `CLAUDE.md`, a shared client, the same region of a module — conflict on merge: different phases, or the shared edit is committed as a seed before the phase.` | `agent-workflow.md:225-228` | **Partly / collides** — same. |
| 6 | " | `(lockfile, root manifest, CLAUDE.md, a shared client, the same region of a module) go in different phases, or the shared edit is seeded first.` | `templates/plan.md:26-27` | **Partly / collides** — same, in the plan template. |
| 7 | Files short and concise, honouring separation of concerns | Grep for `separation of concerns` | zero matches | **Silent**. |
| 7 | " | `src/cli.ts        the whole CLI: init, update, doctor. One file, no runtime dependencies.` | `README.md:138` | **Contradicts in this repo** — `src/cli.ts` is 749 lines and advertised as deliberately one file. |
| 8 | Pure testable functions where possible | Grep for `pure function` | zero matches | **Silent**. |
| 8 | " | `**Acceptance:** <checks that must be green; the tests that must exist; what must FAIL if the change is reverted>` | `templates/phase.md:11-12` | **Partly** — demands testability of the *outcome*, says nothing about function purity. |
| 9 | Implementations always pair with tests for their logic | `Every item: **Files**, **Approach** citing the facts, **Conventions that will fail your lint**, **Scoped validation**, **Acceptance including tests** (what must FAIL if reverted).` | `SKILL.md:101-102` | **Already says it** — but as a *plan-authoring* rule for the orchestrator. |
| 9 | " | `**Acceptance including tests** (what must FAIL if the change is reverted). An item without a test in its acceptance is not done when the agent says it is.` | `agent-workflow.md:230-232` | **Already says it** — strongest existing statement; still addressed to the plan, not the implementer. |
| 9 | " | `**Acceptance:** <checks that must be green; the tests that must exist; what must FAIL if the change is reverted>` | `templates/phase.md:11-12` | **Already says it** — the template slot. |
| 9 | " | `- [ ] **Plan** … + `phase-<n>.md` (items with files/approach/validation/acceptance+tests)` | `agent-workflow.md:458-459` | **Already says it** — checklist form. |
| 9 | " | `**Verify the checker**: make your new test fail on purpose (revert the change or break the assertion), see it fail, restore it, see it pass. Record both results.` | `implementer.md:52-53` | **Partly** — presumes a test exists; does not require one. |
| 9 | " | `**Verify the checker**: a new test is evidence only once seen to fail — revert the fix, watch it go red, restore.` | `agent-workflow.md:277-278` | **Partly** — same presumption. |
| 9 | " | `- **Checker verified:** reverted <X>, tests failed (`<actual vs expected>`); restored, green` | `implementer.md:81` | **Partly** — status-block field. |
| 9 | Visual browser-based tests use Playwright | `git grep -ni "playwright"` over all tracked files | **zero matches** | **Silent** — Playwright is named nowhere in the repo. |
| 9 | " | `For UI: the real rendered app at each relevant viewport, screenshots, appraised by the orchestrator itself. Code-reading cannot validate layout.` | `agent-workflow.md:150-151` | **Partly / tension** — assigns UI validation to the orchestrator's own eye, not to an automated suite an implementer writes. |
| 9 | " | `UI at each viewport, screenshots before and after, appraised by you.` | `agent-workflow.md:279` | **Partly / tension** — same. |
| 9 | " | `real rendered UI at each viewport, screenshots appraised by you` | `SKILL.md:131-132` | **Partly / tension** — same. |
| 9 | " | `<What was run, counts, checkers verified, screenshots appraised, findings → phase <n>.5 items.>` | `templates/phase.md:25` | **Partly** — screenshot slot exists; no tool named. |
| 9 | " | `<Full check, build, E2E for the touched surfaces, screenshots at which viewports, container run if touched, checker-verified for each new test.>` | `templates/plan.md:34-35` | **Partly** — "E2E" is generic; no tool named. |
| 9 | " | `- <full check with counts>; <E2E suites and results>; <new tests seen to fail against a pre-change build>; <screenshots appraised at which viewports>; <container run if touched>` | `templates/pr-body.md:13-14` | **Partly** — same. |
| 9 | " | `- E2E: `<cmd>` (`<which suites cover which surfaces>`)` | `template/CLAUDE.md:9` | **Partly / collides** — the E2E tool is a per-project placeholder in an **owned** file (see D). |

### B. Collisions, quoted in full

**B1 — the ownership fence vs standard 6.**

| Quote | file:line |
| --- | --- |
| `- You own exactly the files listed under **Files** for your item. If the work needs another file,` / `  stop and report **Blocked** in your status block rather than touching it.` | `template/.claude/agents/implementer.md:33-34` |
| `- Do not delegate to other agents.` | `template/.claude/agents/implementer.md:35` |
| `**Files:** <exact list the agent owns>` | `template/.claude/skills/contribute/templates/phase.md:7` |
| `- Every item: **Files**, **Approach** citing the facts, **Conventions that will fail your` / `  lint**, **Scoped validation**, **Acceptance including tests** (what must FAIL if reverted).` | `SKILL.md:101-102` |
| `- **Phase by expected merge cleanliness.** Implementers work in their own worktrees branched` / `  from your HEAD. Two items that touch the same magnet file (lockfile, root manifest,` / `  `CLAUDE.md`, a shared client, the same region of a module) go in different phases, or you` / `  commit the shared edit as a seed before the phase. Parallel wherever merges will be clean.` | `SKILL.md:103-106` |
| `  `phase-<n>.md` (`templates/phase.md`) — the items of one phase with their status blocks, a` / `  merge-back record and a verification record. Implementers edit only their own item's` / `  section; phase-mates share the file and their sections merge cleanly.` | `SKILL.md:96-98` |
| `One file per phase means the implementers of a phase share one small file` / `and edit only their own item's section, while the overview — facts, decisions, phasing — is not` / `touched by anyone but the orchestrator.` | `agent-workflow.md:212-214` |
| `- **Items** (in the phase files) — each with **Files** it owns, **Approach** citing the facts,` / `  **Conventions that will fail your lint**, **Scoped validation** commands, **Acceptance` / `  including tests** (what must FAIL if the change is reverted). An item without a test in its` / `  acceptance is not done when the agent says it is. Under each item, a **Status** heading the` / `  implementer keeps current.` | `agent-workflow.md:229-233` |
| `- **Phasing by expected merge cleanliness.** … Items that both touch a` / `  magnet file — lockfile, root manifest, `CLAUDE.md`, a shared client, the same region of a` / `  module — conflict on merge: different phases, or the shared edit is committed as a seed before` / `  the phase. Everything else runs in parallel.` | `agent-workflow.md:223-228` |
| `the agent definition carries the invariants — read the guide and the area memory, inherit the facts, own` / `only your files, scoped validation, verify the checker, rule zero, no push, the status block.` | `agent-workflow.md:249-250` |
| `- **Orchestrator work** — documents only: seeds, plan, ledger, `CLAUDE.md`, blocked issues,` / `  archive, PR.` | `agent-workflow.md:234-235` |
| `<Group by EXPECTED MERGE CLEANLINESS. Implementers work in their own worktrees off this branch's` / `HEAD and edit only their item's section of their phase file. Items that both touch a magnet file` / `(lockfile, root manifest, CLAUDE.md, a shared client, the same region of a module) go in` / `different phases, or the shared edit is seeded first.` | `templates/plan.md:24-27` |

The collision, stated: standard 6 obliges an implementer that finds a duplicate to (a) edit the
existing function, (b) move it into a shared file, and (c) update the original call site. At
least two of those three files are, by construction, not in its **Files** list — the duplicate is
discovered *during* the work, after the plan declared the list. `implementer.md:33-34` says the
correct response to needing another file is to stop and report **Blocked**. So under today's text,
an implementer obeying standard 6 must first disobey the ownership fence, or standard 6 resolves
in practice to "report Blocked and let the orchestrator write a phase N.5 item".

**B2 — where the task/item number reaches an implementer.**

| Fact | Value | Where measured |
| --- | --- | --- |
| The dispatch invocation, verbatim | ` ```\nImplement item <n.m> of docs/plans/<id>/phase-<n>.md. Scoped validation: <exact commands>.\n``` ` | `SKILL.md:116-118` |
| The guide's copy | `The invocation is one line\n(`Implement item <n.m> of docs/plans/<id>/phase-<n>.md. Scoped validation: <commands>.`); the agent\ndefinition carries the invariants` | `agent-workflow.md:247-250` |
| Is `n.m` the only identifier an implementer receives? | **No — two.** `n.m` from the invocation (`SKILL.md:117`) and the worktree slug: `Works in `.claude/worktrees/<slug>` on `worktree-<slug>`` | `agent-workflow.md:252`; slug also `SKILL.md:124`, `:126` |
| Does the kit ever use the word "task"? | **No.** `grep -rni task` over the whole scope → zero matches | command in Observations |
| Where `n.m` appears again for the implementer | `#### Status — item n.m` heading it must write under | `implementer.md:60`, `:71`; `templates/phase.md:13`, `:18` |
| Does any mechanism know `n.m`? | **No.** `status-block.ts` only diffs `docs/plans/` against a base; it never parses an item number | `template/.claude/hooks/status-block.ts:102-106`; the string `item n.m` appears only inside the error message at `:54` |

**B3 — the PR-review loop: implementers with no plan and no item number.**

| Quote | file:line |
| --- | --- |
| `- an **inline brief** (used during the PR review loop, after the plan has been archived):` / `  files, approach, scoped validation, acceptance, all in the message.` | `implementer.md:14-15` |
| `   Inline brief: the brief is your spec; `docs/history/<id>/plan.md` holds the facts.` | `implementer.md:26` |
| `**Inline brief:** there is no plan file to write to — nothing under `docs/` is changed after the` / `PR opens. Put the same block, in full, in your final message instead; the orchestrator posts it` / `to the PR.` | `implementer.md:66-68` |
| `Legitimate ones go to` / `implementers as **inline briefs** (files, approach, scoped validation, acceptance — the plan is` / `archived and is not reopened); each returns its status block in its message.` | `SKILL.md:197-199` |
| `3. Legitimate ones go to implementers as **inline briefs** — files, approach, scoped` / `   validation, acceptance, in the message — because the plan is archived and is not reopened.` / `   Each returns its status block in its message.` | `agent-workflow.md:357-359` |
| `if (plans.length === 0) return true; // no plan here (archived, or inline brief): nothing to enforce` | `template/.claude/hooks/status-block.ts:74` |

The collision, stated: `I-<task number from plan>` has no referent in the review loop. The plan is
archived (`SKILL.md:198`), the status block goes in the message instead (`implementer.md:66-68`),
and the enforcement hook explicitly stands down (`status-block.ts:74`). Any prefix rule needs a
second form for inline-brief runs, or the orchestrator must mint an identifier in the inline
brief.

### C. "Where a rule can be a mechanism, it is one"

Verbatim, `template/docs/guides/agent-workflow.md:12-15`:

> One principle runs through this edition: **where a rule can be a mechanism, it is one.** Rule
> zero is a hook. "Investigators write only under `docs/reviews/`" is a hook. "Implementers keep a
> status block" is a stop hook. "Check every five minutes" is a script. The prose explains; the
> files in `.claude/` enforce. Appendix D lists what changed from the portable baseline.

Mechanisms the guide names as enforcing what would otherwise be prose:

| Mechanism | What it enforces | file:line in the guide |
| --- | --- | --- |
| `.claude/settings.json`, `.claude/hooks/`, `.claude/rule-zero.conf` | "Enforcement" row of the layout table | `agent-workflow.md:43` |
| `PreToolUse` hook `.claude/hooks/rule-zero.ts` | rule zero, judged per Bash segment / edit / MCP call | `agent-workflow.md:72-73`, `:86` |
| `.claude/hooks/rule-zero-selftest.ts` | proves the gate is live | `agent-workflow.md:94-95` |
| a hook in the investigator's frontmatter (`path-fence.ts`) | "fences every write to `docs/reviews/`" | `agent-workflow.md:140-141` (guide names it as "a hook in its definition"; the file is `path-fence.ts`, wired at `template/.claude/agents/investigator.md:7-13`) |
| `SubagentStop` hook (`status-block.ts`) | "refuses to let it finish while nothing under `docs/plans/` has changed" | `agent-workflow.md:257` |
| the rule-zero hook's `-d`/`-D` handling | "allows `-d` on `worktree-*` and treats `-D` as rule zero everywhere" | `agent-workflow.md:269-270` |
| `.claude/hooks/pr-watch.ts` | "The waiting is a script" | `agent-workflow.md:343-344` |
| `.claude/hooks/docs-only.ts` | "The decision is a measurement, not a judgement" | `agent-workflow.md:391-397` |
| Appendix D rows restating the same | rule zero, path fence, status block, pr-watch, docs-only | `agent-workflow.md:481`, `:483`, `:487`, `:494`, `:495` |

Count of hook/mechanism/script/enforce mentions in the guide:
`grep -n -E "hook|mechanism|script|enforce|\.ts\b" template/docs/guides/agent-workflow.md`
returns **25 lines** — 12, 13, 14, 15, 23, 43, 72, 84, 86, 93, 94, 140, 254, 257, 269, 276, 343,
383, 392, 480, 481, 483, 487, 494, 495. Two are incidental substring hits: line 23
("`<descriptive-slug>`") and line 480 ("the owner's **descri**ption of the loop") both match
`script` inside "descriptive"/"description". **23 substantive mentions** remain.

Wired hook events available today (`template/.claude/settings.json`): `PreToolUse` (matcher
`Bash|Edit|Write|MultiEdit|NotebookEdit|mcp__.*`, `:6-21`), `SubagentStop` (matcher `implementer`,
`:22-36`), `SessionStart` (matcher `compact|resume`, `:37-51`). None of the three can observe
whether the agent emitted a one-line narration before a tool call, and none can observe the
prefix on an assistant message.

### D. Managed vs owned — what reaches an installed target on `cl-workflow update`

`OWNED` list, `src/cli.ts:31-41`:

```
const OWNED: readonly string[] = [
  ".claude/rule-zero.conf",
  "CLAUDE.md",
  "docs/history/.gitkeep",
  "docs/history/index.md",
  "docs/plans/.gitkeep",
  "docs/reports/.gitkeep",
  "docs/reviews/.gitkeep",
  "mem/index.md",
  "mem/outstanding.md",
];
```

Classifier: `src/cli.ts:153-156` — `if (src === MERGED) return "merged"; return OWNED.indexOf(src) >= 0 ? "owned" : "managed";`
Update behaviour for owned: `src/cli.ts:483-486` — `if (file.cls === "owned") { owned++; continue; // yours from the moment it landed }`
README statement: `README.md:39` — "**Owned** files are never touched"; `README.md:51-53` — "**Owned** (9 files) — seeded once and then yours: `rule-zero.conf`, `CLAUDE.md`, `mem/index.md`, `mem/outstanding.md`, `docs/history/index.md`, and the empty `docs/` scaffolding. `update` never touches these."

| File in scope | Class | Reaches an already-installed project on `update`? |
| --- | --- | --- |
| `template/.claude/rules/process.md` | managed | **Yes** |
| `template/.claude/skills/contribute/SKILL.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/blocked-issue.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/investigation.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/issue-comment.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/phase.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/plan.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/pr-body.md` | managed | **Yes** |
| `template/.claude/skills/contribute/templates/review.md` | managed | **Yes** |
| `template/.claude/agents/implementer.md` | managed | **Yes** |
| `template/.claude/agents/investigator.md` | managed | **Yes** |
| `template/docs/guides/agent-workflow.md` | managed | **Yes** (it is in the payload — `git ls-files template/docs` lists it; it is not in `OWNED`) |
| `template/CLAUDE.md` | **owned** | **No** — seeded at `init`, never updated |
| `template/mem/index.md` | **owned** | **No** |
| `template/mem/outstanding.md` | **owned** | **No** |
| `README.md` (repo root) | **not in the payload** | **No** — `git ls-files template/ \| grep -i readme` returns nothing; `package.json` `files` is `["dist","template"]` |
| `CLAUDE.md` (repo root) | this repo's own owned copy | **No** — same class as `template/CLAUDE.md` |

Counts check: `git ls-files template/ | wc -l` = **33**; 33 − 9 owned − 1 merged (`.claude/settings.json`, `src/cli.ts:44`) = **23 managed**, matching `README.md:49` ("Managed (23 files)") and `README.md:51` ("Owned (9 files)").

### E. Root-copy parity

`docs/guides/agent-workflow.md` **is** in the payload: `git ls-files template/docs` returns
`template/docs/guides/agent-workflow.md`, `template/docs/history/.gitkeep`,
`template/docs/history/index.md`, `template/docs/plans/.gitkeep`, `template/docs/reports/.gitkeep`,
`template/docs/reviews/.gitkeep`.

`diff -q` of every template file against its root counterpart (`.claude/gitignore` mapped to
`.claude/.gitignore` per `src/cli.ts:148-151`): **all 25 comparable files are byte-identical
today**, zero differences, zero missing.

| Pair | Result |
| --- | --- |
| `template/.claude/.gitattributes` ↔ `.claude/.gitattributes` | identical |
| `template/.claude/agents/implementer.md` ↔ `.claude/agents/implementer.md` | identical |
| `template/.claude/agents/investigator.md` ↔ `.claude/agents/investigator.md` | identical |
| `template/.claude/gitignore` ↔ `.claude/.gitignore` | identical |
| `template/.claude/hooks/docs-only.ts` ↔ `.claude/hooks/docs-only.ts` | identical |
| `template/.claude/hooks/lib.ts` ↔ `.claude/hooks/lib.ts` | identical |
| `template/.claude/hooks/package.json` ↔ `.claude/hooks/package.json` | identical |
| `template/.claude/hooks/path-fence.ts` ↔ `.claude/hooks/path-fence.ts` | identical |
| `template/.claude/hooks/pr-watch.ts` ↔ `.claude/hooks/pr-watch.ts` | identical |
| `template/.claude/hooks/reload-plan.ts` ↔ `.claude/hooks/reload-plan.ts` | identical |
| `template/.claude/hooks/rule-zero-selftest.ts` ↔ `.claude/hooks/rule-zero-selftest.ts` | identical |
| `template/.claude/hooks/rule-zero.ts` ↔ `.claude/hooks/rule-zero.ts` | identical |
| `template/.claude/hooks/status-block.ts` ↔ `.claude/hooks/status-block.ts` | identical |
| `template/.claude/rule-zero.conf` ↔ `.claude/rule-zero.conf` | identical |
| `template/.claude/rules/process.md` ↔ `.claude/rules/process.md` | identical |
| `template/.claude/settings.json` ↔ `.claude/settings.json` | identical |
| `template/.claude/skills/contribute/SKILL.md` ↔ `.claude/skills/contribute/SKILL.md` | identical |
| `template/.claude/skills/contribute/templates/blocked-issue.md` ↔ root copy | identical |
| `template/.claude/skills/contribute/templates/investigation.md` ↔ root copy | identical |
| `template/.claude/skills/contribute/templates/issue-comment.md` ↔ root copy | identical |
| `template/.claude/skills/contribute/templates/phase.md` ↔ root copy | identical |
| `template/.claude/skills/contribute/templates/plan.md` ↔ root copy | identical |
| `template/.claude/skills/contribute/templates/pr-body.md` ↔ root copy | identical |
| `template/.claude/skills/contribute/templates/review.md` ↔ root copy | identical |
| `template/docs/guides/agent-workflow.md` ↔ `docs/guides/agent-workflow.md` | identical |

Note on the drift gate: `CLAUDE.md:15-17` and `README.md:165` describe it as
`node dist/cli.js update . && git status --porcelain --untracked-files=all -- .claude/` — that
`git status` pathspec is **`.claude/` only**. `docs/guides/agent-workflow.md` is a managed file
that `update` rewrites but the gate's pathspec does not inspect. See Observations.

### F. Existing text that tells an agent how to write its messages

| Quote | file:line |
| --- | --- |
| `Your final message to the orchestrator is a short summary: Done or Blocked, the worktree branch,` / `and anything that needs a human. The detail lives in the status block, not in the message.` | `implementer.md:86-87` |
| `Your final message to the orchestrator is the **Answer** section and the file path. The detail` / `is in the file; do not repeat it in the message.` | `investigator.md:61-62` |
| `**Inline brief:** there is no plan file to write to … Put the same block, in full, in your final message instead; the orchestrator posts it to the PR.` | `implementer.md:66-68` |
| `If it gives you neither, stop and say so.` | `implementer.md:17` |
| `If a` / `   fact is wrong, say so plainly in your status block — never quietly absorb it.` | `implementer.md:24-25` |
| `Each writes `docs/reviews/<id>/investigation-<topic>.md` … and returns its Answer paragraph.` | `SKILL.md:59-60` |
| `Each investigator writes … and returns only its *Answer* paragraph.` | `agent-workflow.md:139-141` |
| `finishes the block as *Done* or *Blocked*; commits the phase file; returns a short summary and its worktree path.` | `agent-workflow.md:255-256` |
| `Implementers keep their status block current as they work (In progress → Done \| Blocked, with` / `deviations), commit to their `worktree-*` branch, never push, and return the worktree path.` | `SKILL.md:120-121` |
| `each returns its status block in its message` | `SKILL.md:199`; `agent-workflow.md:359` |
| `Report in the conversation: which way in (the owner's words, quoted — or "docs-only standing` / `rule, `docs-only.ts` at `<head>`"), method, SHA.` | `SKILL.md:230-231` |
| `Report in one paragraph in the conversation: merge method and SHA, deploy result, open` / `blocked-on-owner issues, each issue closed by the merge. No commit. The loop is over.` | `SKILL.md:244-245` |
| `The orchestrator reports in one paragraph in the conversation — merge method and SHA, deploy` / `result, open blocked-on-owner issues. No commit. The loop is over.` | `agent-workflow.md:422-423` |
| `The review is written by the orchestrator for the owner: plain English, high level, no` / `file:line in the prose — that lives in the investigation files, linked.` | `agent-workflow.md:159-160` |
| `**Short answer** — two to five sentences a non-engineer could follow.` | `agent-workflow.md:164` |
| `<Two to five sentences, plain English. What the orchestrator needs to know.>` | `investigator.md:47` |
| `4. Reply to each comment with what was done or the verified reason.` | `agent-workflow.md:360` |

Note the direction of every one of these: they cap message length and push detail into files.
Standards 1–4 add text to messages. That is the tension, not a contradiction.

### G. Tests as acceptance; every E2E / Playwright / screenshot / viewport mention

| Quote | file:line |
| --- | --- |
| `**Acceptance:** <checks that must be green; the tests that must exist; what must FAIL if the` / `change is reverted>` | `templates/phase.md:11-12` |
| `An item without a test in its acceptance is not done when the agent says it is.` | `agent-workflow.md:231-232` |
| `**Acceptance including tests** (what must FAIL if reverted).` | `SKILL.md:102` |
| `+ `phase-<n>.md` (items with files/approach/validation/acceptance+tests)` | `agent-workflow.md:459` |
| `<Full check, build, E2E for the touched surfaces, screenshots at which viewports, container` / `run if touched, checker-verified for each new test.>` | `templates/plan.md:34-35` |
| `- <full check with counts>; <E2E suites and results>; <new tests seen to fail against a` / `  pre-change build>; <screenshots appraised at which viewports>; <container run if touched>` | `templates/pr-body.md:13-14` |
| `- Known flake / not run: <say it>` | `templates/pr-body.md:15` |
| `- E2E: `<cmd>` (`<which suites cover which surfaces>`)` | `template/CLAUDE.md:9` |
| `- E2E: `node dist/cli.js init <tmp>/smoke` then `node dist/cli.js doctor <tmp>/smoke` …` | `CLAUDE.md:27-29` (root) |
| `- For UI: the real rendered app at each relevant viewport, screenshots, appraised by the` / `  orchestrator itself. Code-reading cannot validate layout.` | `agent-workflow.md:150-151` |
| `UI at each viewport, screenshots before and after, appraised by you.` | `agent-workflow.md:279` |
| `real rendered UI at each` / `viewport, screenshots appraised by you` | `SKILL.md:131-132` |
| `<What was run, counts, checkers verified, screenshots appraised, findings → phase <n>.5 items.>` | `templates/phase.md:25` |
| `…measured facts (versions, defaults, counts, rendered UI, live reads if the owner asked)…` | `investigator.md:3` (frontmatter description) |
| `**Verify the checker**: make your new test fail on purpose…` | `implementer.md:52-53` |
| `A convenient result — zero tests collected, an empty grep, an unchanged lockfile — is a claim.` | `implementer.md:54-55` |
| `**Distrust convenient results**: zero tests run, an empty grep, an unchanged lockfile.` | `agent-workflow.md:278` |
| Playwright / puppeteer / cypress / selenium / webdriver | **zero matches in any tracked file** |
| `browser`, `e2e` (lowercase), `end-to-end` | **zero matches in scope** |

## Observations

**1. Standards 1–4 have no mechanism, and the guide's first principle says that matters.**
`agent-workflow.md:12-15` opens with "where a rule can be a mechanism, it is one … The prose
explains; the files in `.claude/` enforce." The three wired hook events
(`template/.claude/settings.json:6-51`: `PreToolUse`, `SubagentStop`, `SessionStart`) all receive
tool payloads or session events; none receives the assistant's own text. Adding four
unenforceable prose rules to a kit whose stated design is "rules become mechanisms" is a visible
inconsistency a reviewer will raise. Appendix D (`agent-workflow.md:478-497`) is the table where
such a deviation would have to be argued.

**2. The kit's noun is "item", never "task".** `grep -rni task` over the full scope returns zero
matches; `item` appears 12× in `SKILL.md`, 10× in `implementer.md`, 14× in the guide, 4× in
`phase.md`. `I-<task number from plan>` would introduce a second word for one thing. The
mechanically consistent form is `I-<n.m>`, which matches the invocation (`SKILL.md:117`), the
status heading (`implementer.md:71`) and the hook's error text (`status-block.ts:54`).

**3. Standard 6 is not just an ownership collision — it is a phasing collision.** `SKILL.md:104-106`,
`agent-workflow.md:225-228` and `templates/plan.md:24-27` all instruct the orchestrator to put
items that touch a shared module in *different phases* or to seed the shared edit first,
"Parallel wherever merges will be clean." Standard 6 makes "move it into a shared space" the
default outcome of any implementer that spots a duplicate — i.e. it makes every parallel phase a
potential magnet-file conflict. Whatever wording lands, the phasing prose needs a companion
sentence or the parallelism the kit is built around degrades.

**4. Standard 7 contradicts this repo's own self-description and its measured reality.**
`README.md:138` advertises `src/cli.ts` as "the whole CLI: init, update, doctor. One file, no
runtime dependencies." Measured: `wc -l src/cli.ts` = **749 lines**. The payload's hooks are
79–345 lines each (`docs-only.ts` 304, `lib.ts` 345, `path-fence.ts` 79, `pr-watch.ts` 298,
`reload-plan.ts` 131, `rule-zero-selftest.ts` 305, `rule-zero.ts` 252, `status-block.ts` 118).
A "files short and concise" standard shipped in a managed file that this repo also runs on itself
means the kit will flag its own largest file. Either the standard needs a threshold-free wording
("short" as a judgement, not a number) or `README.md:138`/`CLAUDE.md` needs a recorded exception.

**5. Standard 9 would be the payload's first named third-party tool in a managed file.**
`agent-workflow.md:5-6` states the design: "Project-specific values are `<placeholders>`;
`.claude/rule-zero.conf` and the *Deploy* section of `CLAUDE.md` are the dials each project
turns." Consistent with that, the E2E command is a placeholder in the **owned** `template/CLAUDE.md:9`
(`- E2E: `<cmd>``), which `update` never rewrites (`src/cli.ts:483-486`). Putting "use Playwright"
into a managed file (`SKILL.md`, the guide, `implementer.md` or a template) pushes a tool choice
into files the kit overwrites on every `update` in every installed project — including projects
with no browser surface at all. Evidence that the kit currently avoids this: zero matches for
`playwright|puppeteer|cypress|selenium|webdriver` in any tracked file, and `README.md:14`
"Requires **Node ≥ 24** and nothing else."

**6. Standard 9's UI half sits against manual appraisal, not automation.** Three separate places
(`agent-workflow.md:150-151`, `:279`, `SKILL.md:131-132`) assign UI validation to the
orchestrator's own eye — "appraised by the orchestrator itself. Code-reading cannot validate
layout." A Playwright suite written by an implementer is a *checker*, and the kit's rule for
checkers is that they are claims until seen to fail (`agent-workflow.md:277-278`). The two can
coexist (Playwright can produce the screenshots the orchestrator appraises) but the prose must say
which, or the new standard reads as replacing appraisal with automation.

**7. Standard 9's first half is already law, in the wrong file for an implementer.** The strongest
existing sentence — `agent-workflow.md:231-232`, "An item without a test in its acceptance is not
done when the agent says it is" — lives in §5 (Plan), addressed to the orchestrator writing the
plan. `implementer.md` contains **no** sentence requiring the implementer to write a test; it only
tells it to verify a test it already has (`implementer.md:52-53`). That asymmetry is the actual
gap standard 9 fills.

**8. The drift gate's pathspec does not cover the guide.** `CLAUDE.md:15-17` and `README.md:165`
give the gate as `node dist/cli.js update . && git status --porcelain --untracked-files=all --
.claude/`. `docs/guides/agent-workflow.md` is a **managed** payload file (D above) that `update`
rewrites at the root, but the `git status` pathspec is `.claude/` only. Today the two copies are
byte-identical (E), so nothing is broken — but an edit to `template/docs/guides/agent-workflow.md`
without an `update` run would not be caught by the documented gate. Any contribution that edits
the guide should be verified with a wider pathspec.

**9. `investigator.md` is outside the nine standards but inside the same file family.** Standards
1–4 name the orchestrator and implementers only. `investigator.md` would then be the one agent
definition with no identity or narration rule, while carrying a near-identical "Your final message
… is the Answer section" line (`investigator.md:61-62`) to the implementer's
(`implementer.md:86-87`). Worth a decision either way rather than an accident.

**10. Four of the nine touch owned files if written into the wrong place.** If any standard is
written into `template/CLAUDE.md` or `template/mem/*.md`, it reaches new installs only and never
an existing one (`src/cli.ts:31-41`, `:483-486`; `README.md:39`, `:51-53`). Managed files —
`process.md`, `SKILL.md`, the templates, both agent definitions, the guide — are the only route to
already-installed projects.

## Not done / could not measure

- I did **not** run `node dist/cli.js update .` or any command that writes to the repo; the parity
  in section E is `diff -q` on the checked-out files, not a regenerated copy.
- I did **not** read the hook sources in full — only `status-block.ts:40-118` and greps of the
  others. Claims about `path-fence.ts`, `pr-watch.ts`, `docs-only.ts` and `rule-zero.ts`
  behaviour in this report are quotations of the guide/README describing them, not verification of
  the code.
- I did **not** examine `docs/history/**` (prior contributions' archived reviews and plans) for
  earlier discussion of any of these nine standards; the brief scoped me to the live prose.
- I did **not** check `.github/workflows/ci.yml` to confirm the drift-gate pathspec observation
  (#8) against what CI actually runs — observation 8 rests on `CLAUDE.md:15-17` and `README.md:165`
  only.
- I did **not** assess whether any of the nine standards is *good*; the brief asked for the map
  and the collisions, not a recommendation.
- No count of "how many lines each new standard would add" — that is plan work.

## Live reads taken

None. The brief said none were asked for, and none were taken.
