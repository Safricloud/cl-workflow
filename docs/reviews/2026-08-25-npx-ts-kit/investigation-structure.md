# Investigation — structure (2026-08-25-npx-ts-kit)

**Brief:** What is the complete managed-vs-owned file split for the update manifest, and which cross-file references break when the payload moves under `template/`?
**Scope:** whole repo (35 tracked files), excluding `.claude/hooks/__pycache__/` and `docs/reviews/2026-08-25-npx-ts-kit/`
**Checkout:** `dc189daaeee1cd5300713b92916a8c69664c49bb`

## Answer

**No cross-file reference in the payload breaks.** Every one of them is either target-project-relative (`.claude/…`, `docs/…`, `mem/…`, `CLAUDE.md`) or resolved at runtime from `${CLAUDE_PROJECT_DIR}`, so copying `template/X` → `<target>/X` reproduces the exact layout they already assume. The only references that must be rewritten are in `README.md`, which is kit-repo-facing and must never be copied into a target project. Of 35 tracked files: 30 are payload, 1 is the kit's README, and 4 are confirmed byte-identical duplicates to delete. The payload splits 20 managed / 9 owned / 1 merge-carefully (`settings.json`).

Three measured problems that the restructure must fix rather than carry across. (1) **`npm pack` silently drops `.gitignore` from the package** — `template/.claude/.gitignore` would never reach a target project, so grants, logs and worktrees would be committed into every install; it must ship under a different name and be renamed by `init`. (2) **`.claude/.gitignore` does not work today anyway** — every pattern contains a slash and so is anchored to `.claude/`, matching the non-existent `.claude/.claude/rule-zero.grants`; `git check-ignore` reports all four patterns as non-matching. (3) **A fresh clone on Windows rewrites every file to CRLF and changes every hash**, so a byte-hash manifest built from LF sources would flag 100% of files as locally modified on the first `update`.

## Facts

### 1. Full file inventory (35 tracked files)

**(a) Payload — copied into target projects by `init` (30 files)**

| Path (payload-relative) | Bytes | Class (Q2) | Evidence for the class |
| --- | --- | --- | --- |
| `.claude/settings.json` | 1120 | **merge-carefully** | Kit occupies only `worktree.baseRef` and 3 `hooks` entries (`settings.json:2-51`); `permissions`, `env`, `model` and other hook events are the project's |
| `.claude/rule-zero.conf` | 3185 | **owned** | `README.md:11` "the ONLY file you should need to tune"; `rule-zero.conf:49-52` "Project-specific — this is where the real protection for live credentials lives"; `agent-workflow.md:6` "the dials each project turns" |
| `.claude/.gitignore` | 84 | **managed** | Pure mechanism; but see Facts §4 and Observations B — must be renamed to survive `npm pack`, and its patterns are broken |
| `.claude/rules/process.md` | 3361 | **managed** | "always loaded" process rules; no placeholders, no project values |
| `.claude/agents/implementer.md` | 4711 | **managed** (1 tunable field) | `agent-workflow.md:44` "The invariant half of every sub-agent prompt"; but `README.md:80` tells the user to "pin the full model id in both agent files" |
| `.claude/agents/investigator.md` | 2681 | **managed** (1 tunable field) | same as above |
| `.claude/hooks/rule-zero.py` | 9604 | **managed** | Tuning surface is deliberately `rule-zero.conf`, a separate file (`rule-zero.conf:1`) |
| `.claude/hooks/rule-zero-selftest.py` | 11058 | **managed** | Self-contained; resolves its conf via `__file__` (`:19-21`) |
| `.claude/hooks/status-block.py` | 2872 | **managed** | No project values |
| `.claude/hooks/reload-plan.py` | 3399 | **managed** | No project values |
| `.claude/hooks/path-fence.py` | 1839 | **managed** | Allowed prefix passed as an argument from `investigator.md:13`, not baked in |
| `.claude/hooks/pr-watch.py` | 5615 | **managed** | Interval/quiet-window are CLI flags (`:3`) |
| `.claude/hooks/docs-only.py` | 5957 | **managed** | No project values |
| `.claude/skills/contribute/SKILL.md` | 14106 | **managed** | The loop itself |
| `.claude/skills/contribute/templates/blocked-issue.md` | 634 | **managed** | |
| `.claude/skills/contribute/templates/investigation.md` | 635 | **managed** | |
| `.claude/skills/contribute/templates/issue-comment.md` | 216 | **managed** | |
| `.claude/skills/contribute/templates/phase.md` | 1116 | **managed** | |
| `.claude/skills/contribute/templates/plan.md` | 1880 | **managed** | |
| `.claude/skills/contribute/templates/pr-body.md` | 1125 | **managed** | |
| `.claude/skills/contribute/templates/review.md` | 1819 | **managed** | |
| `docs/guides/agent-workflow.md` | 33321 | **managed** | `agent-workflow.md:5-6` names the dials as the conf and CLAUDE.md's Deploy section — i.e. *not* this file |
| `CLAUDE.md` | 1063 | **owned** (seed once) | Entirely `<placeholder>`s (`CLAUDE.md:1-18`); `README.md:28` "template: repo facts + commands"; `agent-workflow.md:6` names its Deploy section a project dial. SKILL.md §7 (`:172`) has the loop rewrite it every contribution |
| `docs/history/index.md` | 102 | **owned** (seed once) | Appended by every contribution at archive time (`SKILL.md:171`) |
| `mem/index.md` | 91 | **owned** (seed once) | `<area>` placeholder; the project's own index |
| `mem/outstanding.md` | 2983 | **owned** (seed once, with seed content) | The live ledger, written at `SKILL.md:83-85` and `:155`. See Facts §5 |
| `docs/history/.gitkeep` | 0 | **scaffolding** (create-if-missing) | Empty |
| `docs/plans/.gitkeep` | 0 | **scaffolding** | Empty |
| `docs/reports/.gitkeep` | 0 | **scaffolding** | Empty |
| `docs/reviews/.gitkeep` | 0 | **scaffolding** | Empty |

Totals: **20 managed · 9 owned (incl. 4 `.gitkeep` scaffolding) · 1 merge-carefully**.

**(b) Kit-repo-own documentation — must NOT land in target projects (1 file)**

| Path | Bytes | Note |
| --- | --- | --- |
| `README.md` | 7114 | Describes the kit and its install. Every path reference in it must be rewritten (Facts §3, class 3) |

**(c) Byte-duplicate root copies to delete (4 files) — byte-identity verified twice**

| Root copy | Canonical copy | sha256 (identical on disk) | git blob (identical in index) |
| --- | --- | --- | --- |
| `SKILL.md` | `.claude/skills/contribute/SKILL.md` | `d2e1965d627dca75…0027d1` | `0cd3a0a01113bf906d45ca10731ae7f609b65db7` |
| `agent-workflow.md` | `docs/guides/agent-workflow.md` | `ae2025d2d8153843…7bebf` | `5c149317deabb161058ada84e3b938f0680ee150` |
| `docs-only.py` | `.claude/hooks/docs-only.py` | `1cebc0834e278492…775610` | `cd70e47e199b9a0b31b6861065cbd0b33bddf252` |
| `pr-watch.py` | `.claude/hooks/pr-watch.py` | `b94baa3c933b2da9…0cb9d4` | `0046dcf4bc29f661fcace39592164934ea10360f` |

Measured with `sha256sum` on the working tree and `git ls-files -s` on the index; all four pairs match on both. Sizes also match exactly (14106, 33321, 5957, 5615). **Confirmed duplicates — safe to delete.**

**(d) Runtime data written in target projects — never shipped, must be gitignored**

| Path | Written by | Currently ignored? |
| --- | --- | --- |
| `.claude/rule-zero.grants` | `rule-zero.py:188`, `docs-only.py:122` | **NO** — `git check-ignore` returns no match |
| `.claude/rule-zero.log` | `rule-zero.py:68`, `docs-only.py:128` | **NO** |
| `.claude/worktrees/` | subagent `isolation: worktree` (`agent-workflow.md:252`) | **NO** |
| `.claude/pr-watch/` | `pr-watch.py:95` | **NO** |
| `.claude/hooks/__pycache__/` | CPython, on every hook run | **NO** — appears as `??` in `git status --short`; not listed in `.claude/.gitignore` at all |

`.claude/.gitignore` names the first four but matches none of them — see Observations B.

### 2. Managed vs owned — the evidence trail

| Question | Answer | Where measured |
| --- | --- | --- |
| Which files does the documentation tell the user to edit? | `.claude/rule-zero.conf` (the only one called out as such) | `README.md:11` "the ONLY file you should need to tune"; `README.md:101-103` (Ergonomics: add `allow`/`guard` lines); `rule-zero.conf:13-15`, `:49-57` |
| | `CLAUDE.md` — fill in the placeholders | `CLAUDE.md:1-18` is 100% placeholders; `README.md:28`; `agent-workflow.md:6`, `:411` |
| | Both agent files — pin the model id **if** `model: opus` is wrong | `README.md:80` |
| | `mem/*`, `docs/history/index.md` — written by the loop, not by hand | `SKILL.md:83-85`, `:155`, `:171-172` |
| Which files are declared invariant? | The two agent definitions | `agent-workflow.md:44` "The invariant half of every sub-agent prompt" |
| Is the guide project-specific? | No — it names the conf and `CLAUDE.md` Deploy as the only dials | `agent-workflow.md:5-6` |
| Is `settings.json` wholly the kit's? | No — the kit wires 3 hooks and one worktree key; 4 of the 7 hook scripts are *not* referenced from it | `settings.json:5-52` wires `rule-zero.py`, `status-block.py`, `reload-plan.py` only. `path-fence.py` is wired from `investigator.md:7-13`; `pr-watch.py`, `docs-only.py`, `rule-zero-selftest.py` are invoked from `SKILL.md:188`, `:207`, `README.md:36` |

### 3. Every cross-file path reference in the payload, and whether it survives the move

**Class 1 — payload → payload, target-project-relative. Survives unchanged (the payload is copied back to the same relative layout).**

| From | References | Lines |
| --- | --- | --- |
| `CLAUDE.md` | `.claude/skills/contribute/SKILL.md`, `.claude/rules/process.md`, `docs/guides/agent-workflow.md`, `mem/index.md`, `mem/outstanding.md` | `:21-24` |
| `.claude/rules/process.md` | `.claude/skills/contribute/SKILL.md`, `docs/guides/agent-workflow.md`, `.claude/hooks/rule-zero.py`, `docs/`, `mem/`, `docs/reviews/<id>/`, `CLAUDE.md` | `:7`, `:19`, `:29`, `:48-49` |
| `.claude/skills/contribute/SKILL.md` | `.claude/skills/contribute/templates/`; `templates/{review,plan,phase,blocked-issue,pr-body,issue-comment}.md`; `docs/guides/agent-workflow.md`; `docs/{reviews,plans,history}/<id>/`; `docs/history/index.md`; `mem/{index,outstanding}.md`; `.claude/hooks/{rule-zero,pr-watch,docs-only}.py`; `.claude/rule-zero.log`; `CLAUDE.md` | `:9-10`, `:25-28`, `:46`, `:52-53`, `:59-60`, `:65`, `:81`, `:83-84`, `:90`, `:94-96`, `:105`, `:117`, `:129`, `:151`, `:155`, `:164-176`, `:188`, `:207`, `:211`, `:222`, `:228`, `:235`, `:240` |
| `.claude/agents/implementer.md` | `docs/plans/<id>/{plan,phase-<n>}.md`, `docs/guides/agent-workflow.md`, `CLAUDE.md`, `mem/<area>.md`, `mem/index.md`, `docs/history/<id>/plan.md` | `:3`, `:12`, `:21-23`, `:26` |
| `.claude/agents/investigator.md` | `docs/reviews/<id>/investigation-<topic>.md`, `docs/reviews/` | `:3`, `:20-21`, `:25`, `:37` |
| `.claude/rule-zero.conf` | `.claude/hooks/rule-zero.py` (header comment) | `:1` |
| `docs/guides/agent-workflow.md` | the whole layout table + every `.claude/` and `docs/` path | `:6`, `:13-15`, `:33-46`, `:57-60`, `:72-73`, `:81-82`, `:86`, `:94`, `:120`, `:130-131`, `:140-141`, `:155`, `:161`, `:195-197`, `:204`, `:216-217`, `:224-226`, `:234`, `:248`, `:252`, `:257`, `:274`, `:300-303`, `:318-324`, `:329`, `:343`, `:367`, `:392-395`, `:407-418`, `:427`, `:451-473`, `:483-497` |
| `templates/plan.md` | `docs/reviews/<id>/review.md`, `CLAUDE.md`, `mem/outstanding.md` | `:4`, `:26`, `:31`, `:39` |
| `templates/pr-body.md` | `docs/history/<id>/{review,plan}.md`, `mem/outstanding.md` | `:8`, `:18-19` |
| `templates/blocked-issue.md` | `docs/history/<id>/plan.md`, `mem/outstanding.md` | `:7` |
| `templates/review.md` | `mem/outstanding.md`, `investigation-<topic>.md` | `:4`, `:16` |
| all 7 `hooks/*.py` docstrings | their own `.claude/hooks/<name>.py` path | `:3` in each |

**Verdict: all survive unchanged.** None of these are relative to the *kit repo* root; they are all relative to the *target project* root, which is exactly what `init` reconstructs.

**Class 2 — resolved at runtime from `${CLAUDE_PROJECT_DIR}` / `cwd`. Survives unchanged.**

| From | Reference | Lines |
| --- | --- | --- |
| `.claude/settings.json` | `${CLAUDE_PROJECT_DIR}/.claude/hooks/{rule-zero,status-block,reload-plan}.py` | `:14`, `:30`, `:45` |
| `.claude/agents/investigator.md` (frontmatter) | `${CLAUDE_PROJECT_DIR}/.claude/hooks/path-fence.py` + arg `docs/reviews` | `:13` |
| `rule-zero.py` | `CLAUDE_PROJECT_DIR or getcwd()` → `.claude/{rule-zero.conf,rule-zero.grants,rule-zero.log}` | `:65-68`, `:91`, `:187-188` |
| `docs-only.py` | `CLAUDE_PROJECT_DIR or getcwd()` → `.claude/{rule-zero.grants,rule-zero.log}` | `:121-128` |
| `pr-watch.py` | `CLAUDE_PROJECT_DIR or getcwd()` → `.claude/pr-watch` | `:94-95` |
| `reload-plan.py` | `CLAUDE_PROJECT_DIR or cwd` → `docs/plans/*/plan.md`, `.claude/rule-zero.grants` | `:31-32`, `:65` |
| `path-fence.py` | `cwd` / `CLAUDE_PROJECT_DIR` as the allowed roots | `:29-33` |
| `status-block.py` | `cwd` → `docs/plans/*/plan.md`, `git diff -- docs/plans/` | `:41-42`, `:65` |

**Verdict: survives.** `CLAUDE_PROJECT_DIR` is the target project root at runtime; nothing here is resolved against the kit repo.

**Class 3 — kit-repo-facing. MUST be rewritten (all in `README.md`, which must not be copied).**

| Line | Current text | Needs |
| --- | --- | --- |
| `README.md:8-29` | The layout tree, drawn as root `.claude/`, `docs/`, `mem/` | Redraw as `template/…` plus the new `src/` CLI |
| `README.md:33` | "Copy `.claude/` into the repo root." | Replace with `npx github:Safricloud/cl-workflow init` |
| `README.md:36` | `python3 .claude/hooks/rule-zero-selftest.py # must print 52/52 and exit 0` | Path is correct *for a target project*; the **count is wrong** — measured 57/57 (Facts §6). Belongs in `doctor` |
| `README.md:39-41` | "Put that line in CI" | Restate against the CLI |

**Class 4 — self-relative, works from any location.** `rule-zero-selftest.py:19-21` computes `HERE = dirname(abspath(__file__))` and `DEFAULT_CONF = HERE/../rule-zero.conf`, so it runs correctly from `template/.claude/hooks/` as well as from a target project. **Survives.**

**Class 5 — root-anchored prefixes in hook logic; affects only the kit repo's own self-hosted use after the move.** `docs-only.py:34` `DOC_DIRS = ("docs/", "mem/")` is matched with `path.startswith(...)` at `:66`, so `template/docs/…` and `template/mem/…` do **not** match by directory. Markdown under `template/` still classifies as docs via `DOC_EXT` (`:33`, `.md`), and `template/CLAUDE.md` via `SPECIAL_NAMES` (`:43`), so the common case is fine; but a non-markdown asset added under `template/docs/` (an image, a `.drawio`) would be classified as code in the kit repo's own PRs. **Does not break; worth a one-line note.**

### 4. Line endings

| Fact | Value | Where measured |
| --- | --- | --- |
| `core.autocrlf` on this machine | `true` | `git config --list --show-origin` → `file:C:/Program Files/Git/etc/gitconfig` |
| `.gitattributes` in the repo | **absent** | `ls -la .gitattributes` → No such file |
| Index line endings | LF for all 30 text files | `git ls-files --eol` → `i/lf` for every entry |
| Current working tree | LF (files were authored LF and never re-checked-out) | `git ls-files --eol` → `w/lf` for every entry |
| **Fresh `git clone` working tree** | **CRLF for every text file** | `git clone` into scratchpad → `git ls-files --eol` → `w/crlf` for all |
| Hash drift, LF source vs fresh clone | **100% — every sampled file differs** | `.claude/settings.json` `8914423f…` → `c400bf9f…`; `.claude/hooks/rule-zero.py` `d3ddfd93…` → `4540439a…`; `CLAUDE.md` `8286222d…` → `0ad84f13…`; `docs/guides/agent-workflow.md` `ae2025d2…` → `22b86bc2…` |
| Does CRLF break the hooks at runtime? | **No** | `rule-zero-selftest.py` run in the CRLF clone: `57/57 cases passed; 37 lines logged` — identical to the LF tree |
| Does `.gitattributes` with `* text=auto eol=lf` fix it? | **Yes** | Sandbox repo with that file, cloned under `core.autocrlf=true`: `git ls-files --eol` → `w/lf`; sha256 of both files identical to source |
| Does `npm pack` keep a `.gitattributes` in the payload? | **Yes** | `npm pack --dry-run` (npm 11.12.0, node v24.4.1) lists `template/.gitattributes` and `template/.claude/.gitattributes` |

**Implication for a hash-based manifest.** Line endings are a *manifest* problem, not a *runtime* problem — the gate still passes 57/57 from a CRLF checkout. But a manifest whose hashes are computed from LF sources would mismatch **every single file** the moment `init` runs from a Windows clone, so `update` would report the whole payload as locally modified and refuse to refresh anything. Two independent fixes, both wanted:

- **Kit repo: ship `.gitattributes` with `* text=auto eol=lf` — required.** `npx github:…` installs by cloning, so the consumer's `core.autocrlf` decides what bytes the CLI reads. Without this the kit's *own source of truth* varies per machine. Measured to work.
- **Template payload: ship a `.claude`-scoped `.gitattributes`, not a project-wide one.** A `template/.gitattributes` landing as the target's root `.gitattributes` would impose `eol=lf` on the whole host project and collide with an existing one. `template/.claude/.gitattributes` containing `* text=auto eol=lf` keeps the hooks and conf LF inside the target without touching the project's own files. It survives `npm pack` (measured).
- **Belt and braces: hash LF-normalised bytes, not raw bytes.** Strip `\r` before hashing in the manifest. This makes `update` correct even in a target project whose git rewrote the payload after `init`, which no `.gitattributes` the kit ships can fully prevent.

### 5. Seed content vs empty scaffolding

| Path | Verdict | Evidence |
| --- | --- | --- |
| `docs/plans/.gitkeep` | **Empty scaffolding** — 0 bytes | `wc -c` → 0 |
| `docs/reviews/.gitkeep` | **Empty scaffolding** — 0 bytes | `wc -c` → 0 |
| `docs/reports/.gitkeep` | **Empty scaffolding** — 0 bytes | `wc -c` → 0 |
| `docs/history/.gitkeep` | **Empty scaffolding** — 0 bytes | `wc -c` → 0 |
| `docs/history/index.md` | **Seed** — 102 bytes, a header + the one-line format spec | `docs/history/index.md:1-3` |
| `mem/index.md` | **Seed** — 91 bytes, header + `<area>` placeholder | `mem/index.md:1-4` |
| `mem/outstanding.md` | **Seed, but mixed** — 3 empty section headers plus **17 dated entries about the kit's own construction** | `mem/outstanding.md:3-9` are empty headers; `:10-16` are "Open — engineering follow-ups" (genuinely per-install: "Measure on this install…"); `:18-43` are 13 "Settled — do not re-open" entries, all dated 2026-08-25 and attributed "(owner)" |
| `docs/guides/agent-workflow.md` | **Seed (managed)** — the guide belongs in every target | Referenced as a target-project path by `CLAUDE.md:23`, `process.md:7`, `SKILL.md:10`, `implementer.md:21` |
| `README.md` | **Kit-only — must NOT land in target projects** | Describes the kit's own install; `README.md:33` "Copy `.claude/` into the repo root" is meaningless in a target |

`README.md:27` calls the ledger "seeded with what this build settled and what you still need to measure" — so the 2026-08-25 entries are deliberate seed content, not leakage. The `.gitkeep` files are the only pure scaffolding. Note that four `.gitkeep` files are functionally interchangeable (all 0 bytes) and are better generated by `init` (`mkdir -p` + touch) than tracked in the manifest, since `git` will not preserve an empty directory in a target project either.

### 6. The self-hosting wrinkle

| Fact | Value | Where measured |
| --- | --- | --- |
| Does the kit repo use the kit on itself? | Yes — `.claude/` at root, and this very investigation ran under it | `docs/reviews/2026-08-25-npx-ts-kit/` created by the loop |
| Windows directory symlink without admin | **Refused** | `cmd /c mklink /D linktest template\.claude` → "You do not have sufficient privilege to perform this operation." |
| `core.symlinks` in this repo | `false` | `git config --get core.symlinks` |
| Would `template/.claude/skills/` be discovered as a second `/contribute` skill? | Not measured — see *Not done* | — |
| Selftest count | **57/57**, not the 52 the README claims | `python .claude/hooks/rule-zero-selftest.py` → "57/57 cases passed; 37 lines logged"; `grep -c '^    ("' rule-zero-selftest.py` → 57 |
| `python3` on PATH here | **Broken** — resolves to the Microsoft Store app-execution alias | `which python3` → `…/WindowsApps/python3`; running it prints "Python was not found…". Real interpreter is `python` → 3.13.5, and `py` → 3.13.5 |

## Observations

**A. The move is unusually safe, and that is the main result.** I expected to find a handful of references that assume the payload sits at the repo root. There are none. Every path in every payload file is written relative to the *project being worked on*, which is precisely the invariant `init` preserves. The only file that reasons about the kit's own layout is `README.md`, and it is already excluded from the payload by the brief. This means the manifest can be a flat list of `template/`-relative paths with no rewriting step at all.

**B. `.claude/.gitignore` has never worked, and `npm pack` would delete it anyway.** Two independent defects on one 84-byte file.

*The pattern bug.* Git anchors any pattern containing a mid-string slash to the directory holding the `.gitignore`. All four patterns in `.claude/.gitignore` are written as `.claude/rule-zero.grants`, `.claude/rule-zero.log`, `.claude/worktrees/`, `.claude/pr-watch/` — so git looks for `.claude/.claude/rule-zero.grants`. Measured:

```
$ git check-ignore -v .claude/rule-zero.grants   → NOT IGNORED
$ git check-ignore -v .claude/rule-zero.log      → NOT IGNORED
$ git check-ignore -v .claude/worktrees/x        → NOT IGNORED
$ git check-ignore -v .claude/pr-watch/1.json    → NOT IGNORED
```

Rewriting them unanchored (`rule-zero.grants`, `rule-zero.log`, `worktrees/`, `pr-watch/`) fixes all four — verified in a sandbox repo, where `git check-ignore -v` then names the matching line for each. `__pycache__/` should be added; it is currently untracked-and-unignored, visible as `?? .claude/hooks/__pycache__/` in `git status`.

*The packaging bug.* `npm pack` strips files literally named `.gitignore` from the tarball. Measured with npm 11.12.0 / node v24.4.1 on a fixture with `"files": ["src", "template"]`:

```
template/.claude/hooks/rule-zero.py     ✓ included
template/.claude/settings.json          ✓ included
template/CLAUDE.md                      ✓ included
template/docs/plans/.gitkeep            ✓ included
template/.claude/.gitignore             ✗ ABSENT
```

Control run, same fixture: `.keepme` (a dotfile), `gitignore` and `dot-gitignore` (renamed copies), and `.gitattributes` were **all included**; only the literal `.gitignore` was dropped (`.npmrc` was dropped too). So the cause is the filename, not the dot. **The payload must store it under another name — `template/.claude/gitignore` — and `init`/`update` must write it out as `.claude/.gitignore`.** This is the single highest-consequence finding for `init`: without it, every target project commits its rule-zero grants and log into git.

**C. `settings.json` is the only true merge, and it is a small one.** The kit occupies exactly two top-level keys: `worktree.baseRef` and three entries under `hooks` (`PreToolUse` matcher `Bash|Edit|Write|MultiEdit|NotebookEdit|mcp__.*`, `SubagentStop` matcher `implementer`, `SessionStart` matcher `compact|resume`). Everything else in a Claude Code settings file — `permissions`, `env`, `model`, `statusLine`, other hook events — belongs to the project. A merge that replaces the kit's three hook entries by matcher and leaves all sibling keys alone is sufficient; a whole-file overwrite would destroy project permissions, and a whole-file skip would strand hook changes forever. Worth noting that **4 of the 7 hook scripts are not referenced from `settings.json` at all** — `path-fence.py` is wired from `investigator.md`'s frontmatter, and `pr-watch.py`, `docs-only.py`, `rule-zero-selftest.py` are invoked by hand from `SKILL.md`. A `doctor` that only validates `settings.json` would miss more than half the mechanism.

**D. The agent files are "managed with one hole".** `agent-workflow.md:44` declares them "the invariant half of every sub-agent prompt" — clearly managed. But `README.md:80` tells the owner to "pin the full model id in both agent files" if `model: opus` does not resolve. That is a one-field project tune living inside an otherwise-managed file, i.e. exactly the shape that makes overwrite-on-update lose the owner's work silently. Cleanest resolution: move the model choice out of the agent files (into `settings.json`, or a small `.claude/kit.json`), so the agent files become genuinely invariant and the manifest can overwrite them without a diff check.

**E. `CLAUDE.md` is owned, but the kit keeps wanting to write to it.** `CLAUDE.md` is 100% placeholders on delivery (owned), yet `SKILL.md:172` and `agent-workflow.md:320` instruct the loop to update it at every archive, and its final six lines (the `## Process` section, `:20-25`) are kit prose that will drift as the kit evolves. Marking the whole file "owned, never overwritten" means the Process pointer goes stale in every install that ever updates. Two workable shapes: (a) `init` writes it only if absent and `update` never touches it, accepting drift in that paragraph; or (b) split the kit-owned paragraph into `.claude/rules/process.md` (already managed and already says the same things at `:7`) and drop `## Process` from the `CLAUDE.md` template entirely, leaving `CLAUDE.md` purely project-owned. (b) removes the conflict rather than managing it.

**F. Self-hosting: run `init` on itself; do not symlink, do not hand-duplicate.** Symlinking is measurably unavailable — `mklink /D` refuses without admin on this machine and `core.symlinks=false` in this repo, so a checked-in symlink would materialise as a plain text file on Windows clones. Hand-duplication is worse: it is exactly how `SKILL.md`, `agent-workflow.md`, `docs-only.py` and `pr-watch.py` came to exist as byte-duplicates at the root, and the copies are byte-identical today only because nothing has been edited since the baseline commit. The remaining option is the honest one: **the kit repo keeps a working root `.claude/` and gets it by running its own `init`/`update`, with the manifest recording it like any other install.** That has three consequences worth stating: (1) the kit repo's root `.claude/` is generated, so contributions must edit `template/.claude/**` and re-run `update` — a `doctor` check that the root copy matches the template would catch the mistake; (2) the kit repo's own `mem/outstanding.md` and `docs/history/index.md` will accumulate real entries and must not be copied back into `template/mem/`, so those two are owned in the kit repo exactly as in any other install; (3) `template/.claude/skills/contribute/SKILL.md` sitting alongside a live `.claude/skills/contribute/SKILL.md` needs confirming as non-colliding for skill discovery — see *Not done*.

**G. Two documentation facts drifted from the code.** `README.md:36` claims the selftest "must print 52/52"; it has 57 cases and prints `57/57` (measured both by running it and by `grep -c` on the case list). And `README.md:33`'s only stated dependency, `python3` on PATH, is **broken on this very machine**: `python3` resolves to the Microsoft Store app-execution alias at `AppData/Local/Microsoft/WindowsApps/python3` and exits with "Python was not found", while the real interpreter is `python` (3.13.5). Every hook invocation in `settings.json` (`:12`, `:28`, `:43`) and every documented command in `SKILL.md` (`:81`, `:188`, `:207`, `:222`, `:228`) hardcodes `python3`. On this Windows install the gate would fail to start — and Claude Code treats a hook that cannot start as a *non-blocking* error, which `rule-zero-selftest.py:5-7` explicitly warns about. This is squarely a `doctor` responsibility: resolve and verify the interpreter rather than assuming `python3`.

## Not done / could not measure

- **Skill/agent discovery under `template/.claude/`.** I did not confirm that Claude Code ignores `template/.claude/skills/` and `template/.claude/agents/` when the project root is the kit repo. The mechanism strongly suggests it does — discovery is rooted at `<project>/.claude/`, which is what `${CLAUDE_PROJECT_DIR}/.claude/…` in `settings.json:14` encodes — but I did not run Claude Code against a restructured tree to see it. Worth one empirical check before committing to the layout, because a duplicate `/contribute` skill or a duplicate `implementer` agent would be a confusing failure.
- **`npx github:` end to end.** I measured `npm pack --dry-run` on a fixture, not an actual `npx github:Safricloud/cl-workflow` install. The git-dependency path packs through the same `files`/ignore machinery, so I expect the `.gitignore` strip to reproduce, but I did not observe it on the real flow.
- **Whether `worktree.baseRef: "head"` is honoured**, and whether a hook `deny` holds under `bypassPermissions` — both are open items in `mem/outstanding.md:10-14` and both are outside this brief.
- **No proposal for the manifest's file format** (JSON shape, version field, hash algorithm). The brief asked for the split and the reference audit; the schema is a plan decision.
- **I did not read `rule-zero.py`, `pr-watch.py`, `path-fence.py` or `status-block.py` in full** — I grepped each for path literals and read the regions that matched. A full read could surface a path assumption my grep pattern missed, though the pattern covered `.claude`, `docs/`, `mem/`, `CLAUDE.md`, `__file__`, `cwd` and `PROJECT_DIR`.
- **Nothing in the repo was modified.** The only write was this file.

## Live reads taken

None.
