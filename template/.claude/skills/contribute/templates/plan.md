# Plan — <title> (<id>)

**Date:** <yyyy-mm-dd hh:mm tz>
**Review:** `docs/reviews/<id>/review.md` — direction **<A|B|C>**, decisions 1–<n>
**Issue:** #<n> | none
**Branch:** `<feat|fix>/<id>` off `<default branch>` (`<sha>`)
**Owner go-ahead:** <date> at the Questions phase — "<quote>"
**Phases:** `phase-1.md` (<n> items, parallel) · `phase-2.md` (…) · `phase-1.5.md` added if needed

## Measured facts (from the investigations; do not re-derive)
| Fact | Value | Where measured |
| --- | --- | --- |

## Owner decisions this plan rests on
<Numbered, dated, quoted — copied from the review's Decisions section.>

## Decisions made by this plan — veto here or in the PR
<Recommended defaults the orchestrator is implementing without asking. Each with grounds.>

## Decisions made mid-loop — implemented; veto in the PR
<Appended as the loop runs, dated. Anything decided after the Questions phase.>

## Phasing
<Group by EXPECTED MERGE CLEANLINESS. Implementers work in their own worktrees off this branch's
HEAD and edit only their item's section of their phase file. Items that both touch a magnet file
(lockfile, root manifest, CLAUDE.md, a shared client, the same region of a module) go in
different phases, or the shared edit is seeded first. Phase N+1 starts from the merged,
verified result of phase N.>

## Orchestrator work (documents only)
<Seeds committed before a phase; plan, ledger, CLAUDE.md, blocked-on-owner issues, archive, PR.>

## Orchestrator validation (after each phase merge, and at the end)
<Formatter run and its check clean, full check, build, E2E for the touched surfaces, screenshots
at which viewports, container run if touched, checker-verified for each new test.>

## Blocked on the owner
<The only kind of deferral. Each becomes a GitHub issue before the archive — record the number
here and in mem/outstanding.md: what the owner has to do, what it unblocks.>
