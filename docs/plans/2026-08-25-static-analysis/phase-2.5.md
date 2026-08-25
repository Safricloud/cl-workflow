# Phase 2.5 — 1 implementer, serial (2026-08-25-static-analysis)

**Plan:** `plan.md` → *Decisions made mid-loop*, the path-fence entry · **Starts from:** merged,
verified phase 2 (`da2d852`)
**Magnet files this phase touches:** `template/.claude/hooks/lib.ts` (imported by every hook),
`src/cli.ts` + `dist/cli.js`, `README.md`, `.github/workflows/ci.yml` — one item, nothing beside
it; phase 3 starts from its merged result.

**Why this phase exists.** All three phase-2 implementers, and the phase-1 one, lost the `Edit`
and `Write` tools: every call on a file inside their own worktree was denied as
`path:outside-repo` (13 denials in `.claude/rule-zero.log`). Measured cause, by the orchestrator
(probes T1–T10, log lines with `permission_mode` `probe`) and independently by items 2.2 and
2.3: `rule-zero.ts:93` decides "inside" with
`resolved.startsWith(pyRealpath(root) + path.sep)` — an exact string test — and `pyRealpath`
(`lib.ts:231`) canonicalises with plain `fs.realpathSync`, which on Windows keeps whatever
drive-letter case and 8.3 short-name spelling it was given. So `CLAUDE_PROJECT_DIR` spelled
`c:\Users\…` or `C:\Users\KEATON~1\…` against a target resolving as `C:\Users\Keaton Forrest\…`
is "outside the repo". The same comparison is at `path-fence.ts:60`. The doc comment on
`pyRealpath` ("On Windows this also expands 8.3 short names, exactly as Python's does") is
false (probe T3). The existing self-test case "edit inside worktree" passes only because both
sides of its comparison come from the same `project` string.

**You will hit the bug you are fixing.** Your `Edit`/`Write` tools will be denied on your
worktree paths. Work through Bash (`printf`, `sed`, heredocs into `git commit -F -`), as the
phase-2 implementers did; do not put the literal denial token or a guarded command shape in a
commit message or heredoc — the gate judges each line of a Bash command as a segment.

### Item 2.5.1 — Inside-repo judgement independent of path spelling on Windows
**Files:** `template/.claude/hooks/lib.ts`, `template/.claude/hooks/rule-zero.ts`,
`template/.claude/hooks/path-fence.ts`, `template/.claude/hooks/rule-zero-selftest.ts`,
`src/cli.ts`, `dist/cli.js` (rebuilt), `README.md`, `.github/workflows/ci.yml`
**Approach:**
1. `lib.ts`: `pyRealpath` canonicalises the existing ancestor with `fs.realpathSync.native`
   (measure first, and record: on this machine `realpathSync.native` of the 8.3 form
   `C:\Users\KEATON~1\Documents\GitHub\cl-workflow` and of the lowercase-drive form both return
   `C:\Users\Keaton Forrest\Documents\GitHub\cl-workflow`, while plain `realpathSync` returns
   the input spelling — if that is not what you measure, stop and report Blocked with the
   output). Add one exported helper, e.g. `isWithin(resolved: string, base: string): boolean`
   — true when `resolved` starts with `base + path.sep`, compared case-insensitively on
   `process.platform === "win32"` and exactly elsewhere. Rewrite the `pyRealpath` doc comment
   to say what is now true. Every other exported signature unchanged.
2. `rule-zero.ts`: `inside` and the `tmp` test use `isWithin`; the `/tmp` → `C:\tmp` comment
   and behaviour stay (the self-test's "write to /tmp" case still passes).
3. `path-fence.ts`: the `resolved.startsWith(allowed)` test uses `isWithin(resolved,
   path.join(base, prefix))`.
4. `rule-zero-selftest.ts`: two new cases, appended at the end of `CASES` so existing numbering
   holds, both "agent", both expected `SILENT`, both `Edit` on a file under
   `.claude/worktrees/agent-1/src/`: (61) the `file_path` absolute, spelled as `project` with the
   case of its first character flipped (a lowercase drive letter on Windows; a no-op on POSIX,
   where the case then merely passes); (62) the `file_path` absolute under
   `fs.realpathSync.native(project)` (the long form, while `CLAUDE_PROJECT_DIR` stays the
   `os.tmpdir()` spelling — 8.3 on this machine). Implement with a placeholder token in the case
   tuple that `runCase` substitutes at run time; no other case changes. `CASES.length` becomes 62.
5. `src/cli.ts`: `EXPECTED_SELFTEST_CASES = 62`; `pnpm build`; commit `dist/cli.js`.
6. `README.md` lines 20, 40, 72, 163 and `.github/workflows/ci.yml:51`: `60/60` → `62/62`,
   "60 cases" → "62 cases". Nothing else in those files. (`CLAUDE.md` is the orchestrator's;
   `docs/history/` is historical and stays.)
**Conventions that will fail your lint:** `erasableSyntaxOnly`; `node:` imports only; no `!`;
`dist/cli.js` byte-exact from `pnpm build`; LF; the root `.claude/hooks/` copy is generated —
do not touch it (phase 3 regenerates it).
**Scoped validation:**
- `pnpm install --frozen-lockfile` in your worktree first
- `pnpm selftest` — `62/62 cases passed`, exit 0
- `npx tsc --noEmit 2>&1 | grep -E 'template/|src/'` — empty (the root copy's 66 remain)
- `npx eslint --max-warnings 0 template src eslint.config.mjs` — clean
- `pnpm build && git diff --exit-code dist/` — clean after your `dist/` commit
- `node dist/cli.js init <scratchpad>/smoke25 && node dist/cli.js doctor <scratchpad>/smoke25` —
  6 passed, and the doctor line reads `self-test 62/62`
- direct probe, from the repo root of your worktree, with the payload built by
  `node -e 'console.log(JSON.stringify({tool_name:"Write",tool_input:{file_path:process.argv[1]},permission_mode:"probe"}))' "<absolute path of a file inside your worktree, long form>"`
  piped into `node template/.claude/hooks/rule-zero.ts` with `CLAUDE_PROJECT_DIR` set to (a)
  your worktree root in long form, (b) with a lowercase drive letter, (c) in 8.3 form
  (`C:\Users\KEATON~1\…`) — all three silent, exit 0
- `git grep -n -E '\b60/60\b|60 cases'` — no hits outside `docs/`
**Acceptance:** the validations above. **Must FAIL if reverted / checker verified:** with your
`lib.ts` and `rule-zero.ts` changes reverted (selftest kept), `pnpm selftest` reports the two
new cases FAIL on this Windows machine (61: `deny` where SILENT expected; 62 likewise) and
exits 1 — record the two FAIL lines verbatim; restore, 62/62. Also: with `isWithin` made
case-sensitive again on win32 only, case 61 fails and 62 passes — record it, restore.
#### Status — item 2.5.1
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- selftest 62/62 both copies after phase 3; the probes T3/T5/T7 re-run silent; the diff re-read -->
