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
*(implementer keeps this current as it works: In progress → Done | Blocked)*

## Merge-back record (orchestrator)
<!-- worktree branch, commits merged, conflicts and how resolved, worktree removed -->

## Verification (orchestrator, after this phase merged)
<!-- the comment re-read against the facts -->
