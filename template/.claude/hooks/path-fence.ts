#!/usr/bin/env node
/**
 * .claude/hooks/path-fence.ts <allowed-prefix> [<allowed-prefix> ...]
 *
 * PreToolUse hook for Edit/Write/MultiEdit/NotebookEdit, attached in a subagent's frontmatter.
 * Denies any edit whose resolved path is not under one of the allowed prefixes (relative to the
 * project root, or to the worktree root when the agent is in one). Silent otherwise.
 *
 * Used by `investigator`, which may write only under docs/reviews/<id>/ — investigation reports
 * are part of the record, but nothing else in the repo is the investigator's to touch.
 *
 * Both sides of the prefix test must be built the same way, through `path.join`. Paste a
 * literal `docs/reviews` onto the base instead and the forward slash survives on Windows
 * (`C:\repo\docs/reviews\`) while the resolved path uses backslashes
 * (`C:\repo\docs\reviews\x.md`), so `startsWith` is False for *every* path and the fence denies
 * the investigator its own report (investigation-hooks.md §1, §5).
 *
 * The deny channel is a JSON line on stdout at **exit 0**, exactly as rule-zero does. This hook
 * never exits non-zero: a hook that fails to run is a non-blocking error and the write goes
 * through, so a crash here is an open fence.
 */
import * as path from "node:path";

import { asRecord, asString, emitDeny, expandUser, isRecord, pyRealpath, readStdinJson } from "./lib.ts";

/** `p.strip("/")` — plus backslashes, so a prefix written `docs\reviews\` also fences. */
function stripSeparators(prefix: string): string {
  return prefix.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
}

function fence(argv: readonly string[]): string | null {
  const prefixes = argv.filter((p) => p.trim() !== "").map(stripSeparators).filter((p) => p !== "");
  if (prefixes.length === 0) return null; // no prefixes configured: nothing to fence

  let payload: Record<string, unknown>;
  try {
    const parsed = readStdinJson();
    if (!isRecord(parsed)) return null;
    payload = parsed;
  } catch {
    return null; // unparseable input: silent, same as the Python original
  }

  const toolInput = asRecord(payload.tool_input);
  const target = asString(toolInput.file_path) || asString(toolInput.notebook_path);
  if (target === "") return null;

  const cwd = asString(payload.cwd) || process.cwd();
  // Not lib's `projectRoot()`: this hook falls back to the *payload's* cwd, not the process's.
  const root = process.env.CLAUDE_PROJECT_DIR || cwd;
  const resolved = pyRealpath(path.resolve(cwd, expandUser(target)));

  // accept the path under either the project root or the current worktree root
  const bases = new Set([pyRealpath(root), pyRealpath(cwd)]);
  for (const base of bases) {
    for (const prefix of prefixes) {
      // Both sides go through node:path, so both carry the platform separator — this is the
      // line the Python version got wrong.
      const allowed = path.join(base, prefix) + path.sep;
      if (resolved.startsWith(allowed)) return null;
    }
  }

  return (
    `This agent may write only under ${prefixes.join(", ")}/. ` +
    `Refused: ${target}. Return findings in your report instead.`
  );
}

let reason: string | null;
try {
  reason = fence(process.argv.slice(2));
} catch {
  // An internal failure must not fence the agent out of its own report: stay silent, exactly
  // as the Python version's bare `except` paths did.
  reason = null;
}
if (reason !== null) emitDeny(reason);
process.exitCode = 0;
