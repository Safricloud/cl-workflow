# Investigation — markdown (2026-08-26-prettier)

**Brief:** 62 of this repo's tracked files are Markdown — process prose in the payload
(`template/.claude/**/*.md`, `template/docs/guides/agent-workflow.md`, `template/CLAUDE.md`,
`template/mem/*.md`, templates with `<placeholders>`), this repo's own records (`docs/history/**`,
`mem/*.md`, `CLAUDE.md`, `README.md`) and the generated root copies. If Prettier formats them, what
changes, does any change alter meaning or break a shape a hook parses, and which `proseWrap` setting
(and which ignore entries) fit?

**Scope:** every tracked `*.md` except `docs/reviews/**` (this contribution's own in-flight
reports); plus `template/.claude/hooks/status-block.ts`, `template/.claude/hooks/reload-plan.ts`,
`template/.claude/hooks/docs-only.ts`, `src/cli.ts`, `docs/history/index.md`.

**Checkout:** `8a9690ed3f052ab03fe02c4cd8b1830e719950b8` (branch `chore/2026-08-26-prettier`)
**Prettier:** 3.9.6 (`pnpm dlx prettier@latest --version` → `3.9.6`); no `.prettierrc`,
`.prettierignore` or `.editorconfig` is tracked (`git ls-files | grep -iE 'prettier|editorconfig'`
→ empty), so every default applies.

## Answer

Use **`proseWrap: "preserve"`** with **`embeddedLanguageFormatting: "off"`**, and ignore nothing on
grounds of safety. `preserve` costs **3,731 changed lines across 56 of 62 files**, and it is
provably formatting-only: the parsed Markdown AST is byte-identical for **55 of 62 files**, and with
`embeddedLanguageFormatting: "off"` for **61 of 62** — the single remainder is Prettier joining a
line so that a leading `6.` cannot be re-read as an ordered list, which preserves meaning rather
than changing it. `proseWrap: "always" --print-width 100` costs **13,387 lines (3.6×)**, re-wraps
every paragraph in every archived record, folds the YAML `description:` scalar of all three agent
front matters, truncates what `reload-plan.ts` injects for `**Branch:**`/`**Owner go-ahead:**`, and
still does not deliver a 100-column repo — **1,341 lines remain over 100 characters** because
Prettier never wraps table rows; the widest line in the corpus is 675 characters under `always` too.
There is **exactly one true break**, and it is present under every setting: Prettier normalises
`*x*` to `_x_`, so the phase-template placeholder
`*(implementer keeps this current…)*` becomes `_(implementer…)_` and
`reload-plan.ts:93`'s `body.startsWith("*(implement")` stops matching — measured, a fresh phase file
flips from `PENDING` to `HAS-STATUS-BLOCK` for every item, so after a compaction the orchestrator is
told "Every item has a status block" when none has been written. Fix `reload-plan.ts:93` (or the
placeholder) in the same change. Everything else survives: all 13 hook-read shapes
(`#### Status — item n.m`, `### Item n.m — …`, `**Branch:**`, `**Files touched:**`, `**Done**`,
`**In progress**`, …) are intact in both modes at unchanged counts; `docs-only.ts` never reads
Markdown content (`.md` short-circuits on extension at `docs-only.ts:236`); and the `<placeholder>`
convention is **completely untouched** — 1,094 `<…>` tokens in, 1,094 out, and Prettier adds **zero**
escapes anywhere (total backslash count 640 → 640 → 640). The one ignore rule that is not optional is
**symmetry**: `template/.claude/**/*.md` and the generated root `.claude/**/*.md` must be formatted
or ignored *together*, or `node dist/cli.js update .` writes `*.md.new` files and the CLAUDE.md
generated-copy gate fails.

## Facts

### 1. Diff-line count per file, both settings

Measured with `diff <src> <formatted> | grep -cE '^[<>]'`, formatting done in-process through the
Prettier 3.9.6 API with `{parser:"markdown", proseWrap:"preserve"}` and
`{parser:"markdown", proseWrap:"always", printWidth:100}`. Working-tree files are LF on disk
(`.gitattributes` = `* text=auto eol=lf`; verified with `grep -qU $'\r'` on four files), so no count
is line-ending noise.

| File | Lines | `preserve` | `always`/100 |
| --- | --- | --- | --- |
| `.claude/agents/implementer.md` | 118 | 2 | 96 |
| `.claude/agents/investigator.md` | 76 | 21 | 66 |
| `.claude/rules/process.md` | 92 | 2 | 119 |
| `.claude/skills/contribute/SKILL.md` | 302 | 33 | 346 |
| `.claude/skills/contribute/templates/blocked-issue.md` | 7 | 1 | 10 |
| `.claude/skills/contribute/templates/investigation.md` | 23 | 17 | 21 |
| `.claude/skills/contribute/templates/issue-comment.md` | 4 | 0 | 7 |
| `.claude/skills/contribute/templates/phase.md` | 26 | 12 | 26 |
| `.claude/skills/contribute/templates/plan.md` | 39 | 10 | 34 |
| `.claude/skills/contribute/templates/pr-body.md` | 27 | 5 | 9 |
| `.claude/skills/contribute/templates/review.md` | 41 | 14 | 35 |
| `CLAUDE.md` | 64 | 5 | 84 |
| `README.md` | 237 | 42 | 223 |
| `docs/guides/agent-workflow.md` | 617 | 104 | 720 |
| `docs/history/2026-08-25-npx-ts-kit/investigation-hooks.md` | 306 | 418 | 560 |
| `docs/history/2026-08-25-npx-ts-kit/investigation-packaging.md` | 423 | 160 | 550 |
| `docs/history/2026-08-25-npx-ts-kit/investigation-structure.md` | 241 | 250 | 449 |
| `docs/history/2026-08-25-npx-ts-kit/phase-1.md` | 143 | 42 | 187 |
| `docs/history/2026-08-25-npx-ts-kit/phase-2.5.md` | 110 | 37 | 149 |
| `docs/history/2026-08-25-npx-ts-kit/phase-2.md` | 133 | 36 | 181 |
| `docs/history/2026-08-25-npx-ts-kit/phase-3.5.md` | 107 | 18 | 137 |
| `docs/history/2026-08-25-npx-ts-kit/phase-3.md` | 392 | 54 | 521 |
| `docs/history/2026-08-25-npx-ts-kit/phase-4.md` | 316 | 51 | 458 |
| `docs/history/2026-08-25-npx-ts-kit/plan.md` | 134 | 50 | 215 |
| `docs/history/2026-08-25-npx-ts-kit/review.md` | 150 | 29 | 190 |
| `docs/history/2026-08-25-static-analysis/investigation-callsites.md` | 328 | 282 | 399 |
| `docs/history/2026-08-25-static-analysis/investigation-coverage.md` | 171 | 108 | 265 |
| `docs/history/2026-08-25-static-analysis/investigation-eslint.md` | 259 | 148 | 290 |
| `docs/history/2026-08-25-static-analysis/phase-1.5.md` | 97 | 20 | 116 |
| `docs/history/2026-08-25-static-analysis/phase-1.md` | 199 | 51 | 272 |
| `docs/history/2026-08-25-static-analysis/phase-2.5.md` | 240 | 42 | 297 |
| `docs/history/2026-08-25-static-analysis/phase-2.md` | 288 | 63 | 422 |
| `docs/history/2026-08-25-static-analysis/phase-3.md` | 170 | 61 | 213 |
| `docs/history/2026-08-25-static-analysis/plan.md` | 166 | 72 | 261 |
| `docs/history/2026-08-25-static-analysis/review.md` | 207 | 11 | 249 |
| `docs/history/2026-08-26-prose-standards/investigation-mechanisms.md` | 426 | 268 | 471 |
| `docs/history/2026-08-26-prose-standards/investigation-prose-map.md` | 418 | 358 | 551 |
| `docs/history/2026-08-26-prose-standards/investigation-tests.md` | 489 | 345 | 521 |
| `docs/history/2026-08-26-prose-standards/phase-1.md` | 464 | 84 | 703 |
| `docs/history/2026-08-26-prose-standards/phase-2.md` | 143 | 31 | 200 |
| `docs/history/2026-08-26-prose-standards/phase-3.md` | 128 | 21 | 176 |
| `docs/history/2026-08-26-prose-standards/plan.md` | 197 | 92 | 326 |
| `docs/history/2026-08-26-prose-standards/review.md` | 281 | 9 | 364 |
| `docs/history/index.md` | 24 | **0** | 25 |
| `mem/index.md` | 4 | **0** | **0** |
| `mem/outstanding.md` | 186 | 20 | 289 |
| `template/.claude/agents/implementer.md` | 118 | 2 | 96 |
| `template/.claude/agents/investigator.md` | 76 | 21 | 66 |
| `template/.claude/rules/process.md` | 92 | 2 | 119 |
| `template/.claude/skills/contribute/SKILL.md` | 302 | 33 | 346 |
| `template/.claude/skills/contribute/templates/blocked-issue.md` | 7 | 1 | 10 |
| `template/.claude/skills/contribute/templates/investigation.md` | 23 | 17 | 21 |
| `template/.claude/skills/contribute/templates/issue-comment.md` | 4 | **0** | 7 |
| `template/.claude/skills/contribute/templates/phase.md` | 26 | 12 | 26 |
| `template/.claude/skills/contribute/templates/plan.md` | 39 | 10 | 34 |
| `template/.claude/skills/contribute/templates/pr-body.md` | 27 | 5 | 9 |
| `template/.claude/skills/contribute/templates/review.md` | 41 | 14 | 35 |
| `template/CLAUDE.md` | 26 | 5 | 23 |
| `template/docs/guides/agent-workflow.md` | 617 | 104 | 720 |
| `template/docs/history/index.md` | 4 | **0** | 5 |
| `template/mem/index.md` | 4 | **0** | **0** |
| `template/mem/outstanding.md` | 53 | 6 | 67 |

**Totals per family**

| Family | Files | `preserve` | `always`/100 |
| --- | --- | --- | --- |
| Payload `template/**` | 16 | 232 | 1,584 |
| Records `docs/history/**` | 30 | **3,211** | **9,718** |
| Records `mem/**` | 2 | 20 | 289 |
| Root generated `.claude/**` + `docs/guides/` | 12 | 221 | 1,489 |
| Root owned `CLAUDE.md` + `README.md` | 2 | 47 | 307 |
| **All** | **62** | **3,731** | **13,387** |

`docs/history/**` is **86% of the `preserve` churn** and 73% of the `always` churn.

Files already Prettier-clean under `preserve`: 6 of 62 (the zeros above). With
`embeddedLanguageFormatting: "off"`, 8 of 62 (`files changed=54/62`, measured).

### 2. Every kind of change under `preserve`, and whether it is more than bytes

Corpus-wide bucketing of the 3,731 changed lines (concatenated `diff` output, classified by a
script): **2,557 are table rows (69%)**, 1,174 everything else. Broken down:

| Kind | Count | Meaning? | Example |
| --- | --- | --- | --- |
| **Table column padding** — every cell padded to the widest cell in its column, and the `---` separator row padded to match | ~1,370 lines | Bytes only | `template/.claude/skills/contribute/SKILL.md:30-37` — `\| Thing \| Path \|` → `\| Thing                   \| Path …\|` |
| **Blank line inserted** after a heading, and between a paragraph and a following list | 336 | Bytes only (CommonMark treats both identically) | `template/CLAUDE.md:5` — blank line added after `## Commands`; `template/.claude/skills/contribute/templates/phase.md:6` after `### Item <n>.1 — <title>` |
| **Lazy-continuation indentation** normalised, both directions (`+2`, `+3`, `−2`, `−3`, `−4`, `−6`) | 189 | Bytes only (rendered identically; but it makes the *source* read differently) | `template/.claude/skills/contribute/templates/review.md:41` — `**Rule-zero grants written:** …` gains 3 spaces because it is a lazy continuation of list item `2.`; `docs/history/2026-08-25-static-analysis/phase-2.md:119` — a 6-space continuation inside a nested list goes to column 0 |
| **Emphasis `*x*` → `_x_`** | 113 | **Bytes only for rendering — but breaks one hook**, see §4 | `template/.claude/agents/investigator.md:32` `labelled *live read*` → `labelled _live read_`; `template/.claude/rules/process.md:22` `*Blocked on the owner*` → `_Blocked on the owner_` |
| **Embedded code blocks reformatted** (` ```markdown `, ` ```json `, ` ```yaml `) | ~95 | **Content change** — the block's text is rewritten. Removed by `embeddedLanguageFormatting: "off"` | `template/.claude/agents/implementer.md:100-101` — the ` ```markdown ` status-block sample gains blank lines; `docs/history/2026-08-25-npx-ts-kit/investigation-packaging.md` — a quoted `json` ruleset re-indented; `docs/history/2026-08-26-prose-standards/investigation-tests.md` — a quoted `yaml` CI fragment loses its 6-space indent |
| **YAML front matter reformatted** | 2 files ×2 copies | **Content change** to a machine-read block (YAML-equivalent). Removed by `embeddedLanguageFormatting: "off"` | `template/.claude/agents/investigator.md:13` — `args: ["${CLAUDE_PROJECT_DIR}/…", "docs/reviews"]` (85 chars) exploded into a 5-line block sequence because it exceeds `printWidth: 80` |
| **Paragraph line joined** to stop a leading `6.` re-parsing as an ordered list | 1 | Meaning-**preserving** (Prettier is protecting the AST) | `docs/history/2026-08-25-npx-ts-kit/review.md` — text node `"From the Questions round:\n6. CLI shape → "` → `"…round: 6. CLI shape → "` |
| List markers `*` → `-` | **0** | — | The corpus uses `-` throughout. Confirmed by probe: Prettier *does* convert (`"* one\n* two\n"` → `"- one\n- two\n"`), there is simply nothing to convert here |
| Escaped characters added (`\<`, `\_`, `\*`, `\#`, `\[`, `\|`, `\&`, `\-`, `\.`, `\$`, `\+`) | **0** | — | Fixed-string counts identical in source, `preserve` and `always`; **total backslashes 640 / 640 / 640** |
| Numbered-list renumbering | **0** | — | Probe: `1./1./1.` stays `1./1./1.`, `1./2./3.` stays `1./2./3.` |
| Code-fence info strings changed | **0** | — | No `lang`/`meta` value differs in any AST comparison |
| Headings rewritten (ATX↔setext, trailing `#`) | **0** | — | No `heading` node differs; probe confirms setext is left alone |
| Trailing whitespace stripped | **0** measured as its own bucket | — | No line in the corpus carries trailing whitespace that Prettier removed |
| Blank lines collapsed (3+ → 1) | **0** | — | No `blank line REMOVED` bucket outside the branch-switch artefact |

**The decisive measurement.** Parsing source and output with `prettier.__debug.parse(…, {parser:"markdown"})` and comparing the ASTs with all `position`/`start`/`end`/`loc`/`range`/`raw`
keys stripped:

| Options | Files changed | Churn lines | AST differs |
| --- | --- | --- | --- |
| `proseWrap: preserve`, `embeddedLanguageFormatting: auto` (default) | 56/62 | 3,721 | **7** — `.claude/agents/implementer.md`, `.claude/agents/investigator.md`, `docs/history/2026-08-25-npx-ts-kit/investigation-packaging.md`, `docs/history/2026-08-25-npx-ts-kit/review.md`, `docs/history/2026-08-26-prose-standards/investigation-tests.md`, and the two `template/` twins |
| `proseWrap: preserve`, `embeddedLanguageFormatting: off` | 54/62 | 3,613 | **1** — `docs/history/2026-08-25-npx-ts-kit/review.md` (the meaning-preserving join above) |
| `proseWrap: always`, `printWidth: 100` | 62/62 | — | **60** (text-node line breaks move in almost every paragraph) |

So under `preserve` + `embed: off`, **61 of 62 files are byte-different but structurally identical**.
Both settings are **idempotent 62/62** (re-formatting the output is a no-op), which a CI
`prettier --check` gate needs.

### 3. The `<placeholder>` convention: Prettier does nothing to it

| Fact | Value | Where measured |
| --- | --- | --- |
| `<…>` tokens in the corpus, source vs `preserve` | **1,094 → 1,094** | `grep -oE '<[a-z][^<>]*>'` over the concatenated corpus and over the concatenated output |
| Escapes introduced anywhere | **zero** (`\<` count 0/0/0; total backslashes 640/640/640) | `grep -oF` on concatenated corpus |
| `template/CLAUDE.md` — 5 changed lines, **all** blank-line insertions after `## Commands`, `## Conventions…`, `## Deploy`, after `Mode: …`, and after `## Process` | `<project name>` (heading), `<One paragraph: …>` (block start), `` `<cmd>` `` (inline code), `<the two or three that bite most>` (list item) — **all verbatim** | `diff -u template/CLAUDE.md <formatted>` |
| `template/mem/index.md` | **0 changed lines** — already Prettier-clean | table §1 |
| `template/.claude/skills/contribute/templates/phase.md` | `<n>`, `<id>`, `<title>`, `<sha>`, `<merged, verified phase n-1 \| branch head …>` all verbatim, including inside headings (`# Phase <n> — <n> implementers, parallel (<id>)`) | side-by-side `cat -n` of source and output |

Direct probes of the risky shapes (Prettier 3.9.6, `proseWrap: preserve`), all **UNCHANGED**:

| Input | Result |
| --- | --- |
| `"## H\n\n<cmd>\n\nnext paragraph.\n"` — a bare valid tag name alone on a line (CommonMark HTML-block condition 7) | UNCHANGED — parsed as an `html` node and passed through raw |
| `"# <cmd>\n\nbody\n"` — placeholder in a heading | UNCHANGED |
| `"Run \`<cmd>\` now, see <id> and <yyyy-mm-dd>.\n"` | UNCHANGED |
| `"<One paragraph: what this repo is.>\n"` | UNCHANGED |
| `"path <id>/investigation-<topic>.md here\n"` | UNCHANGED |
| `"<list; one clause per file>\n"` | UNCHANGED |

Mechanism: angle-bracket text is either raw-HTML passthrough (a valid tag name → an `html` node
Prettier reprints verbatim) or plain text (anything with a comma/semicolon/space-separated word that
is not a valid attribute → a `text` node). Prettier's Markdown printer escapes neither. No
placeholder in the corpus sits alone on a line as a bare `<tag>` anyway (`grep -nE
'^<[A-Za-z][A-Za-z0-9-]*>[[:space:]]*$'` over all 62 files → no matches), so even the passthrough
path is untaken.

### 4. Shapes the hooks parse

| Hook | Shape, verbatim | `file:line` |
| --- | --- | --- |
| `status-block.ts` | `` /\*\*Branch:\*\*\s*`([^`]+)`/ `` — the only Markdown shape it reads; everything else is `git diff --stat <base> -- docs/plans/` | `template/.claude/hooks/status-block.ts:50`, `:102` |
| `reload-plan.ts` | `` new RegExp("\\*\\*" + key + ":\\*\\*\\s*([^\\n]+)") `` for `key` ∈ `Source review`, `Branch`, `Owner go-ahead` | `:67-68` |
| `reload-plan.ts` | `/### Item (\d+\.\d+) — ([^\n]+)/g` | `:82` |
| `reload-plan.ts` | `` new RegExp("#### Status — item " + pyEscape(num) + "\\n(.*?)(?=\\n### \|\\n## \|$)", "s") ``, then `body = m?.[1]?.trim()` | `:88-92` |
| `reload-plan.ts` | **`body === "" \|\| body.startsWith("*(implement")`** → item counted as *pending* | **`:93`** |
| `reload-plan.ts` | `body.toLowerCase().startsWith("**in progress")` → *in progress* | `:95` |
| `reload-plan.ts` | `` new RegExp("\\n## Owner decisions" + "[^\\n]*\\n(.*?)(?=\\n## |$)", "s") `` | `:27`, `:72` |
| `docs-only.ts` | **none** — `isDocPath(target)` returns `true` on `extensionOf(target) ∈ {.md,.mdx,.rst,.txt,.adoc}` before any content is read; the file body is only ever consulted for *code* files, in `commentOnly()` | `:41`, `:110-118`, `:236` (`if (isDocPath(target))` precedes `:253` `commentOnly(...)`). Confirmed: `grep -nE 'readFile\|readFileSync\|readFileLines\|content\|body' template/.claude/hooks/docs-only.ts` → **no matches** |
| `src/cli.ts` | copy only — `readLf`/`writeLf` normalise CRLF→LF (`:114`, `:120`) and `hashText` hashes LF-normalised text (`:124`). No Markdown transformation of any kind. `.md` payload files are `managed` except the nine `OWNED` seeds (`:31-41`, `:155`) | `src/cli.ts` |

**Survival, measured across the whole corpus** (`grep -oF` counts of intact literals):

| Literal | Source | `preserve` | `always` |
| --- | --- | --- | --- |
| `**Branch:**` | 13 | 13 | 13 |
| `**Review:**` | 5 | 5 | 5 |
| `**Owner go-ahead:**` | 5 | 5 | 5 |
| `**Files:**` | 29 | 29 | 29 |
| `**Approach:**` | 27 | 27 | 27 |
| `**Acceptance:**` | 31 | 31 | 31 |
| `**Files touched:**` | 18 | 18 | 18 |
| `**Plan:**` | 16 | 16 | 16 |
| `**In progress**` | 4 | 4 | 4 |
| `**Done**` | 28 | 28 | 28 |
| `**Blocked**` | 29 | 29 | 29 |
| `#### Status — item` | 36 | 36 | 36 |
| `### Item ` | 29 | 29 | 29 |

Every hook-read label is intact in both modes. Running `reload-plan.ts`'s own item/status regexes
over `docs/history/2026-08-26-prose-standards/phase-1.md`:

```
real phase-1 SOURCE     items=6  1.1..1.6 = HAS-STATUS-BLOCK
real phase-1 PRESERVE   items=6  1.1..1.6 = HAS-STATUS-BLOCK
real phase-1 ALWAYS     items=6  1.1..1.6 = HAS-STATUS-BLOCK
```

and `status-block.ts`'s `BRANCH_RE` over three real `plan.md` files resolves the same branch in
`SOURCE`, `PRESERVE` and `ALWAYS` (`feat/2026-08-26-prose-standards`,
`chore/2026-08-25-static-analysis`, `feat/2026-08-25-npx-ts-kit`).

**The one break — `reload-plan.ts:93`.** The phase template's placeholder is
`template/.claude/skills/contribute/templates/phase.md:15` and `:20`:

```
*(implementer keeps this current as it works: In progress → Done | Blocked)*
```

Prettier (either `proseWrap`) emits:

```
_(implementer keeps this current as it works: In progress → Done | Blocked)_
```

so `body.startsWith("*(implement")` goes `true` → `false` (measured directly on both files). The
consequence on a **live** plan — the same template with `<n>.1`/`<n>.2` substituted for real item
numbers, formatted and re-probed:

```
live plan, UNFORMATTED   items=2  1.1=PENDING(placeholder/empty) 1.2=PENDING(placeholder/empty)
live plan, PRETTIER      items=2  1.1=HAS-STATUS-BLOCK          1.2=HAS-STATUS-BLOCK
```

After a compaction, `reload-plan` would inject "Every item has a status block" for a phase in which
no implementer has written one. Silent, and in the wrong direction. This is not fixable by any
Prettier option (`*`→`_` is core Markdown printing, not `emphasis`-configurable in 3.9.6); it needs
`reload-plan.ts:93` widened to accept `_(implement` as well as `*(implement`, or the template
placeholder changed to a shape both agree on.

**Also under `always` only:** the `#### Status — item n.m` block survives, but `reload-plan.ts:67-68`
truncates what it *reports*, because `[^\n]+` stops at the new wrap point —
`docs/history/2026-08-25-static-analysis/plan.md` goes from
`` "`chore/2026-08-25-static-analysis` off `main` (`f6…" `` to
`` "`chore/2026-08-25-static-analysis` off" ``, and `Owner go-ahead` from
`"2026-08-25 at the Questions phase — \"B — TS config…"` to `"2026-08-25 at the"`. Degraded context,
not a failure. And `always` puts a line break *inside* bold labels that no hook reads — e.g.
`template/.claude/skills/contribute/templates/phase.md:4` becomes
`**Magnet\nfiles this phase touches:**` in the AST.

### 5. `docs/history/index.md` — "one logical line, wrapped like the rest"

| Setting | Result |
| --- | --- |
| `preserve` | **Zero changed lines.** The file is already exactly what Prettier emits — the existing hand-wrap (2-space hanging indent under `- `, which is precisely the `- ` marker width) is Prettier's own output. |
| `always`/100 | 25 changed lines. Every entry is re-flowed to fill 100 columns, and the instruction line at `:3-4` is split into three lines, moving the template `` `<date> · <id> · <one-line outcome> · blocked: #n, #m \| none` `` onto a line of its own and pulling `(the PR number is never written…)` up beside it. |

Under `always` the "one logical line" convention still holds semantically (it is still one list
item), but the entry no longer reads as a hand-shaped record, and the header's own example of the
format is broken across a line boundary.

### 6. Tables — Prettier pads every row to the widest cell, regardless of `printWidth`

| Table | Widest row (chars) source | `preserve` | `always`/100 |
| --- | --- | --- | --- |
| `template/.claude/skills/contribute/SKILL.md` naming table (`:30-37`) | 105 | **115** | 115 |
| `docs/guides/agent-workflow.md`, all tables incl. Appendix D | 318 | **356** | 356 |
| `README.md` command table (`:36-…`) | 334 | 334 | 334 |
| Widest table row, whole corpus (`docs/history/2026-08-25-npx-ts-kit/investigation-structure.md`) | 564 | **675** | **675** |
| Widest line of any kind, whole corpus | 2,063 (`investigation-hooks.md`) | 2,063 | **675** |

Prettier does **not** fall back to a compact unaligned table when the row exceeds `printWidth` — it
pads unconditionally. Lines over 100 characters:

| | table rows | inside code fences | prose |
| --- | --- | --- | --- |
| source | 737 | 31 | 318 |
| `preserve` | **1,237** | 35 | 322 |
| `always`/100 | **1,237** | 35 | **69** |

So `always --print-width 100` buys a 78% reduction in over-wide *prose* lines (318 → 69; the 69 are
unbreakable single tokens — long inline-code spans and URLs) and costs 3.6× the churn, while leaving
1,341 lines over 100 columns. A 100-column repo is not achievable with these tables under either
setting.

One cosmetic artefact: Prettier counts `\|` as two columns when padding, so a row containing an
escaped pipe lands one character short of its neighbours — see `SKILL.md:32`
(`` | Branch | `feat/<id>` \| `fix/<id>` \| `chore/<id>` | ``), whose right border sits 2 columns
left of the rows around it. Rendering is unaffected.

### 7. Generated root copies vs their template sources

| Fact | Value | Where measured |
| --- | --- | --- |
| All 12 generated Markdown copies are byte-identical to their `template/` sources | 12/12 **IDENTICAL** | `for f in $(git ls-files 'template/.claude/**/*.md' 'template/docs/guides/*.md'); do cmp -s "$f" "${f#template/}" …` |
| Therefore their diff counts match pairwise | Yes — `implementer.md` 2/96 both, `investigator.md` 21/66 both, `rules/process.md` 2/119 both, `SKILL.md` 33/346 both, `blocked-issue` 1/10, `investigation` 17/21, `issue-comment` 0/7, `phase` 12/26, `plan` 10/34, `pr-body` 5/9, `review` 14/35, `agent-workflow.md` 104/720 both | table §1 |
| Not a generated pair | `docs/history/index.md` (24 lines, root, `OWNED` seed) vs `template/docs/history/index.md` (4 lines, the stub) — different files. Likewise `CLAUDE.md` (64 lines) vs `template/CLAUDE.md` (26 lines) | `src/cli.ts:31-41` `OWNED` |

**The constraint this creates.** `update` compares the root copy against the lock hash: if
`onDisk === source` it is current (`src/cli.ts:511-515`); if `onDisk` matches the recorded install
hash it is refreshed (`:520-526`); **otherwise it writes `<name>.new` and leaves yours alone**
(`:529-530`). So:

- Format `template/` **and** the root copies → identical inputs give identical outputs, `update` says
  "already current", the CLAUDE.md gate passes.
- Format `template/` **only** → `update` rewrites the root copies, producing a *tracked change*; the
  gate fails until it is committed (benign, but noisy).
- Format the root copies **only** (e.g. a `.prettierignore` that lists `template/`) → `update` sees
  "local edits" and writes `.claude/**/*.md.new` for all 12; the gate fails on exactly the `*.new`
  condition CLAUDE.md names.

Any `.prettierignore` must therefore treat `template/.claude/**` and `.claude/**`, and
`template/docs/guides/` and `docs/guides/`, symmetrically.

### 8. Families an owner might exclude, and what including them costs

| Family | Files | `preserve` cost | `always` cost | Case for excluding | Case against |
| --- | --- | --- | --- | --- | --- |
| `docs/history/**` (archived records) | 30 | **3,211 lines (86% of all churn)** | 9,718 | Already-shipped documents; the archive is the record of what was written. Reformatting rewrites the bytes of history and makes `git log -p` on an archived phase file noisy forever. It also holds all five embedded-code rewrites (a quoted `json` ruleset, a quoted `yaml` CI fragment) — verbatim evidence that formatting alters | Nothing is *read* from them by any hook (`docs/plans/` is what the hooks glob, not `docs/history/`), so excluding them is free of risk; excluding them also removes 86% of the diff and 5 of the 7 AST-level changes without needing `embeddedLanguageFormatting: off` |
| `mem/**` (live ledger) | 2 | 20 | 289 | `mem/index.md` is already clean (0); only `mem/outstanding.md` moves, by 20 lines | 20 lines is nothing; keeping it in costs almost nothing and keeps the rule simple |
| `template/.claude/skills/contribute/templates/**` | 7 | 59 | 142 | These are *shapes agents copy*. Blank-line insertion after `### Item` and the `*(implement…)*` → `_(implement…)_` change alter what an implementer is told to write; §4's break lives here | If `reload-plan.ts:93` is fixed, the remaining changes are blank lines and one 3-space indent, all improvements to a file agents copy |
| Payload `template/**` overall | 16 | 232 | 1,584 | — | Cheap; and formatting the payload is the point if the kit is to ship formatted prose |
| Root generated `.claude/**` + `docs/guides/` | 12 | 221 | 1,489 | — | Must move with `template/` (see §7); not independently excludable |
| Root owned `CLAUDE.md`, `README.md` | 2 | 47 | 307 | — | Cheap |

**Excluding `docs/history/**` alone** drops the total from 3,731 to **520 lines** under `preserve`
(and from 13,387 to 3,669 under `always`), and leaves 2 AST-level changes (the two
`implementer.md`/`investigator.md` pairs) which `embeddedLanguageFormatting: "off"` then removes
entirely — giving a **zero-AST-change, 520-line** formatting pass.

## Observations

- **`embeddedLanguageFormatting: "off"` is the highest-value option here and costs almost nothing.**
  It takes AST-level changes from 7 files to 1 while reducing churn by only 108 lines (3,721 →
  3,613). It is what stops Prettier from rewriting the ` ```markdown ` status-block sample that
  `template/.claude/agents/implementer.md:100` teaches implementers to reproduce, from re-indenting
  the quoted `yaml` CI fragment in `docs/history/2026-08-26-prose-standards/investigation-tests.md`,
  and from reformatting the three agent/skill YAML front matters. Verified across all four
  combinations: front matter is `CHANGED` with `auto` and `UNCHANGED` with `off` under both
  `proseWrap` values.
- **Adjacent pre-existing bug, unrelated to Prettier.** `reload-plan.ts:67` looks for a
  `**Source review:**` label, but the shipped plan template writes `**Review:**`
  (`template/.claude/skills/contribute/templates/plan.md:4`). Probed against three real archived
  `plan.md` files: `Source review = *** NO MATCH ***` in the **source** as well as in both formatted
  variants. The only occurrences of the string `Source review` in the repo are a 2026-08-25
  investigation table and a test fixture in `phase-3.md:110`. The hook has been silently dropping
  that line since it was ported.
- **Prettier reveals two latent authoring bugs rather than creating them.** (a)
  `template/.claude/skills/contribute/templates/review.md:41` — `**Rule-zero grants written:** …` is
  a lazy continuation of ordered-list item `2.`, which is almost certainly not what was meant;
  Prettier makes it visible by indenting it 3 spaces. (b) `docs/history/2026-08-25-npx-ts-kit/
  investigation-hooks.md` and its siblings contain table rows with **raw `|` inside inline code**
  and rows with **more cells than the header declares**; GFM already mangles these, and Prettier's
  re-padding makes the mangling obvious (a `re.compile(r"…(?:&&|\|\||;|\||\n)…")` cell explodes into
  five columns). Prettier is not changing the render; it is printing what the render already was.
- **The 2-space hanging indent this repo uses is already Prettier's own convention** for `- ` list
  items, which is why `docs/history/index.md` and `mem/index.md` come out with a zero-line diff. The
  189 indentation changes are all continuations of *ordered* items (where the correct indent is 3,
  not 2) or decorative over-indents inside nested items.
- **`always` at width 100 is the expensive option that does not deliver its promise.** It costs 3.6×
  the churn, rewrites every archived paragraph, and still leaves 1,341 lines over 100 characters
  because table rows and code fences are never wrapped. It would also mean every future prose edit
  re-flows a whole paragraph, making review diffs larger, not smaller. The repo's existing hand-wrap
  is already near-uniform at ~96 columns.
- **Both settings are idempotent 62/62**, so `prettier --check` is a stable CI gate.
- The corpus is dominated by tables: **1,292 table lines** out of ~10,600 total, and they account for
  69% of the `preserve` diff. Whatever else is decided, most of the diff an owner will look at is
  column padding.

## Not done / could not measure

- **I did not render any Markdown.** Claims that a change is "bytes only" rest on the parsed
  Prettier/remark AST being identical, not on comparing rendered HTML. For the 189 lazy-continuation
  re-indents specifically, the AST *is* identical, which is the strongest available evidence, but I
  did not run a CommonMark renderer over before/after.
- **I did not run the hooks end to end.** I extracted the exact regexes and predicates from
  `status-block.ts:50` and `reload-plan.ts:67-95` and executed them in Node against real and
  formatted files. I did not drive `reload-plan.ts` itself with a `SessionStart` payload, nor
  `status-block.ts` with a `SubagentStop` payload, and I did not run `pnpm selftest`.
- **I did not run `prettier --write`, and made no edit outside `docs/reviews/`.** All formatted
  output was written to the session scratchpad
  (`…/eb9bd0f5-961d-49f1-a4c7-58443f078d1e/scratchpad/out-{preserve,always}/`), which is outside the
  repo.
- **I did not evaluate `--print-width` values other than 80 (the `preserve` default) and 100.** In
  particular I did not measure `proseWrap: preserve` with an explicit `printWidth: 100`; note that
  `printWidth` still affects table padding and YAML front matter even under `preserve` — the 85-char
  `args:` line in `investigator.md:13` is broken at width 80 but not at 100.
- **I did not evaluate other Prettier options** that might matter (`tabWidth`, `useTabs`,
  `endOfLine`, or a plugin such as `prettier-plugin-packagejson`), nor Prettier's `overrides` for
  per-glob settings — an `overrides` entry could give `docs/history/**` different treatment without a
  `.prettierignore`, and I did not measure that shape.
- **I excluded `docs/reviews/**` from the corpus.** Those are this contribution's own in-flight
  investigation reports (three siblings' files were present); the brief's "62 tracked `.md` files"
  matches the corpus with them excluded.
- **Repo moved under me mid-run.** At roughly the midpoint the checkout switched to
  `chore/2026-08-26-remove-python-remnants`, committed `462ebd9` (touching `README.md` and
  `docs/history/index.md`), and returned to `chore/2026-08-26-prettier` at `8a9690e`. My first pass
  was contaminated by this; **every number in this report is from a full re-measurement taken after
  the checkout returned to `8a9690e`**, re-verified with `git rev-parse HEAD`. If `462ebd9` lands on
  `main`, the `README.md` (42/223) and `docs/history/index.md` (0/25) rows should be re-taken; no
  other row is affected.
- I did not check whether `docs/plans/` holds a live plan right now (it is the directory both hooks
  glob); the break in §4 is demonstrated on a synthetic file built from the shipped template.

## Live reads taken

None. No network call, no `gh` invocation, no call to any live service was made.
