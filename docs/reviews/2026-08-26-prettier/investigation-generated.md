# Investigation — generated (2026-08-26-prettier)

**Brief:** This repo has three generated surfaces guarded by CI drift gates: `dist/cli.js` (tsc
output, `git diff --exit-code dist/`), the root `.claude/` (written by `node dist/cli.js update .`
from `template/.claude/`), and the root `docs/guides/agent-workflow.md` (same). If Prettier is
adopted and run with `--write` over the repo before every PR, which of these files would it
reformat, which of them does the CLI produce byte-for-byte from a template source (so formatting
the source is enough) and which does the CLI *serialize itself* (so a formatter would fight
`update` and trip the drift gate)? What must the `.prettierignore` contain, and what must the
"format before the PR" step run afterwards (`pnpm build`? `node dist/cli.js update .`?) to leave
every gate green?

**Scope:** `src/cli.ts`, `template/**`, `.claude/**`, `docs/guides/agent-workflow.md`,
`dist/cli.js`, `.github/workflows/ci.yml`, `tsconfig.build.json`, `.claude/cl-workflow.lock`,
`.claude/.gitignore`

**Checkout:** `8a9690ed3f052ab03fe02c4cd8b1830e719950b8` (clean working tree)

**Prettier used for every measurement:** `pnpm dlx prettier@latest --version` → `3.9.6`. No
`--write` was ever run; every measurement is `--check` or `prettier <file> | diff <file> -`.

## Answer

`.prettierignore` must hold five things: `dist/` (tsc's emit — CI rebuilds it at `ci.yml:35` and
diffs at `:39`, so a formatted `dist/` can never survive), `pnpm-lock.yaml` (Prettier reports it
dirty and pnpm owns its serialization), `/.claude/worktrees/` and `/.claude/pr-watch/` (git-ignores
them via the *nested* `.claude/.gitignore`, which Prettier does **not** read from the repo root —
measured: `prettier --check .` from the root lists `.claude/pr-watch/2.json`, the same check with
`.claude/` as cwd does not; a live implementer worktree would be reformatted by a root
`--write`), and **both** copies of `settings.json`. The root `.claude/` and root
`docs/guides/agent-workflow.md` are byte-for-byte copies of their `template/` sources — every one
of the 24 managed payload files `cmp`s equal today — so the right policy is to ignore the generated
root copies (`/.claude/`, `/docs/guides/agent-workflow.md`), format `template/**` only, and let
`update` propagate; that makes drift impossible by construction and removes the one genuinely
dangerous asymmetry (template formatted + root not → `update` writes `.claude/**.new` untracked
files → gate red). The one file the CLI **serializes itself** is `.claude/settings.json`:
`mergeSettings` returns `JSON.stringify(merged, null, 2)` (`src/cli.ts:384`) with no trailing
newline, and `cmdUpdate` re-runs it on **every** update (`src/cli.ts:490`) — Prettier would collapse
its three `"args": [...]` arrays onto one line and add a final newline, and the very next `update`
would expand them again and strip it, so if that formatted root copy were committed the generated-copy
gate goes red. The post-format sequence that leaves every gate green, in this order:
`prettier --write .` → `pnpm build` → `node dist/cli.js update .` → commit `dist/`, `.claude/` and
`docs/guides/` → verify `git diff --exit-code -- dist/` and
`git status --porcelain --untracked-files=all -- .claude/ docs/guides/` are both empty. `update`
must be **last**, because it rewrites `.claude/cl-workflow.lock` unconditionally (`src/cli.ts:554`)
with hashes of the post-format text.

## Facts

### 1 — how the CLI enumerates and lands the payload

| Fact | Value | Where measured |
| --- | --- | --- |
| payload manifest is derived at run time, never a static list | `payload()` = `walk(templateDir, templateDir)` → `{src, rel, cls}`, sorted by `rel` | `src/cli.ts:159-165`, `walk` at `:133-141` |
| payload size | 33 files under `template/` | `find template -type f \| wc -l` → `33` |
| `gitignore` → `.gitignore` rename | `targetRel()` renames only a basename of exactly `gitignore` | `src/cli.ts:148-151`; landed as `.claude/.gitignore` (confirmed by `cmp`, table §4) |
| verbatim copy path (managed, missing) | `writeLf(dest, readLf(src))` — LF-normalised text copy, no re-serialization | `src/cli.ts:503-509` (`update`), `:423-429` (`init`) |
| verbatim copy path (managed, present but stale) | `writeLf(dest, source)` only when `hashText(onDisk) === previous.files[rel]` | `src/cli.ts:520-527` |
| managed + locally edited | writes `<rel>.new` beside it, original untouched → **untracked file, gate red** | `src/cli.ts:529-531` |
| no `copyFileSync` anywhere | 0 matches; every write is `writeLf` | `grep -n "copyFileSync" src/cli.ts` → no output |
| serialization site 1 — the lock | `writeLf(abs(targetDir, ".claude/cl-workflow.lock"), JSON.stringify(body, null, 2) + "\n")` | `src/cli.ts:285` |
| serialization site 2 — settings | `return JSON.stringify(merged, null, 2)` — **no trailing newline**, by design | `src/cli.ts:384`, comment at `:383` |
| which root files those two write | `:285` → `.claude/cl-workflow.lock` only; `:384` → `.claude/settings.json` only | `LOCK_REL` `src/cli.ts:46`, `MERGED` `src/cli.ts:44` |
| when `:285` runs | every `init` (`:446`) **and** every `update` (`:554`), unconditionally — not guarded | `src/cli.ts:446-451`, `:554-559` |
| when `:384` runs | every `init` (`:406`) and every `update` (`:490`), unconditionally; the **write** is conditional on `before !== result` | `src/cli.ts:404-420`, `:488-500` |

**`.claude/settings.json` today is a byte copy of the template — but only by coincidence of
authorship.** `cmp template/.claude/settings.json .claude/settings.json` → identical (table §4).
Both end `}` with **no trailing newline** (`cat` shows `}[EOF]`). The template is hand-written in
exactly `JSON.stringify(_, null, 2)`'s shape so that `init` reproduces it byte for byte — the
comment at `src/cli.ts:383` says so explicitly. It is not a copy in the code; nothing in `cmdInit`
or `cmdUpdate` ever writes the template text of `settings.json` to disk.

**What `update` does if Prettier reformats the template's copy.** Measured Prettier diff on
`template/.claude/settings.json` (`pnpm dlx prettier@latest template/.claude/settings.json | diff
template/.claude/settings.json -`):

```
13,15c13
<             "args": [
<               "${CLAUDE_PROJECT_DIR}/.claude/hooks/rule-zero.ts"
<             ],
---
>             "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/rule-zero.ts"],
...  (same for status-block.ts and reload-plan.ts)
53c47
< }
\ No newline at end of file
---
> }
```

Traced through `src/cli.ts:488-500`:

- **Template formatted, root ignored.** `source` = collapsed+`\n`; `before` = root, expanded, no
  newline; `result = mergeSettings(source, before, stems)` — `JSON.parse` discards all formatting,
  `JSON.stringify(_, null, 2)` always expands arrays and emits no trailing newline → `result ===
  before` → `  ok     .claude/settings.json (kit keys already current)`, **no write**, lock hash
  unchanged (`recorded[rel] = hashText(result)`, `:491`). **Gate green.** But `template` and root
  now differ by 7 bytes-worth of layout and the `:383` invariant is dead.
- **Root formatted (with or without the template).** `before` = collapsed+`\n`; `result` = expanded,
  no newline → `before !== result` → `writeLf(dest, result)` at `:496` reverts the root file →
  ` M .claude/settings.json` in `git status` → **generated-copy gate red** (`ci.yml:48-53`).

Live measurement of the current state: `node dist/cli.js doctor .` →

```
cl-workflow 0.6.0 — doctor on C:\Users\Keaton Forrest\Documents\GitHub\cl-workflow
  ok     node v24.4.1 (>= 24)
  ok     .claude/cl-workflow.lock — kit 0.6.0, 32 files, sha256-lf
  ok     .claude/settings.json — 3 kit hook command(s), every script present
  ok     .claude/hooks/package.json — {"type":"module"}
  ok     7 hook scripts present
  ok     self-test 62/62
doctor: 6 passed, 0 failed
```

`doctor` step 6 (`src/cli.ts:680-690`) prints a `warn ... managed file(s) locally edited` line when
any managed root file's hash differs from the lock. **It printed none** — so all 24 managed root
files match the lock exactly today, which is the precondition for `update`'s clean-rewrite branch
at `:520-527`. `git status --porcelain --untracked-files=all -- .claude/ docs/guides/` after
`doctor` → empty.

### 2 — owned vs managed vs merged

| Class | Members | Where |
| --- | --- | --- |
| owned (9) | `.claude/rule-zero.conf`, `CLAUDE.md`, `docs/history/.gitkeep`, `docs/history/index.md`, `docs/plans/.gitkeep`, `docs/reports/.gitkeep`, `docs/reviews/.gitkeep`, `mem/index.md`, `mem/outstanding.md` | `OWNED`, `src/cli.ts:31-41` |
| merged (1) | `.claude/settings.json` | `MERGED`, `src/cli.ts:44` |
| managed (23) | everything else under `template/` | `classify()`, `src/cli.ts:153-156` |

`update` on an owned file: `if (file.cls === "owned") { owned++; continue; }` — `src/cli.ts:483-486`.
It `continue`s **before** the `recorded[file.rel] = …` assignments, and `recorded` is seeded from the
previous lock at `:466`, so an owned file's lock hash is frozen at install time and is never
refreshed. **Consequence, confirmed from the code: reformatting the root `CLAUDE.md`, `mem/*.md`,
`docs/history/index.md` changes nothing in `update`'s output and nothing in the lock.** Those three
root paths already differ from their template sources today (they are this repo's own content):

```
DIFFER   CLAUDE.md           (template=1232 root=4611)
DIFFER   docs/history/index.md (template=246  root=1674)
DIFFER   mem/outstanding.md  (template=3911  root=15610)
```

They are also outside the gate's pathspec (`-- .claude/ docs/guides/`, `ci.yml:52`). Safe to format.

Reformatting the **template's** owned files (`template/CLAUDE.md`, `template/mem/outstanding.md`) is
likewise invisible to the root and to the lock, for the same reason.

### 3 — the lock file

| Fact | Value | Where |
| --- | --- | --- |
| what is hashed | `createHash("sha256").update(text.replace(/\r\n/g,"\n"), "utf8")` — CRLF-normalised **text**, algo label `sha256-lf` | `hashText`, `src/cli.ts:123-125`; `HASH_ALGO` `:47` |
| what text, per class | managed → the **template source** text (`:513`, `:523`, `:506`); merged → the **serialized merge result**, not the template (`:491`); owned → never re-hashed (`:483`) |  |
| lock contents | `kitVersion`, `hashAlgo`, `files` (sorted), `hooksManifest` | `writeLock`, `src/cli.ts:273-286` |
| rewritten every run? | **yes, unconditionally** — `writeLock(...)` is a straight-line call at the end of both `cmdInit` and `cmdUpdate`, with no "changed?" guard | `src/cli.ts:446-451`, `:554-559` |
| entries today | 32 files (payload is 33; `mem/outstanding.md` is absent — the never-clobber branch at `:441` deliberately omits it) | `doctor` output above; `for f in …; grep -q "\"$d\":" .claude/cl-workflow.lock` → only `mem/outstanding.md` missing |
| lock is tracked and inside the gate pathspec | `git ls-files .claude/` lists `.claude/cl-workflow.lock` | `git ls-files .claude/` |

**Order.** Because `writeLock` runs on every `update` and re-hashes the *current* template text,
the committed lock must be the post-format one. So: **format first, `update` last.** If `update`
ran before the format step, the lock and the root copies would carry pre-format hashes/text, and
CI's own `node dist/cli.js update .` (`ci.yml:51`) would rewrite 24 managed files plus the lock →
`git status` non-empty → red.

### 4 — `cmp` of every root copy against its template source (today)

Command (bash, repo root; `gitignore` → `.gitignore` applied):

```
for f in $(find template -type f | sed 's|^template/||' | sort); do ... cmp -s "template/$f" "$dst" ...; done
```

| Root path | Result | Why |
| --- | --- | --- |
| `.claude/.gitattributes` | same | managed |
| `.claude/.gitignore` | same | managed (renamed from `template/.claude/gitignore`) |
| `.claude/agents/implementer.md`, `.claude/agents/investigator.md` | same | managed |
| `.claude/hooks/*.ts` (7 hooks + `lib.ts`) | same | managed |
| `.claude/hooks/package.json` | same | managed |
| `.claude/rule-zero.conf` | same | **owned** — identical only because nobody has edited it |
| `.claude/rules/process.md` | same | managed |
| `.claude/settings.json` | same | **merged/serialized** — identical by authorship, not by copy |
| `.claude/skills/contribute/SKILL.md` + all 7 `templates/*.md` | same | managed |
| `docs/guides/agent-workflow.md` | same | managed |
| `docs/{history,plans,reports,reviews}/.gitkeep` | same | owned, empty |
| `mem/index.md` | same | owned, untouched so far |
| `CLAUDE.md` | **DIFFER** | owned, this repo's own |
| `docs/history/index.md` | **DIFFER** | owned, this repo's own |
| `mem/outstanding.md` | **DIFFER** | owned, this repo's own (and absent from the lock) |

Every managed file — the whole gated surface — is byte-identical to its template source. There is
no managed root file that the CLI transforms.

### 5 — `dist/cli.js` and the tsc-emit question

| Fact | Value | Where |
| --- | --- | --- |
| Prettier would rewrite `dist/cli.js` | yes | `pnpm dlx prettier@latest --check dist/cli.js` → `[warn] dist/cli.js` / `Code style issues found in the above file.` |
| CI builds then diffs | `- run: pnpm build` at `ci.yml:35`, `git diff --exit-code -- dist/` at `ci.yml:39` — the diff runs **after** the build, on the same checkout | `.github/workflows/ci.yml:35-39` |
| build config | `tsc -p tsconfig.build.json`, `outDir: dist`, `rootDir: src`, `rewriteRelativeImportExtensions: true`, no declaration, no sourcemap | `package.json` `scripts.build`; `tsconfig.build.json` |
| Prettier would rewrite `src/cli.ts` | yes — **223 changed diff lines** out of 749 | `pnpm dlx prettier@latest src/cli.ts \| diff src/cli.ts - \| grep -c '^[<>]'` → `223` |

**Does reformatting `src/cli.ts` change the emit?** Not directly measurable here (I may not write a
scratch `.ts` or run a build), but the committed pair gives strong evidence that tsc's printer
consults original source line breaks for some constructs and re-prints others:

- **Preserved.** `src/cli.ts:189-192` (`const candidates = [` … two `path.join` entries … `];`)
  emits at `dist/cli.js:139-142` with exactly the same three-line array shape.
- **Preserved.** The `+`-continued string chain at `src/cli.ts:560-562` emits at `dist/cli.js:506-507`
  keeping the author's break between the two template literals; likewise `FAILS_OPEN`
  (`src/cli.ts:54-57` → `dist/cli.js:48-50`).
- **Re-printed.** The multi-line call `fail(state, …, "run \`cl-workflow init\` here first")` at
  `src/cli.ts:601-605` collapses to one line at `dist/cli.js:539`; `src/cli.ts:54`'s break after
  `const FAILS_OPEN =` is removed.

So a Prettier pass that re-wraps any array literal or `+` chain in `src/cli.ts` — and at 223 changed
lines it certainly will — is expected to change `dist/cli.js`.
**Unmeasured — the implementer must run `pnpm build` and commit the regenerated `dist/cli.js`.**
That commit is exactly what makes `git diff --exit-code -- dist/` green, since CI rebuilds first
(`ci.yml:35`) and diffs second (`ci.yml:39`).

### 6 — untracked / ignored content under the root `.claude/`

`git status --porcelain --ignored --untracked-files=all -- .claude/`:

```
!! .claude/hooks/__pycache__/rule-zero-selftest.cpython-313.pyc
!! .claude/pr-watch/2.json
!! .claude/pr-watch/3.json
!! .claude/pr-watch/4.json
!! .claude/pr-watch/5.json
!! .claude/rule-zero.grants
!! .claude/rule-zero.log
```

`ls -a .claude/worktrees` → `.` and `..` only (empty right now). `git check-ignore -v`:

```
.claude/.gitignore:3:worktrees/     .claude/worktrees
.claude/.gitignore:2:rule-zero.log  .claude/rule-zero.log
.claude/.gitignore:1:rule-zero.grants .claude/rule-zero.grants
.claude/.gitignore:4:pr-watch/      .claude/pr-watch/2.json
.claude/.gitignore:5:__pycache__/   .claude/hooks/__pycache__
```

**Prettier does not honour the nested `.claude/.gitignore` from the repo root.** Measured both ways:

- `pnpm dlx prettier@latest --check .claude/` from the repo root → 24 dirty files, **including**
  `.claude/pr-watch/2.json`, `3.json`, `4.json`, `5.json`.
- the same check with `.claude/` as cwd → 20 dirty files, `pr-watch/*.json` **gone** (the only
  remaining `pr-watch` hit is `hooks/pr-watch.ts`).

Prettier 3 reads `./.gitignore` and `./.prettierignore` relative to the cwd only; it does not walk
nested `.gitignore` files. Therefore `prettier --write .` from the repo root **would** descend into
`.claude/worktrees/` and reformat a live implementer's checkout — an edit outside that item's files,
made from the orchestrator's session. `/.claude/worktrees/` and `/.claude/pr-watch/` must be listed
in `.prettierignore` explicitly. (`rule-zero.log`, `rule-zero.grants`, `*.pyc` have no Prettier
parser and were not listed — but they cost nothing to add.)

### 7 — byte-sensitive files the tooling reads

| File | Prettier | Evidence |
| --- | --- | --- |
| `.claude/cl-workflow.lock` | **no parser** — skipped by directory expansion; naming it explicitly errors | `pnpm dlx prettier@latest --check .claude/cl-workflow.lock` → `[error] No parser could be inferred for file ".claude/cl-workflow.lock"`; and it is absent from `--check .claude/`'s 24-file list |
| `.claude/rule-zero.conf` / `template/.claude/rule-zero.conf` | **no parser** — same | `pnpm dlx prettier@latest --check .claude/rule-zero.conf` → `[error] No parser could be inferred…`; absent from the directory list |
| `template/.claude/gitignore`, `.claude/.gitignore`, `.claude/.gitattributes` | not listed as dirty (no parser for these names) | absent from `--check .` output |
| `docs/*/.gitkeep` (4) | empty files, no parser, hashed as `e3b0c442…` (sha256 of "") | absent from `--check .`; hashes in `.claude/cl-workflow.lock` |
| `template/.claude/hooks/package.json` (the ESM shim) | **yes, would be reformatted** | content is exactly `{"type":"module"}`; `prettier … \| diff` → expands to `{\n  "type": "module"\n}` |
| does `doctor` check the shim by content or presence? | **by parsed value** — `JSON.parse(readLf(shim))`, then `type === "module"` | `src/cli.ts:657-670`. Formatting it is functionally harmless *provided template and root stay equal* |

### 8 — Prettier's blast radius, repo-wide

`pnpm dlx prettier@latest --check .` from the repo root → **`Code style issues found in 86 files.`**
Notable members: `.github/workflows/ci.yml`, `CLAUDE.md`, `README.md`, `dist/cli.js`,
`docs/guides/agent-workflow.md`, `pnpm-lock.yaml`, `src/cli.ts`, `tsconfig.json`,
`tsconfig.build.json`, all 30 files under `docs/history/**`, 24 under `.claude/`, 23 under
`template/`. Already clean (absent from the list): `package.json`, `eslint.config.mjs`,
`template/mem/index.md`, `template/docs/history/index.md`,
`template/.claude/skills/contribute/templates/issue-comment.md`.

`pnpm dlx prettier@latest --check template/` → **23 of 33** template files dirty. Per-file diff sizes
(`prettier <f> | diff <f> - | grep -c '^[<>]'`):

| File | Changed lines |
| --- | --- |
| `template/.claude/rules/process.md` | 2 |
| `template/.claude/hooks/rule-zero.ts` | 15 |
| `template/.claude/agents/investigator.md` | 21 |
| `template/.claude/skills/contribute/SKILL.md` | 33 |
| `template/docs/guides/agent-workflow.md` | 104 |
| `src/cli.ts` | 223 |

## Observations

**The `.new` trap is the one way to make the gate go red without noticing.** `update` rewrites a
managed root file only when `hashText(onDisk) === previous.files[rel]` (`src/cli.ts:520-527`);
otherwise it writes `<rel>.new` (`:529-531`), which is untracked, and `ci.yml:52` uses
`--untracked-files=all` precisely to catch that. So the fatal configuration is
**`template/` formatted while the root copy is ignored *and* the ignore was added after a commit
that formatted the root* — or any hand-edit to a generated root file. The policy of "ignore the
generated root copies, format `template/**`, then `update`" never enters that branch, because the
root copy is left exactly as the lock recorded it right up to the moment `update` overwrites it.

**Formatting both copies also works, for everything except `settings.json`.** Prettier is
deterministic, so formatting `template/.claude/hooks/rule-zero.ts` and `.claude/hooks/rule-zero.ts`
produces identical text; `update` then takes the `onDisk === source` branch at `src/cli.ts:512-516`,
writes nothing, and only refreshes the lock. That is a valid second policy — it is just strictly
more fragile than the first, and it *still* requires `settings.json` in the ignore list on both
sides. Recommend the first.

**Prettier's markdown rules touch prose semantics of a sort.** Measured on
`template/.claude/agents/investigator.md`: `*emphasis*` → `_emphasis_`, markdown tables padded to
column width, blank lines inserted around headings and tables, and the YAML frontmatter's flow
sequence re-wrapped:

```
-           args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/path-fence.ts", "docs/reviews"]
+           args:
+             [
+               "${CLAUDE_PROJECT_DIR}/.claude/hooks/path-fence.ts",
+               "docs/reviews",
+             ]
```

That is still valid YAML and semantically the same sequence, but it is the agent-frontmatter hook
wiring for `path-fence.ts` — worth a `doctor`/agent-load check after the first `--write`, and worth
considering `proseWrap: preserve` plus an ignore on `.md` frontmatter-bearing payload files if the
owner wants the hand-set 96-column prose left alone. `docs/guides/agent-workflow.md` at 104 changed
lines is the largest prose churn in the payload.

**`pnpm-lock.yaml` is on Prettier's dirty list.** It is not a generated *repo* surface in the drift-gate
sense, but `ci.yml` runs `pnpm install --frozen-lockfile`; reformatting it invites a mismatch the next
time pnpm rewrites it. Ignore it.

**`.claude/hooks/__pycache__/rule-zero-selftest.cpython-313.pyc`** is a leftover from the pre-TypeScript
kit. Prettier has no parser for it and it is git-ignored twice over; harmless, but it is stale.

**Suggested `.prettierignore`** (paths anchored with a leading `/` so `template/` is *not* caught):

```
dist/
pnpm-lock.yaml
/.claude/
/docs/guides/agent-workflow.md
template/.claude/settings.json
```

`/.claude/` covers `worktrees/`, `pr-watch/`, `settings.json`, the lock, and the 24 generated copies
in one line. If the orchestrator prefers the "format both copies" policy instead, replace `/.claude/`
with `/.claude/worktrees/`, `/.claude/pr-watch/`, `/.claude/settings.json` and drop the
`docs/guides/` line — but then the format step **must** cover `template/` and the root together in a
single `--write` invocation, never one without the other.

**Suggested `format` script and the gate-green sequence:**

```
prettier --write .        # or `pnpm format`
pnpm build                # regenerate dist/cli.js from the formatted src/cli.ts
node dist/cli.js update . # propagate template/ -> .claude/, docs/guides/, and rewrite the lock
git add -A dist .claude docs/guides
# verify, exactly as CI does:
git diff --exit-code -- dist/
git status --porcelain --untracked-files=all -- .claude/ docs/guides/   # must print nothing
```

`pnpm build` may swap places with `update` only if `dist/cli.js` is already current; keeping the CI
order (`build` at `ci.yml:35`, `update` at `:51`) is the safer habit. `update` last is not optional.

## Not done / could not measure

- **Never ran `prettier --write`** on anything, per the brief. Every claim about post-format state
  is a trace through `src/cli.ts` plus a `prettier <file> | diff <file> -`, not an observed
  post-format `update`.
- **Never ran `node dist/cli.js update .`** — it writes into the repo. Its current no-op status is
  established indirectly: `doctor` reports no locally-edited managed files, all 24 managed root
  copies `cmp` equal to their sources, and the gate at `ci.yml:48-53` was green on the merged commit
  `8a9690e`.
- **Did not measure whether tsc's emit actually changes** for a Prettier-formatted `src/cli.ts` —
  that needs a scratch `.ts` file and a build, both forbidden here. Marked **unmeasured** in §5; the
  implementer must rebuild `dist/` and commit it, and must treat a `git diff --exit-code -- dist/`
  failure as expected-and-fixed-by-committing, not as a bug.
- **Did not evaluate Prettier config options** (`printWidth`, `proseWrap`, `.editorconfig`
  interaction, overrides per glob). Every measurement above is Prettier 3.9.6 at its **defaults**
  with no config file present; a `.prettierrc` will change which files are dirty and by how much —
  in particular `proseWrap: "preserve"` (the default) is what produced the 104-line
  `agent-workflow.md` diff, and `printWidth: 96` would change the `src/cli.ts` number.
- **Did not check whether `prettier --check` should be added to `ci.yml`**, nor how it would
  interact with the `.new` failure mode; that is a plan question, not a fact.
- **Did not inspect `.claude/worktrees/` contents** — it is empty at this checkout, so the claim that
  a root `--write` would reformat a live worktree is inferred from the measured nested-`.gitignore`
  behaviour on `.claude/pr-watch/`, not observed on a worktree.
- **Did not verify Prettier's behaviour under `pnpm dlx` offline / in CI**; all runs here fetched
  `prettier@3.9.6` from the network.

## Live reads taken

None. No network service was queried; `pnpm dlx prettier@latest` downloads a package from the npm
registry, which is a package fetch, not a read of any system this repo talks to.
