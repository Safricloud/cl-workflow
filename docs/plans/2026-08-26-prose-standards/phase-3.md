# Phase 3 — 1 implementer, serial (2026-08-26-prose-standards)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 2 — the root
`.claude/agents/implementer.md` now carries the voice and code standards, so this implementer
runs under them. The orchestrator records, in the verification below, whether its final message
began `I-3.1:` and whether its transcript narrated before tool calls: the first live measurement
of the standard (baseline this morning: sub-agents 0% prefixed, 16–78% narrated).
**Magnet files this phase touches:** none — README is not in the payload.

### Item 3.1 — README: the gate line and how the agents speak
**Files:** `README.md`
**Approach:** (a) The "Full check" / CI description that quotes the drift-gate command gains
the widened pathspec (`-- .claude/ docs/guides/`) and its CI enumeration names the step as
`ci.yml` now names it. (b) Under the process description (where the README explains the loop
and the roles), one short paragraph — three or four sentences — saying that every agent names
itself at the start of each text block (`Orchestrator:`, `I-<n.m>:`, `Investigator-<topic>:`)
and says in one line what it is about to do before each tool call, and that implementers are
held to modular code, one concern per file, no duplicate functions (found at investigation,
locked in by the plan), pure functions where possible, and tests for every piece of logic;
browser-based visual tests use the suite the project's `CLAUDE.md` names — the shipped
skeleton says Playwright. Use the canonical terms from `plan.md`. Do not restate the whole
standard; point at `process.md`. (c) Nothing else — the file counts (23 managed, 9 owned) are
unchanged by this contribution; confirm with `git ls-files template/ | wc -l` = 33 and leave
them.
**Conventions that will fail your lint:** none for `.md`; ~95-column wrap, LF.
**Scoped validation:** `pnpm lint && pnpm typecheck`; `grep -n 'docs/guides/' README.md`; `grep -c 'Orchestrator:' README.md`
**Acceptance:** `grep -q -- '-- .claude/ docs/guides/' README.md && grep -q 'I-<n.m>:' README.md && grep -q 'Playwright' README.md` exits 0; on stash exits 1. `grep -c 'Managed (23 files)' README.md` prints 1 (unchanged).
#### Status — item 3.1
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<worktree branch, commits merged, conflicts, worktree removed.>

## Verification (orchestrator, after this phase merged)
<Full check; README re-read against `ci.yml` and `CLAUDE.md`; **live measurement**: the
implementer's final message prefix and its transcript's narration rate, with the transcript
path.>
