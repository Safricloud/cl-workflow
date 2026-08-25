#!/usr/bin/env node
/**
 * .claude/hooks/rule-zero-selftest.ts — proves the rule-zero gate fires, and only when it should.
 *
 * Run it after editing rule-zero.conf, and in CI. A hook that is misconfigured fails open
 * (Claude Code treats a hook that cannot start as a non-blocking error), so this is the only
 * thing standing between "the gate exists" and "the gate works".
 *
 * Usage:  node .claude/hooks/rule-zero-selftest.ts [--conf path] [--verbose]
 * Exit 0 when every case passes, 1 otherwise.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { asRecord, asString, errText, readLines } from "./lib.ts";

const HERE = import.meta.dirname;
const HOOK = path.join(HERE, "rule-zero.ts");
const DEFAULT_CONF = path.join(HERE, "..", "rule-zero.conf");

const SILENT = "silent";
const DENY = "deny";

/** "orch" | "agent" | [role, grant_regex] — the magic grant "BUNDLE <pr> <branch>" runs --bundle. */
type Context = string | readonly [string, string];

/** (label, tool, tool_input, context, expected) */
type Case = readonly [string, string, Record<string, unknown>, Context, string];

const CASES: readonly Case[] = [
  // --- everyday work must be silent -------------------------------------------------
  ["tests run", "Bash", { command: "npm test" }, "orch", SILENT],
  ["commit in worktree", "Bash", { command: "git add -A && git commit -m 'item 1.1'" }, "agent", SILENT],
  ["plain push", "Bash", { command: "git push -u origin feat/x" }, "orch", SILENT],
  ["new branch", "Bash", { command: "git checkout -b feat/x" }, "orch", SILENT],
  ["merge worktree branch", "Bash", { command: "git merge --no-edit worktree-agent-1" }, "orch", SILENT],
  ["worktree cleanup, merged", "Bash", { command: "git worktree remove .claude/worktrees/a && git branch -d worktree-agent-1" }, "orch", SILENT],
  ["unstage", "Bash", { command: "git restore --staged src/a.ts" }, "orch", SILENT],
  ["open PR", "Bash", { command: "gh pr create --fill" }, "orch", SILENT],
  ["PR comment", "Bash", { command: "gh pr comment 12 --body 'done'" }, "orch", SILENT],
  ["gh api read", "Bash", { command: "gh api repos/o/r/pulls/12/comments" }, "orch", SILENT],
  ["blocked issue", "Bash", { command: "gh issue create --title 'Rotate vendor key' --label blocked-on-owner --label credentials --body-file -" }, "orch", SILENT],
  ["label create", "Bash", { command: "gh label create blocked-on-owner --color D93F0B --force" }, "orch", SILENT],
  ["cancel own CI run", "Bash", { command: "gh run cancel 987654" }, "orch", SILENT],
  ["admin merge without grant", "Bash", { command: "gh pr merge 12 --squash --admin --delete-branch" }, "orch", DENY],
  ["admin merge with bundle", "Bash", { command: "gh pr merge 12 --squash --admin --delete-branch" }, ["orch", "BUNDLE 12 feat/x"], SILENT],
  ["curl GET remote", "Bash", { command: "curl -s https://api.example.com/v1/things" }, "orch", SILENT],
  ["curl POST localhost", "Bash", { command: "curl -X POST localhost:3000/api/seed -d '{}'" }, "orch", SILENT],
  ["edit inside repo", "Edit", { file_path: "src/a.ts" }, "orch", SILENT],
  ["edit inside worktree", "Edit", { file_path: ".claude/worktrees/agent-1/src/a.ts" }, "agent", SILENT],
  ["write to /tmp", "Write", { file_path: "/tmp/scratch.txt" }, "orch", SILENT],
  ["rm inside repo", "Bash", { command: "rm -rf node_modules" }, "orch", SILENT],
  ["mcp read tool", "mcp__vendor__list_items", { q: "x" }, "orch", SILENT],

  // --- rule zero: orchestrator without a grant is denied -----------------------------
  ["force push", "Bash", { command: "git push --force origin feat/x" }, "orch", DENY],
  ["force push hidden in chain", "Bash", { command: "git add . && git push --force origin feat/x" }, "orch", DENY],
  ["delete remote branch", "Bash", { command: "git push origin --delete feat/x" }, "orch", DENY],
  ["delete local branch -D", "Bash", { command: "git branch -D feat/x" }, "orch", DENY],
  ["delete local branch -d (not worktree-*)", "Bash", { command: "git branch -d feat/x" }, "orch", DENY],
  ["reset hard", "Bash", { command: "git reset --hard HEAD~1" }, "orch", DENY],
  ["discard file", "Bash", { command: "git restore src/a.ts" }, "orch", DENY],
  ["checkout dot", "Bash", { command: "git checkout ." }, "orch", DENY],
  ["clean", "Bash", { command: "git clean -fd" }, "orch", DENY],
  ["worktree remove force", "Bash", { command: "git worktree remove --force .claude/worktrees/a" }, "orch", DENY],
  ["PR merge", "Bash", { command: "gh pr merge 12 --squash" }, "orch", DENY],
  ["issue close", "Bash", { command: "gh issue close 7" }, "orch", DENY],
  ["gh api POST", "Bash", { command: "gh api -X POST repos/o/r/issues -f title=x" }, "orch", DENY],
  ["curl POST remote", "Bash", { command: "curl -X POST https://api.example.com/v1/things -d '{}'" }, "orch", DENY],
  ["curl data remote", "Bash", { command: "curl https://api.example.com/v1/things --data-binary @f.json" }, "orch", DENY],
  ["httpie DELETE", "Bash", { command: "https DELETE api.example.com/v1/things/1" }, "orch", DENY],
  ["docker volume rm", "Bash", { command: "docker volume rm app_pgdata" }, "orch", DENY],
  ["edit outside repo", "Edit", { file_path: "~/.zshrc" }, "orch", DENY],
  ["write outside repo", "Write", { file_path: "/etc/hosts" }, "orch", DENY],

  // --- rule zero: a single-use grant lets the orchestrator through, once ---------------
  ["force push with grant", "Bash", { command: "git push --force origin feat/x" }, ["orch", "^git push --force origin feat/x$"], SILENT],
  ["delete remote with grant", "Bash", { command: "git push origin --delete feat/x" }, ["orch", "^git push origin --delete feat/x$"], SILENT],
  ["PR merge with grant", "Bash", { command: "gh pr merge 12 --squash" }, ["orch", "^gh pr merge 12"], SILENT],
  ["grant for a different command does not apply", "Bash", { command: "git branch -D feat/y" }, ["orch", "^git branch -D feat/x$"], DENY],

  // --- Gate B bundle: one owner yes → merge + remote delete + local delete, once each -------
  ["bundle: merge", "Bash", { command: "gh pr merge 12 --squash" }, ["orch", "BUNDLE 12 feat/x"], SILENT],
  ["bundle: delete remote", "Bash", { command: "git push origin --delete feat/x" }, ["orch", "BUNDLE 12 feat/x"], SILENT],
  ["bundle: delete local after squash", "Bash", { command: "git branch -D feat/x" }, ["orch", "BUNDLE 12 feat/x"], SILENT],
  ["bundle: other branch not covered", "Bash", { command: "git branch -D feat/y" }, ["orch", "BUNDLE 12 feat/x"], DENY],
  ["bundle: other PR not covered", "Bash", { command: "gh pr merge 13 --squash" }, ["orch", "BUNDLE 12 feat/x"], DENY],

  // --- rule zero: sub-agents are denied even with a grant on file ----------------------
  ["agent force push", "Bash", { command: "git push --force origin worktree-agent-1" }, "agent", DENY],
  ["agent force push, grant present", "Bash", { command: "git push --force origin worktree-agent-1" }, ["agent", ".*"], DENY],
  ["agent reset hard", "Bash", { command: "git reset --hard" }, "agent", DENY],
  ["agent edit outside repo", "Edit", { file_path: "/home/user/.bashrc" }, "agent", DENY],

  // --- never: denied even with a grant --------------------------------------------------
  ["rm -rf home", "Bash", { command: "rm -rf ~" }, ["orch", ".*"], DENY],
  ["rm -rf root", "Bash", { command: "rm -rf /" }, ["orch", ".*"], DENY],
  ["force push main", "Bash", { command: "git push -f origin main" }, ["orch", ".*"], DENY],
];

function runCase(
  project: string,
  tool: string,
  toolInput: Record<string, unknown>,
  context: Context,
): [string, string] {
  const isAgent = context === "agent" || (typeof context !== "string" && context[0] === "agent");
  const grant = typeof context === "string" ? null : context[1];
  const grantsPath = path.join(project, ".claude", "rule-zero.grants");
  // every case starts with an empty grants file; a grant applies to this case only
  fs.writeFileSync(grantsPath, "", "utf8");
  if (grant !== null && grant.startsWith("BUNDLE ")) {
    const [, pr, branch] = grant.split(/\s+/);
    const bundle = spawnSync(process.execPath, [HOOK, "--bundle", "merge-cleanup", pr, branch], {
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: project },
    });
    // `check=True` in Python; spawnSync neither throws on a non-zero exit nor on a timeout.
    if (bundle.error) throw bundle.error;
    if (bundle.status !== 0) {
      throw new Error(`--bundle exited ${bundle.status}: ${(bundle.stderr ?? "").trim()}`);
    }
  } else if (grant !== null) {
    fs.writeFileSync(grantsPath, grant + "\n", "utf8");
  }
  const payload: Record<string, unknown> = {
    session_id: "selftest",
    cwd: project,
    hook_event_name: "PreToolUse",
    permission_mode: "bypassPermissions",
    tool_name: tool,
    tool_input: toolInput,
    tool_use_id: "toolu_selftest",
  };
  if (isAgent) {
    payload.agent_id = "agent_selftest";
    payload.agent_type = "implementer";
  }
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: project },
    cwd: project,
    timeout: 10_000,
  });
  // Python raises TimeoutExpired here; spawnSync just returns with `error` set and no status.
  // A hung or unstartable hook must read as an error — never as silence, which would PASS.
  if (r.error) {
    const signal = r.signal === null ? "" : ` (signal ${r.signal})`;
    return ["error", `spawn failed: ${errText(r.error)}${signal}`];
  }
  if (r.status !== 0 && r.status !== 2) {
    return ["error", `exit ${r.status}: ${(r.stderr ?? "").trim().slice(0, 200)}`];
  }
  const out = (r.stdout ?? "").trim();
  if (out === "") {
    // silent + a grant was on file → it must have been consumed (single use)
    if (grant !== null && !isAgent) {
      const left = readLines(fs.readFileSync(grantsPath, "utf8").trim());
      const expectedLeft = grant.startsWith("BUNDLE ") ? 2 : 0;
      if (left.length !== expectedLeft) {
        return ["error", `grant not consumed; still on file: ${JSON.stringify(left)}`];
      }
    }
    return [SILENT, ""];
  }
  try {
    const d = asRecord(asRecord(JSON.parse(out)).hookSpecificOutput);
    const decision = d.permissionDecision;
    if (typeof decision !== "string") throw new Error("no permissionDecision");
    return [decision, asString(d.permissionDecisionReason)];
  } catch {
    return ["error", `unparseable stdout: ${out.slice(0, 200)}`];
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  let conf = DEFAULT_CONF;
  const confAt = args.indexOf("--conf");
  if (confAt !== -1 && confAt + 1 < args.length) conf = args[confAt + 1];
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "rule-zero-selftest-"));
  try {
    fs.mkdirSync(path.join(project, ".claude", "worktrees", "agent-1", "src"), { recursive: true });
    fs.mkdirSync(path.join(project, "src"), { recursive: true });
    fs.copyFileSync(conf, path.join(project, ".claude", "rule-zero.conf"));
    let failures = 0;
    for (const [label, tool, toolInput, context, expected] of CASES) {
      const [verdict, reason] = runCase(project, tool, toolInput, context);
      const ok = verdict === expected;
      failures += ok ? 0 : 1;
      const mark = ok ? "PASS" : "FAIL";
      if (verbose || !ok) {
        process.stdout.write(
          `${mark}  ${label.padEnd(45)} expected=${expected.padEnd(6)} got=${verdict.padEnd(6)}  ${reason.slice(0, 110)}\n`,
        );
      }
    }
    const logPath = path.join(project, ".claude", "rule-zero.log");
    const nLog = fs.existsSync(logPath) ? readLines(fs.readFileSync(logPath, "utf8")).length : 0;
    process.stdout.write(
      `\n${CASES.length - failures}/${CASES.length} cases passed; ${nLog} lines logged to rule-zero.log\n`,
    );
    // negative control: prove the hook can fail, so a green run is evidence
    const bad = runCase(project, "Bash", { command: "git push --force origin feat/x" }, "orch")[0];
    if (bad !== DENY) {
      process.stdout.write("NEGATIVE CONTROL FAILED: force push was not denied\n");
      failures += 1;
    }
    process.exitCode = failures > 0 ? 1 : 0;
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
}

main();
