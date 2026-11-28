---
name: ticket
description: Build the next feature (a few tickets from the plan) as a stack of slice branches, one per ticket, on top of the current stack. Use when the user says "work on ticket T-04", "next ticket", "next feature", "continue T-04", or runs /ticket.
---

# Build a feature as a stack of slices

A feature is a few tickets that belong together (all of T-12, or T-13 and T-14). Each ticket is one slice: one branch and later one PR, based on the slice below it. See "The rest of the task is built in features and reviewed as stacked PRs" in `claude-notes/decisions.md`.

## 1. Pick the feature

- List the tickets with `grep -nE '^### |Status:' claude-notes/plan.md` and read only the sections you'll build. Take the next `todo` tickets that make one behavior together, two to four of them, and say which in one line.
- `After` tickets only need to be built, on this stack or on `main`. They don't need to be merged.
- A ticket estimated over 500 lines becomes two tickets in `plan.md` here, before building, not halfway through.

## 2. Find the top of the stack

Work in this worktree for the whole stack; don't make a new one. If `git status` isn't clean, ask before switching branches.

The base for the first slice is the top of the stack: the newest slice branch whose PR isn't merged yet (`gh pr list --author @me --state open --json headRefName,baseRefName`), or `origin/main` when there is none. Run `git fetch origin` first.

## 3. Build each slice

For each ticket, in order:

1. `git switch -c <ID>-<short-slug> <base>`, where the base is the previous slice's branch (or the top of the stack, for the first).
2. Read the code in its `Touches` and only the decision log entries it touches. If the approach is obvious, state it in two or three lines and build; ask only about a choice that changes another ticket or what the user sees.
3. Build it with its types, copy and tests, in commits. Run `.claude/scripts/test` on what you touched and `.claude/scripts/pr-size <base>` (it must stay under 500).
4. Set the ticket's `Status: in review` in `plan.md` with a one-line `Outcome`, and commit it on this slice.

Don't run `check`, `/design-check`, `/verify-ui` or the reviewer between slices.

## 4. Finish the feature

When the last slice is built, run the `finish` skill with the list of slice branches, bottom first, and the base of the bottom one. It runs the expensive checks once for the whole feature and opens one stacked PR per slice.

## 5. Comments on a PR

When the user says a PR has comments, run the `address-review` skill on that PR's branch: fixes are new commits there. Then switch to the top branch of the stack, run `git rebase --update-refs <fixed-branch>`, run `.claude/scripts/check`, and push every branch above it with `git push --force-with-lease`. Never merge; the user merges bottom up with merge commits.
