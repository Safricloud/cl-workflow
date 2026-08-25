#!/usr/bin/env node
/**
 * src/cli.ts — the whole installer: `init`, `update`, `doctor`.
 *
 * One file, zero runtime dependencies, `node:` builtins only, erasable syntax only. It is
 * compiled by `tsc -p tsconfig.build.json` to `dist/cli.js`, which is committed: Node refuses
 * to strip types from any file under `node_modules` (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING,
 * no flag overrides it), and that is exactly where `npx github:…` puts this package. The
 * payload's hooks stay real `.ts` because `init` copies them *out* of `node_modules` first.
 *
 * The payload manifest is derived from `template/` as it exists at run time — never a static
 * list. A stale list here is how the ESM shim `.claude/hooks/package.json` or a whole hook
 * would silently stop shipping, and a hook that cannot start fails OPEN.
 *
 * Hashes are sha256 over LF-normalised text ("sha256-lf"). Raw byte hashes are not stable:
 * npm's git install checks the tarball out with the *installing* machine's `core.autocrlf`,
 * so the same kit version reaches a Windows user as CRLF and a Linux user as LF.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
/* ----------------------------------------------------------------------- constants */
/**
 * Payload paths (template-relative) the kit seeds once and then never rewrites — the
 * project's own files from the moment they land. Everything else under `template/` is
 * managed, except `settings.json`, which is merged key by key.
 */
const OWNED = [
    ".claude/rule-zero.conf",
    "CLAUDE.md",
    "docs/history/.gitkeep",
    "docs/history/index.md",
    "docs/plans/.gitkeep",
    "docs/reports/.gitkeep",
    "docs/reviews/.gitkeep",
    "mem/index.md",
    "mem/outstanding.md",
];
/** The one file that is neither managed nor owned. The kit occupies four keys inside it. */
const MERGED = ".claude/settings.json";
const LOCK_REL = ".claude/cl-workflow.lock";
const HASH_ALGO = "sha256-lf";
const MIN_NODE_MAJOR = 24;
/** The self-test's case count. Bump this with the suite; `doctor` asserts it exactly. */
const EXPECTED_SELFTEST_CASES = 62;
/** Printed whenever a wired hook script is missing. The failure mode is the quiet one. */
const FAILS_OPEN = "A hook whose script path is wrong fails OPEN — Claude Code reports it as a non-blocking\n" +
    "        error and runs the tool call anyway. The gate is not protecting this project until\n" +
    "        every path above resolves.";
const USAGE = `cl-workflow — the contribution kit's installer

  cl-workflow init   [dir]   copy the payload in (default "."); never clobbers
  cl-workflow update [dir]   refresh the managed files only; merge settings.json
  cl-workflow doctor [dir]   check Node, the lock, the wiring, and run the self-test

Run it straight from GitHub:  npx --yes github:Safricloud/cl-workflow init`;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toPosix(p) {
    return p.replace(/\\/g, "/");
}
function say(line) {
    process.stdout.write(line + "\n");
}
function die(message) {
    process.stderr.write("cl-workflow: " + message + "\n");
    process.exit(1);
}
/** Read as text and normalise to LF. The payload is text only; nothing here is binary. */
function readLf(file) {
    return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}
/** Write LF, creating parents. The user's git may rewrite it afterwards; hashing absorbs that. */
function writeLf(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text.replace(/\r\n/g, "\n"), "utf8");
}
function hashText(text) {
    return createHash("sha256").update(text.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}
function abs(targetDir, rel) {
    return path.join(targetDir, ...rel.split("/"));
}
/* ----------------------------------------------------------------------- the payload */
function walk(dir, base) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory())
            out.push(...walk(p, base));
        else if (entry.isFile())
            out.push(toPosix(path.relative(base, p)));
    }
    return out;
}
/**
 * `npm pack` silently drops any file literally named `.gitignore`, so the payload ships it
 * as `gitignore` and the rename happens here. Without it every install commits its own
 * grants, log and worktrees.
 */
function targetRel(src) {
    const cut = src.lastIndexOf("/") + 1;
    return src.slice(cut) === "gitignore" ? src.slice(0, cut) + ".gitignore" : src;
}
function classify(src) {
    if (src === MERGED)
        return "merged";
    return OWNED.indexOf(src) >= 0 ? "owned" : "managed";
}
/** The manifest, derived from `template/` on every run. Never a hand-kept list. */
function payload(templateDir) {
    const files = walk(templateDir, templateDir).map(function (src) {
        return { src: src, rel: targetRel(src), cls: classify(src) };
    });
    files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
    return files;
}
/** The hook scripts, in landing order — `lib.ts` is shared code, not a hook. */
function hooksManifest(files) {
    const prefix = ".claude/hooks/";
    return files
        .map((f) => f.rel)
        .filter((rel) => rel.startsWith(prefix) && rel.endsWith(".ts") && rel !== prefix + "lib.ts")
        .map((rel) => rel.slice(prefix.length))
        .sort();
}
/** `rule-zero.ts` → `rule-zero`, so a legacy `rule-zero.py` entry is still recognised as ours. */
function stemSet(manifest) {
    return new Set(manifest.map((name) => name.replace(/\.[^.]*$/, "")));
}
/* ----------------------------------------------------------------------- the kit itself */
/**
 * npm writes neither `gitHead` nor `_resolved` into a git-installed package, but npx does
 * write a `package-lock.json` above `node_modules/`, and its `resolved` field carries the SHA.
 */
function installedSha(root, name) {
    const candidates = [
        path.join(root, "..", "..", "package-lock.json"),
        path.join(root, "..", "..", "..", "package-lock.json"),
    ];
    for (const candidate of candidates) {
        if (!fs.existsSync(candidate))
            continue;
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
        }
        catch {
            continue; // an unreadable lock is simply "no SHA"
        }
        if (!isRecord(parsed))
            continue;
        const packages = parsed["packages"];
        if (!isRecord(packages))
            continue;
        for (const key of Object.keys(packages)) {
            const tail = "node_modules/" + name;
            if (key !== tail && !key.endsWith("/" + tail))
                continue;
            const entry = packages[key];
            if (!isRecord(entry))
                continue;
            const resolved = entry["resolved"];
            if (typeof resolved !== "string")
                continue;
            const at = resolved.indexOf("#");
            if (at < 0)
                continue;
            const sha = resolved.slice(at + 1);
            if (/^[0-9a-f]{40}$/.test(sha))
                return sha;
        }
    }
    return null;
}
function loadKit() {
    const root = path.dirname(import.meta.dirname);
    const manifestPath = path.join(root, "package.json");
    if (!fs.existsSync(manifestPath))
        die(`no package.json at ${root} — the package is incomplete`);
    const pkg = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const name = isRecord(pkg) && typeof pkg["name"] === "string" ? pkg["name"] : "cl-workflow";
    const version = isRecord(pkg) && typeof pkg["version"] === "string" ? pkg["version"] : "0.0.0";
    const templateDir = path.join(root, "template");
    if (!fs.existsSync(templateDir))
        die(`no template/ at ${root} — the package is incomplete`);
    return {
        root: root,
        templateDir: templateDir,
        name: name,
        version: version,
        kitVersion: { version: version, sha: installedSha(root, name) },
    };
}
function versionLabel(kitVersion) {
    return kitVersion.sha === null ? kitVersion.version : kitVersion.version + "+" + kitVersion.sha.slice(0, 7);
}
/* ----------------------------------------------------------------------- the lock file */
function loadLock(targetDir) {
    const file = abs(targetDir, LOCK_REL);
    if (!fs.existsSync(file))
        return null;
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
    if (!isRecord(parsed))
        return null;
    const kitVersion = isRecord(parsed["kitVersion"]) ? parsed["kitVersion"] : {};
    const files = isRecord(parsed["files"]) ? parsed["files"] : {};
    const clean = {};
    for (const key of Object.keys(files)) {
        const value = files[key];
        if (typeof value === "string")
            clean[key] = value;
    }
    const manifest = parsed["hooksManifest"];
    return {
        kitVersion: {
            version: typeof kitVersion["version"] === "string" ? kitVersion["version"] : "unknown",
            sha: typeof kitVersion["sha"] === "string" ? kitVersion["sha"] : null,
        },
        hashAlgo: typeof parsed["hashAlgo"] === "string" ? parsed["hashAlgo"] : HASH_ALGO,
        files: clean,
        hooksManifest: Array.isArray(manifest) ? manifest.filter((n) => typeof n === "string") : [],
    };
}
function writeLock(targetDir, lock) {
    const ordered = {};
    for (const key of Object.keys(lock.files).sort()) {
        const value = lock.files[key];
        if (value !== undefined)
            ordered[key] = value;
    }
    const body = {
        kitVersion: lock.kitVersion,
        hashAlgo: lock.hashAlgo,
        files: ordered,
        hooksManifest: lock.hooksManifest,
    };
    writeLf(abs(targetDir, LOCK_REL), JSON.stringify(body, null, 2) + "\n");
}
/* ----------------------------------------------------------------------- settings.json */
/**
 * A hook entry is the kit's iff it points at one of the hook scripts the kit ships. Ownership
 * is derived structurally — the documented hook-entry schema is a closed set, so stamping a
 * marker key on our entries risks rejection. The extension is stripped so that a legacy
 * `python3 …/rule-zero.py` entry is recognised and retired rather than left beside its
 * replacement.
 */
const HOOK_PATH = /(?:^|\/)\.claude\/hooks\/([^/]+)$/;
/** Every script path under `.claude/hooks/` that one hook entry names, `command` included. */
function hookScripts(entry) {
    if (!isRecord(entry))
        return [];
    const fields = [entry["command"]];
    const args = entry["args"];
    if (Array.isArray(args))
        fields.push(...args.filter((a) => typeof a === "string"));
    const out = [];
    for (const field of fields) {
        if (typeof field === "string" && HOOK_PATH.test(toPosix(field)))
            out.push(field);
    }
    return out;
}
function isKitHookEntry(entry, stems) {
    for (const script of hookScripts(entry)) {
        const stem = HOOK_PATH.exec(toPosix(script))?.[1];
        if (stem !== undefined && stems.has(stem.replace(/\.[^.]*$/, "")))
            return true;
    }
    return false;
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
/**
 * Merge only what the kit occupies: `worktree.baseRef` and its own entries inside the hook
 * matcher groups it ships. `permissions`, `env`, `model`, every other hook event and every
 * foreign entry inside a shared matcher group survive byte-stable. A whole-file overwrite
 * would destroy project permissions; a whole-file skip would strand hook changes forever.
 */
function mergeSettings(templateText, currentText, stems) {
    const template = JSON.parse(templateText);
    const parsedCurrent = currentText === null ? {} : JSON.parse(currentText);
    if (!isRecord(template))
        die("template settings.json is not a JSON object");
    const merged = isRecord(parsedCurrent) ? parsedCurrent : {};
    const templateWorktree = template["worktree"];
    if (isRecord(templateWorktree) && "baseRef" in templateWorktree) {
        const existing = merged["worktree"];
        const worktree = isRecord(existing) ? existing : {};
        worktree["baseRef"] = templateWorktree["baseRef"];
        merged["worktree"] = worktree;
    }
    const templateHooks = template["hooks"];
    if (isRecord(templateHooks)) {
        const existingHooks = merged["hooks"];
        const hooks = isRecord(existingHooks) ? existingHooks : {};
        for (const event of Object.keys(templateHooks)) {
            const templateGroups = templateHooks[event];
            if (!Array.isArray(templateGroups))
                continue;
            const existingGroups = hooks[event];
            const groups = Array.isArray(existingGroups) ? existingGroups.slice() : [];
            for (const templateGroup of templateGroups) {
                if (!isRecord(templateGroup))
                    continue;
                const kitEntries = Array.isArray(templateGroup["hooks"]) ? templateGroup["hooks"] : [];
                const at = groups.findIndex((g) => isRecord(g) && g["matcher"] === templateGroup["matcher"]);
                if (at < 0) {
                    groups.push(clone(templateGroup));
                    continue;
                }
                const group = groups[at];
                const existing = Array.isArray(group["hooks"]) ? group["hooks"] : [];
                const rebuilt = [];
                let placed = false;
                for (const entry of existing) {
                    if (isKitHookEntry(entry, stems)) {
                        if (!placed) {
                            rebuilt.push(...clone(kitEntries));
                            placed = true;
                        }
                        continue; // the old kit entry is retired, not kept beside its replacement
                    }
                    rebuilt.push(entry);
                }
                if (!placed)
                    rebuilt.push(...clone(kitEntries));
                group["hooks"] = rebuilt;
            }
            hooks[event] = groups;
        }
        merged["hooks"] = hooks;
    }
    // The template file carries no trailing newline; reproduce it byte for byte on a fresh install.
    return JSON.stringify(merged, null, 2);
}
/* ----------------------------------------------------------------------- init */
function cmdInit(targetDir) {
    const kit = loadKit();
    const files = payload(kit.templateDir);
    const manifest = hooksManifest(files);
    const stems = stemSet(manifest);
    const recorded = {};
    let written = 0;
    let skipped = 0;
    let beside = 0;
    say(`cl-workflow ${versionLabel(kit.kitVersion)} — init into ${targetDir}`);
    for (const file of files) {
        const source = readLf(path.join(kit.templateDir, ...file.src.split("/")));
        const dest = abs(targetDir, file.rel);
        if (file.cls === "merged") {
            const current = fs.existsSync(dest) ? readLf(dest) : null;
            const result = mergeSettings(source, current, stems);
            recorded[file.rel] = hashText(result);
            if (current !== null && current === result) {
                say(`  skip   ${file.rel} (already current)`);
                skipped++;
            }
            else if (current === null) {
                writeLf(dest, result);
                say(`  write  ${file.rel}`);
                written++;
            }
            else {
                writeLf(dest, result);
                say(`  merge  ${file.rel} (kit keys only; your other keys untouched)`);
                written++;
            }
            continue;
        }
        if (!fs.existsSync(dest)) {
            writeLf(dest, source);
            recorded[file.rel] = hashText(source);
            say(`  write  ${file.rel}`);
            written++;
            continue;
        }
        const current = readLf(dest);
        if (current === source) {
            recorded[file.rel] = hashText(source);
            say(`  skip   ${file.rel} (identical)`);
            skipped++;
            continue;
        }
        // Never clobber. The lock deliberately does not record this path: the kit did not
        // install what is on disk, so `update` must keep treating it as the project's own.
        writeLf(dest + ".new", source);
        say(`  warn   ${file.rel} exists and differs — wrote ${file.rel}.new beside it, yours untouched`);
        beside++;
    }
    writeLock(targetDir, {
        kitVersion: kit.kitVersion,
        hashAlgo: HASH_ALGO,
        files: recorded,
        hooksManifest: manifest,
    });
    say(`  write  ${LOCK_REL} (${Object.keys(recorded).length} files, ${HASH_ALGO})`);
    say(`init: ${written} written, ${skipped} skipped, ${beside} left beside as .new`);
    if (beside > 0)
        say(`  review the .new files, then delete them — nothing was overwritten`);
    return 0;
}
/* ----------------------------------------------------------------------- update */
function cmdUpdate(targetDir) {
    const kit = loadKit();
    const files = payload(kit.templateDir);
    const manifest = hooksManifest(files);
    const stems = stemSet(manifest);
    const previous = loadLock(targetDir);
    const recorded = previous === null ? {} : { ...previous.files };
    let refreshed = 0;
    let current = 0;
    let edited = 0;
    let owned = 0;
    let removed = 0;
    say(`cl-workflow ${versionLabel(kit.kitVersion)} — update ${targetDir}`);
    if (previous === null) {
        say(`  warn   no ${LOCK_REL} — a managed file that does not match this version byte for`);
        say(`         byte has to be treated as locally edited`);
    }
    for (const file of files) {
        const source = readLf(path.join(kit.templateDir, ...file.src.split("/")));
        const dest = abs(targetDir, file.rel);
        if (file.cls === "owned") {
            owned++;
            continue; // yours from the moment it landed
        }
        if (file.cls === "merged") {
            const before = fs.existsSync(dest) ? readLf(dest) : null;
            const result = mergeSettings(source, before, stems);
            recorded[file.rel] = hashText(result);
            if (before === result) {
                say(`  ok     ${file.rel} (kit keys already current)`);
                current++;
            }
            else {
                writeLf(dest, result);
                say(`  merge  ${file.rel} (kit keys only; your other keys untouched)`);
                refreshed++;
            }
            continue;
        }
        if (!fs.existsSync(dest)) {
            writeLf(dest, source);
            recorded[file.rel] = hashText(source);
            say(`  write  ${file.rel} (was missing)`);
            refreshed++;
            continue;
        }
        const onDisk = readLf(dest);
        if (onDisk === source) {
            recorded[file.rel] = hashText(source);
            current++;
            continue;
        }
        // "Matches a shipped version" without a hash history is: matches what the lock says the
        // kit last installed here. That is the whole point of recording hashes at install time.
        const installed = previous === null ? undefined : previous.files[file.rel];
        if (installed !== undefined && installed === hashText(onDisk)) {
            writeLf(dest, source);
            recorded[file.rel] = hashText(source);
            say(`  update ${file.rel}`);
            refreshed++;
            continue;
        }
        writeLf(dest + ".new", source);
        say(`  warn   ${file.rel} has local edits — wrote ${file.rel}.new beside it, yours untouched`);
        edited++;
    }
    // A file the kit used to ship and no longer does: remove it only if it is still exactly
    // what the kit installed. Anything else is the project's now.
    const shipped = new Set(files.map((f) => f.rel));
    for (const rel of Object.keys(recorded)) {
        if (shipped.has(rel))
            continue;
        const dest = abs(targetDir, rel);
        if (!fs.existsSync(dest)) {
            delete recorded[rel];
            continue;
        }
        if (hashText(readLf(dest)) === recorded[rel]) {
            fs.rmSync(dest);
            delete recorded[rel];
            say(`  remove ${rel} (no longer shipped)`);
            removed++;
        }
        else {
            say(`  warn   ${rel} is no longer shipped but has local edits — left in place`);
        }
    }
    writeLock(targetDir, {
        kitVersion: kit.kitVersion,
        hashAlgo: HASH_ALGO,
        files: recorded,
        hooksManifest: manifest,
    });
    say(`update: ${refreshed} refreshed, ${current} already current, ${edited} left beside as .new, ` +
        `${removed} removed, ${owned} owned files untouched`);
    if (edited > 0)
        say(`  merge each .new by hand, then delete it — nothing was overwritten`);
    return 0;
}
function pass(state, line) {
    state.passed++;
    say(`  ok     ${line}`);
}
function fail(state, line, detail) {
    state.failed++;
    say(`  FAIL   ${line}`);
    if (detail !== undefined)
        say(`         ${detail}`);
}
function cmdDoctor(targetDir) {
    const kit = loadKit();
    const files = payload(kit.templateDir);
    const manifest = hooksManifest(files);
    const stems = stemSet(manifest);
    const state = { passed: 0, failed: 0 };
    say(`cl-workflow ${versionLabel(kit.kitVersion)} — doctor on ${targetDir}`);
    // 1. Node's own floor. `engines` is advisory unless the user set engine-strict, so the
    //    check has to live here.
    const major = Number(process.versions.node.split(".")[0]);
    if (major >= MIN_NODE_MAJOR)
        pass(state, `node v${process.versions.node} (>= ${MIN_NODE_MAJOR})`);
    else
        fail(state, `node v${process.versions.node} — the kit needs Node >= ${MIN_NODE_MAJOR}`);
    // 2. The lock.
    const lock = loadLock(targetDir);
    if (lock === null) {
        fail(state, `${LOCK_REL} missing or unparseable`, "run `cl-workflow init` here first");
    }
    else {
        pass(state, `${LOCK_REL} — kit ${versionLabel(lock.kitVersion)}, ${Object.keys(lock.files).length} files, ${lock.hashAlgo}`);
    }
    // 3. settings.json parses, and every kit hook command points at a file that exists.
    const settingsPath = abs(targetDir, MERGED);
    if (!fs.existsSync(settingsPath)) {
        fail(state, `${MERGED} missing`, FAILS_OPEN);
    }
    else {
        let settings;
        try {
            settings = JSON.parse(readLf(settingsPath));
        }
        catch (e) {
            settings = null;
            fail(state, `${MERGED} does not parse as JSON (${e instanceof Error ? e.message : String(e)})`);
        }
        if (settings !== null) {
            const wired = [];
            const broken = [];
            const hooks = isRecord(settings) ? settings["hooks"] : undefined;
            if (isRecord(hooks)) {
                for (const event of Object.keys(hooks)) {
                    const groups = hooks[event];
                    if (!Array.isArray(groups))
                        continue;
                    for (const group of groups) {
                        if (!isRecord(group))
                            continue;
                        const entries = group["hooks"];
                        if (!Array.isArray(entries))
                            continue;
                        for (const entry of entries) {
                            if (!isKitHookEntry(entry, stems))
                                continue;
                            for (const script of hookScripts(entry)) {
                                const resolved = script.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, targetDir);
                                const rel = toPosix(path.relative(targetDir, resolved));
                                if (fs.existsSync(resolved))
                                    wired.push(rel);
                                else
                                    broken.push(rel);
                            }
                        }
                    }
                }
            }
            if (broken.length > 0)
                fail(state, `${MERGED} — hook script missing: ${broken.join(", ")}`, FAILS_OPEN);
            else if (wired.length === 0)
                fail(state, `${MERGED} wires none of the kit's hooks`, FAILS_OPEN);
            else
                pass(state, `${MERGED} — ${wired.length} kit hook command(s), every script present`);
        }
    }
    // 4. The ESM shim. A "type":"commonjs" project turns every `.ts` hook into a syntax error,
    //    and a hook that cannot start fails open.
    const shim = abs(targetDir, ".claude/hooks/package.json");
    if (!fs.existsSync(shim)) {
        fail(state, `.claude/hooks/package.json missing`, `without {"type":"module"} the hooks break in a "type":"commonjs" project. ` + FAILS_OPEN);
    }
    else {
        let type;
        try {
            const parsed = JSON.parse(readLf(shim));
            type = isRecord(parsed) ? parsed["type"] : undefined;
        }
        catch {
            type = undefined;
        }
        if (type === "module")
            pass(state, `.claude/hooks/package.json — {"type":"module"}`);
        else
            fail(state, `.claude/hooks/package.json does not set "type":"module"`, FAILS_OPEN);
    }
    // 5. Every hook script the kit ships is actually on disk — four of them are invoked from
    //    the agent frontmatter and the skill, not from settings.json.
    const missing = manifest.filter((name) => !fs.existsSync(abs(targetDir, ".claude/hooks/" + name)));
    if (missing.length > 0)
        fail(state, `hook script(s) missing: ${missing.join(", ")}`, "run `cl-workflow update` here");
    else
        pass(state, `${manifest.length} hook scripts present`);
    // 6. Managed files still byte-identical to what the kit installed. A warning, not a failure:
    //    a local edit is legal, it just means `update` will hand you a `.new`.
    if (lock !== null) {
        const drifted = [];
        for (const file of files) {
            if (file.cls !== "managed")
                continue;
            const installed = lock.files[file.rel];
            const dest = abs(targetDir, file.rel);
            if (installed === undefined || !fs.existsSync(dest))
                continue;
            if (hashText(readLf(dest)) !== installed)
                drifted.push(file.rel);
        }
        if (drifted.length > 0)
            say(`  warn   ${drifted.length} managed file(s) locally edited: ${drifted.join(", ")}`);
    }
    // 7. The only check that proves the gate actually fires.
    const selftest = abs(targetDir, ".claude/hooks/rule-zero-selftest.ts");
    if (!fs.existsSync(selftest)) {
        fail(state, "self-test missing — the gate is unproven", FAILS_OPEN);
    }
    else {
        const run = spawnSync(process.execPath, [selftest], { cwd: targetDir, encoding: "utf8" });
        const output = ((run.stdout ?? "") + (run.stderr ?? "")).trim();
        const counts = /(\d+)\/(\d+) cases passed/.exec(output);
        if (run.status !== 0 || counts === null) {
            fail(state, `self-test failed (exit ${String(run.status)})`, output.split("\n")[0] ?? "no output");
        }
        else if (counts[1] !== counts[2]) {
            fail(state, `self-test ${counts[1]}/${counts[2]} — the gate is not behaving`, output.split("\n")[0]);
        }
        else if (Number(counts[2]) !== EXPECTED_SELFTEST_CASES) {
            fail(state, `self-test ran ${counts[2]} cases, this kit expects ${EXPECTED_SELFTEST_CASES}`, "the hooks and the CLI are from different kit versions — run `cl-workflow update`");
        }
        else {
            pass(state, `self-test ${counts[1]}/${counts[2]}`);
        }
    }
    say(`doctor: ${state.passed} passed, ${state.failed} failed`);
    return state.failed === 0 ? 0 : 1;
}
/* ----------------------------------------------------------------------- entry point */
function main(argv) {
    // `cl-workflow init | head -3` closes stdout under us. The report is not worth aborting a
    // half-finished install for, and EPIPE arrives as an async 'error' event no try/catch sees.
    process.stdout.on("error", () => { });
    const command = argv.length > 0 ? argv[0] : "";
    if (command === "" || command === "-h" || command === "--help" || command === "help") {
        say(USAGE);
        return command === "" ? 2 : 0;
    }
    if (command === "-v" || command === "--version") {
        say(versionLabel(loadKit().kitVersion));
        return 0;
    }
    const rest = argv.slice(1).filter((a) => !a.startsWith("-"));
    const targetDir = path.resolve(rest[0] ?? ".");
    if (command === "init") {
        fs.mkdirSync(targetDir, { recursive: true });
        return cmdInit(targetDir);
    }
    if (!fs.existsSync(targetDir))
        die(`${targetDir} does not exist`);
    if (command === "update")
        return cmdUpdate(targetDir);
    if (command === "doctor")
        return cmdDoctor(targetDir);
    process.stderr.write(`cl-workflow: unknown command "${command}"\n\n`);
    say(USAGE);
    return 2;
}
process.exitCode = main(process.argv.slice(2));
