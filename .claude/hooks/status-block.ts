#!/usr/bin/env node
/**
 * .claude/hooks/status-block.ts — SubagentStop hook, matcher: implementer
 *
 * An implementer is not done until it has written its status block. This hook checks that
 * something under docs/plans/ in the implementer's worktree differs from the base branch (either
 * uncommitted or committed — implementers commit to their worktree branch). If nothing changed,
 * exit 2 refuses to let the subagent stop and tells it why.
 *
 * The plan is a directory, docs/plans/<id>/, holding plan.md (overview) and phase-<n>.md files;
 * status blocks live in the phase files. If docs/plans/ holds no plan (after the archive, during
 * the PR review loop), implementers run from inline briefs and this hook stays silent.
 *
 * Base branch, in order: the `**Branch:**` line of any plan.md, then `main`, then `master`.
 * If none resolves, the hook allows the stop — this is a process nudge, not a safety gate, and a
 * permissive kit fails open here.
 *
 * Loop guard: if Claude Code reports it is already continuing because of this hook
 * (`stop_hook_active`), allow the stop rather than spin.
 *
 * The exit-2 protocol is the whole contract: **2** (with the paragraph on stderr) is the only
 * refusal channel; every other path leaves the exit code at 0. `process.exitCode` rather than
 * `process.exit()` so stderr is flushed before Node leaves.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { asString, isRecord, readStdinJson } from "./lib.ts";

interface GitResult {
  code: number;
  out: string;
}

/**
 * `subprocess.run(["git","-C",cwd,…], capture_output=True, text=True, timeout=20)`.
 *
 * Returns null when git could not run at all (missing binary, or the 20 s timeout — `spawnSync`
 * reports both through `.error`/`status === null` instead of raising). Python raised there and
 * died with a non-zero exit, which Claude Code treats as a non-blocking error and lets the stop
 * through; the callers reproduce that by returning silently.
 */
function git(cwd: string, ...args: string[]): GitResult | null {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", timeout: 20_000 });
  if (r.error !== undefined || r.status === null) return null;
  return { code: r.status, out: (r.stdout ?? "").trim() };
}

const BRANCH_RE = /\*\*Branch:\*\*\s*`([^`]+)`/;

const NOT_FINISHED =
  "Not finished: no status block has been written. Write your block under your item's " +
  "`#### Status — item n.m` heading in docs/plans/<id>/phase-<n>.md, replacing the " +
  "placeholder line, with Done|Blocked, files touched, commits, deviations, validation " +
  "and checker-verified results. Commit it to your worktree branch. Then finish.\n";

/** True when the subagent may stop; false when it must be refused with exit 2. */
function mayStop(): boolean {
  let payload: Record<string, unknown>;
  try {
    const parsed = readStdinJson();
    if (!isRecord(parsed)) return true;
    payload = parsed;
  } catch {
    return true; // malformed stdin: fail open, unlike rule-zero
  }
  if (payload["stop_hook_active"]) return true;

  const cwd = asString(payload["cwd"]) || process.cwd();
  // `glob.glob(os.path.join(cwd,"docs","plans","*","plan.md"))` — the pattern stays relative and
  // forward-slashed because a Windows path is full of backslashes, which are glob escapes.
  const plans = fs.globSync("docs/plans/*/plan.md", { cwd }).sort();
  if (plans.length === 0) return true; // no plan here (archived, or inline brief): nothing to enforce

  const bases: string[] = [];
  for (const rel of plans) {
    try {
      const m = BRANCH_RE.exec(fs.readFileSync(path.join(cwd, rel), "utf8"));
      // The pattern has no optional group, so a match always carries group 1; the compiler
      // cannot know that. A missing capture contributes no candidate, exactly as a plan.md
      // with no **Branch:** line does — the fallbacks below still apply.
      const branch = m?.[1];
      if (branch !== undefined) bases.push(branch);
    } catch {
      // OSError: pass
    }
  }
  bases.push("main", "master");

  let base: string | null = null;
  for (const candidate of bases) {
    const r = git(cwd, "rev-parse", "--verify", "--quiet", candidate);
    if (r === null) return true; // git unavailable: cannot tell; fail open
    if (r.code === 0) {
      base = candidate;
      break;
    }
  }
  if (base === null) return true; // cannot tell; fail open

  const diff = git(cwd, "diff", "--stat", base, "--", "docs/plans/");
  if (diff === null) return true; // as above: fail open
  // the plan file changed since base: status block present (or at least attempted)
  return diff.code === 0 && diff.out.trim() !== "";
}

let allowed: boolean;
try {
  allowed = mayStop();
} catch {
  allowed = true; // a process nudge that crashes must not trap the subagent
}
if (!allowed) {
  process.stderr.write(NOT_FINISHED);
  process.exitCode = 2;
}
