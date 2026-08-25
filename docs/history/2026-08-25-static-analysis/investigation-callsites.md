# Investigation — callsites (2026-08-25-static-analysis)

**Brief:** Where, exactly, is every check command and every lint convention written down in this
repo — so that adding a lint step and widening `tsc` coverage can update every call site, and so
the kit's payload (`template/`) stays consistent with what it promises target projects?
**Scope:** `package.json`, `.github/workflows/ci.yml`, `CLAUDE.md`, `README.md`,
`docs/guides/agent-workflow.md`, `template/CLAUDE.md`, `template/docs/guides/agent-workflow.md`,
`template/.claude/**` (skill, templates, agents, rules, hooks), `template/mem/*`, `mem/*`,
`docs/history/index.md`, `docs/history/2026-08-25-npx-ts-kit/*` (precedent), `.gitattributes`,
`.gitignore`, `.claude/.gitignore`, `template/.claude/gitignore`, `src/cli.ts`, `tsconfig*.json`
**Checkout:** `f684e35015d49c9d3c39ff60bb4cc26e1ba94406`, branch `chore/2026-08-25-static-analysis`

## Answer

There are exactly **four** places where a check command is *executed* (`package.json:24-26`
scripts, `.github/workflows/ci.yml:30-48` steps) and **four** places where the same commands are
*written down as prose* for a human or an agent to run (`CLAUDE.md:14-18`, `README.md:158-164`,
`README.md:174-178`, plus `docs/guides/agent-workflow.md` / `SKILL.md` which say "full check"
abstractly and name no command). The root `CLAUDE.md:14` line already advertises
"Full check (lint + typecheck + unit)" while its command string contains **no lint at all** — it
is `pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm selftest` — so adding
ESLint makes that line true rather than requiring new prose. `tsc` coverage today is
`tsconfig.json:20-23` → `["src", "template/.claude/hooks"]`; the root **`.claude/hooks/**` is not
type-checked**, and since it is byte-identical to `template/.claude/hooks/**` (measured, 24/24
files identical) that is a duplicate rather than a gap. The word `eslint` / `oxlint` / `biome`
and the phrase "static analysis" appear **zero times** anywhere in the repo including `dist/`,
`pnpm-lock.yaml` and untracked files, and the kit promises target projects **no** lint of
`.claude/hooks/*.ts` — the only thing it tells them to put in CI is the self-test
(`README.md:23`). `template/CLAUDE.md:7` and `:12` are generic placeholders (`<cmd>`,
`<the two or three that bite most>`), so nothing in `template/` becomes true or false when this
repo gains ESLint. A future PR touching `eslint.config.ts` / `package.json` / `tsconfig.json` /
`ci.yml` is classified **code, exit 3** by `docs-only.ts` — the merge needs the owner's word.

## Facts

### 1a. Commands the repo runs on itself (executed)

| Fact | Value | Where measured |
| --- | --- | --- |
| `build` script | `tsc -p tsconfig.build.json` | `package.json:24` |
| `typecheck` script | `tsc --noEmit` | `package.json:25` |
| `selftest` script | `node template/.claude/hooks/rule-zero-selftest.ts` | `package.json:26` |
| No `lint` script exists | `scripts` block has exactly 3 keys | `package.json:23-27` |
| `devDependencies` (working tree) | `@types/node ^24.13.3`, `typescript ^6.0.3` | `package.json:28-31` |
| `packageManager` pin | `pnpm@10.27.0` | `package.json:22` |
| `engines.node` | `>=24` | `package.json:19-21` |
| `files` whitelist for the published tarball | `["dist","template"]` — an `eslint.config.*` at root would not ship | `package.json:15-18` |
| CI install step | `pnpm install --frozen-lockfile` | `.github/workflows/ci.yml:28` |
| CI typecheck step | `- run: pnpm typecheck` | `.github/workflows/ci.yml:30` |
| CI build step | `- run: pnpm build` | `.github/workflows/ci.yml:32` |
| CI drift gate | `git diff --exit-code -- dist/` (name: `dist/ drift gate`) | `.github/workflows/ci.yml:35-36` |
| CI self-test step | `- run: pnpm selftest` (name: `Self-test (must print 60/60)`) | `.github/workflows/ci.yml:38-39` |
| CI smoke step | `node dist/cli.js init "$SMOKE"` then `doctor "$SMOKE"` | `.github/workflows/ci.yml:41-48` |
| CI matrix | `[ubuntu-latest, windows-latest]`, `fail-fast: false`, Node `'24'` | `.github/workflows/ci.yml:13-26` |
| Required check name | job id and `name` both `ci-ok`, `needs: test` | `.github/workflows/ci.yml:50-61` |
| CI trigger | `pull_request: branches: [main]` only | `.github/workflows/ci.yml:4-6` |
| **A new lint step has exactly one insertion point** | between `ci.yml:30` (typecheck) and `:32` (build) — no other job runs checks | `.github/workflows/ci.yml:18-48` |

### 1b. `tsc` coverage (what "widening" means concretely)

| Fact | Value | Where measured |
| --- | --- | --- |
| `typecheck` include set | `["src", "template/.claude/hooks"]` | `tsconfig.json:20-23` |
| Root `.claude/hooks/**` is **not** in any tsconfig include | absent from both include arrays | `tsconfig.json:20-23`, `tsconfig.build.json:11-13` |
| Compiler options that act as the de-facto lint | `strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `skipLibCheck`, `forceConsistentCasingInFileNames` | `tsconfig.json:12-18` |
| Build include set (emit) | `["src"]` only, `rootDir: src`, `outDir: dist` | `tsconfig.build.json:3-13` |
| ESM shim for the hooks | `{"type":"module"}` in both copies | `.claude/hooks/package.json:1`, `template/.claude/hooks/package.json:1` |
| Installed toolchain (from the installed packages, not the manifest) | typescript `6.0.3`, `@types/node `24.13.3` | `node_modules/typescript/package.json` `"version": "6.0.3"`; `node_modules/@types/node/package.json` `"version": "24.13.3"` |
| Local runtimes | `pnpm --version` → `10.27.0`; `node --version` → `v24.4.1` | shell, cwd `/c/Users/Keaton Forrest/Documents/GitHub/cl-workflow` |

### 1c. Prose that describes the checks (repo-specific, must stay true)

| File:line | Text | Class |
| --- | --- | --- |
| `CLAUDE.md:14` | ``- Full check (lint + typecheck + unit): `pnpm typecheck && pnpm build && git diff --exit-code dist/ && pnpm selftest` `` | (iii) prose — **names lint, contains none**; the primary call site |
| `CLAUDE.md:15` | ``- Build: `pnpm build` — `tsc -p tsconfig.build.json` → `dist/cli.js`, which is committed`` | (iii) prose |
| `CLAUDE.md:16-18` | E2E = `node dist/cli.js init/doctor <tmp>/smoke`, "self-test to 60/60" | (iii) prose |
| `CLAUDE.md:7` | "TypeScript 6 compiled by `tsc`" | (iii) prose |
| `CLAUDE.md:21` | `## Conventions that will fail your lint` (heading) | (iii) prose heading; three bullets follow |
| `CLAUDE.md:22-24` | `erasableSyntaxOnly` — no enums/namespace/param-properties/decorators, in `src/` **or in `template/.claude/hooks/`**; `.ts` extension on sibling imports | (iii) convention — this is the sentence that names the tsc scope |
| `CLAUDE.md:25-26` | Zero runtime dependencies, `node:` builtins only | (iii) convention — **relevant: an ESLint devDependency is not a runtime dependency, but the sentence needs re-reading** |
| `CLAUDE.md:27-28` | LF everywhere; ``dist/cli.js`` byte-exact; "CI runs `git diff --exit-code dist/`" | (iii) convention |
| `CLAUDE.md:32-34` | Deploy `none yet`; ci.yml on `pull_request` into `main` and nothing else | (iii) prose |
| `README.md:158-164` | The **Development** fenced block: `pnpm install` / `pnpm typecheck  # tsc --noEmit over src/ and the payload's hooks` / `pnpm build` / `git diff --exit-code dist/` / `pnpm selftest` | (iii) prose — 4 command lines, no lint line |
| `README.md:156` | "Node ≥ 24, pnpm, TypeScript 6." | (iii) prose |
| `README.md:174-178` | "The `test` job is a matrix of `ubuntu-latest` and `windows-latest` on Node 24: install, typecheck, build, `dist/` drift check, self-test, and a CLI smoke test…" | (iii) prose — **an enumeration of CI steps in order; a new lint step falsifies it** |
| `README.md:20`, `:23-25` | `node .claude/hooks/rule-zero-selftest.ts # must print 60/60`; "Put that self-test in CI." | (iii) prose, aimed at target projects |
| `README.md:40` | `doctor` row: "Checks Node ≥ 24, … and runs the self-test to 60/60." | (iii) prose |
| `README.md:72` | `hooks/rule-zero-selftest.ts   proves the gate fires … (60 cases + negative control)` | (iii) prose |
| `README.md:189-190` | Verify-table rows referencing the self-test | (iii) prose |
| `docs/history/index.md:7` | "seven TypeScript hooks (60-case selftest)" | (iii) prose, historical ledger line |
| `mem/outstanding.md:27-28` | Settled: "TypeScript 6 with `tsc` is the checker; pnpm is the kit repo's package manager. (owner)" | (iii) settled decision — **`tsc` is named as "the checker"; adding ESLint sits beside it, does not replace it** |
| `mem/outstanding.md:29-31` | Settled: CLI compiled by tsc into committed dist; CI fails on drift | (iii) settled decision |

### 1d. Generic "full check" / "lint" sentences — no command named

These are the *managed* payload documents. Root and `template/` copies are byte-identical
(see fact 3), so each appears twice and any edit must be made in `template/` and re-installed.

| File:line (root) | File:line (template) | Text | Class |
| --- | --- | --- | --- |
| `.claude/skills/contribute/SKILL.md:101-102` | `template/…/SKILL.md:101-102` | "Every item: **Files**, **Approach**…, **Conventions that will fail your lint**, **Scoped validation**, **Acceptance including tests**" | (ii) payload, generic |
| `.claude/skills/contribute/SKILL.md:128` | `template/…/SKILL.md:128` | "**Verify** on the merged branch, yourself: full check and build; …" | (ii) payload, generic |
| `.claude/skills/contribute/SKILL.md:130` | `template/…/SKILL.md:130` | "the gates the package check does not cover; **verify the checker**" | (ii) payload, generic |
| `.claude/skills/contribute/templates/phase.md:9` | `template/…/phase.md:9` | `**Conventions that will fail your lint:** <the two or three that bite here>` | (ii) payload placeholder |
| `.claude/skills/contribute/templates/plan.md:34` | `template/…/plan.md:34` | `<Full check, build, E2E for the touched surfaces, …>` | (ii) payload placeholder |
| `.claude/skills/contribute/templates/pr-body.md:13` | `template/…/pr-body.md:13` | `- <full check with counts>; <E2E suites and results>; …` | (ii) payload placeholder |
| `.claude/agents/implementer.md:51` | `template/…/implementer.md:51` | "the full check after merging" | (ii) payload, generic |
| `.claude/agents/implementer.md:75` | `template/…/implementer.md:75` | "a lint suppression with its reason" | (ii) payload, generic |
| `.claude/agents/implementer.md:79` | `template/…/implementer.md:79` | "**Validation (scoped; full check left to the orchestrator):**" | (ii) payload, generic |
| `.claude/agents/implementer.md:83` | `template/…/implementer.md:83` | "**Orchestrator should verify:** <anything you could not, e.g. the full check, a new suppression>" | (ii) payload, generic |
| `docs/guides/agent-workflow.md:229-231` | `template/docs/guides/agent-workflow.md:229-231` | "**Conventions that will fail your lint**, **Scoped validation** commands, **Acceptance including tests**" | (ii) payload, generic |
| `docs/guides/agent-workflow.md:272-276` | `template/…:272-276` | "Full check and build. … The gates the package check does **not** cover — root config, scripts, formatting, the container build — CI gates them separately, so find out here." | (ii) payload, generic |
| `docs/guides/agent-workflow.md:94` | `template/…:94` | "`node .claude/hooks/rule-zero-selftest.ts` proves the gate is live" | (ii) payload, self-test |
| `docs/guides/agent-workflow.md:481` | `template/…:481` | table row naming "log + self-test" | (ii) payload |
| `.claude/rules/process.md` | `template/.claude/rules/process.md` | **zero** matches for the pattern | measured, see command below |

Search command (cwd `/c/Users/Keaton Forrest/Documents/GitHub/cl-workflow`):
`git grep -n -E 'typecheck|tsc|[Ff]ull check|lint|eslint|static analysis|selftest|self-test|git diff --exit-code|pnpm build' -- <path>`

### 1e. Historical precedent (read-only, do not update)

`docs/history/2026-08-25-npx-ts-kit/` carries 30+ `pnpm typecheck` / "Conventions that will fail
your lint" occurrences (e.g. `phase-2.md:29`, `phase-4.md:196`, `plan.md:124`, `review.md:105`).
These are archived records of a finished contribution and are **not** call sites to update.

### 2. Would anything in `template/` become true or false with ESLint here?

| Fact | Value | Where measured |
| --- | --- | --- |
| `template/CLAUDE.md:7` | ``- Full check (lint + typecheck + unit): `<cmd>` `` — a placeholder; names the concept, supplies no command | `template/CLAUDE.md:7` |
| `template/CLAUDE.md:12-13` | `## Conventions that will fail your lint` / `- <the two or three that bite most>` — placeholder | `template/CLAUDE.md:12-13` |
| `template/CLAUDE.md` contains no `tsc`, no `pnpm`, no `eslint` | grep over the file returns only lines 7 and 12 | `git grep -n -E '…' -- template/CLAUDE.md` |
| `template/docs/guides/agent-workflow.md` | 4 matches (lines 94, 230, 273, 481) — all generic prose about "your lint" / "full check" / the self-test; none names a tool or a repo | `git grep -n … -- template/docs/guides/agent-workflow.md` |
| **Conclusion** | Nothing in `template/CLAUDE.md` or `template/docs/guides/agent-workflow.md` becomes true or false. The template is generic; it already *reserves a slot* for lint. Confirmed. | above |
| Corollary | The root `CLAUDE.md:14` "(lint + typecheck + unit)" wording is **inherited verbatim from the template placeholder** and was never edited to drop `lint` — the honest fix is to add a lint, not to reword. | `template/CLAUDE.md:7` vs `CLAUDE.md:14` |

### 3. Root `.claude/` vs `template/.claude/` — byte comparison

| Fact | Value | Where measured |
| --- | --- | --- |
| Tracked files under `template/.claude/` | 24 | `git ls-files 'template/.claude/'` |
| Files whose root counterpart is byte-identical at HEAD | **24 / 24** (`.gitattributes`, both agents, `gitignore`→`.gitignore`, all 8 hooks + `package.json`, `rule-zero.conf`, `rules/process.md`, `settings.json`, `SKILL.md`, all 7 templates) | loop over `git show HEAD:<f> \| sha256sum` for each pair — all printed `SAME` |
| Root-only file under `.claude/` | `.claude/cl-workflow.lock` (generated by the CLI, no template source) | `comm -13` of the two sorted file lists |
| `docs/guides/agent-workflow.md` root vs template | **SAME** (managed) | sha256 of `HEAD:docs/guides/agent-workflow.md` vs `HEAD:template/docs/guides/agent-workflow.md` |
| `mem/index.md` root vs template | **SAME** (owned, still pristine) | same method |
| `CLAUDE.md`, `mem/outstanding.md`, `docs/history/index.md` root vs template | **DIFF** — expected; all three are in `OWNED` | same method; `src/cli.ts:31-41` |
| Working tree matches HEAD for every one of these | `git status --porcelain --untracked-files=all` shows only `M package.json`, `M pnpm-lock.yaml` | shell |
| **Implication for the plan** | Nothing under `template/.claude/**` or `docs/guides/` needs an `update` re-run *for this contribution*, **unless** lint findings force an edit to a hook `.ts`. If a hook changes, it must be edited in `template/.claude/hooks/` and `node dist/cli.js update .` re-run, because the root copy is generated. | `CLAUDE.md:8-10`; `src/cli.ts:26-44` |
| Owned/managed classification | `OWNED` = `.claude/rule-zero.conf`, `CLAUDE.md`, `docs/history/.gitkeep`, `docs/history/index.md`, `docs/plans/.gitkeep`, `docs/reports/.gitkeep`, `docs/reviews/.gitkeep`, `mem/index.md`, `mem/outstanding.md`; `MERGED` = `.claude/settings.json`; everything else managed | `src/cli.ts:31-44` |
| `doctor` runs no lint and no typecheck | 7 checks: Node ≥ 24, lock, settings hook wiring, ESM shim, hook scripts present, managed-file drift (warn only), self-test 60/60 | `src/cli.ts:589-713`; expected case count const `src/cli.ts:51` |

### 4. The uncommitted working-tree change

**`git diff -- package.json`** (verbatim):
```
diff --git a/package.json b/package.json
index 2b548d9..c980a32 100644
--- a/package.json
+++ b/package.json
@@ -26,7 +26,7 @@
     "selftest": "node template/.claude/hooks/rule-zero-selftest.ts"
   },
   "devDependencies": {
-    "@types/node": "^24.0.0",
-    "typescript": "^6.0.0"
+    "@types/node": "^24.13.3",
+    "typescript": "^6.0.3"
   }
 }
```

**`git diff -- pnpm-lock.yaml`** (verbatim):
```
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index e18cb3e..8974d77 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -9,10 +9,10 @@ importers:
   .:
     devDependencies:
       '@types/node':
-        specifier: ^24.0.0
+        specifier: ^24.13.3
         version: 24.13.3
       typescript:
-        specifier: ^6.0.0
+        specifier: ^6.0.3
         version: 6.0.3
```

| Fact | Value | Where measured |
| --- | --- | --- |
| Lock `importers['.'].devDependencies` specifiers (working tree) | `'@types/node': specifier ^24.13.3, version 24.13.3`; `typescript: specifier ^6.0.3, version 6.0.3` | `pnpm-lock.yaml:9-16` |
| Manifest specifiers (working tree) | `"@types/node": "^24.13.3"`, `"typescript": "^6.0.3"` | `package.json:29-30` |
| Specifiers match | **Yes, exactly.** Resolved versions `24.13.3` and `6.0.3` also satisfy the ranges. Reasoned from the two files; `pnpm install --frozen-lockfile` compares manifest specifiers against `importers[*].specifier` and would find no mismatch. | `package.json:29-30` vs `pnpm-lock.yaml:11-16` |
| Committed state (HEAD) is *also* self-consistent | `^24.0.0`/`^24.0.0` and `^6.0.0`/`^6.0.0` in both files at `f684e35` | the two diff hunks show matched `-` lines on both sides |
| **The two files must move together** | committing `package.json` without the lock (or vice versa) breaks `.github/workflows/ci.yml:28` | derived from the above |
| `git stash list` | `stash@{0}: On feat/2026-08-25-npx-ts-kit: accidental devDep range narrowing during verification` — **still there** | shell |
| Stash `pnpm-lock.yaml` blob | sha256 `69f6bcf8…6e49f5` — **byte-identical to the current working-tree file** (`sha256sum pnpm-lock.yaml` → same) | `git cat-file -p 8974d77 \| sha256sum` vs `sha256sum pnpm-lock.yaml` |
| Stash `package.json` blob vs current | Same devDependency change; **only difference is one line**: current has `"license": "MIT",` (added later at line 6), stash's version does not | `diff <(git cat-file -p d774ce5) package.json` → `5a6 > "license": "MIT",` |
| Verdict on the stash | The parked drift and the present drift are **the same change**, re-created. The stash is now redundant work, not a different fix. | above two rows |
| `git log -1 --format='%H %ci' -- package.json` | `f684e35015d49c9d3c39ff60bb4cc26e1ba94406 2026-08-25 21:17:16 +0200` | shell |
| `git log -1 … -- pnpm-lock.yaml` | same commit, same timestamp | shell |
| File mtimes | `package.json` 2026-08-25 21:23:56.262 +0200; `pnpm-lock.yaml` 2026-08-25 21:23:56.243 +0200 — 19 ms apart, ~6m40s **after** the commit | `ls -l --time-style=full-iso package.json pnpm-lock.yaml` |
| `node_modules/.modules.yaml` mtime / contents | 2026-08-25 21:31:29 +0200; `packageManager: pnpm@10.27.0`, `nodeLinker: isolated`, `prunedAt: Tue, 25 Aug 2026 17:37:23 GMT` | `ls -l`, `cat node_modules/.modules.yaml` |
| Reading of the timestamps | Both tracked files were rewritten in the same operation minutes after the baseline commit; a `pnpm` operation ran ~7 min later. The drift is a tool artefact, not a hand edit. (Inference, flagged as such.) | the three mtime rows above |

### 5. `docs-only.ts` verdict for a future static-analysis PR

| Candidate path | Classification | Why (cited) |
| --- | --- | --- |
| `eslint.config.ts` (new file, status `A`) | **code** | `docs-only.ts:239-247` — `"ADR".includes(status[0])` → `class: "code"`, `docsOnly = false`. Even as `M`, `.ts` → marker `//` (`:54`) and a config line is not a comment (`:156`). |
| `package.json` (`M`) | **code** | `.json` is in neither `DOC_EXT` (`:41`) nor any `COMMENT` set (`:52-58`); `markerFor` returns `null` (`:100-108`) → `commentOnly` returns `{ok:false, why:"unknown language; cannot classify comment lines"}` (`:146`). |
| `tsconfig.json` (`M`) | **code** | identical reasoning to `package.json`. |
| `pnpm-lock.yaml` (`M`) | **code** | `.yaml` → marker `#` (`:53`); changed lines such as `specifier: ^6.0.3` do not start with `#` → `:156`. |
| `.github/workflows/ci.yml` (`M`) | **code** | `.yml` → marker `#` (`:53`); `- run: pnpm lint` is not a whole-line comment → `:156`. |
| `.claude/hooks/*.ts` (if lint forces an edit) | **code** | `.claude/` is deliberately not a doc dir (`:14`, `:44-48`); `template/.claude/**` likewise (`:20-24`). |
| **Overall verdict** | `docs_only: false`, **exit 3** | `docs-only.ts:293` `return docsOnly ? 0 : 3` |
| Consequence for the merge | `SKILL.md:210-212` — exit 3 → "report … and **stop. Do not ask whether to merge.**" The standing docs-only rule does **not** apply; the owner's word is required (`SKILL.md:214-229`; `mem/outstanding.md:56-58`). | cited |

### 6. Does the kit promise target projects any lint of `.claude/hooks/*.ts`?

| Fact | Value | Where measured |
| --- | --- | --- |
| Occurrences of `eslint` / `oxlint` / `biome` in tracked files (incl. `dist/`, `pnpm-lock.yaml`) | **0** | `git grep -icn -E 'eslint\|oxlint\|biome'` → no output, exit 1 |
| Occurrences across the whole working tree incl. untracked (excl. `node_modules`, `.git`) | **0 files** | `grep -rIl -E 'eslint\|oxlint\|biome' --exclude-dir=node_modules --exclude-dir=.git .` → no output |
| Occurrences of `static analys` / `analysis` in tracked files | **0** (`git grep -c` exit 1 both times) | shell, cwd = repo root (`pwd` printed) |
| Absence confirmed by a **looser** pattern | `git grep -in -E 'es.?lint\|oxlint\|biome\|standardjs\|xo\|static.{0,3}anal'` returned 17 lines — **all false positives** (`indexOf`, `lastIndexOf`, `erasableSyntaxOnly`), proving the pattern and cwd were live | shell |
| The only thing the kit tells target projects to put in CI | "Put that self-test in CI." — the rule-zero self-test, nothing else | `README.md:23-25` |
| What `doctor` promises to check in a target project | Node ≥ 24, lock, hook wiring, ESM shim, hooks present, self-test 60/60 — **no lint, no typecheck** | `README.md:40`; `src/cli.ts:589-713` |
| Target projects install nothing | "there is no build step and no runtime dependency in a target project" | `README.md:14-15`; matching convention `CLAUDE.md:25-26` |
| **Conclusion** | The kit makes **no** promise, explicit or implied, of linting `.claude/hooks/*.ts` in a target project. Adding ESLint to this repo creates no obligation to ship one. | the rows above |

### 7. Lock format and package-manager pin (for a minimal lock diff)

| Fact | Value | Where measured |
| --- | --- | --- |
| `lockfileVersion` | `'9.0'` | `pnpm-lock.yaml:1` |
| `settings` | `autoInstallPeers: true`, `excludeLinksFromLockfile: false` | `pnpm-lock.yaml:3-5` |
| `packageManager` pin | `pnpm@10.27.0` | `package.json:22` |
| Local pnpm | `10.27.0` — matches the pin | `pnpm --version` |
| Recorded package manager in the existing install | `packageManager: pnpm@10.27.0`, `layoutVersion: 5`, `nodeLinker: isolated` | `node_modules/.modules.yaml` |
| Registries | default `https://registry.npmjs.org/`, `@jsr` → `https://npm.jsr.io/` | `node_modules/.modules.yaml` |
| CI does not pin a pnpm version | `- uses: pnpm/action-setup@v4` with **no** `version:` input; comment says it reads the `packageManager` pin | `.github/workflows/ci.yml:21-22` |
| Whole lock size | 39 lines, 3 packages (`@types/node`, `typescript`, `undici-types`) | `cat -n pnpm-lock.yaml` |
| **Implication** | An implementer on pnpm 10.27.0 adding devDependencies produces a diff confined to the `importers`, `packages` and `snapshots` blocks; the `settings`/`lockfileVersion` header will not move. | the rows above |

## Observations

**The `CLAUDE.md:14` line is the load-bearing one, and it is already written for a lint.**
`- Full check (lint + typecheck + unit): pnpm typecheck && pnpm build && git diff --exit-code
dist/ && pnpm selftest`. The parenthetical is inherited verbatim from the template placeholder
at `template/CLAUDE.md:7`. There is also **no "unit"** in that command — `pnpm selftest` is the
closest thing (a 60-case hook self-test). Adding a lint makes two-thirds of the parenthetical
honest; the "unit" third remains a stretch either way.

**The `README.md:174-178` CI enumeration is an ordered list and will silently rot.** "install,
typecheck, build, `dist/` drift check, self-test, and a CLI smoke test" names five steps in
workflow order. It is the only prose in the repo that enumerates CI steps sequentially, so a new
`pnpm lint` step falsifies it while every other prose call site stays true. The
`README.md:158-164` Development block is the second, and it is a *set* rather than a sequence, so
inserting a line there is lower-risk.

**Root `.claude/hooks/**` is untyped-checked but not at risk.** `tsconfig.json:20-23` covers
`template/.claude/hooks` only, and all 24 tracked files under `template/.claude/` are
byte-identical to their root counterparts (measured). So today "widening tsc coverage" to the root
copy would buy nothing but duplicate diagnostics — the real widening candidates are files
currently in *no* tsconfig: none exist in `src/`, but a new root-level `eslint.config.ts` would be
one (it is outside both include arrays). If lint config is authored in TypeScript, decide whether
`typecheck` should see it.

**`package.json` is on the `files` whitelist's blind side.** `package.json:15-18` ships only
`["dist","template"]`. A root `eslint.config.ts` / `eslint.config.js` never reaches a consumer,
which is correct, but also means the file cannot be validated by the `init`+`doctor` smoke test —
it is repo-internal only.

**`.claude/cl-workflow.lock` is missing one payload file, and this is by design.** The payload has
33 tracked files under `template/`; the lock records 32. The absentee is `mem/outstanding.md`
(`git ls-files template/ | wc -l` → 33; lock `files` block `.claude/cl-workflow.lock:7-40`). The
explanation is at `src/cli.ts:436-440`: when `init` finds an existing file that differs, it writes
a `.new` beside it and *deliberately does not record the path*, "so `update` must keep treating it
as the project's own". `mem/outstanding.md` is `OWNED` (`src/cli.ts:40`), so neither `update` nor
`doctor`'s drift check (`src/cli.ts:680`, skips non-managed) is affected. No `.new` files remain on
disk (`find . -name '*.new'` → empty). Not a defect; worth not "fixing".

**`README.md:4` says "five hooks"; the repo ships seven.** `CLAUDE.md:6` says "seven TypeScript
hooks", `.claude/cl-workflow.lock:41-49` lists seven in `hooksManifest`, and `README.md:71-77`
itself lists seven under `hooks/`. Adjacent to this brief, not caused by it — but if the plan
touches `README.md` anyway, this is a one-word correction sitting in the same file.

**The stash is now dead weight.** `stash@{0}` and the current working-tree change are the same
devDependency-range fix; the lock blobs are byte-identical and the manifests differ only by the
later-added `"license": "MIT",` line. Whatever the plan does with the working-tree drift, the
stash can be dropped afterwards — but dropping a stash discards work and is the owner's call
(rule zero); I did not touch it.

**A lint PR cannot self-merge.** `docs-only.ts` returns exit 3 for every file such a PR would
touch, so `SKILL.md:209-212` routes to "report and stop". The plan's merge expectations should
assume the owner's word plus `--admin` (`mem/outstanding.md:58`).

## Not done / could not measure

- **Did not run** `pnpm install`, `pnpm install --frozen-lockfile`, `pnpm typecheck`,
  `pnpm build`, `pnpm selftest`, `node dist/cli.js doctor`, or `docs-only.ts`. The
  `--frozen-lockfile` consistency claim in fact 4 is **reasoned from the two files**, not
  executed — as the brief instructed.
- **Did not** commit, stash, unstash, restore, checkout, or otherwise change any file outside
  `docs/reviews/2026-08-25-static-analysis/`.
- **Did not evaluate** which ESLint (or alternative) to adopt, which rules, flat-config vs legacy,
  or whether `typescript-eslint` type-aware linting is affordable. That is the orchestrator's plan.
- **Did not measure** whether `erasableSyntaxOnly` diagnostics overlap with any ESLint rule set —
  no linter is installed to compare against.
- **Did not audit** `dist/cli.js` line-by-line; I read `src/cli.ts` (the source of truth) and
  relied on CI's drift gate for their equivalence. No independent verification that
  `dist/cli.js` currently matches a fresh build.
- **Did not inspect** `.claude/settings.json` hook wiring in detail — out of brief.
- **Did not check** GitHub (no `gh` calls): the live `main` ruleset, PR history, and whether
  `ci-ok` is currently the required check are unverified here; `README.md:180-181` and
  `.github/workflows/ci.yml:50-51` are the repo's claims about it, not measurements.
- The mtime-based reading of *why* `package.json` and `pnpm-lock.yaml` are dirty is an inference
  and is labelled as one; I have no record of the command that wrote them.

## Live reads taken

None. The owner did not ask for live reads, and no network call, `gh` invocation, or request to
any external system was made. Every fact above comes from the local checkout at `f684e35`, the
local `node_modules/`, and the local `git` object store.
