#!/usr/bin/env node
/**
 * .claude/hooks/rule-zero.ts — PreToolUse hook (Bash, Edit, Write, MultiEdit, NotebookEdit).
 *
 * Permissive by design. This hook is silent on everything except the shapes listed in
 * .claude/rule-zero.conf. It never returns "allow" (silence leaves the normal flow alone) and
 * never returns "ask" (no prompts — the kit is meant to run in bypass mode).
 *
 * Verdicts, in order of evaluation:
 *   deny   — never by an agent, grant or not. The owner runs it by hand.
 *   allow  — short-circuit: a standing approval or a known-safe shape.
 *   guard  — rule zero. Orchestrator: allowed only with a single-use grant in
 *            .claude/rule-zero.grants (consumed on use). Sub-agent: always denied.
 *
 * Bash commands are split on && || ; | and newlines and each segment is judged separately, so
 * `git add . && git push --force` cannot ride through on the allow for `git add`. Splitting is
 * best-effort (quotes are not parsed), the same limitation Claude Code's own `if` filter has.
 *
 * Every deny and every grant use is appended to .claude/rule-zero.log (tsv). Silent allows are
 * not logged.
 *
 * Fail-closed: if the input cannot be parsed or the config is missing, deny with a reason that
 * says what to fix. The self-test (rule-zero-selftest.ts) catches that before any session does.
 *
 * The deny channel is a JSON line on stdout at **exit 0**. Nothing in hook mode may throw or
 * exit non-zero: Claude Code treats a hook that fails to run as a non-blocking error and lets
 * the tool call through, so a crash here is a silently open gate. Hence the outer try/catch.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import {
  appendGrants,
  appendLogLine,
  asRecord,
  asString,
  compilePattern,
  consumeGrant,
  emitDeny,
  errText,
  expandUser,
  findGrant,
  firstMatch,
  isRecord,
  loadConf,
  projectRoot,
  pyEscape,
  pyRealpath,
  readGrants,
  readLines,
  readStdinJson,
  splitBashSegments,
  utcStamp,
} from "./lib.ts";

const TOOL_FILE = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/**
 * Judge one tool call. Returns the deny reason, or null for silence (the normal flow).
 * It never writes to stdout itself — the caller owns the one output channel.
 */
function judge(): string | null {
  const root = projectRoot();
  const confPath = path.join(root, ".claude", "rule-zero.conf");
  const grantsPath = path.join(root, ".claude", "rule-zero.grants");
  const logPath = path.join(root, ".claude", "rule-zero.log");

  let payload: Record<string, unknown>;
  try {
    const parsed = readStdinJson();
    if (!isRecord(parsed)) throw new Error("expected a JSON object");
    payload = parsed;
  } catch (e) {
    return `rule-zero hook could not parse its input (${errText(e)}). Fix the hook before continuing.`;
  }

  const tool = asString(payload["tool_name"]);
  const toolInput = asRecord(payload["tool_input"]);
  const mode = asString(payload["permission_mode"], "unknown");
  const agentType = asString(payload["agent_type"]) || "unknown-agent";
  const isSubagent = Boolean(payload["agent_id"]);
  const who = isSubagent ? `agent:${agentType}` : "orchestrator";

  // --- what are we judging? ---------------------------------------------------------------
  let subjects: string[] = [];
  if (tool === "Bash") {
    subjects = splitBashSegments(asString(toolInput["command"]));
  } else if (TOOL_FILE.has(tool)) {
    const target = asString(toolInput["file_path"]) || asString(toolInput["notebook_path"]);
    if (target !== "") {
      const cwd = asString(payload["cwd"]) || root;
      const resolved = pyRealpath(path.resolve(cwd, expandUser(target)));
      const inside = resolved.startsWith(pyRealpath(root) + path.sep);
      // `/tmp` resolves to `C:\tmp` on Windows; that is the measured behaviour and the
      // self-test's "write to /tmp" case depends on it. Do not "fix" it.
      const tmpRoot = pyRealpath(process.env["TMPDIR"] ?? "/tmp");
      const tmp = resolved.startsWith("/tmp/") || resolved.startsWith(tmpRoot + path.sep);
      if (!inside && !tmp) subjects = [`path:outside-repo ${resolved}`];
    }
  } else if (tool.startsWith("mcp__")) {
    // MCP tools: judged by name plus a compact dump of their input, so a conf line like
    // `guard ^tool:mcp__vendor__(create|update|delete)` can name a vendor's write tools.
    subjects = [`tool:${tool} ${JSON.stringify(toolInput).slice(0, 500)}`];
  }
  if (subjects.length === 0) return null; // silent: normal flow

  if (!fs.existsSync(confPath)) {
    return `rule-zero.conf not found at ${confPath}. Create it (see the kit) or remove the hook.`;
  }
  const conf = loadConf(confPath);
  if (conf.bad !== null) {
    return `rule-zero.conf line ${conf.bad.n} is not a valid regex (${conf.bad.error}). Fix the config.`;
  }
  const rules = conf.rules;

  const log = (verdict: string, subject: string, note = ""): void => {
    appendLogLine(logPath, [
      utcStamp(),
      verdict,
      who,
      mode,
      subject.slice(0, 200).replaceAll("\t", " "),
      note,
    ]);
  };

  // --- judge each segment -----------------------------------------------------------------
  for (const subject of subjects) {
    // precedence: deny > allow > guard, independent of line order in the conf
    const denySrc = firstMatch(rules, "deny", subject);
    if (denySrc !== null) {
      log("deny", subject, denySrc);
      return `Rule zero — never by an agent (${denySrc}). The owner runs this by hand. Command: ${subject}`;
    }
    // an allow short-circuits the whole segment; it never falls through to guard
    if (firstMatch(rules, "allow", subject) !== null) continue;
    const src = firstMatch(rules, "guard", subject);
    if (src === null) continue; // silent: normal flow

    if (isSubagent) {
      log("deny", subject, `sub-agent; ${src}`);
      return (
        "Rule zero — sub-agents cannot take this action, with or without a grant " +
        `(${src}). Report **Blocked** in your status block with the exact command; ` +
        `the orchestrator will ask the owner. Command: ${subject}`
      );
    }

    // orchestrator: look for a single-use grant
    const grants = readGrants(grantsPath);
    const used = findGrant(grants, subject);
    if (used !== null) {
      consumeGrant(grantsPath, grants, used);
      log("grant-used", subject, used.trim());
      continue; // allowed, grant consumed
    }
    log("deny", subject, `no grant; ${src}`);
    return (
      `Rule zero (${src}) — this needs the owner's explicit yes. Ask in the conversation. ` +
      "Once given: quote it under the plan's Owner decisions, then add one line to " +
      ".claude/rule-zero.grants — a regex matching exactly this command (single use) — " +
      `and retry. In bypass mode this deny is the only thing that fires. Command: ${subject}`
    );
  }
  return null;
}

const USAGE = `
  Grant management, used by the orchestrator after an owner yes:
    rule-zero.ts --grant '<regex>' [...]          one single-use grant per regex
    rule-zero.ts --bundle merge-cleanup <pr-number> <branch>
                                                  Gate B: merge the PR, delete remote + local branch
    rule-zero.ts --list                            show unused grants
    rule-zero.ts --clear                           remove all unused grants (never needs a yes)
`;

/**
 * Grant management. Unlike hook mode this is a plain CLI: exit codes carry the result
 * (0 fine, 2 bad arguments, 1 a pattern that will not compile) and stdout is for the owner.
 */
function grantsCli(argv: readonly string[]): number {
  const root = projectRoot();
  const grantsPath = path.join(root, ".claude", "rule-zero.grants");
  let existing: string[] = [];
  if (fs.existsSync(grantsPath)) {
    existing = readLines(fs.readFileSync(grantsPath, "utf8")).filter((ln) => ln.trim() !== "");
  }
  const cmd = argv.length > 0 ? argv[0] : "";
  if (cmd === "--list") {
    process.stdout.write((existing.length > 0 ? existing.join("\n") : "(no unused grants)") + "\n");
    return 0;
  }
  if (cmd === "--clear") {
    fs.writeFileSync(grantsPath, "", "utf8");
    process.stdout.write(`cleared ${existing.length} grant(s)\n`);
    return 0;
  }
  // Read once so the --bundle branch can require both to be present: a short argv falls
  // through to the usage/exit-2 branch below rather than granting a half-built pattern.
  const bundlePr = argv[2];
  const bundleBranch = argv[3];
  let fresh: string[];
  if (cmd === "--grant") {
    fresh = argv.slice(1).filter((g) => g.trim() !== "");
    for (const g of fresh) compilePattern(g); // raise early on a bad regex
  } else if (
    cmd === "--bundle" &&
    argv.length === 4 &&
    argv[1] === "merge-cleanup" &&
    bundlePr !== undefined &&
    bundleBranch !== undefined
  ) {
    const pr = pyEscape(bundlePr);
    const branch = pyEscape(bundleBranch);
    fresh = [
      `^gh pr merge ${pr}\\b`,
      `^git push origin --delete ${branch}$`,
      `^git branch -D ${branch}$`, // -d refuses after a squash merge
    ];
  } else {
    process.stderr.write(USAGE + "\n");
    return 2;
  }
  if (fresh.length === 0) {
    process.stderr.write("nothing to grant\n");
    return 2;
  }
  appendGrants(grantsPath, fresh);
  process.stdout.write("granted (single use each):\n  " + fresh.join("\n  ") + "\n");
  return 0;
}

const args = process.argv.slice(2);
if (args.length > 0) {
  try {
    process.exitCode = grantsCli(args);
  } catch (e) {
    process.stderr.write(`rule-zero: ${errText(e)}\n`);
    process.exitCode = 1;
  }
} else {
  // Hook mode. Every path out of here emits either nothing or one deny line, at exit 0.
  let reason: string | null;
  try {
    reason = judge();
  } catch (e) {
    reason = `rule-zero hook failed internally (${errText(e)}). Fix the hook before continuing.`;
  }
  if (reason !== null) emitDeny(reason);
  process.exitCode = 0;
}
