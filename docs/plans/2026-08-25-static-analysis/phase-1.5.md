# Phase 1.5 — 1 implementer, runs beside phase 2 (2026-08-25-static-analysis)

**Plan:** `plan.md` · **Starts from:** merged phase 1 (`2b0361f`) — a finding from the
orchestrator's verification of it
**Magnet files this phase touches:** none — `eslint.config.mjs` is in no phase-2 item's file
set, so this runs in parallel with phase 2.

### Item 1.5.1 — The config header names the wrong mechanism
**Files:** `eslint.config.mjs`
**Approach:** Lines 1–2 of the header comment say an `eslint.config.ts` "would need
`--experimental-strip-types` on every invocation". That is not what was measured
(investigation-eslint.md, facts "Native-TS gate condition" and "Governing flag"): Node 24 strips
types by default (`process.features.typescript === "strip"`, no Node flag), and it is **ESLint**
that refuses a `.ts` config unless it is run with `--flag unstable_native_nodejs_ts_config` (or
`ESLINT_FLAGS=…`), otherwise demanding `jiti`. Rewrite the two lines to say exactly that — for
example: `// (it is .mjs on purpose -- ESLint loads eslint.config.ts only with` /
`// --flag unstable_native_nodejs_ts_config or an installed jiti; the owner chose the flag-free file).`
Nothing else in the file changes.
**Conventions that will fail your lint:** this file is linted by `js.configs.recommended`;
LF; keep the comment lines under 100 columns like the rest of the file.
**Scoped validation:**
- `pnpm install --frozen-lockfile` in your worktree first
- `git diff --stat` shows only `eslint.config.mjs`, and `git diff` shows only comment lines
- `node --input-type=module -e 'import("./eslint.config.mjs").then(m => console.log(Array.isArray(m.default) ? "config loads: " + m.default.length + " entries" : "unexpected"))'` — prints `config loads: 3 entries`
- `pnpm lint` — the same findings as before your change (4 problems, all in the two hook
  directories, until phase 2 lands; 0 in `eslint.config.mjs`)
**Acceptance:** the validations above; the sentence is true against investigation-eslint.md.
**Must FAIL if reverted / checker verified:** not applicable to a comment — instead state in
your status block the two facts the new sentence rests on, each with the investigation line it
comes from.
#### Status — item 1.5.1
**Done** (implementer, 2026-08-25).
- **Files touched:** `eslint.config.mjs` — header comment lines 1-2 rewritten so the reason the
  config is `.mjs` names ESLint's flag, not a Node flag; two comment lines where there was one,
  no code touched.
- **Commits:** see below (worktree branch `worktree-agent-aba9cec2381a61166`)
- **Deviation:** the item's expected load-check output is wrong. `config loads: 3 entries` is the
  count of top-level elements in the source array; `defineConfig` expands the `extends:
  [tseslint.configs.recommendedTypeChecked]` block, so the loaded array is **6 entries** — before
  and after my change alike (measured on `git show HEAD:eslint.config.mjs` as well as on the
  working file). The check still does its job: the config loads, and the entry count is unchanged.
  Nothing else deviates; no lint suppressions.
- **Verified against the installed package before writing:** eslint 10.9.1 (`pnpm install
  --frozen-lockfile` in this worktree). `unstable_native_nodejs_ts_config` is the only non-test
  entry in the `activeFlags` map at `node_modules/eslint/lib/shared/flags.js:28-35`; the
  jiti-or-nothing fallback message "The 'jiti' library is required for loading TypeScript
  configuration files" is at `node_modules/eslint/lib/config/config-loader.js:142-147`. Node
  v24.4.1 reports `process.features.typescript === "strip"` with no flag, which is what
  `isNativeTypeScriptSupportEnabled()` tests at `config-loader.js:126-131`.
- **The two facts the new sentence rests on** (investigation-eslint.md, both re-measured above):
  - "Native-TS gate condition" — investigation-eslint.md:64 —
    `["strip","transform"].includes(process.features.typescript)`; Node 24.4.1 reports `"strip"`,
    so no `--experimental-strip-types` is needed and the old sentence was false.
  - "Governing flag" — investigation-eslint.md:63 — `unstable_native_nodejs_ts_config` is the
    ESLint flag that admits a `.ts` config; without it (and without jiti) ESLint throws, per
    investigation-eslint.md:62. Env form `ESLINT_FLAGS=…` at investigation-eslint.md:66.
- **Validation (scoped; full check left to the orchestrator):**
  - `pnpm install --frozen-lockfile` — lockfile up to date, 100 packages, exit 0
  - `git diff --stat` — `eslint.config.mjs` only, 2 insertions 1 deletion; `git diff` shows only
    `//` comment lines
  - the load check — `config loads: 6 entries` (see Deviation), identical on the pre-change file
  - `pnpm lint` — 4 problems, byte-identical to the pre-change run: `no-base-to-string` at
    `pr-watch.ts:114` and `no-useless-assignment` at `rule-zero.ts:198` in each of
    `.claude/hooks/` and `template/.claude/hooks/`; **0 in `eslint.config.mjs`**
  - **Checker verified:** not applicable — comment-only change, per the item. The stand-in is the
    before/after pair above: lint output and config entry count both captured before the edit and
    unchanged after it.
- **Blocked on:** nothing.
- **Orchestrator should verify:** the new sentence against investigation-eslint.md:62-66 (the
  claim is that ESLint, not Node, is the gate on this Node version); and the "3 entries" figure in
  the item, which I measured as 6 both before and after.

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- the comment re-read against the facts -->
