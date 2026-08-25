# Investigation — hooks (2026-08-25-npx-ts-kit)

**Brief:** What exactly must a zero-dependency TypeScript port (run natively by Node ≥22.18 via type stripping) of each of the seven Python hooks reproduce, and what are the porting risks?
**Scope:** `.claude/hooks/*.py`, `.claude/settings.json`, `.claude/rule-zero.conf`, `.claude/agents/*.md`, `.claude/skills/contribute/SKILL.md`, `README.md`, `CLAUDE.md`, `docs/guides/agent-workflow.md`
**Checkout:** `dc189daaeee1cd5300713b92916a8c69664c49bb` (clean; only `.claude/hooks/__pycache__/` untracked)

## Answer

The seven hooks are 879 lines of Python whose entire external contract is small and mechanical: read one JSON object from stdin (or argv), match strings against user-authored regexes, shell out to `git`/`gh`, and emit either nothing, one `hookSpecificOutput` JSON line on stdout, or plain text — with exit codes used in only two places (`status-block` exit 2; `docs-only` exit 0/3/1). Every Python stdlib call they make has a direct `node:*` builtin equivalent, so a zero-dependency, erasable-syntax-only TS port is genuinely feasible (verified: Node v24.4.1 runs erasable `.ts` natively, rejects `enum` and parameter properties). **The regex risk is far smaller than feared but not zero:** all 26 active `rule-zero.conf` patterns compile as JS `RegExp` and I measured 1300 pattern × subject cells (26 patterns × 50 subjects drawn from the self-test corpus) with **zero** behavioural differences — provided the port compiles conf/grant patterns **without** the `u`/`v` flag, because Python's `re.escape` (used by `--bundle` and `docs-only --grant`) emits `\-`, `\ `, `\#`, `\~`, `\&`, which are hard `SyntaxError`s under `u` and fine without it. The real hazards are (a) the silent ones: `\A`, `\Z`, `\z` become *literal letters* in JS instead of anchors and `$` stops matching before a trailing newline; the loud ones (`(?i)`, `(?P<n>…)`, `(?>…)`, `a++`, `(?#…)`) all throw and are caught by the existing fail-closed conf handler; (b) `os.path.realpath` tolerates non-existent paths while `fs.realpathSync` throws `ENOENT`, which both path-resolving hooks depend on; and (c) `RegExp.escape` exists in Node 24 but produces `\x66eat\/x` for `feat/x` — unusable for a human-readable grants file, so the port must hand-roll a Python-compatible escape. Two live defects surfaced while measuring: the self-test has **57 cases, not the 52 the README claims**, and `path-fence.py` **denies every write on Windows** (including its own allowed `docs/reviews/` prefix) because `os.path.join(base, "docs/reviews")` keeps the forward slash and the `startswith` never matches.

## Facts

### 1. Per-hook I/O contract

| Fact | Value | Where measured |
| --- | --- | --- |
| Total hook lines | 879 (`docs-only` 138, `path-fence` 51, `pr-watch` 134, `reload-plan` 75, `rule-zero-selftest` 174, `rule-zero` 228, `status-block` 79) | `wc -l .claude/hooks/*.py` |
| Node available | `v24.4.1` at `/c/Program Files/nodejs/node` | `node --version`; `which node` |
| `python3` on PATH | **Microsoft Store alias stub** at `…/WindowsApps/python3`; `python3 --version` exits **49** with "Python was not found" | `which python3`; `python3 --version; echo $?` |
| Real Python | `Python 3.13.5` at `/c/Python313/python` (i.e. `python`, not `python3`) | `python --version`; `which python` |

#### `rule-zero.py` — 228 lines — port difficulty **4/5**

| Aspect | Contract |
| --- | --- |
| Entry split | `sys.argv > 1` → `grants_cli(argv[1:])`; else `main()` reads stdin (`rule-zero.py:225-228`) |
| stdin fields consumed | `tool_name`, `tool_input` (`.command`, `.file_path`, `.notebook_path`), `permission_mode`, `agent_id`, `agent_type`, `cwd` (`rule-zero.py:75-79`, `:86-99`) |
| argv flags | `--grant '<regex>' […]`, `--bundle merge-cleanup <pr> <branch>`, `--list`, `--clear` (`rule-zero.py:178-222`) |
| stdout (hook mode) | **Nothing** on allow/silent; on deny a single line of `json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":…}})` (`rule-zero.py:35-43`) |
| Exit codes (hook mode) | Always **0** — deny is expressed by the JSON payload, not the exit code. Measured: empty payload → 0 silent; malformed stdin → 0 + deny JSON; guarded command → 0 + deny JSON | `echo '{}' \| python … ; echo $?` etc. |
| Exit codes (CLI mode) | `0` on `--list`/`--clear`/successful grant; `2` on unknown/malformed args (usage to stderr); `1` uncaught `re.error` traceback when `--grant` is given an invalid regex (measured `--grant '('` → exit 1) | `rule-zero.py:213-214`; measured |
| Files read | `${CLAUDE_PROJECT_DIR\|cwd}/.claude/rule-zero.conf` (required — missing ⇒ deny), `.claude/rule-zero.grants` (optional) |
| Files written | `.claude/rule-zero.grants` (rewritten on grant consumption, appended by CLI), `.claude/rule-zero.log` (TSV append, `OSError` swallowed) |
| Log line format | `\t`-joined: `%Y-%m-%dT%H:%M:%SZ` UTC, verdict, `orchestrator`\|`agent:<type>`, mode, `subject[:200]` with tabs→spaces, note (`rule-zero.py:107-115`) |
| Subprocesses | **None** |
| Timeouts/sleeps | None in the script; `settings.json` gives the hook a 10 s budget |
| Verdict order | per Bash segment: `deny` → (`allow` ⇒ continue) → `guard`; precedence is independent of conf line order (`rule-zero.py:124-135`) |
| Bash splitting | `re.compile(r"\s*(?:&&|\|\||;|\||\n)\s*")`, empty segments dropped (`rule-zero.py:32`, `:87`) |
| File-tool subject | only produced when the resolved path is **outside** the repo and **not** under `/tmp` or `$TMPDIR`; subject is `path:outside-repo <resolved>` (`rule-zero.py:88-95`) |
| MCP subject | `tool:<name> <compact json of tool_input>[:500]` (`rule-zero.py:96-99`) |
| Grant consumption | first grants-file line whose regex `re.search`es the subject wins; **all** lines equal to it are removed (`remaining = [g for g in grants if g != used]`, `rule-zero.py:163-168`) — a duplicate grant line is destroyed with its twin |
| `--bundle` output (measured, pr=12, branch=`feat/npx-ts-kit`) | `^gh pr merge 12\b` / `^git push origin --delete feat/npx\-ts\-kit$` / `^git branch -D feat/npx\-ts\-kit$` | run in a temp `CLAUDE_PROJECT_DIR` |

#### `rule-zero-selftest.py` — 174 lines — port difficulty **4/5**

| Aspect | Contract |
| --- | --- |
| Case count | **57**, not 52 — `CASES` has 57 elements and the run prints `57/57 cases passed; 37 lines logged` | `ast` count of `CASES`; `python .claude/hooks/rule-zero-selftest.py` |
| Invocation of the hook | **subprocess**, never import: `subprocess.run([sys.executable, HOOK], input=json.dumps(payload), capture_output=True, text=True, env={…CLAUDE_PROJECT_DIR:project}, cwd=project, timeout=10)` (`rule-zero-selftest.py:121-122`) |
| Bundle setup | also a subprocess: `[sys.executable, HOOK, "--bundle", "merge-cleanup", pr, branch]` with `check=True` (`:107-108`) |
| Case tuple | `(label, tool, tool_input, context, expected)`; `context` is `"orch"` \| `"agent"` \| `(role, grant_regex)`; the magic grant string `"BUNDLE <pr> <branch>"` routes to `--bundle` (`:25-27`, `:99-111`) |
| Sandbox | `tempfile.mkdtemp(prefix="rule-zero-selftest-")`, creates `.claude/worktrees/agent-1/src` and `src`, `shutil.copy(conf, …)`, `shutil.rmtree` in `finally` (`:147-151`, `:169-170`) |
| Accepted return codes | `(0, 2)`; anything else ⇒ `"error"` (`:123-124`) |
| Grant-consumption invariant | on a silent orchestrator case with a grant, the grants file must have **0** lines left (**2** for `BUNDLE`) (`:127-133`) |
| Negative control | after the table, re-runs `git push --force origin feat/x` as orchestrator with no grant and requires `DENY` (`:163-167`) |
| argv | `--verbose`, `--conf <path>`; exit 0 all-pass else 1 (`:141-168`) |
| Wall time | ~3.3 s for 57 + 1 subprocess spawns | `time python .claude/hooks/rule-zero-selftest.py` |

#### `status-block.py` — 79 lines — port difficulty **2/5**

| Aspect | Contract |
| --- | --- |
| stdin fields | `stop_hook_active` (truthy ⇒ silent return), `cwd` (`status-block.py:39-41`) |
| argv | none |
| stdout | none |
| stderr / exit | on failure writes the "Not finished: no status block…" paragraph to stderr and `sys.exit(2)`; every other path returns (exit 0) (`:69-75`) |
| Files read | `<cwd>/docs/plans/*/plan.md` via `glob.glob` + `sorted` (`:42`); silent when none |
| Base-branch resolution | first `` **Branch:** `x` `` capture from any plan.md (regex `\*\*Branch:\*\*\s*` + backtick capture, `:49`), then `main`, then `master`; unresolvable ⇒ fail **open** (`:54-63`) |
| Subprocesses | `git -C <cwd> rev-parse --verify --quiet <ref>` per candidate; `git -C <cwd> diff --stat <base> -- docs/plans/` — each `timeout=20` (`:29-31`, `:58`, `:65`) |
| Malformed stdin | swallowed, returns silently (`:35-38`) — fails **open**, unlike rule-zero |

#### `reload-plan.py` — 75 lines — port difficulty **3/5**

| Aspect | Contract |
| --- | --- |
| stdin fields | `cwd` only, and only as a fallback behind `CLAUDE_PROJECT_DIR`; unparseable stdin ⇒ `{}` (`reload-plan.py:28-31`) |
| argv | none |
| stdout | plain text, `"\n".join(out)` via one `print` — SessionStart injects it as context (`:71`) |
| Exit | always 0 |
| Files read | `<root>/docs/plans/*/plan.md`, `<plan dir>/phase-*.md`, `<root>/.claude/rule-zero.grants` |
| Files written | none |
| Subprocesses | none |
| Regexes | `section()` = `<heading_re>[^\n]*\n(.*?)(?=\n## \|\Z)` with `re.S`; `\*\*<key>:\*\*\s*([^\n]+)` for `Source review`/`Branch`/`Owner go-ahead`; `### Item (\d+\.\d+) — ([^\n]+)` via `re.findall` (two groups ⇒ tuples); `#### Status — item <re.escape(num)>\n(.*?)(?=\n### \|\n## \|\Z)` with `re.S` (`:22`, `:44`, `:54-55`) |
| Pending-item rule | body empty **or** starts with `*(implement` ⇒ pending; `body.lower().startswith("**in progress")` ⇒ "(in progress)" (`:56-60`) |
| Measured output on this repo | `docs/plans/ is empty: no plan is in flight …` | `echo '{}' \| python .claude/hooks/reload-plan.py` |

#### `path-fence.py` — 51 lines — port difficulty **2/5** (but **fix the bug**)

| Aspect | Contract |
| --- | --- |
| argv | one or more allowed prefixes, each `.strip("/")`; **no prefixes ⇒ silent return** (`path-fence.py:18-20`) |
| stdin fields | `tool_input.file_path` \| `tool_input.notebook_path`, `cwd` (`:25-29`) |
| stdout | deny JSON, same `hookSpecificOutput` shape as rule-zero, else nothing (`:38-47`) |
| Exit | **always 0** — even on deny (no `sys.exit`) |
| Files/subprocesses | none |
| Resolution | `os.path.realpath(os.path.join(cwd, os.path.expanduser(path)))`, accepted if under `realpath(CLAUDE_PROJECT_DIR)` **or** `realpath(cwd)` + prefix + `os.sep` (`:31-37`) |
| Wired in | `.claude/agents/investigator.md:7-13` frontmatter — `PreToolUse`, matcher `Edit\|Write\|MultiEdit\|NotebookEdit`, `command: "python3"`, `args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/path-fence.py", "docs/reviews"]`. **Yes, it is wired.** `implementer.md` has no `hooks:` block. |
| **Defect** | On Windows every path is denied. `os.path.join(base, "docs/reviews") + os.sep` = `C:\…\cl-workflow\docs/reviews\` while `realpath(...)` = `C:\…\cl-workflow\docs\reviews\a\b.md` ⇒ `startswith` False | measured: `docs/reviews/a/b.md` → DENY; intermediates printed |

#### `pr-watch.py` — 134 lines — port difficulty **3/5**

| Aspect | Contract |
| --- | --- |
| stdin | **not read** — this is a CLI, not a hook |
| argv | `--pr <n>` (required), `--interval <int>` (default 60), `--quiet-after <int>` (default 300), `--once`, `--reset` (`pr-watch.py:86-92`) |
| stdout | `json.dumps({"head","quiet_for","new":[…]}, indent=1)` once, then return (`:128`) |
| Item shape | `{kind: "comment"\|"review", id: "c<id>"\|"r<id>", author, state, path, line, body, collapsed_sections[], url, created_at}` (`:67-81`) |
| Exit | 0 on a printed result; **1** with `pr-watch: <msg>` on stderr for any `gh` failure (`:106-108`, `:116-118`) |
| Files | reads/writes `<root>/.claude/pr-watch/<pr>.json` = `{"seen":[…],"head":…,"checked_at":…}`; `os.makedirs(exist_ok=True)` (`:94-100`, `:126-127`) |
| Subprocesses | `gh repo view --json nameWithOwner -q .nameWithOwner`; `gh pr view <n> --json headRefOid -q .headRefOid`; `gh api repos/<slug>/pulls/<n>/comments --paginate`; `gh api …/reviews --paginate` — all `timeout=60` (`:42-62`, `:67`, `:74`) |
| Sleep | `time.sleep(a.interval)` at the bottom of the poll loop (`:130`) |
| Quiet-window rule | `quiet_since` resets whenever `head` differs from the previous poll; returns when `new` is non-empty, or `--once`, or `quiet_for >= quiet_after` (`:110-129`) |
| Regex | `DETAILS_RE = re.compile(r"<details>(.*?)</details>", re.S \| re.I)` + `findall` (`:39`, `:79`) |

#### `docs-only.py` — 138 lines — port difficulty **3/5**

| Aspect | Contract |
| --- | --- |
| stdin | not read |
| argv | `--base <ref>` (required), `--pr`, `--branch`, `--grant` (`docs-only.py:89-93`) |
| stdout | `json.dumps({"docs_only","base","head","files":[{"path","class","why"}], ["granted"]}, indent=1)` (`:119-133`) |
| Exit | **0** docs-only, **3** not docs-only, **1** git error (`docs-only: <stderr>` on stderr) (`:98-100`, `:134`) |
| Files written (only with `--grant` + docs_only + `--pr` + `--branch`) | appends 3 regex lines to `.claude/rule-zero.grants` and one `standing-rule\tdocs-only\torchestrator\t-\tPR … \tgrant written` line to `.claude/rule-zero.log` (`:120-131`) |
| Subprocesses | `git rev-parse HEAD`; `git diff --name-status <base>...HEAD`; per-file `git diff -U0 --no-color <base>...HEAD -- <path>` — all `timeout=60` (`:46-50`, `:73`, `:96-97`) |
| Classification tables | `DOC_EXT` 5 extensions; `DOC_DIRS = ("docs/","mem/")`; `COMMENT` 5 markers over 47 extensions; `BLOCK_OK`; `SPECIAL_NAMES = {"Dockerfile":"#","Makefile":"#","CLAUDE.md":None}` (`:33-43`) |
| Hard rules | `A`/`D`/`R` status on a non-doc path ⇒ code; unknown extension ⇒ code; `#!` shebang ⇒ code; empty diff ⇒ **not** docs-only (`:81`, `:109-117`) |
| Note for the port | `.ts`/`.tsx`/`.mjs`/`.cjs` are already in the `//` marker set (`:37`), so TS hook files classify exactly as the `.py` ones do today. `.claude/` is deliberately not a doc dir. |
| Measured | `--base HEAD~1` on this repo → exit **1**, `docs-only: fatal: ambiguous argument 'HEAD~1...HEAD'` (single-commit repo) | run |

### 2. Regex dialect risk

| Fact | Value | Where measured |
| --- | --- | --- |
| Active conf rules | 26 (lines 18-20, 23-28, 31-47 of `.claude/rule-zero.conf`) | parsed with the hook's own `load_conf` logic |
| Conf rules that compile as JS `RegExp` with no flags | **26 / 26** | `rxprobe.mjs`, all `OK` |
| Differential match test | 26 patterns × 50 subjects (every Bash segment, path subject and MCP subject in `CASES`) = **1300 cells, 0 differences** between `re.search` and `RegExp.prototype.test` | Python dumped a match matrix; Node compared it |
| Regex features actually used in `rule-zero.conf` | literal alternation `(a\|b)`, nesting, char classes `[a-zA-Z]`, `[^-]`, `[A-Za-z]`, quantifiers `*` `?` `+`, `.*`, `^`, `$`, `\b`, escapes `\.` `\$` `\[` `\]`. **No** inline flags, **no** named groups, **no** backreferences, **no** lookaround, **no** `\A`/`\Z`, **no** `\d`/`\w`/`\s`, **no** non-ASCII | full read of the conf |
| Hooks' own patterns | `\s`, non-capturing `(?:…)`, `re.S`, `re.I`, lookahead `(?=…)`, `\Z`, `\d`, `\*`, backtick/`[^\n]` classes, `re.escape` | `rule-zero.py:32`, `reload-plan.py:22,44,54,55`, `status-block.py:49`, `pr-watch.py:39` |

**Loud differences (JS throws — the existing fail-closed handler at `rule-zero.py:57-60` already converts these into a "fix the config" deny):**

| Python feature | JS result | Measured |
| --- | --- | --- |
| `(?i)abc`, `(?s)`, `(?m)`, `(?x)` inline flags | `SyntaxError: Invalid group` | probe #9 |
| `(?P<n>a)` named group | `SyntaxError: Invalid group` (JS spells it `(?<n>a)`, which is `OK`) | probes #10, #11 |
| `(?P=n)` backreference | `SyntaxError` (JS spells it `\k<n>`) | probe #11 |
| `(?>a)` atomic group (Py 3.11+) | `SyntaxError: Invalid group` | probe #16 |
| `a++` possessive (Py 3.11+) | `SyntaxError: Nothing to repeat` | probe #17 |
| `(?#comment)` | `SyntaxError: Invalid group` | probe #18 |

**Silent differences (JS compiles but means something else — this is the dangerous class, nothing catches it):**

| Python | JS | Measured |
| --- | --- | --- |
| `\A` = start of string | identity escape = **literal `A`**; `/\Aabc/.test("abc")` **false**, `.test("Aabc")` **true** | probe #12 |
| `\Z` = end of string | **literal `Z`**; `/abc\Z/.test("abc")` **false** | probe #13 |
| `\z` (invalid in Python `re`) | **literal `z`** | probe #14 |
| `$` matches before a single trailing `\n` (`re.search(r"x$","x\n")` → **True**) | `/x$/.test("x\n")` → **false** (only `m` makes it true) | Python + probe #15 |
| `\b`/`\w` are Unicode-aware for `str` patterns | ASCII-only: `/\bcafé\b/.test("café")` → **false** | probe #20 |
| `\s` set | JS includes `\ufeff`, excludes `\u001c`-`\u001f`; both include `\u00a0` | probe #26 |
| Variable-length lookbehind | Python raises, JS accepts `(?<=a+)b` — JS is *more* permissive, so no conf breaks | probe #19 |

**The `u`/`v` flag decision (the single most load-bearing choice in the port):**

| Pattern (all produced by `re.escape` today) | `new RegExp(p)` | `new RegExp(p,"u")` |
| --- | --- | --- |
| `a\ b` | OK | **SyntaxError: Invalid escape** |
| `a\-b` (from `re.escape("feat/npx-ts-kit")` → `feat/npx\-ts\-kit`) | OK | **SyntaxError** |
| `a\#b`, `a\~b`, `a\&b` | OK | **SyntaxError** |
| `\q` unknown escape | OK (literal `q`) | **SyntaxError** |
| `a{b`, `a]b` lone brackets | OK | **SyntaxError** |

⇒ The port **must** compile conf lines and grant lines with **no flags** (`new RegExp(pat)`), never `u` or `v`. With that choice, every existing `rule-zero.conf` and every `.claude/rule-zero.grants` line Python has ever written stays valid.

**`re.escape` vs `RegExp.escape`** (both exist in this environment; they are not interchangeable):

| Input | Python `re.escape` | Node 24 `RegExp.escape` |
| --- | --- | --- |
| `feat/x` | `feat/x` | `\x66eat\/x` |
| `12` | `12` | `\x312` |
| `1.2` | `1\.2` | `\x31\.2` |
| `a b` | `a\ b` | `\x61\x20b` |
| `feat/npx-ts-kit` | `feat/npx\-ts\-kit` | (leading-char hex form) |

`RegExp.escape` always hex-escapes the first character and escapes `/`. Grants files are read and hand-edited by the owner and quoted into plan documents, so the port must hand-roll a `pyEscape()` matching Python 3.7+ semantics (escape everything outside `[A-Za-z0-9_]` **except** ASCII letters/digits/underscore — concretely Python escapes `()[]{}?*+-|^$\.&~# \t\n\r\v\f` and leaves `/`, `:`, `,`, `=`, `<`, `>`, `!`, `@`, `%`, `"`, `'`, backtick alone).

**Latent conf trap to preserve or fix:** `load_conf` only skips lines whose **first** character is `#`; it does not strip trailing comments. The commented example at `rule-zero.conf:57` is `guard ^tool:mcp__vendor__(create|update|delete)   # MCP tools are judged as "tool:<name> <input json>"` — uncommenting it makes the whole trailing comment part of the regex. It compiles in both engines and matches nothing useful.

### 3. What a TS self-test must change

| Change | Detail |
| --- | --- |
| Spawn line | `[sys.executable, HOOK]` → `spawnSync(process.execPath, [HOOK_TS], {input, encoding:"utf8", env:{…process.env, CLAUDE_PROJECT_DIR:project}, cwd:project, timeout:10000})`. `process.execPath` is the exact analogue of `sys.executable`; no `npx`, no loader flag needed on ≥22.18. |
| Same for `--bundle` | `[sys.executable, HOOK, "--bundle", …]` with `check=True` → check `status === 0` manually (`spawnSync` does not throw). |
| Case table | Keep all **57** tuples verbatim; they are pure data (`label, tool, tool_input, context, expected`). |
| Sandbox | `tempfile.mkdtemp` → `fs.mkdtempSync(path.join(os.tmpdir(), "rule-zero-selftest-"))`; `os.makedirs` → `fs.mkdirSync(…,{recursive:true})`; `shutil.copy` → `fs.copyFileSync`; `shutil.rmtree(ignore_errors=True)` → `fs.rmSync(d,{recursive:true,force:true})` in a `finally`. |
| Timeout semantics | Python `subprocess.run(timeout=10)` raises `TimeoutExpired`; `spawnSync` returns `{error, signal:"SIGTERM"}` — the port must treat that as `"error"`, not as silence, or a hung hook reads as PASS. |
| **New cases to add** | A dialect guard the Python suite cannot have: a conf/grant line containing `\-` and `\ ` (must still match — proves no `u` flag), a line containing `(?i)` (must produce the "not a valid regex" deny, not a crash), and a line containing `\Z` (documents that it is now a literal `Z`). |
| README/CI line | `python3 .claude/hooks/rule-zero-selftest.py` printing `52/52` → `node .claude/hooks/rule-zero-selftest.ts` printing `57/57`. The `52` in `README.md:16` and `README.md:36` is already wrong at HEAD. |
| Windows | If `path-fence` gains a self-test, it must run on both separators — the current Python code passes on POSIX and fails on Windows. |

### 4. Every `python3` / `.py` call site to update

Measured by `grep -rn 'python3|\.py\b'` across the repo. **Note:** four tracked files at the repo root are byte-identical duplicates of canonical files (`diff -q` → identical): `SKILL.md` ≡ `.claude/skills/contribute/SKILL.md`, `agent-workflow.md` ≡ `docs/guides/agent-workflow.md`, `docs-only.py` ≡ `.claude/hooks/docs-only.py`, `pr-watch.py` ≡ `.claude/hooks/pr-watch.py`. **They are in `git ls-files` and must be updated or deleted too**, or the port ships stale Python at the repo root.

**Executable call sites (break if not updated):**

| File:line | Current | Needed |
| --- | --- | --- |
| `.claude/settings.json:12,14` | `"command": "python3"`, args `…/rule-zero.py` | `"command": "node"`, args `…/rule-zero.ts` |
| `.claude/settings.json:28,30` | `python3` + `status-block.py` | `node` + `status-block.ts` |
| `.claude/settings.json:43,45` | `python3` + `reload-plan.py` | `node` + `reload-plan.ts` |
| `.claude/agents/investigator.md:12,13` | `command: "python3"`, args `[…/path-fence.py, "docs/reviews"]` | `command: "node"`, args `[…/path-fence.ts, "docs/reviews"]` |
| `.claude/hooks/rule-zero-selftest.py:20` | `HOOK = os.path.join(HERE, "rule-zero.py")` | `rule-zero.ts` |

**Documentation call sites (commands the orchestrator copies verbatim):**

| File:line(s) | What |
| --- | --- |
| `.claude/skills/contribute/SKILL.md` | `:81` `--grant`; `:188` `pr-watch --reset`; `:202` `pr-watch.py` prose; `:207` `docs-only --grant`; `:217` `docs-only.py` prose; `:222` `--bundle merge-cleanup`; `:228` `--clear`; `:231` `docs-only.py` prose |
| `README.md` | `:15-21` the file listing (all seven names); `:33` "Requires `python3` on PATH (no other dependency)"; `:36` the self-test command **and the wrong `52/52`**; `:73,74` claim table; `:89,90` phase summary |
| `docs/guides/agent-workflow.md` | `:43` enforcement row; `:72` rule-zero hook path; `:86` `--grant`; `:94` self-test command; `:343` `pr-watch.py`; `:383` `--bundle`; `:392` `docs-only.py`; `:494,495` appendix table |
| `.claude/rules/process.md` | `:19` `--grant`/grant commands; `:31` `docs-only.py` |
| `.claude/rule-zero.conf` | `:1` header comment "read by `.claude/hooks/rule-zero.py`" |
| `mem/outstanding.md` | `:39` settled decision cites `docs-only.py` |
| root duplicates | `SKILL.md:81,188,202,207,217,222,228,231`; `agent-workflow.md:43,72,86,94,343,383,392,494,495`; `docs-only.py` (whole file); `pr-watch.py` (whole file) |
| `CLAUDE.md` | **no** `python3`/`.py` reference — nothing to change |
| `.claude/.gitignore` | **every one of its four patterns is inert** — see Observations. Also does not list `__pycache__`, which is why `.claude/hooks/__pycache__/` is untracked-dirty at HEAD. The port deletes the `__pycache__` problem outright. |

### 5. Python stdlib → `node:*` equivalents

| Python | Node builtin | Risk |
| --- | --- | --- |
| `json.load(sys.stdin)` | read `process.stdin` to EOF then `JSON.parse` | No sync stdin read in ESM; either `fs.readFileSync(0,"utf8")` (works, throws `EAGAIN` on a TTY) or an async `main()`. `json.load` also accepts a JSON *scalar*; `JSON.parse` does too. |
| `json.dumps(x)` | `JSON.stringify(x)` | Python defaults `ensure_ascii=True` → `\u2014` for the em-dashes in every deny reason; JS emits raw UTF-8. Measured. Cosmetic for Claude Code, but the log/stdout bytes change. |
| `json.dumps(x, indent=1)` | `JSON.stringify(x,null,1)` | **Byte-identical** for the `docs-only`/`pr-watch` payload shapes. Measured. |
| `json.dumps(x, separators=(",",":"))` | `JSON.stringify(x)` | Same text, **except key order**: JS reorders integer-like keys (`{"2":…,"1":…}` → `1` first), Python preserves insertion order. Measured. Only affects the MCP subject string. |
| `re` | `RegExp` | See §2. No `u`/`v` flag. `re.S`→`s`, `re.I`→`i`, `re.M`→`m`. `\Z` → `$` (no `m`). |
| `re.escape` | none usable (`RegExp.escape` differs) | Hand-roll `pyEscape()`. |
| `re.split(rx, s)` | `s.split(rx)` | Must keep the group **non-capturing** — a capturing group makes JS interleave the delimiters. Measured: `"a && b".split(/\s*(&&|…)\s*/)` → `["a","&&","b"]`. |
| `re.findall` with ≥2 groups | `[...s.matchAll(/…/g)]` | Needs the `g` flag or `matchAll` throws. |
| `os.environ.get` | `process.env.X` | `process.env` returns `undefined`, not `None`; `?? ` chains work. |
| `os.getcwd()` | `process.cwd()` | — |
| `os.path.join` | `path.join` | **`path.join` normalises separators; `os.path.join` does not.** This is exactly the `path-fence` Windows bug — `path.join` actually *fixes* it. |
| `os.path.realpath(p)` (non-strict) | `fs.realpathSync(p)` | **`fs.realpathSync` throws `ENOENT` on a non-existent path; Python's does not.** Measured. Both `rule-zero` (`:91`) and `path-fence` (`:31`) resolve paths that usually do not exist yet (a `Write` to a new file). Port must use `path.resolve()` plus, optionally, `realpathSync` on the nearest existing ancestor, in a `try`. |
| `os.path.expanduser("~/x")` | none | Hand-roll: replace a leading `~` (or `~/`) with `os.homedir()`. Measured: `path.resolve(cwd,"~/.zshrc")` keeps a literal `~` directory. |
| `os.sep` | `path.sep` (`"\\"` on Windows) | — |
| `os.path.basename` / `splitext` / `relpath` / `dirname` | `path.basename` / `path.extname` / `path.relative` / `path.dirname` | `path.extname("x")` → `""`, matches Python. |
| `os.path.exists` | `fs.existsSync` | — |
| `os.makedirs(p, exist_ok=True)` | `fs.mkdirSync(p,{recursive:true})` | — |
| `open(p, encoding="utf-8").read()` | `fs.readFileSync(p,"utf8")` | — |
| `open(p,"a")` / `open(p,"w")` | `fs.appendFileSync` / `fs.writeFileSync` | **Line endings:** Python text mode translates `\n`→`\r\n` on Windows; Node writes `\n` verbatim. A grants/log file half-written by each would be mixed. Self-consistent either way. |
| `glob.glob("docs/plans/*/plan.md")` | `fs.globSync(pattern,{cwd})` | Available and non-experimental in v24.4.1 (`typeof fs.globSync === "function"`, measured). Returns platform separators and unsorted results — both hooks already `sorted()`, so sort explicitly. |
| `subprocess.run([...], capture_output=True, text=True, timeout=N)` | `child_process.spawnSync(cmd,args,{encoding:"utf8",timeout:N*1000})` | `spawnSync` never throws on non-zero exit; check `.status`. On timeout it returns `.error` + `.signal`, it does not throw. On Windows `gh`/`git` resolve fine without `shell:true`; **do not** set `shell:true` (re-introduces quoting bugs). |
| `subprocess.run(..., input=…)` | `spawnSync(…, {input})` | — |
| `sys.executable` | `process.execPath` | — |
| `sys.exit(n)` | `process.exit(n)` | Prefer `process.exitCode = n` + return so buffered stdout flushes; `process.exit` can truncate a large piped stdout. Relevant to `pr-watch`/`docs-only`, whose payloads can be large. |
| `sys.stderr.write` | `process.stderr.write` | — |
| `tempfile.mkdtemp(prefix=…)` | `fs.mkdtempSync(path.join(os.tmpdir(),prefix))` | `os.tmpdir()` measured as `C:\Users\KEATON~1\AppData\Local\Temp`. |
| `shutil.copy` / `shutil.rmtree(ignore_errors=True)` | `fs.copyFileSync` / `fs.rmSync(p,{recursive:true,force:true})` | — |
| `argparse` | `util.parseArgs` | Available (measured). **No** `required=`, **no** `type=int`, **no** auto-help, **no** `dest` renaming — `--quiet-after` becomes `values["quiet-after"]`; validate and `Number()` by hand, and reproduce argparse's exit-2-on-missing-`--pr`/`--base`. |
| `time.time()` | `Date.now()/1000` | — |
| `time.sleep(n)` | none synchronous | `await new Promise(r=>setTimeout(r,n*1000))` in an async `main` (cleanest for `pr-watch`), or `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)` for a true sync sleep (measured working). |
| `datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")` | `new Date().toISOString().slice(0,19)+"Z"` | Byte-identical (measured `2026-08-25T16:01:01Z`). |
| `set` / `\|=` | `Set` / `for…of add` | `sorted(seen)` → `[...seen].sort()` (identical for ASCII ids). |
| `str.partition(" ")` | `indexOf(" ")` + two `slice`s | Must reproduce the "no space ⇒ whole line is the verb, empty pattern ⇒ skip" branch (`rule-zero.py:53-56`). |
| `str.strip("/")` | hand-roll | `String.trim()` only strips whitespace; there is no character-set strip. |
| `s[:500]` / `s[:200]` | `s.slice(0,500)` | Python slices by code point, JS by UTF-16 unit — differs only for astral characters in an MCP tool input. |
| `os.path.realpath(os.environ.get("TMPDIR","/tmp"))` | `path.resolve(process.env.TMPDIR ?? "/tmp")` | On Windows both resolve `/tmp` to `C:\tmp`; that is why the `write to /tmp` self-test case passes here. Keep the behaviour rather than "fixing" it, or that case flips. |
| `__pycache__` | n/a | Disappears with the port. |

**Node native TypeScript constraints (all measured on v24.4.1):**

| Constraint | Evidence |
| --- | --- |
| Type stripping is on by default; `node file.ts` just runs | `node ok2.ts` → `strip ok guard 3`, exit 0 |
| `enum` rejected | `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode` |
| Constructor parameter properties rejected | `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript parameter property is not supported` |
| ESM and CJS both work with no `package.json` (syntax detection) | `esm.ts` (import + top-level `await`) exit 0; `cjs.ts` (`require`) exit 0 |
| Sibling imports must use the **`.ts`** extension | `import … from "./lib.ts"` → works; `"./lib.js"` → `ERR_MODULE_NOT_FOUND` |
| ⇒ safe subset | type aliases, `interface`, annotations, generics, `as`, `satisfies`, non-null `!`, `declare`. No `enum`, no `namespace`, no parameter properties, no decorators. |

## Observations

- **All three settings.json hooks are currently inert on this machine.** `python3` resolves to the Microsoft Store App Execution Alias, which exits 49 with an install prompt. Claude Code treats a hook that cannot start as a non-blocking error and lets the tool call proceed — exactly the failure mode `README.md:39-41` warns about. The rule-zero gate, the status-block gate and the investigator's path fence are all silently open right now. That is the strongest argument for the port: `node` is on PATH, `python3` is not.
- **`path-fence.py` is a second, independent inertness on Windows** — and it fails *closed*, not open, so the moment `python3` is fixed on a Windows box the investigator agent can write nothing at all, including its own report. The fix is one line (`path.join`/`path.resolve` normalise separators where `os.path.join` does not), and the port gets it for free.
- **The README's "52 cases" is stale in two places** (`README.md:16` and `:36`). `CASES` holds 57 and the run prints `57/57 cases passed; 37 lines logged to rule-zero.log`. Whatever the port does, that number should be derived from the table, not written in prose.
- **`.claude/.gitignore` does not ignore anything it names.** Its four lines are `.claude/rule-zero.grants`, `.claude/rule-zero.log`, `.claude/worktrees/`, `.claude/pr-watch/`. A pattern containing a slash in a nested `.gitignore` is anchored to *that file's directory*, so these resolve to `.claude/.claude/…` and never match. Measured: I triggered one deny while probing, `.claude/rule-zero.log` appeared as `??` in `git status`, and `git check-ignore -v .claude/rule-zero.log` exited **1** (not ignored). The four lines should be `rule-zero.grants`, `rule-zero.log`, `worktrees/`, `pr-watch/`. This is orthogonal to the port but lands in the same files, and today a routine session can commit the grants file — which is the audit record of owner "yes"es — into the repo. (I removed the log file my probe created; the working tree is as I found it.)
- **Four tracked duplicate files sit at the repo root** — `SKILL.md`, `agent-workflow.md`, `docs-only.py`, `pr-watch.py` — byte-identical to their canonical copies. They are in `git ls-files`, so a port that only touches `.claude/` and `docs/` ships two stale Python scripts and two stale command lists at the repo root. Worth deciding deliberately (delete vs. update) rather than discovering at review.
- **The conf's fail-closed regex handler is the port's safety net for the loud dialect errors.** `rule-zero.py:57-60` already turns a `re.error` into a deny naming the line number; the TS version needs the identical `try/catch` around `new RegExp(pat)` so `(?i)…` in a user's conf produces "rule-zero.conf line N is not a valid regex … Fix the config" instead of an unhandled throw (which, being a crash, would fail *open*). The grants loop at `:158-162` deliberately *skips* a bad grant line instead of denying — preserve that asymmetry.
- **`docs-only.py`'s own tables already handle the port.** `.ts`/`.tsx`/`.mjs`/`.cjs` are in the `//` marker set at `:37`, so a comments-only change to a ported hook classifies exactly as a `.py` one does. Nothing in the docs-only logic needs to change for the port, and the `.py` entries should stay for other repos.
- **Two invariants the port could quietly break and no existing test would catch:** the grants-file rewrite removes *every* line equal to the consumed one (`rule-zero.py:164`), and `first("allow", …)` `continue`s the whole segment loop rather than falling through to `guard`. Both are behavioural, both are unobserved by the 57 cases.
- **Exit-code minimalism is a feature.** Only `status-block` (2) and `docs-only` (0/3/1) and the two CLIs use exit codes; `rule-zero` and `path-fence` express deny purely through stdout JSON at exit 0. A TS port that reaches for `process.exit(1)` on an internal error turns a deny into a fail-open. Every catch site must decide, explicitly, deny-or-silent.

## Not done / could not measure

- **`.claude/rule-zero.grants` was empty at HEAD** (`--list` → `(no unused grants)`) and the file is gitignored, so I could enumerate the regex dialect of *conf* lines exhaustively but had to reason about grant lines from the two generators (`rule-zero.py --bundle`, `docs-only.py --grant`) and the self-test's literals. Owner-authored ad-hoc grants from past sessions were not available to test.
- **I did not run `pr-watch.py` against a real PR** — no PR exists on this checkout and that would be a live read the brief did not authorise. Its contract is read from the source, not exercised.
- **I did not run `docs-only.py` against a real two-commit diff** — the repo has a single commit, so `--base HEAD~1` errors. I confirmed the exit-1 git-error path but not the exit-0/exit-3 classification paths.
- **I did not verify hook behaviour inside a live Claude Code subagent** (`agent_id`/`agent_type` actually populated, deny holding under `bypassPermissions`). `mem/outstanding.md:10-14` already lists those as open engineering follow-ups, and they are unchanged by the port.
- **POSIX behaviour is inferred, not measured.** Every measurement here is on Windows 11 / Node v24.4.1 / Python 3.13.5. The `path-fence` separator bug and the `/tmp` → `C:\tmp` resolution are Windows-specific; I could not run the suite on Linux or macOS to confirm the port behaves identically there.
- **I did not benchmark a TS hook's cold start** against the 10 s `PreToolUse` timeout in `settings.json:16`. Node startup is generally comparable to Python's, and the whole Python self-test (58 spawns) takes 3.3 s, but the ported per-call latency is unmeasured.

## Live reads taken

None.
