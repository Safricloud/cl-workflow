# Phase 2 — 1 implementer, serial (2026-08-25-npx-ts-kit)

**Plan:** `plan.md` · **Starts from:** merged, verified phase 1
**Magnet files this phase touches:** none (all new files under `template/.claude/hooks/`)

### Item 2.1 — Hooks core: shared lib, rule-zero, self-test
**Files:** `template/.claude/hooks/lib.ts` (new), `template/.claude/hooks/rule-zero.ts` (new),
`template/.claude/hooks/rule-zero-selftest.ts` (new).
**Approach:** Port `template/.claude/hooks/rule-zero.py` and its self-test to erasable-only
TypeScript, zero dependencies, `node:` builtins only, sibling imports with explicit `./lib.ts`
extension. The Python originals in `template/` stay in place this phase (phase 3.3 deletes
them). Contracts from `investigation-hooks.md` — read it first, it has the full I/O table:
- `lib.ts`: stdin-JSON reader; conf parser (verb + pattern per line, `deny > allow > guard`
  precedence); pattern compile as `new RegExp(p)` **without `u`/`v` flags**, `try/catch` →
  a pattern that does not compile is handled fail-closed exactly as the Python does;
  `pyEscape()` hand-rolled to match Python `re.escape` output (NOT `RegExp.escape` — measured
  unusable); Bash segment splitting on `&& || ; | \n`; grants file read/consume/append-log
  helpers preserving the existing file formats byte-for-byte.
- `rule-zero.ts`: the PreToolUse gate — deny/allow/guard per segment, MCP tools judged as
  `tool:<name> <input>`, single-use grant consumption with `grant-used` log line, CLI verbs
  `--grant`, `--bundle merge-cleanup <n> <branch>`, `--list`, `--clear`. **The deny channel is
  stdout JSON at exit 0** — every error path must still emit the deny JSON and exit 0; never
  let an exception become a bare non-zero exit (fail-open). `\A/\Z/\z` are letters in JS, `$`
  stops matching before trailing newline — do not "fix" conf patterns; compile as-is.
- `rule-zero-selftest.ts`: port all **57** case tuples verbatim (they are pure data), invoke
  the hook by subprocess (`process.execPath` + the `.ts` path), `spawnSync` returns rather
  than throws on timeout — handle honestly; keep the negative control (a missing guard line
  makes it go red); print `57/57` and exit 0 on green.
**Conventions that will fail your lint:** `tsc --noEmit` under `erasableSyntaxOnly` — no
enums, no namespaces, no parameter properties; `import type` for types; LF endings.
**Scoped validation:** `pnpm typecheck`;
`node template/.claude/hooks/rule-zero-selftest.ts` → `57/57`, exit 0;
`echo '{"tool_name":"Bash","tool_input":{"command":"git reset --hard"}}' | node template/.claude/hooks/rule-zero.ts`
emits the guard-deny JSON at exit 0; same for an allow line and a no-match; `--grant` then the
guarded command → allowed once, grant gone, `grant-used` in the log (run in a scratch copy so
the live `.claude/` log is untouched).
**Acceptance:** selftest 57/57 both on this Windows machine and under `bash`; reverting
`rule-zero.ts` while keeping the selftest makes it fail (the subprocess target is gone);
existing `rule-zero.conf` from phase 1's template works unmodified.
#### Status — item 2.1
**Done** — 2026-08-25. `template/.claude/hooks/lib.ts`, `rule-zero.ts`, `rule-zero-selftest.ts`
added; the `.py` originals untouched (phase 3.3 deletes them). Commits `c8b2f6c` (lib),
`ea74f13` (gate), `36f023e` (self-test), plus this status commit. Node v24.4.1, TypeScript
6.0.3, Windows 11.

**Scoped validation — actual outputs**
- `pnpm typecheck` → `tsc --noEmit`, no diagnostics, **exit 0**.
- `node template/.claude/hooks/rule-zero-selftest.ts` → `57/57 cases passed; 37 lines logged to
  rule-zero.log`, **exit 0** — byte-identical to the Python original's line on the same conf
  (`python rule-zero-selftest.py` → same 57/57, same 37). Green three ways: Git Bash,
  PowerShell, `pnpm selftest`.
- Hook stdin fixtures, all against a scratch project under `%TEMP%` with `CLAUDE_PROJECT_DIR`
  pointed at it — the worktree's `.claude/` was never written to (`git status` clean but for
  the three new files):
  - guard, no grant (`git reset --hard`) → **exit 0** + deny JSON, reason `Rule zero
    (rule-zero.conf:33 guard git reset --hard) — this needs the owner's explicit yes. …`
  - allow line (`git add -A`) → no stdout, **exit 0**; no match (`npm test`) → no stdout, **exit 0**
  - deny line (`rm -rf ~`) → **exit 0** + `Rule zero — never by an agent (rule-zero.conf:18 deny
    rm -[a-zA-Z]*r[a-zA-Z]* +(/|~|\$HOME)/?( |$)). …`
  - sub-agent + guard (`agent_id` set) → **exit 0** + the sub-agent deny; malformed stdin →
    **exit 0** + the parse deny; missing conf → **exit 0** + the not-found deny
- `--grant '^git reset --hard$'` → written; the guarded command then silent at **exit 0**; grants
  file empty; `--list` → `(no unused grants)`; log line
  `grant-used<TAB>orchestrator<TAB>unknown<TAB>git reset --hard<TAB>^git reset --hard$`; the retry
  denies again. `--bundle merge-cleanup 12 feat/npx-ts-kit` → `^gh pr merge 12\b`,
  `^git push origin --delete feat/npx\-ts\-kit$`, `^git branch -D feat/npx\-ts\-kit$` (exit 0);
  `--clear` → `cleared 3 grant(s)` (exit 0); `--nope` → usage on stderr, **exit 2**;
  `--grant '('` → stderr `rule-zero: Invalid regular expression: /(/: Unterminated group`, **exit 1**.

**Differential evidence (beyond the contract).** A harness ran the `.py` and the `.ts` hook side
by side in matched scratch projects over 32 payload shapes, 6 grant-file shapes and 5 CLI
invocations: **43/43 identical** on verdict, deny reason, resulting grants file and log lines
(timestamps aside). The grant shapes include `\-`, `\ `, `\#\~\&` — the evidence that compiling
without the `u` flag is right — plus the uncompilable-grant-is-skipped and
duplicate-lines-both-removed invariants the 57 cases never touch. `--bundle merge-cleanup 1.2
'a b#c~d&e'` produced byte-identical grants, checking `pyEscape` against `re.escape` directly.

**Checker verification** (throwaway copies, worktree untouched): delete `rule-zero.ts` → the
self-test exits **1**; mute the deny channel by one line → **27/57 + NEGATIVE CONTROL FAILED**,
exit 1. A conf line JS cannot compile (`(?i)…`, `(?P<n>…)`, `a++`, `(?#…)`) → deny at **exit 0**,
never a crash.

**Deviations — veto in the PR**
1. **Three inputs fail closed where Python fails open.** A non-object payload, a non-string
   `tool_name`, and a `permission_mode` present-but-null all raise in Python → traceback → exit 1
   → Claude Code treats the hook as a non-blocking error and lets the call through. Hook mode
   here is wrapped in a try/catch that emits a deny at exit 0 instead. This is the plan's
   non-negotiable, so it is deliberate, but it is a behaviour change.
2. **Deny-JSON bytes differ cosmetically.** `json.dumps` defaults to spaced separators and
   `ensure_ascii=True` (`—` for the em-dashes); `JSON.stringify` is compact and raw UTF-8.
   Same parsed value on a channel that is always JSON-parsed — flagged as cosmetic in
   investigation-hooks.md §5. Grants and log bytes are unaffected (ASCII).
3. **Grants/log written LF, not CRLF.** Python's text mode writes CRLF on Windows. `readLines()`
   reproduces Python's universal-newline read, so a legacy CRLF grants file is consumed
   identically; new writes are LF, consistent with the kit's `eol=lf` policy. The investigation
   records this as self-consistent either way.
4. **Four regex features Python 3.13 accepts do not compile in JS** — `(?i)`, `(?P<n>…)`, `a++`,
   `(?#…)`. In a `guard`/`deny` line the verdict is unchanged (deny either way, different
   reason: "rule-zero.conf line N is not a valid regex"). In an `allow` line JS would deny where
   Python allowed — fail-closed and loud, which is the safe direction, but worth knowing. No
   shipped conf line uses any of them. Conf-error reason text is the JS engine's, not Python's.
5. **CLI text.** Usage names `rule-zero.ts`; an invalid `--grant` regex exits 1 with a one-line
   stderr message rather than a Python traceback (same exit code, same channel).
6. **The investigation's three suggested new self-test cases were NOT added** (§3 "New cases to
   add": a `\-`/`\ ` dialect guard, a `(?i)` conf line, a `\Z` line). The item contract pins "all
   57 case tuples verbatim" and the scoped validation requires `57/57`, and adding cases would
   break both. All three behaviours are measured above by the differential and checker harnesses
   instead. **Recommend a follow-up item** to fold them into the suite as cases 58–60 — the `u`
   flag is the port's single most load-bearing choice and nothing inside the suite defends it.

**Finding for phase 3.3 / phase 4 — not fixable inside this item's Files.** The ported hooks are
ESM (mandated `./lib.ts` sibling imports), so they run only where the nearest `package.json` is
`"type": "module"` or absent. Measured on v24.4.1: a consumer project whose `package.json` says
`"type": "commonjs"` makes `node .claude/hooks/rule-zero.ts` die with `SyntaxError: Cannot use
import statement outside a module`, **exit 1** — i.e. the gate is silently open in exactly the
way this port exists to end. Measured fix: ship `.claude/hooks/package.json` containing
`{"type":"module"}` (verified working inside a `"type":"commonjs"` project). That file belongs to
whoever owns the payload file list — 3.3 or `init` in phase 4.

## Merge-back record (orchestrator)
- Item 2.1: branch `worktree-agent-a46ebaacc7d35ea02`, worktree clean, 4 commits
  (`c8b2f6c`…`6468b39`) merged fast-forward to `6468b39`. No conflicts. Worktree removed
  (same node_modules two-step as phase 1), branch `-d` deleted.

## Verification (orchestrator, after this phase merged)
- `pnpm typecheck` clean; selftest run by the orchestrator: **57/57, exit 0**.
- Checker inversion by the orchestrator: `rule-zero.ts` moved aside → selftest **exit 1**;
  restored → 57/57. (`mv`, not the guarded `git checkout --`.)
- Live fixtures by the orchestrator against a scratchpad project: `git reset --hard` →
  deny JSON naming `rule-zero.conf:33` at **exit 0**; `git add -A` → silent **exit 0**.
- Deviations 1–5 accepted (1 is the plan's own non-negotiable; 2–5 cosmetic or the safe
  direction). Deviation 6 → **phase-2.5.md** (cases 58–60). ESM finding → item 3.3 amended to
  ship `.claude/hooks/package.json` (`{"type":"module"}`).
