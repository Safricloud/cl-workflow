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
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)

## Verification (orchestrator, after this phase merged)
