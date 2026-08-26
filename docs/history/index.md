# History

One entry per contribution (one logical line, wrapped like the rest), newest last: `<date> · <id> · <one-line outcome> · blocked: #n, #m | none`
(the PR number is never written into the repo — `gh pr list --search <id>` finds it)

- 2026-08-25 · 2026-08-25-npx-ts-kit · Python kit → npm package installed from GitHub: seven
  TypeScript hooks (60-case selftest), init/update/doctor CLI, MIT licence, PR-gated CI with
  admin bypass · blocked: none

- 2026-08-25 · 2026-08-25-static-analysis · ESLint 10 + typescript-eslint beside tsc, eight
  strictness flags, all 17 .ts files compiled (generated root copy included), CI lint step +
  generated-.claude/ drift gate, Windows path-spelling fix in the gate (self-test 60 → 62) ·
  blocked: none
- 2026-08-26 · 2026-08-26-small-path · the small path (SKILL §11): a few-line change declared
  small by the owner (or proposed and accepted) — orchestrator edits directly, full check, PR +
  this index entry, merged when the review loop is silent and `ci-ok` is green; escalates when it is
  more than the change · blocked: none

- 2026-08-26 · 2026-08-26-prose-standards · Every agent names itself (`Orchestrator:`, `I-<n.m>:`,
  `I-r<cycle>.<k>:`, `Investigator-<topic>:`) and narrates before tool calls; implementer code
  standards (modular, no duplicates — found at investigation, one concern per file, pure, tests
  with the logic) in `process.md`, both agent definitions, SKILL and the guide §0.5; Playwright
  named in the owned CLAUDE.md skeleton; branches created `--no-track`; CI drift gate widened
  to `docs/guides/`; live measurement 96% prefixed / 49% narrated · blocked: none

- 2026-08-26 · 2026-08-26-remove-python-remnants · small: the last Python remnants gone — the stray
  `.claude/hooks/__pycache__/*.pyc` deleted from disk, the `__pycache__/` ignore line dropped from
  the root `.gitignore`, `template/.claude/gitignore` and its generated root copy, and the README
  tree line that listed it; the CLI's retirement of a legacy `python3 …/rule-zero.py` settings
  entry and the hooks' "Python original" comments stay, being migration and documentation, not
  tooling · blocked: none
