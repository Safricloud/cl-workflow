/**
 * .claude/hooks/lib.ts — the helpers every hook in this directory shares.
 *
 * Zero dependencies, `node:` builtins only, erasable syntax only (no enums, no namespaces,
 * no parameter properties) so Node runs these files directly by stripping the types.
 * Sibling imports must carry the explicit `.ts` extension: `import { … } from "./lib.ts"`.
 *
 * Ported from the Python originals. Where Python and JavaScript genuinely differ, the
 * comment names the difference; everything else is a literal translation.
 *
 * The one rule that must never be broken: a hook's deny channel is stdout JSON at exit 0.
 * A hook that throws, or exits non-zero, fails *open* — Claude Code treats it as a
 * non-blocking error and lets the tool call through.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/* ------------------------------------------------------------------ small value helpers */

/** True for a plain JSON object — not null, not an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `payload.get("k") or {}` — anything that is not an object becomes an empty one. */
export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/** `payload.get("k", fallback)` for string fields; a non-string reads as absent. */
export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Python's `f"…{e}"` for an exception is `str(e)`, i.e. the message. */
export function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** `CLAUDE_PROJECT_DIR` if set, else the process cwd — the root every hook resolves against. */
export function projectRoot(): string {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

/* -------------------------------------------------------------------------- hook stdout */

/**
 * The deny payload Claude Code understands. Emitting it is the *only* way a PreToolUse hook
 * blocks a tool call; the process still exits 0.
 */
export function denyJson(reason: string, hookEventName = "PreToolUse"): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName,
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  });
}

/**
 * Write the deny line. Deliberately no `process.exit()`: the caller returns normally so the
 * pipe is flushed by Node at natural exit, and the exit code stays 0.
 */
export function emitDeny(reason: string, hookEventName = "PreToolUse"): void {
  process.stdout.write(denyJson(reason, hookEventName) + "\n");
}

/** `json.load(sys.stdin)` — read the whole of fd 0, then parse. Throws like Python does. */
export function readStdinJson(): unknown {
  return JSON.parse(fs.readFileSync(0, "utf8"));
}

/* ----------------------------------------------------------------------------- text I/O */

/**
 * Python's `[ln.rstrip("\n") for ln in open(p)]`, including universal newlines: `\r\n` and a
 * lone `\r` both read as a line break, and a trailing break does not produce a final empty
 * line. `""` → `[]`, `"\n"` → `[""]`, `"a\nb\n"` → `["a","b"]`.
 */
export function readLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Lines of a file, or `[]` when it does not exist. */
export function readFileLines(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  return readLines(fs.readFileSync(filePath, "utf8"));
}

/* -------------------------------------------------------------------------------- regex */

/**
 * Compile a user-authored pattern — a `rule-zero.conf` rule or a `rule-zero.grants` line.
 *
 * **No `u`/`v` flag, ever.** Python's `re.escape` (which wrote every grant file this kit has
 * ever produced, and `--bundle` still does) emits `\-`, `\ `, `\#`, `\~`, `\&`; each of those
 * is a hard SyntaxError under `u` and harmless without it. Measured over 26 conf patterns ×
 * 50 subjects with zero behavioural differences — investigation-hooks.md §2.
 *
 * Known silent dialect differences, left alone on purpose: `\A`/`\Z`/`\z` are literal letters
 * in JS rather than anchors, and `$` does not match before a trailing newline. No shipped
 * pattern uses them, and "fixing" a pattern behind the author's back is worse than the gap.
 */
export function compilePattern(pattern: string): RegExp {
  return new RegExp(pattern);
}

/**
 * Python `re.escape` (3.7+), hand-rolled: it backslashes exactly `()[]{}?*+-|^$\.&~#`, the
 * space and `\t\n\r\v\f`, and leaves everything else — including `/` and `:` — alone.
 *
 * Not `RegExp.escape`: that emits `\x66eat\/x` for `feat/x`, and grants files are read,
 * hand-edited and quoted into plan documents by the owner (investigation-hooks.md §2).
 */
const PY_ESCAPE_CHARS = new Set<string>(Array.from("()[]{}?*+-|^$\\.&~# \t\n\r\v\f"));

export function pyEscape(text: string): string {
  let out = "";
  for (const ch of text) out += PY_ESCAPE_CHARS.has(ch) ? "\\" + ch : ch;
  return out;
}

/* --------------------------------------------------------------------------- conf parser */

export type ConfVerb = "deny" | "allow" | "guard";

export interface ConfRule {
  verb: ConfVerb;
  rx: RegExp;
  /** `rule-zero.conf:31 guard git push …` — quoted back to the caller in every deny reason. */
  src: string;
}

export interface ConfBadLine {
  n: number;
  pattern: string;
  error: string;
}

export interface ConfLoad {
  rules: ConfRule[];
  /** The first line that would not compile, if any. Load stops there, exactly as Python does. */
  bad: ConfBadLine | null;
}

const CONF_VERBS: readonly string[] = ["deny", "allow", "guard"];

/**
 * One rule per line: `<verb> <pattern>`. Blank lines and lines whose *first* character is `#`
 * are skipped — a trailing comment is part of the pattern, same as the Python version.
 *
 * A pattern that does not compile is fail-closed: parsing stops and `bad` is returned so the
 * caller can deny with a reason naming the line. The caller must not swallow it.
 */
export function loadConf(confPath: string): ConfLoad {
  const rules: ConfRule[] = [];
  const base = path.basename(confPath);
  const lines = readLines(fs.readFileSync(confPath, "utf8"));
  for (let i = 0; i < lines.length; i++) {
    const n = i + 1;
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const cut = line.indexOf(" ");
    const verb = cut === -1 ? line : line.slice(0, cut);
    const pattern = (cut === -1 ? "" : line.slice(cut + 1)).trim();
    if (!CONF_VERBS.includes(verb) || pattern === "") continue;
    try {
      rules.push({
        verb: verb as ConfVerb,
        rx: compilePattern(pattern),
        src: `${base}:${n} ${verb} ${pattern}`,
      });
    } catch (e) {
      return { rules, bad: { n, pattern, error: errText(e) } };
    }
  }
  return { rules, bad: null };
}

/** The first rule with this verb whose pattern is found in `subject`, or null. */
export function firstMatch(
  rules: readonly ConfRule[],
  verb: ConfVerb,
  subject: string,
): string | null {
  for (const rule of rules) {
    if (rule.verb === verb && rule.rx.test(subject)) return rule.src;
  }
  return null;
}

/* -------------------------------------------------------------------------- bash subject */

/**
 * Split a Bash command the way the gate judges it: on `&&`, `||`, `;`, `|` and newlines, with
 * surrounding whitespace absorbed. The group stays non-capturing — a capturing group would
 * make `String.split` interleave the delimiters into the result. Quotes are not parsed; this
 * is best-effort, the same limitation Claude Code's own `if` filter has.
 */
const SPLIT_RE = /\s*(?:&&|\|\||;|\||\n)\s*/;

export function splitBashSegments(command: string): string[] {
  return command.split(SPLIT_RE).filter((segment) => segment !== "");
}

/* ---------------------------------------------------------------------------- path logic */

/**
 * `os.path.expanduser`. Only a leading `~` (alone, or before a separator) is expanded — a
 * `~user` form is left as written, which is what posixpath does when the lookup fails.
 */
export function expandUser(target: string): string {
  if (target === "~") return os.homedir();
  const sepAfterTilde =
    target.startsWith("~/") || (process.platform === "win32" && target.startsWith("~\\"));
  return sepAfterTilde ? path.join(os.homedir(), target.slice(2)) : target;
}

/**
 * `os.path.realpath` — the *non-strict* one. `fs.realpathSync` throws ENOENT on a path that
 * does not exist yet, and both path-judging hooks resolve paths that usually do not (a Write
 * to a new file), so walk up to the nearest existing ancestor, canonicalise that, and put the
 * tail back. On Windows this also expands 8.3 short names, exactly as Python's does.
 */
export function pyRealpath(target: string): string {
  const resolved = path.resolve(target);
  const tail: string[] = [];
  let current = resolved;
  for (;;) {
    try {
      const real = fs.realpathSync(current);
      return tail.length === 0 ? real : path.join(real, ...tail);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return resolved;
      tail.unshift(path.basename(current));
      current = parent;
    }
  }
}

/* ------------------------------------------------------------------------ grants and log */

/**
 * Every line of the grants file, blanks and comments included — the caller needs the raw list
 * because consuming a grant rewrites the file from it.
 */
export function readGrants(grantsPath: string): string[] {
  return readFileLines(grantsPath);
}

/** Rewrite the grants file. LF endings; an empty list leaves an empty file, not a bare newline. */
export function writeGrants(grantsPath: string, lines: readonly string[]): void {
  fs.writeFileSync(grantsPath, lines.length === 0 ? "" : lines.join("\n") + "\n", "utf8");
}

/** Append one single-use grant per pattern. The file format is one regex per line. */
export function appendGrants(grantsPath: string, patterns: readonly string[]): void {
  let text = "";
  for (const pattern of patterns) text += pattern + "\n";
  fs.appendFileSync(grantsPath, text, "utf8");
}

/**
 * The first grant line whose regex is found in `subject`, or null.
 *
 * A grant line that does not compile is *skipped*, not denied — the opposite of a bad conf
 * line, and deliberately so: a malformed grant must not lock the owner out of the repo.
 */
export function findGrant(grants: readonly string[], subject: string): string | null {
  for (const grant of grants) {
    const trimmed = grant.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    try {
      if (compilePattern(trimmed).test(subject)) return grant;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Spend a grant: every line equal to the used one is removed, so a duplicated grant is
 * destroyed with its twin. That is the Python behaviour and it is the safe direction.
 */
export function consumeGrant(
  grantsPath: string,
  grants: readonly string[],
  used: string,
): void {
  writeGrants(grantsPath, grants.filter((grant) => grant !== used));
}

/** `2026-08-25T16:01:01Z` — byte-identical to the Python `strftime` format. */
export function utcStamp(when: Date = new Date()): string {
  return when.toISOString().slice(0, 19) + "Z";
}

/**
 * Append one tab-separated line to `.claude/rule-zero.log`. Never throws: the log is a record,
 * never a gate, and a hook that dies writing it would fail open.
 */
export function appendLogLine(logPath: string, fields: readonly string[]): void {
  try {
    fs.appendFileSync(logPath, fields.join("\t") + "\n", "utf8");
  } catch {
    // OSError: pass
  }
}
