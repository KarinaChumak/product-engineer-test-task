---
name: finish
description: Finish a feature built as a stack of slice branches and open one stacked PR per slice. Proves each ticket's "done when", has a separate reviewer agent review the whole feature once, then hands the rest to a finisher agent with a fresh context, which fixes what the review found in the slice it belongs to, runs the UI checks, opens the stacked PRs and fixes what CI and the CI review find. Run it when the ticket skill has built a feature's last slice, or when the user runs /finish.
---

# Finish a feature

Run every step without stopping to ask, unless a step says to stop. The user sees the result at the end, with the PRs already open.

You need the slice branches, bottom first, and the base of the bottom one (another slice's branch, or `origin/main`). The ticket skill passes them; otherwise read them from `git log --oneline --decorate <base>..HEAD`.

Most of the work runs in two subagents, each with a fresh context. This conversation usually holds the whole build, and every model call here re-sends all of it, so keep your own part to the steps below.

## 1. Prove it's done

For each "done when" of each ticket in the feature, name the test, e2e test or screenshot that proves it. Write the missing ones on that ticket's slice branch. If one can't be met, stop and tell the user why.

## 2. Check and size

1. On the top branch, run `.claude/scripts/check` and fix what fails, on the slice the fix belongs to (see "Fix a lower slice" below).
2. Run `.claude/scripts/pr-size <branch below>` for each slice. A slice over 500 lines: stop and propose how to split it. Never cut tests to get under it.
3. Commit everything, so both agents see all of it.

## 3. Review by a separate agent

Start the `reviewer` subagent once, for the whole feature. Give it only the ticket IDs, the top branch and the base of the bottom slice, never your own summary of the change. Wait for its report.

## 4. Hand the rest to the finisher

Start the `finisher` subagent with:

- the ticket IDs and the slice branches, bottom first, and the base of the bottom one,
- the line count `pr-size` printed for each slice,
- the reviewer's report, copied exactly as it wrote it.

Add nothing else. Wait for its report. Don't redo or re-check its work here.

## 5. Report

Pass the finisher's report on to the user, briefly:

- The PR links, bottom first, and whether their checks pass.
- What the local review found, what was fixed, and what was pushed back on.
- What CI and the CI review flagged, and what was fixed or left open.
- Anything that changes later tickets.
- Next: the next feature can start on top of the stack now. Review the PRs bottom up and merge them bottom up with merge commits (not squash). For comments, say "address the comments on #N".

## Fix a lower slice

A fix that belongs to a lower slice is a new commit on that slice's branch: `git switch <slice>`, commit, `git switch <top>`, `git rebase --update-refs <slice>`. Once the PRs are open, push the rebased branches above it with `git push --force-with-lease`.
