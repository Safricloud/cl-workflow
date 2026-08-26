# Investigation — tooling (2026-08-26-prettier)

**Brief:** If this repo adopts Prettier as a dev dependency with `pnpm format` / `pnpm format:check`
scripts, which Prettier version, which config, and which ignore list fit the code that exists
today with the least churn — and does anything already installed conflict with it?

**Scope:** `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `tsconfig.json`,
`tsconfig.build.json`, `.gitattributes`, `.gitignore`, `.claude/.gitignore`, `src/cli.ts`,
`template/.claude/hooks/*.ts`, `.github/workflows/ci.yml`, `template/.claude/settings.json`,
`template/.claude/hooks/package.json`, `dist/cli.js`, installed `node_modules/`.

**Checkout:** `8a9690ed3f052ab03fe02c4cd8b1830e719950b8` (clean working tree)

## Answer

Pin **`prettier` 3.9.6 exactly** (`"prettier": "3.9.6"` in `devDependencies`) — that is what
`prettier@latest` resolves to today, it declares `engines.node >= 14` against this repo's Node
24.4.1, and it has **zero dependencies**, so the lockfile grows by one entry. The config needs
exactly **one** non-default option: **`printWidth: 100`**. Every other default already matches the
code as written — across 584 diff lines over the ten `.ts`/`.mjs` files at width 100 there is not
one quote change, not one semicolon change, not one indent change and not one arrow-paren change,
because the source is already double-quoted, semicolon-terminated, two-space-indented,
trailing-comma-`all` and always-parenthesised. Width is the whole argument: 80 (the default) costs
1115 diff lines, 100 costs 467, 120 costs 309 — and 100 is where the source visibly sits (nine of
the sixteen in-scope files have a longest line ≤ 111). The remaining churn at 100 is concentrated in
two deliberately dense literal tables, `rule-zero-selftest.ts` (283 lines, its `CASES` array explodes
one tuple per line) and `docs-only.ts` (54 lines, its extension `Set`s explode one string per line);
if the review wants those preserved they need `// prettier-ignore` on the two literals, not a wider
`printWidth`.

The `.prettierignore` must contain, in order of how badly it breaks something: **`dist/`** (1225 diff
lines — it is `tsc` output guarded by `git diff --exit-code dist/`); **`pnpm-lock.yaml`** (1238 diff
lines, pnpm's own output); **`.claude/settings.json` and `template/.claude/settings.json`** — the hard
conflict, measured: `mergeSettings` at `src/cli.ts:384` returns `JSON.stringify(merged, null, 2)`,
whose output is byte-identical to the committed template today, and which re-expands every one-element
`args` array and drops the trailing newline that Prettier adds, so a Prettier-formatted template makes
the CI "Generated copy drift gate" fail on the next `update`; **`.claude/pr-watch/`** (runtime state
written minified at `pr-watch.ts:279`, which Prettier reformats and the next hook run un-formats) and
**`.claude/worktrees/`** (implementer checkouts) — both are git-ignored by `.claude/.gitignore` but
Prettier only reads the `.gitignore` at the CWD, which here holds `node_modules/` and `__pycache__/`
only. **`eslint-config-prettier` is not needed**: `eslint --print-config src/cli.ts` prints 124 rules,
98 active, and a grep for `indent`, `quotes`, `semi`, `max-len`, `comma-dangle`, `brace-style`,
`arrow-parens`, `object-curly-spacing`, `@stylistic/*` and `@typescript-eslint/indent` returns nothing —
only `no-irregular-whitespace` and `no-unexpected-multiline`, neither of which can contradict Prettier
in semicolon-terminated code. Two knock-on facts the plan must carry: reformatting `src/cli.ts` changes
`tsc`'s emit by 12 diff lines, so `pnpm build` must re-run and `dist/cli.js` be committed in the same
change; and 56 of the 86 files Prettier wants to touch are **markdown**, worth 4791 diff lines
(4010 of them in `docs/history/`) — that is a separate decision, not a side effect.

## Facts

### 1. Version and environment

| Fact | Value | Where measured |
| --- | --- | --- |
| `prettier@latest` today | `3.9.6` | `pnpm dlx prettier@latest --version` → `3.9.6` |
| registry confirms | `version = '3.9.6'`, `dist-tags = { next: '4.0.0-alpha.13', latest: '3.9.6' }` | `npm view prettier version engines dist-tags` |
| `engines` of the fetched package | `{"node":">=14"}` | `node -e "require('<dlx>/prettier/package.json').engines"` on `…/pnpm-cache/dlx/2550ff…/node_modules/.pnpm/prettier@3.9.6/node_modules/prettier/package.json` |
| Node here | `v24.4.1` | `node --version` |
| pnpm here | `10.27.0` | `pnpm --version`; matches `packageManager` at `package.json:22` |
| prettier runtime deps | none (`npm view prettier dependencies` prints nothing) | `npm view prettier dependencies` |
| prettier unpacked size | `9954439` bytes (~9.95 MB) | `npm view prettier dist.unpackedSize` |
| prettier installed today? | no — `ls node_modules \| grep -i prettier` empty; `grep -in prettier pnpm-lock.yaml` empty | both commands, repo root |
| installed devDeps | eslint 10.9.1, typescript 6.0.3, typescript-eslint 8.68.0, eslint-plugin-n 18.3.0, @eslint/js 10.0.1 | `require('./node_modules/<p>/package.json').version` for each |
| `eslint-config-prettier` latest (if wanted) | `10.1.8`, deps none, peer `eslint >=7.0.0` | `npm view eslint-config-prettier version dependencies peerDependencies` |

### 2. `--list-different .` from the repo root, no config, no `.prettierignore`

86 files. By extension: **56 `.md`, 17 `.ts`, 10 `.json`, 1 `.yml`, 1 `.yaml`, 1 `.js`**
(`sed 's/.*\.//' | sort | uniq -c` over the captured list).

| Question | Answer | Where measured |
| --- | --- | --- |
| includes `dist/cli.js`? | **yes**, line 27 of the list | `pnpm dlx prettier@latest --list-different .` |
| includes `pnpm-lock.yaml`? | **yes**, line 59 | same |
| includes `.claude/cl-workflow.lock`? | **no** — Prettier infers no parser for `.lock` | `prettier --file-info .claude/cl-workflow.lock` → `{ "ignored": false, "inferredParser": null }` |
| includes anything under `node_modules/`? | **no** — 0 matches | `grep -c 'node_modules'` over the list |
| includes anything under `.claude/worktrees/`? | **no**, but only because the directory is **empty** at this checkout | `ls -a .claude/worktrees` → `.` and `..` only |
| does `.claude/worktrees/` exist / is it git-ignored? | exists; ignored by `.claude/.gitignore:3` | `git check-ignore -v .claude/worktrees` → `.claude/.gitignore:3:worktrees/` |
| includes `.claude/pr-watch/*.json`? | **yes** — 4 files (`2.json`…`5.json`), lines 12–15 — *even though they are git-ignored* | list output; `git check-ignore -v .claude/pr-watch/2.json` → `.claude/.gitignore:4:pr-watch/` |
| includes `.github/workflows/ci.yml`? | **yes**, line 25 | list output |
| includes dot-directories generally? | **yes** — 25 of the 86 paths start with `.` | `grep -c '^\.'` over the list |
| includes root `package.json` or `eslint.config.mjs`? | **no** — both are already Prettier-clean | absent from the list; confirmed 0 diff lines in §3 |

**Does Prettier 3 skip `.gitignore`d paths by default?** Yes — but only the `.gitignore` at the
**CWD**, not nested ones. Documented in the fetched package: `prettier --help` prints
`--ignore-path <path> … Defaults to [.gitignore, .prettierignore].` Measured two ways: (a) from the
repo root, `.claude/pr-watch/2.json` **is** listed although `.claude/.gitignore` ignores it, and
`node_modules/` is **not** listed (root `.gitignore` line 1); (b) re-running
`prettier --list-different .` from inside `.claude/` — where `.claude/.gitignore` becomes the CWD
`.gitignore` — drops `pr-watch/*.json` entirely and returns 20 files instead of the 24 under
`.claude/`. Root `.gitignore` contains only `node_modules/` and `__pycache__/`; `.claude/.gitignore`
contains `rule-zero.grants`, `rule-zero.log`, `worktrees/`, `pr-watch/`, `__pycache__/`.

### 3. Per-file churn: Prettier defaults vs `--print-width 100`

Measured as `prettier [flags] <file> | diff <file> - | wc -l` for each file, at
`8a9690e`. "Longest" is `awk '{if(length($0)>m)m=length($0)}END{print m}'`.

| File | lines | diff @ default (80) | diff @ `--print-width 100` | longest line |
| --- | ---: | ---: | ---: | ---: |
| `src/cli.ts` | 749 | 303 | **91** | 145 |
| `template/.claude/hooks/docs-only.ts` | 304 | 106 | **54** | 204 |
| `template/.claude/hooks/lib.ts` | 345 | 52 | **13** | 99 |
| `template/.claude/hooks/path-fence.ts` | 79 | 25 | **20** | 115 |
| `template/.claude/hooks/pr-watch.ts` | 298 | 81 | **6** | 111 |
| `template/.claude/hooks/reload-plan.ts` | 131 | 35 | **0** | 98 |
| `template/.claude/hooks/rule-zero-selftest.ts` | 305 | 483 | **283** | 189 |
| `template/.claude/hooks/rule-zero.ts` | 252 | 23 | **0** | 110 |
| `template/.claude/hooks/status-block.ts` | 118 | 7 | **0** | 102 |
| `eslint.config.mjs` | 51 | **0** | **0** | 105 |
| `.github/workflows/ci.yml` | 78 | 4 | 4 | 91 |
| `package.json` | 37 | **0** | **0** | 93 |
| `tsconfig.json` | 33 | 18 | 18 | 47 |
| `tsconfig.build.json` | 14 | 6 | 6 | 44 |
| `template/.claude/settings.json` | 52 | 23 | 23 | 68 |
| `template/.claude/hooks/package.json` | 1 | 6 | 6 | 17 |

(JSON and YAML are unaffected by `printWidth` here because nothing in them is near either limit;
`.mjs`/`.ts` are.)

**Width sweep, total diff lines across the ten `.ts`/`.mjs` files:**

| printWidth | 80 (default) | 100 | 110 | 120 | 140 | 160 | 200 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| total | 1115 | **467** | 382 | 309 | 283 | 268 | 227 |

**Kinds of change** (read in full for `src/cli.ts`, `docs-only.ts`, `rule-zero-selftest.ts` at width 100):

- **Wrapping only, both directions.** Long ternaries split across `?`/`:`
  (`src/cli.ts:239` `versionLabel`); long parameter lists explode one-per-line
  (`mergeSettings(templateText, currentText, stems)` at `src/cli.ts:330`); long call arguments explode
  (`say(...)` at `src/cli.ts:442`, `fail(...)` at `:623`); method chains break at the dots
  (`path-fence.ts:32` `.filter().map().filter()`). It also **joins** lines that fit — the already-exploded
  `fail(state, …, "run \`cl-workflow init\` here first",)` at `src/cli.ts:601-606` collapses to one line.
- **Single-statement `if`/`else if` bodies move to their own line** — 4 occurrences, e.g.
  `src/cli.ts:649` `if (broken.length > 0) fail(...)` becomes two lines. This is the only change
  that alters a *habit* rather than a wrap.
- **Trailing commas added** only where Prettier itself explodes a list (`stems: Set<string>,`) —
  the existing multi-line calls already carry them, so `trailingComma: "all"` (the 3.x default) is
  already the house style.
- **Dense literal tables explode.** `rule-zero-selftest.ts`'s `CASES` array is written one 5-tuple
  per line up to 189 chars; Prettier turns each over-width tuple into 5–8 lines. That single literal
  is 283 of the 467 diff lines at width 100. `docs-only.ts`'s `COMMENT` table does the same with two
  `new Set([...])` literals of 17 and 23 extension strings.
- **Not touched:** quote characters (0 changes — the one single-quoted literal in the tree,
  `docs-only.ts:125` `text.includes("'") && !text.includes('"') ? '"' : "'"`, survives because
  Prettier's fewer-escapes rule keeps it), semicolons (18 removed lines end in `;`, 18 added lines
  end in `;` — pure reflow), indentation (2 spaces before and after; 0 tab characters in
  `src/cli.ts` or `lib.ts`), blank lines between declarations, comment placement, `/** */` blocks,
  arrow parens (`(g) =>` already always-parenthesised).

**Which width preserves more of the current style: 100.** At 80 the file that is *already* Prettier-clean
in the tree — `eslint.config.mjs`, whose longest line is 105 — would still be clean, but `lib.ts`,
`pr-watch.ts`, `rule-zero.ts` and `status-block.ts` (longest lines 99–111) all get shredded; at 100
three of those four go to **zero**. Going past 100 buys progressively less (120 saves 158 more lines,
140 only 26 more) and starts to license lines the codebase does not actually write.

**Current style facts observed:** double quotes; semicolons everywhere; trailing commas in existing
multi-line calls; 2-space indent, no tabs; `(x) =>` arrow parens; JSDoc `/** */`; longest lines
98–115 except the two deliberate tables (189, 204).

### 4. `template/.claude/settings.json` — the hard conflict

Prettier changes it in exactly two ways (23 diff lines, `prettier template/.claude/settings.json | diff -u`):

1. Each of the three **one-element `args` arrays collapses to one line**:
   `"args": [\n  "${CLAUDE_PROJECT_DIR}/.claude/hooks/rule-zero.ts"\n]` → `"args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/rule-zero.ts"]`. Same for `status-block.ts` and `reload-plan.ts`.
2. It **adds a trailing newline**. The file has none today — last byte is `}`
   (`tail -c 1 template/.claude/settings.json | od -c` → `}`), and so does the generated root copy.

That is a gate failure, not a cosmetic one:

- `src/cli.ts:384` — `return JSON.stringify(merged, null, 2);`, under the comment at `:383`
  *"The template file carries no trailing newline; reproduce it byte for byte on a fresh install."*
  `settings.json` is the one payload file that is **merged**, not copied (`src/cli.ts:29`:
  *"managed, except `settings.json`, which is merged key by key"*).
- Measured: piping the Prettier-formatted template through `JSON.stringify(JSON.parse(t), null, 2)`
  produces output **byte-identical to the committed template today** (`cmp` → identical) and
  **differs from the Prettier form** by exactly the 3 array collapses plus `\ No newline at end of file`.
- Therefore, if `template/.claude/settings.json` is formatted, the next `node dist/cli.js update .`
  rewrites `.claude/settings.json` back into the `JSON.stringify` form, the CI step
  *"Generated copy drift gate"* (`.github/workflows/ci.yml:39-48`) sees a tracked change and exits 1 —
  and `pnpm format:check` sees `.claude/settings.json` as unformatted. Both directions fail.
  Both paths must be in `.prettierignore` (or `mergeSettings` must learn to emit Prettier's shape,
  which is a code change, out of this brief's scope).

`template/.claude/hooks/package.json` is the mirror case and is **safe**: it is `{"type":"module"}` on
one line and Prettier expands it to three (6 diff lines), but it is a plain byte copy
(`readLf`/`writeLf`, `src/cli.ts:401`/`:424`), so `update` propagates the new bytes and `doctor` only
`JSON.parse`s it (`src/cli.ts:663`) — no drift, no behaviour change. `cmp template/.claude/hooks/package.json .claude/hooks/package.json` → identical today.

### 5. ESLint interplay — `eslint-config-prettier` is not needed

`pnpm exec eslint --print-config src/cli.ts` (exit 0, 8945 bytes) prints **124 rules, 98 active**.

| Classic formatting rule | In the printed config? |
| --- | --- |
| `indent`, `quotes`, `semi`, `max-len`, `comma-dangle`, `brace-style`, `arrow-parens`, `object-curly-spacing`, `quote-props`, `key-spacing`, `operator-linebreak`, `eol-last`, `no-trailing-spaces`, `padded-blocks`, `no-multi-spaces`, `linebreak-style`, `space-before-function-paren`, `no-mixed-spaces-and-tabs`, `no-extra-semi`, `no-extra-parens`, `func-call-spacing`, `curly` | **absent** (`undefined`) |
| `@stylistic/*` | **none** — grep returns nothing |
| `@typescript-eslint/indent`, `/quotes`, `/semi`, `/comma-dangle`, `/brace-style`, `/member-delimiter-style`, `/type-annotation-spacing` | **none** — grep returns nothing |
| `no-irregular-whitespace` | active, `[2, {skipStrings:true, …}]` — bans exotic whitespace characters, not layout. Prettier never emits them. No conflict. |
| `no-unexpected-multiline` | active, `[2]` — the ASI hazard rule. It only contradicts Prettier when `semi: false`; this repo is semicolon-terminated (default `semi: true`), so no conflict. |

The explicit rules in `eslint.config.mjs:29-52` are `no-restricted-imports` (the zero-dependency
regex), four `n/*` import rules and `@typescript-eslint/no-non-null-assertion` — all semantic.
`eslint.config.mjs` is also itself already Prettier-clean at the **default** width (0 diff lines),
which is a hint that the file was hand-written in Prettier's shape.

Conclusion: adding `eslint-config-prettier` would turn off rules that are already off. It buys a
regression guard for the day someone adds `@stylistic` — a real but hypothetical benefit, at the cost
of one more devDependency in a repo whose stated discipline is a minimal graph.

### 6. Prettier's `.ts` output under this repo's TypeScript constraints

| Fact | Value | Where measured |
| --- | --- | --- |
| `import type` anywhere in `src/` or `template/.claude/hooks/` | **none** | `grep -rn "import type" src/ template/.claude/hooks/` → no matches (confirmed the paths exist and hold 9 `.ts` files) |
| imports Prettier rewrites at width 100 | exactly **one**: `path-fence.ts:24`, the 115-char `import { asRecord, …, readStdinJson } from "./lib.ts";` explodes to 10 lines. The specifier `"./lib.ts"` is preserved verbatim. | `grep -E '^[-+].*\bimport\b'` over the combined 584-line diff |
| node type-stripping still accepts the output | **9/9 OK** — `node --check` passes on the Prettier-formatted `cli.ts`, `docs-only.ts`, `lib.ts`, `path-fence.ts`, `pr-watch.ts`, `reload-plan.ts`, `rule-zero-selftest.ts`, `rule-zero.ts`, `status-block.ts` | formatted output written to an OS temp dir (outside the repo), then `node --check <file>` on each, Node 24.4.1; control `node --check src/cli.ts` also OK |
| anything `erasableSyntaxOnly` could mind | nothing — Prettier only re-wraps; it introduces no enum, namespace, parameter property or decorator, and cannot | reading the 584-line combined diff; every `+` line is a re-wrap of an existing `-` line |
| `verbatimModuleSyntax` | unaffected — no `import`/`export` **form** changes, only the line breaks inside one named-import list | same diff |
| `.ts` import extensions | preserved (`from "./lib.ts"` unchanged in the one rewritten import) | `path-fence.ts` hunk of the diff |

**Knock-on: `dist/cli.js` changes when `src/cli.ts` is formatted.** Measured by compiling both variants
side by side in an OS temp dir with the build's own flags
(`tsc --ignoreConfig … --module nodenext --moduleResolution nodenext --target esnext --lib esnext
--types node --strict --erasableSyntaxOnly --verbatimModuleSyntax --rewriteRelativeImportExtensions`,
each with a `{"type":"module"}` package.json beside it):

- emitted(original `src/cli.ts`) vs committed `dist/cli.js` → **0 diff lines** (the reproduction is exact,
  which validates the method)
- emitted(original) vs emitted(Prettier @100) → **12 diff lines** — `tsc` carries the source's line
  breaks into the emit, e.g. `versionLabel`'s ternary and the `kitEntries` ternary each become three
  lines in `dist/cli.js`.

So the change must run `pnpm build` and commit `dist/cli.js` in the same commit, or
`git diff --exit-code -- dist/` (`.github/workflows/ci.yml:35-37`) fails.

### 7. Line endings — no CRLF risk

| Fact | Value | Where measured |
| --- | --- | --- |
| `.gitattributes` (root and `.claude/`) | `* text=auto eol=lf` in both | `cat .gitattributes`, `cat .claude/.gitattributes` |
| working-tree EOL on this Windows checkout | `i/lf  w/lf  attr/text=auto eol=lf` for `src/cli.ts`, `template/.claude/hooks/rule-zero.ts`, `template/.claude/settings.json`, `.github/workflows/ci.yml`, `package.json`, `dist/cli.js`, `pnpm-lock.yaml` | `git ls-files --eol <files>` |
| CR bytes in sources | none | `grep -rlU $'\r' src/ template/.claude/hooks/` → no matches |
| Prettier `endOfLine` default | `lf` — and the diffs contain zero EOL-only hunks | all §3 diffs; no `^M` and no whole-file rewrite appears in any of them |

`endOfLine: "lf"` need not be set explicitly (it is the default), but setting it costs nothing and
documents the `.gitattributes` contract.

### 8. Generated files Prettier would rewrite

| File | diff lines | Why it must be ignored |
| --- | ---: | --- |
| `pnpm-lock.yaml` | **1238** (of 913 source lines) | pnpm writes it; `pnpm install --frozen-lockfile` in CI compares it |
| `dist/cli.js` | **1225** (of 695 source lines — `tsc` emits 4-space indent, Prettier wants 2) | `git diff --exit-code -- dist/` gate; `format` and `build` would fight forever |
| `.claude/settings.json` + `template/.claude/settings.json` | 23 each | proved in §4 — breaks the generated-copy drift gate |
| `.claude/pr-watch/*.json` (4 files) | **60** total | runtime state, written minified by `JSON.stringify(...)` at `template/.claude/hooks/pr-watch.ts:279`; the next hook run un-formats them and `format:check` goes red at random. Git-ignores it, Prettier does not (§2). |
| `.claude/worktrees/` | 0 today (empty) | holds implementer checkouts mid-contribution, including their own `node_modules` and full source copies; `eslint.config.mjs:13` already ignores it for the same reason |
| `.claude/cl-workflow.lock` | n/a | **already skipped** — `inferredParser: null`. An entry is harmless but unnecessary. |

Churn by area (defaults, whole 86-file list, summed with `diff … | wc -l`):

| Area | diff lines |
| --- | ---: |
| `docs/history/` (archived records) | 4010 |
| root files (incl. `pnpm-lock.yaml` 1238, `README.md` 50, `CLAUDE.md` 10, `tsconfig.json` 18, `tsconfig.build.json` 6, `.github/workflows/ci.yml` 4) | 1365 |
| `dist/` | 1225 |
| `template/` | 1193 |
| `.claude/` (generated copies) | 1039 |
| `src/` | 303 |
| `docs/` other (`guides/agent-workflow.md` 132, `mem/` etc.) | 132 |
| `.claude/pr-watch/` state | 60 |

## Observations

- **Markdown is 56 of the 86 files and 4791 diff lines** (summed over every `.md` in the list, at
  Prettier's default `proseWrap: "preserve"` — so it is *not* re-wrapping prose). The changes are
  structural: a blank line inserted after every `##` heading and before every list that follows one.
  `CLAUDE.md` is 10 lines, `README.md` 50, `docs/guides/agent-workflow.md` 132, `mem/outstanding.md`
  39 — and `docs/history/` alone is 4010. This is a scope decision the review must make explicitly,
  not a side effect of turning Prettier on. Note that the `template/` markdown and its generated
  `.claude/` and `docs/guides/` copies are plain byte copies (`src/cli.ts:29`), so formatting them
  together produces **no** drift — markdown carries none of `settings.json`'s hazard.
- **`.github/workflows/ci.yml` changes by one line**: `node-version: '24'` → `node-version: "24"`
  (Prettier's `singleQuote: false` applies to YAML). Harmless, and the review will be editing that
  file anyway to add a `format:check` step.
- **`tsconfig.json` (18) and `tsconfig.build.json` (6)** change only by collapsing one-element and
  short arrays: `"lib": ["esnext"]`, `"types": ["node"]`, `"include": ["src", "template/.claude/hooks", ".claude/hooks"]`.
  Nothing reads these files byte-wise; safe to format.
- **The two dense tables are load-bearing prose, not accidents.** `rule-zero-selftest.ts`'s `CASES`
  is a 62-case truth table read as a table; `docs-only.ts`'s `COMMENT` is a comment-marker lookup.
  A `// prettier-ignore` above each literal costs two lines and removes 337 of the 467 diff lines at
  width 100, leaving ~130 lines of genuinely-improved wrapping. That is worth putting to the owner
  as a question — the alternative (a `printWidth` of 200 to accommodate a 189-char line) would
  license width the rest of the codebase does not use.
- **A version range is a CI drift risk.** Prettier's output changes across minor versions; with
  `"prettier": "^3.9.6"` a fresh `pnpm install` on a contributor's machine could format differently
  from CI's, and `format:check` would fail for reasons unrelated to the change. The repo's existing
  devDeps all use `^`, so an exact pin is a deliberate deviation — worth naming in the plan rather
  than slipping in. `pnpm install --frozen-lockfile` in CI mitigates it there but not locally.
- **`.claude/pr-watch/` deserves a second look independent of Prettier.** Those four files are
  git-ignored runtime state living inside a directory the CLI otherwise manages; Prettier is simply
  the first tool to notice them from the root. Adding `pr-watch/` and `worktrees/` to the **root**
  `.gitignore` (rather than only `.claude/.gitignore`) would fix it for Prettier and every future
  root-level tool at once — but that is a change to a file `update` may manage, so it is the
  review's call, not mine.
- **The `if (cond) statement;` habit.** Four one-line guard statements get split onto two lines at
  width 100. If the owner values that idiom, no Prettier option preserves it — Prettier has no
  `singleLineIfStatement`. It is a real, if small, style loss to name in the questions.

## Not done / could not measure

- **I did not run `prettier --write` on anything in the repo, install any package, or modify any
  repo file.** Every diff in this report was produced by piping Prettier's stdout into `diff`.
  Temporary outputs went to the OS temp directory (`mktemp -d`, `/tmp`), never inside the checkout,
  and were removed; no scratch file was left anywhere.
- I used the `prettier@3.9.6` binary that `pnpm dlx` had already cached
  (`…/pnpm-cache/dlx/2550ff…/node_modules/.pnpm/prettier@3.9.6/node_modules/prettier/bin/prettier.cjs`)
  for the repeated per-file runs instead of paying `pnpm dlx`'s resolution cost on each of ~400
  invocations. It is the same package `pnpm dlx prettier@latest` fetched — version verified from its
  own `package.json`.
- **I did not run `pnpm lint` or `pnpm typecheck` against Prettier-formatted sources.** I ran
  `node --check` (Node's own type-stripper, which is what actually executes the hooks) on all nine
  formatted `.ts` files, and I compiled the formatted `src/cli.ts` with `tsc` using the build's flags
  — but I did not run the full `tsc --noEmit` over the 17-file program, nor ESLint over formatted
  output. A `no-useless-assignment` or `no-unexpected-multiline` surprise on formatted code is
  therefore **unverified**, though nothing in the diffs suggests one.
- **I did not verify the `dist/` rebuild end to end** — I reproduced `dist/cli.js` byte-exactly from
  the unformatted source in a temp dir (0 diff lines), which is strong evidence the method is right,
  but I did not run `pnpm build` in the repo (it would write to `dist/`).
- **I did not measure the per-file split of the width sweep** beyond 80 and 100; the 110/120/140/160/200
  numbers are totals across the ten `.ts`/`.mjs` files only.
- **I did not measure the effect of `// prettier-ignore`** on the two dense literals — the 337-line
  figure in the Observations is the sum of the two files' width-100 diffs (283 + 54), which assumes
  the ignore comment suppresses the whole literal and nothing else in those files changes. That
  assumption is untested.
- **I did not read Prettier's CHANGELOG** for the history of the `--ignore-path` default; the fetched
  package ships no `CHANGELOG.md` (only `LICENSE`, `README.md`, `THIRD-PARTY-NOTICES.md` and code).
  The default is cited from `prettier --help` of the installed 3.9.6 and confirmed by the two
  behavioural measurements in §2.
- **I did not read `eslint-config-prettier`'s own rule list**; the "not needed" conclusion rests on
  the printed ESLint config containing no formatting rules, not on that package's documentation.
- **I did not investigate `docs/reviews/`, `docs/plans/` or `docs/reports/`** as ignore candidates
  beyond noting they exist — whether in-flight agent output should be format-gated is a process
  question, and `investigation-process.md` in this directory is the report that owns it.
- **I did not decide anything about markdown scope**; I measured it and stopped.

## Live reads taken

None. No network call other than the npm registry lookups (`npm view prettier …`,
`npm view eslint-config-prettier …`) and the `pnpm dlx` package fetch, all read-only package-registry
GETs against a public registry, none against any system this project owns or deploys to.
