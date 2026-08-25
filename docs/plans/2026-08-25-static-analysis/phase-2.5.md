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
**Done** (implementer, 2026-08-25).
- **Files touched:**
  - `template/.claude/hooks/lib.ts` — `pyRealpath` canonicalises with `fs.realpathSync.native`;
    its doc comment rewritten (the old "expands 8.3 short names, exactly as Python's does" was
    false); new exported `isWithin(resolved, base)` — requires the separator, compares
    case-insensitively on `win32` and exactly elsewhere. No other exported signature changed.
  - `template/.claude/hooks/rule-zero.ts` — imports `isWithin`; `inside` and the `tmp` test use
    it. The literal `"/tmp/"` test and the `/tmp` to `C:\tmp` comment are unchanged.
  - `template/.claude/hooks/path-fence.ts` — imports `isWithin`; the allowed-prefix test is
    `isWithin(resolved, path.join(base, prefix))`; the comment about both sides going through
    `node:path` kept and extended.
  - `template/.claude/hooks/rule-zero-selftest.ts` — two cases appended at the end of `CASES`
    (no existing case or number moved); `PROJECT_FLIPPED` / `PROJECT_NATIVE` placeholder
    constants; `flipFirstCase` and `withProject` helpers; `runCase` substitutes at payload
    build. `CASES.length` = 62.
  - `src/cli.ts` — `EXPECTED_SELFTEST_CASES = 62`.
  - `dist/cli.js` — rebuilt (`pnpm build`), one line changed, committed.
  - `README.md` — lines 20, 40, 163 `60/60` to `62/62`; line 72 "60 cases" to "62 cases".
  - `.github/workflows/ci.yml` — line 51 step name `must print 60/60` to `62/62`.
- **Commits:** `20f8a16` (status block + measurement), `dec5986` (the fix), on
  `worktree-agent-a351d628dd8a8adfe`.
- **Deviation:**
  - **The item's second checker prediction does not hold on this machine, and I did not force
    it to.** The item expected that making `isWithin` case-sensitive on win32 only would fail
    case 61. Measured: **62/62, exit 0** — because `realpathSync.native` already upper-cases the
    drive letter *before* the comparison, so both sides are canonical either way. Case 61 is
    therefore a regression test for the canonicalisation, not for the case-insensitive branch,
    unless `.native` is also absent (experiment 3 below separates them cleanly). The
    case-insensitive branch is kept as the item specifies — defence in depth for `pyRealpath`'s
    fallback return, which hands back the input spelling when no ancestor resolves — but
    **nothing in the suite covers it on its own**. Veto or accept as unverified.
  - **`CLAUDE.md:18` still reads `60/60`** and is outside my Files list (the item says it is the
    orchestrator's). So the `git grep` validation below has exactly one hit outside `docs/`.
  - The smoke project at `C:\Users\KEATON~1\AppData\Local\Temp\cl-wf-smoke25` is left in place;
    removing it would be a delete outside the repo.
  - No lint suppression added.
- **Verified against the installed package before writing:** Node **v24.4.1** — the thing under
  test is the `node:fs` builtin, not a dependency. Measured from the worktree root, before any
  edit:
  - `C:\Users\KEATON~1\Documents\GitHub\cl-workflow\.claude\worktrees\agent-a351d628dd8a8adfe`
    to plain `realpathSync`: returned **unchanged**; to `.native`:
    `C:\Users\Keaton Forrest\Documents\GitHub\cl-workflow\.claude\worktrees\agent-a351d628dd8a8adfe`
  - `c:\Users\Keaton Forrest\...` (lowercase drive) to plain: returned **unchanged**; to
    `.native`: the same path with `C:`
  - the long form: both return the long form
  - `os.tmpdir()` = `C:\Users\KEATON~1\AppData\Local\Temp`; `TMPDIR` **unset** (only `TEMP` and
    `TMP` are set), so the self-test's `/tmp` escape hatch in `rule-zero.ts` cannot mask the two
    new cases — checked before relying on them.
  - typescript **6.0.3**, eslint **10.9.1**, typescript-eslint **8.68.0**, eslint-plugin-n
    **18.3.0**, @types/node **24.13.3** (`pnpm install --frozen-lockfile`, lockfile up to date).
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm install --frozen-lockfile` — "Lockfile is up to date", done in 1.9s
  - `pnpm selftest` — `62/62 cases passed; 39 lines logged to rule-zero.log`, exit 0
  - `npx tsc --noEmit 2>&1 | grep -cE 'template/|src/'` — **0** (the root copy's errors remain,
    as the item says they should)
  - `npx eslint --max-warnings 0 template src eslint.config.mjs` — exit 0, no output
  - `pnpm build && git diff --exit-code dist/` — exit 0 after the `dist/` commit
  - `node dist/cli.js init <tmp>/cl-wf-smoke25` — `init: 33 written, 0 skipped, 0 left beside as
    .new`; `node dist/cli.js doctor <tmp>/cl-wf-smoke25` — `ok     self-test 62/62` and
    `doctor: 6 passed, 0 failed`, exit 0. The smoke dir is itself an 8.3 path, so this also
    exercises the fix from a target project.
  - direct probes: payload built by `node` as
    `{"tool_name":"Write","tool_input":{"file_path":"<worktree long form>\template\.claude\hooks\probe-target.ts"},"permission_mode":"probe"}`,
    piped into `node template/.claude/hooks/rule-zero.ts` with `CLAUDE_PROJECT_DIR` set to
    (a) `C:\Users\Keaton Forrest\...\agent-a351d628dd8a8adfe`,
    (b) `c:\Users\Keaton Forrest\...\agent-a351d628dd8a8adfe`,
    (c) `C:\Users\KEATON~1\...\agent-a351d628dd8a8adfe`
    — **all three: no output, exit 0**
  - `git grep -n -E '\b60/60\b|60 cases' -- . ':!docs/'` — one hit, `CLAUDE.md:18`, out of scope
    (see Deviation); zero hits in `README.md`, `.github/`, `src/`, `template/`, `dist/`
- **Checker verified — four experiments, output recorded verbatim:**
  1. **`lib.ts` and `rule-zero.ts` reverted to HEAD, the new self-test cases kept**
     (`git show HEAD:<file> > <file>`), `pnpm selftest`:
     ```
     FAIL  edit in worktree, drive letter case flipped   expected=silent got=deny    Rule zero — sub-agents cannot take this action, with or without a grant (rule-zero.conf:49 guard ^path:outside
     FAIL  edit in worktree, long name while the root is 8.3 expected=silent got=deny    Rule zero — sub-agents cannot take this action, with or without a grant (rule-zero.conf:49 guard ^path:outside

     60/62 cases passed; 41 lines logged to rule-zero.log
      ELIFECYCLE  Command failed with exit code 1.
     ```
     exit 1. Restored: `62/62 cases passed; 39 lines logged to rule-zero.log`, exit 0.
  2. **`isWithin` made case-sensitive on win32 only** (the win32 branch put back to
     `resolved.startsWith(prefix)`): `62/62 cases passed`, exit 0 — the item predicted case 61
     would fail here; it does not. See Deviation. Restored, `62/62`.
  3. **Only the `.native` call reverted** (`fs.realpathSync(current)`), `isWithin` left
     case-insensitive — this is what separates the two halves:
     ```
     FAIL  edit in worktree, long name while the root is 8.3 expected=silent got=deny    Rule zero — sub-agents cannot take this action, with or without a grant (rule-zero.conf:49 guard ^path:outside

     61/62 cases passed; 40 lines logged to rule-zero.log
     ```
     exit 1. So case 61 is covered by *either* half and case 62 only by `.native`. Restored,
     `62/62`.
  4. **The direct probe harness can produce a deny**, so its three silences are evidence and not
     a mis-wired pipe: with the `.native` call reverted, probe (c) printed
     `{"hookSpecificOutput":{...,"permissionDecision":"deny",...,"Command: path:outside-repo C:\Users\Keaton Forrest\...\probe-target.ts"}}`
     at exit 0. Restored: silent.
- **Blocked on:** nothing I needed was denied. Two things the orchestrator should know:
  - The rule-zero denial reproduced exactly as the preamble promised, on a file in my own
    worktree, both before and **after** this fix. Exact denial: `Write` on
    `C:\Users\Keaton Forrest\Documents\GitHub\cl-workflow\.claude\worktrees\agent-a351d628dd8a8adfe\probe1.txt`
    to `Rule zero — sub-agents cannot take this action, with or without a grant
    (rule-zero.conf:49 guard ^path:outside-repo)`. **Expected, and not a failure of the fix:**
    the live session runs the *root* `.claude/hooks/` copy, which is the generated one
    (`.claude/hooks/lib.ts:236` is still `fs.realpathSync(current)`, no `isWithin`) and is phase
    3's to regenerate. Implementers get their file tools back only once phase 3 merges. Every
    edit here was made through Bash.
  - The worktree-isolation hook refuses any Bash command whose text it cannot parse: a heredoc
    body containing a `for` line (a shell keyword), an absolute Windows path anywhere in the
    command, or a body long enough to be truncated, all read as "too complex to verify". All
    edits used `head`/`tail`/`printf`/`sed` on paths relative to the worktree root for that
    reason. Worth a line in `mem/` for the next loop.
- **Orchestrator should verify:** the full check after phase 3 (`pnpm lint` over the whole repo
  including the regenerated root copy, `pnpm typecheck` at 0); `CLAUDE.md:18` `60/60` to
  `62/62`, which is yours, not mine; whether to keep the case-insensitive win32 branch of
  `isWithin` given experiment 2 shows it is not independently covered; and that an implementer
  dispatched after phase 3 actually gets `Edit`/`Write` back — that is the whole point of this
  phase and it cannot be proved from inside this worktree.

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- selftest 62/62 both copies after phase 3; the probes T3/T5/T7 re-run silent; the diff re-read -->
