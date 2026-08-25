#!/usr/bin/env node
/**
 * .claude/hooks/reload-plan.ts — SessionStart hook, matcher: compact|resume
 *
 * After compaction or on resume, the orchestrator's context has been rebuilt from a summary. The
 * plan file is the state of record, so put the parts of it that decisions rest on back in front
 * of the model as facts: which plan is live, its branch, the owner decisions it rests on, and
 * which items still lack a status block. Also lists any unused rule-zero grants, since a grant is
 * a recorded owner "yes" that a summary may have dropped.
 *
 * Output is plain text on stdout, which SessionStart adds to context. Written as statements of
 * fact, not instructions. Exit is always 0.
 *
 * Two regex dialect notes (investigation-hooks.md §2): a Python `\Z` anchor is a *literal Z* in
 * JavaScript, so every end-of-string anchor here is written `$` with the `s` flag and no `m`
 * flag — which is exactly what `\Z` means; and `re.findall` with two groups becomes `matchAll`
 * with the `g` flag.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { asString, errText, isRecord, pyEscape, readFileLines, readStdinJson } from "./lib.ts";

/** The body of a `## <heading>` section, up to the next `## ` heading or the end of the file. */
function section(text: string, headingRe: string): string {
  // `re.S` → the `s` flag. `\Z` → `$` without `m`, which in JS matches only at the very end.
  const m = new RegExp(headingRe + "[^\\n]*\\n(.*?)(?=\\n## |$)", "s").exec(text);
  return m !== null ? m[1].trim() : "";
}

/** Python's `str.splitlines()[0]` for the common case — the first line, however it is ended. */
function firstLine(text: string): string {
  return text.split(/\r\n|\r|\n/)[0];
}

/** `"# Plan — x".lstrip("# ")` — strip any run of leading `#` and space characters. */
function stripHeadingMarks(line: string): string {
  return line.replace(/^[# ]+/, "");
}

function report(): string[] {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = readStdinJson();
    if (isRecord(parsed)) payload = parsed;
  } catch {
    payload = {};
  }
  // Not lib's `projectRoot()`: the payload's cwd sits between the env var and the process cwd.
  const root = process.env.CLAUDE_PROJECT_DIR || asString(payload.cwd) || process.cwd();
  // The glob pattern stays relative and forward-slashed: backslashes are glob escapes.
  const plans = fs.globSync("docs/plans/*/plan.md", { cwd: root }).sort();
  const out: string[] = [];
  if (plans.length === 0) {
    out.push(
      "docs/plans/ is empty: no plan is in flight (either nothing is pending, or the " +
        "plan has been archived to docs/history/ and the contribution is in its PR review loop).",
    );
  }
  for (const rel of plans) {
    const planPath = path.join(root, rel);
    const text = fs.readFileSync(planPath, "utf8");
    const planDir = path.dirname(planPath);
    const relDir = path.relative(root, planDir);
    const title = text !== "" ? stripHeadingMarks(firstLine(text)).trim() : relDir;
    out.push(`Live plan: \`${relDir}/\` — ${title}`);
    for (const key of ["Source review", "Branch", "Owner go-ahead"]) {
      const m = new RegExp("\\*\\*" + key + ":\\*\\*\\s*([^\\n]+)").exec(text);
      if (m !== null) out.push(`  ${key}: ${m[1].trim()}`);
    }
    const decisions = section(text, "\\n## Owner decisions");
    if (decisions !== "") {
      out.push("  Owner decisions this plan rests on:");
      for (const ln of decisions.split(/\r\n|\r|\n/)) {
        if (ln.trim() !== "") out.push("    " + ln);
      }
    }
    const pending: string[] = [];
    for (const phaseRel of fs.globSync("phase-*.md", { cwd: planDir }).sort()) {
      const ptext = fs.readFileSync(path.join(planDir, phaseRel), "utf8");
      for (const item of ptext.matchAll(/### Item (\d+\.\d+) — ([^\n]+)/g)) {
        const num = item[1];
        const name = item[2];
        const m = new RegExp(
          "#### Status — item " + pyEscape(num) + "\\n(.*?)(?=\\n### |\\n## |$)",
          "s",
        ).exec(ptext);
        const body = m !== null ? m[1].trim() : "";
        if (body === "" || body.startsWith("*(implement")) {
          pending.push(`${num} — ${name.trim()}`);
        } else if (body.toLowerCase().startsWith("**in progress")) {
          pending.push(`${num} — ${name.trim()} (in progress)`);
        }
      }
    }
    if (pending.length > 0) {
      out.push("  Items without a status block: " + pending.join("; "));
    } else {
      out.push("  Every item has a status block.");
    }
  }
  const grantsPath = path.join(root, ".claude", "rule-zero.grants");
  if (fs.existsSync(grantsPath)) {
    // `g.startswith("#")` is tested on the raw line, before stripping — same as the original.
    const live = readFileLines(grantsPath)
      .filter((g) => g.trim() !== "" && !g.startsWith("#"))
      .map((g) => g.trim());
    if (live.length > 0) {
      out.push(
        "Unused rule-zero grants on file (each is a recorded owner yes, single use): " +
          live.map((g) => `\`${g}\``).join("; "),
      );
    }
  }
  return out;
}

let lines: string[];
try {
  lines = report();
} catch (e) {
  // SessionStart context injection is best-effort: say what went wrong rather than dying, so
  // the orchestrator learns the plan was not reloaded instead of silently assuming it was.
  lines = [`reload-plan could not read the plan (${errText(e)}).`];
}
process.stdout.write(lines.join("\n") + "\n");
process.exitCode = 0;
