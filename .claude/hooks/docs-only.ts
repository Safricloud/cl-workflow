#!/usr/bin/env node
/**
 * .claude/hooks/docs-only.ts --base <ref> [--pr <n> --branch <name> --grant]
 *
 * The standing rule: a PR whose changes are documentation or comments only — no code — may be
 * merged by the orchestrator once the review loop is silent, without the owner's word. Because
 * that unlocks a merge, the decision is made here, mechanically and conservatively, not by the
 * orchestrator's judgement. Anything this script is not sure about is "not docs-only".
 *
 * Docs-only means every changed file (base...HEAD) is either
 *   - a documentation path: *.md, *.mdx, *.rst, *.txt, or under docs/ or mem/ (renames and
 *     deletions included). `.claude/` is deliberately NOT a docs path: hooks, settings and
 *     rule-zero.conf change enforcement, and the kit must not be able to self-merge changes to
 *     its own gates. Markdown under .claude/ (rules, skills, agents) still counts by extension;
 *     or
 *   - a code file whose added and removed lines are ALL blank or comment lines for its language.
 *     Only whole-line comments are recognised; a trailing comment on a code line, a line inside a
 *     block comment that does not start with `*`, or an unknown extension → not docs-only.
 *
 * The kit's own payload lives under `template/`, so `template/docs/` and `template/mem/` are
 * documentation paths for exactly the same reason `docs/` and `mem/` are, and everything else
 * under `template/` — `template/.claude/hooks/*.ts`, `settings.json`, `rule-zero.conf` — is
 * judged by the same extension rules as any other code or config. A change to a shipped hook
 * is never "docs".
 *
 * Prints JSON: {"docs_only": bool, "base": ..., "head": ..., "files": [{"path", "class", "why"}]}
 *
 * --grant: if docs_only and --pr/--branch are given, write the merge-cleanup bundle grant
 * (the same three lines as `rule-zero.ts --bundle merge-cleanup`, through the same grants-file
 * writer) and log the standing rule as the "yes".
 * Exit 0 if docs-only, 3 if not, 1 on git error, 2 on bad arguments.
 *
 * Zero dependencies: `node:` builtins only, erasable syntax only.
 */
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { appendGrants, appendLogLine, errText, projectRoot, pyEscape, readLines } from "./lib.ts";

const DOC_EXT = new Set([".md", ".mdx", ".rst", ".txt", ".adoc"]);

/**
 * A documentation directory, matched as a prefix. `template/` is the kit payload's root, so the
 * same two directories inside it are documentation too — see the header. `.claude/` is not here
 * on purpose, at either level.
 */
const DOC_DIRS = ["docs/", "mem/"] as const;
const PAYLOAD_PREFIX = "template/";

/** Whole-line comment markers by file extension. Every set is disjoint. */
const COMMENT: ReadonlyArray<readonly [string, ReadonlySet<string>]> = [
  ["#", new Set([".py", ".sh", ".bash", ".zsh", ".rb", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".pl", ".r", ".ps1", ".dockerfile", ".gitignore", ".env"])],
  ["//", new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".c", ".h", ".cpp", ".hpp", ".cc", ".cs", ".swift", ".kt", ".kts", ".scala", ".php", ".dart", ".groovy", ".proto"])],
  ["--", new Set([".sql", ".lua", ".hs", ".elm"])],
  ["<!--", new Set([".html", ".htm", ".xml", ".svg", ".vue"])],
  ["/*", new Set([".css", ".scss", ".less"])],
];

/** Block-comment continuations accepted alongside the line marker. */
const BLOCK_OK: ReadonlyMap<string, readonly string[]> = new Map([
  ["//", ["/*", "*", "*/"]],
  ["/*", ["/*", "*", "*/"]],
  ["<!--", ["<!--", "-->"]],
  ["#", []],
  ["--", []],
]);

/** Extensionless names with a known language, and one that is documentation. */
const SPECIAL_NAMES: ReadonlyMap<string, string | null> = new Map([
  ["Dockerfile", "#"],
  ["Makefile", "#"],
  ["CLAUDE.md", null],
]);

/** `subprocess.run(["git", ...], timeout=60)`; a non-zero exit becomes the git error. */
function git(...args: string[]): string {
  const r = spawnSync("git", args, { encoding: "utf8", timeout: 60_000 });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error((r.stderr ?? "").trim() || `git ${args.join(" ")} failed`);
  }
  return r.stdout ?? "";
}

/**
 * git reports paths with forward slashes on every platform, so they are split with the POSIX
 * rules rather than the host's — `path.win32` would treat a backslash in a POSIX filename as a
 * directory separator.
 */
function baseName(target: string): string {
  return path.posix.basename(target);
}

/** `os.path.splitext(name)[1].lower()`: `".gitignore"` has **no** extension, in both languages. */
function extensionOf(name: string): string {
  return path.posix.extname(name).toLowerCase();
}

function markerFor(target: string): string | null {
  const name = baseName(target);
  if (SPECIAL_NAMES.has(name)) return SPECIAL_NAMES.get(name) ?? null;
  const ext = extensionOf(name);
  for (const [marker, exts] of COMMENT) {
    if (exts.has(ext)) return marker;
  }
  return null;
}

function isDocPath(target: string): boolean {
  if (DOC_EXT.has(extensionOf(target))) return true;
  const withinPayload = target.startsWith(PAYLOAD_PREFIX)
    ? target.slice(PAYLOAD_PREFIX.length)
    : null;
  return DOC_DIRS.some(
    (dir) => target.startsWith(dir) || (withinPayload !== null && withinPayload.startsWith(dir)),
  );
}

/**
 * Python's `repr()` of a source line, for the `why` field. Exact for printable ASCII, which is
 * every line this reports on in practice.
 */
function pyRepr(text: string): string {
  const quote = text.includes("'") && !text.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of text) {
    if (ch === "\\") out += "\\\\";
    else if (ch === quote) out += "\\" + ch;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out + quote;
}

interface Verdict {
  ok: boolean;
  why: string;
}

/** Every added and removed line in this file is blank, or a whole-line comment for its language. */
function commentOnly(base: string, target: string): Verdict {
  const marker = markerFor(target);
  if (marker === null) return { ok: false, why: "unknown language; cannot classify comment lines" };
  const diff = git("diff", "-U0", "--no-color", `${base}...HEAD`, "--", target);
  for (const line of readLines(diff)) {
    if (line === "" || (line[0] !== "+" && line[0] !== "-")) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    const s = line.slice(1).trim();
    if (s === "") continue;
    let ok =
      s.startsWith(marker) || (BLOCK_OK.get(marker) ?? []).some((block) => s.startsWith(block));
    if (marker === "#" && s.startsWith("#!")) ok = false; // a shebang is code
    if (!ok) return { ok: false, why: `non-comment line changed: ${pyRepr(s.slice(0, 60))}` };
  }
  return { ok: true, why: "only comment/blank lines changed" };
}

const USAGE = `
  docs-only.ts --base <ref> [--pr <n> --branch <name> --grant]
    --base <ref>      what HEAD is compared against, e.g. origin/main (required)
    --pr <n>          pull request number, for the grant
    --branch <name>   branch name, for the grant
    --grant           if the diff is docs-only, write the merge-cleanup bundle grant
`;

interface Options {
  base: string;
  pr: string | undefined;
  branch: string | undefined;
  grant: boolean;
}

/** `argparse` with `required=True` on `--base`, hand-checked: bad arguments exit 2. */
function parseOptions(argv: readonly string[]): Options | null {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv as string[],
      strict: true,
      allowPositionals: false,
      options: {
        base: { type: "string" },
        pr: { type: "string" },
        branch: { type: "string" },
        grant: { type: "boolean" },
      },
    }));
  } catch (e) {
    process.stderr.write(`docs-only: ${errText(e)}\n${USAGE}`);
    return null;
  }
  if (values.base === undefined || values.base === "") {
    process.stderr.write(`docs-only: the following arguments are required: --base\n${USAGE}`);
    return null;
  }
  return {
    base: values.base,
    pr: values.pr,
    branch: values.branch,
    grant: values.grant === true,
  };
}

interface FileVerdict {
  path: string;
  class: string;
  why: string;
}

function main(argv: readonly string[]): number {
  const a = parseOptions(argv);
  if (a === null) return 2;

  let head: string;
  let names: string[];
  try {
    head = git("rev-parse", "HEAD").trim();
    names = readLines(git("diff", "--name-status", `${a.base}...HEAD`));
  } catch (e) {
    process.stderr.write(`docs-only: ${errText(e)}\n`);
    return 1;
  }

  const files: FileVerdict[] = [];
  let docsOnly = true;
  for (const entry of names) {
    const parts = entry.split("\t");
    const status = parts[0];
    const target = parts[parts.length - 1];
    if (isDocPath(target)) {
      files.push({ path: target, class: "docs", why: "documentation path" });
      continue;
    }
    // added/deleted/renamed code file is a code change. `status` is never empty here, but an
    // empty string would make JS's `includes("")` say yes where Python's `in` raises.
    if (status !== "" && "ADR".includes(status[0])) {
      files.push({
        path: target,
        class: "code",
        why: `${status[0]}: file added/deleted/renamed`,
      });
      docsOnly = false;
      continue;
    }
    let verdict: Verdict;
    try {
      verdict = commentOnly(a.base, target);
    } catch (e) {
      process.stderr.write(`docs-only: ${errText(e)}\n`);
      return 1;
    }
    files.push({ path: target, class: verdict.ok ? "comments" : "code", why: verdict.why });
    docsOnly = docsOnly && verdict.ok;
  }
  if (files.length === 0) docsOnly = false; // an empty diff is not a docs-only PR; it is nothing

  const result: Record<string, unknown> = {
    docs_only: docsOnly,
    base: a.base,
    head,
    files,
  };
  if (docsOnly && a.grant && a.pr !== undefined && a.branch !== undefined) {
    const root = projectRoot();
    const grantsPath = path.join(root, ".claude", "rule-zero.grants");
    const b = pyEscape(a.branch);
    // The same three patterns `rule-zero.ts --bundle merge-cleanup` writes, escaped the same
    // Python way and appended through the same writer, so rule-zero reads them back verbatim.
    const lines = [
      `^gh pr merge ${pyEscape(a.pr)}\\b`,
      `^git push origin --delete ${b}$`,
      `^git branch -D ${b}$`,
    ];
    appendGrants(grantsPath, lines);
    // The standing rule is the "yes", so it is logged like one. `appendLogLine` swallows the
    // write error exactly as the Python `except OSError: pass` did.
    appendLogLine(path.join(root, ".claude", "rule-zero.log"), [
      "standing-rule",
      "docs-only",
      "orchestrator",
      "-",
      `PR ${a.pr} ${a.branch} @ ${head.slice(0, 12)}`,
      "grant written",
    ]);
    result.granted = lines;
  }
  // `json.dumps(..., indent=1)` and `JSON.stringify(..., null, 1)` are byte-identical for this
  // shape (measured). Exit code, not stdout, carries the verdict.
  process.stdout.write(JSON.stringify(result, null, 1) + "\n");
  return docsOnly ? 0 : 3;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`docs-only: ${errText(e)}\n`);
  process.exitCode = 1;
}
