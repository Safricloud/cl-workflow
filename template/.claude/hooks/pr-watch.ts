#!/usr/bin/env node
/**
 * .claude/hooks/pr-watch.ts --pr <n> [--interval 60] [--quiet-after 300] [--once] [--reset]
 *
 * The waiting half of the PR review loop, done by a script rather than by the orchestrator
 * sleeping. Polls the PR's head SHA, inline comments and review bodies through `gh api`,
 * remembers what it has already reported (.claude/pr-watch/<n>.json), and prints JSON:
 *
 *   {"head": "<sha>", "quiet_for": <seconds since the head last changed or the watch began>,
 *    "new": [ ...items... ]}
 *
 * Returns:
 *   - as soon as there is at least one new comment or review                     → "new" non-empty
 *   - after --quiet-after seconds (default 5 min) with nothing new; the quiet
 *     window RESTARTS whenever the PR head changes (a push)                      → "new": []
 *   - --once: a single fetch, no waiting
 *   - gh error (auth, network, no such PR)                                       → exit 1, message on stderr
 *
 * Each item: {"kind": "comment"|"review", "id", "author", "state", "path", "line", "body",
 *             "collapsed_sections": [...], "url", "created_at"}
 *
 * Review bodies are returned raw. Copilot collapses low-confidence findings inside <details>
 * blocks; those are extracted into `collapsed_sections` so a review that says "no comments" but
 * carries a suppressed section is visibly not silent. A review with empty state/body and no
 * comments still appears once, so "Copilot posted an empty review" is distinguishable from
 * "Copilot never arrived".
 *
 * Run it in the foreground with a long Bash timeout, or in the background and read its output
 * when it exits. Both work; neither needs the orchestrator to count minutes.
 *
 * This is a CLI, not a hook: it reads no stdin, and its exit code carries the result (0 on a
 * printed payload, 1 on any `gh` failure, 2 on bad arguments). Ported from `pr-watch.py`;
 * zero dependencies, `node:` builtins only, erasable syntax only. The wait is
 * `setTimeout` from `node:timers/promises` — never a busy loop.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

import { asRecord, errText, isRecord, projectRoot } from "./lib.ts";

/** `re.compile(r"<details>(.*?)</details>", re.S | re.I)` — `g` as well, for `matchAll`. */
const DETAILS_RE = /<details>([\s\S]*?)<\/details>/gis;

/** `subprocess.run(..., timeout=60)` in every `gh` call of the original. */
const GH_TIMEOUT_MS = 60_000;

/** Whatever GitHub put in the field. `undefined` is not one of the options — see `orNull`. */
type JsonValue = string | number | boolean | null;

interface WatchItem {
  kind: string;
  id: string;
  author: JsonValue;
  state: JsonValue;
  path: JsonValue;
  line: JsonValue;
  body: string;
  collapsed_sections: string[];
  url: JsonValue;
  created_at: JsonValue;
}

/**
 * Python's `d.get("k")` yields `None` for a missing key and `json.dumps` writes `null`;
 * `JSON.stringify` *drops* a key whose value is `undefined`. Every optional field goes through
 * here so the printed item keeps all ten keys exactly as the Python version printed them.
 */
function orNull(value: unknown): JsonValue {
  return value === undefined ? null : (value as JsonValue);
}

/**
 * Run `gh` and hand back stdout, or throw with gh's own stderr — `RuntimeError` in Python.
 * `failed` is the message used when gh failed silently; the default is the original's
 * `f"gh exited {returncode}"`.
 */
function ghRun(args: readonly string[], failed?: string): string {
  const r = spawnSync("gh", args as string[], { encoding: "utf8", timeout: GH_TIMEOUT_MS });
  // `spawnSync` reports a missing binary or a timeout through `.error` instead of throwing;
  // Python raised `FileNotFoundError`/`TimeoutExpired` here, and both end at exit 1.
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error((r.stderr ?? "").trim() || failed || `gh exited ${r.status ?? r.signal}`);
  }
  return r.stdout ?? "";
}

/** `gh(*args)` — the parsed JSON body, or `[]` when gh printed nothing. */
function ghJson(args: readonly string[]): unknown[] {
  const out = ghRun(args);
  return out.trim() === "" ? [] : (JSON.parse(out) as unknown[]);
}

function repoSlug(): string {
  return ghRun(
    ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
    "gh repo view failed",
  ).trim();
}

function headSha(pr: string): string {
  return ghRun(
    ["pr", "view", pr, "--json", "headRefOid", "-q", ".headRefOid"],
    "gh pr view failed",
  ).trim();
}

function requireId(record: Record<string, unknown>, what: string): string {
  const id = record.id;
  if (id === undefined || id === null) throw new Error(`gh returned a ${what} with no id`);
  return String(id);
}

/** Inline review comments first, then review bodies — the order the original emitted them in. */
function fetch(slug: string, pr: string): WatchItem[] {
  const items: WatchItem[] = [];
  for (const raw of ghJson(["api", `repos/${slug}/pulls/${pr}/comments`, "--paginate"])) {
    if (!isRecord(raw)) throw new Error("gh returned a comment that is not an object");
    items.push({
      kind: "comment",
      id: `c${requireId(raw, "comment")}`,
      author: orNull(asRecord(raw.user).login),
      state: null,
      path: orNull(raw.path),
      // `c.get("line") or c.get("original_line")`: a 0 line falls through, same as Python.
      line: orNull(raw.line || raw.original_line),
      // A JSON `null` body reads as `""` here where Python would have printed `null`; GitHub
      // always sends a string for a review comment.
      body: typeof raw.body === "string" ? raw.body : "",
      collapsed_sections: [],
      url: orNull(raw.html_url),
      created_at: orNull(raw.created_at),
    });
  }
  for (const raw of ghJson(["api", `repos/${slug}/pulls/${pr}/reviews`, "--paginate"])) {
    if (!isRecord(raw)) throw new Error("gh returned a review that is not an object");
    const body = typeof raw.body === "string" ? raw.body : "";
    items.push({
      kind: "review",
      id: `r${requireId(raw, "review")}`,
      author: orNull(asRecord(raw.user).login),
      state: orNull(raw.state),
      path: null,
      line: null,
      body,
      collapsed_sections: [...body.matchAll(DETAILS_RE)].map((m) => m[1].trim()),
      url: orNull(raw.html_url),
      created_at: orNull(raw.submitted_at),
    });
  }
  return items;
}

const USAGE = `
  pr-watch.ts --pr <n> [--interval 60] [--quiet-after 300] [--once] [--reset]
    --pr <n>            pull request number (required)
    --interval <secs>   seconds between polls (default 60)
    --quiet-after <s>   give up after this much silence (default 300); the window
                        restarts whenever the PR head changes
    --once              one fetch, no waiting
    --reset             forget what was seen (new loop)
`;

interface Options {
  pr: string;
  interval: number;
  quietAfter: number;
  once: boolean;
  reset: boolean;
}

/**
 * `argparse` with `type=int` and `required=True`, hand-checked: a missing `--pr`, an unknown
 * flag or a non-integer number all exit 2 with the usage on stderr, exactly as argparse does.
 */
function parseOptions(argv: readonly string[]): Options | null {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv as string[],
      strict: true,
      allowPositionals: false,
      options: {
        pr: { type: "string" },
        interval: { type: "string" },
        "quiet-after": { type: "string" },
        once: { type: "boolean" },
        reset: { type: "boolean" },
      },
    }));
  } catch (e) {
    process.stderr.write(`pr-watch: ${errText(e)}\n${USAGE}`);
    return null;
  }
  const pr = values.pr;
  if (pr === undefined || pr === "") {
    process.stderr.write(`pr-watch: the following arguments are required: --pr\n${USAGE}`);
    return null;
  }
  const asInt = (raw: string | undefined, fallback: number, flag: string): number | null => {
    if (raw === undefined) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      process.stderr.write(`pr-watch: argument ${flag}: invalid int value: '${raw}'\n${USAGE}`);
      return null;
    }
    return n;
  };
  const interval = asInt(values.interval, 60, "--interval");
  if (interval === null) return null;
  const quietAfter = asInt(values["quiet-after"], 300, "--quiet-after");
  if (quietAfter === null) return null;
  return {
    pr,
    interval,
    quietAfter,
    once: values.once === true,
    reset: values.reset === true,
  };
}

async function main(argv: readonly string[]): Promise<number> {
  const a = parseOptions(argv);
  if (a === null) return 2;

  const root = projectRoot();
  const stateDir = path.join(root, ".claude", "pr-watch");
  fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, `${a.pr}.json`);
  const seen = new Set<string>();
  if (fs.existsSync(statePath) && !a.reset) {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as unknown;
    const previous = asRecord(state).seen;
    if (Array.isArray(previous)) for (const id of previous) seen.add(String(id));
  }

  let slug: string;
  try {
    slug = repoSlug();
    if (slug === "") throw new Error("could not determine repo (gh repo view)");
  } catch (e) {
    process.stderr.write(`pr-watch: ${errText(e)}\n`);
    return 1;
  }

  const now = (): number => Date.now() / 1000;
  let quietSince = now();
  let lastHead: string | null = null;
  for (;;) {
    let head: string;
    let items: WatchItem[];
    try {
      head = headSha(a.pr);
      items = fetch(slug, a.pr);
    } catch (e) {
      process.stderr.write(`pr-watch: ${errText(e)}\n`);
      return 1;
    }
    if (lastHead !== null && head !== lastHead) {
      quietSince = now(); // a push restarts the quiet window
    }
    lastHead = head;
    const fresh = items.filter((item) => !seen.has(item.id));
    const quietFor = Math.trunc(now() - quietSince);
    if (fresh.length > 0 || a.once || quietFor >= a.quietAfter) {
      for (const item of fresh) seen.add(item.id);
      // The state file is this script's own bookkeeping; Python wrote it with `json.dump`'s
      // spaced separators, we write it compact. Both round-trip through either reader.
      fs.writeFileSync(
        statePath,
        JSON.stringify({ seen: [...seen].sort(), head, checked_at: Math.trunc(now()) }),
        "utf8",
      );
      // `json.dumps(..., indent=1)` and `JSON.stringify(..., null, 1)` are byte-identical for
      // this shape (measured), so the orchestrator reads exactly what it read before.
      process.stdout.write(JSON.stringify({ head, quiet_for: quietFor, new: fresh }, null, 1) + "\n");
      return 0;
    }
    await sleep(a.interval * 1000);
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (e) {
  // Anything unforeseen (an unreadable state file, a malformed gh payload) lands here with the
  // same one-line shape the gh failures use, and the same exit code Python's traceback gave.
  process.stderr.write(`pr-watch: ${errText(e)}\n`);
  process.exitCode = 1;
}
