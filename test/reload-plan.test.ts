/**
 * test/reload-plan.test.ts — black-box tests for the `reload-plan` SessionStart hook.
 *
 * The hook is spawned as a child process with `CLAUDE_PROJECT_DIR` pointing at a fixture project
 * built under the OS temp dir, and the assertions are on its stdout: that is the whole contract
 * (plain text added to the session's context, always exit 0), and it needs no change to the
 * hook's shape to be tested.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import assert from "node:assert/strict";
import { after, test } from "node:test";

const HOOK = path.join(import.meta.dirname, "..", "template", ".claude", "hooks", "reload-plan.ts");

const PLACEHOLDER = "(implementer keeps this current as it works: In progress → Done | Blocked)";

/** One item section of a phase file: the item heading, its status heading and the given body. */
function itemSection(num: string, name: string, statusBody: string): string {
  return [
    `### Item ${num} — ${name}`,
    "**Files:** none",
    `#### Status — item ${num}`,
    statusBody,
    "",
  ].join("\n");
}

/** A phase file with one item per status shape the hook distinguishes. */
function phaseText(): string {
  return [
    "# Phase 1 — fixture",
    "",
    // The asterisk placeholder as the templates ship it, and the underscore form a formatter
    // (Prettier) re-prints it as: both mean "no status block written yet".
    itemSection("1.1", "Asterisk placeholder", `*${PLACEHOLDER}*`),
    itemSection("1.2", "Underscore placeholder", `_${PLACEHOLDER}_`),
    itemSection("1.3", "Started", "**In progress** (implementer, 2026-01-01)."),
    itemSection("1.4", "Finished", "**Done** (implementer, 2026-01-01)."),
  ].join("\n");
}

/**
 * A plan file carrying the keys the hook echoes back, each value in the exact shape
 * `templates/plan.md` and every archived plan write it: a backticked path with an em-dash clause
 * after it, the branch with its base and its sha. The hook echoes the raw remainder of the line,
 * so a simplified value would not prove that a real one survives the round trip intact.
 */
function planText(): string {
  return [
    "# Plan — fixture",
    "",
    "**Review:** `docs/reviews/x/review.md` — direction **A**, decisions 1–12",
    "**Branch:** `feat/x` off `main` (`abc1234`)",
    '**Owner go-ahead:** 2026-01-01 at the Questions phase — "yes"',
    "",
    "## Owner decisions this plan rests on",
    "",
    "1. The fixture decision.",
    "",
  ].join("\n");
}

/** A fixture project root; `withPlan` false leaves `docs/plans/` absent entirely. */
function makeRoot(withPlan: boolean): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reload-plan-"));
  if (withPlan) {
    const dir = path.join(root, "docs", "plans", "2026-01-01-fixture");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.md"), planText(), "utf8");
    fs.writeFileSync(path.join(dir, "phase-1.md"), phaseText(), "utf8");
  }
  return root;
}

const roots: string[] = [];

/** A fixture root registered for cleanup. */
function fixture(withPlan: boolean): string {
  const root = makeRoot(withPlan);
  roots.push(root);
  return root;
}

after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

/** Run the hook against a project root and return its exit status and streams. */
function runHook(root: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ cwd: root }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: "utf8",
  });
  // A spawn that never started yields null for the streams; `?? ""` keeps the assertions honest.
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

void test("echoes the plan's Review, Branch, Owner go-ahead and owner decisions", () => {
  const { status, stdout, stderr } = runHook(fixture(true));
  assert.equal(status, 0, `hook exited non-zero; stderr: ${stderr}`);
  assert.ok(stdout.includes("Plan — fixture"), `no plan title in:\n${stdout}`);
  // The whole value, backticks and em-dash clause included: the hook prints the raw remainder of
  // the line, and stripping any of it here would let a lossy echo pass.
  assert.ok(
    stdout.includes("Review: `docs/reviews/x/review.md` — direction **A**, decisions 1–12"),
    `no Review line in:\n${stdout}`,
  );
  assert.ok(
    stdout.includes("Branch: `feat/x` off `main` (`abc1234`)"),
    `no Branch line in:\n${stdout}`,
  );
  assert.ok(
    stdout.includes('Owner go-ahead: 2026-01-01 at the Questions phase — "yes"'),
    `no go-ahead line in:\n${stdout}`,
  );
  assert.ok(stdout.includes("1. The fixture decision."), `no owner decisions in:\n${stdout}`);
});

void test("counts both placeholder forms as pending, and Done as not pending", () => {
  const { status, stdout } = runHook(fixture(true));
  assert.equal(status, 0);
  const pending = stdout.split("\n").find((line) => line.includes("Items without a status block:"));
  assert.ok(pending !== undefined, `no pending line in:\n${stdout}`);
  assert.ok(pending.includes("1.1 — Asterisk placeholder"), pending);
  assert.ok(pending.includes("1.2 — Underscore placeholder"), pending);
  assert.ok(pending.includes("1.3 — Started (in progress)"), pending);
  assert.ok(!pending.includes("1.4 —"), pending);
  assert.ok(!stdout.includes("Every item has a status block"), stdout);
});

void test("says docs/plans/ is empty when there is no plan in flight", () => {
  const { status, stdout } = runHook(fixture(false));
  assert.equal(status, 0);
  assert.ok(stdout.includes("docs/plans/ is empty"), stdout);
  assert.ok(!stdout.includes("Live plan:"), stdout);
});
