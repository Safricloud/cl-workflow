# Review — <title in plain English> (<id>)

**The ask:** <one sentence: what was asked, by whom, where (issue #n / conversation, date)>
**Issue:** #<n> | none · **Checkout:** `<default branch>` @ `<sha>` · **Branch:** `<feat|fix>/<id>`
**Investigations:** `investigation-<topic>.md` … (in this directory)

## Short answer

<Two to five sentences a non-engineer could follow. What is going on, and what we recommend.>

## What we found

<Plain English, high level, ranked by how much it matters to real users. One short paragraph
per finding; the evidence lives in the investigation files — link the file, don't repeat the
table. A finding already fixed upstream stays here, marked FIXED UPSTREAM.>

## What is right, and should not be changed

<Deliberate designs the work must not undo. Cite `mem/outstanding.md` where a decision exists.>

## Directions we could take

### A — <name>

<What it means in practice. What it costs (effort, risk). What it forecloses or makes harder
later. Who else it touches.>

### B — <name>

### C — <name>

**Recommendation:** <which, and why in two sentences. If the honest answer is "A now, C later",
say that.>

## Decisions we need from you

<Numbered. Each with the options and the recommended one. This list becomes the questions.
Include: any rule-zero action the plan would need (exact command shape); any scope question;
anything the orchestrator is unsure about — more is better here, this is the last prompt.>

## What this review did not do

<Scope not covered, things not reproduced, claims taken on argument.>

---

<!-- Appended at the Questions phase; the review is not rewritten above this line. -->

## Decisions (recorded <date>)

1. <question> → **<answer>** — "<owner's words, if any>"
2. …
   **Rule-zero grants written:** <regex> for <action> — or none
