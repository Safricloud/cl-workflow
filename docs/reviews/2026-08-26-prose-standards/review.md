# Review — How the agents speak, and how implementers write code (2026-08-26-prose-standards)

**The ask:** Introduce prose standards into the process — the orchestrator prefixes its text with
"Orchestrator" and says in one line what it is about to do before each tool call; implementers
prefix theirs with "I-<task number from plan>", narrate the same way, write modular reusable code,
never implement the same function twice (generalize the existing one into a shared space), keep
files short with separation of concerns, write pure testable functions; every implementation
pairs with tests for its logic, and visual browser-based tests use Playwright — owner, in
conversation, 2026-08-26.
**Issue:** none · **Checkout:** `main` @ `8a8aada` · **Branch:** `feat/2026-08-26-prose-standards`
**Investigations:** `investigation-prose-map.md`, `investigation-mechanisms.md`,
`investigation-tests.md` (this directory); one documentation lookup on Claude Code hook payloads
(cited inline as a claim from the docs, not a measurement)

## Short answer

None of the nine standards is in the kit today: nothing tells any agent to name itself or to
narrate, nothing says a word about code structure, and "pair with tests" exists only as a rule
for the orchestrator writing the plan — not for the implementer writing the code. Writing them in
is straightforward, with three catches. First, "generalize into a shared space" collides head-on
with the rule the kit's parallelism is built on — an implementer owns exactly the files in its
item and stops if it needs another — so the prose has to say who does the generalizing. Second,
the kit's own code fails every one of the code standards it would ship (`src/cli.ts` is 579
effective lines with 86 functions and no direct test anywhere in the repo), and the guide's first
principle — where a rule can be a mechanism, it is one — means a reviewer will ask why these
are prose. Third, this PR can never be docs-only: the lock file hashes every managed file, so a
prose change is a code change to `docs-only.ts`. We recommend writing the standards into the
managed files now, adding the one cheap mechanism (the stop hook checks an implementer's
identity prefix), fixing a CI gap found on the way, and recording the kit's own conformance as
one follow-up contribution rather than folding a refactor into a process change.

## What we found

**1. Four standards are entirely new ground, four are new ground in code, one is half-said.**
Identity and narration (standards 1–4): zero matches for any related word across the whole
payload. Code structure (5–8): zero matches for modular, reuse, separation of concerns, pure,
duplicate. Tests (9): the plan side already says "an item without a test in its acceptance is not
done when the agent says it is" — but that sentence is addressed to the orchestrator writing the
plan; `implementer.md` never tells the implementer to write one, only to verify one it already
has. Playwright appears nowhere. ([investigation-prose-map.md](investigation-prose-map.md) §A, §G)

**2. "Move it into a shared space" contradicts the ownership fence and the phasing rule.** The
implementer definition says: you own exactly the files listed under **Files**; if the work needs
another file, stop and report Blocked. The plan is phased so that no two parallel items touch a
shared module. Standard 6 obliges an implementer that spots a duplicate to edit the shared file
and the original caller — at least two files that are, by construction, not in its list, because
the duplicate is found during the work, after the list was written. Applied as written, the
standard either breaks the fence or resolves in practice to "report Blocked". The prose has to
choose. ([investigation-prose-map.md](investigation-prose-map.md) §B1, observation 3)

**3. The kit's own code fails the standards it would ship.** `src/cli.ts` is 579 effective lines
(next largest file: 222), advertised in its own header and the README as "one file"; `cmdDoctor`
alone is 115 lines at cyclomatic complexity 41. Of 86 top-level functions across the CLI and the
hooks, exactly one is exercised by a test, and that one as a spawned subprocess — every hook
except `lib.ts` runs its `main()` at import, so nothing else can be imported to test. There is one
byte-identical cross-file duplicate (`isRecord` in the CLI and in `lib.ts`), one structural
duplicate worth generalizing (`parseOptions` in two hooks), and one same-name pair that must
*not* be merged (`git` in two hooks — different contracts, and merging them changes a fail-closed
hook). Shipping "never implement the same function twice" without saying which of those three
cases it means invites the wrong fix.
([investigation-mechanisms.md](investigation-mechanisms.md) §1, §3;
[investigation-tests.md](investigation-tests.md) §1–2)

**4. The identity prefix is already an orchestrator habit and nobody else's — and the owner
mostly never sees a sub-agent's text.** Measured on this session's transcripts: the orchestrator
prefixed 6 of 6 text blocks; the four sub-agents prefixed 0. Narration before a tool call ranged
from 16% to 78%. The Claude Code docs say a sub-agent's intermediate text is not shown to the
user by default — only its final message returns to the parent, and the full transcript is
reachable through `/tasks`. So for implementers the prefix earns its keep on the final message
(which the orchestrator reads and relays) and in the transcript files; the running commentary is
for whoever opens the transcript. ([investigation-mechanisms.md](investigation-mechanisms.md) §4;
docs: sub-agents page)

**5. Some of these can be mechanisms; the guide says that matters.** File and function size:
ESLint core ships `max-lines`, `max-lines-per-function`, `complexity` and three cousins, all
present in the installed 10.9.1 and none configured; at 300 effective lines exactly one file fails
(`src/cli.ts`); at 200, four. The identity prefix on an implementer's final message: the docs
say both `Stop` and `SubagentStop` payloads carry `last_assistant_message` (a documented claim —
no hook in this repo reads it yet, and the field is unmeasured here), and the `SubagentStop`
hook that already refuses to let an implementer finish without a status block is the natural
place for a second check. Duplicate detection and purity: no rule in the installed toolchain,
prose only. Tests for logic: `node:test` on Node 24 runs `.test.ts` files with type stripping,
discovers them by default, needs no package and passes the `node:`-only import rule — measured.
([investigation-mechanisms.md](investigation-mechanisms.md) §2, §4, §5;
[investigation-tests.md](investigation-tests.md) §3, §6; docs: hooks page)

**6. "Task number" has no referent; "item" does — and the review loop has neither.** The kit
never uses the word task; an implementer is dispatched as "item n.m" and writes its status under
"Status — item n.m". `I-<n.m>` is the form that matches everything already in place. During the PR
review loop implementers run from inline briefs with no plan and no item number at all, so a
second form is needed there or the orchestrator mints one in the brief.
([investigation-prose-map.md](investigation-prose-map.md) §B2–B3, observation 2)

**7. Naming Playwright would be the payload's first named third-party tool in a managed file,
and its browser download is invisible to rule zero.** Every tool choice in the kit today is a
placeholder in the owned `CLAUDE.md`; the managed prose names none. `@playwright/test` (1.62.1,
three packages, ≈18 MB before browsers, Node ≥ 20) can never be a dependency of the kit repo
itself — its import fails the `node:`-only lint rule, measured — so it can only be an instruction
the kit gives target projects. `npx playwright install` writes several hundred MB of browsers to
a per-user cache outside the repo, and `--with-deps` runs the system package manager under
`sudo`; the shipped `rule-zero.conf` is silent on both, measured against the real hook for the
orchestrator and for a sub-agent. ([investigation-tests.md](investigation-tests.md) §5, §6;
[investigation-prose-map.md](investigation-prose-map.md) observation 5)

**8. Three things found on the way.** (a) This PR cannot be docs-only: `.claude/cl-workflow.lock`
records a hash for every managed file, so any prose change to the payload changes the lock,
which `docs-only.ts` classifies as code — true of PR #4 as well, and of every future prose-only
contribution to the kit. (b) The CI drift gate re-runs `update` but inspects `.claude/` only;
`docs/guides/agent-workflow.md` is a managed file `update` rewrites at the root and the gate
would not notice it moving. (c) PR #4 (the small path) is open and edits the same three files —
the roles table of the guide, the top of `process.md`, the head and tail of `SKILL.md` — right
beside where these standards land; whichever merges second gets a conflict.
([investigation-prose-map.md](investigation-prose-map.md) §D, §E, observation 8; measured by
the orchestrator: `git diff -U0 origin/main...origin/chore/2026-08-26-small-path`, `ci.yml:44-49`,
`docs-only.ts:41-49`)

## What is right, and should not be changed

Implementers own only their files and the orchestrator merges — that is what makes phases
parallel and merges clean (`mem/outstanding.md`, settled 2026-08-25); the new prose must work
with the fence, not through it. The orchestrator edits documents only; every code change in this
contribution goes through an implementer. Zero runtime dependencies and `node:` builtins only —
Playwright stays outside the kit repo. The kit is permissive: no new prompt, no new `ask` rule.
The one-line dispatch and the "final message is a short summary; the detail lives in the status
block" shape stay — the identity prefix is added to that message, not a longer message. The
`git` helper pair in `docs-only.ts` and `status-block.ts` stays two functions: same name,
different contracts. The `isRecord` duplicate across the CLI and `lib.ts` is a build-boundary
(`dist/` must stand alone; the payload must stand alone) and is left as is, with the boundary
named in the prose.

## Directions we could take

### A — Prose only
Write the nine standards into the managed files — `process.md` (always loaded: who speaks how),
`SKILL.md` §6, the guide (roles, a short "how agents write" section, verify), `implementer.md`,
`investigator.md`, the phase template — resolving the ownership collision in words. No hook, no
lint rule, no CI change. Costs: an afternoon; the PR is still code (the lock) and needs your word
to merge. Forecloses nothing. Leaves the guide's own principle unmet for rules that could be
mechanisms, and leaves the kit's own code visibly out of step with what it ships.

### B — Prose, plus the one cheap mechanism and the gate fix *(recommended)*
A, and: the existing `SubagentStop` hook also refuses to let an implementer finish when its final
message does not begin with `I-` (reading `last_assistant_message`; fails open if the field is
absent, so a wrong assumption about the payload costs nothing); the CI drift gate's pathspec
widened to cover `docs/guides/`; the kit's own conformance — split `src/cli.ts`, size rules in
ESLint, `node:test` with import guards on the hooks, `parseOptions` generalized — recorded as one
follow-up contribution in the ledger, not started here. Costs: one hook and one CI line change,
a selftest case, `dist/` and the root copy regenerated; a day. Forecloses nothing.

### C — B, and bring the kit's own code into conformance now
B plus the refactor: `src/cli.ts` split by concern, `max-lines` / `max-lines-per-function` /
`complexity` at error in `eslint.config.mjs`, an `import.meta.main` guard in every hook so its
functions can be imported, a `node:test` suite with a minimum-count assertion (`node --test`
exits 0 on zero tests — measured), `parseOptions` moved into `lib.ts`. Costs: a code-heavy PR
across every hook and the CLI, a rerun of the 62-case selftest and `dist/`, days not hours, and
a process change buried inside a refactor that reviewers will read as one thing. Forecloses
nothing.

**Recommendation:** B. It delivers the ask, honours the guide's principle where the mechanism is
cheap and fail-open, and keeps the refactor — real work with its own risks to the gate code —
as its own loop with its own review.

## Decisions we need from you

1. **Direction:** A, B or C. **Recommend B.**
2. **The implementer's identity form.** The kit says "item", never "task"; the item number is
   `n.m`. Prefix as `I-<n.m>:` (e.g. `I-2.3:`). **Recommend `I-<n.m>:`.**
3. **Identity in the PR-review loop**, where there is no plan item: the orchestrator mints it in
   the inline brief as `I-r<cycle>.<k>` (`I-r2.1:` = review cycle 2, brief 1). **Recommend
   yes.**
4. **Investigators** are outside the ask but in the same file family. Give them the same rule —
   `Investigator-<topic>:` (e.g. `Investigator-mechanisms:`) and one-liners before tool calls?
   **Recommend yes.**
5. **The prefix mechanism** (B only): `status-block.ts` also refuses an implementer's stop when
   `last_assistant_message` does not begin with `I-`; fail-open when the field is absent; one
   selftest-style case. **Recommend yes.** A `Stop` hook for the orchestrator's own prefix is
   not proposed — it is at 100% today, and an exit-2 loop on the main agent is a worse failure
   than a missing prefix.
6. **Who generalizes a duplicate.** (a) The plan: before writing an item, the orchestrator greps
   for functions the item will need and puts the shared module in **Files** or seeds the
   generalization; an implementer that finds a duplicate outside its files reports **Blocked**
   naming the function, and the orchestrator writes a phase-n.5 item. (b) Implementers may edit
   the shared module and callers themselves, recorded as a deviation, accepting merge conflicts.
   **Recommend (a)** — it keeps parallel phases clean and makes the orchestrator's verify step
   (`git grep` for the function after each merge) the place duplicates are caught.
7. **"Short files" in numbers or in words.** The kit prose stays threshold-free ("one concern per
   file; a file you cannot summarize in a sentence is two files"); this repo's ESLint gets
   `max-lines` 300 / `max-lines-per-function` 80 / `complexity` 20 in the follow-up contribution
   that also splits `src/cli.ts` (the rules fail today on that file alone). **Recommend that
   split: words now, numbers with the refactor.**
8. **Tests for the kit's own code.** `implementer.md` gains the obligation now (standard 9). The
   kit's own 85 untested functions, the `import.meta.main` guards and a `node:test` suite go to
   the follow-up contribution. **Recommend follow-up** — or C if you want it now.
9. **Where Playwright is named.** (a) The managed prose: "browser-based visual tests are
   Playwright suites, run by the project's E2E command in `CLAUDE.md`, unless `CLAUDE.md` names
   another"; and (b) the owned `template/CLAUDE.md` E2E line names it as the default for new
   installs. **Recommend both.** The orchestrator's own appraisal of screenshots stays; the suite
   produces them.
10. **Playwright and rule zero.** `npx playwright install` writes browsers to a per-user cache
    outside the repo; `--with-deps` runs `sudo apt`. Options: (a) the prose says a browser
    download is asked for at the Questions phase like any other outside-the-repo write, conf
    unchanged; (b) add `guard` lines for `playwright install` to the template conf (owned —
    reaches new installs only) with a selftest case. **Recommend (a) now**; (b) is a one-line
    tune any project can make, and the conf is theirs.
11. **CI drift gate pathspec** widened from `.claude/` to `.claude/ docs/guides/` in this PR
    (one line in `ci.yml`; the PR is code anyway). **Recommend yes.**
12. **The lock makes every prose PR code.** Teach `docs-only.ts` to treat
    `.claude/cl-workflow.lock` as a record when every other changed file is documentation?
    That is the self-merge gate; a change to it deserves its own review. **Recommend a
    follow-up entry in the ledger, not this PR.**
13. **Merge order with PR #4.** (a) You merge #4 first; I rebase this branch on the result before
    the plan is dispatched. (b) This proceeds now and the second-merged PR resolves the conflict
    in the guide's roles table and `process.md`. **Recommend (a).**
14. **`parseOptions`** — the one duplicate worth generalizing — as this standard's first
    application in this PR, or with the follow-up? **Recommend the follow-up**, so this PR's code
    is the hook check and the CI line only.
15. **Merge:** this PR is code (`docs-only.ts` exit 3 on the lock); when the review loop is
    silent I report and stop, and merge only on your word with `--squash --admin`. If you want
    to give that word now — "merge when silent" — say so and I write the bundle grant at that
    point. **Recommend deciding now.**

## What this review did not do

Did not measure Claude Code's `SubagentStop` payload — `last_assistant_message`, `agent_id` at
that event — beyond the docs' claim and the ledger's proof that `agent_id`/`agent_type` arrive at
`PreToolUse`; the hook change in B is written fail-open for that reason and the first live
implementer under it is the measurement. Did not run a `Stop`-hook experiment. Did not install
or run Playwright, `jscpd` or `eslint-plugin-functional`; their figures are registry metadata and
knowledge, labelled as such. Did not read `docs/history/**` for earlier discussion of these
standards. Did not sample transcripts from any other project — the prefix and narration
percentages are one session's. Did not measure the ESLint size rules with the root `.claude/`
copy excluded (every hook finding is reported twice today; that doubling is a follow-up
concern). Did not touch GitHub beyond reads.

---
<!-- Appended at the Questions phase; the review is not rewritten above this line. -->
## Decisions (recorded 2026-08-26)

Three rounds with the question tool; each answer is the option label the owner selected, or the
owner's own words where they typed them.

1. Direction → **A — prose only** — "A — prose only" (the owner chose A over the recommended B;
   no hook change; decisions 5 and 11 below are re-read in that light)
2. Implementer identity → **`I-<n.m>:`** — "I-<n.m>:"
3. Identity in the PR-review loop → **`I-r<cycle>.<k>:`**, minted by the orchestrator in each
   inline brief — "Yes, I-r<cycle>.<k>:"
4. Investigators → **`Investigator-<topic>:`** and one-liners before tool calls — "Yes,
   Investigator-<topic>:"
5. Prefix mechanism in `status-block.ts` → **not in this PR** (follows from A; not asked
   separately)
6. Who generalizes a duplicate → **the investigation finds it, the plan locks it in** — owner's
   words: "Duplicate code needs to come from the investigation - the plan needs the direction
   already locked in." Read as: investigator briefs ask for the functions the change will need
   and any existing copies; the review and plan carry the generalization as items with the
   shared module in **Files**; the ownership fence is unchanged; an implementer that still
   meets a duplicate outside its files reports **Blocked** naming the function, and the
   orchestrator writes a phase-n.5 item.
7. Short files → **words now, numbers with the refactor** (follow-up, decision 8)
8. Follow-ups recorded in `mem/outstanding.md` as one future "kit conformance" contribution →
   **split `src/cli.ts` + ESLint size rules; `node:test` suite + import guards on the hooks;
   generalize `parseOptions` into `lib.ts`**. The fourth option — `docs-only.ts` treating the
   lock as a record — was **not** selected and is not recorded.
9. Where Playwright is named → **`template/CLAUDE.md` only** — "template/CLAUDE.md only". The
   managed prose stays tool-agnostic: browser-based visual tests are "the suite named by the
   E2E line in `CLAUDE.md`"; the owned skeleton names Playwright as the default.
10. Tools that write outside the repo (browser download, `--with-deps`, global installs) →
    **rule-zero prose left as is** — "No — leave rule zero prose as is"
11. CI drift-gate pathspec → first answer "N/A"; on clarification **"Include the one-line fix
    after all"** — `ci.yml`'s `git status` pathspec gains `docs/guides/`. This is the one code
    file in the PR; it goes through an implementer.
12. `docs-only.ts` and the lock → **not recorded** (see 8)
13. Merge order with PR #4 → **#4 merges first; this loop pauses at the plan until
    `origin/main` carries it, then rebases and dispatches** — "Merge #4 first; I rebase before
    dispatch"
14. `parseOptions` → **follow-up** (with 8)
15. Merge → **"Merge when silent — squash, --admin"**

**Rule-zero grants written:** none now. The merge bundle (`--bundle merge-cleanup <pr>
<branch>`) is written at §9 on the strength of decision 15, once the review loop is silent and
CI is green. The rebase onto `origin/main` after #4 merges is a plain rebase of an unpushed
branch — no work discarded, no grant needed.
