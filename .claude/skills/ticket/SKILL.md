---
name: ticket
description: Start or resume work on a ticket from the plan in its own branch and worktree. Use when the user says "work on ticket T-04", "next ticket", "continue T-04", or runs /ticket.
---

# Work on a ticket

One ticket, one session, one worktree. The main checkout stays on `main`, so other sessions can run their own tickets in parallel.

## 1. Find the ticket

- Read the ticket's `### <ID> <title>` section in `claude-notes/plan.md`. On a ticket's branch the SessionStart hook has already printed it, so use that. Otherwise find its line with `grep -n '^### <ID> ' claude-notes/plan.md` and read only that section (Read with `offset` and `limit`). Don't read the whole plan: it grows with every ticket.
- For "next ticket": list the tickets and their statuses with `grep -nE '^### |Status:' claude-notes/plan.md`, pick the first with `Status: todo` whose `After` tickets are all done, and confirm it with the user. Finished phases are in `claude-notes/plan-archive.md`; their tickets are all done.
- If its `After` tickets aren't merged yet, or another ticket in progress has the same `Touches`, say so and ask before starting.

## 2. Move into its worktree

1. Run `.claude/scripts/ticket start <ID> <short-slug>`, with a slug of 2–4 words from the title. It pulls the latest `main` first, so the branch starts from it. It prints `path`, `branch`, `port` and `new`. Run it even when the session already started in a worktree of its own.
2. Call the EnterWorktree tool with that `path`, so the rest of the session works there.
3. If `new=yes`, run `.claude/scripts/setup` there: a new worktree has no installed dependencies.
4. If `new=no`, this is a resumed ticket: read `git log --oneline main..HEAD` and `git status` to see where it stands, and carry on from there.
5. The dev server and e2e tests in this worktree use `port`. Pass it on if you start anything else that listens.

## 3. Read before proposing

- `.claude/CLAUDE.md`, the ticket's section, and `claude-notes/product.md`.
- `claude-notes/decisions.md`. If it's in the repo, read it as it is on `main` (`git show origin/main:claude-notes/decisions.md`, or `main:` without a remote), since other tickets may have added decisions after this branch started.
- The code in the ticket's `Touches`.

## 4. Mark it started

In the ticket's section, set `Status: in progress` and `Branch: <branch>`. If the notes are in the repo, commit that with the first code change, not alone.

## 5. Propose, then build

- Propose the approach in a few lines: what changes in which files, with an estimate of changed lines per file, how each "done when" will be proved, the names of new modules, components, hooks and functions (each saying exactly what it is or does), and any dependency you'll add. Wait for the user's approval.
- If the estimate is over the ticket's `Size`, or over 300 lines, don't build it as one PR. Propose splitting it into smaller tickets in `plan.md`, each a complete behavior, and build only the first.
- When the user says how to split, use their split. Don't offer a different one as a choice or a suggested reply; if theirs still comes out too big, say so and propose splitting their first part further.
- When a word in the ticket or the user's message could mean two parts of the system ("validation" could mean checking the input or applying a business rule), ask which one before building.
- Questions that only affect this ticket: decide, and mention the choice in the proposal. Questions that affect other tickets, or change what the user sees in another ticket's "done when": ask, since they become entries in `claude-notes/decisions.md`.
- Build in small commits, with the types, copy, keys and tests of each behavior. Run `.claude/scripts/pr-size` after each commit. Past 400 lines, stop and tell the user before going on.
- Never drop, merge or thin out tests to stay under the size limit. A behavior with every case tested that doesn't fit is a ticket to split.

## 6. Finish

When every "done when" holds, commit everything and tell the user: "Type `/clear`, then `/finish`." `finish` works from the branch and the notes, so it runs in a fresh context instead of re-sending this whole build conversation on every step. It has a separate agent review the branch, fixes what it finds, and opens the PR.

When the user says the PR has comments, run the `address-review` skill. Don't merge; a human does.
